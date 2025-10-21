import { INotebookModel, Notebook, NotebookPanel  } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { WindowedLayout } from '@jupyterlab/ui-components';
// import { ArrayExt } from '@lumino/algorithm';
// import { EditorServices } from

import { mosaicDrop, mosaicDragOver } from './mosaicdrag';
import { FlexDirection, LeafCell, Mosaic, ObservableTree, Tile } from './MosaicGroup';
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

    public tiles: ObservableTree<Tile>;
    protected mosaics: Map<string, Mosaic>;
    protected options: Mosaic.IOptions;
    protected notebook: Notebook;
    public direction: FlexDirection = 'col';

    constructor(options: Notebook.IOptions) {
        super(options);
        this.tiles = new ObservableTree();
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

        this.tiles.changed.connect(this.onTreeChanged, this);

    }

    public superMosaic = null;
    public path = [];
    addTile = Mosaic.prototype.addTile.bind(this);
    growBranch = Mosaic.prototype.growBranch.bind(this);
    splice = Mosaic.prototype.splice.bind(this);
    // treeGet = Mosaic.prototype.treeGet.bind(this);
    treeGetExisting = Mosaic.prototype.treeGetExisting.bind(this);
    // getBranchIndex = Mosaic.prototype.getBranchIndex.bind(this);
    getLeaf = Mosaic.prototype.getLeaf.bind(this);
    findGroup = Mosaic.prototype.findGroup.bind(this);
    // findStem = Mosaic.prototype.findStem.bind(this);
    renderCellOutputs = Mosaic.prototype.renderCellOutputs.bind(this);
    onTreeChanged(tree: ObservableTree<Tile>, change:any) {
        Mosaic.prototype.onTreeChanged.bind(this)(tree, change);
        console.log(this.tiles, Mosaic.showMosaic(this as any));
        requestAnimationFrame(() => this.update());
    }
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
        // console.log(this.tiles, this.tiles.map(Mosaic.showMosaic));
    }
    protected onCellRemoved(index: number, cell: Cell): void {
        super.onCellRemoved(index, cell);
        console.warn('rc', index, 'Cell:'+(cell as any).prompt, cell);

        const [found, ] = this.getLeaf(index);
        if (found !== null) {
            const [stem, leaf] = found;
            if (leaf == cell) {
                stem.tiles.removeValue(leaf);
                console.log('removed');
            }
        }

        // console.log(this.tiles.map(Mosaic.showMosaic));
    }

    private async _myupdateForDeferMode(cell: Cell, cellIdx: number): Promise<void> { // modified from @jupyterlab/notebook/widget.ts:966
        // insert widget into corresponding submosaic layout, not necessarily main notebook layout anymore
        const [stem, localIdx] = this.mosaicInsert(cellIdx);
        cell.dataset.windowedListIndex = `${localIdx}`;
        (stem.layout as WindowedLayout).insertWidget(localIdx, cell);
        await cell.ready;
    }


    graft(cell: LeafCell, path: Array<string>, refCell: LeafCell, refPath: Array<string>, refDiverge: number, offset:number = 0): [Mosaic, number] {
        /**
         * 'graft' the cell onto the tree (nested list of mosaics) adjacent to one of its neighbors (refCell)
         */

        // traverse up to where the path to cell branches off
        // let base: Mosaic = this.leafStems.get(refCell)! as Mosaic;
        let base = refCell.superMosaic!;
        let reference: Tile = refCell as LeafCell;
        for (let i = refPath.length; i > refDiverge; i--) {
            reference = base;
            base = reference.superMosaic! as Mosaic;
        }
        let idx = base.tiles.indexOf(reference);
        console.log('ref', base, reference, idx);
        if (idx < 0) {
            console.error('referrence leaf/branch missing!');
            base = this as any;
            idx = this.tiles.length; // send it to the end
        } else {
        idx += offset;
        }
        // console.log('ref', reference, 'base', base, 'refpath', refPath, 'refDiv', refDiverge, 'path', path);

        // graft it
        if (refDiverge < path.length) {
            // grow the cell's own branch and attach at referrence index
            const stem = base.growBranch(path.slice(refDiverge), [idx]);
            stem.splice(0, 0, cell);
            console.log('grafted', 'branch:'+stem.path, 'to', base.path, 'at', idx);
            return [stem, idx];
        } else {
            // cell attaches directly to reference's branch
            base.splice(idx, 0, cell);
            console.log('grafted', 'Cell:'+(cell as any).prompt, 'to', base.groupID, 'at', idx);
            return [base, idx];
        }


    }
    mosaicInsert(index: number): [Mosaic | MosaicNotebook, number] {
        /**  
         * Group the inserted cell with one of its neighbors, to assemble the heirarchy out of a linear array
         * can be though of as self-assembly: cell of index 'index' tries to graft itself to the branch of one of its neighbors
         * Call after super.onCellInserted, cell to insert should be in this.cellsArray at give index
        */
        const prevCell = this.cellsArray[index-1] as LeafCell;
        const cell = this.cellsArray[index] as LeafCell;
        const nextCell = this.cellsArray[index+1] as LeafCell;

        Mosaic.setParent(cell, null); // remove from current position

        let prevPath = prevCell?.superMosaic?.path || [];//Mosaic.getPath(prevCell)! : [];
        let path = Mosaic.getPath(cell); // use saved MD path to get where it goes, not where it is
        let nextPath = nextCell?.superMosaic?.path || [];//Mosaic.getPath(nextCell)! : [];

        if (index === 0 && !nextCell) { // first cell added, grow its branch and add it.
            const branch = this.growBranch(path || []);
            // this.insertLeaf(branch, cell);
            branch.splice(0, 0, cell);
            console.log('grafting initial cell', cell, branch);
            return [branch, 0];
        }

        if (path === undefined) {
            // missing mosaic position metadata, join the previous cell
            if (prevCell) path = prevPath; //return this.graft(cell, prevPath, prevCell, prevPath, prevPath.length, +1);
            else path = []; // return this.graft(cell, [], nextCell, nextPath, 0, 0);
        }

        // having handled the special cases, graft to whichever branches off current cell's path later

        let prevDiverge = prevCell?.superMosaic ? Mosaic.divergeDepth(prevPath, path) : -1;
        let nextDiverge = nextCell?.superMosaic ? Mosaic.divergeDepth(nextPath, path) : -1;

        // if we've left the groups of the other cells, let them collapse if underpopulated
        // if (this.leafStems.has(prevCell)) {
        if (prevCell && prevCell.superMosaic) {
            // let prevGroup = this.leafStems.get(prevCell);
            let prevGroup: any = prevCell;
            for ( let i = prevDiverge; i < prevPath.length; i++ ) {
                prevGroup = prevGroup!.superMosaic!;
                prevGroup?.checkEmpty();
            }
            // path was updated by collapsing redundant groups
            prevPath = prevCell.superMosaic!.path; //Mosaic.getPath(prevCell)!;
            prevDiverge = prevCell.superMosaic ? Mosaic.divergeDepth(prevPath, path) : -1;
        }
        if (nextCell && nextCell.superMosaic) {
            // let nextGroup = this.leafStems.get(nextCell);
            let nextGroup: any = nextCell;
            for ( let i = nextDiverge; i < nextPath.length; i++ ) {
                nextGroup = nextGroup!.superMosaic!;
                nextGroup?.checkEmpty();
            }
            // path was updated by collapsing redundant groups
            nextPath = nextCell.superMosaic.path; //Mosaic.getPath(nextCell)!;
            nextDiverge = nextCell.superMosaic ? Mosaic.divergeDepth(nextPath, path) : -1;
        }

        // console.log('prev, next', prevPath, nextPath, prevDiverge, nextDiverge);
        
        if (prevDiverge < 0 && nextDiverge < 0) {
            throw new Error('both neighbors unattached! unable to graft');
        }
        switch (Math.max(prevDiverge, nextDiverge)) { 
            case (prevDiverge): {
                return this.graft(cell, path, prevCell, prevPath, prevDiverge, +1)
            }
            case (nextDiverge): {
                return this.graft(cell, path, nextCell, nextPath, nextDiverge, 0);
            }
            default: {
                throw new Error('invalid path divergence!');
            }
        }
    }
}
