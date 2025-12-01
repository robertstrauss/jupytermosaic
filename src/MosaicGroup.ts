import { Drag } from '@lumino/dragdrop';
import { MimeData } from '@lumino/coreutils';
import { Notebook, NotebookPanel, NotebookWindowedLayout, NotebookActions } from '@jupyterlab/notebook';
import { WindowedList } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
// import { ChildMessage } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { Cell, CodeCell, MarkdownCell, ICellModel } from '@jupyterlab/cells';
import { ArrayExt } from '@lumino/algorithm';
import { ObservableList, IObservableList } from '@jupyterlab/observables';

import { MosaicViewModel } from './MosaicViewModel';
import { MosaicNotebook } from './MosaicNotebookPanel';

import { runIcon } from '@jupyterlab/ui-components';
// import { Widget } from '@lumino/widgets';
// import { MosaicNotebook } from './MosaicNotebookPanel';

// import InArrows from '../style/icons/in-arrows.svg';
// import OutArrows from '../style/icons/out-arrows.svg';
// const MOSAIC_ICON_PATH = '../style/icons/mosaic-icon.svg';

// import { LabIcon } from '@jupyterlab/ui-components';

// const InArrowsIcon = new LabIcon({ name: 'mosaic:favicon', svgstr: InArrows.toString()});
// const OutArrowsIcon = new LabIcon({ name: 'mosaic:favicon', svgstr: OutArrows.toString()});

export type FlexDirection = 'row' | 'col';

export type Tile = LeafCell | Mosaic;

export class LeafCell extends Cell {
    public superMosaic: Mosaic | null = null; // mosaic tree awareness, track parent
}

// export type NestedObservableList<T> = IObservableList<T | NestedObservableList<T>>;
export class ObservableTree<T> extends ObservableList<T> {
    constructor() {
        super();
        this.changed.connect((sender: ObservableTree<T>, msg: IObservableList.IChangedArgs<T>) => {
            // TODO - propagate changes up (add and modify listeners on children?)
        }); 
    }
    splice(startIndex: number, replaceCount:number, ...values: Array<T>): Array<T> {
        const removed = [];
        for (let n = 0; n < replaceCount; n++) {
            removed.push(this.remove(startIndex));
        }
        for (let i = 0; i < values.length; i++) {
            this.insert(startIndex+i, values[i]);
        }
        return removed as Array<T>;
    }
    map(callback: Function): Array<any> {
        const out = [];
        for (let i = 0; i < this.length; i++) {
            out.push(callback(this.get(i)));
        }
        return out;
    }
    indexOf(value: T): number {
        const itemCmp = (this as any)._itemCmp;
        return ArrayExt.findFirstIndex((this as any)._array, (item: T) => {
            return itemCmp(item, value);
        });
    }
    removeValue(value: T): number {
    const itemCmp = (this as any)._itemCmp;
    const index = ArrayExt.findFirstIndex((this as any)._array, (item: T) => {
      return itemCmp(item, value);
    });
    if (index < 0) return index;
    this.remove(index);
    return index;
  }
}

// class ReparentableNotebookWindowedLayout extends NotebookWindowedLayout {
//     protected detachWidget(index: number, widget: Widget): void {
//         // don't execute detachment procedures if the widget has been moved to some other parent.
//         // otherwise a race condition arises hiding or showing the element depending on if
//         // reciever or donor parent updates first.
//         if (widget.isAttached && widget.parent && widget.parent !== this.parent) return;
//         console.log(widget, widget.parent, this, this.parent);
//         super.detachWidget(index, widget);
//     }
// }

export class Mosaic extends WindowedList<MosaicViewModel> { // like a cell (element in notebook), but also like a windowedlist/notebook (contains more cells)
    static METADATA_NAME = 'mosaic';
    static NODE_CLASS = 'mosaic-group-outer';
    static INNER_GROUP_CLASS = 'mosaic-group-inner';
    static TAB_GROUP_CLASS = 'mosaic-tabgroup';
    static TAB_BAR_CLASS = 'mosaic-tab-bar';
    static TAB_CLASS = 'mosaic-tab';
    static TAB_ACTIVE_CLASS = 'mosaic-tab-active';
    static DIR_CLASS = {
        'row': 'mosaic-row',
        'col': 'mosaic-col'
    }
    static CSS = {
        rowPaddingTop: 5,
        colPaddingLeft: 5
    }
    static defaultConfig = {
        overscanCount: 3
    }
    
    
    protected _superMosaic: Mosaic | null = null;
    public tiles: ObservableTree<Tile>;
    public mosaics: Map<string, Mosaic>;
    protected _direction: FlexDirection;
    protected _mode: 'row' | 'col' | 'tabbed';
    protected _tabBar: HTMLElement | null = null;
    protected _activeTile: Tile | null = null;
    private _selectedTiles = new Set<Tile>();

