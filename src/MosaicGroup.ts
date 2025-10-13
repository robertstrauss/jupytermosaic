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


export class Mosaic extends WindowedList<MosaicViewModel> { //
    static defaultConfig = {
        overscanCount: 3
    }
    
    public tiles: Array<Tile>;
    public mosaics: Map<string, Mosaic>;
    public notebook;
    public direction;
    private _placeholder;
    private _ready = new PromiseDelegate<void>();
    constructor(protected superMosaic: Mosaic, public groupID: string, protected options: Mosaic.IOptions) {
        const tiles: Array<Tile> = [];
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
        this.mosaics = new Map<string, Mosaic>();
        this.direction = options.direction;
        this._placeholder = true;

        this.addClass('mosaicgroup-outer');

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
            if (tile instanceof Cell) { // add disposal listener to cell to remove from tiles
                tile.disposed.connect(() => {
                    this.tiles.splice(this.tiles.indexOf(tile), 1);
                });
            } else if (tile instanceof Mosaic) {
                this.mosaics.set(tile.groupID, tile); // add mosaic to map for easy tree traversal
            }
        }

        // console.log('rep count', replaceCount, 'l', this.tiles.length);
        // unwrap if only holding one or no tiles
        if (replaceCount > 0 && this.tiles.length < 2) {
            const subtile = this.tiles[0];
            if (subtile && subtile instanceof Mosaic) {
                subtile.unwrap(); // remove double-wrap (to preserve flex direction)
            }
            this.unwrap();
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
    

    getEstimatedTotalSize() {
        return this.viewModel.getEstimatedTotalSize();
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

    protected onAfterAttach(msg: Message): void {
        this.update(); // will attach inner cells according to viewModel widgetRenderer
        super.onAfterAttach(msg);

        this.direction = (this.parent as Mosaic).direction == 'row' ? 'col' : 'row', // invert direction of parent 

        this.viewportNode.classList.add('mosaicgroup-inner', 'mosaic'+this.direction);
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
