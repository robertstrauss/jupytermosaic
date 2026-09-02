"use strict";
(self["webpackChunkmosaic"] = self["webpackChunkmosaic"] || []).push([["lib_index_js"],{

/***/ "./lib/MosaicGroup.js":
/*!****************************!*\
  !*** ./lib/MosaicGroup.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LeafCell: () => (/* binding */ LeafCell),
/* harmony export */   Mosaic: () => (/* binding */ Mosaic),
/* harmony export */   ObservableTree: () => (/* binding */ ObservableTree)
/* harmony export */ });
/* harmony import */ var _lumino_dragdrop__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lumino/dragdrop */ "webpack/sharing/consume/default/@lumino/dragdrop");
/* harmony import */ var _lumino_dragdrop__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_lumino_dragdrop__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lumino_coreutils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @lumino/coreutils */ "webpack/sharing/consume/default/@lumino/coreutils");
/* harmony import */ var _lumino_coreutils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_lumino_coreutils__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @jupyterlab/ui-components */ "webpack/sharing/consume/default/@jupyterlab/ui-components");
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @jupyterlab/cells */ "webpack/sharing/consume/default/@jupyterlab/cells");
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _lumino_algorithm__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @lumino/algorithm */ "webpack/sharing/consume/default/@lumino/algorithm");
/* harmony import */ var _lumino_algorithm__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_lumino_algorithm__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _jupyterlab_observables__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @jupyterlab/observables */ "webpack/sharing/consume/default/@jupyterlab/observables");
/* harmony import */ var _jupyterlab_observables__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_observables__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _MosaicViewModel__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./MosaicViewModel */ "./lib/MosaicViewModel.js");
/* harmony import */ var _MosaicNotebookPanel__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./MosaicNotebookPanel */ "./lib/MosaicNotebookPanel.js");




// import { ChildMessage } from '@lumino/widgets';







