/**
 * Pure layout model for Jupyter Mosaic. No DOM, no JupyterLab imports.
 *
 * A mosaic layout is a *guillotine partition*: the notebook is a column of
 * children, each child of a column is a row, each child of a row is a column,
 * and so on. Every such partition rasterises exactly onto a CSS grid, which is
 * what this module computes.
 *
 * The tree is derived entirely from cell metadata (`mosaic: string[]`, a path of
 * group ids) plus per-group state stored in notebook metadata. It is never the
 * authoritative copy of anything: rebuild it from metadata whenever the notebook
 * changes and the layout follows.
 */

export type Axis = 'row' | 'col';

/** How a group presents its children. */
export type GroupMode =
  /** children participate in the outer grid (the default) */
  | 'flow'
  /** children are laid out internally and clipped; the group scrolls */
  | 'scroll'
  /** like 'scroll', but only one child is shown at a time */
  | 'tabs';

/** Per-group state, persisted in notebook metadata under `mosaic:<path>`. */
export interface IGroupState {
  mode?: GroupMode;
  /** Preferred extent along the group's own axis, in px. Only used in 'scroll'/'tabs'. */
  size?: number;
  /** Share of the parent's extent, relative to siblings. */
  weight?: number;
  /** Index of the visible child in 'tabs' mode. */
  activeTab?: number;
}

export interface ICellNode {
  kind: 'cell';
  /** Index of the cell in the notebook's linear cell list. */
  index: number;
  weight: number;
}

export interface IGroupNode {
  kind: 'group';
  id: string;
  path: string[];
  axis: Axis;
  weight: number;
  mode: GroupMode;
  size: number;
  children: MosaicNode[];
}

export type MosaicNode = ICellNode | IGroupNode;

/** Default extent (px) of a scrollable group along its scroll axis. */
export const DEFAULT_SCROLL_SIZE = 320;

