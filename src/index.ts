import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { IEditorServices } from '@jupyterlab/codeeditor';
import { NotebookWidgetFactory, NotebookTracker, INotebookTracker, INotebookModel } from '@jupyterlab/notebook' 
import { NotebookPanel, NotebookModelFactory } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILayoutRestorer } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { MosaicNotebookPanel } from './MosaicNotebookPanel';

import MosaicIcon from '../style/icons/mosaic-icon.svg';

import { DocumentManager } from '@jupyterlab/docmanager';
/** patch DocumnetManager to not open default editor when no widgetName is specified if a different editor exists
  * added to jupyterlab in PR https://github.com/jupyterlab/jupyterlab/pull/18034
  * important for not duplicating Mosaic and Jupyter Notebook editors when reloading (restoring workspace) */
DocumentManager.prototype.openOrReveal = function (path:string, widgetName:any = null, kernel?: any, options?: any) {
  const widget = this.findWidget(path, widgetName);
  if (widget) {
    (this as any)._opener.open(widget, {
      type: widgetName || 'default',
      ...options
    });
    return widget;
  }
  return this.open(path, widgetName || 'default', kernel, options ?? {});
};
///// end patch


const MosaicLabIcon = new LabIcon({ name: 'mosaic:favicon', svgstr: MosaicIcon.toString()});

const PLUGIN_ID = 'mosaic:plugin';
const MOSAIC_FACTORY = 'MosaicNotebook';


class MosaicModelFactory extends NotebookModelFactory {
  get name(): string {
    return 'mosaic-notebook';
  }
}

function applySettings(s: any) {
  if (s.skeuomorphic) {
    document.body.classList.add('mosaic-skeuomorphic');
  } else {
    document.body.classList.remove('mosaic-skeuomorphic');
  }

  if (s.topCellHandle) {
    document.body.classList.add('mosaic-top-cell-handles');
  } else {
    document.body.classList.remove('mosaic-top-cell-handles');
  }
}

/**
 * Initialization data for the mosaic-lab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
  autoStart: true,
  requires: [INotebookTracker, ILauncher, IEditorServices, ILayoutRestorer, IDocumentManager, ISettingRegistry],
  optional: [],
  activate: async (app: JupyterFrontEnd, tracker: NotebookTracker,  launcher: ILauncher, editorServices: IEditorServices,
                  restorer: ILayoutRestorer, docmanager: DocumentManager, settings: ISettingRegistry) => {
    console.log('JupyterLab extension mosaic is activated!');
    
    const loaded = await settings.load(plugin.id);
    // Apply settings initially
    applySettings(loaded.composite);
    // React to changes
    loaded.changed.connect(() => {
      applySettings(loaded.composite);
    });

    ////// Patch the tracker to allow two different kinds of widgets, open simultaneously and restored correctly
    ////// This is easier than creating a new NotebookTracker() and having to reattach all the command enabling hooks to the new namespace
    const getNotebookFactoryName = (panel: NotebookPanel) => ((panel.content as any)._mosaic ? MOSAIC_FACTORY : 'Notebook');
    (tracker as any)._pool._restore.args = (widget: NotebookPanel) => ({
                path: widget.context.path,
                factory: getNotebookFactoryName(widget),
            });
    (tracker as any)._pool._restore.name = (widget: NotebookPanel) => `${widget.context.path}:${getNotebookFactoryName(widget)}`;
    /////// end patching tracker

    // const tracker = new NotebookTracker({
    //   namespace: 'mosaic-notebook'
    // });

    // restorer.restore(tracker, {
    //   command: 'docmanager:open',
    //   args: widget => ({
    //     path: widget.context.path,
    //     factory: MOSAIC_FACTORY
    //   }),
    //   name: widget => `${widget.context.path}:${MOSAIC_FACTORY}`,
    // });

    app.serviceManager.workspaces.list().then(value => {
      console.log("WORKSPACES", value);
    });
    // app.serviceManager.workspaces.fetch('defaul').then((workspace:any) => {
    //   console.log('WORKSPACE', workspace);
    // });
    
    // re-use existing context to open a file as both Mosaic and Jupyter notebook, so they stay in sync
    const createContext = (docmanager as any)._createContext.bind(docmanager);
    (docmanager as any)._createContext = (path: string, factory: any, ...args:any[]) => {
      // find existing panel editing this file
      const other = tracker.find((otherPanel: NotebookPanel) => (otherPanel.context.path == path));

      if (other !== undefined) {
        return other.context;
      }
      return createContext(path, factory);
    }
    

    const jupyterWidgetFactory = app.docRegistry.getWidgetFactory('Notebook') as any as NotebookWidgetFactory;

    const mosaicModelFactory = new MosaicModelFactory({ disableDocumentWideUndoRedo: false });
    app.docRegistry.addModelFactory(mosaicModelFactory);

    const mosaicWidgetFactory = (new NotebookWidgetFactory({
      name: MOSAIC_FACTORY,
      fileTypes: ['notebook'],
      defaultFor: ['notebook'],
      modelName: 'mosaic-notebook',
      preferKernel: true,
      canStartKernel: true,
      rendermime: jupyterWidgetFactory.rendermime,
      contentFactory: new MosaicNotebookPanel.ContentFactory({
          editorFactory: editorServices.factoryService.newInlineEditor
        }),
      mimeTypeService: jupyterWidgetFactory.mimeTypeService,
      toolbarFactory: (jupyterWidgetFactory as any)._toolbarFactory,
      // notebookConfig: {}
    }));
    mosaicWidgetFactory.widgetCreated.connect((sender: DocumentRegistry.IWidgetFactory<NotebookPanel, INotebookModel>, panel: NotebookPanel) => {
      tracker.add(panel);
      panel.title.icon = MosaicLabIcon;
    });

    app.docRegistry.addWidgetFactory(mosaicWidgetFactory as any);
    app.docRegistry.setDefaultWidgetFactory('notebook', MOSAIC_FACTORY);


    // give Mosaic Notebook all the bells and whistles of a normal notebook (cell action buttons)
    for (const ext of app.docRegistry.widgetExtensions('Notebook')) {
      app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, ext);
    }

    // create launch command
    app.commands.addCommand('mosaic-notebook:create-new', {
      label: args => `Mosaic ${app.serviceManager.kernelspecs.specs?.kernelspecs[args.kernelName as string]?.display_name || ''}`,
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
    
    // add launch icon to launcher
    for (const name in app.serviceManager.kernelspecs.specs!.kernelspecs) {
      const spec = app.serviceManager.kernelspecs.specs!.kernelspecs[name];
      launcher.add({
        command: 'mosaic-notebook:create-new',
        args: { kernelName: name },
        category: 'Notebook',
        rank: 0,
        kernelIconUrl: `${spec!.resources['logo-svg']}`,
      });
    }

  }
};

export default plugin;
