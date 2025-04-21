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
import { Cell } from '@jupyterlab/cells';
//import { ICellModel } from '@jupyterlab/cells';

//import { CellGroup } from './CellGroup';

import { recursecreatemosaic } from './mosaic-core';

/*
interface Tree extends Array<Tree | string> { }
 
function recursecreatemosaicgridstring(tree: Tree, gridstring='', prefix='mosaic') {
  console.log('rec create', tree, gridstring, prefix);
  tree.forEach((subtree, index) => {
    if (typeof subtree === "string" || subtree.length == 0) {
      gridstring += `[${prefix}-${index}] 1fr `;
    } else if (subtree instanceof Array<any>) { 
      gridstring += recursecreatemosaicgridstring(subtree as Tree, gridstring, prefix=`${prefix}-${index}`);
    }
  });
  return gridstring;
}

function getGroupNum(tree: Tree, num: number): (Array<any> | null) {
  let indx = 0;
  tree.forEach(leaforbranch => {
    if (leaforbranch instanceof Array<any>) {
      if (indx == num) {
        return leaforbranch;
      }
      indx += 1;
    }
  });
  return null;
}
*/
function loadMosaic(notebookPanel: NotebookPanel){
  // A notebook has been opened
  console.log('Notebook opened:', notebookPanel);

  // Wait for the notebook to be fully ready (e.g., content and kernel)
  notebookPanel.revealed
    .then(() => notebookPanel.sessionContext.ready)
    .then(() => {

      //const rootcol = new CellGroup('col');
      //console.log('rootcol', rootcol);
      //notebookPanel.content.layout.addWidget(rootcol);
      //rootcol.parent = notebookPanel.content.layout.parent;
      const root = document.createElement('div');
      notebookPanel.content.node.dataset.jpCellView = 'all';
      notebookPanel.content.update();


      `
      const cellHolder = (notebookPanel.content.node.getElementsByClassName('jp-WindowedPanel-viewport')[0] as HTMLElement);
      const gridTemplateCols : Tree = [];
      const gridTemplateRows : Tree = [];
      `
      notebookPanel.content.widgets.forEach((cell : Cell, ixCell: number) => {
        /*
        const mosaicmd = cell.model.sharedModel.metadata.mosaic;
        const row : Array<any> = ['mosaic'];
        const col : Array<any> = ['mosaic'];
        let subTempCol = gridTemplateCols;
        let subTempRow = gridTemplateRows;
        if (mosaicmd instanceof Array<number>) {
          mosaicmd.forEach((rcnum, indx) => {
            rcnum = Number(rcnum);
            if (!isNaN(rcnum)) {
              if (indx % 2 == 1) {
                col.push(rcnum);

                let subgroup = getGroupNum(subTempCol, rcnum);
                if (subgroup == null) {
                  subgroup = [];
                }
                subTempCol = (subgroup as Tree);
              } else {
                row.push(rcnum);
                let subgroup = getGroupNum(subTempRow, rcnum);
                if (subgroup == null) {
                  subgroup = [];
                }
                subTempRow = (subgroup as Tree);
              }
            } else {
              // do something to repair metadata?
              (cell.model.sharedModel.metadata.mosaic as Array<number>).slice(indx);
            }
          });
          
          // we've arrived at the end of the subdivision tree. Add leaf 'cell' and count how many others are in this subdivision
          console.log('sub', subTempCol, subTempRow, mosaicmd, mosaicmd.length % 2);
          let numColSiblings = subTempCol.push('cell');
          let numRowSiblings = subTempRow.push('cell');

          // Specify this cell's coordinates based on subdivision tree in rows and columns, and how many were in that branch before
          console.log('cj', col.join('-'), numColSiblings);
          console.log('rj', row.join('-'), numRowSiblings);
          cell.node.style.gridColumn = `${col.join('-')} ${numColSiblings} / span 1`;
          cell.node.style.gridRow = `${row.join('-')} ${numRowSiblings} / span 1`;
        }
        */
        cell.ready.then(stuff => {
        const bottomgroup = recursecreatemosaic(cell, root, 0);
        cell.parent = null;
        bottomgroup.append(cell.node);
/*
        console.log(stuff);
        console.log(cell);
        let supergroup = rootcol;
        // iterate through the cells group locator list, traverse down the group hierarchy to get its immediate wrapper
        const mosaicmd = cell.model.sharedModel.metadata.mosaic;
        if (mosaicmd instanceof Array<number>) {
          mosaicmd.forEach((subgroupindex, ix: number) => {
            subgroupindex = Number(subgroupindex);
            if (!isNaN(subgroupindex)) {
              const sg = supergroup.getSubgroup(subgroupindex);
              if (sg instanceof CellGroup) {
                supergroup = sg;
              }
              else {
                // the group the cell is supposed to be in hasn't been created in the DOM yet; do this and continue iterating
                supergroup = supergroup.addGroup();
              }
            }
          });
          }
        supergroup.adoptCell(cell, notebookPanel.content.layout);
*/
        });
      });
      `
      cellHolder.style.display = 'grid';
      //cellHolder.style.gridTemplateColumns = '1fr '.repeat(maxcol);
      console.log('gtr', gridTemplateRows);
      console.log('gtc', gridTemplateCols);
      //cellHolder.style.gridTemplateRows = '1fr '.repeat(maxrow);
      cellHolder.style.gridTemplateRows    = recursecreatemosaicgridstring(gridTemplateRows);
      cellHolder.style.gridTemplateColumns = recursecreatemosaicgridstring(gridTemplateCols);
      console.log('chsg', cellHolder.style.gridTemplateRows);
      console.log('rcmgs', recursecreatemosaicgridstring(gridTemplateCols));
      `

      //(notebookPanel.content.widgets as any[]).push(rootcol);
      //notebookPanel.content.layout.insertWidget(0, rootcol);
      //notebookPanel.content.node.appendChild(rootcol.node);
      //notebookPanel.node.appendChild(root);
      //cellHolder.appendChild(root);
      console.log(root);

    });


  //notebook.layout.removeWidget(cell);
  //notebook.layout.addWidget(cellGroup);
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