class LeafCell extends _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell {
    constructor() {
        super(...arguments);
        this.superMosaic = null; // mosaic tree awareness, track parent
    }
}
// export type NestedObservableList<T> = IObservableList<T | NestedObservableList<T>>;
class ObservableTree extends _jupyterlab_observables__WEBPACK_IMPORTED_MODULE_6__.ObservableList {
    constructor() {
        super();
        this.changed.connect((sender, msg) => {
            // TODO - propagate changes up (add and modify listeners on children?)
        });
    }
    splice(startIndex, replaceCount, ...values) {
        const removed = [];
        for (let n = 0; n < replaceCount; n++) {
            removed.push(this.remove(startIndex));
        }
        for (let i = 0; i < values.length; i++) {
            this.insert(startIndex + i, values[i]);
        }
        return removed;
    }
    map(callback) {
        const out = [];
        for (let i = 0; i < this.length; i++) {
            out.push(callback(this.get(i)));
        }
        return out;
    }
    indexOf(value) {
        const itemCmp = this._itemCmp;
        return _lumino_algorithm__WEBPACK_IMPORTED_MODULE_5__.ArrayExt.findFirstIndex(this._array, (item) => {
            return itemCmp(item, value);
        });
    }
    removeValue(value) {
        const itemCmp = this._itemCmp;
        const index = _lumino_algorithm__WEBPACK_IMPORTED_MODULE_5__.ArrayExt.findFirstIndex(this._array, (item) => {
            return itemCmp(item, value);
        });
        if (index < 0)
            return index;
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
class Mosaic extends _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__.WindowedList {
    constructor(groupID, direction = 'col') {
        const tiles = new ObservableTree();
        super({
            model: new _MosaicViewModel__WEBPACK_IMPORTED_MODULE_7__.MosaicViewModel(tiles, direction, {
                overscanCount: //options.notebookConfig?.overscanCount  ??
                Mosaic.defaultConfig.overscanCount,
                windowingActive: true
            }),
            layout: new _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.NotebookWindowedLayout(), //ReparentableNotebookWindowedLayout(),
            renderer: /*options.renderer ??*/ _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__.WindowedList.defaultRenderer,
            scrollbar: false
        });
        this.groupID = groupID;
        this._superMosaic = null;
        this._tabBar = null;
        this._activeTile = null;
        this._selectedTiles = new Set();
        this._lastSelectedTile = null;
        this.runButton = null;
        this._ready = new _lumino_coreutils__WEBPACK_IMPORTED_MODULE_1__.PromiseDelegate();
        // this.notebook = options.notebook;
        this.tiles = tiles;
        this.mosaics = new Map();
        this._direction = direction;
        this._mode = direction;
        // this.direction = options.direction;
        this._placeholder = true;
        this.addClass(Mosaic.NODE_CLASS);
        this.tiles.changed.connect(this.onTreeChanged, this);
        // patch the item resize method to use width not height when in row mode
        this._onItemResize = this.onItemResize;
        this._updateTotalSize = this.updateTotalSize;
        this.viewportNode.addEventListener('scroll', (e) => {
            this.onScroll(e);
            e.stopPropagation();
        });
        this.viewportNode.addEventListener('scrollend', (e) => {
            this.updateOverflowShadow();
            e.stopPropagation();
        });
    }
    get notebook() {
        // traverse up the tree to get the notebook
        return this.superMosaic.notebook;
    }
    get direction() {
        return this._direction;
    }
    set direction(d) {
        this._direction = d;
    }
    get mode() {
        return this._mode;
    }
    set mode(m) {
        if (this._mode === m) {
            return;
        }
        this._mode = m;
        if (m === 'tabbed') {
            this.viewModel.windowingActive = false;
            this.node.classList.add(Mosaic.TAB_GROUP_CLASS);
            this.buildTabBar();
        }
        else {
            this.viewModel.windowingActive = true;
            this.node.classList.remove(Mosaic.TAB_GROUP_CLASS);
            this.destroyTabBar();
            this.direction = m;
        }
        this.viewModel.direction = this.direction;
        this.update();
    }
    get superMosaic() {
        return this._superMosaic;
    }
    set superMosaic(mosaic) {
        if (this._superMosaic !== null && mosaic !== this._superMosaic) {
            this._superMosaic.tiles.removeValue(this);
        }
        this._superMosaic = mosaic;
    }
    get path() {
        return [...(this.superMosaic !== null ? this.superMosaic.path : []), this.groupID];
    }
    get id() {
        return `mosaic:${this.path.join('/')}`;
    }
    saveState(state) {
        Mosaic.saveMosaicState(this.notebook, this.id, state);
    }
    loadState() {
        return Mosaic.loadMosaicState(this.notebook, this.id);
    }
    onTreeChanged(tree, msg) {
        switch (msg.type) {
            // case 'set':
            case 'clear':
            case 'remove': {
                if (this.mode === 'tabbed') {
                    for (const tile of msg.oldValues) {
                        console.warn('remove tab', tile === null || tile === void 0 ? void 0 : tile.prompt);
                        this.removeTab(tile);
                    }
                }
                // for (const tile of msg.oldValues) {
                // console.warn('removing', tile);
                // if (tile instanceof Mosaic) {
                //     this.mosaics.delete(tile.groupID);
                // }
                // }
                setTimeout(() => {
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
                    else if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
                        Mosaic.setPath(tile, this.path);
                        // console.log('adding ', 'Cell:'+(tile as any).prompt);
                        tile.disposed.connect((cell, msg) => {
                            setTimeout(() => this.checkEmpty(), 250); // allow timeout for cells to be re-added, so it doesn't collapse when moving a cell
                        });
                    }
                }
                break;
            }
        }
        console.log(this.id, 'wl indices', this.tiles.map((t) => t.node.dataset.windowedListIndex), this.layout.widgets.map((t) => t.node.dataset.windowedListIndex));
        requestAnimationFrame(() => this.update());
        // trigger update on super tree for this item
        if (this.superMosaic) {
            const idx = this.superMosaic.tiles.indexOf(this);
            if (idx > -1)
                this.superMosaic.onTreeChanged(this.superMosaic.tiles, {
                    type: 'set',
                    newIndex: idx,
                    newValues: [this],
                    oldIndex: idx,
                    oldValues: [this]
                });
        }
    }
    treeGet(path, depth = 0) {
        if (depth < path.length) {
            return this.mosaics.get(path[depth]).treeGet(path, depth + 1);
        }
        return this; // i am at a depth == path length, I am the result
    }
    treeGetExisting(path, depth = 0) {
        // get up to the deepest existing branch for the given path
        if (depth < path.length) {
            const nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch !== undefined) {
                return nextBranch.treeGetExisting(path, depth + 1);
            }
            else {
                return [this, depth];
            }
        }
        return [this, depth];
    }
    // insertLeaf(branch: Mosaic, cell: Cell, idx: number = 0) {
    // }
    addTile(groupID = '', index = -1) {
        if (groupID == '')
            groupID = Mosaic.newUGID();
        const newMosaic = new Mosaic(groupID); //, this.options);
        this.splice(index, 0, newMosaic);
        return newMosaic;
    }
    growBranch(path, branchsIxs = [], depth = 0) {
        if (depth < path.length) {
            let nextBranch = (this.mosaics.get(path[depth]));
            if (nextBranch == undefined) {
                nextBranch = this.addTile(path[depth], (branchsIxs.length > depth ? branchsIxs[depth] : -1));
            }
            return nextBranch.growBranch(path, branchsIxs, depth + 1);
        }
        return this;
    }
    // removeLast(tile: Tile) {
    //     const ix = ArrayExt.lastIndexOf(this.tiles, tile);
    //     this.splice(ix, 1);
    //     // this.checkEmpty();
    // }
    splice(startIndex, replaceCount, ...tiles) {
        if (startIndex < 0)
            startIndex = this.tiles.length;
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
        if (!this.superMosaic)
            return;
        // remove self from superMosaic
        const idx = this.superMosaic.tiles.removeValue(this); // I am now dereferrenced, I should be garbage collected.
        // console.log('unwrapping:', this.path, Mosaic.showMosaic(this), 'index in super:', idx, this.superMosaic);
        if (this.tiles.length > 0) { // insert my contents (if any) where I was
            this.superMosaic.tiles.splice(idx, 0, ...this.tiles);
        }
        this.dispose();
    }
    getLeaf(leafIx) {
        // linearly walk through leafs (Cells) according to each sub groups order until the desired leafindex is reached
        // returns: last parent mosaic and id of leaf in parent or null if not found, and index of leaf in parent, (or total number of leaves if not found)
        let increment = 1;
        let i = 0;
        if (leafIx < 0) {
            increment = -1;
            i = -1;
        }
        for (const tile of (leafIx > 0 ? this.tiles : Array.from(this.tiles).reverse())) {
            if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
                if (i == leafIx) {
                    return [[this, tile], i]; // found desired leaf
                }
                i += increment; // count leaf
            }
            else { // branch
                const [stemAndLeaf, leafNum] = tile.getLeaf(leafIx - i);
                if (stemAndLeaf !== null) {
                    return [stemAndLeaf, leafNum];
                }
                i += increment * leafNum; // count all leaves from this branch
            }
        }
        return [null, i]; // nLeafs > number of leaves I have
    }
    findGroup(node) {
        // search the tree depth-first for a mosaic group with the specified node
        for (const groupID in this.mosaics) {
            if (this.mosaics.get(groupID).node === node) {
                return [groupID];
            }
            const found = this.mosaics.get(groupID).findGroup(node);
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
    isPlaceholder() {
        return this.placeholder;
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(v) {
        console.warn('PLACEHOLDER SET');
        if (this._placeholder !== v && v === false) {
            this.initializeDOM();
            this._placeholder = v;
            this._ready.resolve();
        }
    }
    initializeDOM() {
        console.log('INITIALIZING DOM');
        if (!this.placeholder) {
            return;
        }
    }
    get ready() {
        return this._ready.promise;
    }
    async runAll() {
        var _a;
        for (const tile of this.tiles) {
            if (tile instanceof Mosaic) {
                tile.runAll();
            }
            else if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
                if (!this.notebook)
                    return console.warn('No notebook! Cannot run cells');
                const context = ((_a = this.notebook) === null || _a === void 0 ? void 0 : _a.parent).sessionContext;
                if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.CodeCell) {
                    try {
                        await _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.CodeCell.execute(tile, context);
                    }
                    catch (e) {
                        console.error('Cell exec err', e);
                    }
                }
                else if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.MarkdownCell) {
                    tile.rendered = true;
                }
            }
        }
    }
    /** Notebook-like methods */
    onAfterAttach(msg) {
        this.update(); // will attach inner cells according to viewModel widgetRenderer
        super.onAfterAttach(msg);
        this.direction = this.parent.direction == 'col' ? 'row' : 'col', // invert direction of parent 
            // console.log('attached as', this.direction, 'to',  this.parent, (this.parent as Mosaic).direction);
            this.viewModel.direction = this.direction;
        this.viewportNode.dataset.mosaicDirection = this.direction;
        this.viewportNode.classList.add(Mosaic.INNER_GROUP_CLASS, Mosaic.DIR_CLASS[this.direction]);
        this.updateOverflowShadow(); // update shadowing baased on scroll
        if (!this.runButton) {
            this.runButton = document.createElement('div');
            this.runButton.appendChild(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__.runIcon.element());
            this.runButton.classList.add('mosaic-group-run-btn');
            this.runButton.onclick = () => this.runAll();
        }
        this.node.appendChild(this.runButton);
        // tabbed layout mode
        if (this.loadState().tabbed) {
            this.mode = 'tabbed';
        }
        else {
            this.viewportNode.classList.remove(Mosaic.TAB_GROUP_CLASS);
        }
        if (this.notebook) {
            this.notebook.activeCellChanged.connect(this.onActiveCellChanged, this);
        }
        // drag in the gaps of a row to resize elements
        const w = this.loadState().elWidth;
        if (Number.isFinite(w))
            this.setElWidth(w);
        let dragging = false;
        this.node.onmousedown = (ev) => {
            if (ev.target === this.viewportNode)
                dragging = true;
        };
        const endDrag = (ev) => {
            dragging = false;
            if (this.direction == 'row') {
                const elWidth = this.layout.widgets[0].node.getBoundingClientRect().width;
                this.saveState({ ...this.loadState(), elWidth });
            }
        };
        this.node.onmouseleave = endDrag;
        this.node.onmouseup = endDrag;
        this.node.onmousemove = (ev) => {
            if (dragging && this.direction == 'row') {
                const oldWidth = this.layout.widgets[0].node.getBoundingClientRect().width;
                this.setElWidth(oldWidth + ev.movementX);
            }
        };
    }
    setElWidth(width) {
        this.node.style.setProperty('--el-width', `${width}px`);
    }
    onBeforeDetach(msg) {
        if (this.notebook) {
            this.notebook.activeCellChanged.disconnect(this.onActiveCellChanged, this);
        }
        super.onBeforeDetach(msg);
    }
    onActiveCellChanged(notebook, cell) {
        if (cell && this.mode === 'tabbed') {
            // find which of my tiles contains this cell
            let containingTile = undefined;
            for (const tile of this.tiles) {
                if (tile === cell) {
                    containingTile = tile;
                    break;
                }
                if (tile instanceof Mosaic) {
                    let superMosaic = cell.superMosaic;
                    while (superMosaic) {
                        if (superMosaic === tile) {
                            containingTile = tile;
                            break;
                        }
                        superMosaic = superMosaic.superMosaic;
                    }
                }
                if (containingTile)
                    break;
            }
            if (containingTile) {
                this.setActiveTab(containingTile);
            }
        }
    }
    buildTabBar() {
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
            }
            else {
                this._updateTabs();
            }
        });
    }
    destroyTabBar() {
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
    _updateTabs() {
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
            }
            else {
                tile.hide();
            }
            tab.addEventListener('mousedown', (event) => {
                let wasDrag = false;
                const onMouseMove = (moveEvent) => {
                    const dx = Math.abs(moveEvent.clientX - event.clientX);
                    const dy = Math.abs(moveEvent.clientY - event.clientY);
                    if (dx > 4 || dy > 4) { // Threshold to detect a drag
                        wasDrag = true;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        this.onTabDragStart(tile, event);
                    }
                };
                const onMouseUp = (upEvent) => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    if (!wasDrag) {
                        this.handleTabClick(tile, upEvent);
                    }
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
            });
            tile.__tab = tab;
            this._tabBar.appendChild(tab);
        }
        // Add the '+' button
        const addButton = document.createElement('div');
        addButton.textContent = '+';
        addButton.classList.add('mosaic-add-tab-button');
        addButton.onclick = () => this.addNewCell();
        this._tabBar.appendChild(addButton);
    }
    handleTabClick(tile, event) {
        var _a;
        if (event.shiftKey && this._lastSelectedTile) {
            // Extend selection
            const lastIndex = this.tiles.indexOf(this._lastSelectedTile);
            const currentIndex = this.tiles.indexOf(tile);
            const [start, end] = [lastIndex, currentIndex].sort((a, b) => a - b);
            this._clearSelection(false); // Don't re-render yet
            for (let i = start; i <= end; i++) {
                const tileInRange = this.tiles.get(i);
                this._selectedTiles.add(tileInRange);
                (_a = tileInRange.__tab) === null || _a === void 0 ? void 0 : _a.classList.add('mosaic-tab-selected');
            }
        }
        else {
            // Single selection
            this._clearSelection(false); // Don't re-render yet
            // this._selectedTiles.add(tile);
            this._lastSelectedTile = tile;
        }
        this.setActiveTab(tile, false);
    }
    _clearSelection(update = true) {
        var _a;
        for (const tile of this._selectedTiles) {
            (_a = tile.__tab) === null || _a === void 0 ? void 0 : _a.classList.remove('mosaic-tab-selected');
        }
        this._selectedTiles.clear();
        if (update) {
            this._updateTabs();
        }
    }
    onTabDragStart(draggedTile, event) {
        // If the dragged tab is not selected, select only it.
        if (!this._selectedTiles.has(draggedTile)) {
            this._clearSelection(false);
            this._selectedTiles.add(draggedTile);
            this._lastSelectedTile = draggedTile;
            this._updateTabs();
        }
        // Gather all cells from all selected tiles.
        let cellsToDrag = [];
        this._selectedTiles.forEach(tile => {
            cellsToDrag = cellsToDrag.concat(this._getAllCells(tile));
        });
        if (cellsToDrag.length === 0) {
            return;
        }
        const mimeData = new _lumino_coreutils__WEBPACK_IMPORTED_MODULE_1__.MimeData();
        mimeData.setData('internal:cells', cellsToDrag);
        mimeData.setData('application/vnd.jupyter.cells', cellsToDrag.map(c => c.model.toJSON()));
        const drag = new _lumino_dragdrop__WEBPACK_IMPORTED_MODULE_0__.Drag({
            mimeData,
            source: this.notebook,
            dragImage: this._createDragImage(this._selectedTiles.size)
        });
        drag.start(event.clientX, event.clientY);
    }
    _getAllCells(tile) {
        if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
            return [tile];
        }
        if (tile instanceof Mosaic) {
            let cells = [];
            for (const subTile of tile.tiles) {
                cells = cells.concat(this._getAllCells(subTile));
            }
            return cells;
        }
        return [];
    }
    _createDragImage(count) {
        const dragImage = document.createElement('div');
        dragImage.className = 'jp-dragImage';
        dragImage.textContent = `${count} item${count > 1 ? 's' : ''}`;
        return dragImage;
    }
    removeTab(tile) {
        this._selectedTiles.delete(tile);
        if (this._lastSelectedTile === tile) {
            this._lastSelectedTile = null;
        }
        this._updateTabs();
    }
    setActiveTab(tile, update_last = true) {
        if (update_last) {
            this._lastSelectedTile = tile;
        }
        if (this._activeTile === tile) {
            return;
        }
        this._activeTile = tile;
        if (this.notebook && this._activeTile) {
            let cellToActivate = null;
            if (this._activeTile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
                cellToActivate = this._activeTile;
            }
            else if (this._activeTile instanceof Mosaic) {
                // find first cell in this mosaic
                const [leafInfo,] = this._activeTile.getLeaf(0);
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
    getTileTitle(tile) {
        if (tile instanceof Mosaic) {
            return `${tile.tiles.length} items: ${tile.getTileTitle(tile.getLeaf(0)[0][1])}`;
        }
        else {
            let title = '';
            if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.CodeCell) {
                title = (`[${tile.prompt || ' '}]: `) || '';
            }
            const content = tile.model.sharedModel.getSource();
            if (content.length > 15) {
                title += content.slice(0, 12).split('\n')[0] + '...';
            }
            else {
                title += content.split('\n')[0];
            }
            if (title.trim() === '') {
                title = 'Cell';
            }
            return title;
        }
    }
    addNewCell() {
        const notebook = this.notebook;
        if (!notebook || !notebook.model) {
            return;
        }
        const model = notebook.model;
        // Define a function to handle the addition of the new cell
        const handleNewCell = (sender, args) => {
            if (args.type === 'add') {
                // Assuming the last added cell is the one we just created.
                const newCellModel = args.newValues[args.newValues.length - 1];
                // Disconnect the signal handler
                model.cells.changed.disconnect(handleNewCell);
                const newCellWidgetIndex = _lumino_algorithm__WEBPACK_IMPORTED_MODULE_5__.ArrayExt.findFirstIndex(notebook.widgets, w => w.model === newCellModel);
                const newCellWidget = notebook.widgets[newCellWidgetIndex];
                if (newCellWidget) {
                    // Add to current mosaic group's tiles
                    this.splice(this.tiles.length, 0, newCellWidget);
                    // Update cell metadata to reflect its new path in the mosaic
                    Mosaic.setPath(newCellWidget, this.path);
                    // Set the new cell as the active tab
                    this.setActiveTab(newCellWidget);
                }
            }
        };
        // Connect to the cells changed signal BEFORE triggering the action
        model.cells.changed.connect(handleNewCell);
        // Set the active cell in the notebook to the last cell of the current tab group
        // so that `insertBelow` works as expected.
        if (this._activeTile && this._activeTile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
            const index = notebook.widgets.indexOf(this._activeTile);
            if (index > -1) {
                notebook.activeCellIndex = index;
            }
        }
        else if (this.tiles.length > 0) {
            // Fallback to the last cell in the group if the active tile isn't a cell
            const lastTile = this.tiles.get(this.tiles.length - 1);
            if (lastTile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
                const index = notebook.widgets.indexOf(lastTile);
                if (index > -1) {
                    notebook.activeCellIndex = index;
                }
            }
        }
        // Trigger the action to insert a new cell
        _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.NotebookActions.insertBelow(notebook);
    }
    updateOverflowShadow() {
        // tag things scrolled all the way to one side, so CSS styling shows shadow on overflowing elements
        if (this.direction == 'col') {
            if (this.viewportNode.scrollTop < 10) {
                this.dataset.mosaicScrolledSide = 'top';
            }
            else if (this.viewportNode.scrollTop > this.viewportNode.scrollHeight - this.viewportNode.clientHeight - 10) {
                this.dataset.mosaicScrolledSide = 'bottom';
            }
            else {
                this.dataset.mosaicScrolledSide = '';
            }
        }
        else if (this.direction == 'row') {
            if (this.viewportNode.scrollLeft < 10) {
                this.dataset.mosaicScrolledSide = 'left';
            }
            else if (this.viewportNode.scrollLeft > this.viewportNode.scrollWidth - this.viewportNode.clientWidth - 10) {
                this.dataset.mosaicScrolledSide = 'right';
            }
            else {
                this.dataset.mosaicScrolledSide = '';
            }
        }
    }
    onResize(msg) {
        // add width too?
        const previousHeight = this.viewModel.height;
        this.viewModel.height =
            msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
        if (this.viewModel.height !== previousHeight) {
            void this._updater.invoke();
        }
        super.onResize(msg);
        void this._updater.invoke();
    }
    onItemResize(entries) {
        this._resetScrollToItem();
        if (this.isHidden || this.isParentHidden) {
            return;
        }
        for (const dim of ['row', 'col']) {
            const newSizes = [];
            for (let entry of entries) {
                const size = (dim == 'row' ?
                    entry.borderBoxSize[0].inlineSize :
                    entry.borderBoxSize[0].blockSize); // + (2*parseFloat(getComputedStyle(entry.target).margin));
                console.log('resizer size', dim, size, entry.target, entry);
                // Update size only if item is attached to the DOM
                if (entry.target.isConnected && size > 0) {
                    // Rely on the data attribute as some nodes may be hidden instead of detach
                    // to preserve state.
                    newSizes.push({
                        index: parseInt(entry.target.dataset.windowedListIndex, 10),
                        size: size
                    });
                }
            }
            // If some sizes changed
            if (this.viewModel.setWidgetSize(newSizes, dim)) {
                this._scrollBackToItemOnResize();
                // Update the list
                this.update();
            }
            requestAnimationFrame(() => this.update());
        }
    }
    get innerElement() {
        return this._innerElement;
    }
    updateTotalSize() {
        if (this.viewModel.windowingActive) {
            if (this.viewportNode.dataset.isScrolling == 'true') {
                // Do not update while scrolling, delay until later
                this._requiresTotalSizeUpdate = true;
                return;
            }
            let estimatedTotalHeight = this.viewModel.getEstimatedTotalHeight();
            console.log('estimated total height', this.path, estimatedTotalHeight);
            if (this.direction == 'row') {
                estimatedTotalHeight += 2 * Mosaic.CSS.rowPaddingTop;
            }
            // Update inner container height
            this.innerElement.style.height = `${estimatedTotalHeight}px`;
            let estimatedTotalWidth = this.viewModel.getEstimatedTotalWidth();
            if (this.direction == 'col') {
                estimatedTotalWidth += 2 * Mosaic.CSS.colPaddingLeft;
            }
            this.innerElement.style.width = `${estimatedTotalWidth}px`;
            if ((this.viewportNode.scrollWidth > this.viewportNode.clientWidth)
                || (this.viewportNode.scrollHeight > this.viewportNode.clientHeight)) {
                this.node.classList.add('mosaic-scrolling');
                this.node.style.setProperty('--scroll-width', `${this.viewportNode.scrollWidth}px`);
                this.node.style.setProperty('--scroll-height', `${this.viewportNode.scrollHeight}px`);
            }
            else {
                this.node.classList.remove('mosaic-scrolling');
            }
        }
    }
    getEstimatedTotalHeight() {
        return this.viewModel.getEstimatedTotalHeight();
    }
    getEstimatedTotalWidth() {
        return this.viewModel.getEstimatedTotalWidth();
    }
    renderCellOutputs(index) {
        // updated to deal with submosaics
        const tile = this.viewModel.widgetRenderer(index);
        if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.CodeCell && tile.isPlaceholder()) {
            const cell = tile;
            cell.dataset.windowedListIndex = `${index}`;
            this.layout.insertWidget(index, cell);
            // if (this.notebook.notebookConfig.windowingMode === 'full') {
            // We need to delay slightly the removal to let codemirror properly initialize
            requestAnimationFrame(() => {
                this.layout.removeWidget(cell);
            });
            // }
        }
        else if (tile instanceof Mosaic && tile.isPlaceholder()) {
            const mosaic = tile;
            for (let i = 0; i < mosaic.tiles.length; i++) {
                mosaic.renderCellOutputs(i);
            }
        }
    }
    detachWidget() { }
}
Mosaic.METADATA_NAME = 'mosaic';
Mosaic.NODE_CLASS = 'mosaic-group-outer';
Mosaic.INNER_GROUP_CLASS = 'mosaic-group-inner';
Mosaic.TAB_GROUP_CLASS = 'mosaic-tabgroup';
Mosaic.TAB_BAR_CLASS = 'mosaic-tab-bar';
Mosaic.TAB_CLASS = 'mosaic-tab';
Mosaic.TAB_ACTIVE_CLASS = 'mosaic-tab-active';
Mosaic.DIR_CLASS = {
    'row': 'mosaic-row',
    'col': 'mosaic-col'
};
Mosaic.CSS = {
    rowPaddingTop: 5,
    colPaddingLeft: 5
};
Mosaic.defaultConfig = {
    overscanCount: 3
};
(function (Mosaic) {
    function showMosaic(t) {
        if (t instanceof Mosaic || t instanceof _MosaicNotebookPanel__WEBPACK_IMPORTED_MODULE_8__.MosaicNotebook) {
            return t.tiles._array.map(Mosaic.showMosaic);
        }
        else if (t instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_4__.Cell) {
            return 'Cell:' + t.prompt;
        }
        else {
            return t;
        }
    }
    Mosaic.showMosaic = showMosaic;
    function getPath(cell) {
        return cell.model.getMetadata(Mosaic.METADATA_NAME);
    }
    Mosaic.getPath = getPath;
    function setPath(cell, path) {
        // console.log('path updated', Mosaic.getPath(cell), path);
        // if (Mosaic.getPath(cell)?.join('/') !== path.join('/')) {
        //     setTimeout(() => {
        //         const nb = (cell as LeafCell).superMosaic?.notebook;
        //         const index = nb?.widgets.findIndex(c => c === cell);
        //         if (index !== undefined) (nb as MosaicNotebook).mosaicInsert(index);
        //     }, 250);
        // }
        return cell.model.setMetadata(Mosaic.METADATA_NAME, path);
    }
    Mosaic.setPath = setPath;
    function setParent(tile, mosaic) {
        // console.warn('set parent', tile instanceof Cell ? 'Cell:'+(tile as any).prompt : 'mosaic:'+tile.path, tile.superMosaic, tile.parent, mosaic);
        if (tile.superMosaic && tile.superMosaic !== mosaic) {
            tile.superMosaic.tiles.removeValue(tile);
        }
        tile.superMosaic = mosaic;
        // tile.parent = mosaic; // important: need to check parentage before removing, in case it was just moved to another list.
    }
    Mosaic.setParent = setParent;
    function divergeDepth(path1, path2) {
        if (path1 == undefined || path2 == undefined)
            return 0;
        for (let i = 0; i < path1.length; i++) {
            if (path2.length <= i || path1[i] !== path2[i])
                return i;
        }
        return path1.length;
    }
    Mosaic.divergeDepth = divergeDepth;
    function newUGID() {
        return "mg-" + crypto.randomUUID();
    }
    Mosaic.newUGID = newUGID;
    function loadMosaicState(notebook, id) {
        return notebook.model.getMetadata(id) || {};
    }
    Mosaic.loadMosaicState = loadMosaicState;
    function saveMosaicState(notebook, id, state) {
        const oldstate = Mosaic.loadMosaicState(notebook, id);
        notebook.model.setMetadata(id, { ...oldstate, ...state });
    }
    Mosaic.saveMosaicState = saveMosaicState;
})(Mosaic || (Mosaic = {}));


