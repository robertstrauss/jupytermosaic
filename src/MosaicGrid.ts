/**
 * Applies a {@link ISolution} to the notebook's viewport as a flat CSS grid.
 *
 * Every cell node stays a direct child of `.jp-WindowedPanel-viewport`, because
 * `NotebookWindowedLayout._findNearestChildBinarySearch` reads
 * `dataset.windowedListIndex` off *every* child and spins forever on a `NaN`.
 * All chrome therefore lives in a separate overlay plane parented to
 * `.jp-WindowedPanel-inner`, a sibling of the viewport.
 *
 * Groups in 'scroll'/'tabs' mode are opaque to the grid: they occupy a single
 * grid area, and their cells are absolutely positioned *against that area*
 * (per CSS Grid 9.2 an abspos child with a definite grid position uses its grid
 * area as containing block) so their content contributes nothing to track
 * sizing. Scrolling is simulated by offsetting those cells and clipping the two
 * that straddle each edge.
 */

import {
  IGroupNode,
  IManagedGroup,
  IPlacement,
  ISolution,
  MosaicNode,
  flexFactors,
  groupKey,
  rowFloors
} from './MosaicTree';

/** Fallback height (px) assumed for a cell that has never been measured. */
const ESTIMATED_CELL_HEIGHT = 90;

export interface IGridHost {
  /** Node for a cell by linear index, or null if it is not currently attached. */
  cellNode(index: number): HTMLElement | null;
  /** Total number of cells in the notebook. */
  cellCount(): number;
  /** Fallback height for a cell that has never been measured, in px. */
  estimateHeight(index: number): number;
  /** Request another layout pass (coalesced by the host). */
  requestUpdate(): void;
  /** Run every cell beneath a group. */
  runGroup(node: IGroupNode): void;
  /** Persist a group state change (this *does* dirty the notebook). */
  saveGroupState(node: IGroupNode, state: Record<string, unknown>): void;
}

/** A clip rectangle in root-managed-group coordinates. */
interface IClip {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function intersect(a: IClip, b: IClip): IClip {
  return {
    x0: Math.max(a.x0, b.x0),
    y0: Math.max(a.y0, b.y0),
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1)
  };
}

interface ICommitContext {
  root: IManagedGroup;
  rootBox: IBox;
  locals: Map<number, { start: number; end: number }>;
}

/** A group's box in viewport-local px. */
interface IBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class MosaicGrid {
  constructor(
    protected viewport: HTMLElement,
    protected inner: HTMLElement,
    protected outer: HTMLElement,
    protected host: IGridHost
  ) {
    this._overlay = document.createElement('div');
    this._overlay.className = 'mosaic-overlay';
    this.inner.appendChild(this._overlay);

    this.viewport.classList.add('mosaic-grid');

    // We observe each cell's *children*, not the cell itself. Cells are
    // stretched to their grid track, so the cell box tells us the track height
    // we already chose -- feeding that back into the track floor would be
    // circular and could only ever ratchet upwards. A cell is a column flex
    // container, so its wrappers sit at content height whatever the box does.
    this._resizeObserver = new ResizeObserver(entries => {
      const dirty = new Set<HTMLElement>();
      for (const entry of entries) {
        const cell = (entry.target as HTMLElement).closest(
          '.jp-Cell'
        ) as HTMLElement | null;
        if (cell) {
          dirty.add(cell);
        }
      }
      let changed = false;
      for (const cell of dirty) {
        if (this._refreshHeight(cell)) {
          changed = true;
        }
      }
      if (changed) {
        this.host.requestUpdate();
      }
    });

    // The panel can be resized without any cell changing, and stale group
    // boxes leave absolutely positioned chrome hanging past the new width --
    // which the outer node then lets you scroll into.
    this._outerResizeObserver = new ResizeObserver(() => {
      this.host.requestUpdate();
    });
    this._outerResizeObserver.observe(this.outer);

    this._onWheel = this._onWheel.bind(this);
    this._onDblClick = this._onDblClick.bind(this);
    this.outer.addEventListener('wheel', this._onWheel, { passive: false });
    this.viewport.addEventListener('dblclick', this._onDblClick);
  }

