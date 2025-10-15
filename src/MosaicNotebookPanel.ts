import { Notebook, NotebookPanel  } from '@jupyterlab/notebook';
// import { IObservableList } from '@jupyterlab/observables';
import { Cell } from '@jupyterlab/cells';
import { WindowedLayout } from '@jupyterlab/ui-components';

import { mosaicDrop, mosaicDragOver } from './mosaicdrag';
import { FlexDirection, Mosaic, Tile } from './MosaicGroup';
import { MosaicViewModel } from './MosaicViewModel';
// import { WindowedLayout } from './windowedlist';

export namespace MosaicNotebookPanel {
    export class ContentFactory extends NotebookPanel.ContentFactory {
        createNotebook(options: Notebook.IOptions) {
            const mosaic = new MosaicNotebook(options);
            return mosaic;
        }
    }
}


// export class MosaicLayout extends NotebookWindowedLayout {
// //     protected submosaics: Map<string, MosaicLayout> = new Map<string, MosaicLayout>();
// //     protected cellOwner: WeakMap<Cell, MosaicLayout> = new WeakMap<Cell, MosaicLayout>();
//     insertWidget(index: number, widget: Widget): void {
//         // route attempted linear cell inserts to their proper mosaic layout

//         console.warn("layout IW", index, widget);
//         const cell = (widget as Cell)!;
//         // if (cell.parent) {
//         //     cell.parent.layout!.removeWidget(cell);
//         // }

//         const path = cell.model!.getMetadata('mosaic') as Array<string> || [];
//         const stem = (this.parent as Mosaic).treeGet(path) as Mosaic;
        
//         const idx = stem.tiles.indexOf(cell);
//         if (idx == -1) {
//             throw new Error('view model unsynchronized');
//         }
//         if (stem.layout == this) {
//             super.insertWidget(idx, cell);
//         } else {
//             stem.layout.insertWidget(idx, cell);
//         }

//         // Remove the widget from its current parent. This is a no-op
//         // if the widget's parent is already the layout parent widget.
//         cell.parent = this.parent;

//         // remove it from its current layout
//         const stem = this.cellOwner.get(cell);
//         stem?.removeWidget(cell);

//         // Clamp the insert index to the array bounds.
//         let j = Math.max(0, Math.min(index, this._widgets.length));
//         // If the widget is not in the array, insert it.
//         const path = cell.model.getMetadata('mosaic') as Array<string> || [];
//         if (path && path.length > 0) {
//             let submosaic = this.submosaics.get(path[0]);
//             if (!submosaic) {
//                 submosaic = new MosaicLayout();
//                 this.submosaics.set(Mosaic.newUGID(), submosaic);
//                 ArrayExt.insert(this._widgets, index, widget)
//             }
//             submosaic.insertWidget(index, cell); // recursively traveres tree of mosaic paths to get to bottom group
//         }
//         else {
//             this.widgets
//         }
//     }
// }



export class MosaicNotebook extends Notebook {
    // protected rootMosaic: Mosaic;

    protected tiles: Array<Tile>;
    protected mosaics: Map<string, Mosaic>;
    protected options: Mosaic.IOptions;
    protected notebook: Notebook;
    public direction: FlexDirection = 'col';