/** A node's placement in the flat grid, as 1-based CSS grid line numbers. */
export interface IPlacement {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

/** A group whose children are positioned manually rather than by the grid. */
export interface IManagedGroup {
  node: IGroupNode;
  /** Where the group itself sits in the outer grid. */
  placement: IPlacement;
  /** Linear indices of every cell anywhere beneath this group. */
  cells: number[];
}

export interface ISolution {
  /** Column track weights, one per track, in `fr` units. */
  colWeights: number[];
  /** Minimum height contributed to each row track, in px (0 = pure `auto`). */
  rowMinPx: number[];
  /** Grid placement for every cell that the grid positions directly. */
  placements: Map<number, IPlacement>;
  /** Groups laid out manually ('scroll' / 'tabs'), outermost first. */
  managed: IManagedGroup[];
  /** For each cell, the innermost managed group containing it (if any). */
  managedOwner: Map<number, IManagedGroup>;
  /** Placement of every group node, keyed by {@link groupKey}. Drives chrome. */
  groupPlacements: Map<string, { node: IGroupNode; placement: IPlacement }>;
}

/** The axis a group at the given depth divides along. Root (depth 0) is a column. */
export function axisAtDepth(depth: number): Axis {
  return depth % 2 === 0 ? 'col' : 'row';
}

export function groupKey(path: string[]): string {
  return 'mosaic:' + path.join('/');
}

/**
 * Build the layout tree from per-cell paths, in notebook order.
 *
 * A group is reused only while it is the most recently appended child at that
 * depth. A path that reappears after an interruption therefore yields a second,
 * distinct group -- which is the correct linearisation: cells that are not
 * adjacent in the notebook cannot share a tile.
 */
export function buildTree(
  paths: (string[] | undefined)[],
  cellWeight: (index: number) => number,
  groupState: (path: string[]) => IGroupState
): IGroupNode {
  const root: IGroupNode = {
    kind: 'group',
    id: '',
    path: [],
    axis: 'col',
    weight: 1,
    mode: 'flow',
    size: 0,
    children: []
  };

  for (let index = 0; index < paths.length; index++) {
    const path = paths[index] ?? [];
    let node = root;

    for (let depth = 0; depth < path.length; depth++) {
      const id = path[depth];
      const last = node.children[node.children.length - 1];
      let next: IGroupNode;

      if (last && last.kind === 'group' && last.id === id) {
        next = last;
      } else {
        const childPath = path.slice(0, depth + 1);
        const state = groupState(childPath);
        next = {
          kind: 'group',
          id,
          path: childPath,
          axis: axisAtDepth(depth + 1),
          weight: state.weight ?? 1,
          mode: state.mode ?? 'flow',
          size: state.size ?? DEFAULT_SCROLL_SIZE,
          children: []
        };
        node.children.push(next);
      }
      node = next;
    }

    node.children.push({ kind: 'cell', index, weight: cellWeight(index) });
  }

  return root;
}

/** Sum of child weights, guarding against a degenerate zero total. */
function totalWeight(children: MosaicNode[]): number {
  let total = 0;
  for (const child of children) {
    total += child.weight > 0 ? child.weight : 1;
  }
  return total > 0 ? total : 1;
}

/**
 * Rasterise the tree onto a flat grid.
 *
 * Every node occupies a rectangle in normalised [0,1] coordinates; the set of
 * distinct rectangle edges becomes the grid's track boundaries. Because a
 * boundary shared by two nodes is always inherited from their common ancestor,
 * shared edges are bit-identical floats and dedupe exactly.
 *
 * Managed groups ('scroll' / 'tabs') are treated as leaves here: their subtree
 * contributes no cuts, so the group always collapses to a single track on each
 * axis and its interior is positioned by {@link MosaicGrid} instead.
 */
export function solve(root: IGroupNode): ISolution {
  const xs = new Set<number>([0, 1]);
  const ys = new Set<number>([0, 1]);

  interface IRect {
    node: MosaicNode;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    owner: IGroupNode | null;
  }
  const rects: IRect[] = [];
  const managedNodes: { node: IGroupNode; rect: IRect }[] = [];
  const groupRects: { node: IGroupNode; rect: IRect }[] = [];

  const walk = (
    node: MosaicNode,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    owner: IGroupNode | null
  ): void => {
    xs.add(x0);
    xs.add(x1);
    ys.add(y0);
    ys.add(y1);

    const rect: IRect = { node, x0, x1, y0, y1, owner };

    if (node.kind === 'cell') {
      rects.push(rect);
      return;
    }

    groupRects.push({ node, rect });

    if (node.mode !== 'flow') {
      // A managed group is opaque to the grid: record it and stop cutting.
      rects.push(rect);
      managedNodes.push({ node, rect });
      return;
    }

    const total = totalWeight(node.children);
    let offset = 0;
    for (const child of node.children) {
      const share = (child.weight > 0 ? child.weight : 1) / total;
      const from = offset;
      const to = offset + share;
      offset = to;

      if (node.axis === 'col') {
        walk(child, x0, x1, y0 + (y1 - y0) * from, y0 + (y1 - y0) * to, owner);
      } else {
        walk(child, x0 + (x1 - x0) * from, x0 + (x1 - x0) * to, y0, y1, owner);
      }
    }
  };

  walk(root, 0, 1, 0, 1, null);

  const xLines = [...xs].sort((a, b) => a - b);
  const yLines = [...ys].sort((a, b) => a - b);
  const xIndex = new Map(xLines.map((v, i) => [v, i + 1])); // CSS lines are 1-based
  const yIndex = new Map(yLines.map((v, i) => [v, i + 1]));

  const colWeights: number[] = [];
  for (let i = 0; i + 1 < xLines.length; i++) {
    colWeights.push(xLines[i + 1] - xLines[i]);
  }
  const rowMinPx = new Array(Math.max(yLines.length - 1, 0)).fill(0);

  const place = (r: IRect): IPlacement => ({
    rowStart: yIndex.get(r.y0)!,
    rowEnd: yIndex.get(r.y1)!,
    colStart: xIndex.get(r.x0)!,
    colEnd: xIndex.get(r.x1)!
  });

  const placements = new Map<number, IPlacement>();
  const managed: IManagedGroup[] = [];
  const managedOwner = new Map<number, IManagedGroup>();

  for (const { node, rect } of managedNodes) {
    const placement = place(rect);
    managed.push({ node, placement, cells: collectCells(node) });

    // Managed groups nested inside a managed group get no grid area of their
    // own -- they are positioned in their ancestor's local pixel space -- but
    // they still need discovering so they can carry their own scroll offset.
    for (const nested of nestedManaged(node)) {
      managed.push({
        node: nested,
        placement,
        cells: collectCells(nested)
      });
    }

    // A managed group holds its own extent open along its scroll axis, spread
    // across the row tracks it spans. `auto` still wins if siblings are taller.
    if (node.axis === 'col') {
      const span = Math.max(placement.rowEnd - placement.rowStart, 1);
      for (let t = placement.rowStart - 1; t < placement.rowEnd - 1; t++) {
        rowMinPx[t] = Math.max(rowMinPx[t], node.size / span);
      }
    }
  }

  // Outermost first, so the innermost owner wins when groups nest.
  managed.sort((a, b) => a.node.path.length - b.node.path.length);
  for (const entry of managed) {
    for (const index of entry.cells) {
      managedOwner.set(index, entry);
    }
  }

  for (const rect of rects) {
    if (rect.node.kind === 'cell') {
      placements.set(rect.node.index, place(rect));
    }
  }

  const groupPlacements = new Map<
    string,
    { node: IGroupNode; placement: IPlacement }
  >();
  for (const { node, rect } of groupRects) {
    groupPlacements.set(groupKey(node.path), { node, placement: place(rect) });
  }

  return {
    colWeights,
    rowMinPx,
    placements,
    managed,
    managedOwner,
    groupPlacements
  };
}

/** Managed groups strictly beneath a node, outermost first. */
function nestedManaged(node: IGroupNode, out: IGroupNode[] = []): IGroupNode[] {
  for (const child of node.children) {
    if (child.kind !== 'group') {
      continue;
    }
    if (child.mode !== 'flow') {
      out.push(child);
    }
    nestedManaged(child, out);
  }
  return out;
}

/** Every cell index beneath a node, in notebook order. */
export function collectCells(node: MosaicNode, out: number[] = []): number[] {
  if (node.kind === 'cell') {
    out.push(node.index);
  } else {
    for (const child of node.children) {
      collectCells(child, out);
    }
  }
  return out;
}

/** Find the group at `path`, or null. */
export function findGroup(root: IGroupNode, path: string[]): IGroupNode | null {
  let node: IGroupNode = root;
  for (const id of path) {
    const next = node.children.find(
      (c): c is IGroupNode => c.kind === 'group' && c.id === id
    );
    if (!next) {
      return null;
    }
    node = next;
  }
  return node;
}

/** Depth at which two paths diverge. */
export function divergeDepth(a: string[] = [], b: string[] = []): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return i;
    }
  }
  return n;
}

