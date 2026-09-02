"use strict";
(self["webpackChunkmosaic"] = self["webpackChunkmosaic"] || []).push([["style_index_js"],{

/***/ "./node_modules/css-loader/dist/cjs.js!./style/mosaic.css":
/*!****************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./style/mosaic.css ***!
  \****************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `/** mosaic-groups are flex so all the cells are squeezed into a row or column */
.mosaic-group-inner, .moasic-Notebook.jp-WindowedPanel-viewport {
    display: flex;
    position: relative;
    flex-basis: 100%; /* keeps from crushing scrollable divs to nothing */
    overflow: auto;
    /*z-index:  -2 !important;*/
    --mosaic-group-padding: 0px;
    --mosaic-cell-min-width: 160px;
}

/* .mosaic-group-outer:has(> .jp-WindowedPanel-outer:nth-child(2):last-child > .jp-WindowedPanel-inner > .mosaic-group-inner:empty) {
  /* hide empty groups * /
  display: none;
} */
/** 
 * makes cells and mosaic groups the same size, with gaps between them, and not overflow 
 * z-index is to make them capture the mouse events so they know when something is dragging over them
 */
.mosaic-Notebook .jp-Cell, .mosaic-group-outer { /*, .moasic-Notebook{*/
    /*min-width: 0;*/
    /* width: unset !important; */
    flex-grow: 1;
    flex-shrink: 0;
    flex-basis: 0; /* needs an absolute value, not content, to not collapse */
    /* z-index: 2; */
}
.mosaic-Notebook .jp-Cell {
  min-width: var(--mosaic-cell-min-width);
  box-sizing: border-box;
}
.mosaic-group-outer {
  min-width: calc(var(--mosaic-cell-min-width) + 2*var(--mosaic-group-padding));
}

/** when hovering over a mosaic-group it changed its background slightly so the execution order can be seen */
/* .mosaic-group:hover {
    background-color: rgba(0,0,0,0.2);
} */

/* .mosaic-skeuomorphic .moasic-Notebook.jp-WindowedPanel-viewport { */
  /* gap: 10px; */
/* } */


.jp-WindowedPanel-viewport.mosaic-group-inner.mosaic-row{
    flex-direction: row;
    padding: var(--mosaic-group-padding); /** padded edges to drop cells on **/
}
.jp-WindowedPanel-viewport.mosaic-group-inner.mosaic-col, .moasic-Notebook.jp-WindowedPanel-viewport {
    flex-direction: column;
    padding: var(--mosaic-group-padding);
}

/* body:not(.mosaic-skeuomorphic) */
.mosaic-scrolling { 
  --overflow-shadow-color: 0, 0, 0;
  --overflow-shadow-opacity: 0.9;
}
/* .mosaic-skeuomorphic .mosaic-scrolling {
  --overflow-shadow-color: var(--jp-layout-color3);
  --overflow-shadow-opacity: 1.0;
} */
.mosaic-scrolling::after, .mosaic-scrolling::before {
  pointer-events: none;
  z-index: 2;
  content: '';
  position: absolute;
  /* top: 0;
  left: 0;
  right: 0;
  bottom: 0; */
  /* --shadow-extent: 20px; */
}
/* .mosaic-col .mosaic-scrolling { */
  /* scroll-timeline: --shift-shadow-vert y;
  scroll-timeline: --shift-shadow-vert vertical; */
/* } */
.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)[data-mosaic-scrolled-side='top']::before {
  /* hide top shadow if scrolled all the way to the top */
  opacity: 0;
}

.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)[data-mosaic-scrolled-side='bottom']::after {
  display: none;
  opacity: 0;;
}

.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)::after {
  /* overshadow both top and bottom, where more content lurks */
  /* stick out past edges, shadow decays less along width */
  left: -15px;
  right: -15px;
  height: 15px; /* thickness of shadow overlay */
  bottom: 0;
  border-bottom: 1px solid rgb(var(--overflow-shadow-color));
  background: radial-gradient(
    farthest-side at 50% 100%,
    rgba(var(--overflow-shadow-color), 1) 0%,
    rgba(var(--overflow-shadow-color), 0) 100%
  );
  transition: 0.8s;
  opacity: 1;
}
.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)::before {
  /* overshadow both top and bottom, where more content lurks */
  /* stick out past edges, shadow decays less along width */
  left: -15px;
  right: -15px;
  height: 15px; /* thickness of shadow overlay */
  top: 0;
  border-top: 1px solid rgb(var(--overflow-shadow-color));
  background: radial-gradient(
    farthest-side at 50% 0,
    rgba(var(--overflow-shadow-color), 1) 0%,
    rgba(var(--overflow-shadow-color), 0) 100%
  );
  transition: 0.8s;
  opacity: 1;
  /* a shadow coming in on the left and right to show it extends beyond these sides */
  /* box-shadow: inset 0px -35px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)), 
              inset 0px 35px  20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)); */
  /* transition: 0.8s; */
  /* animation: adjust-position-vert linear forwards;
  animation-timeline: --shift-shadow-vert; */
}
/* @keyframes adjust-position-vert {
	0% {
    transform: translateX(0); /* stay fixed over the viewport * /
    /* fully scrolled to the start: shadow over right only, where more cells are * /
    box-shadow: inset -10px -30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),
                inset 10px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
	}
  5% {
    box-shadow: inset -10px -30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), 
                inset 10px 30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
  }
  95% {
    box-shadow: inset -10px -30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), 
                inset 10px 30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
  }
	100% {
    transform: translateX(calc(var(--scroll-width) + -100%)); /* stay fixed over the viewport * /
    /* fully scrolled to the end: shadow over left only, where more cells are * /
    box-shadow: inset -10px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),
                inset 10px 30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
	}
} */

