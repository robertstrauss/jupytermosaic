import { Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components'
// import { Cell } from '@jupyterlab/cells';

import { MosaicViewModel } from './MosaicViewModel';
import { Message } from '@lumino/messaging';
import { PromiseDelegate } from '@lumino/coreutils';
// import { Widget } from '@lumino/widgets';
import { Cell } from '@jupyterlab/cells'
// import { ArrayExt } from '@lumino/algorithm';

type FlexDirection = 'row' | 'col';

export type Tile = Cell | Mosaic;


// need strict ordering for execution and compatability
// but also more permanent addresses for known groups
// since things are more complicated than splicing an array
export class orderedMap<K, V> {
    itemMap: Map<K, V>
    itemOrder: Array<K>
    constructor() {
        this.itemMap = new Map<K,V>;
        this.itemOrder = [];
    }
    public index(index: number) {
        if (!this.itemOrder[index]) {
            return undefined
        }
        return this.itemMap.get(this.itemOrder[index]);
    }
    public key(key: K) {
        return this.itemMap.get(key);
    }
    public indexOf(key: K) {
        return this.itemOrder.indexOf(key);
    }
    public keyOf(index: number) {
        return this.itemOrder[index];
    }
    public spliceIndex(startIndex: number, deleteCount: number, keys: Array<K>, vals: Array<V>) {
        // insert or delete
        const deleted = this.itemOrder.splice(startIndex, deleteCount, ...keys);
        // this.itemOrder = [... new Set(this.itemOrder)]; // de-duplicate
        if (deleted.length > 0) {
            for (let key of deleted) {
                this.itemMap.delete(key);
            }
        }
        for (const i in keys) {
            const key = keys[i];
            const val = vals[i];
            this.itemMap.set(key, val);
        }
    }
    get length() {
        return this.itemOrder.length;
    }
    get keys() {
        return this.itemOrder;
    }
    get values() {
        // not just Object.values, needs to be sorted by order
        return this.itemOrder.map(k => this.itemMap.get(k) as V);
    }
    [Symbol.iterator]() {
        let ix = 0;
        let key = this.itemOrder[ix];
        const that = this;
        return {
            next() {
                key = that.itemOrder[ix];
                ix += 1;
                if (key !== undefined) {
                    return { done: false, value: key as K }
                } else {
                    return { done: true }
                }
            }
        }
    }
}

export class Mosaic extends WindowedList<MosaicViewModel> { //
    static defaultConfig = {
        overscanCount: 3
    }
    // resuse notebook's context for rendering rather than instantiating our own
    // protected getProperty(prop: string | symbol) {
    //     const val = (this.notebook as any)[prop];
    //     if (typeof val === 'function') {
    //         return val.bind(this); // use the notebook's method as if it belonged to this
    //     }
    //     return val;
    // }
    
    public tiles: orderedMap<string, Tile>;
    // public tileOrder: Array<string>;
    public notebook;
    public direction;
    private _placeholder;
    private _ready = new PromiseDelegate<void>();
    constructor(protected superMosaic: Mosaic, public groupID: string, protected options: Mosaic.IOptions) {
        // const tiles = {};
        // const tileOrder: Array<string> = [];
        const tiles = new orderedMap<string, Tile>();
        super({
            model: new MosaicViewModel(tiles, {
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
        // this.tileOrder = tileOrder;
        this.direction = options.direction;

        // this.direction = this.parent.direction == 'row' ? 'col' : 'row' // invert direction of parent
        this._placeholder = true;

        this.addClass('mosaicgroup-outer');
        this.viewportNode.classList.add('mosaicgroup-inner', 'mosaic'+this.direction);

        // return new Proxy(this, { // a Proxy mimicing a StaticNotebook, forwarding to the real notebook given
        //     get: (target, prop, receiver) => {
        //         if (prop in target) { // if this defines its own version, use that
        //             return Reflect.get(target, prop, receiver);
        //         }
        //         return this.getProperty(prop); // otherwise, refer to the notebook.
        //     }
        // });
    }

    get path(): Array<string> {
        return [...this.superMosaic.path, this.groupID];
    }

    treeGet(path: Array<string>, depth: number = 0): Tile {
        if (depth < path.length) {
            return (this.tiles.key(path[depth]) as Mosaic).treeGet(path, depth+1);
        }
        return this; // i am at a depth == path length, I am the result
    }

    treeGetExisting(path: Array<string>, depth: number = 0): Tile {
        if (depth < path.length) {
            const nextBranch = (this.tiles.key(path[depth]));
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
        const newMosaic = new Mosaic(this, groupID, {...this.options,
                    direction: this.direction == 'row' ? 'col' : 'row', // invert direction of parent 
                });
        this.splice(index, 0, {[groupID]: newMosaic})
        return newMosaic;
    }
    growBranch(path: Array<string>, depth: number = 0, branchsIxs: Array<number> = []): Mosaic {
        if (depth < path.length) {
            let nextBranch = (this.tiles.key(path[depth]));
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
        const insert: {[key:string]: Tile} = {};
        insert[cell.model.id] = cell;
        stem.splice(branchIxs[path.length] || -1, 0, insert);
    }

    indexOf(id: string) {
        return this.tiles.indexOf(id);
    }
    splice(startIndex: number, replaceCount: number, tiles: {[key:string]: Tile} = {}) {
        this.tiles.spliceIndex(startIndex, replaceCount, Object.keys(tiles), Object.values(tiles));
        for (const [key, tile] of Object.entries(tiles)) {
            if (tile instanceof Cell) { key;
                // tile.disposed.connect(() => {
                //     console.log('auto splice', key, this.indexOf(key));
                //     this.splice(this.indexOf(key), 1);
                //     console.log('still there?', this.indexOf(key));
                // });
            }
        }

        // unwrap if only holding one or no tiles
        if (replaceCount > 0 && this.tiles.length < 2) {
            // const subtile = this.tiles.index(0);
            // if (subtile && subtile instanceof Mosaic) {
            //     subtile.unwrap(); // remove double-wrap (to preserve flex direction)
            // }
            // this.unwrap();
        }
    }
    spliceCells(startIndex: number, replaceCount: number, ...cells: Array<Cell>) {
        const withIds: {[key:string]: Cell} = {};
        for (const cell of cells) {
            withIds[cell.model.id] = cell;
        }
        this.splice(startIndex, replaceCount, withIds);
    }

    unwrap() {
        const idx = this.superMosaic.indexOf(this.groupID);
        this.superMosaic.splice(idx, 1); // remove this group from parent

        if (this.tiles.length > 0) { // insert my contents (if any) where I was
            this.superMosaic.tiles.spliceIndex(idx, 0, this.tiles.keys, this.tiles.values);
        }
        // update metadata of contained cells
        this.forEachLeaf(([mosaic, id]: [Mosaic, string], leafIx:number) => {
            const cell = mosaic.tiles.key(id) as Cell;
            const prepath = cell.model.getMetadata('mosaic');
            const newpath = prepath.splice(prepath.indexOf(this.groupID), 1);
            cell.model.setMetadata('mosaic', newpath);
        });
    }

    getLeaf(leafIx: number): [[Mosaic, string] | null, number] {
        // linearly walk through leafs (Cells) according to each sub groups order until the desired leafindex is reached
        // returns: last parent mosaic and id of leaf in parent or null if not found, and number of leafs checked (== leafIx, or total number of leaves if not found)
        let i = 0;
        for (const id of this.tiles) {
            if (!id) break;
            if (this.tiles.key(id) instanceof Cell) {
                if (i == leafIx) {
                    return [[this, id], i]; // found desired leaf
                }
                i += 1; // count leaf
            } else {
                const [groupAndId, nLeafs] = (this.tiles.key(id) as Mosaic).getLeaf(leafIx-i);

                if (groupAndId !== null) {
                    return [groupAndId!, i];
                }
                i += nLeafs!; // count all leaves from this branch
            }
        }
        return [null, i]; // nLeafs > number of leaves I have
    }
    forEachLeaf(f: Function): number {
        let i = 0;
        for (const id of this.tiles) {
            if (!id) break;
            if (this.tiles.key(id) instanceof Cell) {
                f([this, id], i);
                // i += 1; // count leaf
            } else {
                const nLeafs = (this.tiles.key(id) as Mosaic).forEachLeaf(f);
                i += nLeafs!; // count all leaves from this branch
            }
        }
        return i; // return number of leafs iterated, to track count 

        // return [null, i]; // nLeafs > number of leaves I have
        // let i = 0;
        // let [found, leafIx] = this.getLeaf(i);
        // while (found !== null) {
        //     f(found, leafIx);
        //     [found, leafIx] = this.getLeaf(++i);
        // }
    }

    getEstimatedTotalSize() {
        return this.viewModel.getEstimatedTotalSize();
    }
    
    protected onBeforeAttach(msg: Message): void {
        super.onBeforeAttach(msg);
        this.viewportNode.classList.add('mosaic'+this.direction);
    }




    /* based on @jupyterlab/cells/Cell */
    get dataset() {
        return this.node.dataset;
    }

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

    protected onAfterAttach(msg: Message): void {
        this.update(); // will attach inner cells according to viewModel widgetRenderer
        super.onAfterAttach(msg);
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
