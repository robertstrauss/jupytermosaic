import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorServices } from '@jupyterlab/codeeditor';
import {
  INotebookTracker,
  NotebookPanel,
  NotebookTracker,
  NotebookWidgetFactory,
  StaticNotebook
} from '@jupyterlab/notebook';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentManager } from '@jupyterlab/docmanager';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { MosaicNotebookPanel } from './MosaicNotebook';

import MosaicIcon from '../style/icons/mosaic-icon.svg';

/**
 * Do not fall back to the default editor when a widget for this path already
 * exists under a different factory. Without this, restoring a workspace opens
 * both a Notebook and a Mosaic Notebook for the same file.
 *
 * Upstream equivalent: jupyterlab/jupyterlab#18034.
 */
DocumentManager.prototype.openOrReveal = function (
  path: string,
  widgetName: any = null,
  kernel?: any,
  options?: any
) {
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

const MosaicLabIcon = new LabIcon({
  name: 'mosaic:favicon',
  svgstr: MosaicIcon.toString()
});

const PLUGIN_ID = 'mosaic:plugin';
const MOSAIC_FACTORY = 'MosaicNotebook';

function applySettings(s: any): void {
  document.body.classList.toggle('mosaic-skeuomorphic', !!s.skeuomorphic);
  document.body.classList.toggle('mosaic-top-cell-handles', !!s.topCellHandle);
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
  autoStart: true,
  requires: [
    INotebookTracker,
    ILauncher,
    IEditorServices,
    ILayoutRestorer,
    IDocumentManager,
    ISettingRegistry
  ],
  activate: async (
    app: JupyterFrontEnd,
    tracker: NotebookTracker,
    launcher: ILauncher,
    editorServices: IEditorServices,
    restorer: ILayoutRestorer,
    docmanager: DocumentManager,
    settings: ISettingRegistry
  ) => {
    const loaded = await settings.load(PLUGIN_ID);
    applySettings(loaded.composite);
    loaded.changed.connect(() => applySettings(loaded.composite));

    // The shared NotebookTracker holds both kinds of panel, so teach its
    // restorer to record which factory each one came from. This is cheaper than
    // standing up a second tracker and re-attaching every command hook to it.
    const factoryName = (panel: NotebookPanel) =>
      (panel.content as any)._mosaic ? MOSAIC_FACTORY : 'Notebook';
    const pool = (tracker as any)._pool;
    pool._restore.args = (widget: NotebookPanel) => ({
      path: widget.context.path,
      factory: factoryName(widget)
    });
    pool._restore.name = (widget: NotebookPanel) =>
      `${widget.context.path}:${factoryName(widget)}`;
    void restorer;

    const jupyterFactory = app.docRegistry.getWidgetFactory(
      'Notebook'
    ) as NotebookWidgetFactory;

    // Deliberately reuse the *stock* 'notebook' model name. DocumentManager
    // looks up existing contexts by model factory name, so sharing it lets a
    // Mosaic panel and a plain Notebook panel for the same file share one
    // context and one model -- edits and cell moves show up live in both. A
    // separate model factory makes that lookup miss, and the second open then
    // re-runs `Context.initialize`, reverting the document from disk.
    const mosaicFactory = new NotebookWidgetFactory({
      name: MOSAIC_FACTORY,
      label: 'Mosaic Notebook',
      fileTypes: ['notebook'],
      defaultFor: ['notebook'],
      modelName: 'notebook',
      preferKernel: true,
      canStartKernel: true,
      rendermime: jupyterFactory.rendermime,
      contentFactory: new MosaicNotebookPanel.ContentFactory({
        editorFactory: editorServices.factoryService.newInlineEditor
      }),
      mimeTypeService: jupyterFactory.mimeTypeService,
      toolbarFactory: (jupyterFactory as any)._toolbarFactory,
      notebookConfig: {
        ...StaticNotebook.defaultNotebookConfig,
        // The grid supplies its own render range; windowing must stay on for
        // `getRangeToRender` / `getEstimatedTotalSize` to be consulted at all.
        windowingMode: 'full'
      }
    });

    mosaicFactory.widgetCreated.connect((_, panel: NotebookPanel) => {
      tracker.add(panel);
      panel.title.icon = MosaicLabIcon;
    });

    app.docRegistry.addWidgetFactory(mosaicFactory);
    app.docRegistry.setDefaultWidgetFactory('notebook', MOSAIC_FACTORY);

    // Give the Mosaic Notebook the same toolbar buttons as a plain notebook.
    for (const ext of app.docRegistry.widgetExtensions('Notebook')) {
      app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, ext);
    }
    void docmanager;

    app.commands.addCommand('mosaic-notebook:create-new', {
      label: args =>
        `Mosaic ${
          app.serviceManager.kernelspecs.specs?.kernelspecs[
            args.kernelName as string
          ]?.display_name || ''
        }`,
      caption: 'Create a new Mosaic Notebook',
      execute: async ({ kernelName }) => {
        const model = await app.commands.execute('docmanager:new-untitled', {
          type: 'notebook'
        });
        return app.commands.execute('docmanager:open', {
          path: model.path,
          factory: MOSAIC_FACTORY,
          kernel: { name: kernelName }
        });
      },
      icon: MosaicLabIcon,
      iconLabel: 'Mosaic Notebook'
    });

    for (const name in app.serviceManager.kernelspecs.specs!.kernelspecs) {
      const spec = app.serviceManager.kernelspecs.specs!.kernelspecs[name];
      launcher.add({
        command: 'mosaic-notebook:create-new',
        args: { kernelName: name },
        category: 'Notebook',
        rank: 0,
        kernelIconUrl: `${spec!.resources['logo-svg']}`
      });
    }
  }
};

export default plugin;