.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)[data-mosaic-scrolled-side="left"]::before {
  opacity: 0;
  /* overshadow mostly the right, where more content lurks */
  /* box-shadow: inset -35px -0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)),
              inset   0px  0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)); */
}
.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)[data-mosaic-scrolled-side="right"]::after {
  opacity: 0;
  /* overshadow mostly the left, where more content lurks */
  /* box-shadow: inset 0px   0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)),
              inset 35px  0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)); */
}
  /* a shadow coming in on the left and right to show it extends beyond these sides */
.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)::before {
  /* an elliptical shadow and border for a slit-like appearance, content sliding under a seam in the background */
  /* stick out past edges, shadow decays less along width */
  top: -15px;
  bottom: -15px;
  width: 15px; /* thickness of shadow overlay */
  left: 0;
  border-left: 1px solid rgb(var(--overflow-shadow-color));
  background: radial-gradient(
    farthest-side at 0 50%,
    rgba(var(--overflow-shadow-color), 1) 0%,
    rgba(var(--overflow-shadow-color), 0) 100%
  );
  transition: 0.8s;
  opacity: 1;
}
.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)::after {
  /* stick out past edges, shadow decays less along width */
  top: -15px;
  bottom: -15px;
  width: 15px; /* thickness of shadow overlay */
  right: 0;
  border-right: 1px solid rgb(var(--overflow-shadow-color));
  background: radial-gradient(
    farthest-side at 100% 50%,
    rgba(var(--overflow-shadow-color), 1) 0%,
    rgba(var(--overflow-shadow-color), 0) 100%
  );
  transition: 0.8s;
  opacity: 1;
    /* box-shadow: inset -35px 0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)), 
                inset  35px 0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity));
    transition: 0.8s; */
}
/* @keyframes adjust-position-horiz {
	0% {
    transform: translateX(0); /* stay fixed over the viewport * /
    /* fully scrolled to the start: shadow over right only, where more cells are * /
    box-shadow: inset -30px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),
                inset 10px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
	}
  5% {
    box-shadow: inset -30px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), 
                inset 30px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
  }
  95% {
    box-shadow: inset -30px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), 
                inset 30px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));
  }
	100% {
    transform: translateX(calc(var(--scroll-width) + -100%)); /* stay fixed over the viewport * /
    /* fully scrolled to the end: shadow over left only, where more cells are * /
    box-shadow: inset -10px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),
                inset 30px 10px 10px -10px rgba(0, 0, 0, var(--overflow-hadow-opacity));
	}
} */



body:not(.mosaic-skeuomorphic) .mosaic-Notebook {
  --cell-margin: 0;
}
/** floating vs flat layout style */
/** takes away white middle column so cells are floating in the grey area */
.mosaic-skeuomorphic .mosaic-Notebook {
    background: transparent;
    box-shadow: none;
    --cell-margin: 10px;
}

.mosaic-skeuomorphic .mosaic-Notebook .jp-Cell {
    background-color: rgba(255, 255, 255, 0.03);
}
/** makes cells floating bubbles with round corners */
.mosaic-skeuomorphic .mosaic-Notebook.jp-WindowedPanel:not(.mosaic-tabgroup) > .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .jp-WindowedPanel-viewport > .jp-Cell,
.mosaic-skeuomorphic .mosaic-Notebook .jp-WindowedPanel:not(.mosaic-tabgroup) > .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .jp-WindowedPanel-viewport > .jp-Cell,
 .mosaic-skeuomorphic .mosaic-tabgroup {
    /* background-color: var(--jp-layout-color3); */
    /* make the cells slightly lighter than background */
    box-shadow: 0px 2px 7px 1px rgba(0,0,0,0.7);
    border-radius: 10px !important;
    margin: var(--cell-margin);
}
.mosaic-skeuomorphic .mosaic-Notebook.jp-ThemedContainer :not(.jp-Cell) {
  /* make the background darker than usual to differentiate from the cells */
  background-color: rgb(from var(--jp-layout-color3) calc(r - 50) calc(g - 50) calc(b - 50));
}

div .mosaic-Notebook .jp-WindowedPanel-viewport {
  padding: 0; /* get rid of padding of outer notebook, more useful to be flush with edge in mosaic mode */
}


