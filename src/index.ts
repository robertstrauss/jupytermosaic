import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  IRouter
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { NotebookWidgetFactory, INotebookWidgetFactory, INotebookTracker, INotebookModel } from '@jupyterlab/notebook' // INotebookModel,

// import { MosaicNotebookViewModel, MosaicViewModel } from './MosaicViewModel';
import { MosaicNotebookPanel } from './MosaicNotebookPanel';
// import { MosaicGroup } from './MosaicGroup';

// import { ToolbarItems } from '@jupyterlab/notebook';
import { Dialog, IToolbarWidgetRegistry, showDialog } from '@jupyterlab/apputils';

import { NotebookPanel, NotebookModelFactory } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
// import { Doc } from 'yjs';
// import { Cell } from '@jupyterlab/cells';

// import { Contents } from '@jupyterlab/services';
import { ILauncher } from '@jupyterlab/launcher';

const PLUGIN_ID = 'mosaic-lab:plugin';
const MOSAIC_FACTORY = 'Mosaic Notebook';


class MosaicModelFactory extends NotebookModelFactory {
  // createNew(options: any) {
  //   console.log('MM create opts:', options);
  //   return super.createNew(options);
  // }
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

    //       patchNB._viewModel.widgetRenderer = (index:number) => MosaicViewModel._widgetRenderer(patchNB._viewModel, index);

    //       Object.defineProperty(patchNB._viewModel, 'widgetCount', {get:  () => {
    //         return Object.getOwnPropertyDescriptor(MosaicViewModel.prototype, 'widgetCount')?.get?.call(patchNB._viewModel)}
    //       });

    //     // }
    //     return panel;
    //   }
    // })


    const defaultNotebookFactory = app.docRegistry.getWidgetFactory('Notebook') as NotebookWidgetFactory;

    // make vanilla notebooks not the default
    // (defaultNotebookFactory as any)._defaultFor = [];

    console.log('def toolbar fac?', defaultNotebookFactory, (defaultNotebookFactory as any).toolbarFactory);


    function clobberCheck(
      sender: DocumentRegistry.IWidgetFactory<any, any>, panel: NotebookPanel) {

      const fpath = panel.context.path;
      const other = tracker.find((otherPanel: NotebookPanel) => (otherPanel.context.path == fpath));
      // console.log('path', fpath, other);
      if (other !== undefined) {
        // (async () => {
        //     // const prompt = 
        //     await showDialog({
        //     title: 'Editor Conflict (Mosaic)',
        //     body: 'This notebook is already open in another editor. Please close it before opening in a different mode.', // or enable collaboration
        //     buttons: [Dialog.cancelButton({label: 'Cancel'})]//, Dialog.okButton({label: 'Enable Collaboration in Settings'})]
        //   });
        // })();
        // panel.close();
        showDialog; Dialog;
      }
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
      contentFactory: new MosaicNotebookPanel.ContentFactory({
          editorFactory: editorServices.factoryService.newInlineEditor
        }),
      mimeTypeService: defaultNotebookFactory.mimeTypeService,
      toolbarFactory: (defaultNotebookFactory as any)._toolbarFactory,
      // notebookConfig: {}
    }));
    mosaicWidgetFactory.widgetCreated.connect((sender: DocumentRegistry.IWidgetFactory<NotebookPanel, INotebookModel>, panel: NotebookPanel) => {
      (tracker as any).add(panel);
    })
    mosaicWidgetFactory.widgetCreated.connect(clobberCheck);
    defaultNotebookFactory.widgetCreated.connect(clobberCheck);
    app.docRegistry.addWidgetFactory(mosaicWidgetFactory);
    app.docRegistry.setDefaultWidgetFactory('notebook', MOSAIC_FACTORY);
    console.log('set default factory', app.docRegistry.defaultWidgetFactory('*.ipynb'))


    // give Mosaic Notebook all the bells and whistles of a normal notebook (toolbar, cell action buttons)
    for (const ext of app.docRegistry.widgetExtensions('Notebook')) {
      console.log('adding ext', ext);
      app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, ext);
    }
    // app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, defaultNotebookToolbar);

    

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
  }
};

export default plugin;
