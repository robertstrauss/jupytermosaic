/**
 * The transpose control: put a cell's output beside its code instead of under
 * it.
 *
 * In a tiled layout a cell is often wider than it is tall, and stacking a short
 * output under a short input wastes the width. Transposing puts the input and
 * output halves in a flex row, so the two prompts sit level with each other and
 * the output reads across from the code that made it.
 *
 * The button is modelled on `jp-OutputArea-promptOverlay`, JupyterLab's own
 * invisible-until-hovered control for toggling output scrolling: same prompt
 * column, same hover treatment, same silence when you are not reaching for it.
 * It takes the square at the top of that column and leaves the rest to the
 * stock overlay.
 */

import { Cell } from '@jupyterlab/cells';
import {
  collapseIcon,
  expandIcon,
  moveDownIcon,
  moveUpIcon
} from '@jupyterlab/ui-components';

/** Cell metadata key: true when the output sits beside the code. */
export const TRANSPOSE_KEY = 'mosaic_transposed';

const BUTTON_CLASS = 'mosaic-transposeOverlay';
const CELL_CLASS = 'mosaic-transposed';
const PRESS_OUTSIDE_CLASS = 'mosaic-press-outside';
const OUTPUT_CONTROLS = `.jp-OutputArea-promptOverlay, .${BUTTON_CLASS}`;

export function isTransposed(cell: Cell): boolean {
  return cell.model.getMetadata(TRANSPOSE_KEY) === true;
}

/**
 * Give a cell its transpose button, and put it in the state its metadata asks
 * for. Idempotent: called on every layout pass, since windowing rebuilds a
 * cell's contents whenever it comes back into view.
 */
export function applyTranspose(cell: Cell): void {
  const outputArea = cell.node.querySelector('.jp-OutputArea');
  const transposed = isTransposed(cell);
  cell.node.classList.toggle(CELL_CLASS, transposed && !!outputArea);

  if (!outputArea) {
    // Markdown and raw cells have no output to move.
    cell.node.querySelector(`.${BUTTON_CLASS}`)?.remove();
    return;
  }

  let button = outputArea.querySelector(
    `.${BUTTON_CLASS}`
  ) as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement('button');
    button.className = BUTTON_CLASS;
    button.type = 'button';
    button.addEventListener('click', event => {
      event.stopPropagation();
      cell.model.setMetadata(TRANSPOSE_KEY, !isTransposed(cell));
    });
    // Last, as JupyterLab appends its own overlay: the output area paints its
    // children in order, so anything inserted ahead of them is covered by the
    // output itself -- invisible on hover and deaf to clicks.
    outputArea.appendChild(button);
  }

  // The title names what the click will do, not what the cell is now.
  button.title = transposed
    ? 'Place Output Below Code'
    : 'Place Output Beside Code';

  const icon = transposed ? moveDownIcon : moveUpIcon;
  if (button.dataset.mosaicIcon !== icon.name) {
    button.dataset.mosaicIcon = icon.name;
    button.replaceChildren(icon.element({ tag: 'span' }));
  }
}

/**
 * Let a press that began off the output's controls pass through them.
 *
 * They overlie the output, and a text selection dragged onto one ends there
 * with nothing selected. So they only answer a press that started on them: from
 * any other press until its release, a body class turns their pointer events
 * off. Call once.
 */
export function letSelectionsPassOutputControls(): void {
  const release = () => document.body.classList.remove(PRESS_OUTSIDE_CLASS);

  window.addEventListener(
    'pointerdown',
    event => {
      const onControl =
        event.target instanceof Element &&
        event.target.closest(OUTPUT_CONTROLS) !== null;
      document.body.classList.toggle(PRESS_OUTSIDE_CLASS, !onControl);
    },
    // Capturing, so that nothing in the page can stop these from arriving.
    true
  );
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  // A release outside the window may never be reported.
  window.addEventListener('blur', release);
}

/**
 * Draw the stock overlay's expand/collapse icon when the overlay is hovered,
 * if JupyterLab has not drawn it.
 *
 * JupyterLab draws that icon only when scrolling is toggled or the output first
 * renders, and leaves it out if the overlay is no taller than the icon at that
 * moment. In a notebook opened with its outputs already in place the overlay has
 * no height yet, so the icon never appeared until the first click. JupyterLab's
 * CSS shows the icon only on hover, so drawing it then is never late. It is the
 * same icon JupyterLab would draw, which its own later updates recognise and
 * replace. Call once.
 */
export function drawOverlayIconsOnHover(): void {
  // JupyterLab's own threshold: a 16px icon plus 4px padding each side.
  const ICON_HEIGHT = 24;

  document.addEventListener(
    'pointerover',
    event => {
      const overlay =
        event.target instanceof Element &&
        event.target.closest('.jp-OutputArea-promptOverlay');
      if (
        !(overlay instanceof HTMLElement) ||
        overlay.firstElementChild ||
        overlay.clientHeight <= ICON_HEIGHT
      ) {
        return;
      }
      const scrolled =
        overlay
          .closest('.jp-CodeCell')
          ?.classList.contains('jp-mod-outputsScrolled') ?? false;
      (scrolled ? expandIcon : collapseIcon).element({ container: overlay });
      overlay.title = scrolled ? 'Expand Output' : 'Collapse Output';
    },
    true
  );
}