/** offset  run buttons of nested groups from overlapping */
.mosaic-group-outer:not(:nth-child(1)) {
  --parent-run-btn-offset: 0;
  --run-btn-offset: 0;
}
.mosaic-group-inner:first-child {
  --parent-run-btn-offset: var(--run-btn-offset);
}
.mosaic-group-outer:nth-child(1){ /* 2nd because windowedpanel scrollbar is always first */
  /* --parent-run-btn-offset: var(--run-btn-offset); */
  --run-btn-offset: calc(var(--parent-run-btn-offset)+1px)
}

.mosaic-group-run-btn {
  position: absolute;
  top: 0;
  left: calc(var(--run-btn-offset)*25);
  width: 24px;
  height: 24px;
  background-color: rgba(120, 120, 120, 0.3);
  border-radius: 3px;
  z-index: 3;
  align-items: center;
  justify-content: center;

  opacity: 0; /* invisible except when hovered over */
  /* pointer-events: none; */
  transition: 0.2s;
}
.mosaic-group-run-btn:hover {
  opacity: 1;
}
.mosaic-group-run-btn svg {
  max-width: 100%;
  height: 100%;
  color: var(--jp-ui-font-color0); /* visible against background in light or dark mode */
}

.mosaic-row {
  gap: 10px; /* gap between elements for resize handle */
  cursor: ew-resize;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
}
.mosaic-row > * {
  scroll-snap-align: center;
  cursor: pointer; /* no resize cursor unless over only the row itself (not children content) */
  flex-basis: var(--el-width); /* width stored in parent variable */
}


/** makes the input prompt or blank area of markdown cells clickable with z-index, so it can be dragged there, and full size */

/** styles the input prompt of code cells only, making it bigger and on the top rather than side */

/* * puts cell handles (In [*]:) and output labels (Out [*]:) on the left */
.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {
    width: 100%;
    height: 100%;
    max-height: 2.8rem !important;
}
.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {
    text-align: left;
}
.mosaic-top-cell-handles .mosaic-Notebook .jp-Cell .jp-InputArea, .mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea {
    flex-direction: column !important;
}
/** 
 * make the output view full width of the cell 
 * (it usually leaves room for the output prompt, but we are putting that on top instead)
 */
.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-child {
    max-width: 100% !important;
}
.mosaic-top-cell-handles .mosaic-Notebook .prompt_container > .jp-InputPrompt {
    text-align: left;
    position: relative;
    height: 2.8rem;
    width: 100%;
}
.mosaic-top-cell-handles .mosaic-Notebook .jp-InputPrompt {
    width: 100%;
    /* height: 100%; */
    text-align: left;
    flex: 0 0 auto;
    z-index: 2;
}
.mosaic-top-cell-handles .mosaic-Notebook .jp-InputArea-editor {
  margin-left: 5px; /* spacing between collapser and editor */
}

/** makes sure the output is clickable */
.mosaic-Notebook .jp-OutputArea {
    z-index: 2 !important;
}




.mosaic-group-outer.jp-mod-dropTarget ,
.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget ,
.mosaic-Notebook .jp-mod-commandMode .jp-Notebook-cell.jp-mod-active.jp-mod-selected.jp-mod-dropTarget {
    border: none;
  }

.mosaic-group-outer.jp-mod-dropTarget::after ,
.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget::after,
.mosaic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget::after {
    display: none; /* shown only when data-mosaic-drop-side is set */
    content: '';
    position: absolute;
    contain: strict;
    background: rgba(33, 150, 243, 0.1);
    border: var(--jp-border-width) dashed var(--jp-brand-color1);
    transition-property: top, left, right, bottom;
    transition-duration: 150ms;
    transition-timing-function: ease;
}
.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side="top"]::after,
.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side="top"]::after,
.mosaic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget[data-mosaic-drop-side="top"]::after{
  top: 0px;
  left: 0px;
  right: 0px;
  height: calc(min(50%, 39px));
  display: block;
}

.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side="bottom"]::after,
.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side="bottom"]::after,
.mosaic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget[data-mosaic-drop-side="bottom"]::after {
  bottom: 0px;
  left: 0px;
  right: 0px;
  height: calc(min(50%, 39px));
  display: block; 
}
.moasic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget[data-mosaic-drop-side="bottom"]::after {
  bottom: -39px;
}

.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side="left"]::after,
.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side="left"]::after {
  top: 0px;
  left: 0px;
  bottom: 0px;
  width: 50%;
  display: block;
}

.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side="right"]::after,
.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side="right"]::after{
  top: 0px;
  bottom: 0px;
  right: 0px;
  width: 50%;
  display: block;
} 

.mosaic-group-outer.mosaic-tabgroup:has(> .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .mosaic-group-inner > .jp-mod-dropTarget[data-mosaic-drop-side="tab"])::after,
.mosaic-Notebook .jp-WindowedPanel-viewport:not(.mosaic-group-inner) .jp-Cell.jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side="tab"]::after {
  top: var(--jp-cell-padding);
  right: var(--jp-cell-padding);
  width: 50%;
  height: 1rem;
  display: block;
} 


/* .mosaic-tabgroup {
    border: 1px solid var(--jp-layout-color2);
    border-radius: 5px;
    margin: 5px;
    padding: 5px;
} */

