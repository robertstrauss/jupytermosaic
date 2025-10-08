import '../style/mosaic.css';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { NotebookPanel } from '@jupyterlab/notebook';
// const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells'; 
// const DROP_TARGET_CLASS = 'jp-mod-dropTarget'; // import { DROP_TARGET_CLASS } from '@jupyterlab/notebook/src/constants';
// import { Widget } from '@lumino/widgets';
//import { MessageLoop } from '@lumino/messaging';
import { Cell } from '@jupyterlab/cells';
// import { Drag } from '@lumino/dragdrop';
// import { MessageLoop } from '@lumino/messaging';
//import { ICellModel } from '@jupyterlab/cells';

//import { CellGroup } from './CellGroup';

// import { startDrag, insertIntoMosaic, findorcreatemosaicbranchin } from './mosaic-core';
// import { MosaicSubViewModel } from './mosaicviewmodel';



// import { WindowedList } from '@jupyterlab/ui-components'
import { NotebookWidgetFactory, INotebookWidgetFactory } from '@jupyterlab/notebook'

import { MosaicSubNotebook } from './MosaicSubNotebook';

/**
 * Initialization data for the mosaic-lab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'mosaic-lab:plugin',
  description: 'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker, INotebookWidgetFactory],
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, tracker: INotebookTracker, nbfactory: NotebookWidgetFactory,
            settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension mosaic-lab is activated!');


    const defaultNotebookFactory = app.docRegistry.getWidgetFactory('Notebook');
    const mosaicNotebookFactory = {...defaultNotebookFactory,
    };
    mosaicNotebookFactory;
    // app.docRegistry.addWidgetFactory(new NotebookWidgetFactory({
    //   name: 'Notebook',
    //   fileTypes: ['notebook'],
    //   modelName: 'notebook',
    //   preferKernel: true,
    //   canStartKernel: true,
    //   // rendermime: app.,
    //   contentFactory: {
    //     createNotebook: (options) => {
    //       // Inject your own CustomViewModel inside your CustomNotebookPanel
    //       const panel = new CustomNotebookPanel({
    //         ...options,
    //         viewModel: new CustomViewModel(options.model)
    //       });
    //       return panel.notebook;
    //     }
    //   }
    // }));
    // WindowedList.IOptions<MosaicViewModel>
    // new WindowedList<MosaicViewModel>({
    //   model: new MosaicViewModel('col', cells, {
    //     overscanCount:
    //       options.notebookConfig?.overscanCount ??
    //       StaticNotebook.defaultNotebookConfig.overscanCount,
    //     windowingActive
    //   })

    console.log('NB FACT', app.docRegistry.getWidgetFactory('Notebook'));
    console.log('NBP FACT', app.docRegistry.getWidgetFactory('NotebookPanel'));
    console.log('nbm FACT', app.docRegistry.getModelFactory('notebook'));
    for (const mf of app.docRegistry.modelFactories()) {
      console.log('mf', mf);
    }
    for (const wf of app.docRegistry.widgetFactories()) {
      console.log('wf', wf);
    }
  
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('mosaic-lab settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for mosaic-lab.', reason);
        });
    }


    





    tracker.widgetAdded.connect((sender, notebookPanel: NotebookPanel) => {
      // notebookPanel.children
      const vm = (notebookPanel.content as any)._viewModel;
      // const wl = notebookPanel.content.layout;

      vm.cellTree = {};
      Object.defineProperty(vm, 'subTree', {
        get: () => {return vm.cellTree}
      });
      vm.subNotebooks = {};
      vm.itemsList.changed.connect(function(l:any, c:any) {
        console.warn('LC', l, c);

        switch (c.type) {
          case "add":
            for (let i = c.newIndex; i < c.newIndex + c.newValues.length; i++) {
              const cell = vm.cells[i] as Cell;
              console.log(i, cell, cell?.node);

              const path = cell.model.metadata.mosaic as Array<string>;
              let lastgroup = vm.cellTree;
              if (path && path.length > 0) {
                for (const groupID of path) {
                  if (!lastgroup[groupID]) {
                    lastgroup[groupID] = {};
                  }
                  lastgroup = lastgroup[groupID];
                }
              }
              lastgroup['cell-'+cell.model.id] = cell;
            }
            console.log('added cells to tree', vm.cellTree);
        }
      });



      vm.widgetRenderer = function(index: number) {
        let gID, subItem;
        try {
          [gID, subItem] = Object.entries(vm.cellTree)[index]; //.map(([k,v],i) => {
        } catch (TypeError) {
          console.warn('out of bounds!');
          return;
        }
        if (gID.startsWith('cell-')) return subItem as Cell;
        if (!vm.subNotebooks[gID]) vm.subNotebooks[gID] = new MosaicSubNotebook(vm, gID, notebookPanel.content);
        return vm.subNotebooks[gID];
      }



    });
  }
};

export default plugin;
