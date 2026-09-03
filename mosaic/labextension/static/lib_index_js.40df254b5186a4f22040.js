"use strict";
(self["webpackChunkmosaic"] = self["webpackChunkmosaic"] || []).push([["lib_index_js"],{

/***/ "./lib/MosaicGrid.js":
/*!***************************!*\
  !*** ./lib/MosaicGrid.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MosaicGrid: () => (/* binding */ MosaicGrid)
/* harmony export */ });
/* harmony import */ var _MosaicTree__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./MosaicTree */ "./lib/MosaicTree.js");
/**
 * Applies a {@link ISolution} to the notebook's viewport as a flat CSS grid.
 *
 * Every cell node stays a direct child of `.jp-WindowedPanel-viewport`, because
 * `NotebookWindowedLayout._findNearestChildBinarySearch` reads
 * `dataset.windowedListIndex` off *every* child and spins forever on a `NaN`.
 * All chrome therefore lives in a separate overlay plane parented to
 * `.jp-WindowedPanel-inner`, a sibling of the viewport.
 *
 * Groups in 'scroll'/'tabs' mode are opaque to the grid: they occupy a single
 * grid area, and their cells are absolutely positioned *against that area*
 * (per CSS Grid 9.2 an abspos child with a definite grid position uses its grid
 * area as containing block) so their content contributes nothing to track
 * sizing. Scrolling is simulated by offsetting those cells and clipping the two
 * that straddle each edge.
 */