    constructor(options: Notebook.IOptions) {
        super(options);
        this.tiles = [];
        this.mosaics = new Map<string, Mosaic>();
        this.options = {...options, direction: 'col', notebook: this};
        this.notebook = this; // adopted mosaic methods refer to notebook property

        // (this as any)._layout = new MosaicLayout();
        // this.layout.parent = this;

        // MosaicViewModel;
        const mvm = new MosaicViewModel(this.tiles, 'col', {
                overscanCount: options.notebookConfig?.overscanCount  ??
                    Mosaic.defaultConfig.overscanCount,
                windowingActive: true
            });
        Object.defineProperty(this.viewModel, 'widgetCount', {get: mvm._getWidgetCount.bind(mvm)});
        this.viewModel.estimateWidgetSize = mvm._estimateWidgetSize.bind(mvm);
        this.viewModel.widgetRenderer = mvm._widgetRenderer.bind(mvm);
        console.log(this.viewModel, this.viewModel.height, (this.viewModel as any)._height);
        // let h = this.viewModel.height;
        // Object.defineProperty(this.viewModel, '_height', {
        //     set(v) {
        //         console.warn('notebook vm height getting set!', v);
        //         h = v;
        //     },
        //     get() {
        //         return h;
        //     }
        // });

        (this as any)._evtDrop = (e:any) => mosaicDrop(this, e);
        (this as any)._evtDragOver = (e:any) => mosaicDragOver(this, e);

        // const origDetach = (this.layout as any).detachWidget;
        // (this.layout as any).detachWidget = (index:number, widget:Tile) => {
        //     console.warn('detaching', index, widget, (widget as Cell).model?.id, (widget as any).prompt, 'p');
        //     console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
        //     origDetach.call(this.layout, index, widget);
        //     console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
        // }

        // const origIW = this.layout.insertWidget;
        // this.layout.insertWidget = (i:number, w:Widget) => {
        //     console.warn("IW");
        //     origIW.call(this.layout, i, w);
        // }
        // this.layout.insertWidget = MosaicLayout.prototype.insertWidget.bind(this.layout);

        (this as any)._updateForDeferMode = this._myupdateForDeferMode;
    }

    addTile = Mosaic.prototype.addTile.bind(this);
    mosaicInsert = Mosaic.prototype.mosaicInsert.bind(this);
    growBranch = Mosaic.prototype.growBranch.bind(this);
    splice = Mosaic.prototype.splice.bind(this);
    // splice (startIndex, replaceCount, ...tiles) {
    //     Mosaic.prototype.splice.bind(this)(startIndex, replaceCount, ...tiles);
    //     for (tile of tiles) {
    //         this.layout.insertMosaic(tile);
    //     }
    // }
    treeGet = Mosaic.prototype.treeGet.bind(this);
    getLeaf = Mosaic.prototype.getLeaf.bind(this);
    renderCellOutputs = Mosaic.prototype.renderCellOutputs.bind(this);
    unwrap = ()=>{};

    

    protected onCellInserted(index: number, cell: Cell): void {
        super.onCellInserted(index, cell);
        console.log('ic', index, 'Cell:'+(cell as any).prompt, cell, cell.model.metadata.mosaic);
        // console.log('orig par', cell.parent);
        // console.log('mosaic', cell.model.getMetadata('mosaic'))
        this.mosaicInsert(cell);
        // console.log('new par', cell.parent);
       
        console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }
    protected onCellRemoved(index: number, cell: Cell): void {
        super.onCellRemoved(index, cell);
        console.log('rc', index, 'Cell:'+(cell as any).prompt, cell);
        const path = cell.model.metadata.mosiac as Array<string> || [];
        const group = this.treeGet(path) as Mosaic;
        const idx = group.tiles.indexOf(cell);
        console.log('local index', group, idx);
        if (idx > -1) {
            group.splice(idx, 1);
        }
        console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }

    private async _myupdateForDeferMode(cell: Cell, cellIdx: number): Promise<void> { // modified from @jupyterlab/notebook/widget.ts:966
        // insert widget into corresponding submosaic layout, not necessarily main notebook layout anymore
        const [found, flocalIdx] = this.getLeaf(cellIdx);
        let stem, localIdx;
        if (found !== null) {
            stem = found[0];
            localIdx = flocalIdx;
        } else { // must be out of range, find group and append it
            const path = cell.model.getMetadata('mosaic') as Array<string> || [];
            stem = this.treeGet(path);
            localIdx = -1;
        }
        cell.dataset.windowedListIndex = `${localIdx}`;
        (stem.layout as WindowedLayout).insertWidget(localIdx, cell);
        await cell.ready;
    }

