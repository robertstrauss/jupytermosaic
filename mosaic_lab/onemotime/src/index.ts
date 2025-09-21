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

import { startDrag, findorcreatemosaicgroupin } from './mosaic-core';


// function delicateAppend(root: HTMLElement, node: HTMLElement) {
//   if (!node.dataset.windowedListIndex) {
//     console.warn('!!! No windowedListIndex, appending to root, on node', node.dataset.windowedListIndex);
//     root.appendChild(node);
//     return;
//   }
//   let lastix = node.dataset.windowedListIndex +1;
//   let lastcell;
//   do {
//     lastcell = root.querySelector(`[data-windowed-list-index="${lastix}"`);
//   } while (lastcell == undefined && lastix < cells.length - 1) {
//     lastix++;
//   }
// }

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
      const wl = notebookPanel.content.layout.parent as any;

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
        node.parentNode?.removeChild(node);
        console.log('remove', node);
        return node;
      };

    
      
      // const vpn = notebookPanel.content.viewportNode;
      
      vn.insertBefore = function (node1: HTMLElement, node2 : HTMLElement) {
        if (node2) {
          let mp1 = (node1 as any as HTMLElement).dataset.mosaicpath;
          let mp2 = (node2 as any as HTMLElement).dataset.mosaicpath;
          console.log(node1.dataset.windowedListIndex, node2.dataset.windowedListIndex, 'mp1, mp2', mp1, mp2);
          if (node1.dataset.windowedListIndex && node2.dataset.windowedListIndex && parseInt(node1.dataset.windowedListIndex) > parseInt(node2.dataset.windowedListIndex)) {
            console.trace("WTF");
          }
          if (mp1 == undefined) {
            mp1 = '';
          }
          if (mp2 == undefined) {
            mp2 = '';
          }
          const path1 = mp1.split('-').filter(substr => substr.length > 0);
          const path2 = mp2.split('-').filter(substr => substr.length > 0);
          let divergelevel = (path1.findIndex((mosaicnum, i) => (path2.length <= i || path2[i] !== mosaicnum)));
          if (divergelevel < 0 || divergelevel == undefined) {
            divergelevel = path1.length;
          }
          
          console.log('paths diverge at', divergelevel);
          
          const lowestcommongroup = findorcreatemosaicgroupin(root, path1.slice(0,divergelevel)).get(0) as HTMLElement;
          // construct everything past the branch point and put the node at the end as a leaf
          const node1wrapper  = findorcreatemosaicgroupin(lowestcommongroup, path1.slice(divergelevel)).get(0) as HTMLElement;
          node1wrapper.appendChild(node1);

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
          
          // put node1 before node2, but each in their respective group
          lowestcommongroup.insertBefore(branch1, branch2);
        } else {
          // no referrence node (node2), someone's just appending.
          if (node1.dataset.windowedListIndex !== undefined) {
            softAppend(root, node1, parseInt(node1.dataset.windowedListIndex));
          } else {
            // no index, have to just add it to the bottom.
            root.appendChild(node1);
          }
        }
        return node1;
      };
      

      vm.origr2r = vm.getRangeToRender;
      vm.getRangeToRender = function(){
        const orig = vm.origr2r();
        if (orig) {
          // console.log('computed r2r', orig);
          // const cells = Array.from(vn.getElementsByClassName('jp-Cell'));
          // cells.forEach(a => (a as HTMLElement).style.border = 'none');
          // cells.slice(orig[0], orig[1]).forEach(a => (a as HTMLElement).style.border = '3px solid red');
          // cells.slice(orig[2], orig[3]).forEach(a => (a as HTMLElement).style.border = '3px solid green');
          // cells.slice(orig[2], orig[3]).forEach(a => (a as HTMLElement).style.boxSizing = 'border-box');

          // for (let indx = orig[2]; indx < orig[3]; indx++) {
          //   console.log(indx, vm._widgetSizers[indx]);
          // }
          // console.log(notebookPanel.content.widgets.slice(orig[0], orig[1]).map((cell, ixCell) => [vm.cellsEstimatedHeight.get(cell.model.id), vm._widgetSizers[ixCell].size, vm._widgetSizers[ixCell].offset]));
        }
        return orig;
      }
      
      const cells = notebookPanel.content.widgets;

      /**
       * find cell to insert node before, that is connected to the DOM
       */
      function softAppend(root: HTMLElement, node: HTMLElement, ixCell: number) {
        let lastix = ixCell +1;
        while (lastix < cells.length - 1 && !cells[lastix].node.isConnected) {
          lastix++;
        }
        const lastcell = cells[lastix];
        if (lastcell == undefined || !lastcell.node.isConnected) {
          // found no cell, all further cells are not connected. We can safely append to the root.
          if (node.dataset.mosaicpath !== undefined) {
            findorcreatemosaicgroupin(root, node.dataset.mosaicpath.split('-')).get(0)?.append(node);
          } else {
            // no mosaic data either, just put in directly in the root
            root.appendChild(node);
          }
        } 
        else {
          vn.insertBefore(node, lastcell.node);
        }
      }
      
      for (let ixCell = cells.length - 1; ixCell >= 0; ixCell--) {
        const cell = cells[ixCell];

        if (!cell.node.dataset.mosaicpath && cell.model.sharedModel.metadata.mosaic) {
          cell.node.dataset.mosaicpath = (cell.model.sharedModel.metadata.mosaic as Array<number>)?.join('-');
        }
        console.log(ixCell, cell.model.sharedModel.metadata.mosaic, cell.node.dataset.mosaicpath);

        if (cell.node.isConnected) {
          cell.ready.then(() => {
              softAppend(root, cell.node, ixCell);

              // startDrag;
              // add dragging functionality
              cell.node.onmousedown = function (event){
                // has to be clicked with left mouse button, no shift or control key, and not in the editor or output area
                if ( event.button == 0 && ! event.shiftKey && ! event.ctrlKey
                    && (event.target as HTMLElement).closest('.jp-OutputArea') == undefined
                    && (event.target as HTMLElement).closest('.jp-Editor') == undefined ) {
                    // if not in code area, start dragging functionality
                    // drag all selected cells, or just this one if none selected
                    let cells = notebookPanel.content.selectedCells;
                    if (cells.length == 0) {
                      cells = [cell];
                    }
                    startDrag(cells, event);
                }
              };

            //});
          });
        }
      }//);

      
      function adjustWidgetSizesForRow(outerrow: HTMLElement) {
        // the last (important) node in any row of the main column serves as the representative 
        // of all its siblings, stating its height as the height of the whole row.
        //        (which may actually be the height of a larger node in the row)
        // other nodes, being in the same row, don't contribute to the distance of scrolling,
        // so their estimated height is set to 0.

        // all non-first-elment in row get size 0, as they don't contribute to vertical displacement
        vm.setWidgetSize(Array.from(outerrow.querySelectorAll('.jp-Cell')).map(node => {
            return {index: parseInt((node as HTMLElement).dataset.windowedListIndex || '0'), size: 0};
          }));

        // Get the first cell in the outerrow (representative in height of the whole row)
        const firstCell = outerrow.querySelectorAll('.jp-Cell')[0] as HTMLElement;

        if (firstCell && firstCell.dataset.windowedListIndex) {
          // Update the outerrow's dataset.windowedListIndex
          outerrow.dataset.windowedListIndex = firstCell.dataset.windowedListIndex;
          vm.setWidgetSize([{index: parseInt(firstCell.dataset.windowedListIndex), size: outerrow.clientHeight}])
        }
      }

      // Create a new ResizeObserver
      const newResizeObserver = new ResizeObserver((entries) => {
        (wl as any)._onItemResize(entries); // call original handler FIRST, then fix whatever it did

        vm.height = root.getBoundingClientRect().height;
        entries.forEach((entry) => {
          const outerrow = entry.target as HTMLElement;
          adjustWidgetSizesForRow(outerrow);
        });
      });


      wl.origonscroll = wl.onScroll;
      wl.onScroll = function(event: Event) {
        const orig = wl.origonscroll(event);
        //indicator.style.top = (event.target as HTMLElement).scrollTop + 'px';
        return orig;
      }


      vm._getStartIndexForOffset = function(offset: number): number {
        let match = this._findNearestItem(offset);
        // now that some cells are in rows, they may have the same offset.
        // in this case their binary search algorithm will return the last one close to this offset,
        // but we really want the first one (within the same distance to the offset).
        let currentOffset = this._getItemMetadata(match).offset;
        let prevoffset = currentOffset;
        while (currentOffset == prevoffset && match > 0) {
          match--;
          prevoffset = currentOffset;
          currentOffset = this._getItemMetadata(match).offset;
        }
        return match;
      }

      // need to do height calculations after whole mosaic has been put in DOM
      notebookPanel.content.widgets.forEach((cell : Cell, ixCell: number) => {
        cell.ready.then(() => {
          const lastwidget = vm._widgetSizers[ixCell-1] || {offset: 0, size: 0};
          vm._widgetSizers[ixCell].offset = lastwidget.offset + lastwidget.size;

          let outerrow = (cell.node.closest('#mosaic-root > .mosaicrow') as HTMLElement);
          if (outerrow){
            let rowcells = outerrow.querySelectorAll('.jp-Cell');
            if (cell.node == rowcells[rowcells.length - 1]) {
              // if anything queries the outerrows index, give it the index of this last cell
              outerrow.dataset.windowedListIndex = cell.dataset.windowedListIndex;
            }

            newResizeObserver.observe(outerrow);
            adjustWidgetSizesForRow(outerrow); // trigger size recalculation once
          }
      });
    });
      
    
    notebookPanel.content.update();
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


    tracker.widgetAdded.connect((sender, notebookPanel: NotebookPanel) => {
      loadMosaic(notebookPanel);
    });
  }
};

export default plugin;
