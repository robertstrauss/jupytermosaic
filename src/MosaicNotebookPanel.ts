import { Notebook, NotebookPanel,  } from '@jupyterlab/notebook';
// import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ICellModel } from '@jupyterlab/cells';
import { mosaicDrop, mosaicDragOver } from './mosaicdrag';
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
            

            const rootMosaic = new Mosaic({path:[]} as any, 'root', {
                ...options,
                direction: 'col',
                notebook: patchNB,
            });

            patchNB.cellsArray = new Proxy([] as Array<any>, {
                set(target, p, newValue, receiver) {
                    console.warn('Fuck you.', target, p, newValue, receiver);
                    // for (let i = 0; i < patchNB.viewModel.widgetCount; i++) {

                    // }
                    return Reflect.set(target, p, newValue, receiver);
                },
            })

            if (patchNB.model && patchNB.model.cells) {
                for (const cell of patchNB.model.cells) {
                    rootMosaic.mosaicInsert(cell);
                }
                console.log('added initial cells');
            }


            // patch viewmodel to render mosaics
            const vm = patchNB._viewModel;
            vm.tiles = rootMosaic.tiles;
            // vm.tileOrder = rootMosaic.tileOrder;
            Object.defineProperty(vm, 'widgetCount', {get: MosaicViewModel.prototype._getWidgetCount.bind(vm)});
            vm.widgetRenderer = MosaicViewModel.prototype._widgetRenderer.bind(patchNB._viewModel);
            vm.estimateWidgetSize = MosaicViewModel.prototype._estimateWidgetSize.bind(patchNB._viewModel);
            
            
            const origInsert = patchNB._insertCell;
            patchNB._insertCell = (i: number, cmodel: ICellModel) => {
                
                // console.log(rootMosaic.tiles);
                console.log('ic', i, cmodel.id, cmodel.metadata.mosaic);
                
                origInsert.call(patchNB, i, cmodel);
                const cell = patchNB.cellsArray[i];

                rootMosaic.mosaicInsert(cell);
                // console.log(rootMosaic.tiles);
                // for (let i = 0; i < vm.widgetCount; i++) {
                //     const widg = vm.widgetRenderer(i)
                //     console.log(i, (widg as any).model?.id || widg.groupID);
                //     if (widg instanceof Mosaic) {
                //         console.log('cells:', Object.values(widg.tiles).map(c=>(c as any).model?.id));
                //     }
                // }
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