  private _overlay: HTMLElement;
  private _resizeObserver: ResizeObserver;
  private _outerResizeObserver: ResizeObserver;
  private _observed = new Set<HTMLElement>();
  private _heights = new WeakMap<HTMLElement, number>();
  /** Per-group scroll offset, in px. Session state only -- never persisted. */
  private _scroll = new Map<string, number>();
  private _solution: ISolution | null = null;
  private _rowOffsets: number[] = [0];
  private _colOffsets: number[] = [0];
  private _boxes = new Map<string, IBox>();
  private _edgePadding = 0;
  private _chrome = new Map<string, HTMLElement>();
  /** Every group we know a box for, including ones nested inside managed groups. */
  private _nodesByKey = new Map<string, IGroupNode>();

  /**
   * Bumped on every layout pass. `getRangeToRender` must not answer "unchanged"
   * across one: after a move the hull can be numerically identical while the
   * cells behind those indices are different, and returning null would leave
   * the notebook's `windowedListIndex` and DOM order stale.
   */
  get version(): number {
    return this._version;
  }
  private _version = 0;

  /** Resolved row-line offsets in px, length = row track count + 1. */
  get rowOffsets(): number[] {
    return this._rowOffsets;
  }

  /** Total laid-out height of the grid in px. */
  get totalHeight(): number {
    return this._rowOffsets[this._rowOffsets.length - 1] ?? 0;
  }

  get solution(): ISolution | null {
    return this._solution;
  }

  /**
   * Linear cell indices whose grid rows intersect the given vertical band.
   *
   * The geometrically visible set is not always contiguous in linear index (a
   * row holding both a nested column and a full-height cell interleaves), so we
   * return its hull. Overshoot is bounded by the height of the tallest band.
   */
  hullForBand(top: number, bottom: number): [number, number] | null {
    const solution = this._solution;
    if (!solution || this._rowOffsets.length < 2) {
      return null;
    }
    let start = -1;
    let stop = -1;
    for (const [index, placement] of solution.placements) {
      const y0 = this._rowOffsets[placement.rowStart - 1] ?? 0;
      const y1 = this._rowOffsets[placement.rowEnd - 1] ?? this.totalHeight;
      if (y1 >= top && y0 <= bottom) {
        if (start < 0 || index < start) {
          start = index;
        }
        if (index > stop) {
          stop = index;
        }
      }
    }
    return start < 0 ? null : [start, stop];
  }

  /**
   * A cell's rectangle, in grid coordinates.
   *
   * Every rect comes from the solved layout rather than the DOM. Reading laid
   * out boxes for rendered cells and falling back to track offsets for the rest
   * mixed two coordinate systems -- the DOM box includes the viewport's edge
   * padding and the track offsets do not -- so in a windowed notebook the
   * active cell's edge sat a padding's width past its true neighbour, which was
   * then rejected as being behind it. That left only distant cells to pick
   * from. Vertical steps survived it because a row's height dwarfs the padding.
   */
  cellRect(index: number): IClip | null {
    const solution = this._solution;
    if (!solution) {
      return null;
    }

    if (solution.managedOwner.has(index)) {
      // Cells in a managed group are laid out in the group's local space, and
      // their offsets are recorded against the outermost such group.
      const root = solution.managed.find(entry => entry.cells.includes(index));
      if (root) {
        const key = groupKey(root.node.path);
        const box = this._boxes.get(key) ?? this._boxOf(root.placement);
        const local = this._localOffsets.get(key)?.get(index);
        if (!local) {
          return { x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h };
        }
        return root.node.axis === 'col'
          ? {
              x0: box.x,
              x1: box.x + box.w,
              y0: box.y + local.start,
              y1: box.y + local.end
            }
          : {
              x0: box.x + local.start,
              x1: box.x + local.end,
              y0: box.y,
              y1: box.y + box.h
            };
      }
    }

    const placement = solution.placements.get(index);
    if (!placement) {
      return null;
    }
    const box = this._boxOf(placement);
    return { x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h };
  }

  /** Vertical extent of a cell in grid coordinates, or null if unplaced. */
  cellSpan(index: number): [number, number] | null {
    const placement = this._solution?.placements.get(index);
    if (!placement) {
      return null;
    }
    return [
      this._rowOffsets[placement.rowStart - 1] ?? 0,
      this._rowOffsets[placement.rowEnd - 1] ?? this.totalHeight
    ];
  }

