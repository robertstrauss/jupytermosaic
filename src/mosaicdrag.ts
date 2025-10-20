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

    let target = event.target as HTMLElement;
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

      const side = target.dataset.mosaicDropSide || closestSide(event, target);
      const collike = (side == 'bottom' || side == 'top');
      const rowlike = (side == 'left' || side == 'right');
      const beforelike = side == 'top' || side == 'left';
      const afterlike = side == 'bottom' || side == 'right';

      /** < MODIFIED: MOSAIC > **/
      let mosaicPath = null;
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
        // if (mosaicPath == null) return; // not over a group
        // const [group, depth] = self.treeGetExisting(mosaicPath);
        // if (beforelike) {
        //   toIndex = (self as any)._findCell(group.getLeaf(0)); // before first cell as reference
        // }
        // else if (afterlike) {
        //     toIndex = (self as any)._findCell(group.getLeaf(-1)); // after last cell as reference
        //     if (toIndex > 0) toIndex++; // want to go after this cell
        // }
        // if (toIndex < 0) {console.error('no cell in group!', mosaicPath, group); return;}

        const cells = target.getElementsByClassName(JUPYTER_CELL_CLASS);
        toIndex = (self as any)._findCell(cells[beforelike ? 0 : cells.length-1]) // get first or last cell, if going before or after
        if (toIndex < 0) return;
        targetCell = self.widgets[toIndex];
        mosaicPath = Mosaic.getPath(targetCell)!;
        console.log('before?', beforelike, 'on group', target, 'path', mosaicPath, 'found ref cell', toIndex, (targetCell as any).prompt)

        // dropping on a group, we want to be besides it not inside, so back out 1 from the contained cell's path
        if (mosaicPath.length > 0) mosaicPath = mosaicPath.slice(0, mosaicPath.length-1)

      } else { // found a cell to drop on, not a group.
        targetCell = self.widgets[toIndex];
        mosaicPath = Mosaic.getPath(targetCell);
      }

      if (toIndex < 0 || mosaicPath == null) return; // still no luck finding something to drop on

      
      // create a new group to subdivide depending on side of cells its dropped on
      // const [targetGroup, ] = self.treeGetExisting(mosaicPath); // group to insert things in
      const targetAxis = (mosaicPath.length % 2) === 0 ? 'col' : 'row';
      if ( (targetAxis == 'row' && collike)
        || (targetAxis == 'col' && rowlike)) {
            // dropping off-axis (on top/bottom for row, or left/right for col)
            // means we subdivide. Create a new group:
            mosaicPath = [...mosaicPath, Mosaic.newUGID()];
            targetCell.model.setMetadata(Mosaic.METADATA_NAME, mosaicPath); // destination cell is part of this new group
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

      let firstChangedIndex = toIndex; // include destination cell in those rearranged by mosaic, even if unmoved in index

      if (afterlike) {
        toIndex += 1; // drop on bottom or right of cell to go after it
      }

      // self check is needed for consistency with the view.
      if (toIndex !== -1 && toIndex > fromIndex) {
        toIndex -= 1;
      } else if (toIndex === -1) {
        // If the drop is within the notebook but not on any cell,
        // most often self means it is past the cell areas, so
        // set it to move the cells to the end of the notebook.
        toIndex = self.widgets.length - 1;
      }
      // Don't move if we are within the block of selected cells.
      if (toIndex >= fromIndex && toIndex < fromIndex + toMove.length) {
        firstChangedIndex = Math.min(fromIndex, firstChangedIndex);
        console.log('first changed cell', (self.widgets[firstChangedIndex] as any).prompt)
        for (let i = 0; i < toMove.length+1; i++) {
          console.log('mos insert', 'Cell:'+ (self.widgets[firstChangedIndex+i] as any).prompt);
          self.mosaicInsert(firstChangedIndex+i);
          // self.mosaicInsert(movedcell); // TODO - make before/after, with/new integrate within Notebook/model?
        }
        return;
      }

      // Move the cells one by one
      self.moveCell(fromIndex, toIndex, toMove.length);

      // moveCell usually triggers onCellInserted which does the mosaicInsertion itself,
      // except for when creating a new group without reordering the cells, so we do it manually here
      // cells taken out from before the destination just shift the destination back.
      // orig jupyter code subtracted 1 already if toIndex > fromIndex, so we add 1
      if (toIndex > fromIndex) firstChangedIndex += - toMove.length; 
      // if (afterlike) firstChangedIndex -= 1; // include target cell even if dropped after it
      console.log('first changed cell', (self.widgets[firstChangedIndex] as any).prompt)
      for (let i = 0; i < toMove.length+1; i++) { // go for toMove.length+1 : do the moved cells and target cell
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
  let target = event.target as HTMLElement;
  while (target && target.parentElement) {
    if (target.classList.contains(JUPYTER_CELL_CLASS)) {
      break;
    }
    target = target.parentElement;
  }

  let index = (self as any)._findCell(target);

  const side = closestSide(event, target);
  // const collike = (side == 'bottom' || side == 'top');
  // const rowlike = (side == 'left' || side == 'right');
  // const beforelike = side == 'top' || side == 'left';
  // const afterlike = side == 'bottom' || side == 'right';
  if (index === -1) { // likely on a group border rather than a cell
    // let path = null; // try to find the group
    while (target && target.parentElement) {
      if (target.classList.contains(Mosaic.NODE_CLASS)) {
        target.classList.add(DROP_TARGET_CLASS);
        target.dataset.mosaicDropSide = side;
        break;
        // path = self.findGroup(target);
        // if (path !== null) break;
      }
      target = target.parentElement;
    }
    // if (path == null) return; // not on a group
    // const [group, depth] = self.treeGetExisting(path);
    // if (beforelike) {
    //   index = (self as any)._findCell(group.getLeaf(0)); // before first cell as reference
    //   if (index < 0) return;
    // }
    // else if (afterlike) {
    //   index = (self as any)._findCell(group.getLeaf(-1)); // after last cell as reference
    //   if (index < 0) return;
    //   index++; // want to go after this cell
    // }
    // else {console.error('Invalid side value!'); return} // shouldn't happen
  } else {
    const widget = (self as any).cellsArray[index];
    widget.node.classList.add(DROP_TARGET_CLASS);

    // mosaic: show line on side its going to insert on
    widget.node.dataset.mosaicDropSide = side;
  }


}





/**
 * Calculate which side of the target element the mouse is closest to. [BY: CHATGPT]
 * @param e The drag event from @lumino/dragdrop
 * @param target The target HTMLElement
 * @returns One of 'top', 'left', 'bottom', 'right'
 */
function closestSide(e: Drag.Event, target: HTMLElement): 'top' | 'left' | 'bottom' | 'right' {
  const rect = target.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;

  // Calculate distances to each side
  const distTop = Math.abs(y - rect.top);
  const distLeft = Math.abs(x - rect.left);
  const distBottom = Math.abs(y - rect.bottom);
  const distRight = Math.abs(x - rect.right);

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