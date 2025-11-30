import { NotebookActions } from '@jupyterlab/notebook';
// import { DROP_TARGET_CLASS } from '@jupyterlab/notebook/src/constants'
import { Drag } from '@lumino/dragdrop'
import { Cell, MarkdownCell } from '@jupyterlab/cells'
import { ArrayExt, findIndex } from '@lumino/algorithm'
import { Mosaic } from './MosaicGroup';
import { MosaicNotebook } from './MosaicNotebookPanel';

// import { MosaicNotebookViewModel } from './MosaicViewModel';
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';
const JUPYTER_CELL_CLASS = 'jp-Cell';
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

export function mosaicDrop(self: MosaicNotebook, event: Drag.Event) {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }

    // let target = event.target as HTMLElement;
    let target = elFromPoint(event.clientX, event.clientY) as HTMLElement;
    while (target && target.parentElement) {
      if (target.classList.contains(DROP_TARGET_CLASS)) {
        target.classList.remove(DROP_TARGET_CLASS);
        break;
      }
      target = target.parentElement;
    }

    // Model presence should be checked before calling event handlers
    self.model!;

    const source: MosaicNotebook = event.source;
    if (source === self) {
      // Handle the case where we are moving cells within
      // the same notebook.
      event.dropAction = 'move';
      const toMove: Cell[] = event.mimeData.getData('internal:cells');

      // For collapsed markdown headings with hidden "child" cells, move all
      // child cells as well as the markdown heading.
      const cell = toMove[toMove.length - 1];
      if (cell instanceof MarkdownCell && cell.headingCollapsed) {
        const nextParent = NotebookActions.findNextParentHeading(cell, source);
        if (nextParent > 0) {
          const index = findIndex(source.widgets, (possibleCell: Cell) => {
            return cell.model.id === possibleCell.model.id;
          });
          toMove.push(...source.widgets.slice(index + 1, nextParent));
        }
      }

      // Compute the to/from indices for the move.
      let fromIndex = ArrayExt.firstIndexOf(self.widgets, toMove[0]);
      let toIndex = (self as any)._findCell(target);


      /** < MODIFIED: MOSAIC > **/
      let mosaicPath: string[] = [];
      let targetCell: Cell;
      if (toIndex < 0) { // not dropped on a cell, likely on mosaicgroup border
         while (target && target.parentElement) { // get nearest group
          if (target.classList.contains(Mosaic.NODE_CLASS)) {
            target.classList.remove(DROP_TARGET_CLASS);
            break;
            // mosaicPath = self.findGroup(target);
            // if (mosaicPath !== null) break;
          }
          target = target.parentElement;
        }
        if (!target || !target.parentElement) { // found no group. dropping at end of notebook
          toIndex = -1;
          target = self.viewportNode;
          source.viewportNode.classList.remove(DROP_TARGET_CLASS);
        }
      }

      const side = target.dataset.mosaicDropSide || closestSide(event, target, 0.25);
      const collike = (side == 'bottom' || side == 'top');
      const rowlike = (side == 'left' || side == 'right');
      const beforelike = side == 'top' || side == 'left';
      const afterlike = side == 'bottom' || side == 'right' || side == 'tab';

      if (toIndex < 0) { // on group or end space, not cell
        if (target.classList.contains(Mosaic.NODE_CLASS)) { // selecting edge of group
          const cells = target.getElementsByClassName(JUPYTER_CELL_CLASS);
          toIndex = (self as any)._findCell(cells[beforelike ? 0 : cells.length-1]) // get first or last cell, if going before or after
          if (toIndex < 0) return;
          targetCell = self.widgets[toIndex];
          mosaicPath = Mosaic.getPath(targetCell)!;
          // dropping on a group, we want to be beside it not inside, so back out 1 from the contained cell's path
          if (mosaicPath.length > 0) mosaicPath = mosaicPath.slice(0, mosaicPath.length-1)
        } else {
          targetCell = self.widgets[self.widgets.length-1];
        }
      } else { // found a cell to drop on
        targetCell = self.widgets[toIndex];
        mosaicPath = Mosaic.getPath(targetCell) || [];
      }

      // create a new group to subdivide depending on side of cells its dropped on
      // const [targetGroup, ] = self.treeGetExisting(mosaicPath); // group to insert things in
      const targetAxis = (mosaicPath.length % 2) === 0 ? 'col' : 'row';
      if ( (targetAxis == 'row' && collike)
        || (targetAxis == 'col' && rowlike)
        || (side == 'tab' && !(targetCell as any).superMosaic?.tabbed)) {
            // dropping off-axis (on top/bottom for row, or left/right for col)
            // means we subdivide. Create a new group:
            const newID = Mosaic.newUGID();
            mosaicPath = [...mosaicPath, newID];
            Mosaic.setPath(targetCell, mosaicPath); // destination cell is part of this new group
            if (side == 'tab') {
              Mosaic.saveMosaicState(self, 'mosaic:'+mosaicPath.join('/'), {tabbed: true});
              console.log('saved tabbed!');
              console.log('loaded:', Mosaic.loadMosaicState(self, 'mosaic:'+mosaicPath.join('/')));
            }
      }

      // get the deepest common branch of all cells to move
      let divergeDepth = 0;
      let sharedPath = Mosaic.getPath(toMove[0]) || [];
      for (let movecell of toMove) {
        const path = Mosaic.getPath(movecell)!;
        divergeDepth = Mosaic.divergeDepth(path, sharedPath);
        sharedPath = path.slice(0, divergeDepth);
      }

      // grafting multiple cells may transpose rows and columns. give an extra wraper to preserve source structure
      let transposeGroup;
      // mod 2 of the path tells us whether its a row or column, since these must alternate
      if (toMove.length > 1 && (divergeDepth % 2) !== (mosaicPath.length % 2)) {
        transposeGroup = Mosaic.newUGID();
      }

      // assign the metadata to each cell to place it in the mosaic
      for (const movecell of toMove) {
        const prevpath = Mosaic.getPath(movecell)!;
        if (transposeGroup) prevpath.splice(divergeDepth, 0, transposeGroup);
        // graft moved cell onto tree, preserving any internal structure 
        Mosaic.setPath(movecell, [...mosaicPath, ...prevpath.slice(divergeDepth)]);
      }

      if (toIndex === -1) {
        // If the drop is within the notebook but not on any cell,
        // most often self means it is past the cell areas, so
        // set it to move the cells to the end of the notebook.
        toIndex = self.widgets.length - 1;
      }

      let firstChangedIndex = toIndex; // include destination cell in those rearranged by mosaic, even if unmoved in index

      if (afterlike) {
        toIndex += 1; // drop on bottom or right of cell to go after it
      }


      // self check is needed for consistency with the view.
      if (toIndex !== self.widgets.length - 1 && toIndex !== -1 && toIndex > fromIndex) {
        toIndex -= 1;
      } 
      // Don't move if we are within the block of selected cells.
      if (toIndex >= fromIndex && toIndex < fromIndex + toMove.length) {
        firstChangedIndex = Math.min(fromIndex, firstChangedIndex);
        console.log('first changed cell', (self.widgets[firstChangedIndex] as any).prompt)
        for (let i = 0; i < toMove.length+1; i++) {
          if (firstChangedIndex+i >= self.widgets.length) break;
          console.log('mos insert', 'Cell:'+ (self.widgets[firstChangedIndex+i] as any).prompt);
          self.mosaicInsert(firstChangedIndex+i);
        }
        return;
      }
      else if (toIndex > fromIndex) firstChangedIndex -= toMove.length;

      // Move the cells one by one
      self.moveCell(fromIndex, toIndex, toMove.length);

      // // if (afterlike) firstChangedIndex -= 1; // include target cell even if dropped after it
      // // console.log('first changed cell', (self.widgets[firstChangedIndex] as any).prompt)
      for (let i = 0; i < toMove.length+1; i++) { // go for toMove.length+1 : do the moved cells and target cell
        if (firstChangedIndex+i >= self.widgets.length) break;
        console.log('mos insert', 'Cell:'+(self.widgets[firstChangedIndex+i] as any).prompt);
        self.mosaicInsert(firstChangedIndex+i);
      }

    } else {
      // CROSS NOTEBOOK MOSAIC NOT YET IMPLEMENTED
    }
}


