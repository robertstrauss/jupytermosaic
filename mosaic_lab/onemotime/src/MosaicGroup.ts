import { Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components'
// import { Cell } from '@jupyterlab/cells';

import { IMosaicViewModel, MosaicViewModel } from './MosaicViewModel';
import { Message } from '@lumino/messaging';
import { PromiseDelegate } from '@lumino/coreutils';
// import { Widget } from '@lumino/widgets';
// import { Cell } from '@jupyterlab/cells'


// type FlexDirection = 'row' | 'col';


// type Tile = Cell | Mosaic;

export class MosaicGroup extends WindowedList<MosaicViewModel> { //StaticNotebook {


    getEstimatedTotalSize() {
        return this.viewModel.getEstimatedTotalSize();
    }
    

    protected getProperty(prop: string | symbol) {
        const val = (this.notebook as any)[prop];
        if (typeof val === 'function') {
            return val.bind(this); // use the notebook's method as if it belonged to this
        }
        return val;
    }
    private _placeholder;
    private _ready = new PromiseDelegate<void>();
    constructor(protected parentviewmodel : IMosaicViewModel, protected groupID : string, protected notebook: Notebook) {
        // const tiles = new Array<Tile>
        super({
            model: new MosaicViewModel(parentviewmodel, groupID, notebook),
            layout: new NotebookWindowedLayout(),
            renderer: (notebook as any).renderer
        });
        this._placeholder = true;

        this.node.classList.add('mosaicgroup-outer');
        this.viewportNode.classList.add('mosaicgroup-inner', 'mosaic'+this.viewModel.direction);

        return new Proxy(this, { // a Proxy mimicing a StaticNotebook, forwarding to the real notebook given
            get: (target, prop, receiver) => {
                if (prop in target) { // if this defines its own version, use that
                    return Reflect.get(target, prop, receiver);
                }
                return this.getProperty(prop); // otherwise, refer to the notebook.
            }
        });
    }


    get dataset() {
        return this.node.dataset;
    }

    isPlaceholder(): boolean {
        return this.placeholder;
    //     return false;
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

