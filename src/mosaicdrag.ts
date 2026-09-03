/**
 * Drag-and-drop for the mosaic grid.
 *
 * A drop is now purely a metadata edit: work out the destination path, write it
 * onto every moved cell, then let `Notebook.moveCell` reorder the linear list.
 * The layout falls out of the next rebuild. Nothing here touches widgets, DOM
 * parentage or any tree structure -- that is what makes it reliable.
 */

import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { Cell, MarkdownCell } from '@jupyterlab/cells';
import { Drag } from '@lumino/dragdrop';
import { ArrayExt, findIndex } from '@lumino/algorithm';

import { IGutter, divergeDepth, groupKey, newGroupId } from './MosaicTree';
import { PATH_KEY, mosaicOf } from './MosaicNotebook';

const DROP_TARGET_CLASS = 'jp-mod-dropTarget';
const JUPYTER_CELL_CLASS = 'jp-Cell';
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';
/** Distance from a group's edge, in px, that triggers drag auto-scroll. */
const AUTOSCROLL_MARGIN = 24;
/** How far outside a cell a drop still counts as aimed at that cell. */
const CELL_HIT_MARGIN = 12;

export type DropSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * Where a drop will land: on one edge of a cell, or in the gutter between two
 * adjacent groups. The gutter case is the only way to land *between* two whole
 * groups rather than inside one of them.
 */
type DropTarget =
  | { kind: 'cell'; index: number; side: DropSide }
  | { kind: 'gutter'; gutter: IGutter };

export function installMosaicDrag(notebook: Notebook): void {
  const anyNb = notebook as any;
  anyNb._evtDrop = (event: Drag.Event) => mosaicDrop(notebook, event);
  anyNb._evtDragOver = (event: Drag.Event) => mosaicDragOver(notebook, event);
}

/** Path metadata for a cell, defaulting to the notebook root. */
function pathOf(cell: Cell): string[] {
  const raw = cell.model.getMetadata(PATH_KEY);
  return Array.isArray(raw) ? (raw as string[]) : [];
}

function setPath(cell: Cell, path: string[]): void {
  cell.model.setMetadata(PATH_KEY, path);
}

export function mosaicDrop(notebook: Notebook, event: Drag.Event): void {
  if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (event.proposedAction === 'none') {
    event.dropAction = 'none';
    return;
  }
  const mosaic = mosaicOf(notebook);
  if (!notebook.model || !mosaic || event.source !== notebook) {
    // Cross-notebook mosaic drops are not supported yet.
    return;
  }
  event.dropAction = 'move';

  clearDropTargets(notebook);

  const toMove: Cell[] = event.mimeData.getData('internal:cells');
  if (!toMove?.length) {
    return;
  }

  // Collapsed markdown headings carry their hidden children along.
  const last = toMove[toMove.length - 1];
  if (last instanceof MarkdownCell && last.headingCollapsed) {
    const nextParent = NotebookActions.findNextParentHeading(last, notebook);
    if (nextParent > 0) {
      const index = findIndex(
        notebook.widgets,
        (c: Cell) => last.model.id === c.model.id
      );
      toMove.push(...notebook.widgets.slice(index + 1, nextParent));
    }
  }

  const hit = hitTest(notebook, event.clientX, event.clientY);
  if (!hit) {
    return;
  }

  let destPath: string[];
  let toIndex: number;
  let after: boolean;

  if (hit.kind === 'gutter') {
    // Land on the seam: the cells become children of the group that owns it.
    // A trailing gutter has nothing after it, so anchor to the cell before.
    destPath = hit.gutter.path;
    if (hit.gutter.cellAfter >= 0) {
      toIndex = hit.gutter.cellAfter;
      after = false;
    } else if (hit.gutter.cellBefore >= 0) {
      toIndex = hit.gutter.cellBefore;
      after = true;
    } else {
      return;
    }
  } else {
    const targetCell = notebook.widgets[hit.index];
    if (!targetCell || toMove.includes(targetCell)) {
      return;
    }
    toIndex = hit.index;
    after = hit.side === 'bottom' || hit.side === 'right';
    destPath = pathOf(targetCell);

    // A drop on the off-axis edge subdivides: the target cell and the incoming
    // cells become the two children of a brand new group.
    const targetAxis = destPath.length % 2 === 0 ? 'col' : 'row';
    const wantsRow = hit.side === 'left' || hit.side === 'right';
    if ((targetAxis === 'col') === wantsRow) {
      destPath = [...destPath, newGroupId()];
      setPath(targetCell, destPath);
    }
  }

  // Preserve any structure internal to the moved selection.
  let sharedPath = pathOf(toMove[0]);
  let diverge = sharedPath.length;
  for (const cell of toMove) {
    diverge = divergeDepth(pathOf(cell), sharedPath);
    sharedPath = sharedPath.slice(0, diverge);
  }

  // Moving several cells across an axis flip would transpose their internal
  // rows and columns; an extra wrapper group preserves the original shape.
  const transpose =
    toMove.length > 1 && diverge % 2 !== destPath.length % 2
      ? newGroupId()
      : null;

  for (const cell of toMove) {
    const prev = pathOf(cell);
    const state = notebook.model.getMetadata(groupKey(prev));
    if (transpose) {
      prev.splice(diverge, 0, transpose);
    }
    const next = [...destPath, ...prev.slice(diverge)];
    if (state) {
      notebook.model.setMetadata(groupKey(next), state);
    }
    setPath(cell, next);
  }

  // Now place the selection in the linear list, next to the target.
  //
  // `moveCell`'s `to` means different things by direction: moving down it is
  // the final index of the *last* cell of the block, moving up the index of the
  // *first*. Getting this wrong shifts a multi-cell drag by n-1 positions.
  const fromIndex = ArrayExt.firstIndexOf(notebook.widgets, toMove[0]);
  if (toIndex > fromIndex) {
    if (!after) {
      toIndex -= 1;
    }
  } else if (after) {
    toIndex += 1;
  }
  toIndex = Math.max(0, Math.min(toIndex, notebook.widgets.length - 1));

  if (fromIndex !== toIndex) {
    notebook.moveCell(fromIndex, toIndex, toMove.length);
  }
  mosaic.persistRepair();
  mosaic.requestUpdate();
}

