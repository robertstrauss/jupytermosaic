import { Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components'
// import { Cell } from '@jupyterlab/cells';

import { MosaicViewModel } from './MosaicViewModel';
import { Message } from '@lumino/messaging';
import { PromiseDelegate } from '@lumino/coreutils';
// import { Widget } from '@lumino/widgets';
import { Cell } from '@jupyterlab/cells'


type FlexDirection = 'row' | 'col';

export type Tile = Cell | Mosaic;

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
    
    public tiles: {[key:string]: Tile};
    public tileOrder: Array<string>;
    public notebook;
    public direction;
    private _placeholder;
    private _ready = new PromiseDelegate<void>();
    constructor(protected options: Mosaic.IOptions) {
        const tiles = {};
        const tileOrder: Array<string> = [];
        super({
            model: new MosaicViewModel(tiles, tileOrder, {
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
        this.tileOrder = tileOrder;
        this.direction = options.direction;

        // this.direction = this.parent.direction == 'row' ? 'col' : 'row' // invert direction of parent
        this._placeholder = true;

        this.addClass('mosaicgroup-outer');
        // this.viewportNode.classList.add('mosaicgroup-inner', 'mosaic'+this.direction);

        // return new Proxy(this, { // a Proxy mimicing a StaticNotebook, forwarding to the real notebook given
        //     get: (target, prop, receiver) => {
        //         if (prop in target) { // if this defines its own version, use that
        //             return Reflect.get(target, prop, receiver);
        //         }
        //         return this.getProperty(prop); // otherwise, refer to the notebook.
        //     }
        // });
    }

    treeGet(path: Array<string>, depth: number = 0): Tile {
        if (depth < path.length) {
            return (this.tiles[path[depth]] as Mosaic).treeGet(path, depth+1);
        }
        return this; // i am at a depth >= path, I am the result
    }

    treeGetExisting(path: Array<string>, depth: number = 0): Tile {
        if (depth < path.length) {
            const nextBranch = (this.tiles[path[depth]]);
            if (nextBranch !== undefined) {
                return (nextBranch as Mosaic).treeGetExisting(path, depth+1);
            } else {
                return this
            }
        }
        return this;
    }
    
    addTile(groupID: string): Mosaic {
        const newMosaic = new Mosaic({...this.options,
                    direction: this.direction == 'row' ? 'col' : 'row', // invert direction of parent 
                });
        // const groupID = Mosaic.newUGID();
        this.tileOrder.push(groupID);
        this.tiles[groupID] = newMosaic;
        return newMosaic;
    }
    growBranch(path: Array<string>, depth: number = 0): Mosaic {
        if (depth < path.length) {
            let nextBranch = (this.tiles[path[depth]]);
            if (nextBranch == undefined) {
                nextBranch = this.addTile(path[depth]);
            }
            return (nextBranch as Mosaic).growBranch(path, depth+1);
        }
        return this;
    }

    mosaicInsert(cell: Cell, leafIndex: number = -1) {
        const path = cell.model.metadata.mosaic as Array<string> || [];
        const stem = this.growBranch(path);
        const insert: {[key:string]: Tile} = {};
        insert[cell.model.id] = cell;
        stem.splice(leafIndex, 0, insert);
    }

    indexOf(id: string) {
        return this.tileOrder.indexOf(id);
    }
    splice(startIndex: number, replaceCount: number, tiles: {[key:string]: Tile} = {}) {
        this.tileOrder.splice(startIndex, replaceCount, ...Object.keys(tiles));
        for (const [key, tile] of Object.entries(tiles)) { 
            // this.tiles[key] = tile;
            this.tiles[key] = tile /*new Proxy(tile, {get: (target, prop, reciever) => {
                                        // console.log('cells getting', target, prop, reciever);
                                        return Reflect.get(target, prop, reciever);
                                    }, set: (target, p, newValue, receiver) => {
                                        console.warn('set (mine)', target, p, newValue, receiver);
                                        return false;
                                    },
                                    });*/;
            console.log('coppied.', this.tiles[key] == tile, this.tiles[key] === tile);
        }
    }

    getEstimatedTotalSize() {
        return this.viewModel.getEstimatedTotalSize();
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
        return crypto.randomUUID();
    }
    export interface IOptions extends Notebook.IOptions{
        direction: FlexDirection;
        notebook: Notebook;
    }
}
