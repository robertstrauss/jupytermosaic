import { Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
// import { ChildMessage } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { Cell, CodeCell,  } from '@jupyterlab/cells';
import { ArrayExt } from '@lumino/algorithm';
import { ObservableList, IObservableList } from '@jupyterlab/observables';

import { MosaicViewModel } from './MosaicViewModel';
import { MosaicNotebook } from './MosaicNotebookPanel';
// import { Widget } from '@lumino/widgets';
// import { MosaicNotebook } from './MosaicNotebookPanel';


export type FlexDirection = 'row' | 'col';

export type Tile = LeafCell | Mosaic;

export class LeafCell extends Cell {
    public superMosaic: Mosaic | null = null; // mosaic tree awareness, track parent
}

// export type NestedObservableList<T> = IObservableList<T | NestedObservableList<T>>;
export class ObservableTree<T> extends ObservableList<T> {
    constructor() {
        super();
        this.changed.connect((sender: ObservableTree<T>, msg: IObservableList.IChangedArgs<T>) => {
            // TODO - propagate changes up (add and modify listeners on children?)
        }); 
    }
    splice(startIndex: number, replaceCount:number, ...values: Array<T>): Array<T> {
        const removed = [];
        for (let n = 0; n < replaceCount; n++) {
            removed.push(this.remove(startIndex));
        }
        for (let i = 0; i < values.length; i++) {
            this.insert(startIndex+i, values[i]);
        }
        return removed as Array<T>;
    }
    map(callback: Function): Array<any> {
        const out = [];
        for (let i = 0; i < this.length; i++) {
            out.push(callback(this.get(i)));
        }
        return out;
    }
    indexOf(value: T): number {
        const itemCmp = (this as any)._itemCmp;
        return ArrayExt.findFirstIndex((this as any)._array, (item: T) => {
            return itemCmp(item, value);
        });
    }
    removeValue(value: T): number {
    const itemCmp = (this as any)._itemCmp;
    const index = ArrayExt.findFirstIndex((this as any)._array, (item: T) => {
      return itemCmp(item, value);
    });
    if (index < 0) return index;
    this.remove(index);
    return index;
  }
}

// class ReparentableNotebookWindowedLayout extends NotebookWindowedLayout {
//     protected detachWidget(index: number, widget: Widget): void {
//         // don't execute detachment procedures if the widget has been moved to some other parent.
//         // otherwise a race condition arises hiding or showing the element depending on if
//         // reciever or donor parent updates first.
//         if (widget.isAttached && widget.parent && widget.parent !== this.parent) return;
//         console.log(widget, widget.parent, this, this.parent);
//         super.detachWidget(index, widget);
//     }
// }

export class Mosaic extends WindowedList<MosaicViewModel> { // like a cell (element in notebook), but also like a windowedlist/notebook (contains more cells)
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
    
    
    protected _superMosaic: Mosaic | MosaicNotebook | null = null;
    public tiles: ObservableTree<Tile>;
    public mosaics: Map<string, Mosaic>;

    // can be hidden in super-windowed-list, like cell.
    private _placeholder: boolean;
    private _ready = new PromiseDelegate<void>();
    constructor(public groupID: string, public direction: FlexDirection = 'col') {
        const tiles: ObservableTree<Tile> = new ObservableTree();
        super({
            model: new MosaicViewModel(tiles, direction, {
                overscanCount: //options.notebookConfig?.overscanCount  ??
                    Mosaic.defaultConfig.overscanCount,
                windowingActive: true
            }),
            layout: new NotebookWindowedLayout(), //ReparentableNotebookWindowedLayout(),
            renderer: /*options.renderer ??*/ WindowedList.defaultRenderer,
            scrollbar: false
        });
        // this.notebook = options.notebook;
        this.tiles = tiles;
        this.mosaics = new Map<string, Mosaic>();
        // this.direction = options.direction;
        this._placeholder = true;

        this.addClass(Mosaic.NODE_CLASS);

        this.tiles.changed.connect(this.onTreeChanged, this);

        // patch the item resize method to use width not height when in row mode
        (this as any)._onItemResize = this.onItemResize;

        (this as any)._updateTotalSize = this.updateTotalSize;
    }

    get superMosaic(): Mosaic | MosaicNotebook | null {
        return this._superMosaic;
    }
    set superMosaic(mosaic: Mosaic | MosaicNotebook | null) {
        if (this._superMosaic !== null && mosaic !== this._superMosaic) {
            this._superMosaic!.tiles.removeValue(this);
        }
        this._superMosaic = mosaic;
    }

    get path(): Array<string> {
        return [...(this.superMosaic !== null ? this.superMosaic.path : []), this.groupID];
    }


    onTreeChanged(tree:ObservableTree<Tile>, msg:IObservableList.IChangedArgs<Tile>): void {
        switch (msg.type) {
            // case 'set':
            case 'clear':
            case 'remove': {
                // for (const tile of msg.oldValues) {
                    // console.warn('removing', tile);
                    // if (tile instanceof Mosaic) {
                    //     this.mosaics.delete(tile.groupID);
                    // }
                // }
                setTimeout(() => { // timeout in case cell moved (removed then added). Don't unwrap unless its staying underpopulated.
                    this.checkEmpty();
                }, 250);
                break;
            }
            case 'set':
            case 'add': {
                for (const tile of msg.newValues) {
                    Mosaic.setParent(tile, this);
                    if (tile instanceof Mosaic) {
                    //     console.log('adding ', 'Mosaic:'+tile.groupID);
                    //     this.mosaics.set(tile.groupID, tile);
                    }
                    else if (tile instanceof Cell) {
                        Mosaic.setPath(tile, this.path);
                        // console.log('adding ', 'Cell:'+(tile as any).prompt);
                        tile.disposed.connect((cell:LeafCell, msg:any)=> {
                            console.log('dispose!');
                            setTimeout(() => this.checkEmpty(), 250);
                        });

                    }
                }
                break;
            }
        }
        if (msg.type == 'remove') console.warn('remove', this);

        requestAnimationFrame(() => this.update());

        // trigger update on super tree for this item
        if (this.superMosaic) {
            const idx = this.superMosaic.tiles.indexOf(this);
            if (idx > -1) this.superMosaic.onTreeChanged(this.superMosaic.tiles, {
                type: 'set',
                newIndex: idx,
                newValues: [this],
                oldIndex: idx,
                oldValues: [this]
            });
        }
    }


    

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



    // insertLeaf(branch: Mosaic, cell: Cell, idx: number = 0) {
    // }
    addTile(groupID: string = '', index: number = -1): Mosaic {
        if (groupID == '') groupID = Mosaic.newUGID();
        const newMosaic = new Mosaic(groupID);//, this.options);
        this.splice(index, 0, newMosaic);
        return newMosaic;
    }
    growBranch(path: Array<string>, branchsIxs: Array<number> = [], depth: number = 0): Mosaic {
        if (depth < path.length) {
            let nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch == undefined) {
                nextBranch = this.addTile(path[depth], (branchsIxs.length > depth ? branchsIxs[depth] : -1));
            }
            return (nextBranch as Mosaic).growBranch(path, branchsIxs, depth+1);
        }
        return this;
    }

    // removeLast(tile: Tile) {
    //     const ix = ArrayExt.lastIndexOf(this.tiles, tile);
    //     this.splice(ix, 1);
    //     // this.checkEmpty();
    // }

    splice(startIndex: number, replaceCount: number, ...tiles: Array<Tile>) {
        if (startIndex < 0) startIndex = this.tiles.length;
        this.tiles.splice(startIndex, replaceCount, ...tiles);
    }

    checkEmpty() {
        // unwrap if only holding one or no tiles
        if (this.tiles.length < 2) {
            const subtile = this.tiles.get(0);
            if (subtile && subtile instanceof Mosaic) {
                subtile.unwrap(); // remove double-wrap (to preserve flex direction)
            }
            this.unwrap();
        }
    }


    unwrap() {
        if (!this.superMosaic) return;

        // remove self from superMosaic
        const idx = this.superMosaic.tiles.removeValue(this); // I am now dereferrenced, I should be garbage collected.
        // console.log('unwrapping:', this.path, Mosaic.showMosaic(this), 'index in super:', idx, this.superMosaic);
        if (this.tiles.length > 0) { // insert my contents (if any) where I was
            console.log('im not empty');
            this.superMosaic.tiles.splice(idx, 0, ...this.tiles);
            console.log('gave to parent:', Mosaic.showMosaic(this.superMosaic as Mosaic));
        }
    }

    getLeaf(leafIx: number): [[Mosaic, LeafCell] | null, number] {
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

    // findStem(leaf: Cell, reverse = true): Mosaic | null {
    //     let list;
    //     if (reverse) list = this.tiles.slice().reverse();
    //     else list = this.tiles;

    //     for (const tile of list) {
    //         if (tile instanceof Cell) {
    //             if (tile === leaf) return this;
    //         } else {
    //             return tile.findStem(leaf, reverse);
    //         }
    //     }
    //     return null;
    // }



    
    







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
                const size = (dim == 'row' ? 
                            entry.borderBoxSize[0].inlineSize : 
                            entry.borderBoxSize[0].blockSize
                        );
                // Update size only if item is attached to the DOM
                if (entry.target.isConnected && size > 0) {
                    // Rely on the data attribute as some nodes may be hidden instead of detach
                    // to preserve state.
                    newSizes.push({
                        index: parseInt(
                            (entry.target as HTMLElement).dataset.windowedListIndex!,
                            10
                        ),
                        size: size
                    });
                }
            }

            // If some sizes changed
            if (this.viewModel.setWidgetSize(newSizes, dim as FlexDirection)) {
                (this as any)._scrollBackToItemOnResize();
                // Update the list
                this.update();
            }
            requestAnimationFrame(() => this.update());
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

            // let estimatedTotalWidth = this.viewModel.getEstimatedTotalWidth();
            // if (this.direction == 'col') {
            //     estimatedTotalWidth += 2*Mosaic.CSS.colPaddingLeft;
            // }
            // this.innerElement.style.width = `${estimatedTotalWidth}px`

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
            // if (this.notebook.notebookConfig.windowingMode === 'full') {
                // We need to delay slightly the removal to let codemirror properly initialize
                requestAnimationFrame(() => {
                    this.layout.removeWidget(cell);
                });
            // }
        } else if (tile instanceof Mosaic && (tile as Mosaic).isPlaceholder()) { const mosaic = tile as Mosaic;
            for (let i = 0; i < mosaic.tiles.length; i++) {
                mosaic.renderCellOutputs(i);
            }
        }
    }


    detachWidget() {}
    
}