/** How far, in px, a drop may sit from a gutter's centre line and still hit. */
const GUTTER_HIT_SLOP = 6;
/** Fallback height (px) assumed for a cell that has never been measured. */
const ESTIMATED_CELL_HEIGHT = 90;
function intersect(a, b) {
    return {
        x0: Math.max(a.x0, b.x0),
        y0: Math.max(a.y0, b.y0),
        x1: Math.min(a.x1, b.x1),
        y1: Math.min(a.y1, b.y1)
    };
}
class MosaicGrid {
    constructor(viewport, inner, outer, host) {
        this.viewport = viewport;
        this.inner = inner;
        this.outer = outer;
        this.host = host;
        this._observed = new WeakSet();
        this._heights = new WeakMap();
        /** Per-group scroll offset, in px. Session state only -- never persisted. */
        this._scroll = new Map();
        this._solution = null;
        this._rowOffsets = [0];
        this._colOffsets = [0];
        this._boxes = new Map();
        this._padRight = 0;
        this._rowGap = 0;
        this._colGap = 0;
        this._chrome = new Map();
        /** Every group we know a box for, including ones nested inside managed groups. */
        this._nodesByKey = new Map();
        this._version = 0;
        /** Local (group-space) start/end of each managed cell, by group key. */
        this._localOffsets = new Map();
        this._tabState = new Map();
        this._gutterNodes = new Map();
        this._contentExtent = new Map();
        this._overlay = document.createElement('div');
        this._overlay.className = 'mosaic-overlay';
        this.inner.appendChild(this._overlay);
        this.viewport.classList.add('mosaic-grid');
        // We observe each cell's *children*, not the cell itself. Cells are
        // stretched to their grid track, so the cell box tells us the track height
        // we already chose -- feeding that back into the track floor would be
        // circular and could only ever ratchet upwards. A cell is a column flex
        // container, so its wrappers sit at content height whatever the box does.
        this._resizeObserver = new ResizeObserver(entries => {
            const dirty = new Set();
            for (const entry of entries) {
                const cell = entry.target.closest('.jp-Cell');
                if (cell) {
                    dirty.add(cell);
                }
            }
            let changed = false;
            for (const cell of dirty) {
                if (this._refreshHeight(cell)) {
                    changed = true;
                }
            }
            if (changed) {
                this.host.requestUpdate();
            }
        });
        // The panel can be resized without any cell changing, and stale group
        // boxes leave absolutely positioned chrome hanging past the new width --
        // which the outer node then lets you scroll into.
        this._outerResizeObserver = new ResizeObserver(() => {
            this.host.requestUpdate();
        });
        this._outerResizeObserver.observe(this.outer);
        this._onWheel = this._onWheel.bind(this);
        this._onDblClick = this._onDblClick.bind(this);
        this.outer.addEventListener('wheel', this._onWheel, { passive: false });
        this.viewport.addEventListener('dblclick', this._onDblClick);
    }
    /**
     * Where a grid line sits, excluding the gap that follows the track before it.
     *
     * Offsets carry each track's trailing gap, so reading one straight off makes
     * every box a gap too long. Harmless where boxes only need to abut, but it
     * put the rule inside a gutter half a gap off centre.
     */
    _edge(offsets, line, gap) {
        var _a;
        const value = (_a = offsets[line - 1]) !== null && _a !== void 0 ? _a : 0;
        return line - 1 < offsets.length - 1 ? value - gap : value;
    }
    /**
     * Bumped on every layout pass. `getRangeToRender` must not answer "unchanged"
     * across one: after a move the hull can be numerically identical while the
     * cells behind those indices are different, and returning null would leave
     * the notebook's `windowedListIndex` and DOM order stale.
     */
    get version() {
        return this._version;
    }
    /** Resolved row-line offsets in px, length = row track count + 1. */
    get rowOffsets() {
        return this._rowOffsets;
    }
    /**
     * Height of the grid's tracks. Excludes the viewport padding, which
     * `WindowedList._updateTotalSize` adds back on its own.
     */
    get totalHeight() {
        var _a, _b;
        const last = (_a = this._rowOffsets[this._rowOffsets.length - 1]) !== null && _a !== void 0 ? _a : 0;
        return Math.max(0, last - ((_b = this._rowOffsets[0]) !== null && _b !== void 0 ? _b : 0));
    }
    get solution() {
        return this._solution;
    }
    /**
     * Linear cell indices whose grid rows intersect the given vertical band.
     *
     * The geometrically visible set is not always contiguous in linear index (a
     * row holding both a nested column and a full-height cell interleaves), so we
     * return its hull. Overshoot is bounded by the height of the tallest band.
     */
    hullForBand(top, bottom) {
        var _a, _b, _c;
        const solution = this._solution;
        if (!solution || this._rowOffsets.length < 2) {
            return null;
        }
        let start = -1;
        let stop = -1;
        for (const [index, placement] of solution.placements) {
            const y0 = (_a = this._rowOffsets[placement.rowStart - 1]) !== null && _a !== void 0 ? _a : 0;
            const y1 = (_c = (_b = this._rowOffsets[placement.rowEnd - 1]) !== null && _b !== void 0 ? _b : this._rowOffsets[this._rowOffsets.length - 1]) !== null && _c !== void 0 ? _c : 0;
            if (y1 >= top && y0 <= bottom) {
                if (start < 0 || index < start) {
                    start = index;
                }
                if (index > stop) {
                    stop = index;
                }
            }
        }
        return start < 0 ? null : [start, stop];
    }
    /**
     * A cell's rectangle, in grid coordinates.
     *
     * Every rect comes from the solved layout rather than the DOM. Reading laid
     * out boxes for rendered cells and falling back to track offsets for the rest
     * mixed two coordinate systems -- the DOM box includes the viewport's edge
     * padding and the track offsets do not -- so in a windowed notebook the
     * active cell's edge sat a padding's width past its true neighbour, which was
     * then rejected as being behind it. That left only distant cells to pick
     * from. Vertical steps survived it because a row's height dwarfs the padding.
     */
    cellRect(index) {
        var _a, _b;
        const solution = this._solution;
        if (!solution) {
            return null;
        }
        if (solution.managedOwner.has(index)) {
            // Cells in a managed group are laid out in the group's local space, and
            // their offsets are recorded against the outermost such group.
            const root = solution.managed.find(entry => entry.cells.includes(index));
            if (root) {
                const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(root.node.path);
                const box = (_a = this._boxes.get(key)) !== null && _a !== void 0 ? _a : this._boxOf(root.placement);
                const local = (_b = this._localOffsets.get(key)) === null || _b === void 0 ? void 0 : _b.get(index);
                if (!local) {
                    return { x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h };
                }
                return root.node.axis === 'col'
                    ? {
                        x0: box.x,
                        x1: box.x + box.w,
                        y0: box.y + local.start,
                        y1: box.y + local.end
                    }
                    : {
                        x0: box.x + local.start,
                        x1: box.x + local.end,
                        y0: box.y,
                        y1: box.y + box.h
                    };
            }
        }
        const placement = solution.placements.get(index);
        if (!placement) {
            return null;
        }
        const box = this._boxOf(placement);
        return { x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h };
    }
    /** Vertical extent of a cell in grid coordinates, or null if unplaced. */
    cellSpan(index) {
        var _a, _b;
        const placement = (_a = this._solution) === null || _a === void 0 ? void 0 : _a.placements.get(index);
        if (!placement) {
            return null;
        }
        return [
            (_b = this._rowOffsets[placement.rowStart - 1]) !== null && _b !== void 0 ? _b : 0,
            this._edge(this._rowOffsets, placement.rowEnd, this._rowGap)
        ];
    }
    /**
     * Bring a cell into view, scrolling every managed ancestor as needed.
     * Returns the document-space offset the outer notebook should scroll to, or
     * null if the cell is already within the outer viewport.
     */
    revealCell(index, viewTop, viewHeight) {
        var _a, _b;
        const solution = this._solution;
        if (!solution) {
            return null;
        }
        // Scroll every managed ancestor so the cell sits inside its group's band.
        const owner = solution.managedOwner.get(index);
        if (owner) {
            const chain = solution.managed.filter(entry => entry.cells.includes(index));
            for (const entry of chain) {
                const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(entry.node.path);
                const local = (_a = this._localOffsets.get(key)) === null || _a === void 0 ? void 0 : _a.get(index);
                const box = this._boxes.get(key);
                if (!local || !box) {
                    continue;
                }
                const extent = entry.node.axis === 'col' ? box.h : box.w;
                const current = (_b = this._scroll.get(key)) !== null && _b !== void 0 ? _b : 0;
                let next = current;
                if (local.start < current) {
                    next = local.start;
                }
                else if (local.end > current + extent) {
                    next = local.end - extent;
                }
                if (next !== current) {
                    this._scroll.set(key, Math.max(0, next));
                    this.host.requestUpdate();
                }
            }
        }
        const span = this.cellSpan(index);
        if (!span) {
            return null;
        }
        const [top, bottom] = span;
        if (top < viewTop) {
            return top;
        }
        if (bottom > viewTop + viewHeight) {
            return Math.max(0, bottom - viewHeight);
        }
        return null;
    }
    /**
     * Lay the notebook out. Runs in two phases because the interior of a managed
     * group needs the group's resolved pixel box, which only exists once the grid
     * has been sized.
     */
    update(solution) {
        this._solution = solution;
        this._version++;
        const count = this.host.cellCount();
        // -- phase 0: measure ---------------------------------------------------
        // Content heights first, so this pass's track floors are computed from
        // current measurements rather than the previous pass's.
        for (let index = 0; index < count; index++) {
            const node = this.host.cellNode(index);
            if (node) {
                this._observe(node);
                this._refreshHeight(node);
            }
        }
        // -- phase 1: tracks and flow placement --------------------------------
        // Gutters are fixed-width tracks; the rest share the space by weight.
        const factors = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.flexFactors)(solution.colTracks.filter(t => !t.gutter).map(t => t.weight));
        let flexible = 0;
        const cols = solution.colTracks.length
            ? solution.colTracks
                .map(track => track.gutter
                ? 'var(--mosaic-gutter)'
                : `minmax(var(--mosaic-cell-min-width), ${factors[flexible++].toFixed(4)}fr)`)
                .join(' ')
            : '1fr';
        const floors = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.rowFloors)(solution, i => this._cellHeight(i));
        const rows = solution.rowTracks.length
            ? solution.rowTracks
                .map((track, i) => track.gutter
                ? 'var(--mosaic-gutter)'
                : floors[i] > 0
                    ? `minmax(${floors[i].toFixed(2)}px, auto)`
                    : 'auto')
                .join(' ')
            : 'auto';
        this.viewport.style.gridTemplateColumns = cols;
        this.viewport.style.gridTemplateRows = rows;
        for (let index = 0; index < count; index++) {
            const node = this.host.cellNode(index);
            if (!node) {
                continue;
            }
            const placement = solution.placements.get(index);
            if (!placement) {
                this._park(node);
                continue;
            }
            const managed = solution.managedOwner.get(index);
            this._applyPlacement(node, managed ? managed.placement : placement);
            node.classList.toggle('mosaic-managed', !!managed);
            if (!managed) {
                this._reset(node);
            }
        }
        // -- phase 2: read back resolved geometry ------------------------------
        this._fitWidth();
        // -- phase 3: managed interiors ----------------------------------------
        this._localOffsets.clear();
        this._boxes.clear();
        this._nodesByKey.clear();
        for (const [key, entry] of solution.groupPlacements) {
            this._boxes.set(key, this._boxOf(entry.placement));
            this._nodesByKey.set(key, entry.node);
        }
        const managedPaths = new Set(solution.managed.map(m => m.node.path.join('/')));
        for (const entry of solution.managed) {
            const path = entry.node.path;
            const nestedInAnother = path.some((_, i) => i > 0 ? managedPaths.has(path.slice(0, i).join('/')) : false);
            if (!nestedInAnother) {
                this._layoutManaged(entry);
            }
        }
        // -- phase 4: chrome ---------------------------------------------------
        this._updateGutters(solution);
        this._updateChrome(solution);
    }
    /**
     * Parse the browser's resolved track sizes into cumulative line offsets.
     *
     * Offsets start at the viewport's padding, not at zero: tracks begin at the
     * content-box origin, while the overlay plane these coordinates drive is
     * positioned against the border box. Starting at zero drew every rule and
     * frame one padding too high and too far left.
     */
    _readTracks() {
        const style = getComputedStyle(this.viewport);
        const rowGap = parseFloat(style.rowGap) || 0;
        const colGap = parseFloat(style.columnGap) || 0;
        const padTop = parseFloat(style.paddingTop) || 0;
        const padLeft = parseFloat(style.paddingLeft) || 0;
        this._padRight = parseFloat(style.paddingRight) || 0;
        const parse = (value, gap, start) => {
            const sizes = value
                .split(' ')
                .map(v => parseFloat(v))
                .filter(v => Number.isFinite(v));
            const offsets = [start];
            for (let i = 0; i < sizes.length; i++) {
                offsets.push(offsets[i] + sizes[i] + (i + 1 < sizes.length ? gap : 0));
            }
            return offsets;
        };
        this._rowGap = rowGap;
        this._colGap = colGap;
        this._rowOffsets = parse(style.gridTemplateRows, rowGap, padTop);
        this._colOffsets = parse(style.gridTemplateColumns, colGap, padLeft);
    }
    /**
     * Size the scrollable area to the grid, exactly.
     *
     * Columns have a minimum width, so a narrow panel makes the grid wider than
     * the panel. The viewport is absolutely positioned and pinned to both edges,
     * which clamps it to the panel and leaves that overflow unreachable. Widening
     * the inner element to the content gives the outer node a real scrollable
     * width -- and no more than that, so there is never blank space to scroll
     * into that holds no cells.
     *
     * The measurement is always taken with any previously forced width released.
     * Deciding from a width we ourselves imposed on an earlier pass made the
     * fitted size ratchet: the tracks refill whatever width they are given, so
     * the requirement could only ever grow, and the grid stayed pinned at a stale
     * width while the panel grew past it.
     *
     * Leaves the track offsets current, so callers need not re-read them.
     */
    _fitWidth() {
        var _a;
        this._release();
        this._readTracks();
        // Offsets already carry the leading padding, so only the trailing one is
        // still missing from the border-box width the scroller needs.
        const content = ((_a = this._colOffsets[this._colOffsets.length - 1]) !== null && _a !== void 0 ? _a : 0) + this._padRight;
        if (content > this.outer.clientWidth + 1) {
            this.inner.style.width = `${content}px`;
            this.viewport.style.right = 'auto';
            this.viewport.style.width = `${content}px`;
            this._readTracks();
        }
    }
    /** Return the viewport to spanning the panel. */
    _release() {
        this.inner.style.width = '';
        this.viewport.style.right = '0';
        this.viewport.style.width = '';
    }
    _boxOf(placement) {
        var _a, _b;
        const x = (_a = this._colOffsets[placement.colStart - 1]) !== null && _a !== void 0 ? _a : 0;
        const y = (_b = this._rowOffsets[placement.rowStart - 1]) !== null && _b !== void 0 ? _b : 0;
        const x1 = this._edge(this._colOffsets, placement.colEnd, this._colGap);
        const y1 = this._edge(this._rowOffsets, placement.rowEnd, this._rowGap);
        return { x, y, w: Math.max(0, x1 - x), h: Math.max(0, y1 - y) };
    }
    /**
     * A cell's intrinsic content height, independent of how tall its grid track
     * stretched the cell box. Returns 0 for a placeholder with no children yet.
     */
    _measureContent(el) {
        let total = 0;
        for (const child of Array.from(el.children)) {
            // Only in-flow children contribute: an absolutely positioned overlay is
            // sized by the stretched cell box, which is what we are avoiding here.
            const position = getComputedStyle(child).position;
            if (position === 'absolute' || position === 'fixed') {
                continue;
            }
            total += child.offsetHeight;
        }
        if (total === 0) {
            return 0;
        }
        const style = getComputedStyle(el);
        return (total +
            (parseFloat(style.paddingTop) || 0) +
            (parseFloat(style.paddingBottom) || 0) +
            (parseFloat(style.borderTopWidth) || 0) +
            (parseFloat(style.borderBottomWidth) || 0));
    }
    /** Re-measure a cell, returning true if its content height moved. */
    _refreshHeight(el) {
        var _a;
        if (!el.isConnected ||
            el.dataset.mosaicHidden ||
            el.style.display === 'none') {
            return false; // keep the last good measurement while culled
        }
        const height = this._measureContent(el);
        if (height <= 0) {
            return false;
        }
        if (Math.abs(((_a = this._heights.get(el)) !== null && _a !== void 0 ? _a : -1) - height) <= 0.5) {
            return false;
        }
        this._heights.set(el, height);
        return true;
    }
    /** Last measured content height of a cell, else the notebook's estimate. */
    _cellHeight(index) {
        var _a;
        const el = this.host.cellNode(index);
        const measured = el ? this._heights.get(el) : undefined;
        return (_a = measured !== null && measured !== void 0 ? measured : this.host.estimateHeight(index)) !== null && _a !== void 0 ? _a : ESTIMATED_CELL_HEIGHT;
    }
    /** Height a node wants, using cached measurements where available. */
    _naturalHeight(node) {
        if (node.kind === 'cell') {
            return this._cellHeight(node.index);
        }
        if (node.mode !== 'flow') {
            return node.size;
        }
        if (node.axis === 'col') {
            return node.children.reduce((sum, c) => sum + this._naturalHeight(c), 0);
        }
        return node.children.reduce((max, c) => Math.max(max, this._naturalHeight(c)), 0);
    }
    /** Total extent of a group's children along its own axis. */
    _contentOf(node) {
        if (node.mode === 'tabs') {
            const active = node.children[this._activeTab(node)];
            return active ? this._extentOf(active, node.axis) : 0;
        }
        let total = 0;
        for (const child of node.children) {
            total += this._extentOf(child, node.axis);
        }
        return total;
    }
    /** Extent a node wants along one axis, using cached measurements. */
    _extentOf(node, axis) {
        if (axis === 'col') {
            return this._naturalHeight(node);
        }
        if (node.kind === 'cell') {
            return this._minCellWidth();
        }
        if (node.mode !== 'flow') {
            return node.size;
        }
        if (node.axis === 'row') {
            return node.children.reduce((s, c) => s + this._extentOf(c, 'row'), 0);
        }
        return node.children.reduce((m, c) => Math.max(m, this._extentOf(c, 'row')), 0);
    }
    _minCellWidth() {
        return (parseFloat(getComputedStyle(this.viewport).getPropertyValue('--mosaic-cell-min-width')) || 160);
    }
    _activeTab(node) {
        var _a;
        const stored = (_a = this._tabState.get((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(node.path))) !== null && _a !== void 0 ? _a : 0;
        return Math.min(Math.max(stored, 0), Math.max(node.children.length - 1, 0));
    }
    setActiveTab(path, index) {
        this._tabState.set((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(path), index);
        this.host.requestUpdate();
    }
    /**
     * Position everything inside a top-level managed group.
     *
     * All coordinates below are local to that group's grid area, which is the
     * containing block of every cell it owns. Nested managed groups share the
     * same space and simply carry their own scroll offset and clip rectangle,
     * so scroll-inside-scroll composes without any extra DOM.
     */
    _layoutManaged(entry) {
        var _a;
        const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(entry.node.path);
        const box = (_a = this._boxes.get(key)) !== null && _a !== void 0 ? _a : this._boxOf(entry.placement);
        const locals = new Map();
        this._localOffsets.set(key, locals);
        this._commit(entry.node, 0, 0, box.w, box.h, { x0: 0, y0: 0, x1: box.w, y1: box.h }, { root: entry, rootBox: box, locals });
    }
    /** Lay a node into the rect (x, y, w, h), in root-managed-group coordinates. */
    _commit(node, x, y, w, h, clip, ctx) {
        var _a, _b;
        if (node.kind === 'cell') {
            const vertical = ctx.root.node.axis === 'col';
            ctx.locals.set(node.index, {
                start: vertical ? y : x,
                end: vertical ? y + h : x + w
            });
            const el = this.host.cellNode(node.index);
            if (el) {
                this._placeAbsolute(el, x, y, w, h, clip);
            }
            return;
        }
        let originX = x;
        let originY = y;
        let childClip = clip;
        if (node !== ctx.root.node && node.mode !== 'flow') {
            // A nested managed group: give it its own box, scroll and clip.
            const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(node.path);
            this._boxes.set(key, {
                x: ctx.rootBox.x + x,
                y: ctx.rootBox.y + y,
                w,
                h
            });
            this._nodesByKey.set(key, node);
            const extent = node.axis === 'col' ? h : w;
            const content = this._contentOf(node);
            this._contentExtent.set(key, content);
            const scroll = Math.min((_a = this._scroll.get(key)) !== null && _a !== void 0 ? _a : 0, Math.max(0, content - extent));
            this._scroll.set(key, scroll);
            if (node.axis === 'col') {
                originY -= scroll;
            }
            else {
                originX -= scroll;
            }
            childClip = intersect(clip, { x0: x, y0: y, x1: x + w, y1: y + h });
        }
        else if (node === ctx.root.node) {
            const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(node.path);
            const extent = node.axis === 'col' ? h : w;
            const content = this._contentOf(node);
            this._contentExtent.set(key, content);
            const scroll = Math.min((_b = this._scroll.get(key)) !== null && _b !== void 0 ? _b : 0, Math.max(0, content - extent));
            this._scroll.set(key, scroll);
            if (node.axis === 'col') {
                originY -= scroll;
            }
            else {
                originX -= scroll;
            }
        }
        const managed = node.mode !== 'flow';
        const children = node.mode === 'tabs'
            ? node.children.slice(this._activeTab(node), this._activeTab(node) + 1)
            : node.children;
        // Anything under an inactive tab leaves the layout entirely.
        if (node.mode === 'tabs') {
            const active = this._activeTab(node);
            for (let i = 0; i < node.children.length; i++) {
                if (i === active) {
                    continue;
                }
                for (const index of collect(node.children[i])) {
                    const el = this.host.cellNode(index);
                    if (el) {
                        this._hide(el);
                    }
                }
            }
        }
        const total = children.reduce((sum, c) => sum + (c.weight > 0 ? c.weight : 1), 0) || 1;
        let cursor = node.axis === 'col' ? originY : originX;
        for (const child of children) {
            const share = (child.weight > 0 ? child.weight : 1) / total;
            if (node.axis === 'col') {
                // A managed group overflows along its own axis; a flowing one divides
                // the space it was given.
                const ch = managed ? this._extentOf(child, 'col') : h * share;
                this._commit(child, originX, cursor, w, ch, childClip, ctx);
                cursor += ch;
            }
            else {
                const cw = managed ? this._extentOf(child, 'row') : w * share;
                this._commit(child, cursor, originY, cw, h, childClip, ctx);
                cursor += cw;
            }
        }
    }
    /**
     * Absolutely position a cell against its root managed group's grid area,
     * clipping it to the accumulated clip rectangle.
     */
    _placeAbsolute(el, x, y, w, h, clip) {
        // Entirely outside the visible band: drop it (tier-2 culling).
        if (x + w <= clip.x0 || x >= clip.x1 || y + h <= clip.y0 || y >= clip.y1) {
            this._hide(el);
            return;
        }
        this._show(el);
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        // clip-path establishes a containing block for fixed-position descendants,
        // so only the cells actually straddling an edge get one.
        const top = Math.max(0, clip.y0 - y);
        const left = Math.max(0, clip.x0 - x);
        const bottom = Math.max(0, y + h - clip.y1);
        const right = Math.max(0, x + w - clip.x1);
        el.style.clipPath =
            top || left || bottom || right
                ? `inset(${top}px ${right}px ${bottom}px ${left}px)`
                : '';
    }
    _applyPlacement(el, placement) {
        el.style.gridRow = `${placement.rowStart} / ${placement.rowEnd}`;
        el.style.gridColumn = `${placement.colStart} / ${placement.colEnd}`;
    }
    _reset(el) {
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
        el.style.right = '';
        el.style.width = '';
        el.style.height = '';
        el.style.clipPath = '';
        this._show(el);
    }
    /** A cell with no placement (e.g. mid-move) is kept out of the way. */
    _park(el) {
        this._reset(el);
        el.style.gridRow = '';
        el.style.gridColumn = '';
    }
    _hide(el) {
        el.dataset.mosaicHidden = 'true';
        el.style.display = 'none';
    }
    _show(el) {
        if (el.dataset.mosaicHidden) {
            delete el.dataset.mosaicHidden;
            el.style.display = '';
        }
    }
    /**
     * Watch a cell for size changes.
     *
     * The cell box itself is watched as well as its children: a cell still in
     * placeholder form has no children to watch, and once it rendered them
     * nothing was left observing it, so the layout kept a stale height until some
     * unrelated edit forced a rebuild.
     */
    _observe(el) {
        if (!this._observed.has(el)) {
            this._observed.add(el);
            this._resizeObserver.observe(el);
        }
        for (const child of Array.from(el.children)) {
            if (!this._observed.has(child)) {
                this._observed.add(child);
                this._resizeObserver.observe(child);
            }
        }
    }
    /** A gutter's rectangle in grid coordinates. */
    gutterRect(gutter) {
        var _a, _b;
        const along = gutter.axis === 'col' ? this._rowOffsets : this._colOffsets;
        const across = gutter.axis === 'col' ? this._colOffsets : this._rowOffsets;
        const alongGap = gutter.axis === 'col' ? this._rowGap : this._colGap;
        const acrossGap = gutter.axis === 'col' ? this._colGap : this._rowGap;
        const a0 = (_a = along[gutter.line - 1]) !== null && _a !== void 0 ? _a : 0;
        const a1 = this._edge(along, gutter.line + 1, alongGap);
        const b0 = (_b = across[gutter.start - 1]) !== null && _b !== void 0 ? _b : 0;
        const b1 = this._edge(across, gutter.end, acrossGap);
        return gutter.axis === 'col'
            ? { x0: b0, x1: b1, y0: a0, y1: a1 }
            : { x0: a0, x1: a1, y0: b0, y1: b1 };
    }
    /** The gutter under a viewport-local point, if any. */
    gutterAt(x, y) {
        var _a, _b;
        for (const gutter of (_b = (_a = this._solution) === null || _a === void 0 ? void 0 : _a.gutters) !== null && _b !== void 0 ? _b : []) {
            const r = this.gutterRect(gutter);
            if (x >= r.x0 - GUTTER_HIT_SLOP &&
                x <= r.x1 + GUTTER_HIT_SLOP &&
                y >= r.y0 - GUTTER_HIT_SLOP &&
                y <= r.y1 + GUTTER_HIT_SLOP) {
                return gutter;
            }
        }
        return null;
    }
    /** Bottom of the laid-out grid, in viewport coordinates. */
    get contentBottom() {
        return this._edge(this._rowOffsets, this._rowOffsets.length, this._rowGap);
    }
    /** Highlight one gutter as the pending drop target, or clear the highlight. */
    highlightGutter(gutter) {
        for (const [key, el] of this._gutterNodes) {
            el.classList.toggle('mosaic-gutter-active', gutter !== null && key === gutterKey(gutter));
        }
    }
    /** Draw the rule that sits between two adjacent groups. */
    _updateGutters(solution) {
        const seen = new Set();
        for (const gutter of solution.gutters) {
            const key = gutterKey(gutter);
            seen.add(key);
            let el = this._gutterNodes.get(key);
            if (!el) {
                el = document.createElement('div');
                el.className = 'mosaic-gutter';
                this._gutterNodes.set(key, el);
                this._overlay.appendChild(el);
            }
            const r = this.gutterRect(gutter);
            el.dataset.mosaicAxis = gutter.axis;
            el.style.transform = `translate(${r.x0}px, ${r.y0}px)`;
            el.style.width = `${Math.max(0, r.x1 - r.x0)}px`;
            el.style.height = `${Math.max(0, r.y1 - r.y0)}px`;
        }
        for (const [key, el] of [...this._gutterNodes]) {
            if (!seen.has(key)) {
                el.remove();
                this._gutterNodes.delete(key);
            }
        }
    }
    // -- chrome ---------------------------------------------------------------
    _updateChrome(solution) {
        const seen = new Set();
        for (const [key, node] of this._nodesByKey) {
            if (node.path.length === 0) {
                continue; // the root has no frame
            }
            const box = this._boxes.get(key);
            if (!box) {
                continue;
            }
            seen.add(key);
            let frame = this._chrome.get(key);
            if (!frame) {
                frame = this._createFrame(node);
                this._chrome.set(key, frame);
                this._overlay.appendChild(frame);
            }
            frame.dataset.mosaicMode = node.mode;
            frame.dataset.mosaicAxis = node.axis;
            frame.style.transform = `translate(${box.x}px, ${box.y}px)`;
            frame.style.width = `${box.w}px`;
            frame.style.height = `${box.h}px`;
            this._updateScrollbar(frame, node, key, box);
            this._updateTabBar(frame, node, key);
        }
        void solution;
        for (const [key, frame] of [...this._chrome]) {
            if (!seen.has(key)) {
                frame.remove();
                this._chrome.delete(key);
            }
        }
    }
    _createFrame(node) {
        const frame = document.createElement('div');
        frame.className = 'mosaic-frame';
        const run = document.createElement('button');
        run.className = 'mosaic-frame-run';
        run.title = 'Run all cells in this group';
        run.textContent = '▶';
        run.onclick = () => this.host.runGroup(node);
        frame.appendChild(run);
        const bar = document.createElement('div');
        bar.className = 'mosaic-frame-scrollbar';
        const thumb = document.createElement('div');
        thumb.className = 'mosaic-frame-thumb';
        bar.appendChild(thumb);
        frame.appendChild(bar);
        const tabs = document.createElement('div');
        tabs.className = 'mosaic-frame-tabs';
        frame.appendChild(tabs);
        this._wireThumb(thumb, node);
        return frame;
    }
    _wireThumb(thumb, node) {
        thumb.addEventListener('pointerdown', (down) => {
            var _a, _b;
            down.preventDefault();
            down.stopPropagation();
            const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(node.path);
            const box = this._boxes.get(key);
            if (!box) {
                return;
            }
            const vertical = node.axis === 'col';
            const extent = vertical ? box.h : box.w;
            const content = (_a = this._contentExtent.get(key)) !== null && _a !== void 0 ? _a : extent;
            const start = vertical ? down.clientY : down.clientX;
            const origin = (_b = this._scroll.get(key)) !== null && _b !== void 0 ? _b : 0;
            const ratio = content / Math.max(extent, 1);
            const move = (e) => {
                const delta = (vertical ? e.clientY : e.clientX) - start;
                this._scroll.set(key, Math.min(Math.max(0, origin + delta * ratio), Math.max(0, content - extent)));
                this.host.requestUpdate();
            };
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        });
    }
    _updateScrollbar(frame, node, key, box) {
        var _a, _b;
        const bar = frame.querySelector('.mosaic-frame-scrollbar');
        const thumb = frame.querySelector('.mosaic-frame-thumb');
        if (node.mode === 'flow') {
            bar.style.display = 'none';
            return;
        }
        const vertical = node.axis === 'col';
        const extent = vertical ? box.h : box.w;
        const content = (_a = this._contentExtent.get(key)) !== null && _a !== void 0 ? _a : this._contentOf(node);
        if (content <= extent + 1) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = '';
        const scroll = (_b = this._scroll.get(key)) !== null && _b !== void 0 ? _b : 0;
        const frac = Math.max(0.08, extent / content);
        const pos = (scroll / content) * extent;
        if (vertical) {
            thumb.style.height = `${frac * extent}px`;
            thumb.style.transform = `translateY(${pos}px)`;
            thumb.style.width = '';
        }
        else {
            thumb.style.width = `${frac * extent}px`;
            thumb.style.transform = `translateX(${pos}px)`;
            thumb.style.height = '';
        }
    }
    _updateTabBar(frame, node, key) {
        const bar = frame.querySelector('.mosaic-frame-tabs');
        if (node.mode !== 'tabs') {
            bar.style.display = 'none';
            bar.replaceChildren();
            return;
        }
        bar.style.display = '';
        const active = this._activeTab(node);
        const tabs = node.children.map((child, i) => {
            const tab = document.createElement('div');
            tab.className = 'mosaic-tab' + (i === active ? ' mosaic-tab-active' : '');
            tab.textContent =
                child.kind === 'cell'
                    ? `Cell ${child.index + 1}`
                    : `${child.children.length} items`;
            tab.onclick = () => this.setActiveTab(node.path, i);
            return tab;
        });
        bar.replaceChildren(...tabs);
        void key;
    }
    // -- input ----------------------------------------------------------------
    /** Innermost managed group whose box contains a viewport-local point. */
    _managedAt(x, y) {
        const solution = this._solution;
        if (!solution) {
            return null;
        }
        let best = null;
        for (const entry of solution.managed) {
            const box = this._boxes.get((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(entry.node.path));
            if (!box) {
                continue;
            }
            if (x >= box.x &&
                x <= box.x + box.w &&
                y >= box.y &&
                y <= box.y + box.h) {
                if (!best || entry.node.path.length > best.node.path.length) {
                    best = entry;
                }
            }
        }
        return best;
    }
    /** Innermost group of any mode whose box contains a viewport-local point. */
    _groupAt(x, y) {
        const solution = this._solution;
        if (!solution) {
            return null;
        }
        void solution;
        let best = null;
        for (const [key, node] of this._nodesByKey) {
            if (node.path.length === 0) {
                continue;
            }
            const box = this._boxes.get(key);
            if (!box) {
                continue;
            }
            if (x >= box.x &&
                x <= box.x + box.w &&
                y >= box.y &&
                y <= box.y + box.h) {
                if (!best || node.path.length > best.path.length) {
                    best = node;
                }
            }
        }
        return best;
    }
    /** Convert a client point into viewport-local grid coordinates. */
    _toLocal(clientX, clientY) {
        const rect = this.viewport.getBoundingClientRect();
        return [clientX - rect.left, clientY - rect.top];
    }
    /**
     * Scroll whichever managed group sits under a client point. Used by drag
     * auto-scroll, which has no wheel events to work with.
     */
    nudgeScroll(clientX, clientY, delta) {
        var _a, _b;
        const [x, y] = this._toLocal(clientX, clientY);
        const entry = this._managedAt(x, y);
        if (!entry) {
            return false;
        }
        const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(entry.node.path);
        const box = this._boxes.get(key);
        if (!box) {
            return false;
        }
        const extent = entry.node.axis === 'col' ? box.h : box.w;
        const max = Math.max(0, ((_a = this._contentExtent.get(key)) !== null && _a !== void 0 ? _a : extent) - extent);
        const current = (_b = this._scroll.get(key)) !== null && _b !== void 0 ? _b : 0;
        const next = Math.min(Math.max(0, current + delta), max);
        if (next === current) {
            return false;
        }
        this._scroll.set(key, next);
        this.host.requestUpdate();
        return true;
    }
    /** Box of a group in viewport-local coordinates. */
    boxOfPath(path) {
        return this._boxes.get((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(path));
    }
    _onWheel(event) {
        var _a, _b;
        const [x, y] = this._toLocal(event.clientX, event.clientY);
        const entry = this._managedAt(x, y);
        if (!entry) {
            return;
        }
        const key = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(entry.node.path);
        const box = this._boxes.get(key);
        if (!box) {
            return;
        }
        const vertical = entry.node.axis === 'col';
        const extent = vertical ? box.h : box.w;
        const content = (_a = this._contentExtent.get(key)) !== null && _a !== void 0 ? _a : extent;
        const max = Math.max(0, content - extent);
        if (max <= 0) {
            return;
        }
        const delta = vertical
            ? event.deltaY
            : event.deltaX !== 0
                ? event.deltaX
                : event.deltaY;
        const current = (_b = this._scroll.get(key)) !== null && _b !== void 0 ? _b : 0;
        const next = Math.min(Math.max(0, current + delta), max);
        // At either end, hand the gesture back so the notebook scrolls (no chaining
        // comes for free without a real scroller).
        if (next === current) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this._scroll.set(key, next);
        this.host.requestUpdate();
    }
    /**
     * Double-clicking the gap around a group toggles it between flowing (grows to
     * fit) and scrolling (fixed extent). We only act when the click landed on the
     * viewport itself, i.e. in the grid gap rather than on a cell.
     */
    _onDblClick(event) {
        if (event.target !== this.viewport) {
            return;
        }
        const [x, y] = this._toLocal(event.clientX, event.clientY);
        const node = this._groupAt(x, y);
        if (!node) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const box = this._boxes.get((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(node.path));
        if (node.mode === 'flow') {
            // Freeze the group at roughly its current extent, then let it scroll.
            const size = box
                ? Math.round(node.axis === 'col' ? box.h : box.w)
                : undefined;
            this.host.saveGroupState(node, {
                mode: 'scroll',
                ...(size ? { size } : {})
            });
        }
        else {
            this.host.saveGroupState(node, { mode: 'flow' });
        }
    }
    dispose() {
        this.outer.removeEventListener('wheel', this._onWheel);
        this.viewport.removeEventListener('dblclick', this._onDblClick);
        this._resizeObserver.disconnect();
        this._outerResizeObserver.disconnect();
        this._overlay.remove();
        this._chrome.clear();
        this._gutterNodes.clear();
    }
}
function gutterKey(gutter) {
    return `${(0,_MosaicTree__WEBPACK_IMPORTED_MODULE_0__.groupKey)(gutter.path)}#${gutter.index}`;
}
function collect(node, out = []) {
    if (node.kind === 'cell') {
        out.push(node.index);
    }
    else {
        for (const child of node.children) {
            collect(child, out);
        }
    }
    return out;
}


/***/ }),

/***/ "./lib/MosaicNotebook.js":
/*!*******************************!*\
  !*** ./lib/MosaicNotebook.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MosaicNotebook: () => (/* binding */ MosaicNotebook),
/* harmony export */   MosaicNotebookPanel: () => (/* binding */ MosaicNotebookPanel),
/* harmony export */   PATH_KEY: () => (/* binding */ PATH_KEY),
/* harmony export */   WEIGHT_KEY: () => (/* binding */ WEIGHT_KEY),
/* harmony export */   cellsOf: () => (/* binding */ cellsOf),
/* harmony export */   mosaicOf: () => (/* binding */ mosaicOf)
/* harmony export */ });
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/cells */ "webpack/sharing/consume/default/@jupyterlab/cells");
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _MosaicGrid__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./MosaicGrid */ "./lib/MosaicGrid.js");
/* harmony import */ var _MosaicTree__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./MosaicTree */ "./lib/MosaicTree.js");
/* harmony import */ var _mosaicdrag__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./mosaicdrag */ "./lib/mosaicdrag.js");
/**
 * Wires the mosaic layout engine into a JupyterLab `Notebook`.
 *
 * The notebook keeps its own single `NotebookWindowedLayout` and its own view
 * model; we only override three *public* model methods and drive the grid from
 * cell metadata. Nothing ever reparents a cell widget, which is what made the
 * previous tree-of-WindowedLists approach lose cells on drag.
 */






