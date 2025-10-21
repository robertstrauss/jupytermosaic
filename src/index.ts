import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

// import { ISettingRegistry } from '@jupyterlab/settingregistry';
// import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { NotebookWidgetFactory, INotebookTracker, INotebookModel } from '@jupyterlab/notebook' // INotebookModel,

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { NotebookPanel, NotebookModelFactory } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
// import { Doc } from 'yjs';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { IKernelSpecManager, KernelManager } from '@jupyterlab/services';


import { MosaicNotebookPanel } from './MosaicNotebookPanel';


import MosaicIcon from '../style/icons/mosaic-icon.svg';
// const MOSAIC_ICON_PATH = '../style/icons/mosaic-icon.svg';


const MosaicLabIcon = new LabIcon({ name: 'mosaic:favicon', svgstr: MosaicIcon.toString()});

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
  requires: [INotebookTracker, ILauncher, IEditorServices, IKernelSpecManager],
  optional: [],
  activate: async (app: JupyterFrontEnd, tracker:INotebookTracker,  launcher: ILauncher, editorServices: IEditorServices, kernelManager:KernelManager) => {
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
      panel.title.icon = MosaicLabIcon;
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

    

    app.commands.addCommand('mosaic-notebook:create-new', {
      label: args => `[Mosaic] ${app.serviceManager.kernelspecs.specs?.kernelspecs[args.kernelName as string]?.display_name || ''}`,
      caption: 'Create a new Mosaic Notebook',
      execute: async ({ kernelName }) => {
        const model = await app.commands.execute('docmanager:new-untitled', {
          type: 'notebook'
        });

        return app.commands.execute('docmanager:open', {
          path: model.path,
          factory: MOSAIC_FACTORY,
          kernel: {name: kernelName}
        });
      },
      icon: MosaicLabIcon,
      iconLabel: 'Mosaic Notebook'
    });
    

    for (const name in app.serviceManager.kernelspecs.specs!.kernelspecs) {
      const spec = app.serviceManager.kernelspecs.specs!.kernelspecs[name];
      console.log('adding kernel', name, spec, `${spec!.resources['logo-svg']}`);
      launcher.add({
        command: 'mosaic-notebook:create-new',
        args: { kernelName: name },
        category: 'Notebook',
        rank: 0,
        // label: `${spec.display_name} (Mosaic)`,
        kernelIconUrl: `${spec!.resources['logo-svg']}`,
      });
    }


  }
};

export default plugin;
