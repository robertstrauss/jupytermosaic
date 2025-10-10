import { Notebook, NotebookViewModel } from '@jupyterlab/notebook';
import { Cell, ICellModel } from '@jupyterlab/cells';
// import { WindowedList } from '@jupyterlab/ui-components'
// import { IObservableList } from '@jupyterlab/observables';
import { Widget } from '@lumino/widgets';
// import { IChangedArgs } from '@jupyterlab/coreutils';
// import { ISignal } from '@lumino/signaling';
import { CodeCellModel } from '@jupyterlab/cells';

import { MosaicGroup } from './MosaicGroup';
import { WindowedList, WindowedListModel } from '@jupyterlab/ui-components';
import { IObservableList } from '@jupyterlab/observables';


type CellTree = {
    [key:string] : CellTree | Cell
}

type FlexDirection = 'row' | 'col';


export interface IMosaicViewModel {
    direction: FlexDirection,
    subGroups: {[key:string]: MosaicGroup},
    subTree: CellTree,
    subTreeOrder: Array<string>,
    notebook: Notebook
}



export class MosaicNotebookViewModel extends NotebookViewModel implements IMosaicViewModel {
//     // protected cellFromModel: WeakMap<ICellModel, Cell>;
//     // protected mosaicModel;
    subGroups: { [key: string]: MosaicGroup; };
    subTree: CellTree;
    subTreeOrder: Array<string>;
    direction: FlexDirection = 'col'; // default cell list is a column
    // subGroups: {[key:string]: MosaicGroup} = {};
    constructor(
        public notebook: Notebook,
        cells: Cell<ICellModel>[],
        options?: WindowedList.IModelOptions) {
        super(cells, options);
        this.subTree = {}
        this.subTreeOrder = [];
        this.subGroups = {}; 
        // this.cellFromModel = new WeakMap<ICellModel, Cell>();
    }

    static mosaicPlaceCell(self: IMosaicViewModel, cell: Cell): void {
        const path = cell.model.metadata.mosaic as Array<string>;
        let lastgroup = self.subTree;
        if (path && path.length > 0) {
            for (const groupID of path) {
                if (!lastgroup[groupID]) {
                    lastgroup[groupID] = {};
                    self.subTreeOrder.push(groupID);
                }
                lastgroup = lastgroup[groupID] as CellTree;
            }
        }
        lastgroup['cell-'+cell.model.id] = cell;
    }


    treeGet(mosaicpath: Array<string> ) {
        let tree: CellTree = this.subTree;
        for (const gID of mosaicpath) {
            const subtree = tree[gID];
            if (subtree) {
                tree = subtree as CellTree;
            }
            else {
                break;
            }
        }
        return tree;
    }

    onListChanged(list: IObservableList<Widget>, changes: IObservableList.IChangedArgs<Widget>): void {
        super.onListChanged(list, changes);

        switch (changes.type) {
            case "add":
                for (let i = changes.newIndex; i < changes.newIndex + changes.newValues.length; i++) {
                    MosaicNotebookViewModel.mosaicPlaceCell(this, this.cells[i] as Cell);
                }
                console.log('added cells to tree', this.subTree);
                break;
        }
    }

    widgetRenderer: (index: number) => Widget = MosaicViewModel.prototype._widgetRenderer.bind(this); // work around for "Class 'WindowedListModel' defines instance member property 'widgetRenderer', but extended class 'MosaicViewModel' defines it as instance member function."

    get widgetCount() {
        return Object.getOwnPropertyDescriptor(MosaicViewModel.prototype, 'widgetCount')?.get?.call(this);
    }

}


export class MosaicViewModel extends WindowedListModel implements IMosaicViewModel {
// function MosaicModel<T extends WindowedListModel>(Base: T) {
// return class extends Base {
    public subTreeOrder: Array<string>;
    public direction: FlexDirection; // flex-direction of the group (put cells in rows or columns)
    protected cellsEstimatedHeight = new Map<string, number>();
    subGroups: {[key:string]: MosaicGroup};

    constructor(
        public parent: IMosaicViewModel,
        public groupID: string,
        public notebook: Notebook
    ) {
        super({windowingActive:true}); // 
        this.direction = this.parent.direction == 'row' ? 'col' : 'row' // invert direction of parent
        this.subGroups = {};
        this.subTreeOrder = [];
    }


    get subTree(): CellTree {
        return this.parent.subTree[this.groupID] as CellTree;
    }

    get widgetCount() {
        return Object.keys(this.subTree).length;
    }


    indexOf(id: string) {
        return this.subTreeOrder.indexOf(id);
    }
    splice(startIndex: number, replaceCount: number, ...trees: Array<CellTree>) {
        this.subTreeOrder.splice(startIndex, replaceCount, ...Object.keys(trees));
        for (const [key, val] of Object.entries(trees)) { 
            this.subTree[key] = val;
        }
    }

    _widgetRenderer (index: number): Widget {
        const gID = this.subTreeOrder[index]
        const subItem = this.subTree[gID];
        if (gID.startsWith('cell-')) return subItem as Cell;
        if (!this.subGroups[gID]) {
            this.subGroups[gID] = new MosaicGroup(this, gID, this.notebook);
        }
        return this.subGroups[gID];
    }
    // widgetRenderer is defined as a property rather than a method on super, so must follow suit
    widgetRenderer: (index: number) => Widget = MosaicViewModel.prototype._widgetRenderer.bind(this);//(index: number) => MosaicViewModel._widgetRenderer(this, index); // work around for "Class 'WindowedListModel' defines instance member property 'widgetRenderer', but extended class 'MosaicViewModel' defines it as instance member function."

    estimateWidgetSize = (index: number): number => {
        const [id, cell] = Object.entries(this.subTree)[index];
        if (!cell) {
            // This should not happen, but if it does,
            // do not throw if cell was deleted in the meantime
            console.warn(
                `estimateWidgetSize requested for item ${index} in mosaic with only ${this.widgetCount} items`
            );
            return 0;
        }

        // if (this.direction == 'row') {
        //     return 0;
        // }


        if (cell instanceof Cell) {
            // original jupyterlab NotebookViewModel height estimation
            const model = cell.model;
            const height = this.cellsEstimatedHeight.get(model.id);
            if (typeof height === 'number') {
                return height;
            }

            const nLines = model.sharedModel.getSource().split('\n').length;
            let outputsLines = 0;
            if (model instanceof CodeCellModel && !model.isDisposed) {
                for (let outputIdx = 0; outputIdx < model.outputs.length; outputIdx++) {
                    const output = model.outputs.get(outputIdx);
                    const data = output.data['text/plain'];
                    if (typeof data === 'string') {
                        outputsLines += data.split('\n').length;
                    } else if (Array.isArray(data)) {
                        outputsLines += data.join('').split('\n').length;
                    }
                }
            }
            return (
                NotebookViewModel.DEFAULT_EDITOR_LINE_HEIGHT * (nLines + outputsLines) +
                NotebookViewModel.DEFAULT_CELL_MARGIN
            );
        } else { // sub cellgroup
            const height = this.cellsEstimatedHeight.get(id);
            if (typeof height === 'number') {
                return height;
            }
            
            const nb = this.subGroups[id];
            if (!nb) {
                return 0; // notebook hasn't loaded yet?
            }
            return nb.getEstimatedTotalSize();
        }
    }

    protected onListChanged(list: IObservableList<Widget>, changes: IObservableList.IChangedArgs<Widget>): void {
        console.warn('SUB LC!!', list, changes);
    }
}