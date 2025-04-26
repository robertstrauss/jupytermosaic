import '../style/mosaic.css';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { NotebookPanel } from '@jupyterlab/notebook';
//import { Widget } from '@lumino/widgets';
//import { MessageLoop } from '@lumino/messaging';
import { Cell } from '@jupyterlab/cells';
//import { ICellModel } from '@jupyterlab/cells';

//import { CellGroup } from './CellGroup';

import { recursecreatemosaic, findorcreatemosaicgroupin } from './mosaic-core';

function loadMosaic(notebookPanel: NotebookPanel){
  // Wait for the notebook to be fully ready (e.g., content and kernel)
  notebookPanel.revealed
    .then(() => notebookPanel.sessionContext.ready)
    .then(() => {
      const root = document.createElement('div');
      root.id = 'mosaic-root';
      console.log(root);
      notebookPanel.content.viewportNode.appendChild(root);

      // Yes, hacky, redefining a property with my own custom getter code.
      // But for some reason Jupyter uses just 'node.children' to get the list of cells,
      // instead of the much more general and safer '.getElementsByClasName()'
      // Which wouldn't matter were there only cells in the view node. But now theres cell groups too.
      // So I need to monkey patch this 
      const vn = (notebookPanel.content as any)._viewport;
      const vm = (notebookPanel.content as any)._viewModel;


      Object.defineProperty(vn, 'children', {
        get: function () {
          return vn.getElementsByClassName('jp-Cell');
        },
        configurable: true, enumerable: true
      });
      Object.defineProperty(vn, 'childElementCount', {
        get: function() {
            return vn.getElementsByClassName('jp-Cell').length
        }
      });
      // Similarly need to patch the remove and insert methods to apply to the cell's parent
      
      notebookPanel.content.viewportNode.removeChild = function (node) {
        // Remove from its cellgroup, not the root
        //node.parentNode?.removeChild(node);
        console.log('remove', node);
        //throw new Error('fuck yuou');
        return node;
      };

    
      
      const vpn = notebookPanel.content.viewportNode;
      //Object.defineProperty(vpn, 'orig_insertBefore', vpn.insertBefore);
      
      vpn.insertBefore = function (node1, node2) {
        if (node2) {
          let ix1 = (node1 as any as HTMLElement).dataset.windowedListIndex;
          let ix2 = (node2 as any as HTMLElement).dataset.windowedListIndex;
          console.log('ins b4', ix1, ix2);
          if (ix1 == undefined || ix2 == undefined || ix1 > ix2) {
            throw new Error('wtf are you doing juypyte');
          }
          const mp1 = (node1 as any as HTMLElement).dataset.mosaicpath;
          const mp2 = (node2 as any as HTMLElement).dataset.mosaicpath;
          console.log('mp1, mp2', mp1, mp2);
          if (mp1 !== undefined && mp2 !== undefined) {
            const path1 = mp1.split('-');
            const path2 = mp2.split('-');
            let divergelevel = (path1.findIndex((mosaicnum, i) => (path2.length <= i || path2[i] !== mosaicnum)));
            if (divergelevel < 0 || divergelevel == undefined) {
              divergelevel = path1.length-1;
            }
            
            console.log('paths diverge at', divergelevel);
            
            const lowestcommongroup = findorcreatemosaicgroupin(vpn, path1.slice(0,divergelevel)).get(0) as HTMLElement;
            let branch1 : Node;
            let branch2 : Node;
            if (path1.length > divergelevel) {
              branch1 = findorcreatemosaicgroupin(lowestcommongroup, [path1[divergelevel]]).get(0) as HTMLElement;
            } else {
              branch1 = node1;
            }
            if (path2.length > divergelevel) {
              branch2 = findorcreatemosaicgroupin(lowestcommongroup, [path2[divergelevel]]).get(0) as HTMLElement;
            } else {
              branch2 = node2;
            }
            
            lowestcommongroup.insertBefore(branch1, branch2);

            // construct everything past the branch point and put the node at the end as a leaf
            const node1wrapper  = findorcreatemosaicgroupin(lowestcommongroup, path1.slice(divergelevel)).get(0) as HTMLElement;
            node1wrapper.appendChild(node1);
          }
          else {
            if (node2.parentNode == vpn) {
              
            } else if (node2.parentNode) {
              node2.parentNode.insertBefore(node1, node2);
            }
          }
        } else {
          root.prepend(node1);
        }
        return node1;
      };
      

      notebookPanel.content.viewportNode.style.border = "3px dashed grey";
      root.style.background = "blue";
      vm.origr2r = vm.getRangeToRender;
      vm.getRangeToRender = function(){
        const orig = vm.origr2r();
        if (orig) {
          console.log('computed r2r', orig);
          const cells = Array.from(vn.getElementsByClassName('jp-Cell'));
          cells.slice(orig[0], orig[1]).forEach(a => (a as HTMLElement).style.border = '3px solid green');
          cells.slice(orig[2], orig[3]).forEach(a => (a as HTMLElement).style.border = '3px solid red');
          console.log(notebookPanel.content.widgets.slice(orig[0], orig[1]).map((cell, ixCell) => [vm.cellsEstimatedHeight.get(cell.model.id), vm._widgetSizers[ixCell].size, vm._widgetSizers[ixCell].offset]));
        }
        return orig;
        // some more intelligent way of calculating the visible range of cells
        //return [0, 99, 0, 99];
      }

      notebookPanel.content.widgets.forEach((cell : Cell, ixCell: number) => {
        cell.ready.then(() => {
          const bottomgroup = recursecreatemosaic(cell, root, 0);
          bottomgroup.append(cell.node);

          if (!cell.node.dataset.mosaicpath) {
            cell.node.dataset.mosaicpath = (cell.model.sharedModel.metadata.mosaic as Array<number>)?.join('-');
          }
//          const orig = (cell as any).onAfterAttach.bind(cell);
//          (cell as any).onAfterAttach = (msg:any) => {
//            const md = cell.model.sharedModel.metadata.mosaic;
//            if (md) {
//              console.log('mosaic metadata', md);
//              const bottomgroup = recursecreatemosaic(cell, root, 0);
//              bottomgroup.append(cell.node);
//            }
//            orig(msg);
//          }
          
          
        });
      });

      // need to do height calculations after whole mosaic has been put in DOM
      notebookPanel.content.widgets.forEach((cell : Cell, ixCell: number) => {
        cell.ready.then(() => {
          const lastwidget = vm._widgetSizers[ixCell-1] || {offset: 0, size: 0};
          //vm._widgetSizers[ixCell].offset = bottomgroup.getBoundingClientRect().top - root.getBoundingClientRect().top;
          vm._widgetSizers[ixCell].offset = lastwidget.offset + lastwidget.size;

          const outerrow = (cell.node.closest('#mosaic-root > .mosaicrow'));
          if (outerrow){
            // the first node in any row of the main column serves as the representative 
            // of all its siblings, stating its height as the height of the whole row.
            //        (which may actually be the height of a larger node in the row)
            // other nodes, being in the same row, don't contribute to the distance of scrolling,
            // so their estimated height is set to 0.
            let size = 0;
            if (cell.node == outerrow.getElementsByClassName('jp-Cell')[0]){
              // amount widget displaces following cells vertically, for viewport scroll
              // is determined by the height of its outermost row
              //size = outerrow.closest('#mosaic-root > .mosaicrow')?.clientHeight || 0;
              size = outerrow.clientHeight;
            }
            console.log(ixCell, 'setting widget offset and size', vm._widgetSizers[ixCell].offset, size);
            vm.cellsEstimatedHeight.set(cell.model.id, size);
            vm._widgetSizers[ixCell].size = size;
//            Object.defineProperty(vm, 'cellsEsimatedHeight', {
//              get: function() {
//                throw new Error('nope');
//              }
//            });
            console.log('saved size', vm._widgetSizers[ixCell].size);
          }
      });
    });
      
    (notebookPanel.content.layout.parent as any)._itemsResizeObserver.disconnect();
    
//    Object.defineProperty((notebookPanel.content as any)._viewport.style, 'transform', {
//      set: function() {
//        throw new Error('no');
//      }
//    });
     root.style.position = 'relative';
    notebookPanel.content.update();

    setTimeout(() => {
    const toAdd = [];
    for (let i = 0; i<= 26; i++) {
      toAdd.push(vm.widgetRenderer(i));
    }
    console.log('widgcount', vm._widgetCount, vm.widgetCount);
    console.log('itemlist', vm._itemsList, vm._itemsList.length);
    console.log('toadd', toAdd);
    console.log('range2rend', vm.getRangeToRender());
    for (let i = 0; i <= 26; i++) {
      console.log('included?', i, notebookPanel.content.layout.widgets[i], toAdd.includes(notebookPanel.content.layout.widgets[i]));
    }
    }, 2000);
    
  });
}


/**
 * Initialization data for the mosaic-lab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'mosaic-lab:plugin',
  description: 'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker],
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, tracker: INotebookTracker, 
            settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension mosaic-lab is activated!');

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


/*
    const factory = new ABCWidgetFactory<MosaicNotebookPanel>({
      name: 'Mosaic Notebook',
      fileTypes: ['notebook'],
      modelName: 'notebook',
      defaultFor: ['notebook'],
      preferKernel: true,
      canStartKernel: true
    });

    app.docRegistry.addWidgetFactory(factory);
    app.docRegistry.defaultWidgetFactory = factory;

    */

    tracker.widgetAdded.connect((sender, notebookPanel: NotebookPanel) => {
      loadMosaic(notebookPanel);
    });
  }
};

export default plugin;
