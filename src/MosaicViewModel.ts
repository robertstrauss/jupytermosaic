import { NotebookViewModel } from '@jupyterlab/notebook';
import { Cell, CodeCellModel } from '@jupyterlab/cells';
import { WindowedList } from '@jupyterlab/ui-components'
// import { IObservableList } from '@jupyterlab/observables';
import { Widget } from '@lumino/widgets';
// import { IChangedArgs } from '@jupyterlab/coreutils';
// import { ISignal } from '@lumino/signaling';
// import { CodeCellModel } from '@jupyterlab/cells';
import { Debouncer } from '@lumino/polling';

import type { Mosaic, Tile } from './MosaicGroup';
import { WindowedListModel } from '@jupyterlab/ui-components';
// import { IObservableList } from '@jupyterlab/observables';

// NotebookViewModel.prototype.itemsList

export class MosaicViewModel extends WindowedListModel {
    // protected cellsEstimatedHeight = new Map<string, number>();
    protected tilesEstimatedSize = new Map<string, number>();
    private _emitEstimatedSizeChanged = new Debouncer(() => {
    this._stateChanged.emit({
        name: 'estimatedWidgetSize',
        newValue: null,
        oldValue: null
        });
    });
    // protected cells: Array<Tile>;

    constructor(
        public tiles: Array<Tile>,
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
        return (this.tiles[index] as Cell)
    }
    // widgetRenderer is defined as a property rather than a method on super, so must follow suit
    widgetRenderer: (index: number) => Widget = MosaicViewModel.prototype._widgetRenderer.bind(this);//(index: number) => MosaicViewModel._widgetRenderer(this, index); // work around for "Class 'WindowedListModel' defines instance member property 'widgetRenderer', but extended class 'MosaicViewModel' defines it as instance member function."

    estimateWidgetSize: (index: number) => number = MosaicViewModel.prototype._estimateWidgetSize.bind(this);
    _estimateWidgetSize (index: number): number {
        const cell = this.tiles[index];
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
            const height = this.tilesEstimatedSize.get(model.id);
            // const height = 39;
            if (typeof height === 'number') {
            //     // console.log('cell height', id, height);
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

            const height = this.tilesEstimatedSize.get(tile.groupID);
            if (typeof height === 'number') {
                return height;
            }

            return tile.getEstimatedTotalSize();
        }
    }

    // getRangeToRender(): WindowedList.WindowIndex | null {
    //     const r2r = super.getRangeToRender();
    //     console.log("R2R", r2r);

    //     const wc = this.widgetCount;
    //     console.log('artificial', wc-1);
    //     return [0, wc-1, 0, wc-1]//r2r;
    // }


    setEstimatedWidgetSize(cellId: string, size: number | null): void {
    if (size === null) {
      if (this.tilesEstimatedSize.has(cellId)) {
        this.tilesEstimatedSize.delete(cellId);
      }
    } else {
      this.tilesEstimatedSize.set(cellId, size);
      this._emitEstimatedSizeChanged.invoke().catch(error => {
        console.error(
          'Fail to trigger an update following a estimated height update.',
          error
        );
      });
    }
  }
}