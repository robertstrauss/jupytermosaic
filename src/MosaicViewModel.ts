import { NotebookViewModel } from '@jupyterlab/notebook';
import { Cell, CodeCellModel } from '@jupyterlab/cells';
import { WindowedList } from '@jupyterlab/ui-components'
import { Widget } from '@lumino/widgets';
// import { IObservableList } from '@jupyterlab/observables';

import type { FlexDirection, Tile } from './MosaicGroup';
import { IObservableList } from '@jupyterlab/observables';


export class MosaicViewModel extends NotebookViewModel {//WindowedListModel {
    static CELL_MIN_WIDTH = 50;
    // protected cellsEstimatedHeight = new Map<string, number>();
    protected tilesEstimatedWidth = new Map<string, number>();
    protected tilesEstimatedHeight = new Map<string, number>();
    protected _widgetSizersRow: WindowedList.ItemMetadata[] = [];
    protected _widgetSizersCol: WindowedList.ItemMetadata[] = [];

    // protected _modelList: NestedObservableList<ICellModel>;
    // private _emitEstimatedSizeChanged = new Debouncer(() => {
    // this._stateChanged.emit({
    //     name: 'estimatedWidgetSize',
    //     newValue: null,
    //     oldValue: null
    //     });
    // });
    // protected cells: Array<Tile>;

    constructor(
        public tiles: Array<Tile>,
        public direction: FlexDirection,
        options?: WindowedList.IModelOptions
    ) {
        super([], options);
        // overload private properties
        Object.defineProperty(this, '_widgetSizers', {
            get() {
                // console.warn('default widg sizer requested');
                if (this.direction == 'row') return this._widgetSizersRow;
                if (this.direction == 'col') return this._widgetSizersCol;
            }
        });
        (this as any)._getItemMetadata = this.getItemMetadata;
    }

    public onListChanged(list: IObservableList<Widget>, changes: IObservableList.IChangedArgs<Widget>): void {
        super.onListChanged(list, changes);
    }

    _getWidgetCount(): number {
        return this.tiles.length;
    }
    get widgetCount() {
        return this._getWidgetCount();
    }

    _widgetRenderer (index: number): Widget {
        return (this.tiles[index])
    }
    // widgetRenderer is defined as a property rather than a method on super, so must follow suit
    widgetRenderer: (index: number) => Widget = MosaicViewModel.prototype._widgetRenderer.bind(this);//(index: number) => MosaicViewModel._widgetRenderer(this, index); // work around for "Class 'WindowedListModel' defines instance member property 'widgetRenderer', but extended class 'MosaicViewModel' defines it as instance member function."