export function mosaicDragOver(self: MosaicNotebook, event: Drag.Event): void {
  if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.dropAction = event.proposedAction;
  const elements = self.node.getElementsByClassName(DROP_TARGET_CLASS);
  if (elements.length) {
    (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
  }
  // let target = event.target as HTMLElement;
  let target = elFromPoint(event.clientX, event.clientY) as HTMLElement;
  let side: string = '';
  while (target && target.parentElement) {
    if (target.classList.contains(JUPYTER_CELL_CLASS)) {
      break;
    }
    if (target.classList.contains(Mosaic.NODE_CLASS)) {
      break;
    }
    if (target.classList.contains('jp-InputPrompt')) {
      side = 'tab';
    }
    target = target.parentElement;
  }
  target.classList.add(DROP_TARGET_CLASS);
  if (side == '') side = closestSide(event, target, 0.25);

  let index = (self as any)._findCell(target);

  if (index === -1) {
    if (!target || !target.parentElement) { // nothing found, probably dropping off end of notebook.
      target = event.source.viewportNode;
      target.classList.add(DROP_TARGET_CLASS);
      target.dataset.mosaicDropSide = 'bottom';
    }
  } else {
    const widget = (self as any).cellsArray[index];
    widget.node.classList.add(DROP_TARGET_CLASS);

    // mosaic: show line on side its going to insert on
    widget.node.dataset.mosaicDropSide = side;

    target = widget.node;
  }

  const toMove: Cell[] = event.mimeData.getData('internal:cells');

  if (toMove.map(cell => cell.node).includes(target)) {
    // event.dropAction = 'none';
    target.dataset.mosaicDropSide = '';
  }

  // Auto-scroll if near edges
  let group = event.target as HTMLElement;
  while (group && group.parentElement) {
    if (group.classList.contains(Mosaic.INNER_GROUP_CLASS)) {
      if (group.dataset.mosaicDirection === 'row') {
        if ( ((event.clientX < group.getBoundingClientRect().left + 20) && (group.scrollLeft > 0)) ) {
          group.scrollBy({left: -20});
          // trigger new drag check since content moved under it due to scroll
          requestAnimationFrame(() => {mosaicDragOver(self, event)});
          break;
        } else if ((event.clientX > group.getBoundingClientRect().right - 20) && (group.scrollLeft + group.clientWidth < group.scrollWidth)) {
          group.scrollBy({left: 20});
          requestAnimationFrame(() => {mosaicDragOver(self, event)});
          break;
        }
      } else {
        if ( ((event.clientY < group.getBoundingClientRect().top + 20) && (group.scrollTop > 0)) ) {
          group.scrollBy({top: -20});
          requestAnimationFrame(() => {mosaicDragOver(self, event)});
          break;
        } else if ((event.clientY > group.getBoundingClientRect().bottom - 20) && (group.scrollTop + group.clientHeight < group.scrollHeight)) {
          group.scrollBy({top: 20});
          requestAnimationFrame(() => {mosaicDragOver(self, event)});
          break;
        }
      }
    }
    group = group.parentElement;
  }
}





/**
 * Calculate which side of the target element the mouse is closest to.
 * @param e The drag event from @lumino/dragdrop
 * @param target The target HTMLElement
 * @param balanceAspect Make drop zones more equal size for non-square elements (0.0 = strictly use closest side, 1.0 = make all zones equal area, 0.5 = in-betweeen)
 * @returns One of 'top', 'left', 'bottom', 'right'
 */
function closestSide(e: Drag.Event, target: HTMLElement, balanceAspect = 0): 'top' | 'left' | 'bottom' | 'right' {
  const rect = target.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;

  // Calculate distances to each side
  let distTop = Math.abs(y - rect.top);
  let distLeft = Math.abs(x - rect.left);
  let distBottom = Math.abs(y - rect.bottom);
  let distRight = Math.abs(x - rect.right);

  if (balanceAspect > 0) {
    const aspect = rect.width / rect.height;
    distTop = (1-balanceAspect) * distTop + balanceAspect * distTop * aspect;
    distBottom = (1-balanceAspect) * distBottom + balanceAspect * distBottom * aspect;
    distLeft = (1-balanceAspect) * distLeft + balanceAspect * distLeft / aspect;
    distRight = (1-balanceAspect) * distRight + balanceAspect * distRight / aspect;
  }

  // Find the minimum distance
  const minDist = Math.min(distTop, distLeft, distBottom, distRight);

  switch (minDist) {
    case distTop:
      return 'top';
    case distLeft:
      return 'left';
    case distBottom:
      return 'bottom';
    case distRight:
      return 'right';
    default:
      // Fallback, shouldn't happen
      return 'top';
  }
}

function elFromPoint(x: number, y: number): HTMLElement | null {
  const overlays = document.querySelectorAll('.lm-cursor-backdrop, .lm-DragImage');

  overlays.forEach(o => (o as HTMLElement).style.visibility = 'hidden');

  const realTarget = document.elementFromPoint(x, y);

  overlays.forEach(o => (o as HTMLElement).style.visibility = '');
  return realTarget as HTMLElement;
}