/** Cell metadata key holding the group path. */
const PATH_KEY = 'mosaic';
/** Cell metadata key holding the cell's share of its parent's extent. */
const WEIGHT_KEY = 'mosaic_weight';
var MosaicNotebookPanel;
(function (MosaicNotebookPanel) {
    class ContentFactory extends _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookPanel.ContentFactory {
        createNotebook(options) {
            const notebook = super.createNotebook(options);
            notebook.addClass('mosaic-Notebook');
            const controller = new MosaicNotebook(notebook);
            notebook._mosaic = controller;
            return notebook;
        }
    }
    MosaicNotebookPanel.ContentFactory = ContentFactory;
})(MosaicNotebookPanel || (MosaicNotebookPanel = {}));
/** Retrieve the controller attached to a notebook, if it is a mosaic one. */
function mosaicOf(notebook) {
    var _a;
    return (_a = notebook._mosaic) !== null && _a !== void 0 ? _a : null;
}
class MosaicNotebook {
    constructor(notebook) {
        this.notebook = notebook;
        this._frame = null;
        this._solution = null;
        this._watched = new WeakSet();
        this._disposed = false;
        this._rootInsertPending = false;
        this._repairPending = true;
        const anyNb = notebook;
        this.grid = new _MosaicGrid__WEBPACK_IMPORTED_MODULE_2__.MosaicGrid(notebook.viewportNode, anyNb._innerElement, notebook.outerNode, this);
        this._installViewModelOverrides();
        this._installScrollReroute();
        this._installFooter();
        (0,_mosaicdrag__WEBPACK_IMPORTED_MODULE_4__.installMosaicDrag)(notebook);
        notebook.modelChanged.connect(this._onModelChanged, this);
        if (notebook.model) {
            this._onModelChanged(notebook);
        }
        notebook.disposed.connect(() => this.dispose());
    }
    get solution() {
        return this._solution;
    }
    // -- IGridHost ------------------------------------------------------------
    cellNode(index) {
        var _a, _b;
        return (_b = (_a = this.notebook.widgets[index]) === null || _a === void 0 ? void 0 : _a.node) !== null && _b !== void 0 ? _b : null;
    }
    cellCount() {
        return this.notebook.widgets.length;
    }
    estimateHeight(index) {
        const viewModel = this.notebook.viewModel;
        try {
            // The base heuristic sizes a cell from its source and output line counts.
            return _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookViewModel.prototype.estimateWidgetSize.call(viewModel, index);
        }
        catch (_a) {
            return 90;
        }
    }
    requestUpdate() {
        if (this._frame !== null || this._disposed) {
            return;
        }
        this._frame = requestAnimationFrame(() => {
            this._frame = null;
            this.rebuild();
        });
    }
    runGroup(node) {
        const panel = this.notebook.parent;
        const context = panel === null || panel === void 0 ? void 0 : panel.sessionContext;
        for (const index of (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.collectCells)(node)) {
            const cell = this.notebook.widgets[index];
            if (cell instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.CodeCell && context) {
                void _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.CodeCell.execute(cell, context);
            }
            else if (cell instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.MarkdownCell) {
                cell.rendered = true;
            }
        }
    }
    saveGroupState(node, state) {
        this.setGroupState(node.path, state);
    }
    // -- navigation -----------------------------------------------------------
    /**
     * Move the active cell one step in a direction, spatially.
     *
     * Navigation is geometric rather than structural, which gives every case the
     * user expects from one rule: in a column, up/down are the siblings above and
     * below, while left/right cross into the neighbouring tile of the enclosing
     * row at the nearest height; in a row those roles simply swap.
     *
     * @param extend Extend the selection instead of moving. The selection stays a
     *   contiguous run in notebook order, so stepping sideways into another tile
     *   selects everything linearly between the two cells.
     */
    navigate(direction, extend = false) {
        const notebook = this.notebook;
        const target = this.neighbour(notebook.activeCellIndex, direction);
        if (target === null) {
            return false;
        }
        // Focus has to travel with the active cell. `Notebook._evtFocusIn` derives
        // activeCellIndex from whichever cell holds DOM focus, so moving the index
        // alone is undone by the next focus event -- leaving the selection repaint
        // as the only visible effect and making every step take two presses. This
        // mirrors what NotebookActions.selectBelow does around the same move.
        const wasFocused = notebook.node.contains(document.activeElement);
        notebook.mode = 'command';
        if (extend) {
            notebook.extendContiguousSelectionTo(target);
        }
        else {
            notebook.activeCellIndex = target;
            notebook.deselectAll();
        }
        if (wasFocused) {
            notebook.activate();
        }
        void notebook.scrollToItem(notebook.activeCellIndex);
        return true;
    }
    /** Nearest cell beyond `index` in a direction, or null at the edge. */
    neighbour(index, direction) {
        const from = this.grid.cellRect(index);
        if (!from) {
            return null;
        }
        const candidates = [];
        for (let i = 0; i < this.cellCount(); i++) {
            if (i === index) {
                continue;
            }
            const rect = this.grid.cellRect(i);
            if (rect) {
                candidates.push({ index: i, rect });
            }
        }
        return (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.nearestInDirection)(from, candidates, direction);
    }
    // -- insertion ------------------------------------------------------------
    /**
     * Insert a new cell beside the active one, subdividing when the direction is
     * across the containing group's axis. Adding to the left of a cell in a
     * column turns that cell into a row of two; adding below a cell in a row
     * turns it into a column of two.
     */
    insertBeside(direction) {
        var _a;
        const notebook = this.notebook;
        if (!notebook.model) {
            return;
        }
        const index = notebook.activeCellIndex;
        const reference = notebook.widgets[index];
        if (!reference) {
            return;
        }
        const path = (_a = this.pathOf(reference.model)) !== null && _a !== void 0 ? _a : [];
        const wantAxis = direction === 'left' || direction === 'right' ? 'row' : 'col';
        const destination = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.subdividePath)(path, wantAxis, (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.newGroupId)());
        if (destination !== path) {
            // The containing group runs the wrong way, so the reference cell moves
            // into the new subdivision alongside the cell we are about to add.
            this.setPath(reference.model, destination);
        }
        const before = direction === 'left' || direction === 'up';
        if (before) {
            _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookActions.insertAbove(notebook);
        }
        else {
            _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookActions.insertBelow(notebook);
        }
        // Claim the new cell explicitly, ahead of the inference in `rebuild`.
        const inserted = notebook.widgets[before ? index : index + 1];
        if (inserted) {
            this.setPath(inserted.model, destination);
        }
        this.persistRepair();
        this.requestUpdate();
    }
    /**
     * Note that the next cell to appear at the end belongs at the notebook root.
     *
     * Running the last cell advances into a cell the notebook creates for us.
     * Inheriting the neighbour's path would bury it in whatever tile happens to
     * be last, whereas an insert the user asked for -- a toolbar button, or a/b
     * and s/f -- should join that tile.
     */
    expectRootInsert() {
        this._rootInsertPending = true;
    }
    /**
     * Give any cell that arrived without a path one, based on its neighbour.
     *
     * Cells inserted by the notebook itself -- insert above/below, paste, split --
     * carry no mosaic metadata, and would otherwise land at the notebook root and
     * tear their neighbour's group in half. A cell landing next to a neighbour
     * that sits in a row subdivides it into a column, which is what stacking a
     * new cell above or below a tile looks like.
     */
    /**
     * Note that the next rebuild should persist its repairs.
     *
     * Called for changes the user made to the layout, and once on load. A
     * deletion deliberately does not: see the comment in {@link rebuild}.
     */
    persistRepair() {
        this._repairPending = true;
    }
    /**
     * Persist repaired paths, so a corrupted notebook is fixed on disk and not
     * merely on screen. Writing nothing when nothing moved keeps a clean notebook
     * clean, so loading a sound one does not dirty it.
     *
     * The writes are one non-undoable transaction: normalising the metadata is
     * housekeeping, and letting it onto the undo stack would put an undo step
     * between the user and the edit they actually want back.
     */
    _writeBackPaths(repaired) {
        const model = this.notebook.model;
        const cells = this.notebook.widgets;
        if (!model) {
            return false;
        }
        const pending = [];
        for (const [index, path] of repaired) {
            const cell = cells[index];
            if (!cell) {
                continue;
            }
            const current = this.pathOf(cell.model);
            if (!current || current.join('/') !== path.join('/')) {
                pending.push([cell.model, path]);
            }
        }
        if (pending.length === 0) {
            return false;
        }
        model.sharedModel.transact(() => {
            for (const [cell, path] of pending) {
                this.setPath(cell, path);
            }
        }, false);
        return true;
    }
    _inferMissingPaths() {
        var _a, _b;
        const cells = this.notebook.widgets;
        let changed = false;
        for (let i = 0; i < cells.length; i++) {
            if (this.pathOf(cells[i].model) !== undefined) {
                continue;
            }
            if (this._rootInsertPending && i === cells.length - 1) {
                this._rootInsertPending = false;
                this.setPath(cells[i].model, []);
                changed = true;
                continue;
            }
            const reference = (_a = cells[i - 1]) !== null && _a !== void 0 ? _a : cells[i + 1];
            if (!reference) {
                this.setPath(cells[i].model, []);
                changed = true;
                continue;
            }
            const referencePath = (_b = this.pathOf(reference.model)) !== null && _b !== void 0 ? _b : [];
            // Stacking onto a cell that lives in a row means a new column.
            const destination = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.subdividePath)(referencePath, 'col', (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.newGroupId)());
            if (destination !== referencePath) {
                this.setPath(reference.model, destination);
            }
            this.setPath(cells[i].model, destination);
            changed = true;
        }
        return changed;
    }
    // -- layout ---------------------------------------------------------------
    /** Rebuild the tree from metadata and re-apply the grid. Idempotent. */
    rebuild() {
        const model = this.notebook.model;
        if (!model || this._disposed) {
            return;
        }
        this._inferMissingPaths();
        const cells = this.notebook.widgets;
        const weight = (index) => { var _a; return Number((_a = cells[index]) === null || _a === void 0 ? void 0 : _a.model.getMetadata(WEIGHT_KEY)) || 1; };
        const state = (path) => this.groupState(path);
        // Repair the layout before drawing it. Redundant groups come from ordinary
        // editing as well as from metadata that has drifted, and left alone they
        // show up as tiles wrapped around a plain run of cells.
        let root = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.buildTree)(cells.map(c => this.pathOf(c.model)), weight, state);
        (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.collapse)(root);
        // The repair only reaches metadata on load or after a layout change the
        // user asked for. Persisting it after a deletion would rewrite the
        // surviving sibling's path, so undoing that deletion would bring the cell
        // back into a group its neighbour had already left, and the row would come
        // back flattened. Collapsing in memory keeps the display right meanwhile.
        const persist = this._repairPending;
        this._repairPending = false;
        if (persist && this._writeBackPaths((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.cellPaths)(root))) {
            // Paths moved, so group state now hangs off different keys: rebuild from
            // the repaired metadata rather than patching the tree's own paths.
            root = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.buildTree)(cells.map(c => this.pathOf(c.model)), weight, state);
        }
        this._solution = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.solve)(root);
        this.grid.update(this._solution);
        this.notebook.update();
    }
    pathOf(model) {
        const raw = model.getMetadata(PATH_KEY);
        return Array.isArray(raw) ? raw : undefined;
    }
    setPath(model, path) {
        model.setMetadata(PATH_KEY, path);
    }
    groupState(path) {
        var _a, _b;
        return ((_b = (_a = this.notebook.model) === null || _a === void 0 ? void 0 : _a.getMetadata((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.groupKey)(path))) !== null && _b !== void 0 ? _b : {});
    }
    setGroupState(path, state) {
        const model = this.notebook.model;
        if (!model) {
            return;
        }
        model.setMetadata((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.groupKey)(path), { ...this.groupState(path), ...state });
        this.requestUpdate();
    }
    // -- JupyterLab integration ----------------------------------------------
    /**
     * Override the three public view-model methods that drive windowing.
     *
     * Patching the instance (rather than swapping `_viewModel`, as the previous
     * implementation did) keeps the base class's `stateChanged` wiring intact.
     */
    _installViewModelOverrides() {
        const viewModel = this.notebook.viewModel;
        const grid = this.grid;
        let lastWindow = null;
        let lastVersion = -1;
        // The grid spans the whole document, so the viewport is never translated.
        viewModel.getSpan = () => [0, grid.totalHeight];
        viewModel.getEstimatedTotalSize = () => grid.totalHeight || this.cellCount() * 90;
        viewModel.getRangeToRender = () => {
            const count = this.cellCount();
            if (count === 0) {
                return [-1, -1, -1, -1];
            }
            const overscan = Math.max(1, viewModel.overscanCount) * 200;
            const top = viewModel.scrollOffset - overscan;
            const bottom = viewModel.scrollOffset + viewModel.height + overscan;
            const hull = grid.hullForBand(top, bottom);
            const next = hull
                ? [hull[0], hull[1], hull[0], hull[1]]
                : [0, count - 1, 0, count - 1];
            if (lastWindow &&
                lastVersion === grid.version &&
                lastWindow[0] === next[0] &&
                lastWindow[1] === next[1]) {
                return null;
            }
            lastWindow = next;
            lastVersion = grid.version;
            return next;
        };
    }
    /**
     * Route every scroll-into-view through the grid, so that scrolling a cell
     * into view also scrolls the managed groups it lives inside. `scrollToItem`
     * is the single funnel for all of the notebook's scroll-to-cell paths.
     */
    _installScrollReroute() {
        const notebook = this.notebook;
        notebook.scrollToItem = async (index) => {
            // Wait for the layout to catch up first. Running a cell grows its output
            // and so its row, and scrolling against the pre-execution geometry aimed
            // at where the next cell used to be -- carrying the executed cell off the
            // top of the viewport.
            this.requestUpdate();
            await new Promise(resolve => requestAnimationFrame(resolve));
            if (this._disposed) {
                return;
            }
            const outer = this.notebook.outerNode;
            const target = this.grid.revealCell(index, outer.scrollTop, outer.clientHeight);
            if (target === null) {
                return;
            }
            const furthest = Math.max(0, outer.scrollHeight - outer.clientHeight);
            outer.scrollTo({
                top: Math.min(Math.max(0, target), furthest),
                behavior: 'smooth'
            });
        };
    }
    /**
     * Make the footer's "click to add a cell" append a cell at the notebook root.
     *
     * Its stock behaviour is an insert below the last cell, and the new cell then
     * inherits that cell's path -- so in a mosaic it joins whichever tile happens
     * to be last, and there is no way to start a fresh row at the bottom.
     */
    _installFooter() {
        var _a;
        const footer = (_a = this.notebook.layout) === null || _a === void 0 ? void 0 : _a.footer;
        if (!footer) {
            return;
        }
        footer.onClick = () => {
            const notebook = this.notebook;
            if (!notebook.model) {
                return;
            }
            if (notebook.widgets.length > 0) {
                notebook.activeCellIndex = notebook.widgets.length - 1;
            }
            _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookActions.insertBelow(notebook);
            const inserted = notebook.widgets[notebook.widgets.length - 1];
            if (inserted) {
                this.setPath(inserted.model, []);
            }
            this.requestUpdate();
            void _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookActions.focusActiveCell(notebook);
        };
    }
    _onModelChanged(notebook) {
        const model = notebook.model;
        if (!model) {
            return;
        }
        this._repairPending = true; // repair whatever we just loaded
        model.cells.changed.connect(this._onCellsChanged, this);
        model.metadataChanged.connect(this._onMetadataChanged, this);
        for (let i = 0; i < model.cells.length; i++) {
            this._watch(model.cells.get(i));
        }
        this.requestUpdate();
    }
    _onCellsChanged() {
        const model = this.notebook.model;
        if (model) {
            for (let i = 0; i < model.cells.length; i++) {
                this._watch(model.cells.get(i));
            }
        }
        this.requestUpdate();
    }
    _onMetadataChanged(_, args) {
        if (args.key.startsWith('mosaic')) {
            this.requestUpdate();
        }
    }
    _watch(cell) {
        if (this._watched.has(cell)) {
            return;
        }
        this._watched.add(cell);
        cell.metadataChanged.connect(this._onCellMetadataChanged, this);
    }
    _onCellMetadataChanged(_, args) {
        if (args.key === PATH_KEY || args.key === WEIGHT_KEY) {
            this.requestUpdate();
        }
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        if (this._frame !== null) {
            cancelAnimationFrame(this._frame);
        }
        this.grid.dispose();
    }
}
/** Every cell widget beneath a group, for drag and execution. */
function cellsOf(notebook, node) {
    return (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.collectCells)(node)
        .map(index => notebook.widgets[index])
        .filter((c) => !!c);
}


