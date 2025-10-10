import '../style/mosaic.css';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  IRouter
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { NotebookWidgetFactory, INotebookWidgetFactory, INotebookTracker, INotebookModel, ToolbarItems } from '@jupyterlab/notebook'

// import { MosaicNotebookViewModel, MosaicViewModel } from './MosaicViewModel';
import { MosaicNotebookPanel } from './MosaicNotebookPanel';
// import { MosaicGroup } from './MosaicGroup';

// import { ToolbarItems } from '@jupyterlab/notebook';
import { Dialog, IToolbarWidgetRegistry, WidgetTracker, createToolbarFactory, showDialog } from '@jupyterlab/apputils';
createToolbarFactory;

import { NotebookPanel, NotebookModelFactory } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
// import { Doc } from 'yjs';
// import { Cell } from '@jupyterlab/cells';

// import { Contents } from '@jupyterlab/services';
import { ILauncher } from '@jupyterlab/launcher';

import * as Y from 'yjs';

const PLUGIN_ID = 'mosaic-lab:plugin';
const MOSAIC_FACTORY = 'Mosaic Notebook';


class MosaicModelFactory extends NotebookModelFactory {
  createNew(options: any) {
    console.log('MM create opts:', options);
    return super.createNew(options);
  }
  get name(): string {
    return 'mosaic-notebook';
  }
}

