import { Panel, Widget } from '@lumino/widgets';
//import { IUnrecognizedCell } from '@jupyterlab/nbformat';



interface WidgetContainer {
  removeWidget(w: Widget): void;
}

/**
 * A flexible container for notebook cells and nested groups.
 */
export class CellGroup extends Panel {
  direction: string;
  mysubgroups: Array<CellGroup>;
  constructor(direction: 'row' | 'col' = 'col') {
    super();
    this.direction = direction;
    this.addClass('jp-CellGroup');
    this.node.style.display = 'flex';
    this.node.style.flexDirection = direction;
    this.node.style.gap = '8px'; // optional visual spacing

    this.mysubgroups = [];
  }


  protected onAfterAttach(msg: any): void {
    super.onAfterAttach(msg);
    console.log('node html', this.node.innerHTML);
    this.node.innerHTML = '<div style="border:1px solid red">I am a cell group</div>';
  }


  /**
   * Add a cell widget to the group, removing it from its previous owner
   */
  adoptCell(cell: Widget, exparent: WidgetContainer) {
    if (cell.parent) {
      cell.parent = null;
    }
    //exparent.removeWidget(cell);
    cell.parent = this;
    this.node.appendChild(cell.node);
    this.addWidget(cell); // handled safely via Lumino
  }

  /**
   * Add a nested CellGroup to this group.
   */
  addGroup() {
    const newgroup = new CellGroup((this.direction == 'col' ? 'row' : 'col'));
    this.mysubgroups.push(newgroup);
    this.addWidget(newgroup); // full nesting support
    return newgroup;
  }

  /**
   * Index this group's subgroups
   */
  getSubgroup<CellGroup>(i : number) {
    return this.mysubgroups[i];
  }
}