/***/ }),

/***/ "./lib/MosaicNotebookPanel.js":
/*!************************************!*\
  !*** ./lib/MosaicNotebookPanel.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MosaicNotebook: () => (/* binding */ MosaicNotebook),
/* harmony export */   MosaicNotebookPanel: () => (/* binding */ MosaicNotebookPanel)
/* harmony export */ });
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mosaicdrag__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mosaicdrag */ "./lib/mosaicdrag.js");
/* harmony import */ var _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./MosaicGroup */ "./lib/MosaicGroup.js");

// import { ArrayExt } from '@lumino/algorithm';
// import { EditorServices } from
// import { DocumentRegistry } from '@jupyterlab/docregistry';


// import { MosaicViewModel } from './MosaicViewModel';
var MosaicNotebookPanel;
(function (MosaicNotebookPanel) {
    class ContentFactory extends _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookPanel.ContentFactory {
        createNotebook(options) {
            const notebook = super.createNotebook(options);
            const mosaic = new MosaicNotebook(notebook, options);
            notebook._viewModel = mosaic.viewModel;
            notebook._mosaic = mosaic;
            notebook.addClass('mosaic-Notebook');
            return notebook;
        }
    }
    MosaicNotebookPanel.ContentFactory = ContentFactory;
})(MosaicNotebookPanel || (MosaicNotebookPanel = {}));
// export class MosaicNotebookWidgetFactory extends NotebookWidgetFactory {
//     protected createNewWidget(
//         context: DocumentRegistry.IContext<INotebookModel>
//     ): NotebookPanel {
//         const content = new NotebookPanel({
//             context,
//             contentFactory: this.contentFactory,
//             mimeTypeService: this.mimeTypeService
//         });
//         return content;
//     }  
// }
class MosaicNotebook extends _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic {
    get superMosaic() {
        return this._superMosaic;
    }
    get path() {
        return [];
    }
    get notebook() {
        return this._notebook;
    }
    constructor(_notebook, options) {
        super('', 'col');
        this._notebook = _notebook;
        this._superMosaic = this;
        this._direction = 'col';
        // updateTotalSize = Mosaic.prototype.updateTotalSize.bind(this);
        // addTile = Mosaic.prototype.addTile.bind(this);
        // growBranch = Mosaic.prototype.growBranch.bind(this);
        // splice = Mosaic.prototype.splice.bind(this);
        //// treeGet = Mosaic.prototype.treeGet.bind(this);
        // treeGetExisting = Mosaic.prototype.treeGetExisting.bind(this);
        //// getBranchIndex = Mosaic.prototype.getBranchIndex.bind(this);
        // getLeaf = Mosaic.prototype.getLeaf.bind(this);
        // findGroup = Mosaic.prototype.findGroup.bind(this);
        //// findStem = Mosaic.prototype.findStem.bind(this);
        // renderCellOutputs = Mosaic.prototype.renderCellOutputs.bind(this);
        // onTreeChanged(tree: ObservableTree<Tile>, change:any) {
        //     Mosaic.prototype.onTreeChanged.bind(this)(tree, change);
        //     // console.log(this.tiles, Mosaic.showMosaic(this as any));
        //     requestAnimationFrame(() => this.update());
        // }
        this.unwrap = () => { };
        this.checkEmpty = () => { };
        // this.tiles = new ObservableTree();
        // this.mosaics = new Map<string, Mosaic>();
        this.options = { ...options, direction: 'col', notebook: this._notebook };
        // const mvm = new MosaicViewModel(this.tiles, 'col', {
        //         overscanCount: options.notebookConfig?.overscanCount  ??
        //             Mosaic.defaultConfig.overscanCount,
        //         windowingActive: true
        //     });
        // Object.defineProperty(this.viewModel, 'widgetCount', {get: mvm._getWidgetCount.bind(mvm)});
        // this.viewModel.estimateWidgetSize = mvm._estimateWidgetSize.bind(mvm);
        // (this.viewModel as any).getEstimatedTotalHeight = mvm.getEstimatedTotalHeight.bind(mvm);
        // (this.viewModel as any).getEstimatedTotalWidth = mvm.getEstimatedTotalWidth.bind(mvm);
        // this.viewModel.getEstimatedTotalSize = mvm.getEstimatedTotalSize.bind(mvm);
        // this.viewModel.widgetRenderer = mvm._widgetRenderer.bind(mvm);
        this._notebook._evtDrop = (e) => (0,_mosaicdrag__WEBPACK_IMPORTED_MODULE_1__.mosaicDrop)(this._notebook, e);
        this._notebook._evtDragOver = (e) => (0,_mosaicdrag__WEBPACK_IMPORTED_MODULE_1__.mosaicDragOver)(this._notebook, e);
        this._notebook._updateForDeferMode = this._myupdateForDeferMode.bind(this);
        this._notebook._updateTotalSize = this.updateTotalSize.bind(this);
        // this.tiles.changed.connect(this.onTreeChanged, this);
        const origOCR = this._notebook.onCellRemoved;
        this._notebook.onCellRemoved = ((index, cell) => {
            origOCR.call(this._notebook, index, cell);
            this.onCellRemoved(index, cell);
        }).bind(this);
        const origOCI = this._notebook.onCellInserted;
        this._notebook.onCellInserted = ((index, cell) => {
            origOCI.call(this._notebook, index, cell);
            this.mosaicInsert(index);
        }).bind(this);
        // this._notebook.modelChanged.connect( (notebook, args) => {
        //     this.model = notebook.model;
        //     if (this._notebook.model) {
        //         this._notebook.model.cells.changed.connect((list, change) => {
        //             if (change.type === 'remove') {
        //                 change.oldValues.forEach( (cell) => {
        //                     // const index = this._notebook.cells.indexOf(cell);
        //                     this.onCellRemoved(0, cell);
        //                 });
        //             }
        //         });
        //     }
        // });
    }
    // get model() {
    //     return super.model;
    // }
    set model(model) {
        // super.model = model;
        // viewModel List changes handled by mosaicgroup. Don't need observable list to trigger it
        this._notebook.viewModel.itemsList = this.tiles;
    }
    // protected onCellInserted(index: number, cell: Cell): void {
    //     super.onCellInserted(index, cell);
    //     this.mosaicInsert(index);
    // }
    onCellRemoved(index, cell) {
        // super.onCellRemoved(index, cell);
        console.log('index', index);
        const [found,] = this.getLeaf(index);
        if (found !== null) {
            const [stem, leaf] = found;
            if (leaf == cell) {
                stem.tiles.removeValue(leaf);
            }
            else {
                console.warn('failed to remove', index, cell);
                console.log('found', found, 'sm', cell.superMosaic);
            }
        }
    }
    async _myupdateForDeferMode(cell, cellIdx) {
        // insert widget into corresponding submosaic layout, not necessarily main notebook layout anymore
        const [stem, localIdx] = this.mosaicInsert(cellIdx);
        cell.dataset.windowedListIndex = `${localIdx}`;
        stem.layout.insertWidget(localIdx, cell);
        await cell.ready;
    }
    graft(cell, path, refCell, refPath, refDiverge, offset = 0) {
        /**
         * 'graft' the cell onto the tree (nested list of mosaics) adjacent to one of its neighbors (refCell)
         */
        // traverse up to where the path to cell branches off
        // let base: Mosaic = this.leafStems.get(refCell)! as Mosaic;
        let base = refCell.superMosaic;
        let reference = refCell;
        for (let i = refPath.length; i > refDiverge; i--) {
            reference = base;
            base = reference.superMosaic;
        }
        let idx = base.tiles.indexOf(reference);
        // console.log('ref', base, reference, idx);
        if (idx < 0) {
            console.error('referrence leaf/branch missing!');
            base = this;
            idx = this.tiles.length; // send it to the end
        }
        else {
            idx += offset;
        }
        // console.log('ref', reference, 'base', base, 'refpath', refPath, 'refDiv', refDiverge, 'path', path);
        // graft it
        if (refDiverge < path.length) {
            // grow the cell's own branch and attach at referrence index
            const stem = base.growBranch(path.slice(refDiverge), [idx]);
            console.log('grew', stem);
            stem.splice(0, 0, cell);
            // console.log('grafted', 'branch:'+stem.path, 'to', base.path, 'at', idx);
            return [stem, idx];
        }
        else {
            // cell attaches directly to reference's branch
            console.log('attaching to', base);
            base.splice(idx, 0, cell);
            // console.log('grafted', 'Cell:'+(cell as any).prompt, 'to', base.groupID, 'at', idx);
            return [base, idx];
        }
    }
    mosaicInsert(index) {
        var _a, _b;
        /**
         * Group the inserted cell with one of its neighbors, to assemble the heirarchy out of a linear array
         * can be though of as self-assembly: cell of index 'index' tries to graft itself to the branch of one of its neighbors
         * Call after super.onCellInserted, cell to insert should be in this.cellsArray at give index
        */
        const prevCell = this.notebook.widgets[index - 1];
        const cell = this.notebook.widgets[index];
        const nextCell = this.notebook.widgets[index + 1];
        if (cell == null) {
            console.error('no cell at index!', index);
            return [this, -1];
        }
        // remove from current group
        _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic.setParent(cell, null);
        cell.parent = null;
        let prevPath = (_a = prevCell === null || prevCell === void 0 ? void 0 : prevCell.superMosaic) === null || _a === void 0 ? void 0 : _a.path; //Mosaic.getPath(prevCell)! : [];
        let path = _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic.getPath(cell); // use saved MD path to get where it goes, not where it is
        let nextPath = (_b = nextCell === null || nextCell === void 0 ? void 0 : nextCell.superMosaic) === null || _b === void 0 ? void 0 : _b.path; //Mosaic.getPath(nextCell)! : [];
        if (index === 0 && !nextCell) { // first cell added, grow its branch and add it.
            const branch = this.growBranch(path || []);
            // this.insertLeaf(branch, cell);
            branch.splice(0, 0, cell);
            return [branch, 0];
        }
        console.log('Cell:', cell.prompt, 'prev, this, next path', prevPath, path, nextPath, prevCell, cell, nextCell);
        if (path === undefined) {
            // missing mosaic position metadata, join the previous cell
            if (prevCell && prevPath)
                path = prevPath; //return this.graft(cell, prevPath, prevCell, prevPath, prevPath.length, +1);
            else
                path = []; // return this.graft(cell, [], nextCell, nextPath, 0, 0);
        }
        // having handled the special cases, graft to whichever branches off current cell's path later
        let prevDiverge = (prevCell === null || prevCell === void 0 ? void 0 : prevCell.superMosaic) ? _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic.divergeDepth(prevPath, path) : -1;
        let nextDiverge = (nextCell === null || nextCell === void 0 ? void 0 : nextCell.superMosaic) ? _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic.divergeDepth(nextPath, path) : -1;
        // if we've left the groups of the other cells, let them collapse if underpopulated
        if (prevCell && prevCell.superMosaic) {
            let prevGroup = prevCell;
            for (let i = prevDiverge; i < ((prevPath === null || prevPath === void 0 ? void 0 : prevPath.length) || -1); i++) {
                prevGroup = prevGroup.superMosaic;
                prevGroup === null || prevGroup === void 0 ? void 0 : prevGroup.checkEmpty();
            }
            // path was updated by collapsing redundant groups
            prevPath = prevCell.superMosaic.path;
            prevDiverge = prevCell.superMosaic ? _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic.divergeDepth(prevPath, path) : -1;
        }
        if (nextCell && nextCell.superMosaic) {
            let nextGroup = nextCell;
            for (let i = nextDiverge; i < ((nextPath === null || nextPath === void 0 ? void 0 : nextPath.length) || -1); i++) {
                nextGroup = nextGroup.superMosaic;
                nextGroup === null || nextGroup === void 0 ? void 0 : nextGroup.checkEmpty();
            }
            // path was updated by collapsing redundant groups
            nextPath = nextCell.superMosaic.path;
            nextDiverge = nextCell.superMosaic ? _MosaicGroup__WEBPACK_IMPORTED_MODULE_2__.Mosaic.divergeDepth(nextPath, path) : -1;
        }
        console.log('prev, next', prevPath, nextPath, prevDiverge, nextDiverge);
        console.log('cells', prevCell, cell, nextCell);
        console.log('supermosaics', prevCell === null || prevCell === void 0 ? void 0 : prevCell.superMosaic, cell === null || cell === void 0 ? void 0 : cell.superMosaic, nextCell === null || nextCell === void 0 ? void 0 : nextCell.superMosaic);
        if (prevDiverge < 0 && nextDiverge < 0) {
            console.warn('both neighbors unattached!');
            const branch = this.growBranch(path || []);
            branch.splice(0, 0, cell);
            return [branch, 0];
        }
        switch (Math.max(prevDiverge, nextDiverge)) {
            case (prevDiverge): {
                console.log('grafting to prev');
                return this.graft(cell, path, prevCell, prevPath, prevDiverge, +1);
            }
            case (nextDiverge): {
                console.log('grafting to next');
                return this.graft(cell, path, nextCell, nextPath, nextDiverge, 0);
            }
            default: {
                console.error('invalid path divergence!');
                const branch = this.growBranch(path || []);
                branch.splice(0, 0, cell);
                return [branch, 0];
            }
        }
    }
}