/***/ }),

/***/ "./lib/MosaicTree.js":
/*!***************************!*\
  !*** ./lib/MosaicTree.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_SCROLL_SIZE: () => (/* binding */ DEFAULT_SCROLL_SIZE),
/* harmony export */   axisAtDepth: () => (/* binding */ axisAtDepth),
/* harmony export */   buildTree: () => (/* binding */ buildTree),
/* harmony export */   cellPaths: () => (/* binding */ cellPaths),
/* harmony export */   collapse: () => (/* binding */ collapse),
/* harmony export */   collectCells: () => (/* binding */ collectCells),
/* harmony export */   contentTracks: () => (/* binding */ contentTracks),
/* harmony export */   distanceTo: () => (/* binding */ distanceTo),
/* harmony export */   divergeDepth: () => (/* binding */ divergeDepth),
/* harmony export */   findGroup: () => (/* binding */ findGroup),
/* harmony export */   flexFactors: () => (/* binding */ flexFactors),
/* harmony export */   groupKey: () => (/* binding */ groupKey),
/* harmony export */   nearestInDirection: () => (/* binding */ nearestInDirection),
/* harmony export */   newGroupId: () => (/* binding */ newGroupId),
/* harmony export */   rowFloors: () => (/* binding */ rowFloors),
/* harmony export */   sideFrom: () => (/* binding */ sideFrom),
/* harmony export */   solve: () => (/* binding */ solve),
/* harmony export */   subdividePath: () => (/* binding */ subdividePath)
/* harmony export */ });
/**
 * Pure layout model for Jupyter Mosaic. No DOM, no JupyterLab imports.
 *
 * A mosaic layout is a *guillotine partition*: the notebook is a column of
 * children, each child of a column is a row, each child of a row is a column,
 * and so on. Every such partition rasterises exactly onto a CSS grid, which is
 * what this module computes.
 *
 * The tree is derived entirely from cell metadata (`mosaic: string[]`, a path of
 * group ids) plus per-group state stored in notebook metadata. It is never the
 * authoritative copy of anything: rebuild it from metadata whenever the notebook
 * changes and the layout follows.
 */
