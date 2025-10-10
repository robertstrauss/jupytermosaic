import { Notebook, NotebookPanel,  } from '@jupyterlab/notebook';
// import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ICellModel } from '@jupyterlab/cells';
// import { mosaicDrop } from './mosaicdrag';
// import { DocumentWidget } from '@jupyterlab/docregistry';

import { MosaicViewModel } from './MosaicViewModel';
import { Mosaic } from './MosaicGroup';

// export class MosaicNotebookPanel extends NotebookPanel {
//   constructor(options: DocumentWidget.IOptions<Notebook, INotebookModel>) {
//     super(options);
//     const notebook = options.content;
//     (notebook as any)._viewModel = new MosaicNotebookViewModel(notebook, notebook.model?.cells ? [], options);
//   }
// }

export namespace MosaicNotebookPanel {
    export class ContentFactory extends NotebookPanel.ContentFactory {
        createNotebook(options: Notebook.IOptions) {
            const patchNB = (super.createNotebook(options)) as any;

            const rootMosaic = new Mosaic({
                ...options,
                direction: 'col',
                notebook: patchNB,
            });

            if (patchNB.model && patchNB.model.cells) {
                for (const cell of patchNB.model.cells) {
                    rootMosaic.mosaicInsert(cell);
                }
                console.log('added initial cells');
            }

            console.log('init layout', patchNB.layout);
            const origAW = patchNB.layout.attachWidget;
            patchNB.layout.attachWidget = function(...args:any[]){
                console.warn('AW !', ...args);
                return origAW.call(patchNB.layout, ...args);
            }
            const origIW = patchNB.layout.insertWidget;
            patchNB.layout.inserWidget = function(...args:any[]){
                console.warn('IW !', ...args);
                return origIW.call(patchNB.layout, ...args);
            }


            const diffProps = (a:any, b:any) => {
                const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
                for (const key of allKeys) {
                    if (a[key] !== b[key]) {
                    console.log(`🔍 Property mismatch [${key}]:`, a[key], b[key]);
                    }
                }
                };

            // patch viewmodel to render mosaics
            const vm = patchNB._viewModel;
            vm.tiles = rootMosaic.tiles;
            vm.tileOrder = rootMosaic.tileOrder;
            Object.defineProperty(vm, 'widgetCount', {get: MosaicViewModel.prototype._getWidgetCount.bind(vm)});
            const origWR = vm.widgetRenderer;
            vm.widgetRenderer = (i:number) => {
                const theirs = (origWR(i));
                console.log('theirs', theirs);
                const mine = MosaicViewModel.prototype._widgetRenderer.bind(patchNB._viewModel)(i);
                console.log('ours', mine);
                console.log('eq?', theirs == mine, theirs === mine);
                // diffProps(theirs, mine);
                diffProps;
                return mine
            };
            
            console.log('renderer', vm, vm.widgetRenderer);
            console.log('count', vm.widgetCount);

            
            // (vm as NotebookViewModel).cells.changed.connect(() => {
            //     console.log('vm cell change!');
            // })
            // Notebook.prototype.model.cells
            // patchNB.cellsArray = new Proxy(patchNB.cellsArray, {
            //     set (target, p, newValue, receiver) {
            //         console.warn("WOOOAOHHH THERE COWBOY (notebook cA)");

            //         const ret = Reflect.set(target, p, newValue, receiver);
            //         // rootMosaic.mosaicInsert(newValue);
            //         return ret;
            //     },
            //     get(target, p, receiver) {
            //         return Reflect.get(target, p, receiver);
            //     },
            // })
            // vm.cells = patchNB.cellsArray;
            // vm.onListChanged = 
            const origInsert = patchNB._insertCell;
            patchNB._insertCell = (i: number, cmodel: ICellModel) => {
                // console.log('ic', i, cell, cell.model);
                origInsert.call(patchNB, i, cmodel);
                const cell = patchNB.cellsArray[i];
                rootMosaic.mosaicInsert(cell);
            }
            const origRemove = patchNB._removeCell;
            patchNB._removeCell = (i: number, cmodel: ICellModel) => {
                origRemove.call(patchNB, i, cmodel);
                const cell = patchNB.cellsArray[i];
                const stem = rootMosaic.treeGet(cell.model.metadata.mosaic) as Mosaic;
                stem.splice(stem.indexOf(cell.model.id), 1);
            }
            // patchNB.modelChanged.connect((...args:any[]) => {
            //     if (patchNB.model) {
            //         console.log('model ready', patchNB, patchNB.layout);
            //         patchNB.model.cells.changed.connect(
            // (list:any, change:any) => {
            //             console.log('cells!', change);
            //             switch (change.type) {
            //                 case "add":
            //                     for (let ix = change.newIndex; ix < change.newIndex+change.newValues.length; ix++) {
            //                         console.log('inserting', ix, vm.cells[ix])
            //                         rootMosaic.mosaicInsert(vm.cells[ix]);
            //                         console.log(ix, 'size', vm.estimateWidgetSize(ix));
            //                         vm.cells = new Proxy(vm.cells, {get: (target, prop, reciever) => {
            //                             // console.log('cells getting', target, prop, reciever);
            //                             return Reflect.get(target, prop, reciever);
            //                         }, set: (target, p, newValue, receiver) => {
            //                             console.warn('set', target, p, newValue, receiver);
            //                             return false;
            //                         },
            //                         });
            //                         patchNB._viewModel = new Proxy(patchNB._viewModel, {
            //                             set: (target, p, newValue, receiver) => {
            //                                 if (p == 'cells') {
            //                                     console.warn("WOOOAOHHH THERE COWBOY");
            //                                 }
            //                                 return Reflect.set(target, p, newValue, receiver);
            //                             },
            //                         })
            //                         // Object.defineProperty(vm.cells, ix, {get: () => {
            //                         //     console.warn('cell', ix, 'got');
            //                         // }})
            //                         // Object.defineProperty(vm.cells[ix], 'placeHolder', {set: (...args:any[]) =>{
            //                         //     console.warn('cell', ix, 'placeholder set to ', ...args);
            //                         // }})
            //                     }
            //                     // patchNB.update()
            //                     console.log('count', vm.widgetCount, 'r2r', vm.getRangeToRender());
            //             }
            //         });
            //     }
            // }); 

            return patchNB;
        }
    }
}



