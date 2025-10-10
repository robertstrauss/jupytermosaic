import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { DROP_TARGET_CLASS } from '@jupyterlab/notebook/src/constants'
import { Drag } from '@lumino/dragdrop'
import { Cell, MarkdownCell } from '@jupyterlab/cells'
import { ArrayExt, findIndex } from '@lumino/algorithm'
import { Mosaic } from './MosaicGroup';

// import { MosaicNotebookViewModel } from './MosaicViewModel';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

export function mosaicDrop(self: Notebook, event: Drag.Event) {
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

    const source: Notebook = event.source;
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
      const dropCell = self.widgets[toIndex];
      const mosaicpath = dropCell.model.metadata.mosaic as Array<string>;
      const group = (self as any as Mosaic).treeGet(mosaicpath) as Mosaic;
    //   const groupIdx = group.indexOf(dropCell.model.id); // index within this sub list

      const side = closestSide(event, target);
      const collike = (side == 'bottom' || side == 'top');
      const rowlike = (side == 'left' || side == 'right');
    //   const beforelike = side == 'top' || side == 'left';
      const afterlike = side == 'top' || side == 'left';
      if ( (group.direction == 'row' && collike)
        || (group.direction == 'col' && rowlike)) {
            // dropping against group axis, need to create subgroup
            // splice with delete=1 to replace dropped on cell with new group including itself
            // if (beforelike) group.splice(groupIdx, 1, ...toMove, dropCell);
            // if (afterlike) group.splice(groupIdx, 1, dropCell, ...toMove);
            for (const movecell of [dropCell, ...toMove]) movecell.model.metadata.mosaic = [...mosaicpath, Mosaic.newUGID()]
      } else if ( (group.direction == 'row' && rowlike)
               || (group.direction == 'col' && collike)) {
            // dropping along group axis, just insert it into the list
            // if (beforelike) group.splice(groupIdx, 0, ...toMove);
            // if (afterlike) group.splice(groupIdx+1, 0, ...toMove);
            for (const movecell of toMove) movecell.model.metadata.mosaic = mosaicpath;
      }

      if (afterlike) {
        toIndex += 1 // cell should be moved after, not before
      }

      /** </ MODIFIED: MOSAIC > **/

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
        return;
      }

      // Move the cells one by one
      self.moveCell(fromIndex, toIndex, toMove.length);
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