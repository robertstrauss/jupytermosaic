import { Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { PromiseDelegate } from '@lumino/coreutils';
import { Cell, CodeCell,  } from '@jupyterlab/cells';
// import {  ObservableList } from '@jupyterlab/observables';

import { MosaicViewModel } from './MosaicViewModel';


export type FlexDirection = 'row' | 'col';

export type Tile = Cell | Mosaic;

// export type NestedObservableList<T> = IObservableList<T | NestedObservableList<T>>;


export class Mosaic extends WindowedList<MosaicViewModel> { //
    static defaultConfig = {
        overscanCount: 3
    }
    static showMosaic(t:Tile): any { // debugging function reducing mosaic to nested list of cell prompts
        if (t instanceof Mosaic) {
            return t.tiles.map(Mosaic.showMosaic);
        } else {
            return 'Cell:'+(t as any).prompt;
        }
    }
    
    public tiles: Array<Tile>;
    public mosaics: Map<string, Mosaic>;
    public notebook: Notebook;
    public direction: FlexDirection;
    // protected modelList: NestedObservableList<ICellModel>;
    private _placeholder: boolean;
    private _ready = new PromiseDelegate<void>();
    constructor(protected superMosaic: Mosaic, public groupID: string, protected options: Mosaic.IOptions) {
        const tiles: Array<Tile> = [];
        super({
            model: new MosaicViewModel(tiles, options.direction, {
                overscanCount: options.notebookConfig?.overscanCount  ??
                    Mosaic.defaultConfig.overscanCount,
                windowingActive: true
            }),
            layout: new NotebookWindowedLayout(),
            renderer: options.renderer ?? WindowedList.defaultRenderer,
            scrollbar: false
        });
        this.notebook = options.notebook;
        this.tiles = tiles;
        this.mosaics = new Map<string, Mosaic>();
        this.direction = options.direction;
        this._placeholder = true;
        // this.modelList = new ObservableList(); // view of main cell models array, for isolating changes relevant to me.
        // this.viewModel.modelList = (this.modelList);

        this.addClass('mosaicgroup-outer');

        const origDetach = (this.layout as any).detachWidget;
        (this.layout as any).detachWidget = (index:number, widget:Tile) => {
            console.warn('detaching', index, widget, (widget as Cell).model?.id, (widget as any).prompt, 'p');
            origDetach.call(this.layout, index, widget);
        }

        // patch the item resize method to use width not height when in row mode
        (this as any)._onItemResize = this.onItemResize;

        (this as any)._updateTotalSize = this.updateTotalSize;
    }

    // set parent(val: Mosaic) {
    //     console.warn('tryna set my parent?');
    //     (this as any)._parent = parent;
        
    // }

    get path(): Array<string> {
        return [...this.superMosaic.path, this.groupID];
    }

    treeGet(path: Array<string>, depth: number = 0): Tile {
        if (depth < path.length) {
            return (this.mosaics.get(path[depth]) as Mosaic).treeGet(path, depth+1);
        }
        return this; // i am at a depth == path length, I am the result
    }

    treeGetExisting(path: Array<string>, depth: number = 0): Mosaic {
        // get up to the deepest existing branch for the given path
        if (depth < path.length) {
            const nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch !== undefined) {
                return (nextBranch as Mosaic).treeGetExisting(path, depth+1);
            } else {
                return this
            }
        }
        return this;
    }


    addTile(groupID: string = '', index: number = -1): Mosaic {
        if (groupID == '') groupID = Mosaic.newUGID();
        const newMosaic = new Mosaic(this, groupID, this.options);
        this.splice(index, 0, newMosaic);
        return newMosaic;
    }
    growBranch(path: Array<string>, depth: number = 0, branchsIxs: Array<number> = []): Mosaic {
        if (depth < path.length) {
            let nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch == undefined) {
                nextBranch = this.addTile(path[depth], (branchsIxs[depth] || -1));
            }
            return (nextBranch as Mosaic).growBranch(path, depth+1);
        }
        return this;
    }

    mosaicInsert(cell: Cell, branchIxs: Array<number> = []) {
        const path = cell.model.metadata.mosaic as Array<string> || [];
        const stem = this.growBranch(path, 0, branchIxs);
        if (cell.parent && cell.parent == stem) { // already in its group, no-op
            return
        } else if (cell.parent) { // in a different group, remove it from there first
            (cell.parent as Mosaic).splice((cell.parent as Mosaic).tiles.indexOf(cell), 1);
        }
        stem.splice(branchIxs[path.length] || -1, 0, cell);
    }

    splice(startIndex: number, replaceCount: number, ...tiles: Array<Tile>) {
        const deleted = this.tiles.splice(startIndex, replaceCount, ...tiles);
        for (const deletetile of deleted) {
            if (deletetile instanceof Mosaic) {
                this.mosaics.delete(deletetile.groupID);
            }
        }
        for (const tile of tiles) {
            const oldparent = tile.parent;
            tile.parent = this;
            oldparent?.update();
            tile.update();
            if (tile instanceof Cell) { // add disposal listener to cell to remove from tiles
                // this.modelList.push(tile.model);
                tile.disposed.connect(() => {
                    const idx = this.tiles.indexOf(tile);
                    if (idx > -1) {
                        this.tiles.splice(idx, 1);
                    }
                });
            } else if (tile instanceof Mosaic) {
                // this.modelList.push(tile.modelList);
                this.mosaics.set(tile.groupID, tile); // add mosaic to map for easy tree traversal
            }
        }

        // unwrap if only holding one or no tiles
        if (replaceCount > 0 && this.tiles.length < 2) {
            console.log('unwrap!');
            const subtile = this.tiles[0];
            if (subtile && subtile instanceof Mosaic) {
                subtile.unwrap(); // remove double-wrap (to preserve flex direction)
            }
            this.unwrap();
            console.log('post unwrap parent:', this.superMosaic.tiles);
        }
        
        this.update(); // trigger attaching of new group in DOM
    }


    unwrap() {
        const idx = this.superMosaic.tiles.indexOf(this);
        this.superMosaic.tiles.splice(idx, 1); // remove this group from parent

        if (this.tiles.length > 0) { // insert my contents (if any) where I was
            this.superMosaic.tiles.splice(idx, 0, ...this.tiles);
        }

        // update metadata of contained cells
        const removeGID = this.groupID;
        const recurseUpdate = (tile: Tile) => {
            if (tile instanceof Cell) {
                // remove my group ID from cells mosaic tree path
                const prepath = tile.model.getMetadata('mosaic');
                const newpath = prepath.splice(prepath.indexOf(removeGID), 1);
                tile.model.setMetadata('mosaic', newpath);
            } else {
                tile.tiles.map(t => recurseUpdate(t));
            }
        }
        recurseUpdate(this);
    }

    getLeaf(leafIx: number): [[Mosaic, Cell] | null, number] {
        // linearly walk through leafs (Cells) according to each sub groups order until the desired leafindex is reached
        // returns: last parent mosaic and id of leaf in parent or null if not found, and index of leaf in parent, (or total number of leaves if not found)
        let i = 0;
        for (const tile of this.tiles) {
            if (tile instanceof Cell) {
                if (i == leafIx) {
                    return [[this, tile], i]; // found desired leaf
                }
                i += 1; // count leaf
            } else { // branch
                const [stemAndLeaf, leafNum] = tile.getLeaf(leafIx-i);

                if (stemAndLeaf !== null) {
                    return [stemAndLeaf, leafNum];
                }
                i += leafNum!; // count all leaves from this branch
            }
        }
        return [null, i]; // nLeafs > number of leaves I have
    }
    

    getEstimatedTotalHeight(): number {
        return this.viewModel.getEstimatedTotalHeight();
    }
    getEstimatedTotalWidth(): number {
        return this.viewModel.getEstimatedTotalWidth();
    }
    







    /* based on @jupyterlab/cells/Cell */
    // get dataset() {
    //     return this.node.dataset;
    // }

    isPlaceholder(): boolean {
        return this.placeholder;
    }

    get placeholder(): boolean {
        return this._placeholder;
    }

    protected set placeholder(v: boolean) {
        if (this._placeholder !== v && v === false) {
            this.initializeDOM();
            this._placeholder = v;
            this._ready.resolve();
        } else if (v==true) {
            this.node.style.border = '1px solid blue';
        }
    }

    protected initializeDOM(): void {
        if (!this.placeholder) {
            return;
        }

        this.node.style.border = '1px solid red';
        // TODO: mosaic group control buttons in top corner, hidden unless hovered over

    }

    get ready(): Promise<void> {
        return this._ready.promise;
    }



    // Notebook methods

    // private _applyContentVisibility(cell: Cell<ICellModel>, index: number): void {
    //     const isContentVisibility =
    //         this.notebook.notebookConfig.windowingMode === 'contentVisibility';

    //     cell.toggleClass('jp-content-visibility', isContentVisibility);

    //     if (isContentVisibility) {
    //     const estHeight = this._viewModel.estimateWidgetSize(index);
    //     cell.node.style.containIntrinsicSize = `auto ${estHeight}px`;
    //     } else {
    //     cell.node.style.removeProperty('contain-intrinsic-size');
    //     }
    // }


    public onAfterAttach(msg: Message): void {
        this.update(); // will attach inner cells according to viewModel widgetRenderer
        super.onAfterAttach(msg);

        this.direction = (this.parent as Mosaic).direction == 'col' ? 'row' : 'col', // invert direction of parent 
        this.viewModel.direction = this.direction;

        this.viewportNode.classList.add('mosaicgroup-inner', 'mosaic'+this.direction);

        // requestAnimationFrame(() => {
        // this.viewModel.height = this.node.getBoundingClientRect().height;
        // console.log(this.direction, 'setting my height to', this.viewModel.height);
        // });
    }

    // protected onBeforeDetach(msg: Message): void {
    //     console.warn('AAAAA someones trying to kill me!!!', this, msg);
    //     super.onBeforeDetach(msg);
    // }


    protected onScroll(event: Event): void {
        super.onScroll(event);
        if (this.direction == 'row') {
            const { clientWidth, scrollWidth, scrollLeft } = event.currentTarget as HTMLDivElement;

            if (
                Math.abs(this.viewModel.scrollOffset - scrollLeft) > 1
            ) {
                const scrollOffset = Math.max(
                    0,
                    Math.min(scrollLeft, scrollWidth - clientWidth)
                );
                this.viewModel.scrollOffset = scrollOffset;

                if (this.viewModel.windowingActive) {
                    this.update();
                }
            }
        }
    }

    protected onResize(msg: any): void {
        console.warn('group resize!!', msg);
        const previousHeight = this.viewModel.height;
        this.viewModel.height =
            msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
        console.log('set vm height', this.viewModel.height);
        if (this.viewModel.height !== previousHeight) {
            void (this as any)._updater.invoke();
        }
        super.onResize(msg);
        void (this as any)._updater.invoke();
    }

    protected onItemResize(entries: ResizeObserverEntry[]) { // @jupyterlab/ui-components/windowedlist.ts:1497
        console.log(this.direction, 'on item resize');
        (this as any)._resetScrollToItem();

        if (this.isHidden || this.isParentHidden) {
            return;
        }

        const newSizes: { index: number; size: number }[] = [];
        for (let entry of entries) {
            // Update size only if item is attached to the DOM
            if (entry.target.isConnected) {
                // Rely on the data attribute as some nodes may be hidden instead of detach
                // to preserve state.
                newSizes.push({
                index: parseInt(
                    (entry.target as HTMLElement).dataset.windowedListIndex!,
                    10
                ),
                /** MOSAIC EDITED **/
                size: (this.direction == 'row' ? 
                    entry.borderBoxSize[0].inlineSize : 
                    entry.borderBoxSize[0].blockSize
                )
                /** </ MOSAIC EDITED > **/
                });
            }
        }

        // If some sizes changed
        if (this.viewModel.setWidgetSize(newSizes)) {
            (this as any)._scrollBackToItemOnResize();
            // Update the list
            this.update();
        }
        console.log(this.direction, 'sizers', (this.viewModel as any)._widgetSizers);
        this.update();
    }


    updateTotalSize(): void {
        console.warn(this.direction, 'mosaic updating size!!');
        if (this.viewModel.windowingActive) {
            console.log('win active');
        if (this.viewportNode.dataset.isScrolling == 'true') {
            // Do not update while scrolling, delay until later
            (this as any)._requiresTotalSizeUpdate = true;
            return;
        }
        const estimatedTotalHeight = this.viewModel.getEstimatedTotalSize();
        console.log('est total size UTS', estimatedTotalHeight);
        const heightWithPadding =
            estimatedTotalHeight +
            (this as any)._viewportPaddingTop +
            (this as any)._viewportPaddingBottom;
        // Update inner container height
        (this as any)._innerElement.style.height = `${heightWithPadding}px`;
        }
    }




    renderCellOutputs(index: number): void { // @jupyterlab
        // updated to deal with submosaics
        const tile = this.viewModel.widgetRenderer(index) as Cell;
        if (tile instanceof CodeCell && tile.isPlaceholder()) { const cell = tile as CodeCell;
            cell.dataset.windowedListIndex = `${index}`;
            this.layout.insertWidget(index, cell);
            if (this.notebook.notebookConfig.windowingMode === 'full') {
                // We need to delay slightly the removal to let codemirror properly initialize
                requestAnimationFrame(() => {
                    this.layout.removeWidget(cell);
                });
            }
        } else if (tile instanceof Mosaic && (tile as Mosaic).isPlaceholder()) { const mosaic = tile as Mosaic;
            for (let i = 0; i < mosaic.tiles.length; i++) {
                mosaic.renderCellOutputs(i);
            }
        }
    }
    
}


export namespace Mosaic {
    export function newUGID() {
        return "mg-"+crypto.randomUUID();
    }
    export interface IOptions extends Notebook.IOptions{
        direction: FlexDirection;
        notebook: Notebook;
    }
}
