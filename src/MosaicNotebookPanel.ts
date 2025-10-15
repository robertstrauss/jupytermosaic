import { Notebook, NotebookPanel  } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { WindowedLayout } from '@jupyterlab/ui-components';

import { mosaicDrop, mosaicDragOver } from './mosaicdrag';
import { FlexDirection, Mosaic, Tile } from './MosaicGroup';
import { MosaicViewModel } from './MosaicViewModel';

export namespace MosaicNotebookPanel {
    export class ContentFactory extends NotebookPanel.ContentFactory {
        createNotebook(options: Notebook.IOptions) {
            const mosaic = new MosaicNotebook(options);
            return mosaic;
        }
    }
}




export class MosaicNotebook extends Notebook {

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


        const mvm = new MosaicViewModel(this.tiles, 'col', {
                overscanCount: options.notebookConfig?.overscanCount  ??
                    Mosaic.defaultConfig.overscanCount,
                windowingActive: true
            });
        Object.defineProperty(this.viewModel, 'widgetCount', {get: mvm._getWidgetCount.bind(mvm)});
        this.viewModel.estimateWidgetSize = mvm._estimateWidgetSize.bind(mvm);
        this.viewModel.widgetRenderer = mvm._widgetRenderer.bind(mvm);
        (this.viewModel as any).onListChanged = (list: any, change: any) => { // viewModel List changes handled by mosaicgroup
            // route cell updates to proper view model
            // const routedChanges = new WeakMap<Mosaic, IObservableList.IChangedArgs<ICellModel>>();
            // for (let i = 0; i < change.newValues.length; i++) {

            // }
            // const cell = change.newValues[i];
            // const path = cell.metadata.mosaic as Array<string> || [];
            // const stem = this.treeGet(path) as Mosaic;
            // switch (change.type) {
            //     case 'add': {
            //         for (let i = 0; i < change.newValues.length; i++) {

            //             (stem as any).viewModel.onListChanged(list, {
            //                 type: change.type,
            //                 newIndex: ,
            //                 newValues: [cell],

            //             } as IObservableList.IChangedArgs<ICellModel>);                
            //         }
            //         break;
            //     }
            //     case 'remove': {
            //         for (let i = 0; i < change.oldValues.length; i++) {
            //             const cell = change.oldValues[i];
            //             const path = cell.metadata.mosaic as Array<string> || [];
            //             const stem = this.treeGet(path) as Mosaic; 
            //             const oldIndex = stem.tiles.indexOf(
            //         }
            //         break;
            //     }
            // }
        };


        (this as any)._evtDrop = (e:any) => mosaicDrop(this, e);
        (this as any)._evtDragOver = (e:any) => mosaicDragOver(this, e);

        (this as any)._updateForDeferMode = this._myupdateForDeferMode;
    }

    addTile = Mosaic.prototype.addTile.bind(this);
    mosaicInsert = Mosaic.prototype.mosaicInsert.bind(this);
    growBranch = Mosaic.prototype.growBranch.bind(this);
    splice = Mosaic.prototype.splice.bind(this);
    treeGet = Mosaic.prototype.treeGet.bind(this);
    getLeaf = Mosaic.prototype.getLeaf.bind(this);
    renderCellOutputs = Mosaic.prototype.renderCellOutputs.bind(this);
    unwrap = ()=>{};

    

    protected onCellInserted(index: number, cell: Cell): void {
        super.onCellInserted(index, cell);
        console.log('ic', index, 'Cell:'+(cell as any).prompt, cell, cell.model.metadata.mosaic);
        this.mosaicInsert(cell);    
        console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }
    protected onCellRemoved(index: number, cell: Cell): void {
        super.onCellRemoved(index, cell);
        console.log('rc', index, 'Cell:'+(cell as any).prompt, cell);
        const path = cell.model.metadata.mosiac as Array<string> || [];
        const group = this.treeGet(path) as Mosaic;
        const idx = group.tiles.indexOf(cell); // invert order - inserts and removes in index order, when moving up will be duplicated. want to remove later one since moving up
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
