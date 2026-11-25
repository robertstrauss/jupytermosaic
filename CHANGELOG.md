# Changelog

Each release's notes are taken from its section here: the GitHub release for
`vX.Y.Z` is created from the `## X.Y.Z` section below. Add the section before
running `scripts/release.sh` (see RELEASE.md).

<!-- <START NEW CHANGELOG ENTRY> -->

<!-- <END NEW CHANGELOG ENTRY> -->

## 2.0.3 (2026-11-17)

Fixes for collapsed markdown headings.

**Fixed**

- Collapsing a heading no longer leaves blank space below it. Each hidden cell used to keep a sliver of the layout plus the spacing between cells, so the gap grew with the size of the hidden section.
- With cell handles above the cells (the default), a heading's collapse arrow now appears at the top left, above the heading, and can be clicked. Before, it sat at the far right under the cell toolbar and was cut off.

## 2.0.2 (2026-11-10)

Fixes for the scroll control and for scrolling after running a cell.

**Fixed**

- On JupyterLab 4.6, the scroll control no longer disappears once a cell's output is scrolled, so scrolling can be turned back off. JupyterLab 4.6 positions that control differently, and Mosaic now overrides it.
- In a notebook opened with its outputs already in place, the expand/collapse icon now appears on hover. Before, it only appeared after the first click.
- Running a cell with Shift+Enter no longer scrolls its output off the top of the page, or past the next cell's input. Scrolling now stops at the top of the output of the cell that just ran. Moving to a cell taller than the screen shows it from its top.

## 2.0.1 (2026-11-06)

Fixes for the output controls.

**Fixed**

- The scroll and transpose controls no longer scroll out of view once output scrolling is on, so scrolling can always be turned back off.
- One-line outputs keep both controls. The scroll control used to collapse to nothing when handles were beside the code.
- Dragging a text selection onto either control no longer extends it to the end of the output. A press that starts elsewhere now passes through them until it is released.

## 2.0.0 (2026-09-13)

Jupyter Mosaic 2.0: the layout engine rewritten on a single flat CSS grid.

**Highlights**

- Cells tile in a subdividable grid driven purely by cell metadata; notebooks stay ordinary `.ipynb` files and open linearly without the extension.
- Row heights follow content and column widths are strictly proportional, so a 2×2 with tall cells on the diagonal packs tight.
- Two-dimensional navigation (`h`/`j`/`k`/`l`) and insertion (`a`/`b`/`s`/`f`).
- A transpose button places a cell's output beside its code; a run button on each group's frame executes the whole subdivision.
- Collapses to a single linear column when the panel is too narrow (setting, on by default).
- Two demo notebooks and a gallery in the README.

**Notes**

- The PyPI distribution is `jupyter-mosaic` (`mosaic` was taken). The labextension id, the import package, and the uninstall command's target are all unchanged in function: `pip uninstall jupyter-mosaic`.
- The pre-2.0 `main` is preserved on the [`legacy`](https://github.com/robertstrauss/jupytermosaic/tree/legacy) branch.
