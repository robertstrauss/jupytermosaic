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

import {
  IGutter,
  distanceTo,
  divergeDepth,
  groupKey,
  newGroupId,
  sideFrom
} from './MosaicTree';
import { PATH_KEY, mosaicOf } from './MosaicNotebook';

const DROP_TARGET_CLASS = 'jp-mod-dropTarget';
const JUPYTER_CELL_CLASS = 'jp-Cell';
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';
/** Distance from a group's edge, in px, that triggers drag auto-scroll. */
const AUTOSCROLL_MARGIN = 24;
/** How far outside a cell a drop still counts as aimed at that cell. */
const CELL_HIT_MARGIN = 12;
/**
 * How far a drop may sit from any target and still reach it.
 *
 * Every target is bounded. An unbounded search always finds *something*, which
 * is how a drop through a gap between targets used to teleport cells to
 * whichever handle happened to win a distance comparison across the whole
 * notebook. Finding nothing and putting the cells back is the better failure.
 */
const DROP_RANGE = 96;

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
  clearDropTargets(notebook);

  const toMove: Cell[] = event.mimeData.getData('internal:cells');
  if (!toMove?.length) {
    event.dropAction = 'none';
    return;
  }
  event.dropAction = 'move';

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
    // Nothing within reach: leave the cells where they were.
    event.dropAction = 'none';
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
 * Returns null when nothing is close enough, and the drop is then abandoned.
 * Every target has a bounded reach: a search with no limit always finds some
 * target, so a drop into a gap between them landed wherever won a distance
 * comparison taken across the whole notebook.
 */
function hitTest(
  notebook: Notebook,
  clientX: number,
  clientY: number
): DropTarget | null {
  const mosaic = mosaicOf(notebook);
  const viewport = notebook.viewportNode.getBoundingClientRect();
  const x = clientX - viewport.left;
  const y = clientY - viewport.top;

  // 1. Inside a gutter. They are narrow, and the cells beside them stay
  //    reachable by aiming a little further in.
  const inGutter = mosaic?.grid.gutterAt(x, y);
  if (inGutter) {
    return { kind: 'gutter', gutter: inGutter };
  }

  // 2. On a cell.
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

  // 3. Below everything the grid laid out. This is the notebook's own trailing
  //    seam, and it claims the blank space under the last row -- which is
  //    bounded by the scroller, so it does not reach up into the notebook. A
  //    nearest-target search cannot serve this: when the last tile is a plain
  //    cell there is no trailing gutter at all, and the closest gutter is then
  //    some row's side edge, which is how a drop down here ended up mid-row.
  if (
    mosaic &&
    y > mosaic.grid.contentBottom &&
    x >= 0 &&
    x <= viewport.width
  ) {
    const trailing = mosaic.solution?.gutters.find(
      gutter => gutter.path.length === 0 && gutter.cellAfter < 0
    );
    if (trailing) {
      return { kind: 'gutter', gutter: trailing };
    }
    const last = notebook.widgets.length - 1;
    if (last >= 0) {
      // No trailing gutter means the last tile is a cell of the root column,
      // so its bottom edge already means "a new row at the end".
      return { kind: 'cell', index: last, side: 'bottom' };
    }
  }

  // 4. Otherwise the nearest target, gutter or cell, within reach of the point.
  let best: DropTarget | null = null;
  let bestDistance = DROP_RANGE * DROP_RANGE;

  for (const gutter of mosaic?.solution?.gutters ?? []) {
    const distance = distanceTo(x, y, mosaic!.grid.gutterRect(gutter));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { kind: 'gutter', gutter };
    }
  }

  const cellRange = Math.min(DROP_RANGE, CELL_HIT_MARGIN) ** 2;
  for (let index = 0; index < notebook.widgets.length; index++) {
    const node = notebook.widgets[index].node;
    if (node.dataset.mosaicHidden || !node.isConnected) {
      continue;
    }
    const rect = mosaic?.grid.cellRect(index);
    if (!rect) {
      continue;
    }
    const distance = distanceTo(x, y, rect);
    if (distance < Math.min(bestDistance, cellRange)) {
      bestDistance = distance;
      best = { kind: 'cell', index, side: sideFrom(rect, x, y) };
    }
  }

  return best;
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
