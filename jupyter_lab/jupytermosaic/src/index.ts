import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  IDisposable
} from '@lumino/disposable'

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { INotebookTools, NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

/**
 * Initialization data for the jupytermosaic extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupytermosaic',
  autoStart: true,
  requires: [INotebookTools],
  activate: (app: JupyterFrontEnd, tools: INotebookTools) => {
    const panel = tools.activeNotebookPanel;
    console.log('JupyterLab extension jupytermosaic is activated!');
    console.log('app', app);

    console.log(panel);
    for (let i = 0; i < panel.content.widgets.length; i++) {
      console.log(i, panel.content.widgets[i]);
    }
    console.log('');
  }
};


class thing implements DocumentRegistry.IWid {
  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    console.log(panel);
    for (let i = 0; i < panel.content.widgets.length; i++) {
      console.log(panel.content.widgets[i]);
    }
  }
}
// function doThing(tracker: INotebookTracker) {
//   function generate(panel: NotebookPanel) {
//     console.log("what how did you even get in here");
//     console.log(panel);
//   }
// }

export default extension;