/***/ }),

/***/ "./lib/MosaicViewModel.js":
/*!********************************!*\
  !*** ./lib/MosaicViewModel.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MosaicViewModel: () => (/* binding */ MosaicViewModel)
/* harmony export */ });
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/cells */ "webpack/sharing/consume/default/@jupyterlab/cells");
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__);


class MosaicViewModel extends _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookViewModel {
    constructor(tiles, direction, options) {
        super([], options);
        this.direction = direction;
        // protected cellsEstimatedHeight = new Map<string, number>();
        this.tilesEstimatedWidth = new Map();
        this.tilesEstimatedHeight = new Map();
        this._widgetSizersRow = [];
        this._widgetSizersCol = [];
        // protected _modelList: NestedObservableList<ICellModel>;
        // private _emitEstimatedSizeChanged = new Debouncer(() => {
        // this._stateChanged.emit({
        //     name: 'estimatedWidgetSize',
        //     newValue: null,
        //     oldValue: null
        //     });
        // });
        // protected cells: Array<Tile>;
        this._tiles = null;
        // widgetRenderer is defined as a property rather than a method on super, so must follow suit
        this.widgetRenderer = MosaicViewModel.prototype._widgetRenderer.bind(this); //(index: number) => MosaicViewModel._widgetRenderer(this, index); // work around for "Class 'WindowedListModel' defines instance member property 'widgetRenderer', but extended class 'MosaicViewModel' defines it as instance member function."
        this.estimateWidgetSize = MosaicViewModel.prototype._estimateWidgetSize.bind(this);
        this.tiles = tiles;
        // overload private properties
        Object.defineProperty(this, '_widgetSizers', {
            get() {
                // console.warn('default widg sizer requested');
                if (this.direction == 'row')
                    return this._widgetSizersRow;
                if (this.direction == 'col')
                    return this._widgetSizersCol;
            },
            set(value) {
                if (this.direction == 'row')
                    this._widgetSizersRow = value;
                if (this.direction == 'col')
                    this._widgetSizersCol = value;
            }
        });
        this._getItemMetadata = this.getItemMetadata;
    }
    set tiles(ts) {
        this._tiles = ts;
        this.itemsList = ts;
    }
    get tiles() {
        return this._tiles;
    }
    onListChanged(list, changes) {
        return super.onListChanged(list, changes);
    }
    _getWidgetCount() {
        var _a;
        return ((_a = this.tiles) === null || _a === void 0 ? void 0 : _a.length) || 0;
    }
    get widgetCount() {
        return this._getWidgetCount();
    }
    _widgetRenderer(index) {
        return (this.tiles.get(index));
    }
    // get widgetSizers() {
    //     return (this as any)._widgetSizers;
    // }
    setWidgetSize(sizes, dim = 'auto') {
        if (dim == 'auto')
            dim = this.direction;
        // just use the same code as super, but with a different widgetSizers list based on dim
        return super.setWidgetSize.bind(new Proxy(this, {
            get(target, p, receiver) {
                if (p == '_widgetSizers')
                    return (dim == 'row' ? target._widgetSizersRow : target._widgetSizersCol);
                return Reflect.get(target, p, receiver);
            },
        }))(sizes);
    }
    _estimateWidgetSize(index) {
        var _a;
        // this.parent.index
        const tile = (_a = this.tiles) === null || _a === void 0 ? void 0 : _a.get(index);
        if (!tile) {
            // This should not happen, but if it does,
            // do not throw if tile was deleted in the meantime
            console.warn(`estimateWidgetSize requested for item ${index} in mosaic with only ${this.widgetCount} items`);
            return 0;
        }
        if (this.direction == 'row') {
            return this.estimateWidgetWidth(index);
        }
        else { // column mode, want height rather than width
            return this.estimateWidgetHeight(index);
        }
    }
    estimateWidgetHeight(index) {
        const tile = this.tiles.get(index);
        if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.Cell) {
            // return NotebookViewModel.prototype.estimateWidgetSize.bind({
            //         cells: {[index]: tile},
            //         cellsEstimateSize: this.tilesEstimatedHeight}
            //     )(index);
            // original jupyterlab NotebookViewModel height estimation
            const model = tile.model;
            const height = this.tilesEstimatedHeight.get(model.id);
            // const height = 39;
            if (typeof height === 'number') {
                //     // console.log('tile height', id, height);
                console.log('giving height', height, 'for node', index, tile.node);
                return height;
            }
            const nLines = model.sharedModel.getSource().split('\n').length;
            let outputsLines = 0;
            if (model instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.CodeCellModel && !model.isDisposed) {
                for (let outputIdx = 0; outputIdx < model.outputs.length; outputIdx++) {
                    const output = model.outputs.get(outputIdx);
                    const data = output.data['text/plain'];
                    if (typeof data === 'string') {
                        outputsLines += data.split('\n').length;
                    }
                    else if (Array.isArray(data)) {
                        outputsLines += data.join('').split('\n').length;
                    }
                }
            }
            return (_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookViewModel.DEFAULT_EDITOR_LINE_HEIGHT * (nLines + outputsLines) +
                _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookViewModel.DEFAULT_CELL_MARGIN);
        }
        else { // sub mosaic
            const height = this.tilesEstimatedHeight.get(tile.groupID);
            // console.log('mosaic est height', height);
            if (typeof height === 'number') {
                return height;
            }
            // console.log('est total', tile.getEstimatedTotalHeight());
            return tile.getEstimatedTotalHeight();
        }
    }
    estimateWidgetWidth(index) {
        const tile = this.tiles.get(index);
        if (tile instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.Cell) {
            return MosaicViewModel.CELL_MIN_WIDTH;
        }
        else {
            const width = this.tilesEstimatedWidth.get(tile.groupID);
            if (typeof width == 'number') {
                return width;
            }
            return tile.getEstimatedTotalWidth();
        }
    }
    set measuredAllUntilIndex(val) {
        this._measuredAllUntilIndex = val;
    }
    getEstimatedTotalSize(dim = 'mode') {
        if (dim == 'mode')
            dim = this.direction;
        const widgetSizers = (dim == 'row' ? this._widgetSizersRow : this._widgetSizersCol);
        let totalSizeOfInitialItems = 0;
        if (this.measuredAllUntilIndex >= this.widgetCount) {
            this.measuredAllUntilIndex = this.widgetCount - 1;
        }
        // These items are all measured already
        if (this.measuredAllUntilIndex >= 0) {
            const itemMetadata = widgetSizers[this.measuredAllUntilIndex];
            totalSizeOfInitialItems = itemMetadata.offset + itemMetadata.size;
        }
        // These items might have measurements, but some will be missing
        let totalSizeOfRemainingItems = 0;
        for (let i = this.measuredAllUntilIndex + 1; i < this.widgetCount; i++) {
            const sizer = widgetSizers[i];
            totalSizeOfRemainingItems += (sizer === null || sizer === void 0 ? void 0 : sizer.measured)
                ? sizer.size
                : this.estimateWidgetSize(i);
        }
        return totalSizeOfInitialItems + totalSizeOfRemainingItems;
    }
    getEstimatedTotalHeight() {
        if (this.direction == 'col') {
            return this.getEstimatedTotalSize('col');
        }
        // total height of a row is really max height of elements
        let maxSize = 0;
        for (let i = 0; i < this.widgetCount; i++) {
            const sizer = this._widgetSizersCol[i];
            // console.log('row el height', sizer, this.estimateWidgetHeight(i), this.widgetRenderer(i));
            maxSize = Math.max(maxSize, (sizer === null || sizer === void 0 ? void 0 : sizer.measured)
                ? sizer.size
                : this.estimateWidgetHeight(i));
        }
        return maxSize;
    }
    getEstimatedTotalWidth() {
        if (this.direction == 'row') {
            return this.getEstimatedTotalSize('row');
        }
        // total width of a column is really max width of elements
        let maxSize = 0;
        for (let i = 0; i < this.widgetCount; i++) {
            const sizer = this._widgetSizersRow[i]; // row for width measurments
            maxSize = Math.max(maxSize, (sizer === null || sizer === void 0 ? void 0 : sizer.measured)
                ? sizer.size
                : this.estimateWidgetWidth(i));
        }
        return maxSize;
    }
    get measuredAllUntilIndex() {
        // let me use their private field
        return -1; //(this as any)._measuredAllUntilIndex as number;
    }
    getItemMetadata(index) {
        var _a;
        for (const mode of ['row', 'col']) {
            const widgetSizers = { 'row': this._widgetSizersRow, 'col': this._widgetSizersCol }[mode];
            if (index > this.measuredAllUntilIndex) {
                let offset = 0;
                if (this.measuredAllUntilIndex >= 0) {
                    const itemMetadata = widgetSizers[this.measuredAllUntilIndex];
                    offset = itemMetadata.offset + itemMetadata.size;
                }
                for (let i = this.measuredAllUntilIndex + 1; i <= index; i++) {
                    let size;
                    let measured = false;
                    if ((_a = widgetSizers[i]) === null || _a === void 0 ? void 0 : _a.measured) {
                        size = widgetSizers[i].size;
                        measured = true;
                    }
                    else {
                        const widget = this.widgetRenderer(i);
                        if ((widget === null || widget === void 0 ? void 0 : widget.node) && widget.node.isConnected && widget.node.style.display != 'none') {
                            const rect = widget.node.getBoundingClientRect();
                            size = (mode == 'row' ? rect.width : rect.height) + (parseFloat(getComputedStyle(widget.node).margin));
                            console.log('rect, size for mode', mode, rect, size, 'marg', getComputedStyle(widget.node).margin, 'for node', i, widget.node);
                            measured = true;
                        }
                        else {
                            size = (mode == 'row' ?
                                this.estimateWidgetWidth(i)
                                : this.estimateWidgetHeight(i));
                            measured = false;
                        }
                    }
                    widgetSizers[i] = { offset, size, measured };
                    offset += size;
                }
                // Because the loop above updates estimated sizes,
                // we need to fix (heal) offsets of the remaining items.
                for (let i = index + 1; i < widgetSizers.length; i++) {
                    const sizer = widgetSizers[i];
                    const previous = widgetSizers[i - 1];
                    sizer.offset = previous.offset + previous.size;
                }
            }
            for (let i = 0; i <= this.measuredAllUntilIndex; i++) {
                const sizer = widgetSizers[i];
                if (i === 0) {
                    if (sizer.offset !== 0) {
                        throw new Error('First offset is not null');
                    }
                }
                else {
                    const previous = widgetSizers[i - 1];
                    if (sizer.offset !== previous.offset + previous.size) {
                        throw new Error(`Sizer ${i} has incorrect offset.`);
                    }
                }
            }
        }
        return this.direction == 'row' ? this._widgetSizersRow[index] : this._widgetSizersCol[index];
    }
    getRangeToRender() {
        // const r2r = super.getRangeToRender();
        // console.log("R2R", r2r);
        const wc = this.widgetCount;
        // console.log('artificial', wc-1);
        return [0, wc - 1, 0, wc - 1]; //r2r;
    }
}
MosaicViewModel.CELL_MIN_WIDTH = 160;


