import { Notebook, NotebookPanel,  } from '@jupyterlab/notebook';
// import { DocumentRegistry } from '@jupyterlab/docregistry';
// import { ICellModel } from '@jupyterlab/cells';
import { mosaicDrop, mosaicDragOver } from './mosaicdrag';
// import { DocumentWidget } from '@jupyterlab/docregistry';

// import { MosaicViewModel } from './MosaicViewModel';
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
            

            const rootMosaic = new Mosaic({path:[], splice: ()=>{}, indexOf: ()=>{}, tiles: []} as any, 'root', {
                ...options,
                direction: 'col',
                notebook: patchNB,
            });

            /*
            patchNB.cellsArray = new Proxy([] as Array<any>, {
                set(target, p, newValue, receiver) {
                    // console.warn('Fuck you.', target, p, newValue, receiver);
                    // for (let i = 0; i < patchNB.viewModel.widgetCount; i++) {

                    // }
                    if (p == 'length') {
                        console.log('current length', Reflect.get(target, p), 'new set', newValue);
                        return Reflect.set(target, p, newValue, receiver);
                    }
                    return Reflect.set(target, p, new Proxy(newValue, {
                        set(target, p, newValue, receiver) {
                            if (p == 'model' || p == '_model') {
                                console.error('WHO TOLD YOU TO TAKE MY MODEL??', p, newValue);
                            }
                            return Reflect.set(target, p, newValue, receiver);
                        },
                    }), receiver);
                },
            })*/

            if (patchNB.model && patchNB.model.cells) {
                for (const cell of patchNB.model.cells) {
                    rootMosaic.mosaicInsert(cell);
                }
                console.log('added initial cells');
            }

            const mvm = (rootMosaic as any).viewModel;
            // patch viewmodel to render mosaics
            const vm = patchNB._viewModel;
            // vm.tiles = rootMosaic.tiles;
            // vm.tileOrder = rootMosaic.tileOrder;
            Object.defineProperty(vm, 'widgetCount', {get: mvm._getWidgetCount.bind(mvm)});
            vm.estimateWidgetSize = mvm._estimateWidgetSize.bind(mvm);
            vm.widgetRenderer = mvm._widgetRenderer.bind(mvm);
            
            
            // const origInsert = patchNB._insertCell;
            // patchNB._insertCell = (i: number, cmodel: ICellModel) => { origInsert.call(patchNB, i, cmodel); const cell = patchNB.cellsArray[i];
            const origInsert = patchNB.onCellInserted;
            patchNB.onCellInserted = (i:number, cell: any) => { //const cmodel = cell.model;
                origInsert.call(patchNB, i, cell);
                

                console.log('ic', i, cell);
                
                // console.log(patchNB.cellsArray[i].isDisposed, patchNB.cellsArray[i].model.id)

                rootMosaic.mosaicInsert(cell);
                
                // console.log(patchNB.cellsArray.map((w:any) => w.dataset.windowedListIndex))
                // console.log(patchNB.layout.widgets.map((w:any) => w.dataset.windowedListIndex))

                console.log(rootMosaic.tiles);
                // rootMosaic.forEachLeaf(([mosaic, id]:[Mosaic, string], i:number) => {
                //     const cell = (mosaic.tiles.key(id) as any);
                //     console.log(cell.node, cell.node?.dataset?.windowedListIndex, cell.model?.id);
                // })
                // console.log(rootMosaic.tiles);
                // for (let i = 0; i < vm.widgetCount; i++) {
                //     const widg = vm.widgetRenderer(i)
                //     console.log(i, (widg as any).model?.id || widg.groupID);
                //     if (widg instanceof Mosaic) {
                //         console.log('cells:', Object.values(widg.tiles).map(c=>(c as any).model?.id));
                //     }
                // }
            }

            // const origIB = patchNB.viewportNode.insertBefore;
            // patchNB.viewportNode.insertBefore = (node1: HTMLElement, node2: HTMLElement) => {
            //     console.log('IB', node1.dataset.windowedListIndex, node2.dataset.windowedListIndex);
            //     origIB.call(patchNB.viewportNode, node1, node2);
            // }

            // const origRemove = patchNB._removeCell;
            // patchNB._removeCell = (i: number) => { origRemove.call(patchNB, i);
            const origRemove = patchNB.onCellRemoved;
            patchNB.onCellRemoved = (i: number, cell: any) => {
                origRemove.call(patchNB, i, cell);
            //     // const cell = patchNB.cellsArray[i];
                console.log('rc', i);// cell.model.id, cell.isDisposed);
                // const [found, leafIx] = rootMosaic.getLeaf(i);

            //     // const [found, _] = rootMosaic.getLeaf(i);
            //     // if (found !== null) {
            //     //     found[0].spli
            //     // }
            }

            patchNB.rootMosaic = rootMosaic;
            patchNB._evtDrop = (e:any) => mosaicDrop(patchNB, e);
            patchNB._evtDragOver = (e:any) => mosaicDragOver(patchNB, e);


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
