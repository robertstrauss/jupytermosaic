import { INotebookModel, Notebook, NotebookPanel  } from '@jupyterlab/notebook';
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
    findGroup = Mosaic.prototype.findGroup.bind(this);
    findStem = Mosaic.prototype.findStem.bind(this);
    renderCellOutputs = Mosaic.prototype.renderCellOutputs.bind(this);
    unwrap = ()=>{};
    checkEmpty = ()=>{};

    get model() {
        return super.model;
    }
    set model(model: INotebookModel | null) {
        super.model = model;
        // viewModel List changes handled by mosaicgroup. Don't need observable list to trigger it
        this.viewModel.itemsList = null;
    }

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
        // const path = Mosaic.getPath(cell);
        // const [stem, depth] = this.treeGetExisting(path);
        // if (depth == path.length) {
        //     const localIdx = ArrayExt.findLastIndex(stem.tiles, (t:Tile) => t === cell);
        //     if (localIdx > -1) {
        //         stem.splice(localIdx, 1);
        //     }
        // } else {
            // console.error("Couldn't find cell in proper group, searching tree");

            // remove last index- Jupyter inserts and removes cells in order of their index,
            // thus when moving a cell up (smaller idx) it will be duplicated briefly.
            // And so we want to remove later one. When moving down, it removes first, and this still works
            const stem = this.findStem(cell, true); 
            if (stem !== null) stem.removeLast(cell);
            // let i = 0;
            // let found;

            // do {
            //     found = this.getLeaf(i)[0];
            //     if (found == null || found[1] === cell) break;
            //     i++;
            // } while (found !== null);
            // if (found !== null) {
            //     ArrayExt.removeAllOf(found[0].tiles, cell);
            //     found[0].checkEmpty();
            // }
            
        // }
        console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }

    private async _myupdateForDeferMode(cell: Cell, cellIdx: number): Promise<void> { // modified from @jupyterlab/notebook/widget.ts:966
        // insert widget into corresponding submosaic layout, not necessarily main notebook layout anymore
        const [stem, localIdx] = this.mosaicInsert(cellIdx);
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
            stem.splice(0, 0, cell); // attach sole leaf to new branch
            return [stem, 0];
        }
        else { // or attach leaf at index if branch already complete
            stem.splice(localIdx, 0, cell); 
            return [stem, localIdx];
        }

    }
}