/***/ }),

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/codeeditor */ "webpack/sharing/consume/default/@jupyterlab/codeeditor");
/* harmony import */ var _jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @jupyterlab/docmanager */ "webpack/sharing/consume/default/@jupyterlab/docmanager");
/* harmony import */ var _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @jupyterlab/launcher */ "webpack/sharing/consume/default/@jupyterlab/launcher");
/* harmony import */ var _jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @jupyterlab/ui-components */ "webpack/sharing/consume/default/@jupyterlab/ui-components");
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @jupyterlab/application */ "webpack/sharing/consume/default/@jupyterlab/application");
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_application__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @jupyterlab/settingregistry */ "webpack/sharing/consume/default/@jupyterlab/settingregistry");
/* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _MosaicNotebookPanel__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./MosaicNotebookPanel */ "./lib/MosaicNotebookPanel.js");
/* harmony import */ var _style_icons_mosaic_icon_svg__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../style/icons/mosaic-icon.svg */ "./style/icons/mosaic-icon.svg");











/** patch DocumnetManager to not open default editor when no widgetName is specified if a different editor exists
  * added to jupyterlab in PR https://github.com/jupyterlab/jupyterlab/pull/18034
  * important for not duplicating Mosaic and Jupyter Notebook editors when reloading (restoring workspace) */
_jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_2__.DocumentManager.prototype.openOrReveal = function (path, widgetName = null, kernel, options) {
    const widget = this.findWidget(path, widgetName);
    if (widget) {
        this._opener.open(widget, {
            type: widgetName || 'default',
            ...options
        });
        return widget;
    }
    return this.open(path, widgetName || 'default', kernel, options !== null && options !== void 0 ? options : {});
};
///// end patch
const MosaicLabIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_4__.LabIcon({ name: 'mosaic:favicon', svgstr: _style_icons_mosaic_icon_svg__WEBPACK_IMPORTED_MODULE_8__.toString() });
const PLUGIN_ID = 'mosaic:plugin';
const MOSAIC_FACTORY = 'MosaicNotebook';
class MosaicModelFactory extends _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_1__.NotebookModelFactory {
    get name() {
        return 'mosaic-notebook';
    }
}
function applySettings(s) {
    if (s.skeuomorphic) {
        document.body.classList.add('mosaic-skeuomorphic');
    }
    else {
        document.body.classList.remove('mosaic-skeuomorphic');
    }
    if (s.topCellHandle) {
        document.body.classList.add('mosaic-top-cell-handles');
    }
    else {
        document.body.classList.remove('mosaic-top-cell-handles');
    }
}
/**
 * Initialization data for the mosaic-lab extension.
 */
const plugin = {
    id: PLUGIN_ID,
    description: 'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
    autoStart: true,
    requires: [_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_1__.INotebookTracker, _jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_3__.ILauncher, _jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_0__.IEditorServices, _jupyterlab_application__WEBPACK_IMPORTED_MODULE_5__.ILayoutRestorer, _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_2__.IDocumentManager, _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6__.ISettingRegistry],
    optional: [],
    activate: async (app, tracker, launcher, editorServices, restorer, docmanager, settings) => {
        console.log('JupyterLab extension mosaic is activated!');
        const loaded = await settings.load(plugin.id);
        // Apply settings initially
        applySettings(loaded.composite);
        // React to changes
        loaded.changed.connect(() => {
            applySettings(loaded.composite);
        });
        ////// Patch the tracker to allow two different kinds of widgets, open simultaneously and restored correctly
        ////// This is easier than creating a new NotebookTracker() and having to reattach all the command enabling hooks to the new namespace
        const getNotebookFactoryName = (panel) => (panel.content._mosaic ? MOSAIC_FACTORY : 'Notebook');
        tracker._pool._restore.args = (widget) => ({
            path: widget.context.path,
            factory: getNotebookFactoryName(widget),
        });
        tracker._pool._restore.name = (widget) => `${widget.context.path}:${getNotebookFactoryName(widget)}`;
        /////// end patching tracker
        // const tracker = new NotebookTracker({
        //   namespace: 'mosaic-notebook'
        // });
        // restorer.restore(tracker, {
        //   command: 'docmanager:open',
        //   args: widget => ({
        //     path: widget.context.path,
        //     factory: MOSAIC_FACTORY
        //   }),
        //   name: widget => `${widget.context.path}:${MOSAIC_FACTORY}`,
        // });
        app.serviceManager.workspaces.list().then(value => {
            console.log("WORKSPACES", value);
        });
        // app.serviceManager.workspaces.fetch('defaul').then((workspace:any) => {
        //   console.log('WORKSPACE', workspace);
        // });
        // re-use existing context to open a file as both Mosaic and Jupyter notebook, so they stay in sync
        const createContext = docmanager._createContext.bind(docmanager);
        docmanager._createContext = (path, factory, ...args) => {
            // find existing panel editing this file
            const other = tracker.find((otherPanel) => (otherPanel.context.path == path));
            if (other !== undefined) {
                return other.context;
            }
            return createContext(path, factory);
        };
        const jupyterWidgetFactory = app.docRegistry.getWidgetFactory('Notebook');
        const mosaicModelFactory = new MosaicModelFactory({ disableDocumentWideUndoRedo: false });
        app.docRegistry.addModelFactory(mosaicModelFactory);
        const mosaicWidgetFactory = (new _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_1__.NotebookWidgetFactory({
            name: MOSAIC_FACTORY,
            fileTypes: ['notebook'],
            defaultFor: ['notebook'],
            modelName: 'mosaic-notebook',
            preferKernel: true,
            canStartKernel: true,
            rendermime: jupyterWidgetFactory.rendermime,
            contentFactory: new _MosaicNotebookPanel__WEBPACK_IMPORTED_MODULE_7__.MosaicNotebookPanel.ContentFactory({
                editorFactory: editorServices.factoryService.newInlineEditor
            }),
            mimeTypeService: jupyterWidgetFactory.mimeTypeService,
            toolbarFactory: jupyterWidgetFactory._toolbarFactory,
            // notebookConfig: {}
        }));
        mosaicWidgetFactory.widgetCreated.connect((sender, panel) => {
            tracker.add(panel);
            panel.title.icon = MosaicLabIcon;
        });
        app.docRegistry.addWidgetFactory(mosaicWidgetFactory);
        app.docRegistry.setDefaultWidgetFactory('notebook', MOSAIC_FACTORY);
        // give Mosaic Notebook all the bells and whistles of a normal notebook (cell action buttons)
        for (const ext of app.docRegistry.widgetExtensions('Notebook')) {
            app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, ext);
        }
        // create launch command
        app.commands.addCommand('mosaic-notebook:create-new', {
            label: args => { var _a, _b; return `Mosaic ${((_b = (_a = app.serviceManager.kernelspecs.specs) === null || _a === void 0 ? void 0 : _a.kernelspecs[args.kernelName]) === null || _b === void 0 ? void 0 : _b.display_name) || ''}`; },
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
        // add launch icon to launcher
        for (const name in app.serviceManager.kernelspecs.specs.kernelspecs) {
            const spec = app.serviceManager.kernelspecs.specs.kernelspecs[name];
            launcher.add({
                command: 'mosaic-notebook:create-new',
                args: { kernelName: name },
                category: 'Notebook',
                rank: 0,
                kernelIconUrl: `${spec.resources['logo-svg']}`,
            });
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ }),

/***/ "./lib/mosaicdrag.js":
/*!***************************!*\
  !*** ./lib/mosaicdrag.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mosaicDragOver: () => (/* binding */ mosaicDragOver),
/* harmony export */   mosaicDrop: () => (/* binding */ mosaicDrop)
/* harmony export */ });
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/cells */ "webpack/sharing/consume/default/@jupyterlab/cells");
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @lumino/algorithm */ "webpack/sharing/consume/default/@lumino/algorithm");
/* harmony import */ var _lumino_algorithm__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./MosaicGroup */ "./lib/MosaicGroup.js");




