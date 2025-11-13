
import { expect, galata, test } from '@jupyterlab/galata'; // expect test
import { Page } from '@playwright/test';
import * as path from 'path';


const nbFile = 'simple_notebook.ipynb';



// import { DocumentManager } from '@jupyterlab/docmanager';
// /** patch DocumnetManager to not open default editor when no widgetName is specified if a different editor exists
//   * added to jupyterlab in PR https://github.com/jupyterlab/jupyterlab/pull/18034
//   * important for not duplicating Mosaic and Jupyter Notebook editors when reloading (restoring workspace) */
// DocumentManager.prototype.openOrReveal = function (path:string, widgetName:any = null, kernel?: any, options?: any) {
//   // console.warn('OOR');
//   const widget = this.findWidget(path, widgetName);
//   if (widget) {
//     (this as any)._opener.open(widget, {
//       type: widgetName || 'default',
//       ...options
//     });
//     return widget;
//   }
//   return this.open(path, widgetName || 'default', kernel, options ?? {});
// };

test.use({
  autoGoto: false,
  tmpPath: 'workspace-test',
  waitForApplication: async ({ baseURL }, use, testInfo) => {
    const simpleWait = async (page: Page): Promise<void> => {
      await page.locator('#jupyterlab-splash').waitFor({ state: 'detached' });
    };
    void use(simpleWait);
  }
});

test.describe('Restore non-default-type editor', () => {
  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${nbFile}`),
      `${tmpPath}/${nbFile}`
    );
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
  });

  // Use non-default state to have the running session panel displayed
  test.use({
    mockState: {
      'layout-restorer:data': {
        main: {
          current: "editor:workspace-test/simple_notebook.ipynb",
          dock: {
            type: 'tab-area',
            currentIndex: 0,
            widgets: ['editor:workspace-test/simple_notebook.ipynb'] // notebook open with file editor, not NotebookPanel
          }
        },
        down: {
          size: 0,
          widgets: []
        },
        left: {
          collapsed: false,
          visible: true,
          current: 'filebrowser',
          widgets: [
            'filebrowser',
            'running-sessions',
            '@jupyterlab/toc:plugin',
            'extensionmanager.main-view'
          ],
          widgetStates: {
            ['jp-running-sessions']: {
              sizes: [0.25, 0.25, 0.25, 0.25],
              expansionStates: [false, false, false, false]
            },
            ['extensionmanager.main-view']: {
              sizes: [
                0.3333333333333333, 0.3333333333333333, 0.3333333333333333
              ],
              expansionStates: [false, false, false]
            }
          }
        },
        right: {
          collapsed: true,
          visible: true,
          widgets: ['jp-property-inspector', 'debugger-sidebar'],
          widgetStates: {
            ['jp-debugger-sidebar']: {
              sizes: [0.2, 0.2, 0.2, 0.2, 0.2],
              expansionStates: [false, false, false, false, false]
            }
          }
        },
        relativeSizes: [0.4, 0.6, 0],
        top: {
          simpleVisibility: true
        }
      },
      'file-browser-filebrowser:cwd': {
        path: 'workspace-test'
      },
      'editor:workspace-test/simple_notebook.ipynb': { // File Editor, not Notebook
        data: {
          path: 'workspace-test/simple_notebook.ipynb',
          factory: 'Editor'
        }
      }
    } as any
  });

  test('should restore file editor of `.ipynb` file when reloading, and not open a Notebook', async ({
    baseURL,
    page,
    tmpPath,
    waitForApplication,
    
  }) => {
    // load in lab mode and trigger restorer
    page.goto(`${baseURL}/lab/workspaces/default?path=${tmpPath}/${nbFile}`, {waitUntil: 'domcontentloaded'});
    await Promise.all([
      // waitForApplication(page, page),
      // prom,
      // waitForApplication(page, helpers),
      // wait for the workspace to be saved
      page.waitForResponse(
        response => {
          // console.log('RESP', response, response.request().method(), response.request().url(), response.request().postDataJSON()?.data);
          // console.log('out', response.request().method() === 'PUT', /api\/workspaces/.test(response.request().url()), response.request().postDataJSON()?.data[`editor:workspace-test/simple_notebook.ipynb`]);
        
          const ret = response.request().method() === 'PUT' &&
          /api\/workspaces/.test(response.request().url()) &&
          response.request().postDataJSON().data[`editor:workspace-test/simple_notebook.ipynb`];
          if (ret) console.log('RET', ret);
          return ret;
        }),
        waitForApplication(page, page),
      ]);

    console.log("AWAITTED");

    // Ensure that there is only the document opened, no matter the workspace content.
    await expect(
      page.locator('#jp-main-dock-panel .jp-MainAreaWidget .jp-FileEditor')
    ).toHaveCount(1);

    await expect(
      page.locator('#jp-main-dock-panel .jp-MainAreaWidget .jp-Notebook')
    ).toHaveCount(0); // opened as a File, not a Notebook

    await expect(
      page.locator('#jp-main-dock-panel .jp-MainAreaWidget')
    ).toHaveCount(1);

    console.log('mock workspace loaded');

    // Reload, which should restore the loaded workspace.
    // page.reload();
    await Promise.all([
      page.filebrowser.open('simple_notebook.ipynb'),
      // page.reload(),
      // waitForApplication(page, page),
      // page.goto(`${baseURL}/lab`),
      // page.url() === `${baseURL}/lab`,
    ]);
    console.warn("AFTER RELOAD");

    // Ensure that there is STILL only the file editor document opened, and no new Notebook
    console.log('file editors', await page.locator('#jp-main-dock-panel .jp-MainAreaWidget .jp-FileEditor').count());
    await expect(
      page.locator('#jp-main-dock-panel .jp-MainAreaWidget .jp-FileEditor')
    ).toHaveCount(1);

    console.log('notebook editors', await page.locator('#jp-main-dock-panel .jp-MainAreaWidget .jp-Notebook').count());
    await expect(
      page.locator('#jp-main-dock-panel .jp-MainAreaWidget .jp-Notebook')
    ).toHaveCount(0); // opened as a File, not a Notebook

    console.log('main area widgets', await page.locator('#jp-main-dock-panel .jp-MainAreaWidget').count());
    await expect(
      page.locator('#jp-main-dock-panel .jp-MainAreaWidget')
    ).toHaveCount(1);

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('expected succesful');
  });
});