export function newGroupId(): string {
  return 'mg-' + crypto.randomUUID();
}

/**
 * Minimum height for each row track, in px.
 *
 * Windowing detaches off-screen cells, and a detached cell contributes nothing
 * to an `auto` grid track -- so without a floor the band collapses, the
 * document shrinks, and the render range then culls cells that are actually on
 * screen. Flooring each track at the height its content last measured keeps an
 * absent cell's space reserved.
 *
 * Cells inside a managed group are skipped: that group's own `size` already
 * holds its band open, and its cells sit outside the grid's flow anyway.
 */
export function rowFloors(
  solution: ISolution,
  cellHeight: (index: number) => number
): number[] {
  const floors = solution.rowMinPx.slice();
  for (const [index, placement] of solution.placements) {
    if (solution.managedOwner.has(index)) {
      continue;
    }
    const span = Math.max(placement.rowEnd - placement.rowStart, 1);
    const share = cellHeight(index) / span;
    for (let t = placement.rowStart - 1; t < placement.rowEnd - 1; t++) {
      floors[t] = Math.max(floors[t] ?? 0, share);
    }
  }
  return floors;
}

/** A step in the two-dimensional layout. */
export type Direction = 'left' | 'right' | 'up' | 'down';

/** A rectangle in viewport coordinates. */
export interface IRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Slack, in px, when deciding whether a candidate lies past our edge. */
const NAV_TOLERANCE = 1;
/** Candidates within this many px of the nearest count as equally near. */
const NAV_BAND = 4;