  /**
   * Bring a cell into view, scrolling every managed ancestor as needed.
   * Returns the document-space offset the outer notebook should scroll to, or
   * null if the cell is already within the outer viewport.
   */
  revealCell(
    index: number,
    viewTop: number,
    viewHeight: number
  ): number | null {
    const solution = this._solution;
    if (!solution) {
      return null;
    }

    // Scroll every managed ancestor so the cell sits inside its group's band.
    const owner = solution.managedOwner.get(index);
    if (owner) {
      const chain: IManagedGroup[] = solution.managed.filter(entry =>
        entry.cells.includes(index)
      );
      for (const entry of chain) {
        const key = groupKey(entry.node.path);
        const local = this._localOffsets.get(key)?.get(index);
        const box = this._boxes.get(key);
        if (!local || !box) {
          continue;
        }
        const extent = entry.node.axis === 'col' ? box.h : box.w;
        const current = this._scroll.get(key) ?? 0;
        let next = current;
        if (local.start < current) {
          next = local.start;
        } else if (local.end > current + extent) {
          next = local.end - extent;
        }
        if (next !== current) {
          this._scroll.set(key, Math.max(0, next));
          this.host.requestUpdate();
        }
      }
    }

    const span = this.cellSpan(index);
    if (!span) {
      return null;
    }
    const [top, bottom] = span;
    if (top < viewTop) {
      return top;
    }
    if (bottom > viewTop + viewHeight) {
      return Math.max(0, bottom - viewHeight);
    }
    return null;
  }

  /** Local (group-space) start/end of each managed cell, by group key. */
  private _localOffsets = new Map<
    string,
    Map<number, { start: number; end: number }>
  >();

  /**
   * Lay the notebook out. Runs in two phases because the interior of a managed
   * group needs the group's resolved pixel box, which only exists once the grid
   * has been sized.
   */
  update(solution: ISolution): void {
    this._solution = solution;
    this._version++;

    const count = this.host.cellCount();

    // -- phase 0: measure ---------------------------------------------------
    // Content heights first, so this pass's track floors are computed from
    // current measurements rather than the previous pass's.
    for (let index = 0; index < count; index++) {
      const node = this.host.cellNode(index);
      if (node) {
        this._observe(node);
        this._refreshHeight(node);
      }
    }

    // -- phase 1: tracks and flow placement --------------------------------
    const cols = solution.colWeights.length
      ? flexFactors(solution.colWeights)
          .map(f => `minmax(var(--mosaic-cell-min-width), ${f.toFixed(4)}fr)`)
          .join(' ')
      : '1fr';
    const floors = rowFloors(solution, i => this._cellHeight(i));
    const rows = floors.length
      ? floors
          .map(min => (min > 0 ? `minmax(${min.toFixed(2)}px, auto)` : 'auto'))
          .join(' ')
      : 'auto';
    this.viewport.style.gridTemplateColumns = cols;
    this.viewport.style.gridTemplateRows = rows;

    for (let index = 0; index < count; index++) {
      const node = this.host.cellNode(index);
      if (!node) {
        continue;
      }
      const placement = solution.placements.get(index);
      if (!placement) {
        this._park(node);
        continue;
      }
      const managed = solution.managedOwner.get(index);
      this._applyPlacement(node, managed ? managed.placement : placement);
      node.classList.toggle('mosaic-managed', !!managed);
      if (!managed) {
        this._reset(node);
      }
    }

    // -- phase 2: read back resolved geometry ------------------------------
    this._fitWidth();

    // -- phase 3: managed interiors ----------------------------------------
    this._localOffsets.clear();
    this._boxes.clear();
    this._nodesByKey.clear();
    for (const [key, entry] of solution.groupPlacements) {
      this._boxes.set(key, this._boxOf(entry.placement));
      this._nodesByKey.set(key, entry.node);
    }
    const managedPaths = new Set(
      solution.managed.map(m => m.node.path.join('/'))
    );
    for (const entry of solution.managed) {
      const path = entry.node.path;
      const nestedInAnother = path.some((_, i) =>
        i > 0 ? managedPaths.has(path.slice(0, i).join('/')) : false
      );
      if (!nestedInAnother) {
        this._layoutManaged(entry);
      }
    }

    // -- phase 4: chrome ---------------------------------------------------
    this._updateChrome(solution);
  }