.mosaic-top-cell-handles .mosaic-tabgroup > .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .mosaic-group-inner > .jp-CodeCell .jp-InputPrompt {
    display: none; /* hide input prompt of cells inside tab groups, since prompt is already shown in tab title */
}

.mosaic-tabgroup:has(.jp-Notebook-cell.jp-mod-active) {
    border-color: var(--jp-brand-color1);
    box-shadow: 0 0 5px var(--jp-brand-color1);
}


.mosaic-tab-bar {
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    overflow-x: auto;
    align-items: center;
}

.mosaic-tab, .mosaic-add-tab-button {
    background-color: rgba(0,0,0, 0.1);
    padding: 0.5rem 0.5rem;
    cursor: pointer;
    border-right: 1px solid var(--jp-border-color1);
    border-bottom: 1px solid var(--jp-border-color1);
    white-space: nowrap;
    flex: 1 0 auto;
    box-shadow: inset 0px -5px 5px 0px rgba(0,0,0,0.3);
    min-width: 100px;
}
.mosaic-tab > pre {
    height: 1rem;
    margin: 0;
}
/* body:not(.mosaic-skeuomorphic) .mosaic-tab, body:not(.mosaic-skeuomorphic) .mosaic-add-tab-button {
  border-radius: 0;
  margin: 0;
  height: 1rem;
} */

.mosaic-tab:not(.mosaic-tab-selected):hover {
    background-color: rgba(0,0,0,0.2);
    box-shadow: 0px 2px 7px 1px rgba(0,0,0,0.7);
}

.mosaic-tab-active {
    /* background-color: rgba(255,255,255,0.05); */
    background: rgba(0,0,0,0); /* blend in with cell */
    /* box-shadow: 0px 2px 7px 1px rgba(0,0,0,0.7); */
    box-shadow: none;
    /* font-weight: bold; */
    color: var(--jp-inprompt-font-color);
    border: 1px 1px 0 1px solid var(--jp-brand-color1);
    border-left: 5px solid var(--jp-brand-color1);
}

.mosaic-Notebook .mosaic-add-tab-button {
  /* border: 1px solid var(--jp-border-color1); */
  padding: 0.5rem 0.5rem;
  min-width: 1rem !important;
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto !important;
  cursor: pointer;
  text-align: center;
  vertical-align: middle;
  /* border-left: 1px solid var(--jp-accent-color1); */
    /* margin-left: auto; */
}

.mosaic-add-tab-button:hover {
    background-color: var(--jp-layout-color3);
}

