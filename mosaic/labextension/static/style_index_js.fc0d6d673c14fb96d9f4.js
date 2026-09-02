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
___CSS_LOADER_EXPORT___.push([module.id, `/**
 * Jupyter Mosaic layout.
 *
 * The notebook viewport is a single flat CSS grid: every cell is a direct child
 * of \`.jp-WindowedPanel-viewport\` and is positioned by \`grid-row\`/\`grid-column\`
 * computed in MosaicGrid.ts. There are no nested containers -- the notebook's
 * windowed layout binary-searches every viewport child for a windowing index
 * and hangs on anything else. Group chrome therefore lives in \`.mosaic-overlay\`,
 * a sibling of the viewport.
 */

.mosaic-Notebook {
  --mosaic-cell-min-width: 160px;
  --mosaic-gap: 8px;

  /* Sampled once by WindowedList on attach and folded into the document
     height, so this must not vary with the layout-style setting. */
  --mosaic-edge-padding: 8px;
  --mosaic-frame-color: rgb(128 128 128 / 35%);
  --cell-margin: 0;
}

/* The viewport is the grid. Windowing keeps it absolutely positioned; the
   getSpan override pins it to the top so grid lines stay in document space. */
.mosaic-Notebook .jp-WindowedPanel-viewport.mosaic-grid {
  display: grid;
  align-items: stretch;
  gap: var(--mosaic-gap);
  padding: var(--mosaic-edge-padding);
  box-sizing: border-box;
  left: 0;
  right: 0;
  width: auto;
}

.mosaic-Notebook .jp-WindowedPanel-inner {
  position: relative; /* containing block for the overlay plane */
}

.mosaic-Notebook .jp-Cell {
  min-width: var(--mosaic-cell-min-width);
  min-height: 0;
  box-sizing: border-box;
  margin: 0;
}

/* Cells inside a scrolling or tabbed group are positioned by hand against the
   group's grid area, so they must not stretch to it. */
.mosaic-Notebook .jp-Cell.mosaic-managed {
  overflow: hidden;
}

/* -- overlay plane ------------------------------------------------------- */

.mosaic-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}

.mosaic-frame {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  pointer-events: none;
  transition: border-color 0.15s;
}

.mosaic-frame:hover,
.mosaic-frame[data-mosaic-mode='scroll'],
.mosaic-frame[data-mosaic-mode='tabs'] {
  border-color: var(--mosaic-frame-color);
}

.mosaic-frame-run {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background-color: rgb(128 128 128 / 30%);
  color: var(--jp-ui-font-color0);
  font-size: 10px;
  line-height: 20px;
  cursor: pointer;
  opacity: 0;
  pointer-events: auto;
  transition: opacity 0.2s;
}

.mosaic-frame:hover .mosaic-frame-run {
  opacity: 1;
}

/* Insert-left/right reuse the insert-above/below icons, turned a quarter turn
   so the arrow points the way the cell will be added. */
svg[data-icon='mosaic:add-left'],
svg[data-icon='mosaic:add-right'] {
  transform: rotate(-90deg);
}

/* -- simulated scrollbars ------------------------------------------------- */

.mosaic-frame-scrollbar {
  position: absolute;
  pointer-events: auto;
  background-color: rgb(128 128 128 / 12%);
  border-radius: 4px;
}

.mosaic-frame[data-mosaic-axis='col'] > .mosaic-frame-scrollbar {
  top: 0;
  bottom: 0;
  right: 0;
  width: 8px;
}

.mosaic-frame[data-mosaic-axis='row'] > .mosaic-frame-scrollbar {
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
}

.mosaic-frame-thumb {
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgb(128 128 128 / 65%);
  border-radius: 4px;
  cursor: grab;
}

.mosaic-frame-thumb:active {
  cursor: grabbing;
  background-color: rgb(128 128 128 / 90%);
}

.mosaic-frame[data-mosaic-axis='col']
  > .mosaic-frame-scrollbar
  > .mosaic-frame-thumb {
  width: 100%;
}

.mosaic-frame[data-mosaic-axis='row']
  > .mosaic-frame-scrollbar
  > .mosaic-frame-thumb {
  height: 100%;
}

/* -- tab bars ------------------------------------------------------------- */

.mosaic-frame-tabs {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  pointer-events: auto;
  background-color: var(--jp-layout-color2);
  border-radius: 6px 6px 0 0;
}

.mosaic-tab {
  padding: 2px 8px;
  font-size: var(--jp-ui-font-size0);
  font-family: var(--jp-ui-font-family);
  color: var(--jp-ui-font-color1);
  white-space: nowrap;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
}

.mosaic-tab:hover {
  background-color: var(--jp-layout-color3);
}

.mosaic-tab-active {
  background-color: var(--jp-layout-color1);
  color: var(--jp-ui-font-color0);
  font-weight: 600;
}

/* -- drop indicators ------------------------------------------------------ */

.mosaic-Notebook .jp-Cell.jp-mod-dropTarget::after {
  content: '';
  position: absolute;
  background-color: var(--jp-brand-color1);
  border-radius: 2px;
  z-index: 4;
  pointer-events: none;
}

.mosaic-Notebook
  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='top']::after {
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.mosaic-Notebook
  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='bottom']::after {
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.mosaic-Notebook
  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='left']::after {
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
}

.mosaic-Notebook
  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='right']::after {
  top: 0;
  bottom: 0;
  right: 0;
  width: 3px;
}

/* -- flat vs floating presentation (the style dropdown) ------------------- */

.mosaic-skeuomorphic .mosaic-Notebook {
  background: transparent;
  box-shadow: none;

  --cell-margin: 10px;
  --mosaic-gap: 14px;
}

.mosaic-skeuomorphic .mosaic-Notebook .jp-Cell {
  background-color: rgb(255 255 255 / 3%);
  box-shadow: 0 2px 7px 1px rgb(0 0 0 / 70%);
  border-radius: 10px;
}

.mosaic-skeuomorphic .mosaic-Notebook.jp-ThemedContainer :not(.jp-Cell) {
  /* darken the backdrop so the floating cells read as raised */
  background-color: rgb(
    from var(--jp-layout-color3) calc(r - 50) calc(g - 50) calc(b - 50)
  );
}

/* the outer notebook's own padding is not useful once cells tile edge to edge */
div .mosaic-Notebook .jp-WindowedPanel-viewport {
  padding: var(--mosaic-edge-padding);
}

/* * puts cell handles (In [*]:) and output labels (Out [*]:) on the left */
.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {
  width: 100%;
  height: 100%;
  max-height: 2.8rem !important;
}
.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {
  text-align: left;
}
.mosaic-top-cell-handles .mosaic-Notebook .jp-Cell .jp-InputArea,
.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea {
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
`, "",{"version":3,"sources":["webpack://./style/mosaic.css"],"names":[],"mappings":"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","sourcesContent":["/**\n * Jupyter Mosaic layout.\n *\n * The notebook viewport is a single flat CSS grid: every cell is a direct child\n * of `.jp-WindowedPanel-viewport` and is positioned by `grid-row`/`grid-column`\n * computed in MosaicGrid.ts. There are no nested containers -- the notebook's\n * windowed layout binary-searches every viewport child for a windowing index\n * and hangs on anything else. Group chrome therefore lives in `.mosaic-overlay`,\n * a sibling of the viewport.\n */\n\n.mosaic-Notebook {\n  --mosaic-cell-min-width: 160px;\n  --mosaic-gap: 8px;\n\n  /* Sampled once by WindowedList on attach and folded into the document\n     height, so this must not vary with the layout-style setting. */\n  --mosaic-edge-padding: 8px;\n  --mosaic-frame-color: rgb(128 128 128 / 35%);\n  --cell-margin: 0;\n}\n\n/* The viewport is the grid. Windowing keeps it absolutely positioned; the\n   getSpan override pins it to the top so grid lines stay in document space. */\n.mosaic-Notebook .jp-WindowedPanel-viewport.mosaic-grid {\n  display: grid;\n  align-items: stretch;\n  gap: var(--mosaic-gap);\n  padding: var(--mosaic-edge-padding);\n  box-sizing: border-box;\n  left: 0;\n  right: 0;\n  width: auto;\n}\n\n.mosaic-Notebook .jp-WindowedPanel-inner {\n  position: relative; /* containing block for the overlay plane */\n}\n\n.mosaic-Notebook .jp-Cell {\n  min-width: var(--mosaic-cell-min-width);\n  min-height: 0;\n  box-sizing: border-box;\n  margin: 0;\n}\n\n/* Cells inside a scrolling or tabbed group are positioned by hand against the\n   group's grid area, so they must not stretch to it. */\n.mosaic-Notebook .jp-Cell.mosaic-managed {\n  overflow: hidden;\n}\n\n/* -- overlay plane ------------------------------------------------------- */\n\n.mosaic-overlay {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n  pointer-events: none;\n  z-index: 3;\n}\n\n.mosaic-frame {\n  position: absolute;\n  top: 0;\n  left: 0;\n  box-sizing: border-box;\n  border: 1px solid transparent;\n  border-radius: 6px;\n  pointer-events: none;\n  transition: border-color 0.15s;\n}\n\n.mosaic-frame:hover,\n.mosaic-frame[data-mosaic-mode='scroll'],\n.mosaic-frame[data-mosaic-mode='tabs'] {\n  border-color: var(--mosaic-frame-color);\n}\n\n.mosaic-frame-run {\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 20px;\n  height: 20px;\n  padding: 0;\n  border: none;\n  border-radius: 3px;\n  background-color: rgb(128 128 128 / 30%);\n  color: var(--jp-ui-font-color0);\n  font-size: 10px;\n  line-height: 20px;\n  cursor: pointer;\n  opacity: 0;\n  pointer-events: auto;\n  transition: opacity 0.2s;\n}\n\n.mosaic-frame:hover .mosaic-frame-run {\n  opacity: 1;\n}\n\n/* Insert-left/right reuse the insert-above/below icons, turned a quarter turn\n   so the arrow points the way the cell will be added. */\nsvg[data-icon='mosaic:add-left'],\nsvg[data-icon='mosaic:add-right'] {\n  transform: rotate(-90deg);\n}\n\n/* -- simulated scrollbars ------------------------------------------------- */\n\n.mosaic-frame-scrollbar {\n  position: absolute;\n  pointer-events: auto;\n  background-color: rgb(128 128 128 / 12%);\n  border-radius: 4px;\n}\n\n.mosaic-frame[data-mosaic-axis='col'] > .mosaic-frame-scrollbar {\n  top: 0;\n  bottom: 0;\n  right: 0;\n  width: 8px;\n}\n\n.mosaic-frame[data-mosaic-axis='row'] > .mosaic-frame-scrollbar {\n  left: 0;\n  right: 0;\n  bottom: 0;\n  height: 8px;\n}\n\n.mosaic-frame-thumb {\n  position: absolute;\n  top: 0;\n  left: 0;\n  background-color: rgb(128 128 128 / 65%);\n  border-radius: 4px;\n  cursor: grab;\n}\n\n.mosaic-frame-thumb:active {\n  cursor: grabbing;\n  background-color: rgb(128 128 128 / 90%);\n}\n\n.mosaic-frame[data-mosaic-axis='col']\n  > .mosaic-frame-scrollbar\n  > .mosaic-frame-thumb {\n  width: 100%;\n}\n\n.mosaic-frame[data-mosaic-axis='row']\n  > .mosaic-frame-scrollbar\n  > .mosaic-frame-thumb {\n  height: 100%;\n}\n\n/* -- tab bars ------------------------------------------------------------- */\n\n.mosaic-frame-tabs {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  display: flex;\n  gap: 2px;\n  overflow-x: auto;\n  pointer-events: auto;\n  background-color: var(--jp-layout-color2);\n  border-radius: 6px 6px 0 0;\n}\n\n.mosaic-tab {\n  padding: 2px 8px;\n  font-size: var(--jp-ui-font-size0);\n  font-family: var(--jp-ui-font-family);\n  color: var(--jp-ui-font-color1);\n  white-space: nowrap;\n  cursor: pointer;\n  border-radius: 4px 4px 0 0;\n}\n\n.mosaic-tab:hover {\n  background-color: var(--jp-layout-color3);\n}\n\n.mosaic-tab-active {\n  background-color: var(--jp-layout-color1);\n  color: var(--jp-ui-font-color0);\n  font-weight: 600;\n}\n\n/* -- drop indicators ------------------------------------------------------ */\n\n.mosaic-Notebook .jp-Cell.jp-mod-dropTarget::after {\n  content: '';\n  position: absolute;\n  background-color: var(--jp-brand-color1);\n  border-radius: 2px;\n  z-index: 4;\n  pointer-events: none;\n}\n\n.mosaic-Notebook\n  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='top']::after {\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 3px;\n}\n\n.mosaic-Notebook\n  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='bottom']::after {\n  bottom: 0;\n  left: 0;\n  right: 0;\n  height: 3px;\n}\n\n.mosaic-Notebook\n  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='left']::after {\n  top: 0;\n  bottom: 0;\n  left: 0;\n  width: 3px;\n}\n\n.mosaic-Notebook\n  .jp-Cell.jp-mod-dropTarget[data-mosaic-drop-side='right']::after {\n  top: 0;\n  bottom: 0;\n  right: 0;\n  width: 3px;\n}\n\n/* -- flat vs floating presentation (the style dropdown) ------------------- */\n\n.mosaic-skeuomorphic .mosaic-Notebook {\n  background: transparent;\n  box-shadow: none;\n\n  --cell-margin: 10px;\n  --mosaic-gap: 14px;\n}\n\n.mosaic-skeuomorphic .mosaic-Notebook .jp-Cell {\n  background-color: rgb(255 255 255 / 3%);\n  box-shadow: 0 2px 7px 1px rgb(0 0 0 / 70%);\n  border-radius: 10px;\n}\n\n.mosaic-skeuomorphic .mosaic-Notebook.jp-ThemedContainer :not(.jp-Cell) {\n  /* darken the backdrop so the floating cells read as raised */\n  background-color: rgb(\n    from var(--jp-layout-color3) calc(r - 50) calc(g - 50) calc(b - 50)\n  );\n}\n\n/* the outer notebook's own padding is not useful once cells tile edge to edge */\ndiv .mosaic-Notebook .jp-WindowedPanel-viewport {\n  padding: var(--mosaic-edge-padding);\n}\n\n/* * puts cell handles (In [*]:) and output labels (Out [*]:) on the left */\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {\n  width: 100%;\n  height: 100%;\n  max-height: 2.8rem !important;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-promptOverlay {\n  text-align: left;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-Cell .jp-InputArea,\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea {\n  flex-direction: column !important;\n}\n/** \n * make the output view full width of the cell \n * (it usually leaves room for the output prompt, but we are putting that on top instead)\n */\n.mosaic-top-cell-handles .mosaic-Notebook .jp-OutputArea-child {\n  max-width: 100% !important;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .prompt_container > .jp-InputPrompt {\n  text-align: left;\n  position: relative;\n  height: 2.8rem;\n  width: 100%;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-InputPrompt {\n  width: 100%;\n  /* height: 100%; */\n  text-align: left;\n  flex: 0 0 auto;\n  z-index: 2;\n}\n.mosaic-top-cell-handles .mosaic-Notebook .jp-InputArea-editor {\n  margin-left: 5px; /* spacing between collapser and editor */\n}\n\n/** makes sure the output is clickable */\n.mosaic-Notebook .jp-OutputArea {\n  z-index: 2 !important;\n}\n"],"sourceRoot":""}]);
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
//# sourceMappingURL=style_index_js.fc0d6d673c14fb96d9f4.js.map