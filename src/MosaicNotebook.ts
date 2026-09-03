/**
 * Wires the mosaic layout engine into a JupyterLab `Notebook`.
 *
 * The notebook keeps its own single `NotebookWindowedLayout` and its own view
 * model; we only override three *public* model methods and drive the grid from
 * cell metadata. Nothing ever reparents a cell widget, which is what made the
 * previous tree-of-WindowedLists approach lose cells on drag.
 */

import {
  Notebook,
  NotebookPanel,
  NotebookViewModel
} from '@jupyterlab/notebook';
import { Cell, CodeCell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { WindowedList } from '@jupyterlab/ui-components';

import { NotebookActions } from '@jupyterlab/notebook';

import { IGridHost, MosaicGrid } from './MosaicGrid';
import {
  IGroupNode,
  IGroupState,
  ISolution,
  Direction,
  buildTree,
  cellPaths,
  collapse,
  collectCells,
  groupKey,
  nearestInDirection,
  newGroupId,
  solve,
  subdividePath
} from './MosaicTree';
import { installMosaicDrag } from './mosaicdrag';

export type { Direction };

/** Cell metadata key holding the group path. */
export const PATH_KEY = 'mosaic';
/** Cell metadata key holding the cell's share of its parent's extent. */
export const WEIGHT_KEY = 'mosaic_weight';

export namespace MosaicNotebookPanel {
  export class ContentFactory extends NotebookPanel.ContentFactory {
    createNotebook(options: Notebook.IOptions): Notebook {
      const notebook = super.createNotebook(options);
      notebook.addClass('mosaic-Notebook');
      const controller = new MosaicNotebook(notebook);
      (notebook as any)._mosaic = controller;
      return notebook;
    }
  }
}

/** Retrieve the controller attached to a notebook, if it is a mosaic one. */
export function mosaicOf(notebook: Notebook): MosaicNotebook | null {
  return ((notebook as any)._mosaic as MosaicNotebook) ?? null;
}

export class MosaicNotebook implements IGridHost {
  constructor(protected notebook: Notebook) {
    const anyNb = notebook as any;
    this.grid = new MosaicGrid(
      notebook.viewportNode,
      anyNb._innerElement as HTMLElement,
      notebook.outerNode,
      this
    );

    this._installViewModelOverrides();
    this._installScrollReroute();
    this._installFooter();
    installMosaicDrag(notebook);

    notebook.modelChanged.connect(this._onModelChanged, this);
    if (notebook.model) {
      this._onModelChanged(notebook);
    }

    notebook.disposed.connect(() => this.dispose());
  }

  readonly grid: MosaicGrid;
  private _frame: number | null = null;
  private _solution: ISolution | null = null;
  private _watched = new WeakSet<ICellModel>();
  private _disposed = false;

  get solution(): ISolution | null {
    return this._solution;
  }

  // -- IGridHost ------------------------------------------------------------

  cellNode(index: number): HTMLElement | null {
    return this.notebook.widgets[index]?.node ?? null;
  }

  cellCount(): number {
    return this.notebook.widgets.length;
  }

  estimateHeight(index: number): number {
    const viewModel = (this.notebook as any).viewModel as NotebookViewModel;
    try {
      // The base heuristic sizes a cell from its source and output line counts.
      return NotebookViewModel.prototype.estimateWidgetSize.call(
        viewModel,
        index
      );
    } catch {
      return 90;
    }
  }

  requestUpdate(): void {
    if (this._frame !== null || this._disposed) {
      return;
    }
    this._frame = requestAnimationFrame(() => {
      this._frame = null;
      this.rebuild();
    });
  }

  runGroup(node: IGroupNode): void {
    const panel = this.notebook.parent as NotebookPanel | null;
    const context = panel?.sessionContext;
    for (const index of collectCells(node)) {
      const cell = this.notebook.widgets[index];
      if (cell instanceof CodeCell && context) {
        void CodeCell.execute(cell, context);
      } else if (cell instanceof MarkdownCell) {
        cell.rendered = true;
      }
    }
  }

  saveGroupState(node: IGroupNode, state: Record<string, unknown>): void {
    this.setGroupState(node.path, state as IGroupState);
  }

  // -- navigation -----------------------------------------------------------

  /**
   * Move the active cell one step in a direction, spatially.
   *
   * Navigation is geometric rather than structural, which gives every case the
   * user expects from one rule: in a column, up/down are the siblings above and
   * below, while left/right cross into the neighbouring tile of the enclosing
   * row at the nearest height; in a row those roles simply swap.
   *
   * @param extend Extend the selection instead of moving. The selection stays a
   *   contiguous run in notebook order, so stepping sideways into another tile
   *   selects everything linearly between the two cells.
   */
  navigate(direction: Direction, extend = false): boolean {
    const notebook = this.notebook;
    const target = this.neighbour(notebook.activeCellIndex, direction);
    if (target === null) {
      return false;
    }

    // Focus has to travel with the active cell. `Notebook._evtFocusIn` derives
    // activeCellIndex from whichever cell holds DOM focus, so moving the index
    // alone is undone by the next focus event -- leaving the selection repaint
    // as the only visible effect and making every step take two presses. This
    // mirrors what NotebookActions.selectBelow does around the same move.
    const wasFocused = notebook.node.contains(document.activeElement);

    notebook.mode = 'command';
    if (extend) {
      notebook.extendContiguousSelectionTo(target);
    } else {
      notebook.activeCellIndex = target;
      notebook.deselectAll();
    }
    if (wasFocused) {
      notebook.activate();
    }
    void notebook.scrollToItem(notebook.activeCellIndex);
    return true;
  }

  /** Nearest cell beyond `index` in a direction, or null at the edge. */
  neighbour(index: number, direction: Direction): number | null {
    const from = this.grid.cellRect(index);
    if (!from) {
      return null;
    }
    const candidates = [];
    for (let i = 0; i < this.cellCount(); i++) {
      if (i === index) {
        continue;
      }
      const rect = this.grid.cellRect(i);
      if (rect) {
        candidates.push({ index: i, rect });
      }
    }
    return nearestInDirection(from, candidates, direction);
  }

  // -- insertion ------------------------------------------------------------

  /**
   * Insert a new cell beside the active one, subdividing when the direction is
   * across the containing group's axis. Adding to the left of a cell in a
   * column turns that cell into a row of two; adding below a cell in a row
   * turns it into a column of two.
   */
  insertBeside(direction: Direction): void {
    const notebook = this.notebook;
    if (!notebook.model) {
      return;
    }
    const index = notebook.activeCellIndex;
    const reference = notebook.widgets[index];
    if (!reference) {
      return;
    }

    const path = this.pathOf(reference.model) ?? [];
    const wantAxis =
      direction === 'left' || direction === 'right' ? 'row' : 'col';
    const destination = subdividePath(path, wantAxis, newGroupId());
    if (destination !== path) {
      // The containing group runs the wrong way, so the reference cell moves
      // into the new subdivision alongside the cell we are about to add.
      this.setPath(reference.model, destination);
    }

    const before = direction === 'left' || direction === 'up';
    if (before) {
      NotebookActions.insertAbove(notebook);
    } else {
      NotebookActions.insertBelow(notebook);
    }

    // Claim the new cell explicitly, ahead of the inference in `rebuild`.
    const inserted = notebook.widgets[before ? index : index + 1];
    if (inserted) {
      this.setPath(inserted.model, destination);
    }
    this.persistRepair();
    this.requestUpdate();
  }

  /**
   * Note that the next cell to appear at the end belongs at the notebook root.
   *
   * Running the last cell advances into a cell the notebook creates for us.
   * Inheriting the neighbour's path would bury it in whatever tile happens to
   * be last, whereas an insert the user asked for -- a toolbar button, or a/b
   * and s/f -- should join that tile.
   */
  expectRootInsert(): void {
    this._rootInsertPending = true;
  }

  private _rootInsertPending = false;

  /**
   * Give any cell that arrived without a path one, based on its neighbour.
   *
   * Cells inserted by the notebook itself -- insert above/below, paste, split --
   * carry no mosaic metadata, and would otherwise land at the notebook root and
   * tear their neighbour's group in half. A cell landing next to a neighbour
   * that sits in a row subdivides it into a column, which is what stacking a
   * new cell above or below a tile looks like.
   */
  /**
   * Note that the next rebuild should persist its repairs.
   *
   * Called for changes the user made to the layout, and once on load. A
   * deletion deliberately does not: see the comment in {@link rebuild}.
   */
  persistRepair(): void {
    this._repairPending = true;
  }

  private _repairPending = true;

  /**
   * Persist repaired paths, so a corrupted notebook is fixed on disk and not
   * merely on screen. Writing nothing when nothing moved keeps a clean notebook
   * clean, so loading a sound one does not dirty it.
   *
   * The writes are one non-undoable transaction: normalising the metadata is
   * housekeeping, and letting it onto the undo stack would put an undo step
   * between the user and the edit they actually want back.
   */
  private _writeBackPaths(repaired: Map<number, string[]>): boolean {
    const model = this.notebook.model;
    const cells = this.notebook.widgets;
    if (!model) {
      return false;
    }

    const pending: [ICellModel, string[]][] = [];
    for (const [index, path] of repaired) {
      const cell = cells[index];
      if (!cell) {
        continue;
      }
      const current = this.pathOf(cell.model);
      if (!current || current.join('/') !== path.join('/')) {
        pending.push([cell.model, path]);
      }
    }
    if (pending.length === 0) {
      return false;
    }

    model.sharedModel.transact(() => {
      for (const [cell, path] of pending) {
        this.setPath(cell, path);
      }
    }, false);
    return true;
  }

  private _inferMissingPaths(): boolean {
    const cells = this.notebook.widgets;
    let changed = false;

    for (let i = 0; i < cells.length; i++) {
      if (this.pathOf(cells[i].model) !== undefined) {
        continue;
      }
      if (this._rootInsertPending && i === cells.length - 1) {
        this._rootInsertPending = false;
        this.setPath(cells[i].model, []);
        changed = true;
        continue;
      }
      const reference = cells[i - 1] ?? cells[i + 1];
      if (!reference) {
        this.setPath(cells[i].model, []);
        changed = true;
        continue;
      }
      const referencePath = this.pathOf(reference.model) ?? [];
      // Stacking onto a cell that lives in a row means a new column.
      const destination = subdividePath(referencePath, 'col', newGroupId());
      if (destination !== referencePath) {
        this.setPath(reference.model, destination);
      }
      this.setPath(cells[i].model, destination);
      changed = true;
    }
    return changed;
  }

  // -- layout ---------------------------------------------------------------

  /** Rebuild the tree from metadata and re-apply the grid. Idempotent. */
  rebuild(): void {
    const model = this.notebook.model;
    if (!model || this._disposed) {
      return;
    }
    this._inferMissingPaths();

    const cells = this.notebook.widgets;
    const weight = (index: number) =>
      Number(cells[index]?.model.getMetadata(WEIGHT_KEY)) || 1;
    const state = (path: string[]) => this.groupState(path);

    // Repair the layout before drawing it. Redundant groups come from ordinary
    // editing as well as from metadata that has drifted, and left alone they
    // show up as tiles wrapped around a plain run of cells.
    let root = buildTree(
      cells.map(c => this.pathOf(c.model)),
      weight,
      state
    );
    collapse(root);

    // The repair only reaches metadata on load or after a layout change the
    // user asked for. Persisting it after a deletion would rewrite the
    // surviving sibling's path, so undoing that deletion would bring the cell
    // back into a group its neighbour had already left, and the row would come
    // back flattened. Collapsing in memory keeps the display right meanwhile.
    const persist = this._repairPending;
    this._repairPending = false;
    if (persist && this._writeBackPaths(cellPaths(root))) {
      // Paths moved, so group state now hangs off different keys: rebuild from
      // the repaired metadata rather than patching the tree's own paths.
      root = buildTree(
        cells.map(c => this.pathOf(c.model)),
        weight,
        state
      );
    }

    this._solution = solve(root);
    this.grid.update(this._solution);
    this.notebook.update();
  }

  pathOf(model: ICellModel): string[] | undefined {
    const raw = model.getMetadata(PATH_KEY);
    return Array.isArray(raw) ? (raw as string[]) : undefined;
  }

  setPath(model: ICellModel, path: string[]): void {
    model.setMetadata(PATH_KEY, path);
  }

  groupState(path: string[]): IGroupState {
    return (
      (this.notebook.model?.getMetadata(groupKey(path)) as IGroupState) ?? {}
    );
  }

  setGroupState(path: string[], state: IGroupState): void {
    const model = this.notebook.model;
    if (!model) {
      return;
    }
    model.setMetadata(groupKey(path), { ...this.groupState(path), ...state });
    this.requestUpdate();
  }

  // -- JupyterLab integration ----------------------------------------------

  /**
   * Override the three public view-model methods that drive windowing.
   *
   * Patching the instance (rather than swapping `_viewModel`, as the previous
   * implementation did) keeps the base class's `stateChanged` wiring intact.
   */
  private _installViewModelOverrides(): void {
    const viewModel = (this.notebook as any).viewModel as NotebookViewModel;
    const grid = this.grid;
    let lastWindow: WindowedList.WindowIndex | null = null;
    let lastVersion = -1;

    // The grid spans the whole document, so the viewport is never translated.
    viewModel.getSpan = () => [0, grid.totalHeight];

    viewModel.getEstimatedTotalSize = () =>
      grid.totalHeight || this.cellCount() * 90;

    viewModel.getRangeToRender = (): WindowedList.WindowIndex | null => {
      const count = this.cellCount();
      if (count === 0) {
        return [-1, -1, -1, -1];
      }

      const overscan = Math.max(1, viewModel.overscanCount) * 200;
      const top = viewModel.scrollOffset - overscan;
      const bottom = viewModel.scrollOffset + viewModel.height + overscan;
      const hull = grid.hullForBand(top, bottom);

      const next: WindowedList.WindowIndex = hull
        ? [hull[0], hull[1], hull[0], hull[1]]
        : [0, count - 1, 0, count - 1];

      if (
        lastWindow &&
        lastVersion === grid.version &&
        lastWindow[0] === next[0] &&
        lastWindow[1] === next[1]
      ) {
        return null;
      }
      lastWindow = next;
      lastVersion = grid.version;
      return next;
    };
  }

  /**
   * Route every scroll-into-view through the grid, so that scrolling a cell
   * into view also scrolls the managed groups it lives inside. `scrollToItem`
   * is the single funnel for all of the notebook's scroll-to-cell paths.
   */
  private _installScrollReroute(): void {
    const notebook = this.notebook as any;
    notebook.scrollToItem = async (index: number): Promise<void> => {
      // Wait for the layout to catch up first. Running a cell grows its output
      // and so its row, and scrolling against the pre-execution geometry aimed
      // at where the next cell used to be -- carrying the executed cell off the
      // top of the viewport.
      this.requestUpdate();
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (this._disposed) {
        return;
      }

      const outer = this.notebook.outerNode;
      const target = this.grid.revealCell(
        index,
        outer.scrollTop,
        outer.clientHeight
      );
      if (target === null) {
        return;
      }
      const furthest = Math.max(0, outer.scrollHeight - outer.clientHeight);
      outer.scrollTo({
        top: Math.min(Math.max(0, target), furthest),
        behavior: 'smooth'
      });
    };
  }

  /**
   * Make the footer's "click to add a cell" append a cell at the notebook root.
   *
   * Its stock behaviour is an insert below the last cell, and the new cell then
   * inherits that cell's path -- so in a mosaic it joins whichever tile happens
   * to be last, and there is no way to start a fresh row at the bottom.
   */
  private _installFooter(): void {
    const footer = (this.notebook.layout as any)?.footer;
    if (!footer) {
      return;
    }
    footer.onClick = () => {
      const notebook = this.notebook;
      if (!notebook.model) {
        return;
      }
      if (notebook.widgets.length > 0) {
        notebook.activeCellIndex = notebook.widgets.length - 1;
      }
      NotebookActions.insertBelow(notebook);
      const inserted = notebook.widgets[notebook.widgets.length - 1];
      if (inserted) {
        this.setPath(inserted.model, []);
      }
      this.requestUpdate();
      void NotebookActions.focusActiveCell(notebook);
    };
  }

  private _onModelChanged(notebook: Notebook): void {
    const model = notebook.model;
    if (!model) {
      return;
    }
    this._repairPending = true; // repair whatever we just loaded
    model.cells.changed.connect(this._onCellsChanged, this);
    model.metadataChanged.connect(this._onMetadataChanged, this);
    for (let i = 0; i < model.cells.length; i++) {
      this._watch(model.cells.get(i));
    }
    this.requestUpdate();
  }

  private _onCellsChanged(): void {
    const model = this.notebook.model;
    if (model) {
      for (let i = 0; i < model.cells.length; i++) {
        this._watch(model.cells.get(i));
      }
    }
    this.requestUpdate();
  }

  private _onMetadataChanged(_: unknown, args: { key: string }): void {
    if (args.key.startsWith('mosaic')) {
      this.requestUpdate();
    }
  }

  private _watch(cell: ICellModel): void {
    if (this._watched.has(cell)) {
      return;
    }
    this._watched.add(cell);
    cell.metadataChanged.connect(this._onCellMetadataChanged, this);
  }

  private _onCellMetadataChanged(_: unknown, args: { key: string }): void {
    if (args.key === PATH_KEY || args.key === WEIGHT_KEY) {
      this.requestUpdate();
    }
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    if (this._frame !== null) {
      cancelAnimationFrame(this._frame);
    }
    this.grid.dispose();
  }
}

/** Every cell widget beneath a group, for drag and execution. */
export function cellsOf(notebook: Notebook, node: IGroupNode): Cell[] {
  return collectCells(node)
    .map(index => notebook.widgets[index])
    .filter((c): c is Cell => !!c);
}