/** Default extent (px) of a scrollable group along its scroll axis. */
const DEFAULT_SCROLL_SIZE = 320;
/** The axis a group at the given depth divides along. Root (depth 0) is a column. */
function axisAtDepth(depth) {
    return depth % 2 === 0 ? 'col' : 'row';
}
function groupKey(path) {
    return 'mosaic:' + path.join('/');
}
/**
 * Build the layout tree from per-cell paths, in notebook order.
 *
 * A group is reused only while it is the most recently appended child at that
 * depth. A path that reappears after an interruption therefore yields a second,
 * distinct group -- which is the correct linearisation: cells that are not
 * adjacent in the notebook cannot share a tile.
 */
function buildTree(paths, cellWeight, groupState) {
    var _a, _b, _c, _d;
    const root = {
        kind: 'group',
        id: '',
        path: [],
        axis: 'col',
        weight: 1,
        mode: 'flow',
        size: 0,
        children: []
    };
    for (let index = 0; index < paths.length; index++) {
        const path = (_a = paths[index]) !== null && _a !== void 0 ? _a : [];
        let node = root;
        for (let depth = 0; depth < path.length; depth++) {
            const id = path[depth];
            const last = node.children[node.children.length - 1];
            let next;
            if (last && last.kind === 'group' && last.id === id) {
                next = last;
            }
            else {
                const childPath = path.slice(0, depth + 1);
                const state = groupState(childPath);
                next = {
                    kind: 'group',
                    id,
                    path: childPath,
                    axis: axisAtDepth(depth + 1),
                    weight: (_b = state.weight) !== null && _b !== void 0 ? _b : 1,
                    mode: (_c = state.mode) !== null && _c !== void 0 ? _c : 'flow',
                    size: (_d = state.size) !== null && _d !== void 0 ? _d : DEFAULT_SCROLL_SIZE,
                    children: []
                };
                node.children.push(next);
            }
            node = next;
        }
        node.children.push({ kind: 'cell', index, weight: cellWeight(index) });
    }
    return root;
}
/**
 * Collapse redundant groups, in place.
 *
 * A group holding a single item says nothing the parent does not already say,
 * and an empty one says nothing at all. Both arise from ordinary editing --
 * dragging the second-to-last cell out of a tile leaves a singleton behind --
 * and from metadata that has drifted, and they show up as tiles with rules
 * around a plain run of cells.
 *
 * Unwrapping a singleton promotes its child one level, which flips the axis
 * that child sits on. So when the child is itself a group, its *contents* are
 * promoted instead: two levels up, back onto the axis they were laid out for.
 * That is what keeps a row of columns from becoming a row of rows.
 *
 * Repeats until stable, since promoting can leave the parent a singleton too.
 */
function collapse(node) {
    for (const child of node.children) {
        if (child.kind === 'group') {
            collapse(child);
        }
    }
    for (;;) {
        const next = [];
        let changed = false;
        for (const child of node.children) {
            if (child.kind !== 'group' || child.children.length > 1) {
                next.push(child);
                continue;
            }
            changed = true;
            const only = child.children[0];
            if (!only) {
                continue; // empty group: drop it
            }
            if (only.kind === 'group') {
                next.push(...only.children);
            }
            else {
                next.push(only);
            }
        }
        node.children = next;
        if (!changed) {
            return;
        }
    }
}
/** The path each cell sits at, read back off a tree. */
function cellPaths(root) {
    const out = new Map();
    const walk = (node, path) => {
        for (const child of node.children) {
            if (child.kind === 'cell') {
                out.set(child.index, path);
            }
            else {
                walk(child, [...path, child.id]);
            }
        }
    };
    walk(root, []);
    return out;
}
/** Sum of child weights, guarding against a degenerate zero total. */
function totalWeight(children) {
    let total = 0;
    for (const child of children) {
        total += child.weight > 0 ? child.weight : 1;
    }
    return total > 0 ? total : 1;
}
/**
 * Rasterise the tree onto a flat grid.
 *
 * Every node occupies a rectangle in normalised [0,1] coordinates; the set of
 * distinct rectangle edges becomes the grid's track boundaries. Because a
 * boundary shared by two nodes is always inherited from their common ancestor,
 * shared edges are bit-identical floats and dedupe exactly.
 *
 * Managed groups ('scroll' / 'tabs') are treated as leaves here: their subtree
 * contributes no cuts, so the group always collapses to a single track on each
 * axis and its interior is positioned by {@link MosaicGrid} instead.
 */