// import { MosaicNotebook } from './MosaicNotebookPanel';
// import { MosaicNotebookViewModel } from './MosaicViewModel';
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';
const JUPYTER_CELL_CLASS = 'jp-Cell';
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';
function mosaicDrop(notebook, event) {
    var _a;
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
        event.dropAction = 'none';
        return;
    }
    // let target = event.target as HTMLElement;
    let target = elFromPoint(event.clientX, event.clientY);
    while (target && target.parentElement) {
        if (target.classList.contains(DROP_TARGET_CLASS)) {
            target.classList.remove(DROP_TARGET_CLASS);
            break;
        }
        target = target.parentElement;
    }
    // Model presence should be checked before calling event handlers
    notebook.model;
    const source = event.source;
    if (source === notebook) {
        // Handle the case where we are moving cells within
        // the same notebook.
        event.dropAction = 'move';
        const toMove = event.mimeData.getData('internal:cells');
        // For collapsed markdown headings with hidden "child" cells, move all
        // child cells as well as the markdown heading.
        const cell = toMove[toMove.length - 1];
        if (cell instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.MarkdownCell && cell.headingCollapsed) {
            const nextParent = _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookActions.findNextParentHeading(cell, source);
            if (nextParent > 0) {
                const index = (0,_lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__.findIndex)(source.widgets, (possibleCell) => {
                    return cell.model.id === possibleCell.model.id;
                });
                toMove.push(...source.widgets.slice(index + 1, nextParent));
            }
        }
        // Compute the to/from indices for the move.
        let fromIndex = _lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__.ArrayExt.firstIndexOf(notebook.widgets, toMove[0]);
        let toIndex = notebook._findCell(target);
        /** < MODIFIED: MOSAIC > **/
        let mosaicPath = [];
        let targetCell;
        if (toIndex < 0) { // not dropped on a cell, likely on mosaicgroup border
            while (target && target.parentElement) { // get nearest group
                if (target.classList.contains(_MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.NODE_CLASS)) {
                    target.classList.remove(DROP_TARGET_CLASS);
                    break;
                    // mosaicPath = notebook.findGroup(target);
                    // if (mosaicPath !== null) break;
                }
                target = target.parentElement;
            }
            if (!target || !target.parentElement) { // found no group. dropping at end of notebook
                toIndex = -1;
                target = notebook.viewportNode;
                source.viewportNode.classList.remove(DROP_TARGET_CLASS);
            }
        }
        const side = target.dataset.mosaicDropSide || closestSide(event, target, 0.25);
        const collike = (side == 'bottom' || side == 'top');
        const rowlike = (side == 'left' || side == 'right');
        const beforelike = side == 'top' || side == 'left';
        const afterlike = side == 'bottom' || side == 'right' || side == 'tab';
        if (toIndex < 0) { // on group or end space, not cell
            if (target.classList.contains(_MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.NODE_CLASS)) { // selecting edge of group
                const cells = target.getElementsByClassName(JUPYTER_CELL_CLASS);
                toIndex = notebook._findCell(cells[beforelike ? 0 : cells.length - 1]); // get first or last cell, if going before or after
                if (toIndex < 0)
                    return;
                targetCell = notebook.widgets[toIndex];
                mosaicPath = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.getPath(targetCell);
                // dropping on a group, we want to be beside it not inside, so back out 1 from the contained cell's path
                if (mosaicPath.length > 0)
                    mosaicPath = mosaicPath.slice(0, mosaicPath.length - 1);
            }
            else {
                targetCell = notebook.widgets[notebook.widgets.length - 1];
            }
        }
        else { // found a cell to drop on
            targetCell = notebook.widgets[toIndex];
            mosaicPath = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.getPath(targetCell) || [];
        }
        // create a new group to subdivide depending on side of cells its dropped on
        // const [targetGroup, ] = notebook.treeGetExisting(mosaicPath); // group to insert things in
        const targetAxis = (mosaicPath.length % 2) === 0 ? 'col' : 'row';
        if ((targetAxis == 'row' && collike)
            || (targetAxis == 'col' && rowlike)
            || (side == 'tab' && !((_a = targetCell.superMosaic) === null || _a === void 0 ? void 0 : _a.tabbed))) {
            // dropping off-axis (on top/bottom for row, or left/right for col)
            // means we subdivide. Create a new group:
            const newID = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.newUGID();
            mosaicPath = [...mosaicPath, newID];
            _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.setPath(targetCell, mosaicPath); // destination cell is part of this new group
            if (side == 'tab') {
                _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.saveMosaicState(notebook, 'mosaic:' + mosaicPath.join('/'), { tabbed: true });
            }
        }
        // get the deepest common branch of all cells to move
        let divergeDepth = 0;
        let sharedPath = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.getPath(toMove[0]) || [];
        for (let movecell of toMove) {
            const path = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.getPath(movecell);
            divergeDepth = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.divergeDepth(path, sharedPath);
            sharedPath = path.slice(0, divergeDepth);
        }
        // grafting multiple cells may transpose rows and columns. give an extra wraper to preserve source structure
        let transposeGroup;
        // mod 2 of the path tells us whether its a row or column, since these must alternate
        if (toMove.length > 1 && (divergeDepth % 2) !== (mosaicPath.length % 2)) {
            transposeGroup = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.newUGID();
        }
        // assign the metadata to each cell to place it in the mosaic
        for (const movecell of toMove) {
            const prevpath = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.getPath(movecell);
            const state = _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.loadMosaicState(notebook, 'mosaic:' + prevpath.join('/')) || {};
            if (transposeGroup)
                prevpath.splice(divergeDepth, 0, transposeGroup);
            const destPath = [...mosaicPath, ...prevpath.slice(divergeDepth)];
            // copy over any previous saved state for this cell's old path
            _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.saveMosaicState(notebook, 'mosaic:' + destPath.join('/'), state);
            // graft moved cell onto tree, preserving any internal structure 
            _MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.setPath(movecell, destPath);
        }
        if (toIndex === -1) {
            // If the drop is within the notebook but not on any cell,
            // most often notebook means it is past the cell areas, so
            // set it to move the cells to the end of the notebook.
            toIndex = notebook.widgets.length - 1;
        }
        let firstChangedIndex = toIndex; // include destination cell in those rearranged by mosaic, even if unmoved in index
        if (afterlike) {
            toIndex += 1; // drop on bottom or right of cell to go after it
        }
        // notebook check is needed for consistency with the view.
        if (toIndex !== notebook.widgets.length - 1 && toIndex !== -1 && toIndex > fromIndex) {
            toIndex -= 1;
        }
        // Don't move if we are within the block of selected cells.
        if (toIndex >= fromIndex && toIndex < fromIndex + toMove.length) {
            console.log('between!!');
            firstChangedIndex = Math.min(fromIndex, firstChangedIndex);
            console.log('first changed cell', notebook.widgets[firstChangedIndex].prompt);
            for (let i = 0; i < toMove.length + 1; i++) {
                if (firstChangedIndex + i >= notebook.widgets.length)
                    break;
                console.log('mos insert', 'Cell:' + notebook.widgets[firstChangedIndex + i].prompt);
                notebook._mosaic.mosaicInsert(firstChangedIndex + i);
            }
            return;
        }
        else if (toIndex > fromIndex)
            firstChangedIndex -= toMove.length;
        // Move the cells one by one
        notebook.moveCell(fromIndex, toIndex, toMove.length);
        // // if (afterlike) firstChangedIndex -= 1; // include target cell even if dropped after it
        // // console.log('first changed cell', (notebook.widgets[firstChangedIndex] as any).prompt)
        for (let i = 0; i < toMove.length + 1; i++) { // go for toMove.length+1 : do the moved cells and target cell
            if (firstChangedIndex + i >= notebook.widgets.length)
                break;
            console.log('mos insert', 'Cell:' + notebook.widgets[firstChangedIndex + i].prompt);
            notebook._mosaic.mosaicInsert(firstChangedIndex + i);
        }
    }
    else {
        // CROSS NOTEBOOK MOSAIC NOT YET IMPLEMENTED
    }
}
function mosaicDragOver(notebook, event) {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    const elements = notebook.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
        elements[0].classList.remove(DROP_TARGET_CLASS);
    }
    // let target = event.target as HTMLElement;
    let target = elFromPoint(event.clientX, event.clientY);
    let side = '';
    while (target && target.parentElement) {
        if (target.classList.contains(JUPYTER_CELL_CLASS)) {
            break;
        }
        if (target.classList.contains(_MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.NODE_CLASS)) {
            break;
        }
        if (target.classList.contains('jp-InputPrompt') || target.classList.contains('mosaic-tab-bar')) {
            side = 'tab';
        }
        target = target.parentElement;
    }
    target.classList.add(DROP_TARGET_CLASS);
    if (side == '')
        side = closestSide(event, target, 0.25);
    let index = notebook._findCell(target);
    if (index === -1) {
        if (!target || !target.parentElement) { // nothing found, probably dropping off end of notebook.
            target = event.source.viewportNode;
            target.classList.add(DROP_TARGET_CLASS);
            target.dataset.mosaicDropSide = 'bottom';
        }
    }
    else {
        const widget = notebook.cellsArray[index];
        widget.node.classList.add(DROP_TARGET_CLASS);
        // mosaic: show line on side its
        //  going to insert on
        widget.node.dataset.mosaicDropSide = side;
        target = widget.node;
    }
    const toMove = event.mimeData.getData('internal:cells');
    if (toMove.map(cell => cell.node).includes(target)) {
        // event.dropAction = 'none';
        target.dataset.mosaicDropSide = '';
    }
    // Auto-scroll if near edges
    let group = event.target;
    while (group && group.parentElement) {
        if (group.classList.contains(_MosaicGroup__WEBPACK_IMPORTED_MODULE_3__.Mosaic.INNER_GROUP_CLASS)) {
            if (group.dataset.mosaicDirection === 'row') {
                if (((event.clientX < group.getBoundingClientRect().left + 20) && (group.scrollLeft > 0))) {
                    group.scrollBy({ left: -20 });
                    // trigger new drag check since content moved under it due to scroll
                    requestAnimationFrame(() => { mosaicDragOver(notebook, event); });
                    break;
                }
                else if ((event.clientX > group.getBoundingClientRect().right - 20) && (group.scrollLeft + group.clientWidth < group.scrollWidth)) {
                    group.scrollBy({ left: 20 });
                    requestAnimationFrame(() => { mosaicDragOver(notebook, event); });
                    break;
                }
            }
            else {
                if (((event.clientY < group.getBoundingClientRect().top + 20) && (group.scrollTop > 0))) {
                    group.scrollBy({ top: -20 });
                    requestAnimationFrame(() => { mosaicDragOver(notebook, event); });
                    break;
                }
                else if ((event.clientY > group.getBoundingClientRect().bottom - 20) && (group.scrollTop + group.clientHeight < group.scrollHeight)) {
                    group.scrollBy({ top: 20 });
                    requestAnimationFrame(() => { mosaicDragOver(notebook, event); });
                    break;
                }
            }
        }
        group = group.parentElement;
    }
}
/**
 * Calculate which side of the target element the mouse is closest to.
 * @param e The drag event from @lumino/dragdrop
 * @param target The target HTMLElement
 * @param balanceAspect Make drop zones more equal size for non-square elements (0.0 = strictly use closest side, 1.0 = make all zones equal area, 0.5 = in-betweeen)
 * @returns One of 'top', 'left', 'bottom', 'right'
 */
