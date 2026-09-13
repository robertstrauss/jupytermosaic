
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { Menu } from '@lumino/widgets';
import { CustomDockPanel } from './panel';
import { Widget } from '@lumino/widgets';

/**
 * A simple widget for content.
 */
class ContentWidget extends Widget {
  constructor(name: string) {
    super();
    this.addClass('content-widget');
    this.title.label = name;
    this.title.closable = true;
    const content = document.createElement('div');
    content.textContent = `Content for ${name}`;
    this.node.appendChild(content);
  }
}

/**
 * Initialization data for the jupyterlab-custom-dockpanel extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-custom-dockpanel',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ILauncher],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    launcher: ILauncher | null
  ) => {
    const { commands, shell } = app;
    const command = 'custom-dockpanel:open';
    const label = 'Open Custom Dock Panel';
    const category = 'Custom Extensions';

    commands.addCommand(command, {
      label,
      execute: () => {
        const panel = new CustomDockPanel();
        const widget1 = new ContentWidget('Widget 1');
        const widget2 = new ContentWidget('Widget 2');
        const widget3 = new ContentWidget('Widget 3');

        panel.addWidget(widget1);
        panel.addWidget(widget2, { mode: 'split-right', ref: widget1 });
        panel.addWidget(widget3, { mode: 'split-bottom', ref: widget2 });

        shell.add(panel, 'main');
      }
    });

    palette.addItem({ command, category });

    if (launcher) {
      launcher.add({
        command,
        category: 'Other',
        rank: 1
      });
    }

    // Add menu item
    const menu = new Menu({ commands });
    menu.title.label = 'Custom Panels';
    app.shell.add(menu, 'menu', { rank: 500 });
    menu.addItem({ command });
  }
};

export default extension;