/**
 * The cell to move to when stepping one place in a direction.
 *
 * Navigation is geometric rather than structural, which gives every case the
 * user expects from a single rule: inside a column, up and down are the
 * siblings above and below, while left and right cross into the neighbouring
 * tile of the enclosing row at the nearest height. Inside a row the roles swap,
 * with no special-casing for either.
 *
 * Candidates are gathered from the nearest band past our edge and then ranked
 * by alignment on the other axis -- that second step is what makes a sideways
 * step land on the nearest-height neighbour rather than the topmost one.
 */
export function nearestInDirection(
  from: IRect,
  candidates: { index: number; rect: IRect }[],
  direction: Direction
): number | null {
  const horizontal = direction === 'left' || direction === 'right';
  const backwards = direction === 'left' || direction === 'up';

  const scored: { index: number; gap: number; offset: number }[] = [];
  for (const { index, rect } of candidates) {
    const gap = backwards
      ? horizontal
        ? from.x0 - rect.x1
        : from.y0 - rect.y1
      : horizontal
        ? rect.x0 - from.x1
        : rect.y0 - from.y1;
    if (gap < -NAV_TOLERANCE) {
      continue; // behind us, or merely overlapping
    }
    const offset = horizontal
      ? Math.abs((rect.y0 + rect.y1) / 2 - (from.y0 + from.y1) / 2)
      : Math.abs((rect.x0 + rect.x1) / 2 - (from.x0 + from.x1) / 2);
    scored.push({ index, gap, offset });
  }
  if (scored.length === 0) {
    return null;
  }

  const nearest = Math.min(...scored.map(c => c.gap));
  const band = scored.filter(c => c.gap <= nearest + NAV_BAND);
  band.sort((a, b) => a.offset - b.offset || a.index - b.index);
  return band[0].index;
}

/**
 * The path a new cell takes when inserted beside `refPath` along `wantAxis`.
 *
 * When the containing group already runs the right way the cell simply joins
 * it; otherwise the reference cell is subdivided, and both cells move into the
 * new group. Returns null when no subdivision is needed.
 */
export function subdividePath(
  refPath: string[],
  wantAxis: Axis,
  id: string
): string[] {
  return axisAtDepth(refPath.length) === wantAxis ? refPath : [...refPath, id];
}

/**
 * Turn normalised track weights into CSS `fr` factors.
 *
 * The weights from {@link solve} are fractions summing to one, which is wrong
 * to hand to the grid directly. Per CSS Grid Layout 12.7.1, a track whose base
 * size exceeds its share is frozen at that size and dropped from the flex sum,
 * and if the remaining sum is below one the algorithm clamps it *to* one -- so
 * the still-flexible tracks take only that fraction of the leftover space and
 * the rest of the row shows as blank margin. Widening the container eventually
 * unfreezes the track and the row snaps out to full width.
 *
 * Scaling so the smallest factor is one keeps the sum at or above one however
 * many tracks freeze, so the flexible tracks always absorb all leftover space.
 */
export function flexFactors(weights: number[]): number[] {
  const positive = weights.filter(w => w > 0);
  if (positive.length === 0) {
    return weights.map(() => 1);
  }
  const smallest = Math.min(...positive);
  return weights.map(w => (w > 0 ? w / smallest : 1));
}
