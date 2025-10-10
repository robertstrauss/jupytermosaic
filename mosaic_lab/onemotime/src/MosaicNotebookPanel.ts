import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
// import { DocumentRegistry } from '@jupyterlab/docregistry';
// import { Cell } from '@jupyterlab/cells';
import { mosaicDrop } from './mosaicdrag';
// import { DocumentWidget } from '@jupyterlab/docregistry';

import { MosaicNotebookViewModel, MosaicViewModel } from './MosaicViewModel';
import { MosaicGroup } from './MosaicGroup';
MosaicViewModel;

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

            // Have to do this the monkey-patch-y way because of how the instantation of NotebookViewModel is hard-coded into StaticNotebook
            // patchNB._viewModel = new MosaicNotebookViewModel(patchNB, patchNB.cellsArray || ([] as Array<Cell>), {
            //     overscanCount:
            //         patchNB.overscanCount,
            //     windowingActive: patchNB._viewModel.windowingActive
            // });
            
            console.log('layout', patchNB._viewModel.layout);
            patchNB._viewModel.widgetRenderer = MosaicNotebookViewModel.prototype.widgetRenderer.bind(patchNB._viewModel);

            patchNB._viewModel.onListChanged = MosaicNotebookViewModel.prototype.onListChanged.bind(patchNB._viewModel);

            Object.defineProperty(patchNB._viewModel, 'widgetCount', {get:  () => {
                return Object.getOwnPropertyDescriptor(MosaicViewModel.prototype, 'widgetCount')?.get?.call(patchNB._viewModel)}
            });

            patchNB._viewModel.subTree = {};
            patchNB._viewModel.subTreeOrder = [];
            patchNB._viewModel.subGroups = {};
            patchNB._viewModel.notebook = patchNB; // inner mosaic groups need access to the notebook for rendering
            
            // patchNB.treeGet = MosaicGroup.prototype.treeGet.bind(patchNB);
            // patchNB._evtDrop = (e:any) => {mosaicDrop(patchNB, e)};

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
