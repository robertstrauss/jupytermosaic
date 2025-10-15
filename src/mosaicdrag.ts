import { NotebookActions } from '@jupyterlab/notebook';
// import { DROP_TARGET_CLASS } from '@jupyterlab/notebook/src/constants'
import { Drag } from '@lumino/dragdrop'
import { Cell, MarkdownCell } from '@jupyterlab/cells'
import { ArrayExt, findIndex } from '@lumino/algorithm'
import { Mosaic } from './MosaicGroup';
import { MosaicNotebook } from './MosaicNotebookPanel';

// import { MosaicNotebookViewModel } from './MosaicViewModel';
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

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
      console.log('tm', toMove[0].dataset.windowedListIndex, toMove[0].model.id, (toMove[0] as any).prompt);
      console.log('w, ca', self.widgets.map(w=>(w as any).prompt), (self as any).cellsArray.map((w:any)=>w.prompt));
      let fromIndex = ArrayExt.firstIndexOf(self.widgets, toMove[0]);
      console.log('fi', fromIndex);
      let toIndex = (self as any)._findCell(target);


      /** < MODIFIED: MOSAIC > **/
      const dropCell = self.widgets[toIndex];
      const mosaicpath = dropCell.model.metadata.mosaic as Array<string> || [];
      const group = self.treeGet(mosaicpath) as Mosaic;
      const dropIdx = group.tiles.indexOf(dropCell); // index within this sub list

      const side = dropCell.node.dataset.mosaicDropSide || closestSide(event, target);
      const collike = (side == 'bottom' || side == 'top');
      const rowlike = (side == 'left' || side == 'right');
      // const beforelike = side == 'top' || side == 'left';
      const afterlike = side == 'bottom' || side == 'right';

      let toMosaic: Array<string> = [];
      if ( (group.direction == 'row' && collike)
        || (group.direction == 'col' && rowlike)) {
            const newGroup = group.addTile('', dropIdx);
            toMosaic = [...mosaicpath, newGroup.groupID];
            console.log('ADDED SUB ', group);

      } else if ( (group.direction == 'row' && rowlike)
               || (group.direction == 'col' && collike)) {
            toMosaic = mosaicpath;
      }

      for (const movecell of [...toMove, dropCell]) {
        movecell.model.setMetadata('mosaic', toMosaic);
        console.log('SET MOSAIC MD', movecell.model.getMetadata('mosaic'));
      }

      (self as any).onCellInserted(toIndex, dropCell); // trigger repositioning of destination cell, as it may be joining a new group


      /** </ MODIFIED: MOSAIC > **/
      console.log('tofro', toIndex, fromIndex);

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
        console.log('within');
        return;
      }

      // Move the cells one by one
      console.log('moving...', (self as any).tiles.map(Mosaic.showMosaic));
      self.moveCell(fromIndex, toIndex, toMove.length);
      /** < MODIFIED: MOSAIC > */
      console.log('afer?', afterlike);
      if (afterlike) {
        // move destination cell (now at toIndex+ n moved cells) back to in front of the new cells
        // could have used toIndex += 1 before original move, but we need moveCell to trigger
        // even when the from and to index are the same, since mosaic structure may change even if order doesn't.
        self.moveCell(toIndex+toMove.length, toIndex);
      }
      /** </ MODIFIED: MOSAIC > */
      console.log('moved.', (self as any).tiles.map(Mosaic.showMosaic));

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
  const target = event.target as HTMLElement;
  const index = (self as any)._findCell(target);
  if (index === -1) {
    return;
  }
  const widget = (self as any).cellsArray[index];
  widget.node.classList.add(DROP_TARGET_CLASS);


  /** < MODIFIED: MOSAIC > **/
  const side = closestSide(event, target); 
  widget.node.dataset.mosaicDropSide = side;
  /** </ MODIFIED: MOSAIC > **/
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