    private _lastSelectedTile: Tile | null = null;
    public runButton: HTMLElement | null = null;

    // can be hidden in super-windowed-list, like cell.
    private _placeholder: boolean;
    private _ready = new PromiseDelegate<void>();
    constructor(public groupID: string, direction: FlexDirection = 'col') {
        const tiles: ObservableTree<Tile> = new ObservableTree();
        super({
            model: new MosaicViewModel(tiles, direction, {
                overscanCount: //options.notebookConfig?.overscanCount  ??
                    Mosaic.defaultConfig.overscanCount,
                windowingActive: true
            }),
            layout: new NotebookWindowedLayout(), //ReparentableNotebookWindowedLayout(),
            renderer: /*options.renderer ??*/ WindowedList.defaultRenderer,
            scrollbar: false
        });
        // this.notebook = options.notebook;
        this.tiles = tiles;
        this.mosaics = new Map<string, Mosaic>();
        this._direction = direction;
        this._mode = direction;
        // this.direction = options.direction;
        this._placeholder = true;

        this.addClass(Mosaic.NODE_CLASS);

        this.tiles.changed.connect(this.onTreeChanged, this);

        // patch the item resize method to use width not height when in row mode
        (this as any)._onItemResize = this.onItemResize;

        (this as any)._updateTotalSize = this.updateTotalSize;


        this.viewportNode.addEventListener('scroll', (e: Event) => {
            this.onScroll(e);
            e.stopPropagation();
        });
        this.viewportNode.addEventListener('scrollend', (e: Event) => {
            this.updateOverflowShadow();
            e.stopPropagation();
        });

    }

    get notebook(): Notebook | undefined {
        // traverse up the tree to get the notebook
        return this.superMosaic!.notebook;
    }

    get direction() {
        return this._direction;
    }
    set direction(d: FlexDirection) {
        this._direction = d;
    }

    get mode(): 'row' | 'col' | 'tabbed' {
        return this._mode;
    }
    set mode(m: 'row' | 'col' | 'tabbed') {
        if (this._mode === m) {
            return;
        }
        this._mode = m;

        if (m === 'tabbed') {
            this.viewModel.windowingActive = false;
            this.node.classList.add(Mosaic.TAB_GROUP_CLASS);
            this.buildTabBar();
        } else {
            this.viewModel.windowingActive = true;
            this.node.classList.remove(Mosaic.TAB_GROUP_CLASS);
            this.destroyTabBar();
            this.direction = m;
        }
        this.viewModel.direction = this.direction;
        this.update();
    }

    get superMosaic(): Mosaic | null {
        return this._superMosaic;
    }
    set superMosaic(mosaic: Mosaic | null) {
        if (this._superMosaic !== null && mosaic !== this._superMosaic) {
            this._superMosaic!.tiles.removeValue(this);
        }
        this._superMosaic = mosaic;
    }

    get path(): Array<string> {
        return [...(this.superMosaic !== null ? this.superMosaic.path : []), this.groupID];
    }


    get id() {
        return `mosaic:${this.path.join('/')}`;
    }
    saveState(state: any) {
        Mosaic.saveMosaicState(this.notebook!, this.id, state);
    }
    loadState() {
        return Mosaic.loadMosaicState(this.notebook!, this.id);
    }


