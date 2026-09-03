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
import { LabIcon, addAboveIcon, addBelowIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { Direction, MosaicNotebookPanel, mosaicOf } from './MosaicNotebook';
import {
  Notebook as NotebookWidget,
  NotebookActions
} from '@jupyterlab/notebook';

/**
 * Running the last cell advances into a cell the notebook creates on the spot.
 * Flag it so the mosaic gives it a row of its own at the end rather than
 * burying it in whatever tile happened to be last; insertions the user asked
 * for still join the tile they were invoked from.
 */
const runAndAdvance = NotebookActions.runAndAdvance;
NotebookActions.runAndAdvance = ((notebook: NotebookWidget, ...rest: any[]) => {
  if (notebook && notebook.activeCellIndex === notebook.widgets.length - 1) {
    mosaicOf(notebook)?.expectRootInsert();
  }
  return (runAndAdvance as any).call(NotebookActions, notebook, ...rest);
}) as typeof NotebookActions.runAndAdvance;

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

/**
 * The insert-above/below icons under new names, so that the stylesheet can turn
 * them a quarter turn: left and right then read as the same action on the other
 * axis. LabIcon stamps the name onto the rendered svg as `data-icon`.
 */
const addLeftIcon = new LabIcon({
  name: 'mosaic:add-left',
  svgstr: addAboveIcon.svgstr
});
const addRightIcon = new LabIcon({
  name: 'mosaic:add-right',
  svgstr: addBelowIcon.svgstr
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

    // Navigation and insertion are two-dimensional in a mosaic notebook. These
    // are registered as separate commands rather than replacing the notebook's
    // own, so a plain Notebook panel keeps stock behaviour; the shortcuts in
    // schema/plugin.json use a more specific selector to win only here.
    const active = (): ReturnType<typeof mosaicOf> => {
      const panel = tracker.currentWidget;
      return panel ? mosaicOf(panel.content) : null;
    };
    const isMosaic = () => active() !== null;

    const directions: Direction[] = ['left', 'right', 'up', 'down'];
    for (const direction of directions) {
      app.commands.addCommand(`mosaic:move-cursor-${direction}`, {
        label: `Move Cursor ${direction[0].toUpperCase()}${direction.slice(1)}`,
        caption: `Move the active cell selection ${direction}`,
        isEnabled: isMosaic,
        execute: () => {
          active()?.navigate(direction);
        }
      });
      app.commands.addCommand(`mosaic:extend-selection-${direction}`, {
        label: `Extend Selection ${direction[0].toUpperCase()}${direction.slice(1)}`,
        caption: `Extend the selected cells ${direction}`,
        isEnabled: isMosaic,
        execute: () => {
          active()?.navigate(direction, true);
        }
      });
    }

    // Above/below get mosaic versions too. The stock commands leave the new
    // cell's placement to be inferred from its neighbour, and for an insert
    // *above* the neighbour it lands next to is the cell before it -- so 'a'
    // behaved like 'b' on the previous cell, dropping the new cell at the foot
    // of the preceding tile instead of over the current one.
    const inserts: [string, Direction, string][] = [
      ['above', 'up', 'Above'],
      ['below', 'down', 'Below'],
      ['left', 'left', 'Left'],
      ['right', 'right', 'Right']
    ];
    for (const [name, direction, label] of inserts) {
      if (name === 'left' || name === 'right') {
        continue; // registered below, with icons for the cell toolbar
      }
      app.commands.addCommand(`mosaic:insert-cell-${name}`, {
        label: `Insert Cell ${label}`,
        caption: `Insert a cell ${name}, subdividing if needed`,
        isEnabled: isMosaic,
        execute: () => {
          active()?.insertBeside(direction);
        }
      });
    }

    app.commands.addCommand('mosaic:insert-cell-left', {
      label: 'Insert Cell Left',
      caption: 'Insert a cell to the left, subdividing if needed',
      icon: addLeftIcon,
      isEnabled: isMosaic,
      isVisible: isMosaic,
      execute: () => {
        active()?.insertBeside('left');
      }
    });
    app.commands.addCommand('mosaic:insert-cell-right', {
      label: 'Insert Cell Right',
      caption: 'Insert a cell to the right, subdividing if needed',
      icon: addRightIcon,
      isEnabled: isMosaic,
      isVisible: isMosaic,
      execute: () => {
        active()?.insertBeside('right');
      }
    });

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