    get widgetSizers() {
        return (this as any)._widgetSizers;
    }
    setWidgetSize(sizes: { index: number; size: number; }[], dim: 'row' | 'col' | 'mode' = 'mode'): boolean {
        if (dim == 'mode') dim = this.direction;

        // just use the same code as super, but with a different widgetSizers list based on dim
        return super.setWidgetSize.bind(new Proxy(this, {
            get(target, p, receiver) {
                if (p == '_widgetSizers') return (dim == 'row' ? target._widgetSizersRow : target._widgetSizersCol)
                
                return Reflect.get(target, p, receiver);
            },
        }))(sizes);
    }
    estimateWidgetSize: (index: number) => number = MosaicViewModel.prototype._estimateWidgetSize.bind(this);
    _estimateWidgetSize (index: number): number {

        // this.parent.index
        const tile = this.tiles[index];
        if (!tile) {
            // This should not happen, but if it does,
            // do not throw if tile was deleted in the meantime
            console.warn(
                `estimateWidgetSize requested for item ${index} in mosaic with only ${this.widgetCount} items`
            );
            return 0;
        }

        if (this.direction == 'row') {
            return this.estimateWidgetWidth(index);
        } else { // column mode, want height rather than width
            return this.estimateWidgetHeight(index);
        }
    }
    estimateWidgetHeight(index:number): number {
        const tile = this.tiles[index];
        if (tile instanceof Cell) {
            // return NotebookViewModel.prototype.estimateWidgetSize.bind({
            //         cells: {[index]: tile},
            //         cellsEstimateSize: this.tilesEstimatedHeight}
            //     )(index);
            // original jupyterlab NotebookViewModel height estimation
            const model = tile.model;
            const height = this.tilesEstimatedHeight.get(model.id);
            // const height = 39;
            if (typeof height === 'number') {
            //     // console.log('tile height', id, height);
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
            const height = this.tilesEstimatedHeight.get(tile.groupID);
            // console.log('mosaic est height', height);
            if (typeof height === 'number') {
                return height;
            }

            // console.log('est total', tile.getEstimatedTotalHeight());
            return tile.getEstimatedTotalHeight();
        }
    }
    estimateWidgetWidth(index:number): number {
        const tile = this.tiles[index];
        if (tile instanceof Cell) {
            return MosaicViewModel.CELL_MIN_WIDTH;
        } else {
            const width = this.tilesEstimatedWidth.get(tile.groupID);
            if (typeof width == 'number') {
                return width;
            }

            return tile.getEstimatedTotalWidth();
        }
    }

    set measuredAllUntilIndex(val: number) {
        (this as any)._measuredAllUntilIndex = val;
    }

    getEstimatedTotalSize(dim: 'row' | 'col' | 'mode' = 'mode'): number { // based on @jupyterlab/ui-components/windowedlist.ts:279
        if (dim == 'mode') dim = this.direction;
        const widgetSizers = (dim == 'row' ? this._widgetSizersRow : this._widgetSizersCol);

        let totalSizeOfInitialItems = 0;

        if (this.measuredAllUntilIndex >= this.widgetCount) {
            this.measuredAllUntilIndex = this.widgetCount - 1;
        }

        // These items are all measured already
        if (this.measuredAllUntilIndex >= 0) {
            const itemMetadata = widgetSizers[this.measuredAllUntilIndex];
            totalSizeOfInitialItems = itemMetadata.offset + itemMetadata.size;
        }

        // These items might have measurements, but some will be missing
        let totalSizeOfRemainingItems = 0;
        for (let i = this.measuredAllUntilIndex + 1; i < this.widgetCount; i++) {
            const sizer = widgetSizers[i];
            totalSizeOfRemainingItems += sizer?.measured
                ? sizer.size
                : this.estimateWidgetSize(i);
        }

        return totalSizeOfInitialItems + totalSizeOfRemainingItems;
    }
    getEstimatedTotalHeight(): number {
        if (this.direction == 'col') {
            return this.getEstimatedTotalSize('col');
        }
        // total height of a row is really max height of elements
        let maxSize = 0;
        for (let i = 0; i < this.widgetCount; i++) {
            const sizer = this._widgetSizersCol[i];
            // console.log('row el height', sizer, this.estimateWidgetHeight(i), this.widgetRenderer(i));
            maxSize = Math.max(maxSize, sizer?.measured
                ? sizer.size
                : this.estimateWidgetHeight(i));
        }

        return maxSize;
    }
    getEstimatedTotalWidth(): number {
        if (this.direction == 'row') {
            return this.getEstimatedTotalSize('row');
        }
        
        // total width of a column is really max width of elements
        let maxSize = 0;
        for (let i = 0; i < this.widgetCount; i++) {
            const sizer = this._widgetSizersRow[i]; // row for width measurments
            maxSize = Math.max(maxSize, sizer?.measured
                ? sizer.size
                : this.estimateWidgetWidth(i));
        }

        return maxSize;
    }
    

    get measuredAllUntilIndex(): number {
        // let me use their private field
        return -1;//(this as any)._measuredAllUntilIndex as number;
    }

    
    private getItemMetadata(index: number): WindowedList.ItemMetadata {

        for (const mode of ['row', 'col']) {
            const widgetSizers = {'row': this._widgetSizersRow, 'col':this._widgetSizersCol}[mode]!;
            
            if (index > this.measuredAllUntilIndex) {
                let offset = 0;
                if (this.measuredAllUntilIndex >= 0) {
                    const itemMetadata = widgetSizers[this.measuredAllUntilIndex];
                    offset = itemMetadata.offset + itemMetadata.size;
                }

                for (let i = this.measuredAllUntilIndex + 1; i <= index; i++) {
                    let size: number;
                    let measured = false;

                    if (widgetSizers[i]?.measured) {
                        size = widgetSizers[i].size;
                        measured = true;
                    } else {
                        const widget = this.widgetRenderer(i);
                        if (widget?.node && widget.node.isConnected) {
                            const rect = widget.node.getBoundingClientRect();
                            size = (mode == 'row' ? rect.width : rect.height);
                            measured = true;
                        } else {
                            size = (mode == 'row' ? 
                                            this.estimateWidgetWidth(i)
                                        :   this.estimateWidgetHeight(i));
                            measured = false;
                        }
                        // console.log(this.direction, 'measured', mode, i, widget, size)
                    }

                    widgetSizers[i] = { offset, size, measured };
                    offset += size;
                }
                // Because the loop above updates estimated sizes,
                // we need to fix (heal) offsets of the remaining items.
                for (let i = index + 1; i < widgetSizers.length; i++) {
                    const sizer = widgetSizers[i];
                    const previous = widgetSizers[i - 1];
                    sizer.offset = previous.offset + previous.size;
                }
            }
            

            for (let i = 0; i <= this.measuredAllUntilIndex; i++) {
                const sizer = widgetSizers[i];
                if (i === 0) {
                    if (sizer.offset !== 0) {
                        throw new Error('First offset is not null');
                    }
                } else {
                    const previous = widgetSizers[i - 1];
                    if (sizer.offset !== previous.offset + previous.size) {
                        throw new Error(`Sizer ${i} has incorrect offset.`);
                    }
                }
            }
        }

        return this.direction == 'row' ? this._widgetSizersRow[index] : this._widgetSizersCol[index];
    }

    getRangeToRender(): WindowedList.WindowIndex | null {
        // const r2r = super.getRangeToRender();
        // console.log("R2R", r2r);

        const wc = this.widgetCount;
        // console.log('artificial', wc-1);
        return [0, wc-1, 0, wc-1]//r2r;
    }

}