function solve(root) {
    const xs = new Set([0, 1]);
    const ys = new Set([0, 1]);
    const rects = [];
    const managedNodes = [];
    const groupRects = [];
    const marks = [];
    const walk = (node, x0, x1, y0, y1, owner) => {
        xs.add(x0);
        xs.add(x1);
        ys.add(y0);
        ys.add(y1);
        const rect = { node, x0, x1, y0, y1, owner };
        if (node.kind === 'cell') {
            rects.push(rect);
            return;
        }
        groupRects.push({ node, rect });
        if (node.mode !== 'flow') {
            // A managed group is opaque to the grid: record it and stop cutting.
            rects.push(rect);
            managedNodes.push({ node, rect });
            return;
        }
        // The outer edges are seams too, with a single neighbour. A leading or
        // trailing cell needs none: its own top or bottom edge is the drop target.
        const first = node.children[0];
        const last = node.children[node.children.length - 1];
        if ((first === null || first === void 0 ? void 0 : first.kind) === 'group') {
            marks.push({
                node,
                coord: node.axis === 'col' ? y0 : x0,
                from: node.axis === 'col' ? x0 : y0,
                to: node.axis === 'col' ? x1 : y1,
                index: 0
            });
        }
        if ((last === null || last === void 0 ? void 0 : last.kind) === 'group') {
            marks.push({
                node,
                coord: node.axis === 'col' ? y1 : x1,
                from: node.axis === 'col' ? x0 : y0,
                to: node.axis === 'col' ? x1 : y1,
                index: node.children.length
            });
        }
        const total = totalWeight(node.children);
        let offset = 0;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const share = (child.weight > 0 ? child.weight : 1) / total;
            const from = offset;
            const to = offset + share;
            offset = to;
            if (node.axis === 'col') {
                walk(child, x0, x1, y0 + (y1 - y0) * from, y0 + (y1 - y0) * to, owner);
            }
            else {
                walk(child, x0 + (x1 - x0) * from, x0 + (x1 - x0) * to, y0, y1, owner);
            }
            // A seam between two groups has no cell on it to drop onto, so it needs a
            // gutter. A seam touching a cell does not: that cell is the drop target.
            const next = node.children[i + 1];
            if (child.kind === 'group' && (next === null || next === void 0 ? void 0 : next.kind) === 'group') {
                marks.push({
                    node,
                    coord: node.axis === 'col' ? y0 + (y1 - y0) * to : x0 + (x1 - x0) * to,
                    from: node.axis === 'col' ? x0 : y0,
                    to: node.axis === 'col' ? x1 : y1,
                    index: i + 1
                });
            }
        }
    };
    walk(root, 0, 1, 0, 1, null);
    const xLines = [...xs].sort((a, b) => a - b);
    const yLines = [...ys].sort((a, b) => a - b);
    const xAt = new Map(xLines.map((v, i) => [v, i]));
    const yAt = new Map(yLines.map((v, i) => [v, i]));
    const xGutters = new Set();
    const yGutters = new Set();
    for (const mark of marks) {
        const at = (mark.node.axis === 'col' ? yAt : xAt).get(mark.coord);
        if (at !== undefined) {
            (mark.node.axis === 'col' ? yGutters : xGutters).add(at);
        }
    }
    const columns = buildAxis(xLines, xGutters);
    const rows = buildAxis(yLines, yGutters);
    const rowMinPx = new Array(rows.tracks.length).fill(0);
    // A node ends where the gutter before it begins, and starts where that
    // gutter ends, so the two sides of a seam use different line maps.
    const place = (r) => ({
        rowStart: rows.start[yAt.get(r.y0)],
        rowEnd: rows.end[yAt.get(r.y1)],
        colStart: columns.start[xAt.get(r.x0)],
        colEnd: columns.end[xAt.get(r.x1)]
    });
    const placements = new Map();
    const managed = [];
    const managedOwner = new Map();
    for (const { node, rect } of managedNodes) {
        const placement = place(rect);
        managed.push({ node, placement, cells: collectCells(node) });
        // Managed groups nested inside a managed group get no grid area of their
        // own -- they are positioned in their ancestor's local pixel space -- but
        // they still need discovering so they can carry their own scroll offset.
        for (const nested of nestedManaged(node)) {
            managed.push({
                node: nested,
                placement,
                cells: collectCells(nested)
            });
        }
        // A managed group holds its own extent open along its scroll axis, spread
        // across the row tracks it spans. `auto` still wins if siblings are taller.
        if (node.axis === 'col') {
            const spanned = contentTracks(rows.tracks, placement.rowStart, placement.rowEnd);
            for (const t of spanned) {
                rowMinPx[t] = Math.max(rowMinPx[t], node.size / spanned.length);
            }
        }
    }
    // Outermost first, so the innermost owner wins when groups nest.
    managed.sort((a, b) => a.node.path.length - b.node.path.length);
    for (const entry of managed) {
        for (const index of entry.cells) {
            managedOwner.set(index, entry);
        }
    }
    for (const rect of rects) {
        if (rect.node.kind === 'cell') {
            placements.set(rect.node.index, place(rect));
        }
    }
    const groupPlacements = new Map();
    for (const { node, rect } of groupRects) {
        groupPlacements.set(groupKey(node.path), { node, placement: place(rect) });
    }
    const gutters = [];
    for (const mark of marks) {
        const along = mark.node.axis === 'col' ? rows : columns;
        const across = mark.node.axis === 'col' ? columns : rows;
        const alongAt = (mark.node.axis === 'col' ? yAt : xAt).get(mark.coord);
        const fromAt = (mark.node.axis === 'col' ? xAt : yAt).get(mark.from);
        const toAt = (mark.node.axis === 'col' ? xAt : yAt).get(mark.to);
        if (alongAt === undefined || fromAt === undefined || toAt === undefined) {
            continue;
        }
        const after = mark.node.children[mark.index];
        const before = mark.node.children[mark.index - 1];
        const afterCells = after ? collectCells(after) : [];
        const beforeCells = before ? collectCells(before) : [];
        gutters.push({
            path: mark.node.path,
            axis: mark.node.axis,
            line: along.end[alongAt],
            start: across.start[fromAt],
            end: across.end[toAt],
            index: mark.index,
            cellAfter: afterCells.length > 0 ? afterCells[0] : -1,
            cellBefore: beforeCells.length > 0 ? beforeCells[beforeCells.length - 1] : -1
        });
    }
    return {
        colTracks: columns.tracks,
        rowTracks: rows.tracks,
        rowMinPx,
        placements,
        managed,
        managedOwner,
        groupPlacements,
        gutters
    };
}
/**
 * Lay out one axis, inserting a gutter track at each seam that needs one.
 *
 * Because a gutter takes a track of its own, the line a node ends at is no
 * longer the line the next node starts at, so two maps come back: `end` for a
 * node finishing at a logical line and `start` for one beginning there.
 */
function buildAxis(lines, gutters) {
    const tracks = [];
    const start = new Array(lines.length);
    const end = new Array(lines.length);
    let line = 1;
    for (let i = 0; i < lines.length; i++) {
        if (gutters.has(i)) {
            end[i] = line;
            tracks.push({ gutter: true, weight: 0 });
            line += 1;
            start[i] = line;
        }
        else {
            end[i] = line;
            start[i] = line;
        }
        if (i < lines.length - 1) {
            tracks.push({ gutter: false, weight: lines[i + 1] - lines[i] });
            line += 1;
        }
    }
    return { tracks, start, end };
}
/** Indices of the non-gutter tracks a placement spans. */
function contentTracks(tracks, startLine, endLine) {
    const out = [];
    for (let t = startLine - 1; t < endLine - 1 && t < tracks.length; t++) {
        if (!tracks[t].gutter) {
            out.push(t);
        }
    }
    return out.length > 0 ? out : [Math.max(0, startLine - 1)];
}
/** Managed groups strictly beneath a node, outermost first. */
function nestedManaged(node, out = []) {
    for (const child of node.children) {
        if (child.kind !== 'group') {
            continue;
        }
        if (child.mode !== 'flow') {
            out.push(child);
        }
        nestedManaged(child, out);
    }
    return out;
}
/** Every cell index beneath a node, in notebook order. */
function collectCells(node, out = []) {
    if (node.kind === 'cell') {
        out.push(node.index);
    }
    else {
        for (const child of node.children) {
            collectCells(child, out);
        }
    }
    return out;
}
/** Find the group at `path`, or null. */
function findGroup(root, path) {
    let node = root;
    for (const id of path) {
        const next = node.children.find((c) => c.kind === 'group' && c.id === id);
        if (!next) {
            return null;
        }
        node = next;
    }
    return node;
}
/** Depth at which two paths diverge. */
function divergeDepth(a = [], b = []) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) {
            return i;
        }
    }
    return n;
}
function newGroupId() {
    return 'mg-' + crypto.randomUUID();
}
/**
 * Minimum height for each row track, in px.
 *
 * Windowing detaches off-screen cells, and a detached cell contributes nothing
 * to an `auto` grid track -- so without a floor the band collapses, the
 * document shrinks, and the render range then culls cells that are actually on
 * screen. Flooring each track at the height its content last measured keeps an
 * absent cell's space reserved.
 *
 * Cells inside a managed group are skipped: that group's own `size` already
 * holds its band open, and its cells sit outside the grid's flow anyway.
 */
function rowFloors(solution, cellHeight) {
    var _a;
    const floors = solution.rowMinPx.slice();
    for (const [index, placement] of solution.placements) {
        if (solution.managedOwner.has(index)) {
            continue;
        }
        const spanned = contentTracks(solution.rowTracks, placement.rowStart, placement.rowEnd);
        const share = cellHeight(index) / spanned.length;
        for (const t of spanned) {
            floors[t] = Math.max((_a = floors[t]) !== null && _a !== void 0 ? _a : 0, share);
        }
    }
    return floors;
}
/** Slack, in px, when deciding whether a candidate lies past our edge. */
const NAV_TOLERANCE = 1;
/** Candidates within this many px of the nearest count as equally near. */
const NAV_BAND = 4;
/**
 * The cell to move to when stepping one place in a direction.
 *
 * Navigation is geometric rather than structural, which gives every case the
 * user expects from a single rule: inside a column, up and down are the
 * siblings above and below, while left and right cross into the neighbouring
 * tile of the enclosing row at the nearest height. Inside a row the roles swap,
 * with no special-casing for either.
 *
 * Candidates are gathered from the nearest band past our edge and then ranked
 * by alignment on the other axis -- that second step is what makes a sideways
 * step land on the nearest-height neighbour rather than the topmost one.
 */
function nearestInDirection(from, candidates, direction) {
    const horizontal = direction === 'left' || direction === 'right';
    const backwards = direction === 'left' || direction === 'up';
    const scored = [];
    for (const { index, rect } of candidates) {
        const gap = backwards
            ? horizontal
                ? from.x0 - rect.x1
                : from.y0 - rect.y1
            : horizontal
                ? rect.x0 - from.x1
                : rect.y0 - from.y1;
        if (gap < -NAV_TOLERANCE) {
            continue; // behind us, or merely overlapping
        }
        const offset = horizontal
            ? Math.abs((rect.y0 + rect.y1) / 2 - (from.y0 + from.y1) / 2)
            : Math.abs((rect.x0 + rect.x1) / 2 - (from.x0 + from.x1) / 2);
        scored.push({ index, gap, offset });
    }
    if (scored.length === 0) {
        return null;
    }
    const nearest = Math.min(...scored.map(c => c.gap));
    const band = scored.filter(c => c.gap <= nearest + NAV_BAND);
    band.sort((a, b) => a.offset - b.offset || a.index - b.index);
    return band[0].index;
}
/**
 * The path a new cell takes when inserted beside `refPath` along `wantAxis`.
 *
 * When the containing group already runs the right way the cell simply joins
 * it; otherwise the reference cell is subdivided, and both cells move into the
 * new group. Returns null when no subdivision is needed.
 */