    // protected get __notebookModel() { // access private field on super
    //     return (this as any)._notebookModel;
    // }
    // protected set __notebookModel(value: any) {
    //     (this as any)._notebookModel = value;
    // }
    // protected get __onModelChanged() {
    //     return (this as any)._onModelChanged;
    // }
    // protected get __modelChanged() {
    //     return (this as any)._modelChanged;
    // }
    // get model() {
    //     return this.__notebookModel;
    // }
    // set model(newValue) {
    //     newValue = newValue || null;
    //     if (this.__notebookModel === newValue) {
    //         return;
    //     }
    //     const oldValue = this.__notebookModel;
    //     this.__notebookModel = newValue;
    //     // Trigger private, protected, and public changes.
    //     this.__onModelChanged(oldValue, newValue);
    //     this.onModelChanged(oldValue, newValue);
    //     this.__modelChanged.emit(void 0);

    //     // Trigger state change
    //     // this.viewModel.itemsList = newValue?.cells ?? null;
    //     if (newValue && newValue.cells) {
    //         // this.viewModel.itemsList = newValue.cells.filter(c => (c.metadat.mosaic as Array<string> || []).length == 0)
    //         for (const cell of newValue.cells) {
    //             const path = cell.metadata.mosaic as Array<string> || [];
    //             const stem = this.treeGet(path);
    //             const vm = (stem as any).viewModel;
    //             if (!vm.itemsList) vm.itemsList = [];
    //             vm.itemsList.push(cell);
    //         }
    //     } else {
    //         // recursively reset items lists
    //         const resetItemsList = (mosaic:Mosaic) => {
    //             (mosaic as any).viewModel.itemsList = null;
    //             for (const submosaic of mosaic.mosaics) {
    //                 resetItemsList(submosaic[1]);
    //             }
    //         }
    //         resetItemsList(this as any);
    //     }
    // }
}


// export class MosaicStaticNotebook extends WindowedList<MosaicNotebookViewModel> {
//   constructor(options: StaticNotebook.IOptions) {
//     // Inject view model here
//     const viewModel = new MosaicViewModel(cells, {
//       overscanCount:
//         options.notebookConfig?.overscanCount ??
//         StaticNotebook.defaultNotebookConfig.overscanCount,
//       windowingActive
//     });
//     const cells = new Array<Cell>();
//     const windowingActive =
//       (options.notebookConfig?.windowingMode ??
//         StaticNotebook.defaultNotebookConfig.windowingMode) === 'full';
//     super({
//       model: new MosaicNotebookViewModel(cells, {
//         overscanCount:
//           options.notebookConfig?.overscanCount ??
//           StaticNotebook.defaultNotebookConfig.overscanCount,
//         windowingActive
//       }),
//       layout: new NotebookWindowedLayout(),
//       renderer: options.renderer ?? WindowedList.defaultRenderer,
//       scrollbar: false
//     });

//     this.addClass(NB_CLASS);
//     this.cellsArray = cells;

//     this._idleCallBack = null;

//     this._editorConfig = StaticNotebook.defaultEditorConfig;
//     this._notebookConfig = StaticNotebook.defaultNotebookConfig;
//     this._mimetype = IEditorMimeTypeService.defaultMimeType;
//     this._notebookModel = null;
//     this._modelChanged = new Signal<this, void>(this);
//     this._modelContentChanged = new Signal<this, void>(this);

//     this.node.dataset[KERNEL_USER] = 'true';
//     this.node.dataset[UNDOER] = 'true';
//     this.node.dataset[CODE_RUNNER] = 'true';
//     this.rendermime = options.rendermime;
//     this.translator = options.translator || nullTranslator;
//     this.contentFactory = options.contentFactory;
//     this.editorConfig =
//       options.editorConfig || StaticNotebook.defaultEditorConfig;
//     this.notebookConfig =
//       options.notebookConfig || StaticNotebook.defaultNotebookConfig;
//     this._updateNotebookConfig();
//     this._mimetypeService = options.mimeTypeService;
//     this.renderingLayout = options.notebookConfig?.renderingLayout;
//     this.kernelHistory = options.kernelHistory;
//   }
// }