    onTreeChanged(tree:ObservableTree<Tile>, msg:IObservableList.IChangedArgs<Tile>): void {
        switch (msg.type) {
            // case 'set':
            case 'clear':
            case 'remove': {
                if (this.mode === 'tabbed') {
                    for (const tile of msg.oldValues) {
                        console.warn('remove tab', (tile as any)?.prompt);
                        this.removeTab(tile);
                    }
                }
                // for (const tile of msg.oldValues) {
                    // console.warn('removing', tile);
                    // if (tile instanceof Mosaic) {
                    //     this.mosaics.delete(tile.groupID);
                    // }
                // }
                setTimeout(() => { // timeout in case cell moved (removed then added). Don't unwrap unless its staying underpopulated.
                    this.checkEmpty();
                }, 250);
                break;
            }
            case 'set':
            case 'add': {
                if (this.mode === 'tabbed') {
                    this._updateTabs();
                    if (!this._activeTile && this.tiles.length > 0) {
                        this.setActiveTab(this.tiles.get(0));
                    }
                }
                for (const tile of msg.newValues) {
                    Mosaic.setParent(tile, this);
                    if (tile instanceof Mosaic) {
                    //     console.log('adding ', 'Mosaic:'+tile.groupID);
                    //     this.mosaics.set(tile.groupID, tile);
                    }
                    else if (tile instanceof Cell) {
                        Mosaic.setPath(tile, this.path);
                        // console.log('adding ', 'Cell:'+(tile as any).prompt);
                        tile.disposed.connect((cell:LeafCell, msg:any)=> {
                            setTimeout(() => this.checkEmpty(), 250); // allow timeout for cells to be re-added, so it doesn't collapse when moving a cell
                        });

                    }
                }
                break;
            }
        }

        console.log(this.id, 'wl indices', this.tiles.map((t:any) => t.node.dataset.windowedListIndex), this.layout.widgets.map((t:any) => t.node.dataset.windowedListIndex));
        requestAnimationFrame(() => this.update());

        // trigger update on super tree for this item
        if (this.superMosaic) {
            const idx = this.superMosaic.tiles.indexOf(this);
            if (idx > -1) this.superMosaic.onTreeChanged(this.superMosaic.tiles, {
                type: 'set',
                newIndex: idx,
                newValues: [this],
                oldIndex: idx,
                oldValues: [this]
            });
        }
    }


    

    treeGet(path: Array<string>, depth: number = 0): Mosaic {
        if (depth < path.length) {
            return (this.mosaics.get(path[depth]) as Mosaic).treeGet(path, depth+1);
        }
        return this; // i am at a depth == path length, I am the result
    }