/**
 * Initialization data for the mosaic-lab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
  autoStart: true,
  requires: [INotebookTracker, ILauncher, IRouter, INotebookWidgetFactory, IRenderMimeRegistry, IEditorServices, ISettingRegistry, IToolbarWidgetRegistry],
  optional: [],
  activate: async (app: JupyterFrontEnd, tracker:INotebookTracker,  launcher: ILauncher, router: IRouter, nbfactory: NotebookWidgetFactory, rendermime: IRenderMimeRegistry, editorServices: IEditorServices,
            settingRegistry: ISettingRegistry, toolbarRegistry: IToolbarWidgetRegistry) => {
    console.log('JupyterLab extension mosaic-lab is activated!');
    // const settings = await settingRegistry.load('mosaic-lab:plugin');

    // app.docRegistry.addWidgetExtension('Notebook', {
    //   createNew: (panel:NotebookPanel, context:DocumentRegistry.IContext<DocumentRegistry.IModel>) => {
    //     // if (settings.get('enableMosaic')) {
    //       const patchNB = (panel.content) as any;
    //       // Have to do this the monkey-patch-y way because of how the instantation of NotebookViewModel is hard-coded into StaticNotebook
    //       // patchNB._viewModel = new MosaicNotebookViewModel(patchNB, patchNB.cellsArray || ([] as Array<Cell>), {
    //       //     overscanCount: patchNB.overscanCount,
    //       //     windowingActive: patchNB._viewModel.windowingActive
    //       // }); 

    //       patchNB._viewModel.widgetRenderer = (index:number) => MosaicViewModel._widgetRenderer(patchNB._viewModel, index);

    //       patchNB._viewModel.itemsList.changed.connect(MosaicNotebookViewModel.prototype.onListChanged.bind(patchNB._viewModel));

    //       Object.defineProperty(patchNB._viewModel, 'widgetCount', {get:  () => {
    //         return Object.getOwnPropertyDescriptor(MosaicViewModel.prototype, 'widgetCount')?.get?.call(patchNB._viewModel)}
    //       });

    //       patchNB._viewModel.subTree = {};
    //       patchNB._viewModel.subGroups = {};
    //     // }
    //     return panel;
    //   }
    // })


    const defaultNotebookFactory = app.docRegistry.getWidgetFactory('Notebook') as NotebookWidgetFactory;

    // make vanilla notebooks not the default
    (defaultNotebookFactory as any)._defaultFor = [];


    function clobberCheck(
      // mf: Contents.ISharedFactory | null){
      sender: DocumentRegistry.IWidgetFactory<any, any>, panel: NotebookPanel) {
      // console.log('clb chekr', mf);
      // if (mf == null) {return}
      // const create = mf.createNew;
      // console.warn("HEY!");
      // mf.createNew = (options: Contents.ISharedFactoryOptions) => {
        // console.log('create SM opts', options);
        // const fpath = options.path;
        const fpath = panel.context.path;
        const other = tracker.find((otherPanel: NotebookPanel) => (otherPanel.context.path == fpath));
        // console.log('path', fpath, other);
        if (other !== undefined) {
          // console.log('both!', other.model!.sharedModel, panel.model!.sharedModel);
          // console.log('eq?', other.model!.sharedModel == panel.model!.sharedModel, other.model!.sharedModel===panel.model!.sharedModel);
          // panel._model = {..panel.model, other.model!.sharedModel;

          // console.log('eq now?', other.model!.sharedModel == panel.model!.sharedModel, other.model!.sharedModel===panel.model!.sharedModel);
          // return;
          // if (other.model!.sharedModel == undefined || panel.model!.sharedModel == undefined) {
            // asynchronously warn user
            // const sm1 = panel.model!.sharedModel as any;
            // const sm2 = other.model!.sharedModel as any;
            // console.log('Y eq?', sm1.ydoc == sm2.ydoc);
            // (sm1 as any)._ydoc = (sm2 as any).ydoc;
            // console.log('Y eq now?', sm1.ydoc == sm2.ydoc);

            // sm1.changed.connect((sender, args) => {(()=>{})();
              // console.log('sA1', sender, args, sender==sm1, sender==sm2);
            //   // if (sender !== sm1) {
              // (sm2.changed as any).emit(args)
              // }
            // });
            // sm2.changed.connect((sender, args) => {
            //   console.log('SA2', sender, args, sender==sm1, sender==sm2);
            // //   // if (sender !== sm2) {
            // //   // (sm1.changed as any).emit(args)
            //   // }
            // });
            // Y;;
            // const doc1 = (sm1 as any).ydoc as Y.Doc;
            // const doc2 = (sm2 as any).ydoc as Y.Doc;

            // console.log('linking editors for synchronization...');
            // doc1.on('update', upd => {
            //   console.log("UPDATE 1");
            //   Y.applyUpdate(doc2, upd);
            //   // (sm2.changed as any).emit({source: 'other ediotor', changes: {}});
            //   // (sm1.changed as any).emit({source: 'other ediotor', changes: {}});
            //   (panel.model!.contentChanged as any).emit(void 0);
            //   // console.log(sm2, doc2, upd);
            // });
            // doc2.on('update', upd => {
            //   console.log("UPDATE 2");
            //   Y.applyUpdate(doc1, upd);
            // });
            // console.log('success');
            // Dialog; showDialog;
            (async () => {
              const prompt = await showDialog({
              title: 'Editor Conflict (Mosaic)',
              body: 'This notebook is already open in another editor. Please close it before opening in a different mode.', // or enable collaboration
              buttons: [Dialog.cancelButton({label: 'Cancel'})]//, Dialog.okButton({label: 'Enable Collaboration in Settings'})]
            });
            prompt; Y;
            // if (prompt.button.accept) {
            //   router.navigate('/settings/@jupyterlab/docmanager-extension:plugin');
            // }
          })();

          // const sm = create(options);
          // console.log('SM',sm);
          // return sm;
          panel.close();
          // } else {
          //   panel.model!.sharedModel = other.model!.sharedModel;
          // }
        }

        // return panel;
      // }
    }


    const mosaicModelFactory = new MosaicModelFactory({ disableDocumentWideUndoRedo: false });
    app.docRegistry.addModelFactory(mosaicModelFactory);

    // addClobberChecker(app.serviceManager.contents.getSharedModelFactory('notebook'))
    // addClobberChecker(app.serviceManager.contents.getSharedModelFactory('mosaic-notebook'));

    const mosaicWidgetFactory = (new NotebookWidgetFactory({
      name: MOSAIC_FACTORY,
      fileTypes: ['notebook'],
      defaultFor: ['notebook'],
      modelName: 'mosaic-notebook', //mosaic-
      preferKernel: true,
      canStartKernel: true,
      rendermime: defaultNotebookFactory.rendermime,
      mimeTypeService: defaultNotebookFactory.mimeTypeService,
      contentFactory: new MosaicNotebookPanel.ContentFactory({
          editorFactory: editorServices.factoryService.newInlineEditor
        })
    }));
    mosaicWidgetFactory.widgetCreated.connect(clobberCheck);
    defaultNotebookFactory.widgetCreated.connect(clobberCheck);
    app.docRegistry.addWidgetFactory(mosaicWidgetFactory);


    const defaultNotebookToolbar: DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> = {
      createNew: (panel: NotebookPanel) => {
        (tracker as unknown as WidgetTracker<NotebookPanel>).add(panel);
        ToolbarItems;
        // const factory = createToolbarFactory(
        //                   // app.docRegistry.getWidgetFactory()
        //                   // ToolbarItems.getDefaultItems,
        //                   toolbarRegistry,
        //                   settingRegistry,
        //                   'Notebook',
        //                   '@jupyterlab/notebook-extension:panel',
        //                   // PLUGIN_ID,
        //                   defaultNotebookFactory.translator,
        //                   'toolbar'
        //                 );
        // console.log('TB fact', factory);
        // const items = factory(panel);
        // console.log('TB panel', panel, panel.toolbar, panel.toolbar.layout);
        const items = ToolbarItems.getDefaultItems(panel);
        console.log('items', items);
        for (const item of items) {
          panel.toolbar.addItem(item.name, item.widget);
        }
        return undefined;
      }
    };
    

    app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, defaultNotebookToolbar);

    

    app.commands.addCommand('mosaic:notebook:open', {
      label: 'Notebook (Mosaic)',
      caption: 'Create a new Mosaic Notebook',
      execute: () => {
        return app.commands.execute('docmanager:new-untitled', {
          type: 'notebook'
        }).then(model => {
          return app.commands.execute('docmanager:open', {
            path: model.path,
            factory: MOSAIC_FACTORY
          });
        });
      },
    });
    launcher.add({
      command: 'mosaic:notebook:open',
      category: 'Notebook',
      rank: 10
    });






    // tracker.widgetAdded.connect((sender, notebookPanel: NotebookPanel) => {

    //   const vm = (notebookPanel.content as any)._viewModel;

    //   vm.cellTree = {};
    //   Object.defineProperty(vm, 'subTree', {
    //     get: () => {return vm.cellTree}
    //   });
    //   vm.subGroups = {};
    //   vm.itemsList.changed.connect(
    //     MosaicNotebookViewModel.prototype.onListChanged.bind(vm)
    //     // function(l:any, c:any) {
    //     // console.warn('LC', l, c);

    //     // switch (c.type) {
    //     //   case "add":
    //     //     for (let i = c.newIndex; i < c.newIndex + c.newValues.length; i++) {
    //     //       const cell = vm.cells[i] as Cell;
    //     //       const path = cell.model.metadata.mosaic as Array<string>;

    //     //       let lastgroup = vm.cellTree;
    //     //       if (path && path.length > 0) {
    //     //         for (const groupID of path) {
    //     //           if (!lastgroup[groupID]) {
    //     //             lastgroup[groupID] = {};
    //     //           }
    //     //           lastgroup = lastgroup[groupID];
    //     //         }
    //     //       }
    //     //       lastgroup['cell-'+cell.model.id] = cell;
    //     //     }
    //     //     console.log('added cells to tree', vm.cellTree);
    //     // }
    //     // }
    //   );



    //   Object.defineProperty(vm, 'widgetCount', {get:  () => {
    //     console.log('wc!');
    //     return Object.getOwnPropertyDescriptor(MosaicViewModel.prototype, 'widgetCount')?.get?.call(vm)}
    //   });
    //   MosaicGroup; Cell; MosaicViewModel; MosaicNotebookViewModel;
    //   vm.widgetRenderer = (index:number) => MosaicViewModel._widgetRenderer(vm, index)
    //   // vm.widgetRenderer = function(index: number) {
    //   //   let gID, subItem;
    //   //   try {
    //   //     [gID, subItem] = Object.entries(vm.cellTree)[index]; //.map(([k,v],i) => {
    //   //   } catch (TypeError) {
    //   //     console.warn('out of bounds!');
    //   //     return;
    //   //   }
    //   //   if (gID.startsWith('cell-')) return subItem as Cell;
    //   //   if (!vm.subNotebooks[gID]) vm.subNotebooks[gID] = new MosaicGroup(vm, gID, notebookPanel.content);
    //   //   return vm.subNotebooks[gID];
    //   // }

    // });
  }
};

export default plugin;