export function mosaicDragOver(notebook: Notebook, event: Drag.Event): void {
  if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.dropAction = event.proposedAction;

  clearDropTargets(notebook);

  const mosaic = mosaicOf(notebook);
  const hit = hitTest(notebook, event.clientX, event.clientY);

  if (hit?.kind === 'gutter') {
    mosaic?.grid.highlightGutter(hit.gutter);
  } else {
    mosaic?.grid.highlightGutter(null);
    if (hit) {
      const toMove: Cell[] = event.mimeData.getData('internal:cells') ?? [];
      const cell = notebook.widgets[hit.index];
      if (cell && !toMove.includes(cell)) {
        cell.node.classList.add(DROP_TARGET_CLASS);
        cell.node.dataset.mosaicDropSide = hit.side;
      }
    }
  }

  autoScroll(notebook, event);
}

/** Scroll a managed group when the pointer nears its edge mid-drag. */
function autoScroll(notebook: Notebook, event: Drag.Event): void {
  const mosaic = mosaicOf(notebook);
  if (!mosaic) {
    return;
  }
  const outer = notebook.outerNode.getBoundingClientRect();
  if (event.clientY < outer.top + AUTOSCROLL_MARGIN) {
    notebook.outerNode.scrollBy({ top: -AUTOSCROLL_MARGIN });
  } else if (event.clientY > outer.bottom - AUTOSCROLL_MARGIN) {
    notebook.outerNode.scrollBy({ top: AUTOSCROLL_MARGIN });
  }
  // Groups get first refusal, so an inner scroller wins over the notebook.
  mosaic.grid.nudgeScroll(event.clientX, event.clientY, AUTOSCROLL_MARGIN);
}

function clearDropTargets(notebook: Notebook): void {
  for (const el of Array.from(
    notebook.node.getElementsByClassName(DROP_TARGET_CLASS)
  )) {
    el.classList.remove(DROP_TARGET_CLASS);
    delete (el as HTMLElement).dataset.mosaicDropSide;
  }
  mosaicOf(notebook)?.grid.highlightGutter(null);
}

/**
 * What lies under a client point: a gutter, or a cell and one of its edges.
 *
 * Tried in order of how directly the point identifies a target. The last two
 * steps matter as much as the first: without them a drop in empty space fell
 * through to whichever cell happened to be nearest and then to whichever of
 * *its* edges was closest, which for a point below the notebook was some cell
 * mid-row -- and, further out, could be a cell anywhere at all.
 */