function subdividePath(refPath, wantAxis, id) {
    return axisAtDepth(refPath.length) === wantAxis ? refPath : [...refPath, id];
}
/**
 * Turn normalised track weights into CSS `fr` factors.
 *
 * The weights from {@link solve} are fractions summing to one, which is wrong
 * to hand to the grid directly. Per CSS Grid Layout 12.7.1, a track whose base
 * size exceeds its share is frozen at that size and dropped from the flex sum,
 * and if the remaining sum is below one the algorithm clamps it *to* one -- so
 * the still-flexible tracks take only that fraction of the leftover space and
 * the rest of the row shows as blank margin. Widening the container eventually
 * unfreezes the track and the row snaps out to full width.
 *
 * Scaling so the smallest factor is one keeps the sum at or above one however
 * many tracks freeze, so the flexible tracks always absorb all leftover space.
 */
function flexFactors(weights) {
    const positive = weights.filter(w => w > 0);
    if (positive.length === 0) {
        return weights.map(() => 1);
    }
    const smallest = Math.min(...positive);
    return weights.map(w => (w > 0 ? w / smallest : 1));
}
/** Squared distance from a point to a rectangle; zero when inside it. */
function distanceTo(x, y, r) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1);
    const dy = Math.max(r.y0 - y, 0, y - r.y1);
    return dx * dx + dy * dy;
}
/**
 * Which edge of a rectangle a point outside it lies past.
 *
 * Used when a drop lands beside a target rather than on it, where comparing
 * distances to all four edges -- the right question inside the box -- answers
 * an arbitrary one.
 */
function sideFrom(r, x, y) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1);
    const dy = Math.max(r.y0 - y, 0, y - r.y1);
    if (dy >= dx) {
        return y < r.y0 ? 'top' : 'bottom';
    }
    return x < r.x0 ? 'left' : 'right';
}


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
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/application */ "webpack/sharing/consume/default/@jupyterlab/application");
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/codeeditor */ "webpack/sharing/consume/default/@jupyterlab/codeeditor");
/* harmony import */ var _jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @jupyterlab/docmanager */ "webpack/sharing/consume/default/@jupyterlab/docmanager");
/* harmony import */ var _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @jupyterlab/launcher */ "webpack/sharing/consume/default/@jupyterlab/launcher");
/* harmony import */ var _jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @jupyterlab/ui-components */ "webpack/sharing/consume/default/@jupyterlab/ui-components");
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @jupyterlab/settingregistry */ "webpack/sharing/consume/default/@jupyterlab/settingregistry");
/* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _MosaicNotebook__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./MosaicNotebook */ "./lib/MosaicNotebook.js");
/* harmony import */ var _style_icons_mosaic_icon_svg__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../style/icons/mosaic-icon.svg */ "./style/icons/mosaic-icon.svg");










/**
 * Running the last cell advances into a cell the notebook creates on the spot.
 * Flag it so the mosaic gives it a row of its own at the end rather than
 * burying it in whatever tile happened to be last; insertions the user asked
 * for still join the tile they were invoked from.
 */
const runAndAdvance = _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.NotebookActions.runAndAdvance;
_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.NotebookActions.runAndAdvance = ((notebook, ...rest) => {
    var _a;
    if (notebook && notebook.activeCellIndex === notebook.widgets.length - 1) {
        (_a = (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_7__.mosaicOf)(notebook)) === null || _a === void 0 ? void 0 : _a.expectRootInsert();
    }
    return runAndAdvance.call(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.NotebookActions, notebook, ...rest);
});

/**
 * Do not fall back to the default editor when a widget for this path already
 * exists under a different factory. Without this, restoring a workspace opens
 * both a Notebook and a Mosaic Notebook for the same file.
 *
 * Upstream equivalent: jupyterlab/jupyterlab#18034.
 */
_jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__.DocumentManager.prototype.openOrReveal = function (path, widgetName = null, kernel, options) {
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
const MosaicLabIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__.LabIcon({
    name: 'mosaic:favicon',
    svgstr: _style_icons_mosaic_icon_svg__WEBPACK_IMPORTED_MODULE_8__.toString()
});
/**
 * The insert-above/below icons under new names, so that the stylesheet can turn
 * them a quarter turn: left and right then read as the same action on the other
 * axis. LabIcon stamps the name onto the rendered svg as `data-icon`.
 */
const addLeftIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__.LabIcon({
    name: 'mosaic:add-left',
    svgstr: _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__.addAboveIcon.svgstr
});
const addRightIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__.LabIcon({
    name: 'mosaic:add-right',
    svgstr: _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_5__.addBelowIcon.svgstr
});
const PLUGIN_ID = 'mosaic:plugin';
const MOSAIC_FACTORY = 'MosaicNotebook';
function applySettings(s) {
    document.body.classList.toggle('mosaic-skeuomorphic', !!s.skeuomorphic);
    document.body.classList.toggle('mosaic-top-cell-handles', !!s.topCellHandle);
}
const plugin = {
    id: PLUGIN_ID,
    description: 'Arrange Jupyter notebook cells in any way two-dimensionally. Present your code compactly in Zoom video confrences. Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation. Eliminate white space in your notebook and take advantage of unused screen real estate.',
    autoStart: true,
    requires: [
        _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.INotebookTracker,
        _jupyterlab_launcher__WEBPACK_IMPORTED_MODULE_4__.ILauncher,
        _jupyterlab_codeeditor__WEBPACK_IMPORTED_MODULE_1__.IEditorServices,
        _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__.ILayoutRestorer,
        _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__.IDocumentManager,
        _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_6__.ISettingRegistry
    ],
    activate: async (app, tracker, launcher, editorServices, restorer, docmanager, settings) => {
        const loaded = await settings.load(PLUGIN_ID);
        applySettings(loaded.composite);
        loaded.changed.connect(() => applySettings(loaded.composite));
        // The shared NotebookTracker holds both kinds of panel, so teach its
        // restorer to record which factory each one came from. This is cheaper than
        // standing up a second tracker and re-attaching every command hook to it.
        const factoryName = (panel) => panel.content._mosaic ? MOSAIC_FACTORY : 'Notebook';
        const pool = tracker._pool;
        pool._restore.args = (widget) => ({
            path: widget.context.path,
            factory: factoryName(widget)
        });
        pool._restore.name = (widget) => `${widget.context.path}:${factoryName(widget)}`;
        void restorer;
        const jupyterFactory = app.docRegistry.getWidgetFactory('Notebook');
        // Deliberately reuse the *stock* 'notebook' model name. DocumentManager
        // looks up existing contexts by model factory name, so sharing it lets a
        // Mosaic panel and a plain Notebook panel for the same file share one
        // context and one model -- edits and cell moves show up live in both. A
        // separate model factory makes that lookup miss, and the second open then
        // re-runs `Context.initialize`, reverting the document from disk.
        const mosaicFactory = new _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.NotebookWidgetFactory({
            name: MOSAIC_FACTORY,
            label: 'Mosaic Notebook',
            fileTypes: ['notebook'],
            defaultFor: ['notebook'],
            modelName: 'notebook',
            preferKernel: true,
            canStartKernel: true,
            rendermime: jupyterFactory.rendermime,
            contentFactory: new _MosaicNotebook__WEBPACK_IMPORTED_MODULE_7__.MosaicNotebookPanel.ContentFactory({
                editorFactory: editorServices.factoryService.newInlineEditor
            }),
            mimeTypeService: jupyterFactory.mimeTypeService,
            toolbarFactory: jupyterFactory._toolbarFactory,
            notebookConfig: {
                ..._jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_2__.StaticNotebook.defaultNotebookConfig,
                // The grid supplies its own render range; windowing must stay on for
                // `getRangeToRender` / `getEstimatedTotalSize` to be consulted at all.
                windowingMode: 'full'
            }
        });
        mosaicFactory.widgetCreated.connect((_, panel) => {
            tracker.add(panel);
            panel.title.icon = MosaicLabIcon;
        });
        app.docRegistry.addWidgetFactory(mosaicFactory);
        app.docRegistry.setDefaultWidgetFactory('notebook', MOSAIC_FACTORY);
        // Give the Mosaic Notebook the same toolbar buttons as a plain notebook.
        for (const ext of app.docRegistry.widgetExtensions('Notebook')) {
            app.docRegistry.addWidgetExtension(MOSAIC_FACTORY, ext);
        }
        void docmanager;
        // Navigation and insertion are two-dimensional in a mosaic notebook. These
        // are registered as separate commands rather than replacing the notebook's
        // own, so a plain Notebook panel keeps stock behaviour; the shortcuts in
        // schema/plugin.json use a more specific selector to win only here.
        const active = () => {
            const panel = tracker.currentWidget;
            return panel ? (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_7__.mosaicOf)(panel.content) : null;
        };
        const isMosaic = () => active() !== null;
        const directions = ['left', 'right', 'up', 'down'];
        for (const direction of directions) {
            app.commands.addCommand(`mosaic:move-cursor-${direction}`, {
                label: `Move Cursor ${direction[0].toUpperCase()}${direction.slice(1)}`,
                caption: `Move the active cell selection ${direction}`,
                isEnabled: isMosaic,
                execute: () => {
                    var _a;
                    (_a = active()) === null || _a === void 0 ? void 0 : _a.navigate(direction);
                }
            });
            app.commands.addCommand(`mosaic:extend-selection-${direction}`, {
                label: `Extend Selection ${direction[0].toUpperCase()}${direction.slice(1)}`,
                caption: `Extend the selected cells ${direction}`,
                isEnabled: isMosaic,
                execute: () => {
                    var _a;
                    (_a = active()) === null || _a === void 0 ? void 0 : _a.navigate(direction, true);
                }
            });
        }
        app.commands.addCommand('mosaic:insert-cell-left', {
            label: 'Insert Cell Left',
            caption: 'Insert a cell to the left, subdividing if needed',
            icon: addLeftIcon,
            isEnabled: isMosaic,
            isVisible: isMosaic,
            execute: () => {
                var _a;
                (_a = active()) === null || _a === void 0 ? void 0 : _a.insertBeside('left');
            }
        });
        app.commands.addCommand('mosaic:insert-cell-right', {
            label: 'Insert Cell Right',
            caption: 'Insert a cell to the right, subdividing if needed',
            icon: addRightIcon,
            isEnabled: isMosaic,
            isVisible: isMosaic,
            execute: () => {
                var _a;
                (_a = active()) === null || _a === void 0 ? void 0 : _a.insertBeside('right');
            }
        });
        app.commands.addCommand('mosaic-notebook:create-new', {
            label: args => {
                var _a, _b;
                return `Mosaic ${((_b = (_a = app.serviceManager.kernelspecs.specs) === null || _a === void 0 ? void 0 : _a.kernelspecs[args.kernelName]) === null || _b === void 0 ? void 0 : _b.display_name) || ''}`;
            },
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
        for (const name in app.serviceManager.kernelspecs.specs.kernelspecs) {
            const spec = app.serviceManager.kernelspecs.specs.kernelspecs[name];
            launcher.add({
                command: 'mosaic-notebook:create-new',
                args: { kernelName: name },
                category: 'Notebook',
                rank: 0,
                kernelIconUrl: `${spec.resources['logo-svg']}`
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
/* harmony export */   closestSide: () => (/* binding */ closestSide),
/* harmony export */   elementFromPoint: () => (/* binding */ elementFromPoint),
/* harmony export */   installMosaicDrag: () => (/* binding */ installMosaicDrag),
/* harmony export */   mosaicDragOver: () => (/* binding */ mosaicDragOver),
/* harmony export */   mosaicDrop: () => (/* binding */ mosaicDrop)
/* harmony export */ });
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/cells */ "webpack/sharing/consume/default/@jupyterlab/cells");
/* harmony import */ var _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @lumino/algorithm */ "webpack/sharing/consume/default/@lumino/algorithm");
/* harmony import */ var _lumino_algorithm__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _MosaicTree__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./MosaicTree */ "./lib/MosaicTree.js");
/* harmony import */ var _MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./MosaicNotebook */ "./lib/MosaicNotebook.js");
/**
 * Drag-and-drop for the mosaic grid.
 *
 * A drop is now purely a metadata edit: work out the destination path, write it
 * onto every moved cell, then let `Notebook.moveCell` reorder the linear list.
 * The layout falls out of the next rebuild. Nothing here touches widgets, DOM
 * parentage or any tree structure -- that is what makes it reliable.
 */





const DROP_TARGET_CLASS = 'jp-mod-dropTarget';
const JUPYTER_CELL_CLASS = 'jp-Cell';
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';
/** Distance from a group's edge, in px, that triggers drag auto-scroll. */
const AUTOSCROLL_MARGIN = 24;
/** How far outside a cell a drop still counts as aimed at that cell. */
const CELL_HIT_MARGIN = 12;
/**
 * How far a drop may sit from any target and still reach it.
 *
 * Every target is bounded. An unbounded search always finds *something*, which
 * is how a drop through a gap between targets used to teleport cells to
 * whichever handle happened to win a distance comparison across the whole
 * notebook. Finding nothing and putting the cells back is the better failure.
 */
const DROP_RANGE = 96;
function installMosaicDrag(notebook) {
    const anyNb = notebook;
    anyNb._evtDrop = (event) => mosaicDrop(notebook, event);
    anyNb._evtDragOver = (event) => mosaicDragOver(notebook, event);
}
/** Path metadata for a cell, defaulting to the notebook root. */
function pathOf(cell) {
    const raw = cell.model.getMetadata(_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.PATH_KEY);
    return Array.isArray(raw) ? raw : [];
}
function setPath(cell, path) {
    cell.model.setMetadata(_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.PATH_KEY, path);
}
function mosaicDrop(notebook, event) {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
        event.dropAction = 'none';
        return;
    }
    const mosaic = (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.mosaicOf)(notebook);
    if (!notebook.model || !mosaic || event.source !== notebook) {
        // Cross-notebook mosaic drops are not supported yet.
        return;
    }
    clearDropTargets(notebook);
    const toMove = event.mimeData.getData('internal:cells');
    if (!(toMove === null || toMove === void 0 ? void 0 : toMove.length)) {
        event.dropAction = 'none';
        return;
    }
    event.dropAction = 'move';
    // Collapsed markdown headings carry their hidden children along.
    const last = toMove[toMove.length - 1];
    if (last instanceof _jupyterlab_cells__WEBPACK_IMPORTED_MODULE_1__.MarkdownCell && last.headingCollapsed) {
        const nextParent = _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.NotebookActions.findNextParentHeading(last, notebook);
        if (nextParent > 0) {
            const index = (0,_lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__.findIndex)(notebook.widgets, (c) => last.model.id === c.model.id);
            toMove.push(...notebook.widgets.slice(index + 1, nextParent));
        }
    }
    const hit = hitTest(notebook, event.clientX, event.clientY);
    if (!hit) {
        // Nothing within reach: leave the cells where they were.
        event.dropAction = 'none';
        return;
    }
    let destPath;
    let toIndex;
    let after;
    if (hit.kind === 'gutter') {
        // Land on the seam: the cells become children of the group that owns it.
        // A trailing gutter has nothing after it, so anchor to the cell before.
        destPath = hit.gutter.path;
        if (hit.gutter.cellAfter >= 0) {
            toIndex = hit.gutter.cellAfter;
            after = false;
        }
        else if (hit.gutter.cellBefore >= 0) {
            toIndex = hit.gutter.cellBefore;
            after = true;
        }
        else {
            return;
        }
    }
    else {
        const targetCell = notebook.widgets[hit.index];
        if (!targetCell || toMove.includes(targetCell)) {
            return;
        }
        toIndex = hit.index;
        after = hit.side === 'bottom' || hit.side === 'right';
        destPath = pathOf(targetCell);
        // A drop on the off-axis edge subdivides: the target cell and the incoming
        // cells become the two children of a brand new group.
        const targetAxis = destPath.length % 2 === 0 ? 'col' : 'row';
        const wantsRow = hit.side === 'left' || hit.side === 'right';
        if ((targetAxis === 'col') === wantsRow) {
            destPath = [...destPath, (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.newGroupId)()];
            setPath(targetCell, destPath);
        }
    }
    // Preserve any structure internal to the moved selection.
    let sharedPath = pathOf(toMove[0]);
    let diverge = sharedPath.length;
    for (const cell of toMove) {
        diverge = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.divergeDepth)(pathOf(cell), sharedPath);
        sharedPath = sharedPath.slice(0, diverge);
    }
    // Moving several cells across an axis flip would transpose their internal
    // rows and columns; an extra wrapper group preserves the original shape.
    const transpose = toMove.length > 1 && diverge % 2 !== destPath.length % 2
        ? (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.newGroupId)()
        : null;
    for (const cell of toMove) {
        const prev = pathOf(cell);
        const state = notebook.model.getMetadata((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.groupKey)(prev));
        if (transpose) {
            prev.splice(diverge, 0, transpose);
        }
        const next = [...destPath, ...prev.slice(diverge)];
        if (state) {
            notebook.model.setMetadata((0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.groupKey)(next), state);
        }
        setPath(cell, next);
    }
    // Now place the selection in the linear list, next to the target.
    //
    // `moveCell`'s `to` means different things by direction: moving down it is
    // the final index of the *last* cell of the block, moving up the index of the
    // *first*. Getting this wrong shifts a multi-cell drag by n-1 positions.
    const fromIndex = _lumino_algorithm__WEBPACK_IMPORTED_MODULE_2__.ArrayExt.firstIndexOf(notebook.widgets, toMove[0]);
    if (toIndex > fromIndex) {
        if (!after) {
            toIndex -= 1;
        }
    }
    else if (after) {
        toIndex += 1;
    }
    toIndex = Math.max(0, Math.min(toIndex, notebook.widgets.length - 1));
    if (fromIndex !== toIndex) {
        notebook.moveCell(fromIndex, toIndex, toMove.length);
    }
    mosaic.persistRepair();
    mosaic.requestUpdate();
}
function mosaicDragOver(notebook, event) {
    var _a;
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    clearDropTargets(notebook);
    const mosaic = (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.mosaicOf)(notebook);
    const hit = hitTest(notebook, event.clientX, event.clientY);
    if ((hit === null || hit === void 0 ? void 0 : hit.kind) === 'gutter') {
        mosaic === null || mosaic === void 0 ? void 0 : mosaic.grid.highlightGutter(hit.gutter);
    }
    else {
        mosaic === null || mosaic === void 0 ? void 0 : mosaic.grid.highlightGutter(null);
        if (hit) {
            const toMove = (_a = event.mimeData.getData('internal:cells')) !== null && _a !== void 0 ? _a : [];
            const cell = notebook.widgets[hit.index];
            if (cell && !toMove.includes(cell)) {
                cell.node.classList.add(DROP_TARGET_CLASS);
                cell.node.dataset.mosaicDropSide = hit.side;
            }
        }
    }
    autoScroll(notebook, event);
}
/** Scroll a managed group when the pointer nears its edge mid-drag. */
function autoScroll(notebook, event) {
    const mosaic = (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.mosaicOf)(notebook);
    if (!mosaic) {
        return;
    }
    const outer = notebook.outerNode.getBoundingClientRect();
    if (event.clientY < outer.top + AUTOSCROLL_MARGIN) {
        notebook.outerNode.scrollBy({ top: -AUTOSCROLL_MARGIN });
    }
    else if (event.clientY > outer.bottom - AUTOSCROLL_MARGIN) {
        notebook.outerNode.scrollBy({ top: AUTOSCROLL_MARGIN });
    }
    // Groups get first refusal, so an inner scroller wins over the notebook.
    mosaic.grid.nudgeScroll(event.clientX, event.clientY, AUTOSCROLL_MARGIN);
}
function clearDropTargets(notebook) {
    var _a;
    for (const el of Array.from(notebook.node.getElementsByClassName(DROP_TARGET_CLASS))) {
        el.classList.remove(DROP_TARGET_CLASS);
        delete el.dataset.mosaicDropSide;
    }
    (_a = (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.mosaicOf)(notebook)) === null || _a === void 0 ? void 0 : _a.grid.highlightGutter(null);
}
/**
 * What lies under a client point: a gutter, or a cell and one of its edges.
 *
 * Returns null when nothing is close enough, and the drop is then abandoned.
 * Every target has a bounded reach: a search with no limit always finds some
 * target, so a drop into a gap between them landed wherever won a distance
 * comparison taken across the whole notebook.
 */
