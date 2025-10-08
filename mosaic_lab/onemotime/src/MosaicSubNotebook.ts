import { StaticNotebook, Notebook, NotebookWindowedLayout } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components'
// import { Cell } from '@jupyterlab/cells';

import { MosaicSubViewModel } from './mosaicviewmodel';
import { Message } from '@lumino/messaging';
import { PromiseDelegate } from '@lumino/coreutils';

export namespace MosaicSubNotebook {
    export interface IOptions extends StaticNotebook.IOptions {
        // direction: 'row' | 'col'
    }
}


export class MosaicSubNotebook extends WindowedList<MosaicSubViewModel> { //StaticNotebook {
    protected getProperty(prop: string | symbol) {
        const val = (this.notebook as any)[prop];
        if (typeof val === 'function') {
            return val.bind(this); // use the notebook's method as if it belonged to this
        }
        return val;
    }
    private _placeholder;
    private _ready = new PromiseDelegate<void>();
    constructor(protected parentviewmodel: MosaicSubViewModel, protected groupID: string, protected notebook: Notebook) {
        super({
            model: new MosaicSubViewModel(parentviewmodel, groupID, notebook),
            layout: new NotebookWindowedLayout(),
            renderer: (notebook as any).renderer
        });
        this._placeholder = true;

        this.node.classList.add('mosaicgroup', 'mosaic'+this.viewModel.direction);

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

    // onBeforeAttach(e:any) {
    //     super.onBeforeAttach(e);
    // }

    protected onAfterAttach(msg: Message): void {
        this.update();
        super.onAfterAttach(msg);
    //     (this as any)._update();
    //     super.onAfterAttach(msg);
    }

    // protected onUpdateRequest(msg: Message): void {
    //     super.onUpdateRequest(msg);
    // }


}