function hitTest(
  notebook: Notebook,
  clientX: number,
  clientY: number
): DropTarget | null {
  const mosaic = mosaicOf(notebook);
  const rect = notebook.viewportNode.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // 1. In a gutter. Gutters are narrow, and the cells beside them stay
  //    reachable by aiming a little further in.
  const inGutter = mosaic?.grid.gutterAt(x, y);
  if (inGutter) {
    return { kind: 'gutter', gutter: inGutter };
  }

  // 2. On a cell, or close enough to it to have meant it.
  let target = elementFromPoint(clientX, clientY);
  while (target && !target.classList.contains(JUPYTER_CELL_CLASS)) {
    target = target.parentElement;
  }
  if (target) {
    const index = notebook.widgets.findIndex(cell => cell.node === target);
    if (index >= 0) {
      return {
        kind: 'cell',
        index,
        side: closestSide(clientX, clientY, target, 0.25)
      };
    }
  }
  const near = nearestCell(notebook, clientX, clientY, CELL_HIT_MARGIN);
  if (near) {
    return {
      kind: 'cell',
      index: near.index,
      side: closestSide(
        clientX,
        clientY,
        notebook.widgets[near.index].node,
        0.25
      )
    };
  }

  // 3. Outside everything: the nearest seam. Dropping below the last row means
  //    the notebook's trailing gutter, not a cell edge inside that row.
  const nearestGutter = mosaic?.grid.nearestGutter(x, y);
  if (nearestGutter) {
    return { kind: 'gutter', gutter: nearestGutter };
  }

  // 4. No seams at all -- a notebook that is one plain column. Fall back to the
  //    nearest cell, taking the side from the direction the point lies in
  //    rather than from its closest edge, which is meaningless out here.
  const outside = nearestCell(notebook, clientX, clientY, Infinity);
  return outside
    ? { kind: 'cell', index: outside.index, side: outside.side }
    : null;
}

/**
 * The nearest cell within `margin` of the point, with the side taken from the
 * direction the point lies in relative to it.
 */
function nearestCell(
  notebook: Notebook,
  clientX: number,
  clientY: number,
  margin: number
): { index: number; side: DropSide } | null {
  let best = -1;
  let bestDistance = Infinity;
  let bestSide: DropSide = 'bottom';

  for (let i = 0; i < notebook.widgets.length; i++) {
    const node = notebook.widgets[i].node;
    if (node.dataset.mosaicHidden || !node.isConnected) {
      continue;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }
    const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
    const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
    const distance = dx * dx + dy * dy;
    if (distance >= bestDistance || Math.max(dx, dy) > margin) {
      continue;
    }
    bestDistance = distance;
    best = i;
    bestSide =
      dy >= dx
        ? clientY < rect.top
          ? 'top'
          : 'bottom'
        : clientX < rect.left
          ? 'left'
          : 'right';
  }

  return best < 0 ? null : { index: best, side: bestSide };
}

/**
 * Which side of an element a point is nearest.
 *
 * @param balanceAspect Evens out the drop zones of non-square elements
 *   (0 = strictly nearest edge, 1 = four equal-area zones).
 */
export function closestSide(
  x: number,
  y: number,
  target: HTMLElement,
  balanceAspect = 0
): DropSide {
  const rect = target.getBoundingClientRect();

  let top = Math.abs(y - rect.top);
  let left = Math.abs(x - rect.left);
  let bottom = Math.abs(y - rect.bottom);
  let right = Math.abs(x - rect.right);

  if (balanceAspect > 0 && rect.height > 0) {
    const aspect = rect.width / rect.height;
    top = (1 - balanceAspect) * top + balanceAspect * top * aspect;
    bottom = (1 - balanceAspect) * bottom + balanceAspect * bottom * aspect;
    left = (1 - balanceAspect) * left + (balanceAspect * left) / aspect;
    right = (1 - balanceAspect) * right + (balanceAspect * right) / aspect;
  }

  const min = Math.min(top, left, bottom, right);
  if (min === top) {
    return 'top';
  }
  if (min === left) {
    return 'left';
  }
  if (min === bottom) {
    return 'bottom';
  }
  return 'right';
}

/** `elementFromPoint`, ignoring Lumino's drag overlays. */
export function elementFromPoint(x: number, y: number): HTMLElement | null {
  const overlays = document.querySelectorAll(
    '.lm-cursor-backdrop, .lm-DragImage'
  );
  overlays.forEach(o => ((o as HTMLElement).style.visibility = 'hidden'));
  const found = document.elementFromPoint(x, y);
  overlays.forEach(o => ((o as HTMLElement).style.visibility = ''));
  return found as HTMLElement | null;
}