  /** Parse the browser's resolved track sizes into cumulative line offsets. */
  private _readTracks(): void {
    const style = getComputedStyle(this.viewport);
    const rowGap = parseFloat(style.rowGap) || 0;
    const colGap = parseFloat(style.columnGap) || 0;

    const parse = (value: string, gap: number): number[] => {
      const sizes = value
        .split(' ')
        .map(v => parseFloat(v))
        .filter(v => Number.isFinite(v));
      const offsets = [0];
      for (let i = 0; i < sizes.length; i++) {
        offsets.push(offsets[i] + sizes[i] + (i + 1 < sizes.length ? gap : 0));
      }
      return offsets;
    };

    this._rowOffsets = parse(style.gridTemplateRows, rowGap);
    this._colOffsets = parse(style.gridTemplateColumns, colGap);
    this._edgePadding =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0);
  }

  /**
   * Size the scrollable area to the grid, exactly.
   *
   * Columns have a minimum width, so a narrow panel makes the grid wider than
   * the panel. The viewport is absolutely positioned and pinned to both edges,
   * which clamps it to the panel and leaves that overflow unreachable. Widening
   * the inner element to the content gives the outer node a real scrollable
   * width -- and no more than that, so there is never blank space to scroll
   * into that holds no cells.
   *
   * The measurement is always taken with any previously forced width released.
   * Deciding from a width we ourselves imposed on an earlier pass made the
   * fitted size ratchet: the tracks refill whatever width they are given, so
   * the requirement could only ever grow, and the grid stayed pinned at a stale
   * width while the panel grew past it.
   *
   * Leaves the track offsets current, so callers need not re-read them.
   */
  private _fitWidth(): void {
    this._release();
    this._readTracks();

    const tracks = this._colOffsets[this._colOffsets.length - 1] ?? 0;
    const content = tracks + this._edgePadding;
    if (content > this.outer.clientWidth + 1) {
      this.inner.style.width = `${content}px`;
      this.viewport.style.right = 'auto';
      this.viewport.style.width = `${content}px`;
      this._readTracks();
    }
  }

  /** Return the viewport to spanning the panel. */
  private _release(): void {
    this.inner.style.width = '';
    this.viewport.style.right = '0';
    this.viewport.style.width = '';
  }

  private _boxOf(placement: IPlacement): IBox {
    const x = this._colOffsets[placement.colStart - 1] ?? 0;
    const x1 = this._colOffsets[placement.colEnd - 1] ?? x;
    const y = this._rowOffsets[placement.rowStart - 1] ?? 0;
    const y1 = this._rowOffsets[placement.rowEnd - 1] ?? y;
    return { x, y, w: Math.max(0, x1 - x), h: Math.max(0, y1 - y) };
  }

  /**
   * A cell's intrinsic content height, independent of how tall its grid track
   * stretched the cell box. Returns 0 for a placeholder with no children yet.
   */
  private _measureContent(el: HTMLElement): number {
    let total = 0;
    for (const child of Array.from(el.children) as HTMLElement[]) {
      // Only in-flow children contribute: an absolutely positioned overlay is
      // sized by the stretched cell box, which is what we are avoiding here.
      const position = getComputedStyle(child).position;
      if (position === 'absolute' || position === 'fixed') {
        continue;
      }
      total += child.offsetHeight;
    }
    if (total === 0) {
      return 0;
    }
    const style = getComputedStyle(el);
    return (
      total +
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0) +
      (parseFloat(style.borderTopWidth) || 0) +
      (parseFloat(style.borderBottomWidth) || 0)
    );
  }

  /** Re-measure a cell, returning true if its content height moved. */
  private _refreshHeight(el: HTMLElement): boolean {
    if (
      !el.isConnected ||
      el.dataset.mosaicHidden ||
      el.style.display === 'none'
    ) {
      return false; // keep the last good measurement while culled
    }
    const height = this._measureContent(el);
    if (height <= 0) {
      return false;
    }
    if (Math.abs((this._heights.get(el) ?? -1) - height) <= 0.5) {
      return false;
    }
    this._heights.set(el, height);
    return true;
  }

  /** Last measured content height of a cell, else the notebook's estimate. */
  private _cellHeight(index: number): number {
    const el = this.host.cellNode(index);
    const measured = el ? this._heights.get(el) : undefined;
    return measured ?? this.host.estimateHeight(index) ?? ESTIMATED_CELL_HEIGHT;
  }

  /** Height a node wants, using cached measurements where available. */
  private _naturalHeight(node: MosaicNode): number {
    if (node.kind === 'cell') {
      return this._cellHeight(node.index);
    }
    if (node.mode !== 'flow') {
      return node.size;
    }
    if (node.axis === 'col') {
      return node.children.reduce((sum, c) => sum + this._naturalHeight(c), 0);
    }
    return node.children.reduce(
      (max, c) => Math.max(max, this._naturalHeight(c)),
      0
    );
  }

  /** Total extent of a group's children along its own axis. */
  private _contentOf(node: IGroupNode): number {
    if (node.mode === 'tabs') {
      const active = node.children[this._activeTab(node)];
      return active ? this._extentOf(active, node.axis) : 0;
    }
    let total = 0;
    for (const child of node.children) {
      total += this._extentOf(child, node.axis);
    }
    return total;
  }

  /** Extent a node wants along one axis, using cached measurements. */
  private _extentOf(node: MosaicNode, axis: 'row' | 'col'): number {
    if (axis === 'col') {
      return this._naturalHeight(node);
    }
    if (node.kind === 'cell') {
      return this._minCellWidth();
    }
    if (node.mode !== 'flow') {
      return node.size;
    }
    if (node.axis === 'row') {
      return node.children.reduce((s, c) => s + this._extentOf(c, 'row'), 0);
    }
    return node.children.reduce(
      (m, c) => Math.max(m, this._extentOf(c, 'row')),
      0
    );
  }

  private _minCellWidth(): number {
    return (
      parseFloat(
        getComputedStyle(this.viewport).getPropertyValue(
          '--mosaic-cell-min-width'
        )
      ) || 160
    );
  }

  private _tabState = new Map<string, number>();

  private _activeTab(node: IGroupNode): number {
    const stored = this._tabState.get(groupKey(node.path)) ?? 0;
    return Math.min(Math.max(stored, 0), Math.max(node.children.length - 1, 0));
  }

  setActiveTab(path: string[], index: number): void {
    this._tabState.set(groupKey(path), index);
    this.host.requestUpdate();
  }

  /**
   * Position everything inside a top-level managed group.
   *
   * All coordinates below are local to that group's grid area, which is the
   * containing block of every cell it owns. Nested managed groups share the
   * same space and simply carry their own scroll offset and clip rectangle,
   * so scroll-inside-scroll composes without any extra DOM.
   */
  private _layoutManaged(entry: IManagedGroup): void {
    const key = groupKey(entry.node.path);
    const box = this._boxes.get(key) ?? this._boxOf(entry.placement);
    const locals = new Map<number, { start: number; end: number }>();
    this._localOffsets.set(key, locals);

    this._commit(
      entry.node,
      0,
      0,
      box.w,
      box.h,
      { x0: 0, y0: 0, x1: box.w, y1: box.h },
      { root: entry, rootBox: box, locals }
    );
  }

  /** Lay a node into the rect (x, y, w, h), in root-managed-group coordinates. */
  private _commit(
    node: MosaicNode,
    x: number,
    y: number,
    w: number,
    h: number,
    clip: IClip,
    ctx: ICommitContext
  ): void {
    if (node.kind === 'cell') {
      const vertical = ctx.root.node.axis === 'col';
      ctx.locals.set(node.index, {
        start: vertical ? y : x,
        end: vertical ? y + h : x + w
      });
      const el = this.host.cellNode(node.index);
      if (el) {
        this._placeAbsolute(el, x, y, w, h, clip);
      }
      return;
    }

    let originX = x;
    let originY = y;
    let childClip = clip;

    if (node !== ctx.root.node && node.mode !== 'flow') {
      // A nested managed group: give it its own box, scroll and clip.
      const key = groupKey(node.path);
      this._boxes.set(key, {
        x: ctx.rootBox.x + x,
        y: ctx.rootBox.y + y,
        w,
        h
      });
      this._nodesByKey.set(key, node);

      const extent = node.axis === 'col' ? h : w;
      const content = this._contentOf(node);
      this._contentExtent.set(key, content);
      const scroll = Math.min(
        this._scroll.get(key) ?? 0,
        Math.max(0, content - extent)
      );
      this._scroll.set(key, scroll);

      if (node.axis === 'col') {
        originY -= scroll;
      } else {
        originX -= scroll;
      }
      childClip = intersect(clip, { x0: x, y0: y, x1: x + w, y1: y + h });
    } else if (node === ctx.root.node) {
      const key = groupKey(node.path);
      const extent = node.axis === 'col' ? h : w;
      const content = this._contentOf(node);
      this._contentExtent.set(key, content);
      const scroll = Math.min(
        this._scroll.get(key) ?? 0,
        Math.max(0, content - extent)
      );
      this._scroll.set(key, scroll);
      if (node.axis === 'col') {
        originY -= scroll;
      } else {
        originX -= scroll;
      }
    }

    const managed = node.mode !== 'flow';
    const children =
      node.mode === 'tabs'
        ? node.children.slice(this._activeTab(node), this._activeTab(node) + 1)
        : node.children;

    // Anything under an inactive tab leaves the layout entirely.
    if (node.mode === 'tabs') {
      const active = this._activeTab(node);
      for (let i = 0; i < node.children.length; i++) {
        if (i === active) {
          continue;
        }
        for (const index of collect(node.children[i])) {
          const el = this.host.cellNode(index);
          if (el) {
            this._hide(el);
          }
        }
      }
    }

    const total =
      children.reduce((sum, c) => sum + (c.weight > 0 ? c.weight : 1), 0) || 1;

    let cursor = node.axis === 'col' ? originY : originX;
    for (const child of children) {
      const share = (child.weight > 0 ? child.weight : 1) / total;
      if (node.axis === 'col') {
        // A managed group overflows along its own axis; a flowing one divides
        // the space it was given.
        const ch = managed ? this._extentOf(child, 'col') : h * share;
        this._commit(child, originX, cursor, w, ch, childClip, ctx);
        cursor += ch;
      } else {
        const cw = managed ? this._extentOf(child, 'row') : w * share;
        this._commit(child, cursor, originY, cw, h, childClip, ctx);
        cursor += cw;
      }
    }
  }

  /**
   * Absolutely position a cell against its root managed group's grid area,
   * clipping it to the accumulated clip rectangle.
   */
  private _placeAbsolute(
    el: HTMLElement,
    x: number,
    y: number,
    w: number,
    h: number,
    clip: IClip
  ): void {
    // Entirely outside the visible band: drop it (tier-2 culling).
    if (x + w <= clip.x0 || x >= clip.x1 || y + h <= clip.y0 || y >= clip.y1) {
      this._hide(el);
      return;
    }
    this._show(el);

    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    // clip-path establishes a containing block for fixed-position descendants,
    // so only the cells actually straddling an edge get one.
    const top = Math.max(0, clip.y0 - y);
    const left = Math.max(0, clip.x0 - x);
    const bottom = Math.max(0, y + h - clip.y1);
    const right = Math.max(0, x + w - clip.x1);
    el.style.clipPath =
      top || left || bottom || right
        ? `inset(${top}px ${right}px ${bottom}px ${left}px)`
        : '';
  }

  private _applyPlacement(el: HTMLElement, placement: IPlacement): void {
    el.style.gridRow = `${placement.rowStart} / ${placement.rowEnd}`;
    el.style.gridColumn = `${placement.colStart} / ${placement.colEnd}`;
  }

  private _reset(el: HTMLElement): void {
    el.style.position = '';
    el.style.top = '';
    el.style.left = '';
    el.style.right = '';
    el.style.width = '';
    el.style.height = '';
    el.style.clipPath = '';
    this._show(el);
  }

  /** A cell with no placement (e.g. mid-move) is kept out of the way. */
  private _park(el: HTMLElement): void {
    this._reset(el);
    el.style.gridRow = '';
    el.style.gridColumn = '';
  }

  private _hide(el: HTMLElement): void {
    el.dataset.mosaicHidden = 'true';
    el.style.display = 'none';
  }

  private _show(el: HTMLElement): void {
    if (el.dataset.mosaicHidden) {
      delete el.dataset.mosaicHidden;
      el.style.display = '';
    }
  }

  private _observe(el: HTMLElement): void {
    if (this._observed.has(el)) {
      return;
    }
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) {
      return; // still a placeholder; pick it up on a later pass
    }
    this._observed.add(el);
    for (const child of children) {
      this._resizeObserver.observe(child);
    }
  }

  // -- chrome ---------------------------------------------------------------

  private _updateChrome(solution: ISolution): void {
    const seen = new Set<string>();

    for (const [key, node] of this._nodesByKey) {
      if (node.path.length === 0) {
        continue; // the root has no frame
      }
      const box = this._boxes.get(key);
      if (!box) {
        continue;
      }
      seen.add(key);
      let frame = this._chrome.get(key);
      if (!frame) {
        frame = this._createFrame(node);
        this._chrome.set(key, frame);
        this._overlay.appendChild(frame);
      }
      frame.dataset.mosaicMode = node.mode;
      frame.dataset.mosaicAxis = node.axis;
      frame.style.transform = `translate(${box.x}px, ${box.y}px)`;
      frame.style.width = `${box.w}px`;
      frame.style.height = `${box.h}px`;
      this._updateScrollbar(frame, node, key, box);
      this._updateTabBar(frame, node, key);
    }
    void solution;

    for (const [key, frame] of [...this._chrome]) {
      if (!seen.has(key)) {
        frame.remove();
        this._chrome.delete(key);
      }
    }
  }

  private _createFrame(node: IGroupNode): HTMLElement {
    const frame = document.createElement('div');
    frame.className = 'mosaic-frame';

    const run = document.createElement('button');
    run.className = 'mosaic-frame-run';
    run.title = 'Run all cells in this group';
    run.textContent = '▶';
    run.onclick = () => this.host.runGroup(node);
    frame.appendChild(run);

    const bar = document.createElement('div');
    bar.className = 'mosaic-frame-scrollbar';
    const thumb = document.createElement('div');
    thumb.className = 'mosaic-frame-thumb';
    bar.appendChild(thumb);
    frame.appendChild(bar);

    const tabs = document.createElement('div');
    tabs.className = 'mosaic-frame-tabs';
    frame.appendChild(tabs);

    this._wireThumb(thumb, node);
    return frame;
  }

  private _wireThumb(thumb: HTMLElement, node: IGroupNode): void {
    thumb.addEventListener('pointerdown', (down: PointerEvent) => {
      down.preventDefault();
      down.stopPropagation();
      const key = groupKey(node.path);
      const box = this._boxes.get(key);
      if (!box) {
        return;
      }
      const vertical = node.axis === 'col';
      const extent = vertical ? box.h : box.w;
      const content = this._contentExtent.get(key) ?? extent;
      const start = vertical ? down.clientY : down.clientX;
      const origin = this._scroll.get(key) ?? 0;
      const ratio = content / Math.max(extent, 1);

      const move = (e: PointerEvent) => {
        const delta = (vertical ? e.clientY : e.clientX) - start;
        this._scroll.set(
          key,
          Math.min(
            Math.max(0, origin + delta * ratio),
            Math.max(0, content - extent)
          )
        );
        this.host.requestUpdate();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private _contentExtent = new Map<string, number>();

  private _updateScrollbar(
    frame: HTMLElement,
    node: IGroupNode,
    key: string,
    box: IBox
  ): void {
    const bar = frame.querySelector('.mosaic-frame-scrollbar') as HTMLElement;
    const thumb = frame.querySelector('.mosaic-frame-thumb') as HTMLElement;
    if (node.mode === 'flow') {
      bar.style.display = 'none';
      return;
    }
    const vertical = node.axis === 'col';
    const extent = vertical ? box.h : box.w;
    const content = this._contentExtent.get(key) ?? this._contentOf(node);

    if (content <= extent + 1) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = '';
    const scroll = this._scroll.get(key) ?? 0;
    const frac = Math.max(0.08, extent / content);
    const pos = (scroll / content) * extent;
    if (vertical) {
      thumb.style.height = `${frac * extent}px`;
      thumb.style.transform = `translateY(${pos}px)`;
      thumb.style.width = '';
    } else {
      thumb.style.width = `${frac * extent}px`;
      thumb.style.transform = `translateX(${pos}px)`;
      thumb.style.height = '';
    }
  }

  private _updateTabBar(
    frame: HTMLElement,
    node: IGroupNode,
    key: string
  ): void {
    const bar = frame.querySelector('.mosaic-frame-tabs') as HTMLElement;
    if (node.mode !== 'tabs') {
      bar.style.display = 'none';
      bar.replaceChildren();
      return;
    }
    bar.style.display = '';
    const active = this._activeTab(node);
    const tabs = node.children.map((child, i) => {
      const tab = document.createElement('div');
      tab.className = 'mosaic-tab' + (i === active ? ' mosaic-tab-active' : '');
      tab.textContent =
        child.kind === 'cell'
          ? `Cell ${child.index + 1}`
          : `${child.children.length} items`;
      tab.onclick = () => this.setActiveTab(node.path, i);
      return tab;
    });
    bar.replaceChildren(...tabs);
    void key;
  }

  // -- input ----------------------------------------------------------------

  /** Innermost managed group whose box contains a viewport-local point. */
  private _managedAt(x: number, y: number): IManagedGroup | null {
    const solution = this._solution;
    if (!solution) {
      return null;
    }
    let best: IManagedGroup | null = null;
    for (const entry of solution.managed) {
      const box = this._boxes.get(groupKey(entry.node.path));
      if (!box) {
        continue;
      }
      if (
        x >= box.x &&
        x <= box.x + box.w &&
        y >= box.y &&
        y <= box.y + box.h
      ) {
        if (!best || entry.node.path.length > best.node.path.length) {
          best = entry;
        }
      }
    }
    return best;
  }

  /** Innermost group of any mode whose box contains a viewport-local point. */
  private _groupAt(x: number, y: number): IGroupNode | null {
    const solution = this._solution;
    if (!solution) {
      return null;
    }
    void solution;
    let best: IGroupNode | null = null;
    for (const [key, node] of this._nodesByKey) {
      if (node.path.length === 0) {
        continue;
      }
      const box = this._boxes.get(key);
      if (!box) {
        continue;
      }
      if (
        x >= box.x &&
        x <= box.x + box.w &&
        y >= box.y &&
        y <= box.y + box.h
      ) {
        if (!best || node.path.length > best.path.length) {
          best = node;
        }
      }
    }
    return best;
  }

  /** Convert a client point into viewport-local grid coordinates. */
  private _toLocal(clientX: number, clientY: number): [number, number] {
    const rect = this.viewport.getBoundingClientRect();
    return [clientX - rect.left, clientY - rect.top];
  }

  /**
   * Scroll whichever managed group sits under a client point. Used by drag
   * auto-scroll, which has no wheel events to work with.
   */
  nudgeScroll(clientX: number, clientY: number, delta: number): boolean {
    const [x, y] = this._toLocal(clientX, clientY);
    const entry = this._managedAt(x, y);
    if (!entry) {
      return false;
    }
    const key = groupKey(entry.node.path);
    const box = this._boxes.get(key);
    if (!box) {
      return false;
    }
    const extent = entry.node.axis === 'col' ? box.h : box.w;
    const max = Math.max(0, (this._contentExtent.get(key) ?? extent) - extent);
    const current = this._scroll.get(key) ?? 0;
    const next = Math.min(Math.max(0, current + delta), max);
    if (next === current) {
      return false;
    }
    this._scroll.set(key, next);
    this.host.requestUpdate();
    return true;
  }

  /** Box of a group in viewport-local coordinates. */
  boxOfPath(path: string[]): IBox | undefined {
    return this._boxes.get(groupKey(path));
  }

  private _onWheel(event: WheelEvent): void {
    const [x, y] = this._toLocal(event.clientX, event.clientY);
    const entry = this._managedAt(x, y);
    if (!entry) {
      return;
    }
    const key = groupKey(entry.node.path);
    const box = this._boxes.get(key);
    if (!box) {
      return;
    }
    const vertical = entry.node.axis === 'col';
    const extent = vertical ? box.h : box.w;
    const content = this._contentExtent.get(key) ?? extent;
    const max = Math.max(0, content - extent);
    if (max <= 0) {
      return;
    }

    const delta = vertical
      ? event.deltaY
      : event.deltaX !== 0
        ? event.deltaX
        : event.deltaY;
    const current = this._scroll.get(key) ?? 0;
    const next = Math.min(Math.max(0, current + delta), max);

    // At either end, hand the gesture back so the notebook scrolls (no chaining
    // comes for free without a real scroller).
    if (next === current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this._scroll.set(key, next);
    this.host.requestUpdate();
  }

  /**
   * Double-clicking the gap around a group toggles it between flowing (grows to
   * fit) and scrolling (fixed extent). We only act when the click landed on the
   * viewport itself, i.e. in the grid gap rather than on a cell.
   */
  private _onDblClick(event: MouseEvent): void {
    if (event.target !== this.viewport) {
      return;
    }
    const [x, y] = this._toLocal(event.clientX, event.clientY);
    const node = this._groupAt(x, y);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const box = this._boxes.get(groupKey(node.path));
    if (node.mode === 'flow') {
      // Freeze the group at roughly its current extent, then let it scroll.
      const size = box
        ? Math.round(node.axis === 'col' ? box.h : box.w)
        : undefined;
      this.host.saveGroupState(node, {
        mode: 'scroll',
        ...(size ? { size } : {})
      });
    } else {
      this.host.saveGroupState(node, { mode: 'flow' });
    }
  }

  dispose(): void {
    this.outer.removeEventListener('wheel', this._onWheel);
    this.viewport.removeEventListener('dblclick', this._onDblClick);
    this._resizeObserver.disconnect();
    this._outerResizeObserver.disconnect();
    this._overlay.remove();
    this._chrome.clear();
  }
}

function collect(node: MosaicNode, out: number[] = []): number[] {
  if (node.kind === 'cell') {
    out.push(node.index);
  } else {
    for (const child of node.children) {
      collect(child, out);
    }
  }
  return out;
}
