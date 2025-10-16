import { Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components';
import { Message, MessageLoop } from '@lumino/messaging';
// import { ChildMessage } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { Cell, CodeCell,  } from '@jupyterlab/cells';
import { ArrayExt } from '@lumino/algorithm';

import { MosaicViewModel } from './MosaicViewModel';


export type FlexDirection = 'row' | 'col';

export type Tile = Cell | Mosaic;

// export type NestedObservableList<T> = IObservableList<T | NestedObservableList<T>>;


export class Mosaic extends WindowedList<MosaicViewModel> { //
    static METADATA_NAME = 'mosaic';
    static NODE_CLASS = 'mosaic-group-outer';
    static INNER_GROUP_CLASS = 'mosaic-group-inner';
    static DIR_CLASS = {
        'row': 'mosaic-row',
        'col': 'mosaic-col'
    }
    static CSS = {
        rowPaddingTop: 5,
        colPaddingLeft: 5
    }
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
    static getPath(cell:Cell): Array<string> {
        return cell.model!.getMetadata(Mosaic.METADATA_NAME) as Array<string> || [];
    }
    static divergeDepth(path1: Array<string>, path2: Array<string>): number {
        for (let i = 0; i < path1.length; i++) {
            if (path2.length <= i || path1[i] !== path2[i]) return i;
        }
        return path1.length;
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

        this.addClass(Mosaic.NODE_CLASS);

        // patch the item resize method to use width not height when in row mode
        (this as any)._onItemResize = this.onItemResize;

        (this as any)._updateTotalSize = this.updateTotalSize;
    }

    // set parent(val: Mosaic) {
    //     console.warn('tryna set my parent?');
    //     (this as any)._parent = parent;
        
    // }

    // get path(): Array<string> {
    //     return [...this.superMosaic.path, this.groupID];
    // }

    // getTile(i:number) {
    //     let tile;
    //     while (i < this.tiles.length) {
    //         tile = this.tiles[i];
    //         if (tile instanceof Cell && !tile.model) this.splice(i, 1);
    //         else if (tile instanceof Mosaic && tile.tiles.length < 2) tile.unwrap();
    //         else break;
    //     }
    //     return tile;
    // }

    

    treeGet(path: Array<string>, depth: number = 0): Mosaic {
        if (depth < path.length) {
            return (this.mosaics.get(path[depth]) as Mosaic).treeGet(path, depth+1);
        }
        return this; // i am at a depth == path length, I am the result
    }

    treeGetExisting(path: Array<string>, depth: number = 0): [Mosaic, number] {
        // get up to the deepest existing branch for the given path
        if (depth < path.length) {
            const nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch !== undefined) {
                return (nextBranch as Mosaic).treeGetExisting(path, depth+1);
            } else {
                return [this, depth];
            }
        }
        return [this, depth];
    }


    addTile(groupID: string = '', index: number = -1): Mosaic {
        if (groupID == '') groupID = Mosaic.newUGID();
        const newMosaic = new Mosaic(this, groupID, this.options);
        this.splice(index, 0, newMosaic);
        return newMosaic;
    }
    growBranch(path: Array<string>, branchsIxs: Array<number> = [], depth: number = 0): Mosaic {
        if (depth < path.length) {
            let nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch == undefined) {
                nextBranch = this.addTile(path[depth], (branchsIxs[depth] || -1));
            }
            return (nextBranch as Mosaic).growBranch(path, branchsIxs, depth+1);
        }
        return this;
    }

    removeLast(tile: Tile) {
        const ix = ArrayExt.lastIndexOf(this.tiles, tile);
        this.splice(ix, 1);
        // this.checkEmpty();
    }

    splice(startIndex: number, replaceCount: number, ...tiles: Array<Tile>) {
        if (startIndex < 0) startIndex = this.tiles.length;
        const deleted = this.tiles.splice(startIndex, replaceCount, ...tiles);
        if (deleted.length > 0) {
            this.viewModel.onListChanged({} as any, {
                type: 'remove',
                oldIndex: startIndex,
                oldValues: deleted,
                newIndex: startIndex,
                newValues: []
            });
        }
        for (const deletetile of deleted) {
            if (deletetile instanceof Mosaic) {
                this.mosaics.delete(deletetile.groupID);
            }
        }
        if (tiles.length > 0) {
            this.viewModel.onListChanged({} as any, {
                type: 'add',
                newIndex: startIndex,
                newValues: tiles,
                oldIndex: startIndex,
                oldValues: []
            });
        }
        for (const tile of tiles) {
            tile.parent = this;

            if (tile instanceof Cell) { // add disposal listener to cell to remove from tiles
                tile.disposed.connect(() => {
                    this.removeLast(tile);
                });
                MessageLoop.installMessageHook(tile, {
                    messageHook: (handler: Cell, msg: Message): boolean => {
                        if (msg.type == 'parent-changed') {
                            if (handler.parent !== this) {
                                this.removeLast(tile);
                            }
                        }
                        return true;
                    }
                })
            } else if (tile instanceof Mosaic) {
                this.mosaics.set(tile.groupID, tile); // add mosaic to map for easy tree traversal
            }
        }

        if (replaceCount > 0) {
            // this.checkEmpty();
        }

        this.update();
    }

    checkEmpty() {
        console.log('checking empty!', this.node, this.tiles);
        // unwrap if only holding one or no tiles
        if (this.tiles.length < 2) {
            console.log('unwrap!');
            const subtile = this.tiles[0];
            if (subtile && subtile instanceof Mosaic) {
                subtile.unwrap(); // remove double-wrap (to preserve flex direction)
            }
            this.unwrap();
        }
    }


    unwrap() {
        if (!this.superMosaic) return;

        // update metadata of contained cells
        const removeGID = this.groupID;
        const recurseUpdate = (tile: Tile) => {
            if (tile instanceof Cell) {
                // remove my group ID from cells mosaic tree path
                const prepath = Mosaic.getPath(tile);
                const idx = prepath.indexOf(removeGID);
                if (idx > -1) {
                    const newpath = prepath.splice(prepath.indexOf(removeGID), 1);
                    tile.model.setMetadata(Mosaic.METADATA_NAME, newpath);
                }
            } else {
                tile.tiles.map(t => recurseUpdate(t));
            }
        }
        recurseUpdate(this);

        // remove self from superMosaic
        const idx = this.superMosaic.tiles.indexOf(this);
        if (idx > -1) this.superMosaic.splice(idx, 1); // I am now dereferrenced, I should be garbage collected.
        if (this.tiles.length > 0) { // insert my contents (if any) where I was
            this.superMosaic.tiles.splice(idx, 0, ...this.tiles);
        }
        console.log('parent', Mosaic.showMosaic(this.superMosaic));
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

    findGroup(node: Node): Array<string> | null {
        // search the tree depth-first for a mosaic group with the specified node
        for (const groupID in this.mosaics) {
            if (this.mosaics.get(groupID)!.node === node) {
                return [groupID];
            }
            const found = this.mosaics.get(groupID)!.findGroup(node);
            if (found !== null) {
                return [groupID, ...found];
            }
        }
        return null;
    }

    findStem(leaf: Cell, reverse = true): Mosaic | null {
        let list;
        if (reverse) list = this.tiles.slice().reverse();
        else list = this.tiles;

        for (const tile of list) {
            if (tile instanceof Cell) {
                if (tile === leaf) return this;
            } else {
                return tile.findStem(leaf, reverse);
            }
        }
        return null;
    }



    
    







    /* based on @jupyterlab/cells/Cell */

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



    /** Notebook-like methods */

    public onAfterAttach(msg: Message): void {
        this.update(); // will attach inner cells according to viewModel widgetRenderer
        super.onAfterAttach(msg);

        this.direction = (this.parent as Mosaic).direction == 'col' ? 'row' : 'col', // invert direction of parent 
        this.viewModel.direction = this.direction;

        this.viewportNode.classList.add(Mosaic.INNER_GROUP_CLASS, Mosaic.DIR_CLASS[this.direction]);
    }


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
        // add width too?
        const previousHeight = this.viewModel.height;
        this.viewModel.height =
            msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
        if (this.viewModel.height !== previousHeight) {
            void (this as any)._updater.invoke();
        }
        super.onResize(msg);
        void (this as any)._updater.invoke();
    }

    protected onItemResize(entries: ResizeObserverEntry[]) { // @jupyterlab/ui-components/windowedlist.ts:1497
        (this as any)._resetScrollToItem();

        if (this.isHidden || this.isParentHidden) {
            return;
        }

        for (const dim of ['row', 'col']) {
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
                        size: (dim == 'row' ? 
                            entry.borderBoxSize[0].inlineSize : 
                            entry.borderBoxSize[0].blockSize
                        )
                    });
                }
            }

            // If some sizes changed
            if (this.viewModel.setWidgetSize(newSizes, dim as FlexDirection)) {
                (this as any)._scrollBackToItemOnResize();
                // Update the list
                this.update();
            }
            this.update();
        }
    }


    get innerElement(): HTMLElement {
        return (this as any)._innerElement;
    }
    updateTotalSize(): void {
        if (this.viewModel.windowingActive) {
            if (this.viewportNode.dataset.isScrolling == 'true') {
                // Do not update while scrolling, delay until later
                (this as any)._requiresTotalSizeUpdate = true;
                return;
            }
            let estimatedTotalHeight = this.viewModel.getEstimatedTotalHeight();
            if (this.direction == 'row') {
                estimatedTotalHeight += 2*Mosaic.CSS.rowPaddingTop;
            }
            // Update inner container height
            this.innerElement.style.height = `${estimatedTotalHeight}px`;

            let estimatedTotalWidth = this.viewModel.getEstimatedTotalWidth();
            if (this.direction == 'col') {
                estimatedTotalWidth += 2*Mosaic.CSS.colPaddingLeft;
            }
            this.innerElement.style.width = `${estimatedTotalWidth}`

            if (   (this.viewportNode.scrollWidth > this.viewportNode.clientWidth)
                || (this.viewportNode.scrollHeight > this.viewportNode.clientHeight)
            ) {
                this.viewportNode.classList.add('mosaic-scrolling');
                this.viewportNode.style.setProperty('--scroll-width', `${this.viewportNode.scrollWidth}px`);
                this.viewportNode.style.setProperty('--scroll-height', `${this.viewportNode.scrollHeight}px`);
            } else {
                this.viewportNode.classList.remove('mosaic-scrolling');
            }
        }
    }

    getEstimatedTotalHeight(): number {
        return this.viewModel.getEstimatedTotalHeight();
    }
    getEstimatedTotalWidth(): number {
        return this.viewModel.getEstimatedTotalWidth();
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