    treeGetExisting(path: Array<string>, depth: number = 0): [Mosaic, number] {
        // get up to the deepest existing branch for the given path
        if (depth < path.length) {
            const nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch !== undefined) {
                return (nextBranch as Mosaic).treeGetExisting(path, depth+1);
            } else {
                return [this, depth];
            }
        }
        return [this, depth];
    }



    // insertLeaf(branch: Mosaic, cell: Cell, idx: number = 0) {
    // }
    addTile(groupID: string = '', index: number = -1): Mosaic {
        if (groupID == '') groupID = Mosaic.newUGID();
        const newMosaic = new Mosaic(groupID);//, this.options);
        this.splice(index, 0, newMosaic);
        return newMosaic;
    }
    growBranch(path: Array<string>, branchsIxs: Array<number> = [], depth: number = 0): Mosaic {
        if (depth < path.length) {
            let nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch == undefined) {
                nextBranch = this.addTile(path[depth], (branchsIxs.length > depth ? branchsIxs[depth] : -1));
            }
            return (nextBranch as Mosaic).growBranch(path, branchsIxs, depth+1);
        }
        return this;
    }

    // removeLast(tile: Tile) {
    //     const ix = ArrayExt.lastIndexOf(this.tiles, tile);
    //     this.splice(ix, 1);
    //     // this.checkEmpty();
    // }

    splice(startIndex: number, replaceCount: number, ...tiles: Array<Tile>) {
        if (startIndex < 0) startIndex = this.tiles.length;
        this.tiles.splice(startIndex, replaceCount, ...tiles);
    }

    checkEmpty() {
        // unwrap if only holding one or no tiles
        if (this.tiles.length < 2) {
            const subtile = this.tiles.get(0);
            if (subtile && subtile instanceof Mosaic) {
                subtile.unwrap(); // remove double-wrap (to preserve flex direction)
            }
            this.unwrap();
        }
    }


    unwrap() {
        if (!this.superMosaic) return;

        // remove self from superMosaic
        const idx = this.superMosaic.tiles.removeValue(this); // I am now dereferrenced, I should be garbage collected.
        // console.log('unwrapping:', this.path, Mosaic.showMosaic(this), 'index in super:', idx, this.superMosaic);
        if (this.tiles.length > 0) { // insert my contents (if any) where I was
            this.superMosaic.tiles.splice(idx, 0, ...this.tiles);
        }
        this.dispose();
    }

    getLeaf(leafIx: number): [[Mosaic, LeafCell] | null, number] {
        // linearly walk through leafs (Cells) according to each sub groups order until the desired leafindex is reached
        // returns: last parent mosaic and id of leaf in parent or null if not found, and index of leaf in parent, (or total number of leaves if not found)
        let increment = 1;
        let i = 0;
        if (leafIx < 0) {
            increment = -1;
            i = -1;
        }
        for (const tile of (leafIx > 0 ? this.tiles : Array.from(this.tiles).reverse())) {
            if (tile instanceof Cell) {
                if (i == leafIx) {
                    return [[this, tile], i]; // found desired leaf
                }
                i += increment; // count leaf
            } else { // branch
                const [stemAndLeaf, leafNum] = tile.getLeaf(leafIx-i);

                if (stemAndLeaf !== null) {
                    return [stemAndLeaf, leafNum];
                }
                i += increment * leafNum!; // count all leaves from this branch
            }
        }
        return [null, i]; // nLeafs > number of leaves I have
    }

    findGroup(node: Node): Array<string> | null {
        // search the tree depth-first for a mosaic group with the specified node
        for (const groupID in this.mosaics) {
            if (this.mosaics.get(groupID)!.node === node) {
                return [groupID];
            }
            const found = this.mosaics.get(groupID)!.findGroup(node);
            if (found !== null) {
                return [groupID, ...found];
            }
        }
        return null;
    }

    // findStem(leaf: Cell, reverse = true): Mosaic | null {
    //     let list;
    //     if (reverse) list = this.tiles.slice().reverse();
    //     else list = this.tiles;

    //     for (const tile of list) {
    //         if (tile instanceof Cell) {
    //             if (tile === leaf) return this;
    //         } else {
    //             return tile.findStem(leaf, reverse);
    //         }
    //     }
    //     return null;
    // }



    
    







    /* based on @jupyterlab/cells/Cell */

    isPlaceholder(): boolean {
        return this.placeholder;
    }

    get placeholder(): boolean {
        return this._placeholder;
    }

    protected set placeholder(v: boolean) {
        console.warn('PLACEHOLDER SET');
        if (this._placeholder !== v && v === false) {
            this.initializeDOM();
            this._placeholder = v;
            this._ready.resolve();
        }
    }

    protected initializeDOM(): void {
        console.log('INITIALIZING DOM');
        if (!this.placeholder) {
            return;
        }

    }

    get ready(): Promise<void> {
        return this._ready.promise;
    }


    async runAll() {
        for (const tile of this.tiles) {
            if (tile instanceof Mosaic) {
                tile.runAll();
            }
            else if (tile instanceof Cell) {
                if (!this.notebook) return console.warn('No notebook! Cannot run cells');
                const context = (this.notebook?.parent as NotebookPanel).sessionContext
                if (tile instanceof CodeCell) {
                    try {
                        await CodeCell.execute(tile, context);
                    } catch (e) {
                        console.error('Cell exec err', e);
                    }
                } else if (tile instanceof MarkdownCell) {
                    tile.rendered = true;
                }
            }
        }
    }

    /** Notebook-like methods */

    public onAfterAttach(msg: Message): void {
        this.update(); // will attach inner cells according to viewModel widgetRenderer
        super.onAfterAttach(msg);

        this.direction = (this.parent as Mosaic).direction == 'col' ? 'row' : 'col', // invert direction of parent 
        // console.log('attached as', this.direction, 'to',  this.parent, (this.parent as Mosaic).direction);
        this.viewModel.direction = this.direction;

        this.viewportNode.dataset.mosaicDirection = this.direction;
        this.viewportNode.classList.add(Mosaic.INNER_GROUP_CLASS, Mosaic.DIR_CLASS[this.direction]);

        this.updateOverflowShadow(); // update shadowing baased on scroll

        if (!this.runButton) {
            this.runButton = document.createElement('div');
            this.runButton.appendChild(runIcon.element());
            this.runButton.classList.add('mosaic-group-run-btn');
            this.runButton.onclick = () => this.runAll();
        }
        this.node.appendChild(this.runButton);

        // tabbed layout mode
        if (this.loadState().tabbed) {
            this.mode = 'tabbed';
        } else {
            this.viewportNode.classList.remove(Mosaic.TAB_GROUP_CLASS);
        }

        if (this.notebook) {
            this.notebook.activeCellChanged.connect(this.onActiveCellChanged, this);
        }

        // drag in the gaps of a row to resize elements
        const w = this.loadState().elWidth;
        if (Number.isFinite(w)) this.setElWidth(w);
        let dragging = false;
        this.node.onmousedown = (ev: MouseEvent) => {
            if (ev.target === this.viewportNode) dragging = true;
        }
        const endDrag = (ev: MouseEvent) => {
            dragging = false;
            if (this.direction == 'row') {
                const elWidth = this.layout.widgets[0].node.getBoundingClientRect().width;
                this.saveState({...this.loadState(), elWidth});
            }
        }
        this.node.onmouseleave = endDrag;
        this.node.onmouseup = endDrag;
        this.node.onmousemove = (ev: MouseEvent) => {
            if (dragging && this.direction == 'row') {
                const oldWidth = this.layout.widgets[0].node.getBoundingClientRect().width;
                this.setElWidth(oldWidth+ev.movementX);
            }
        }
    }
    protected setElWidth(width: number) {
        this.node.style.setProperty('--el-width', `${width}px`);
    }

    public onBeforeDetach(msg: Message): void {
        if (this.notebook) {
            this.notebook.activeCellChanged.disconnect(this.onActiveCellChanged, this);
        }
        super.onBeforeDetach(msg);
    }

    protected onActiveCellChanged(notebook: Notebook, cell: Cell | null): void {
        if (cell && this.mode === 'tabbed') {
            // find which of my tiles contains this cell
            let containingTile: Tile | undefined = undefined;
            for (const tile of this.tiles) {
                if (tile === cell) {
                    containingTile = tile;
                    break;
                }
                if (tile instanceof Mosaic) {
                    let superMosaic = (cell as LeafCell).superMosaic;
                    while(superMosaic) {
                        if (superMosaic === tile) {
                            containingTile = tile;
                            break;
                        }
                        superMosaic = superMosaic.superMosaic as Mosaic;
                    }
                }
                if (containingTile) break;
            }

            if (containingTile) {
                this.setActiveTab(containingTile);
            }
        }
    }

    buildTabBar(): void {
        if (this._tabBar) {
            this.destroyTabBar();
        }
        this._tabBar = document.createElement('div');
        this._tabBar.classList.add(Mosaic.TAB_BAR_CLASS);
        this.node.prepend(this._tabBar);
        
        // After update, all widgets are attached. Hide all except the first.
        requestAnimationFrame(() => {
            if (this.tiles.length > 0) {
                this.setActiveTab(this.tiles.get(0));
            } else {
                this._updateTabs();
            }
        });
    }

    destroyTabBar(): void {
        if (this._tabBar) {
            this._tabBar.remove();
            this._tabBar = null;
        }
        // show all tiles so windowed list can manage them
        for (const tile of this.tiles) {
            tile.show();
        }
        this._clearSelection(false);
        this._lastSelectedTile = null;
        this._activeTile = null;
    }

    private _updateTabs(): void {
        if (!this._tabBar) {
            console.log('no tab bar');
            return;
        }

        // Clear existing tabs
        while (this._tabBar.firstChild) {
            this._tabBar.removeChild(this._tabBar.firstChild);
        }
    
        // Re-create tabs from state
        for (const tile of this.tiles) {
            const tab = document.createElement('div');
            tab.classList.add(Mosaic.TAB_CLASS);
            const title = document.createElement('pre');
            tab.appendChild(title);
            title.textContent = this.getTileTitle(tile);
    
            if (this._selectedTiles.has(tile)) {
                tab.classList.add('mosaic-tab-selected');
            }
            if (this._activeTile === tile) {
                tab.classList.add(Mosaic.TAB_ACTIVE_CLASS);
                tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                tile.show();
            } else {
                tile.hide();
            }

            tab.addEventListener('mousedown', (event: MouseEvent) => {
                let wasDrag = false;
                const onMouseMove = (moveEvent: MouseEvent) => {
                    const dx = Math.abs(moveEvent.clientX - event.clientX);
                    const dy = Math.abs(moveEvent.clientY - event.clientY);
                    if (dx > 4 || dy > 4) { // Threshold to detect a drag
                        wasDrag = true;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        this.onTabDragStart(tile, event);
                    }
                };
                const onMouseUp = (upEvent: MouseEvent) => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    if (!wasDrag) {
                        this.handleTabClick(tile, upEvent);
                    }
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
            });
    
            (tile as any).__tab = tab;
            this._tabBar.appendChild(tab);
        }
    
        // Add the '+' button
        const addButton = document.createElement('div');
        addButton.textContent = '+';
        addButton.classList.add('mosaic-add-tab-button');
        addButton.onclick = () => this.addNewCell();
        this._tabBar.appendChild(addButton);
    }
    
    handleTabClick(tile: Tile, event: MouseEvent): void {
        if (event.shiftKey && this._lastSelectedTile) {
            // Extend selection
            const lastIndex = this.tiles.indexOf(this._lastSelectedTile);
            const currentIndex = this.tiles.indexOf(tile);
            const [start, end] = [lastIndex, currentIndex].sort((a, b) => a - b);
            
            this._clearSelection(false); // Don't re-render yet
            
            for (let i = start; i <= end; i++) {
                const tileInRange = this.tiles.get(i);
                this._selectedTiles.add(tileInRange);
                (tileInRange as any).__tab?.classList.add('mosaic-tab-selected');
            }
        } else {
            // Single selection
            this._clearSelection(false); // Don't re-render yet
            // this._selectedTiles.add(tile);
            this._lastSelectedTile = tile;
        }
        
        this.setActiveTab(tile, false);
    }

    private _clearSelection(update = true): void {
        for (const tile of this._selectedTiles) {
            (tile as any).__tab?.classList.remove('mosaic-tab-selected');
        }
        this._selectedTiles.clear();
        if (update) {
            this._updateTabs();
        }
    }

    onTabDragStart(draggedTile: Tile, event: MouseEvent): void {
        // If the dragged tab is not selected, select only it.
        if (!this._selectedTiles.has(draggedTile)) {
            this._clearSelection(false);
            this._selectedTiles.add(draggedTile);
            this._lastSelectedTile = draggedTile;
            this._updateTabs();
        }
    
        // Gather all cells from all selected tiles.
        let cellsToDrag: Cell[] = [];
        this._selectedTiles.forEach(tile => {
            cellsToDrag = cellsToDrag.concat(this._getAllCells(tile));
        });
    
        if (cellsToDrag.length === 0) {
            return;
        }
    
        const mimeData = new MimeData();
        mimeData.setData('internal:cells', cellsToDrag);
        mimeData.setData('application/vnd.jupyter.cells', cellsToDrag.map(c => c.model.toJSON()));
    
        const drag = new Drag({
            mimeData,
            source: this.notebook, 
            dragImage: this._createDragImage(this._selectedTiles.size)
        });
    
        drag.start(event.clientX, event.clientY);
    }
    
    private _getAllCells(tile: Tile): Cell[] {
        if (tile instanceof Cell) {
            return [tile];
        }
        if (tile instanceof Mosaic) {
            let cells: Cell[] = [];
            for (const subTile of tile.tiles) {
                cells = cells.concat(this._getAllCells(subTile));
            }
            return cells;
        }
        return [];
    }

    private _createDragImage(count: number): HTMLElement {
        const dragImage = document.createElement('div');
        dragImage.className = 'jp-dragImage';
        dragImage.textContent = `${count} item${count > 1 ? 's' : ''}`;
        return dragImage;
    }
    
    removeTab(tile: Tile): void {
        this._selectedTiles.delete(tile);
        if (this._lastSelectedTile === tile) {
            this._lastSelectedTile = null;
        }
        this._updateTabs();
    }

    setActiveTab(tile: Tile, update_last = true): void {
        if (update_last) {
            this._lastSelectedTile = tile;
        }
        if (this._activeTile === tile) {
            return;
        }
        
        this._activeTile = tile;

        if (this.notebook && this._activeTile) {
            let cellToActivate: Cell | null = null;
            if (this._activeTile instanceof Cell) {
                cellToActivate = this._activeTile;
            } else if (this._activeTile instanceof Mosaic) {
                // find first cell in this mosaic
                const [leafInfo, ] = this._activeTile.getLeaf(0);
                if (leafInfo) {
                    cellToActivate = leafInfo[1];
                }
            }

            if (cellToActivate) {
                const index = this.notebook.widgets.indexOf(cellToActivate);
                if (index > -1) {
                    this.notebook.activeCellIndex = index;
                }
            }
        }
        this._updateTabs();
    }

    getTileTitle(tile: Tile): string {
        if (tile instanceof Mosaic) {
            return `${tile.tiles.length} items: ${tile.getTileTitle(tile.getLeaf(0)[0]![1])}`;
        } else {
            let title = '';
            if (tile instanceof CodeCell) {
                title = (`[${(tile as any).prompt || ' '}]: `) || '';
            }
            const content = tile.model.sharedModel.getSource();
            if (content.length > 15) {
                title += content.slice(0,12).split('\n')[0] + '...';
            } else {
                title += content.split('\n')[0];
            }
            if (title.trim() === '') {
                title = 'Cell';
            }
            return title;
        }
    }

    addNewCell(): void {
        const notebook = this.notebook;
        if (!notebook || !notebook.model) {
            return;
        }
        const model = notebook.model;
        // Define a function to handle the addition of the new cell
        const handleNewCell = (sender: any, args: IObservableList.IChangedArgs<ICellModel>) => {
            if (args.type === 'add') {
                // Assuming the last added cell is the one we just created.
                const newCellModel = args.newValues[args.newValues.length - 1];
                
                // Disconnect the signal handler
                model.cells.changed.disconnect(handleNewCell);

                const newCellWidgetIndex = ArrayExt.findFirstIndex(notebook.widgets, w => w.model === newCellModel);
                const newCellWidget = notebook.widgets[newCellWidgetIndex];

                if (newCellWidget) {
                    // Add to current mosaic group's tiles
                    this.splice(this.tiles.length, 0, newCellWidget as LeafCell);
                    
                    // Update cell metadata to reflect its new path in the mosaic
                    Mosaic.setPath(newCellWidget, this.path);
                    
                    // Set the new cell as the active tab
                    this.setActiveTab(newCellWidget as LeafCell);
                }
            }
        };

        // Connect to the cells changed signal BEFORE triggering the action
        model.cells.changed.connect(handleNewCell);

        // Set the active cell in the notebook to the last cell of the current tab group
        // so that `insertBelow` works as expected.
        if (this._activeTile && this._activeTile instanceof Cell) {
            const index = notebook.widgets.indexOf(this._activeTile);
            if (index > -1) {
                notebook.activeCellIndex = index;
            }
        } else if (this.tiles.length > 0) {
            // Fallback to the last cell in the group if the active tile isn't a cell
            const lastTile = this.tiles.get(this.tiles.length - 1);
             if (lastTile instanceof Cell) {
                const index = notebook.widgets.indexOf(lastTile);
                if (index > -1) {
                    notebook.activeCellIndex = index;
                }
             }
        }

        // Trigger the action to insert a new cell
        NotebookActions.insertBelow(notebook);
    }
    protected updateOverflowShadow(): void {
        // tag things scrolled all the way to one side, so CSS styling shows shadow on overflowing elements
        if (this.direction == 'col') {
            if (this.viewportNode.scrollTop < 10) {
                this.dataset.mosaicScrolledSide = 'top';
            }
            else if (this.viewportNode.scrollTop > this.viewportNode.scrollHeight-this.viewportNode.clientHeight-10) {
                this.dataset.mosaicScrolledSide = 'bottom';
            } else {
                this.dataset.mosaicScrolledSide = '';
            }
        }
        else if (this.direction == 'row') {
            if (this.viewportNode.scrollLeft < 10) {
                this.dataset.mosaicScrolledSide = 'left';
            }
            else if (this.viewportNode.scrollLeft > this.viewportNode.scrollWidth-this.viewportNode.clientWidth-10) {
                this.dataset.mosaicScrolledSide = 'right';
            } else {
                this.dataset.mosaicScrolledSide = '';
            }
        }
    }

    protected onResize(msg: any): void {
        // add width too?
        const previousHeight = this.viewModel.height;
        this.viewModel.height =
            msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
        if (this.viewModel.height !== previousHeight) {
            void (this as any)._updater.invoke();
        }
        super.onResize(msg);
        void (this as any)._updater.invoke();
    }

    protected onItemResize(entries: ResizeObserverEntry[]) { // @jupyterlab/ui-components/windowedlist.ts:1497
        (this as any)._resetScrollToItem();

        if (this.isHidden || this.isParentHidden) {
            return;
        }

        for (const dim of ['row', 'col']) {
            const newSizes: { index: number; size: number }[] = [];
            for (let entry of entries) {
                const size = (dim == 'row' ? 
                            entry.borderBoxSize[0].inlineSize : 
                            entry.borderBoxSize[0].blockSize
                        );// + (2*parseFloat(getComputedStyle(entry.target).margin));
                console.log('resizer size', dim, size, entry.target, entry);
                // Update size only if item is attached to the DOM
                if (entry.target.isConnected && size > 0) {
                    // Rely on the data attribute as some nodes may be hidden instead of detach
                    // to preserve state.
                    newSizes.push({
                        index: parseInt(
                            (entry.target as HTMLElement).dataset.windowedListIndex!,
                            10
                        ),
                        size: size
                    });
                }
            }

            // If some sizes changed
            if (this.viewModel.setWidgetSize(newSizes, dim as FlexDirection)) {
                (this as any)._scrollBackToItemOnResize();
                // Update the list
                this.update();
            }
            requestAnimationFrame(() => this.update());
        }
    }


    get innerElement(): HTMLElement {
        return (this as any)._innerElement;
    }
    updateTotalSize(): void {
        if (this.viewModel.windowingActive) {
            if (this.viewportNode.dataset.isScrolling == 'true') {
                // Do not update while scrolling, delay until later
                (this as any)._requiresTotalSizeUpdate = true;
                return;
            }
            let estimatedTotalHeight = this.viewModel.getEstimatedTotalHeight();
            console.log('estimated total height', this.path, estimatedTotalHeight);
            if (this.direction == 'row') {
                estimatedTotalHeight += 2*Mosaic.CSS.rowPaddingTop;
            }
            // Update inner container height
            this.innerElement.style.height = `${estimatedTotalHeight}px`;

            let estimatedTotalWidth = this.viewModel.getEstimatedTotalWidth();
            if (this.direction == 'col') {
                estimatedTotalWidth += 2*Mosaic.CSS.colPaddingLeft;
            }
            this.innerElement.style.width = `${estimatedTotalWidth}px`

            if (   (this.viewportNode.scrollWidth > this.viewportNode.clientWidth)
                || (this.viewportNode.scrollHeight > this.viewportNode.clientHeight)
            ) {
                this.node.classList.add('mosaic-scrolling');
                this.node.style.setProperty('--scroll-width', `${this.viewportNode.scrollWidth}px`);
                this.node.style.setProperty('--scroll-height', `${this.viewportNode.scrollHeight}px`);
            } else {
                this.node.classList.remove('mosaic-scrolling');
            }
        }
    }

    getEstimatedTotalHeight(): number {
        return this.viewModel.getEstimatedTotalHeight();
    }
    getEstimatedTotalWidth(): number {
        return this.viewModel.getEstimatedTotalWidth();
    }



    renderCellOutputs(index: number): void { // @jupyterlab
        // updated to deal with submosaics
        const tile = this.viewModel.widgetRenderer(index) as Cell;
        if (tile instanceof CodeCell && tile.isPlaceholder()) { const cell = tile as CodeCell;
            cell.dataset.windowedListIndex = `${index}`;
            this.layout.insertWidget(index, cell);
            // if (this.notebook.notebookConfig.windowingMode === 'full') {
                // We need to delay slightly the removal to let codemirror properly initialize
                requestAnimationFrame(() => {
                    this.layout.removeWidget(cell);
                });
            // }
        } else if (tile instanceof Mosaic && (tile as Mosaic).isPlaceholder()) { const mosaic = tile as Mosaic;
            for (let i = 0; i < mosaic.tiles.length; i++) {
                mosaic.renderCellOutputs(i);
            }
        }
    }


    detachWidget() {}
    
}