export namespace Mosaic {
    export function showMosaic(t:Tile): any { // debugging function reducing mosaic to nested list of cell prompts
        if (t instanceof Mosaic || t instanceof MosaicNotebook) {
            return (t.tiles as any)._array.map(Mosaic.showMosaic);
        } else if (t instanceof Cell) {
            return 'Cell:'+(t as any).prompt;
        } else {
            return t;
        }
    }
    export function getPath(cell:Cell): Array<string> | undefined {
        return cell.model!.getMetadata(Mosaic.METADATA_NAME) as Array<string>;
    }
    export function setPath(cell:Cell, path:Array<string>): void {
        return cell.model!.setMetadata(Mosaic.METADATA_NAME, path);
    }
    export function setParent(tile:Tile, mosaic: Mosaic | null) {
        // console.warn('set parent', tile instanceof Cell ? 'Cell:'+(tile as any).prompt : 'mosaic:'+tile.path, tile.superMosaic, tile.parent, mosaic);
        if (tile.superMosaic && tile.superMosaic !== mosaic) {
            tile.superMosaic.tiles.removeValue(tile);
        }
        tile.superMosaic = mosaic;
        // tile.parent = mosaic; // important: need to check parentage before removing, in case it was just moved to another list.
    }
    export function divergeDepth(path1: Array<string>, path2: Array<string>): number {
        for (let i = 0; i < path1.length; i++) {
            if (path2.length <= i || path1[i] !== path2[i]) return i;
        }
        return path1.length;
    }
    export function newUGID() {
        return "mg-"+crypto.randomUUID();
    }
    export interface IOptions extends Notebook.IOptions{
        direction: FlexDirection;
        notebook: Notebook;
    }
}
