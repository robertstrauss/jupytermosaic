import { Notebook } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
// import { WindowedList } from '@jupyterlab/ui-components'
// import { IObservableList } from '@jupyterlab/observables';
import { Widget } from '@lumino/widgets';
// import { IChangedArgs } from '@jupyterlab/coreutils';
// import { ISignal } from '@lumino/signaling';

import { MosaicSubNotebook } from './MosaicSubNotebook';
import { WindowedListModel } from '@jupyterlab/ui-components';



export type CellTree = {
    [key:string] : CellTree | Cell
}


export class MosaicSubViewModel extends WindowedListModel { //NotebookViewModel {
    public direction: 'row' | 'col'; // flex-direction of the group (put cells in rows or columns)
    constructor(
        public parent: MosaicSubViewModel,
        public groupID: string,
        public notebook: Notebook
    ) {
        super({windowingActive:true}); // 
        this.direction = this.parent.direction == 'row' ? 'col' : 'row' // invert direction of parent
        this.subNotebooks = {};
    }

    protected subNotebooks: {[key:string]: MosaicSubNotebook};

    get subTree(): CellTree {
        return this.parent.subTree[this.groupID] as CellTree;
    }

    get widgetCount() {
        return Object.keys(this.subTree).length;
    }

    widgetRenderer = (index: number): Widget => {
        const [gID, subItem] = Object.entries(this.subTree)[index]; //.map(([k,v],i) => {
        if (gID.startsWith('cell-')) return subItem as Cell;
        if (!this.subNotebooks[gID]) this.subNotebooks[gID] = new MosaicSubNotebook(this, gID, this.notebook);
        return this.subNotebooks[gID];
    }

    estimateWidgetSize = () => {
        return 100; // TODO: widget size estimation. can tie into scrollable-state
    }
}