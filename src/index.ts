import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { IEditorServices } from '@jupyterlab/codeeditor';
import { NotebookWidgetFactory, NotebookTracker, INotebookTracker, INotebookModel } from '@jupyterlab/notebook' 
import { NotebookPanel, NotebookModelFactory } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDocumentManager, DocumentManager } from '@jupyterlab/docmanager';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILayoutRestorer } from '@jupyterlab/application';
// import { PathExt } from '@jupyterlab/coreutils';

import { MosaicNotebookPanel, MosaicNotebook } from './MosaicNotebookPanel';

import MosaicIcon from '../style/icons/mosaic-icon.svg';


const MosaicLabIcon = new LabIcon({ name: 'mosaic:favicon', svgstr: MosaicIcon.toString()});

const PLUGIN_ID = 'mosaic-lab:plugin';
const MOSAIC_FACTORY = 'MosaicNotebook';


class MosaicModelFactory extends NotebookModelFactory {
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
  requires: [INotebookTracker, ILauncher, IEditorServices, ILayoutRestorer, IDocumentManager],
  optional: [],
  activate: async (app: JupyterFrontEnd, tracker: NotebookTracker,  launcher: ILauncher, editorServices: IEditorServices,
                  restorer: ILayoutRestorer, docmanager: DocumentManager) => {
    console.log('JupyterLab extension mosaic-lab is activated!');
    

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
    
    // re-use existing context to open a file as both Mosaic and Jupyter notebook, so they stay in sync
    const createContext = (docmanager as any)._createContext.bind(docmanager);
    // docmanager.open = (path: string, widgetName?: string, kernel?: any, options?: DocumentRegistry.IOpenOptions) => {
    (docmanager as any)._createContext = (path: string, factory: any, ...args:any[]) => {
        // tracker.find; // also search other tracker if not using proxy to same tracker
        const other = tracker.find((otherPanel: NotebookPanel) => (otherPanel.context.path == path));
                  // ||  jptracker.find((otherPanel: NotebookPanel) => (otherPanel.context.path == path));

        if (other !== undefined) {
          console.log('found other!', other, other.context, other.sessionContext);
          console.log('given', path, factory, 'args',  ...args);
          return other.context;
        }
      return createContext(path, factory);
    }
    

    const jupyterWidgetFactory = app.docRegistry.getWidgetFactory('Notebook') as NotebookWidgetFactory;

    const mosaicModelFactory = new MosaicModelFactory({ disableDocumentWideUndoRedo: false });
    app.docRegistry.addModelFactory(mosaicModelFactory);

    const mosaicWidgetFactory = (new NotebookWidgetFactory({
      name: MOSAIC_FACTORY,
      fileTypes: ['notebook'],
      defaultFor: ['notebook'],
      modelName: 'mosaic-notebook', //mosaic-
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

    app.docRegistry.addWidgetFactory(mosaicWidgetFactory);
    app.docRegistry.setDefaultWidgetFactory('notebook', MOSAIC_FACTORY);
    console.log('default fact', app.docRegistry.defaultWidgetFactory('a.ipynb'));


    app.serviceManager.workspaces.list().then(a => console.log('ws list!', a))
    app.serviceManager.workspaces.list().then(a => {
      for (const id of a.ids) {
        app.serviceManager.workspaces.fetch(id).then(ws => {
          console.log('got workspace!', ws);
        });
      }
      return a;
    });


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



    ////// Patch the tracker to allow two different kinds of widgets, open simultaneously and restored correctly
    (tracker as any)._pool._restore.args = (widget: NotebookPanel) => {
              console.log('restorer widg', widget);
              console.log('inst mosaic?', widget.content, widget.content instanceof MosaicNotebook, MOSAIC_FACTORY);
              console.log((tracker as any)._pool);
              return ({
                path: widget.context.path,
                factory: (widget.content instanceof MosaicNotebook ? MOSAIC_FACTORY : 'Notebook'), //a: Private.factoryNameProperty.get()
            })};
    (tracker as any)._pool._restore.name = (widget: NotebookPanel) => {
      const factory = (widget.content instanceof MosaicNotebook ? MOSAIC_FACTORY : 'Notebook');
      return `${widget.context.path}:${factory}`;
    }

    // patch openOrReveal to open all factories of a widget that were previously open, not just first one
    // const openOrReveal = docmanager.openOrReveal;
    docmanager.openOrReveal = (function (path:string, widgetName:any = null, kernel?: any, options?: any) {
      // console.warn('OOR', widgetName);

      // const self = (docmanager) as any;
      // // based on findWidget, @jupyterlab/docmanager/manager.ts:385
      // const newPath = PathExt.normalize(path);

      // let widgetNames = [widgetName];
      // console.log('given widgetName', widgetName);
      // if (widgetName == 'default') {
      //   widgetNames = self.registry
      //     .preferredWidgetFactories(newPath)
      //     .map((f:any) => f.name);
      // }
      // console.log('widget names', widgetNames);
      // let widget;
      // for (const context of self._contextsForPath(newPath)) {
      //   console.log('context', context);
      //   for (const widgetName of widgetNames) {
      //     if (widgetName !== null) {
      //       widget = self._widgetManager.findWidget(context, widgetName);
      //       if (widget) {
      //         self._opener.open(widget, {
      //           type: widgetName,
      //           ...options
      //         });
      //       }
      //     }
      //   }
      // }

      // if (widget) {
      //   return widget;
      // }
      // return openOrReveal.bind(docmanager)(path, widgetName as any, kernel, options);//self.open(path, widgetName, kernel, options ?? {}, kernelPreference);
      const widget = docmanager.findWidget(path, widgetName);
      if (widget) {
        (docmanager as any)._opener.open(widget, {
          type: widgetName,
          ...options
        });
        return widget;
      }
      return (docmanager as any).open(path, widgetName || 'default', kernel, options ?? {});
    }).bind(docmanager);
    /////// end patching tracker



    

  }
};

export default plugin;
