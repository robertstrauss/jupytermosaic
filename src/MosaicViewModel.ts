import { NotebookViewModel } from '@jupyterlab/notebook';
import { Cell, CodeCellModel } from '@jupyterlab/cells';
import { WindowedList } from '@jupyterlab/ui-components'
// import { IObservableList } from '@jupyterlab/observables';
import { Widget } from '@lumino/widgets';
// import { IChangedArgs } from '@jupyterlab/coreutils';
// import { ISignal } from '@lumino/signaling';
// import { CodeCellModel } from '@jupyterlab/cells';

import type {  Mosaic, orderedMap, Tile } from './MosaicGroup';
import { WindowedListModel } from '@jupyterlab/ui-components';
// import { IObservableList } from '@jupyterlab/observables';

// NotebookViewModel.prototype.itemsList

export class MosaicViewModel extends WindowedListModel {
    protected cellsEstimatedHeight = new Map<string, number>();

    constructor(
        public tiles: orderedMap<string, Tile>,
        options?: WindowedList.IModelOptions
    ) {
        super(options);
    }

    _getWidgetCount(): number {
        return this.tiles.length;
    }
    get widgetCount() {
        return this._getWidgetCount();
    }

    _widgetRenderer (index: number): Widget {
        return (this.tiles.index(index) as Cell) || console.error('IM FUCKING STUPD!!!!!!! DUH DUHM CODE', this.tiles.index(index))
    }
    // widgetRenderer is defined as a property rather than a method on super, so must follow suit
    widgetRenderer: (index: number) => Widget = MosaicViewModel.prototype._widgetRenderer.bind(this);//(index: number) => MosaicViewModel._widgetRenderer(this, index); // work around for "Class 'WindowedListModel' defines instance member property 'widgetRenderer', but extended class 'MosaicViewModel' defines it as instance member function."

    estimateWidgetSize: (index: number) => number = MosaicViewModel.prototype._estimateWidgetSize.bind(this);
    _estimateWidgetSize (index: number): number {
        const cell = this.tiles.index(index);
        if (!cell) {
            // This should not happen, but if it does,
            // do not throw if cell was deleted in the meantime
            console.warn(
                `estimateWidgetSize requested for item ${index} in mosaic with only ${this.widgetCount} items`
            );
            return 0;
        }

        if (cell instanceof Cell) {
            // original jupyterlab NotebookViewModel height estimation
            const model = cell.model;
            try {
                const height = this.cellsEstimatedHeight.get(model.id); height;
            } catch {
                console.warn('problem getting height');
                console.log(index, this.tiles.keyOf(index), model, cell.isDisposed)
                // console.log(id, cell.model, (this as any).cells, (this as any).cells)
            }
            const height = 39;
            if (typeof height === 'number') {
                // console.log('cell height', id, height);
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
        } else { // sub mosaic
            const tile = cell as Mosaic;

            const height = this.cellsEstimatedHeight.get(tile.groupID);
            if (typeof height === 'number') {
                return height;
            }

            return tile.getEstimatedTotalSize();
        }
    }
}