export namespace Mosaic {
    export function showMosaic(t:Tile): any { // debugging function reducing mosaic to nested list of cell prompts
        if (t instanceof Mosaic || t instanceof MosaicNotebook) {
            return (t.tiles as any)._array.map(Mosaic.showMosaic);
        } else if (t instanceof Cell) {
            return 'Cell:'+(t as any).prompt;
        } else {
            return t;
        }
    }
    export function getPath(cell:Cell): Array<string> | undefined {
        return cell.model!.getMetadata(Mosaic.METADATA_NAME) as Array<string>;
    }
    export function setPath(cell:Cell, path:Array<string>): void {
        // console.log('path updated', Mosaic.getPath(cell), path);
        // if (Mosaic.getPath(cell)?.join('/') !== path.join('/')) {
        //     setTimeout(() => {
        //         const nb = (cell as LeafCell).superMosaic?.notebook;
        //         const index = nb?.widgets.findIndex(c => c === cell);
        //         if (index !== undefined) (nb as MosaicNotebook).mosaicInsert(index);
        //     }, 250);
        // }
        return cell.model!.setMetadata(Mosaic.METADATA_NAME, path);
    }
    export function setParent(tile:Tile, mosaic: Mosaic | null) {
        // console.warn('set parent', tile instanceof Cell ? 'Cell:'+(tile as any).prompt : 'mosaic:'+tile.path, tile.superMosaic, tile.parent, mosaic);
        if (tile.superMosaic && tile.superMosaic !== mosaic) {
            tile.superMosaic.tiles.removeValue(tile);
        }
        tile.superMosaic = mosaic;
        // tile.parent = mosaic; // important: need to check parentage before removing, in case it was just moved to another list.
    }
    export function divergeDepth(path1: Array<string> | undefined, path2: Array<string> | undefined): number {
        if (path1 == undefined || path2 == undefined) return 0;
        for (let i = 0; i < path1.length; i++) {
            if (path2.length <= i || path1[i] !== path2[i]) return i;
        }
        return path1.length;
    }
    export function newUGID() {
        return "mg-"+crypto.randomUUID();
    }
    export function loadMosaicState(notebook: Notebook, id: string): any {
        return notebook!.model!.getMetadata(id) || {};
    }
    export function saveMosaicState(notebook: Notebook, id: string, state: any) {
        const oldstate = Mosaic.loadMosaicState(notebook, id);
        notebook!.model!.setMetadata(id, {...oldstate, ...state}); 
    }
    export interface IOptions extends Notebook.IOptions{
        direction: FlexDirection;
        notebook: Notebook;
    }
}
