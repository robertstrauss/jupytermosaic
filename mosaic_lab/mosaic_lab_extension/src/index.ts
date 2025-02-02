import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';
//import { Slot } from '@lumino/signaling';
//import { markdownIcon, runIcon } from '@jupyterlab/ui-components';


/**
 * Initialization data for the mosaicLab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'mosaicLab:plugin',
  description: 'Free your code from the archaic linear \'scroll\' of old, and embrace the freedom of flexible, gridded, dashboarding layouts. ',
  autoStart: true,
  optional: [ISettingRegistry],
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension mosaicLab is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('mosaicLab settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for mosaicLab.', reason);
        });
    }
    
    console.log('what the fuck is an inotebooktracker?');
    console.log(tracker);
    
    let mywidget = new Widget();
    mywidget.node.style.display = "flex";
    mywidget.node.style.flexDirection = "row";
    mywidget.node.style.border = "1px solid red";
  
    let justgimmethecontent = (sender:any, panel:NotebookPanel): void => {
      console.log(panel.content);
      panel.content.node.prepend(mywidget.node);
      console.log(panel.content.widgets.length);
      /*panel.content.activeCellChanged.connect((sender:any, cell:any): void => {
        console.log(cell);
        if (cell is not null){
          mywidget.node.appendChild(cell.node);
        }
      });*/
    };
    tracker.widgetUpdated.connect(justgimmethecontent);
    tracker.widgetAdded.connect(justgimmethecontent);
  }
};

export default plugin;
