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

import { IGridHost, MosaicGrid } from './MosaicGrid';
import {
  IGroupNode,
  IGroupState,
  ISolution,
  buildTree,
  collectCells,
  groupKey,
  solve
} from './MosaicTree';
import { installMosaicDrag } from './mosaicdrag';

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

  // -- layout ---------------------------------------------------------------

  /** Rebuild the tree from metadata and re-apply the grid. Idempotent. */
  rebuild(): void {
    const model = this.notebook.model;
    if (!model || this._disposed) {
      return;
    }
    const cells = this.notebook.widgets;
    const paths = cells.map(cell => this.pathOf(cell.model));
    const root = buildTree(
      paths,
      index => Number(cells[index]?.model.getMetadata(WEIGHT_KEY)) || 1,
      path => this.groupState(path)
    );
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
      const outer = this.notebook.outerNode;
      const target = this.grid.revealCell(
        index,
        outer.scrollTop,
        outer.clientHeight
      );
      if (target !== null) {
        outer.scrollTo({ top: target, behavior: 'smooth' });
      }
      this.requestUpdate();
    };
  }

  private _onModelChanged(notebook: Notebook): void {
    const model = notebook.model;
    if (!model) {
      return;
    }
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