.mosaic-tab-selected, .mosaic-tab-selected.mosaic-tab-active {
    background-color: var(--jp-notebook-multiselected-color);
    color: white;
}`, "",{"version":3,"sources":["webpack://./style/mosaic.css"],"names":[],"mappings":"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","sourcesContent":["/** mosaic-groups are flex so all the cells are squeezed into a row or column */\n.mosaic-group-inner, .moasic-Notebook.jp-WindowedPanel-viewport {\n    display: flex;\n    position: relative;\n    flex-basis: 100%; /* keeps from crushing scrollable divs to nothing */\n    overflow: auto;\n    /*z-index:  -2 !important;*/\n    --mosaic-group-padding: 0px;\n    --mosaic-cell-min-width: 160px;\n}\n\n/* .mosaic-group-outer:has(> .jp-WindowedPanel-outer:nth-child(2):last-child > .jp-WindowedPanel-inner > .mosaic-group-inner:empty) {\n  /* hide empty groups * /\n  display: none;\n} */\n/** \n * makes cells and mosaic groups the same size, with gaps between them, and not overflow \n * z-index is to make them capture the mouse events so they know when something is dragging over them\n */\n.mosaic-Notebook .jp-Cell, .mosaic-group-outer { /*, .moasic-Notebook{*/\n    /*min-width: 0;*/\n    /* width: unset !important; */\n    flex-grow: 1;\n    flex-shrink: 0;\n    flex-basis: 0; /* needs an absolute value, not content, to not collapse */\n    /* z-index: 2; */\n}\n.mosaic-Notebook .jp-Cell {\n  min-width: var(--mosaic-cell-min-width);\n  box-sizing: border-box;\n}\n.mosaic-group-outer {\n  min-width: calc(var(--mosaic-cell-min-width) + 2*var(--mosaic-group-padding));\n}\n\n/** when hovering over a mosaic-group it changed its background slightly so the execution order can be seen */\n/* .mosaic-group:hover {\n    background-color: rgba(0,0,0,0.2);\n} */\n\n/* .mosaic-skeuomorphic .moasic-Notebook.jp-WindowedPanel-viewport { */\n  /* gap: 10px; */\n/* } */\n\n\n.jp-WindowedPanel-viewport.mosaic-group-inner.mosaic-row{\n    flex-direction: row;\n    padding: var(--mosaic-group-padding); /** padded edges to drop cells on **/\n}\n.jp-WindowedPanel-viewport.mosaic-group-inner.mosaic-col, .moasic-Notebook.jp-WindowedPanel-viewport {\n    flex-direction: column;\n    padding: var(--mosaic-group-padding);\n}\n\n/* body:not(.mosaic-skeuomorphic) */\n.mosaic-scrolling { \n  --overflow-shadow-color: 0, 0, 0;\n  --overflow-shadow-opacity: 0.9;\n}\n/* .mosaic-skeuomorphic .mosaic-scrolling {\n  --overflow-shadow-color: var(--jp-layout-color3);\n  --overflow-shadow-opacity: 1.0;\n} */\n.mosaic-scrolling::after, .mosaic-scrolling::before {\n  pointer-events: none;\n  z-index: 2;\n  content: '';\n  position: absolute;\n  /* top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0; */\n  /* --shadow-extent: 20px; */\n}\n/* .mosaic-col .mosaic-scrolling { */\n  /* scroll-timeline: --shift-shadow-vert y;\n  scroll-timeline: --shift-shadow-vert vertical; */\n/* } */\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)[data-mosaic-scrolled-side='top']::before {\n  /* hide top shadow if scrolled all the way to the top */\n  opacity: 0;\n}\n\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)[data-mosaic-scrolled-side='bottom']::after {\n  display: none;\n  opacity: 0;;\n}\n\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)::after {\n  /* overshadow both top and bottom, where more content lurks */\n  /* stick out past edges, shadow decays less along width */\n  left: -15px;\n  right: -15px;\n  height: 15px; /* thickness of shadow overlay */\n  bottom: 0;\n  border-bottom: 1px solid rgb(var(--overflow-shadow-color));\n  background: radial-gradient(\n    farthest-side at 50% 100%,\n    rgba(var(--overflow-shadow-color), 1) 0%,\n    rgba(var(--overflow-shadow-color), 0) 100%\n  );\n  transition: 0.8s;\n  opacity: 1;\n}\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-col)::before {\n  /* overshadow both top and bottom, where more content lurks */\n  /* stick out past edges, shadow decays less along width */\n  left: -15px;\n  right: -15px;\n  height: 15px; /* thickness of shadow overlay */\n  top: 0;\n  border-top: 1px solid rgb(var(--overflow-shadow-color));\n  background: radial-gradient(\n    farthest-side at 50% 0,\n    rgba(var(--overflow-shadow-color), 1) 0%,\n    rgba(var(--overflow-shadow-color), 0) 100%\n  );\n  transition: 0.8s;\n  opacity: 1;\n  /* a shadow coming in on the left and right to show it extends beyond these sides */\n  /* box-shadow: inset 0px -35px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)), \n              inset 0px 35px  20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)); */\n  /* transition: 0.8s; */\n  /* animation: adjust-position-vert linear forwards;\n  animation-timeline: --shift-shadow-vert; */\n}\n/* @keyframes adjust-position-vert {\n\t0% {\n    transform: translateX(0); /* stay fixed over the viewport * /\n    /* fully scrolled to the start: shadow over right only, where more cells are * /\n    box-shadow: inset -10px -30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),\n                inset 10px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n\t}\n  5% {\n    box-shadow: inset -10px -30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), \n                inset 10px 30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n  }\n  95% {\n    box-shadow: inset -10px -30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), \n                inset 10px 30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n  }\n\t100% {\n    transform: translateX(calc(var(--scroll-width) + -100%)); /* stay fixed over the viewport * /\n    /* fully scrolled to the end: shadow over left only, where more cells are * /\n    box-shadow: inset -10px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),\n                inset 10px 30px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n\t}\n} */\n\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)[data-mosaic-scrolled-side=\"left\"]::before {\n  opacity: 0;\n  /* overshadow mostly the right, where more content lurks */\n  /* box-shadow: inset -35px -0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)),\n              inset   0px  0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)); */\n}\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)[data-mosaic-scrolled-side=\"right\"]::after {\n  opacity: 0;\n  /* overshadow mostly the left, where more content lurks */\n  /* box-shadow: inset 0px   0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)),\n              inset 35px  0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)); */\n}\n  /* a shadow coming in on the left and right to show it extends beyond these sides */\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)::before {\n  /* an elliptical shadow and border for a slit-like appearance, content sliding under a seam in the background */\n  /* stick out past edges, shadow decays less along width */\n  top: -15px;\n  bottom: -15px;\n  width: 15px; /* thickness of shadow overlay */\n  left: 0;\n  border-left: 1px solid rgb(var(--overflow-shadow-color));\n  background: radial-gradient(\n    farthest-side at 0 50%,\n    rgba(var(--overflow-shadow-color), 1) 0%,\n    rgba(var(--overflow-shadow-color), 0) 100%\n  );\n  transition: 0.8s;\n  opacity: 1;\n}\n.mosaic-scrolling:has(>.jp-WindowedPanel-outer>.jp-WindowedPanel-inner>.mosaic-row)::after {\n  /* stick out past edges, shadow decays less along width */\n  top: -15px;\n  bottom: -15px;\n  width: 15px; /* thickness of shadow overlay */\n  right: 0;\n  border-right: 1px solid rgb(var(--overflow-shadow-color));\n  background: radial-gradient(\n    farthest-side at 100% 50%,\n    rgba(var(--overflow-shadow-color), 1) 0%,\n    rgba(var(--overflow-shadow-color), 0) 100%\n  );\n  transition: 0.8s;\n  opacity: 1;\n    /* box-shadow: inset -35px 0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity)), \n                inset  35px 0px 20px -20px rgba(var(--overflow-shadow-color), var(--overflow-shadow-opacity));\n    transition: 0.8s; */\n}\n/* @keyframes adjust-position-horiz {\n\t0% {\n    transform: translateX(0); /* stay fixed over the viewport * /\n    /* fully scrolled to the start: shadow over right only, where more cells are * /\n    box-shadow: inset -30px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),\n                inset 10px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n\t}\n  5% {\n    box-shadow: inset -30px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), \n                inset 30px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n  }\n  95% {\n    box-shadow: inset -30px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)), \n                inset 30px 10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity));\n  }\n\t100% {\n    transform: translateX(calc(var(--scroll-width) + -100%)); /* stay fixed over the viewport * /\n    /* fully scrolled to the end: shadow over left only, where more cells are * /\n    box-shadow: inset -10px -10px 10px -10px rgba(0, 0, 0, var(--overflow-shadow-opacity)),\n                inset 30px 10px 10px -10px rgba(0, 0, 0, var(--overflow-hadow-opacity));\n\t}\n} */\n\n\n\nbody:not(.mosaic-skeuomorphic) .mosaic-Notebook {\n  --cell-margin: 0;\n}\n/** floating vs flat layout style */\n/** takes away white middle column so cells are floating in the grey area */\n.mosaic-skeuomorphic .mosaic-Notebook {\n    background: transparent;\n    box-shadow: none;\n    --cell-margin: 10px;\n}\n\n.mosaic-skeuomorphic .mosaic-Notebook .jp-Cell {\n    background-color: rgba(255, 255, 255, 0.03);\n}\n/** makes cells floating bubbles with round corners */\n.mosaic-skeuomorphic .mosaic-Notebook.jp-WindowedPanel:not(.mosaic-tabgroup) > .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .jp-WindowedPanel-viewport > .jp-Cell,\n.mosaic-skeuomorphic .mosaic-Notebook .jp-WindowedPanel:not(.mosaic-tabgroup) > .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .jp-WindowedPanel-viewport > .jp-Cell,\n .mosaic-skeuomorphic .mosaic-tabgroup {\n    /* background-color: var(--jp-layout-color3); */\n    /* make the cells slightly lighter than background */\n    box-shadow: 0px 2px 7px 1px rgba(0,0,0,0.7);\n    border-radius: 10px !important;\n    margin: var(--cell-margin);\n}\n.mosaic-skeuomorphic .mosaic-Notebook.jp-ThemedContainer :not(.jp-Cell) {\n  /* make the background darker than usual to differentiate from the cells */\n  background-color: rgb(from var(--jp-layout-color3) calc(r - 50) calc(g - 50) calc(b - 50));\n}\n\ndiv .mosaic-Notebook .jp-WindowedPanel-viewport {\n  padding: 0; /* get rid of padding of outer notebook, more useful to be flush with edge in mosaic mode */\n}\n\n\n/** offset  run buttons of nested groups from overlapping */\n.mosaic-group-outer:not(:nth-child(1)) {\n  --parent-run-btn-offset: 0;\n  --run-btn-offset: 0;\n}\n.mosaic-group-inner:first-child {\n  --parent-run-btn-offset: var(--run-btn-offset);\n}\n.mosaic-group-outer:nth-child(1){ /* 2nd because windowedpanel scrollbar is always first */\n  /* --parent-run-btn-offset: var(--run-btn-offset); */\n  --run-btn-offset: calc(var(--parent-run-btn-offset)+1px)\n}\n\n.mosaic-group-run-btn {\n  position: absolute;\n  top: 0;\n  left: calc(var(--run-btn-offset)*25);\n  width: 24px;\n  height: 24px;\n  background-color: rgba(120, 120, 120, 0.3);\n  border-radius: 3px;\n  z-index: 3;\n  align-items: center;\n  justify-content: center;\n\n  opacity: 0; /* invisible except when hovered over */\n  /* pointer-events: none; */\n  transition: 0.2s;\n}\n.mosaic-group-run-btn:hover {\n  opacity: 1;\n}\n.mosaic-group-run-btn svg {\n  max-width: 100%;\n  height: 100%;\n  color: var(--jp-ui-font-color0); /* visible against background in light or dark mode */\n}\n\n.mosaic-row {\n  gap: 10px; /* gap between elements for resize handle */\n  cursor: ew-resize;\n  scroll-behavior: smooth;\n  scroll-snap-type: x proximity;\n}\n.mosaic-row > * {\n  scroll-snap-align: center;\n  cursor: pointer; /* no resize cursor unless over only the row itself (not children content) */\n  flex-basis: var(--el-width); /* width stored in parent variable */\n}\n\n\n/** makes the input prompt or blank area of markdown cells clickable with z-index, so it can be dragged there, and full size */\n\n/** styles the input prompt of code cells only, making it bigger and on the top rather than side */\n\n/* * puts cell handles (In [*]:) and output labels (Out [*]:) on the left */\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {\n    width: 100%;\n    height: 100%;\n    max-height: 2.8rem !important;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {\n    text-align: left;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-Cell .jp-InputArea, .mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea {\n    flex-direction: column !important;\n}\n/** \n * make the output view full width of the cell \n * (it usually leaves room for the output prompt, but we are putting that on top instead)\n */\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-child {\n    max-width: 100% !important;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .prompt_container > .jp-InputPrompt {\n    text-align: left;\n    position: relative;\n    height: 2.8rem;\n    width: 100%;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-InputPrompt {\n    width: 100%;\n    /* height: 100%; */\n    text-align: left;\n    flex: 0 0 auto;\n    z-index: 2;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-InputArea-editor {\n  margin-left: 5px; /* spacing between collapser and editor */\n}\n\n/** makes sure the output is clickable */\n.mosaic-Notebook .jp-OutputArea {\n    z-index: 2 !important;\n}\n\n\n\n\n.mosaic-group-outer.jp-mod-dropTarget ,\n.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget ,\n.mosaic-Notebook .jp-mod-commandMode .jp-Notebook-cell.jp-mod-active.jp-mod-selected.jp-mod-dropTarget {\n    border: none;\n  }\n\n.mosaic-group-outer.jp-mod-dropTarget::after ,\n.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget::after,\n.mosaic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget::after {\n    display: none; /* shown only when data-mosaic-drop-side is set */\n    content: '';\n    position: absolute;\n    contain: strict;\n    background: rgba(33, 150, 243, 0.1);\n    border: var(--jp-border-width) dashed var(--jp-brand-color1);\n    transition-property: top, left, right, bottom;\n    transition-duration: 150ms;\n    transition-timing-function: ease;\n}\n.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side=\"top\"]::after,\n.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side=\"top\"]::after,\n.mosaic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget[data-mosaic-drop-side=\"top\"]::after{\n  top: 0px;\n  left: 0px;\n  right: 0px;\n  height: calc(min(50%, 39px));\n  display: block;\n}\n\n.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side=\"bottom\"]::after,\n.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side=\"bottom\"]::after,\n.mosaic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget[data-mosaic-drop-side=\"bottom\"]::after {\n  bottom: 0px;\n  left: 0px;\n  right: 0px;\n  height: calc(min(50%, 39px));\n  display: block; \n}\n.moasic-Notebook .jp-WindowedPanel-viewport.jp-mod-dropTarget[data-mosaic-drop-side=\"bottom\"]::after {\n  bottom: -39px;\n}\n\n.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side=\"left\"]::after,\n.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side=\"left\"]::after {\n  top: 0px;\n  left: 0px;\n  bottom: 0px;\n  width: 50%;\n  display: block;\n}\n\n.mosaic-group-outer.jp-mod-dropTarget[data-mosaic-drop-side=\"right\"]::after,\n.mosaic-Notebook .jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side=\"right\"]::after{\n  top: 0px;\n  bottom: 0px;\n  right: 0px;\n  width: 50%;\n  display: block;\n} \n\n.mosaic-group-outer.mosaic-tabgroup:has(> .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .mosaic-group-inner > .jp-mod-dropTarget[data-mosaic-drop-side=\"tab\"])::after,\n.mosaic-Notebook .jp-WindowedPanel-viewport:not(.mosaic-group-inner) .jp-Cell.jp-Notebook-cell.jp-mod-dropTarget[data-mosaic-drop-side=\"tab\"]::after {\n  top: var(--jp-cell-padding);\n  right: var(--jp-cell-padding);\n  width: 50%;\n  height: 1rem;\n  display: block;\n} \n\n\n/* .mosaic-tabgroup {\n    border: 1px solid var(--jp-layout-color2);\n    border-radius: 5px;\n    margin: 5px;\n    padding: 5px;\n} */\n\n.mosaic-top-cell-handles .mosaic-tabgroup > .jp-WindowedPanel-outer > .jp-WindowedPanel-inner > .mosaic-group-inner > .jp-CodeCell .jp-InputPrompt {\n    display: none; /* hide input prompt of cells inside tab groups, since prompt is already shown in tab title */\n}\n\n.mosaic-tabgroup:has(.jp-Notebook-cell.jp-mod-active) {\n    border-color: var(--jp-brand-color1);\n    box-shadow: 0 0 5px var(--jp-brand-color1);\n}\n\n\n.mosaic-tab-bar {\n    display: flex;\n    flex-direction: row;\n    flex-shrink: 0;\n    overflow-x: auto;\n    align-items: center;\n}\n\n.mosaic-tab, .mosaic-add-tab-button {\n    background-color: rgba(0,0,0, 0.1);\n    padding: 0.5rem 0.5rem;\n    cursor: pointer;\n    border-right: 1px solid var(--jp-border-color1);\n    border-bottom: 1px solid var(--jp-border-color1);\n    white-space: nowrap;\n    flex: 1 0 auto;\n    box-shadow: inset 0px -5px 5px 0px rgba(0,0,0,0.3);\n    min-width: 100px;\n}\n.mosaic-tab > pre {\n    height: 1rem;\n    margin: 0;\n}\n/* body:not(.mosaic-skeuomorphic) .mosaic-tab, body:not(.mosaic-skeuomorphic) .mosaic-add-tab-button {\n  border-radius: 0;\n  margin: 0;\n  height: 1rem;\n} */\n\n.mosaic-tab:not(.mosaic-tab-selected):hover {\n    background-color: rgba(0,0,0,0.2);\n    box-shadow: 0px 2px 7px 1px rgba(0,0,0,0.7);\n}\n\n.mosaic-tab-active {\n    /* background-color: rgba(255,255,255,0.05); */\n    background: rgba(0,0,0,0); /* blend in with cell */\n    /* box-shadow: 0px 2px 7px 1px rgba(0,0,0,0.7); */\n    box-shadow: none;\n    /* font-weight: bold; */\n    color: var(--jp-inprompt-font-color);\n    border: 1px 1px 0 1px solid var(--jp-brand-color1);\n    border-left: 5px solid var(--jp-brand-color1);\n}\n\n.mosaic-Notebook .mosaic-add-tab-button {\n  /* border: 1px solid var(--jp-border-color1); */\n  padding: 0.5rem 0.5rem;\n  min-width: 1rem !important;\n  width: 1rem;\n  height: 1rem;\n  flex: 0 0 auto !important;\n  cursor: pointer;\n  text-align: center;\n  vertical-align: middle;\n  /* border-left: 1px solid var(--jp-accent-color1); */\n    /* margin-left: auto; */\n}\n\n.mosaic-add-tab-button:hover {\n    background-color: var(--jp-layout-color3);\n}\n\n.mosaic-tab-selected, .mosaic-tab-selected.mosaic-tab-active {\n    background-color: var(--jp-notebook-multiselected-color);\n    color: white;\n}"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = [];

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";
      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }
      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }
      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }
      content += cssWithMappingToString(item);
      if (needLayer) {
        content += "}";
      }
      if (item[2]) {
        content += "}";
      }
      if (item[4]) {
        content += "}";
      }
      return content;
    }).join("");
  };

  // import a list of modules into the list
  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }
    var alreadyImportedModules = {};
    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];
        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }
    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);
      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }
      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }
      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }
      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }
      list.push(item);
    }
  };
  return list;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/sourceMaps.js":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/sourceMaps.js ***!
  \************************************************************/
/***/ ((module) => {



module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];
  if (!cssMapping) {
    return content;
  }
  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    return [content].concat([sourceMapping]).join("\n");
  }
  return [content].join("\n");
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {



var stylesInDOM = [];
function getIndexByIdentifier(identifier) {
  var result = -1;
  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }
  return result;
}
function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };
    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }
    identifiers.push(identifier);
  }
  return identifiers;
}
function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);
  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }
      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };
  return updater;
}
module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];
    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }
    var newLastIdentifiers = modulesToDom(newList, options);
    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];
      var _index = getIndexByIdentifier(_identifier);
      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();
        stylesInDOM.splice(_index, 1);
      }
    }
    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {



var memo = {};

/* istanbul ignore next  */
function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target);

    // Special case to return head of iframe instead of iframe itself
    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }
    memo[target] = styleTarget;
  }
  return memo[target];
}

/* istanbul ignore next  */
function insertBySelector(insert, style) {
  var target = getTarget(insert);
  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  target.appendChild(style);
}
module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {



/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}
module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;
  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}
module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {



/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";
  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }
  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }
  var needLayer = typeof obj.layer !== "undefined";
  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }
  css += obj.css;
  if (needLayer) {
    css += "}";
  }
  if (obj.media) {
    css += "}";
  }
  if (obj.supports) {
    css += "}";
  }
  var sourceMap = obj.sourceMap;
  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  }

  // For old IE
  /* istanbul ignore if  */
  options.styleTagTransform(css, styleElement, options.options);
}
function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }
  styleElement.parentNode.removeChild(styleElement);
}

/* istanbul ignore next  */
function domAPI(options) {
  if (typeof document === "undefined") {
    return {
      update: function update() {},
      remove: function remove() {}
    };
  }
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}
module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {



/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }
    styleElement.appendChild(document.createTextNode(css));
  }
}
module.exports = styleTagTransform;

/***/ }),

/***/ "./style/index.js":
/*!************************!*\
  !*** ./style/index.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _mosaic_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mosaic.css */ "./style/mosaic.css");



/***/ }),

/***/ "./style/mosaic.css":
/*!**************************!*\
  !*** ./style/mosaic.css ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_mosaic_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./mosaic.css */ "./node_modules/css-loader/dist/cjs.js!./style/mosaic.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_mosaic_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_mosaic_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_mosaic_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_mosaic_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ })

}]);
//# sourceMappingURL=style_index_js.bd20204e7d8681b344ed.js.map