// export class MosaicStaticNotebook extends WindowedList<MosaicNotebookViewModel> {
//   constructor(options: StaticNotebook.IOptions) {
//     // Inject your own view model here
//     const viewModel = new MosaicViewModel(cells, {
//       overscanCount:
//         options.notebookConfig?.overscanCount ??
//         StaticNotebook.defaultNotebookConfig.overscanCount,
//       windowingActive
//     });
//     const cells = new Array<Cell>();
//     const windowingActive =
//       (options.notebookConfig?.windowingMode ??
//         StaticNotebook.defaultNotebookConfig.windowingMode) === 'full';
//     super({
//       model: new MosaicNotebookViewModel(cells, {
//         overscanCount:
//           options.notebookConfig?.overscanCount ??
//           StaticNotebook.defaultNotebookConfig.overscanCount,
//         windowingActive
//       }),
//       layout: new NotebookWindowedLayout(),
//       renderer: options.renderer ?? WindowedList.defaultRenderer,
//       scrollbar: false
//     });

//     this.addClass(NB_CLASS);
//     this.cellsArray = cells;

//     this._idleCallBack = null;

//     this._editorConfig = StaticNotebook.defaultEditorConfig;
//     this._notebookConfig = StaticNotebook.defaultNotebookConfig;
//     this._mimetype = IEditorMimeTypeService.defaultMimeType;
//     this._notebookModel = null;
//     this._modelChanged = new Signal<this, void>(this);
//     this._modelContentChanged = new Signal<this, void>(this);

//     this.node.dataset[KERNEL_USER] = 'true';
//     this.node.dataset[UNDOER] = 'true';
//     this.node.dataset[CODE_RUNNER] = 'true';
//     this.rendermime = options.rendermime;
//     this.translator = options.translator || nullTranslator;
//     this.contentFactory = options.contentFactory;
//     this.editorConfig =
//       options.editorConfig || StaticNotebook.defaultEditorConfig;
//     this.notebookConfig =
//       options.notebookConfig || StaticNotebook.defaultNotebookConfig;
//     this._updateNotebookConfig();
//     this._mimetypeService = options.mimeTypeService;
//     this.renderingLayout = options.notebookConfig?.renderingLayout;
//     this.kernelHistory = options.kernelHistory;
//   }
// }