function hitTest(notebook, clientX, clientY) {
    var _a, _b, _c;
    const mosaic = (0,_MosaicNotebook__WEBPACK_IMPORTED_MODULE_4__.mosaicOf)(notebook);
    const viewport = notebook.viewportNode.getBoundingClientRect();
    const x = clientX - viewport.left;
    const y = clientY - viewport.top;
    // 1. Inside a gutter. They are narrow, and the cells beside them stay
    //    reachable by aiming a little further in.
    const inGutter = mosaic === null || mosaic === void 0 ? void 0 : mosaic.grid.gutterAt(x, y);
    if (inGutter) {
        return { kind: 'gutter', gutter: inGutter };
    }
    // 2. On a cell.
    let target = elementFromPoint(clientX, clientY);
    while (target && !target.classList.contains(JUPYTER_CELL_CLASS)) {
        target = target.parentElement;
    }
    if (target) {
        const index = notebook.widgets.findIndex(cell => cell.node === target);
        if (index >= 0) {
            return {
                kind: 'cell',
                index,
                side: closestSide(clientX, clientY, target, 0.25)
            };
        }
    }
    // 3. Below everything the grid laid out. This is the notebook's own trailing
    //    seam, and it claims the blank space under the last row -- which is
    //    bounded by the scroller, so it does not reach up into the notebook. A
    //    nearest-target search cannot serve this: when the last tile is a plain
    //    cell there is no trailing gutter at all, and the closest gutter is then
    //    some row's side edge, which is how a drop down here ended up mid-row.
    if (mosaic &&
        y > mosaic.grid.contentBottom &&
        x >= 0 &&
        x <= viewport.width) {
        const trailing = (_a = mosaic.solution) === null || _a === void 0 ? void 0 : _a.gutters.find(gutter => gutter.path.length === 0 && gutter.cellAfter < 0);
        if (trailing) {
            return { kind: 'gutter', gutter: trailing };
        }
        const last = notebook.widgets.length - 1;
        if (last >= 0) {
            // No trailing gutter means the last tile is a cell of the root column,
            // so its bottom edge already means "a new row at the end".
            return { kind: 'cell', index: last, side: 'bottom' };
        }
    }
    // 4. Otherwise the nearest target, gutter or cell, within reach of the point.
    let best = null;
    let bestDistance = DROP_RANGE * DROP_RANGE;
    for (const gutter of (_c = (_b = mosaic === null || mosaic === void 0 ? void 0 : mosaic.solution) === null || _b === void 0 ? void 0 : _b.gutters) !== null && _c !== void 0 ? _c : []) {
        const distance = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.distanceTo)(x, y, mosaic.grid.gutterRect(gutter));
        if (distance < bestDistance) {
            bestDistance = distance;
            best = { kind: 'gutter', gutter };
        }
    }
    const cellRange = Math.min(DROP_RANGE, CELL_HIT_MARGIN) ** 2;
    for (let index = 0; index < notebook.widgets.length; index++) {
        const node = notebook.widgets[index].node;
        if (node.dataset.mosaicHidden || !node.isConnected) {
            continue;
        }
        const rect = mosaic === null || mosaic === void 0 ? void 0 : mosaic.grid.cellRect(index);
        if (!rect) {
            continue;
        }
        const distance = (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.distanceTo)(x, y, rect);
        if (distance < Math.min(bestDistance, cellRange)) {
            bestDistance = distance;
            best = { kind: 'cell', index, side: (0,_MosaicTree__WEBPACK_IMPORTED_MODULE_3__.sideFrom)(rect, x, y) };
        }
    }
    return best;
}
/**
 * Which side of an element a point is nearest.
 *
 * @param balanceAspect Evens out the drop zones of non-square elements
 *   (0 = strictly nearest edge, 1 = four equal-area zones).
 */
function closestSide(x, y, target, balanceAspect = 0) {
    const rect = target.getBoundingClientRect();
    let top = Math.abs(y - rect.top);
    let left = Math.abs(x - rect.left);
    let bottom = Math.abs(y - rect.bottom);
    let right = Math.abs(x - rect.right);
    if (balanceAspect > 0 && rect.height > 0) {
        const aspect = rect.width / rect.height;
        top = (1 - balanceAspect) * top + balanceAspect * top * aspect;
        bottom = (1 - balanceAspect) * bottom + balanceAspect * bottom * aspect;
        left = (1 - balanceAspect) * left + (balanceAspect * left) / aspect;
        right = (1 - balanceAspect) * right + (balanceAspect * right) / aspect;
    }
    const min = Math.min(top, left, bottom, right);
    if (min === top) {
        return 'top';
    }
    if (min === left) {
        return 'left';
    }
    if (min === bottom) {
        return 'bottom';
    }
    return 'right';
}
/** `elementFromPoint`, ignoring Lumino's drag overlays. */
function elementFromPoint(x, y) {
    const overlays = document.querySelectorAll('.lm-cursor-backdrop, .lm-DragImage');
    overlays.forEach(o => (o.style.visibility = 'hidden'));
    const found = document.elementFromPoint(x, y);
    overlays.forEach(o => (o.style.visibility = ''));
    return found;
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
//# sourceMappingURL=lib_index_js.40df254b5186a4f22040.js.map