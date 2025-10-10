import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { DROP_TARGET_CLASS } from '@jupyterlab/notebook/src/constants'
import { Drag } from '@lumino/dragdrop'
import { Cell, MarkdownCell } from '@jupyterlab/cells'
import { ArrayExt, findIndex } from '@lumino/algorithm'
import { MosaicGroup } from './MosaicGroup';

import { MosaicNotebookViewModel } from './MosaicViewModel';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

export function mosaicDrop(self: Notebook, viewModel: MosaicNotebookViewModel, event: Drag.Event) {
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
      const sibling = self.widgets[toIndex];
      const mosaicpath = sibling.model.metadata.mosaic as Array<string>;
      const group = viewModel.treeGet(mosaicpath);

      const side = closestSide(event, target);
      const collike = (side == 'bottom' || side == 'top');
      const rowlike = (side == 'left' || side == 'right');
      const beforelike = side == 'top' || side == 'left';
      const afterlike = side == 'top' || side == 'left';
      if ( (group.direction == 'row' && collike)
        || (group.direction == 'col' && rowlike)) {
            // dropping against group axis, need to create subgroup
            if (beforelike) group.newGroup([...toMove, target]);
            if (afterlike) group.newGroup([target, ...toMove]);
            for (let id of toMove.map(c => c.model.id)) delete group.viewModel.subTree['cell-'+id];
      } else if ( group.direction == 'row' && rowlike)

      if ( (group.direction == 'row' && rowlike)
        || (group.direction == 'col' && collike)) {
            if (beforelike) 
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