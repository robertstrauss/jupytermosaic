import { Notebook, NotebookPanel  } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { WindowedLayout } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';

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
    growBranch = Mosaic.prototype.growBranch.bind(this);
    splice = Mosaic.prototype.splice.bind(this);
    // treeGet = Mosaic.prototype.treeGet.bind(this);
    treeGetExisting = Mosaic.prototype.treeGetExisting.bind(this);
    // getBranchIndex = Mosaic.prototype.getBranchIndex.bind(this);
    getLeaf = Mosaic.prototype.getLeaf.bind(this);
    renderCellOutputs = Mosaic.prototype.renderCellOutputs.bind(this);
    unwrap = ()=>{};

    moveCell(from: number, to: number, n: number = 1): void {
        for (let i = to; i < to + n; i++) {
            // longestSharedPath = [];
        }

        super.moveCell(from, to, n);
    }

    protected onCellInserted(index: number, cell: Cell): void {
        super.onCellInserted(index, cell);

        console.warn('ic', index, 'Cell:'+(cell as any).prompt, cell, cell.model.metadata.mosaic);

        this.mosaicInsert(index);
        console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }
    protected onCellRemoved(index: number, cell: Cell): void {
        super.onCellRemoved(index, cell);
        console.warn('rc', index, 'Cell:'+(cell as any).prompt, cell);
        const path = Mosaic.getPath(cell);
        const [stem, depth] = this.treeGetExisting(path);
        if (depth == path.length) {
            // remove last index- Jupyter inserts and removes cells in order of their index,
            // thus when moving a cell up (smaller idx) it will be duplicated briefly.
            // And so we want to remove later one. When moving down, it removes first, and this still works
            const localIdx = ArrayExt.findLastIndex(stem.tiles, (t:Tile) => t === cell);
            if (localIdx > -1) stem.splice(localIdx, 1);
        } else {
            console.error("Couldn't find cell in proper group, searching tree");
            let i = 0;
            let found;
            do {
                found = this.getLeaf(i)[0];
                if (found == null || found[1] === cell) break;
                i++;
            } while (found !== null);
            if (found !== null) {
                ArrayExt.removeAllOf(found[0].tiles, cell);
            }
            
        }
        console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }

    private async _myupdateForDeferMode(cell: Cell, cellIdx: number): Promise<void> { // modified from @jupyterlab/notebook/widget.ts:966
        // insert widget into corresponding submosaic layout, not necessarily main notebook layout anymore
        // const [found, flocalIdx] = this.getLeaf(cellIdx);
        // let stem, localIdx;
        // if (found !== null) {
        //     stem = found[0];
        //     localIdx = flocalIdx;
        // } else { // must be out of range, find group and append it
        //     const path = Mosaic.getPath(cell);
        //     stem = this.treeGetOrGrow(path);
        //     localIdx = -1; // append
        // }
        const [stem, localIdx] = this.mosaicInsert(cellIdx);
        if (localIdx < 0) {


        }
        cell.dataset.windowedListIndex = `${localIdx}`;
        (stem.layout as WindowedLayout).insertWidget(localIdx, cell);
        await cell.ready;
    }

    getBranchIndex(cell: Cell, stem: Mosaic, depth: number = -1) {
        /** get the local index of cell or the relevant group cell belongs to at depth 'depth' */
        const path = Mosaic.getPath(cell);
        if (depth < 0) depth = path.length; // leaf index (index in immediate parent group)

        let localIdx = -1;
        if (path.length < depth) return localIdx;
        else if (path.length == depth) {
            localIdx = stem.tiles.indexOf(cell);
        } else {
            const group = stem.mosaics.get(path[depth]);
            if (!group) return localIdx;
            localIdx = stem.tiles.indexOf(group);
        }

        return localIdx;
    }
    mosaicInsert(index: number): [Mosaic | MosaicNotebook, number] {
        /** 'graft' the cell onto the tree (nested list of mosaics) adjacent to one of its neighbors 
         * can be though of as self-assembly: cell of index 'index' tries to graft itself to the branch of one of its neighbors
         * Call after super.onCellInserted, cell to insert should be in this.cellsArray at give index
        */
        if (index == 0) {
            this.tiles.splice(0, 0, this.cellsArray[0]);
            return [this, 0];
        }

        const before = this.cellsArray[index-1];
        const cell = this.cellsArray[index];
        const after = this.cellsArray[index+1];

        let path = Mosaic.getPath(cell);
        let [stem, depth] = this.treeGetExisting(path);

        ArrayExt.removeAllOf(stem.tiles, cell); // remove from existing position

        // figure out where in stem to graft to
        let localIdx = -1;
        if (before)
            localIdx = this.getBranchIndex(before, stem, depth); // try referencing previous cell
        if (localIdx > -1)
            localIdx++; // found previous, add 1 for index
        else if (after) // previous cell wasn't found, try attaching to the following cell instead
            localIdx = this.getBranchIndex(after, stem, depth);

        if (localIdx < 0) { // still not found
            console.error('neighbor cells not inserted in proper group\n', 
                'index, cell, stem:', index, cell, stem, '\n',
                'pre and next cell:', (before as any)?.prompt, (after as any)?.prompt, '\n',
                'paths, depth:', depth, path, '\n',
                'stem:', Mosaic.showMosaic(stem));
            // will simply append grown branch or cell to any existing part
        }


        // graft remaining branch at the correct place from the reference
        if (depth < path.length) {
            stem = stem.growBranch(path.slice(depth), [localIdx]);
            stem.splice(-1, 0, cell); // attach sole leaf to new branch
            return [stem, 0];
        }
        else { // or attach leaf at index if branch already complete
            stem.splice(localIdx, 0, cell); 
            return [stem, localIdx];
        }




        // const pathA = after ? Mosaic.getPath(after) : [];
        // const pathB = before ? Mosaic.getPath(before) : [];

        // // const divAB = Mosaic.divergeDepth(pathA, pathB);
        // const divA = Mosaic.divergeDepth(pathA, path);
        // const divB = Mosaic.divergeDepth(path, pathB);
        

        
        // if (depth == path.length) { // group already exists

        //     if (divA < path.length && divB < path.length){
        //         console.error('inserted cell, branch length', path.length, 'overextends neighbors, diverging at', divA, 'and', divB, '\n',
        //                         pathB, path, pathA, '\n trimming...'
        //         );
        //         path = path.slice(0, Math.min(divA, divB));
        //         cell.model.setMetadata('mosaic', path);
        //         [stem, depth] = this.treeGetExisting(path);
        //     }

        //     switch (path.length) { // this cell's branch should be fully constructed in one of its neighbors, thus diverging only at its full length. 
        //         case (divB): {
        //             // use previous cell, or its group at this depth, as referrence
        //             const ref = (divB == pathB.length ? before : stem.mosaics.get(pathB[divB]));
        //             if (ref !== undefined) localIdx = stem.tiles.indexOf(ref); 
        //             console.log('index based on prev cell ref:', localIdx);
        //             if (localIdx > -1) {localIdx++; break;} // +1 since this is the previous cell, we want to be after it
        //             else console.warn('prev cell ref not found', ref, before, cell);
        //             console.log('cant find', (before as any).prompt || pathB[divB], 'in', Mosaic.showMosaic(stem));
        //         } // can still try using pathA if pathB triggered but got localIdx == -1 (prev cell not inserted yet)
        //         case (divA): {
        //             // use next cell, or its group at this depth, as referrence
        //             const ref = (divA == pathA.length ? before : stem.mosaics.get(pathA[divA]));
        //             if (ref !== undefined) localIdx = stem.tiles.indexOf(ref);
        //             console.log('index based on next cell ref:', localIdx);
        //             if (localIdx > -1) break;
        //             else console.warn('next cell ref not found', ref, after, cell);
        //         }
        //         default: {
        //             console.error(
        //             // this.mosaicInsert(index-1, before, cellsArray);
        //             // this.mosaicInsert(index-1, before, cellsArray);
        //         }
        //     }
        // } else { // brand new group, just add it. assume new neighbors will populate.
        //     stem = stem.growBranch(path.slice(depth, -1)); console.log('created new!', path);
        //     localIdx = 0;
        //     setTimeout(() => {
        //         if (stem.tiles.length < 2) {
        //             if (stem.tiles[0] && stem.tiles[0] instanceof Mosaic) {
        //                 stem.tiles[0].unwrap();
        //             }
        //             stem.unwrap();
        //         }
        //     }, 500);
        // }

        // // graft it
        // stem.tiles.splice(localIdx, 0, cell);

        // return [stem, localIdx];
    }
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