function closestSide(e, target, balanceAspect = 0) {
    const rect = target.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    // Calculate distances to each side
    let distTop = Math.abs(y - rect.top);
    let distLeft = Math.abs(x - rect.left);
    let distBottom = Math.abs(y - rect.bottom);
    let distRight = Math.abs(x - rect.right);
    if (balanceAspect > 0) {
        const aspect = rect.width / rect.height;
        distTop = (1 - balanceAspect) * distTop + balanceAspect * distTop * aspect;
        distBottom = (1 - balanceAspect) * distBottom + balanceAspect * distBottom * aspect;
        distLeft = (1 - balanceAspect) * distLeft + balanceAspect * distLeft / aspect;
        distRight = (1 - balanceAspect) * distRight + balanceAspect * distRight / aspect;
    }
    // Find the minimum distance
    const minDist = Math.min(distTop, distLeft, distBottom, distRight);
    switch (minDist) {
        case distTop:
            return 'top';
        case distLeft:
            return 'left';
        case distBottom:
            return 'bottom';
        case distRight:
            return 'right';
        default:
            // Fallback, shouldn't happen
            return 'top';
    }
}
function elFromPoint(x, y) {
    const overlays = document.querySelectorAll('.lm-cursor-backdrop, .lm-DragImage');
    overlays.forEach(o => o.style.visibility = 'hidden');
    const realTarget = document.elementFromPoint(x, y);
    overlays.forEach(o => o.style.visibility = '');
    return realTarget;
}


/***/ }),

/***/ "./style/icons/mosaic-icon.svg":
/*!*************************************!*\
  !*** ./style/icons/mosaic-icon.svg ***!
  \*************************************/
/***/ ((module) => {

module.exports = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"300\" zoomAndPan=\"magnify\" viewBox=\"0 0 224.87999 225\" height=\"300\" preserveAspectRatio=\"xMidYMid meet\" version=\"1.0\"><defs><clipPath id=\"c77da14a9c\"><path d=\"M 5.695312 6.648438 L 218.421875 6.648438 L 218.421875 219.207031 L 5.695312 219.207031 Z M 5.695312 6.648438 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"23beb3cc63\"><path d=\"M 41.148438 41.0625 L 82.5625 41.0625 L 82.5625 112.921875 L 41.148438 112.921875 Z M 41.148438 41.0625 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"16c2531e20\"><path d=\"M 0.148438 0.0625 L 41.5625 0.0625 L 41.5625 71.921875 L 0.148438 71.921875 Z M 0.148438 0.0625 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"29353f2a72\"><rect x=\"0\" width=\"42\" y=\"0\" height=\"72\"/></clipPath><clipPath id=\"d8aae63389\"><path d=\"M 116.046875 41.070312 L 185.339844 41.070312 L 185.339844 113 L 116.046875 113 Z M 116.046875 41.070312 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"cfc5a793f8\"><path d=\"M 185.339844 41.070312 L 185.339844 112.929688 L 150.691406 86.902344 L 116.046875 112.929688 L 116.046875 41.070312 Z M 185.339844 41.070312 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"220cefa82e\"><path d=\"M 0.046875 0.0703125 L 69.339844 0.0703125 L 69.339844 72 L 0.046875 72 Z M 0.046875 0.0703125 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"3c90225054\"><path d=\"M 69.339844 0.0703125 L 69.339844 71.929688 L 34.691406 45.902344 L 0.046875 71.929688 L 0.046875 0.0703125 Z M 69.339844 0.0703125 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"d9c4b89bd7\"><rect x=\"0\" width=\"70\" y=\"0\" height=\"72\"/></clipPath><clipPath id=\"c86cb4a01a\"><path d=\"M 41.144531 140.367188 L 82.5625 140.367188 L 82.5625 182 L 41.144531 182 Z M 41.144531 140.367188 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"a9614c8938\"><path d=\"M 0.144531 0.367188 L 41.5625 0.367188 L 41.5625 42 L 0.144531 42 Z M 0.144531 0.367188 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"61a8371438\"><rect x=\"0\" width=\"42\" y=\"0\" height=\"42\"/></clipPath><clipPath id=\"ad4c9c5550\"><path d=\"M 116.042969 140.371094 L 185.335938 140.371094 L 185.335938 182.003906 L 116.042969 182.003906 Z M 116.042969 140.371094 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"414381d676\"><path d=\"M 0.0429688 0.371094 L 69.335938 0.371094 L 69.335938 42.003906 L 0.0429688 42.003906 Z M 0.0429688 0.371094 \" clip-rule=\"nonzero\"/></clipPath><clipPath id=\"f52a3b91bf\"><rect x=\"0\" width=\"70\" y=\"0\" height=\"43\"/></clipPath></defs><g clip-path=\"url(#c77da14a9c)\"><path stroke-linecap=\"butt\" transform=\"matrix(0, -0.7496, 0.7496, 0, 5.69527, 219.20806)\" fill=\"none\" stroke-linejoin=\"miter\" d=\"M 0.00137291 0.0000562556 L 283.564089 0.0000562556 L 283.564089 283.78685 L 0.00137291 283.78685 Z M 0.00137291 0.0000562556 \" stroke=\"#f7672c\" stroke-width=\"52\" stroke-opacity=\"1\" stroke-miterlimit=\"4\"/></g><g clip-path=\"url(#23beb3cc63)\"><g transform=\"matrix(1, 0, 0, 1, 41, 41)\"><g clip-path=\"url(#29353f2a72)\"><g clip-path=\"url(#16c2531e20)\"><path fill=\"#ffad31\" d=\"M 0.148438 71.921875 L 0.148438 0.09375 L 41.5625 0.09375 L 41.5625 71.921875 Z M 0.148438 71.921875 \" fill-opacity=\"1\" fill-rule=\"nonzero\"/></g></g></g></g><g clip-path=\"url(#d8aae63389)\"><g clip-path=\"url(#cfc5a793f8)\"><g transform=\"matrix(1, 0, 0, 1, 116, 41)\"><g clip-path=\"url(#d9c4b89bd7)\"><g clip-path=\"url(#220cefa82e)\"><g clip-path=\"url(#3c90225054)\"><path fill=\"#f7672c\" d=\"M 0.046875 0.0703125 L 69.339844 0.0703125 L 69.339844 71.800781 L 0.046875 71.800781 Z M 0.046875 0.0703125 \" fill-opacity=\"1\" fill-rule=\"nonzero\"/></g></g></g></g></g></g><g clip-path=\"url(#c86cb4a01a)\"><g transform=\"matrix(1, 0, 0, 1, 41, 140)\"><g clip-path=\"url(#61a8371438)\"><g clip-path=\"url(#a9614c8938)\"><path fill=\"#ff914d\" d=\"M 0.144531 42 L 0.144531 0.425781 L 41.5625 0.425781 L 41.5625 42 Z M 0.144531 42 \" fill-opacity=\"1\" fill-rule=\"nonzero\"/></g></g></g></g><g clip-path=\"url(#ad4c9c5550)\"><g transform=\"matrix(1, 0, 0, 1, 116, 140)\"><g clip-path=\"url(#f52a3b91bf)\"><g clip-path=\"url(#414381d676)\"><path fill=\"#ffad31\" d=\"M 0.0429688 42.003906 L 0.0429688 0.371094 L 69.324219 0.371094 L 69.324219 42.003906 Z M 0.0429688 42.003906 \" fill-opacity=\"1\" fill-rule=\"nonzero\"/></g></g></g></g></svg>";

/***/ })

}]);
//# sourceMappingURL=lib_index_js.0e9e97dc5b4f26834d01.js.map