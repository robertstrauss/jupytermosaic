# Jupyter Mosaic

Arange Jupyter notebook cells in any way two-dimensionally.
Let your Jupyter notebook tell the story and be self-documenting in itself, like a poster presentation.

Jupyter Mosaic is an extension for Jupyter notebook and Jupyter lab that allows cells to be dragged around and resized to tile in a subdividable grid layout.

The layout you define by dragging cells into place is saved in the metadata of the notebook, so anyone with the extension can view the layout as you made it.
This does not change any of the core functionality of jupyter, just the UI. If you decide to disable or remove it, your notebook will still function normally as a jupyter notebook, just without the draggable mosaic layout. When opened as a regular jupyter notebook again, the cells will be ordered to be as simmilar to your mosaic layout as possible, so code will execute in the same order.

<img src="./screenshots/screen3.png" />
<img src="./screenshots/screen2.png" />

## Installation
 * [Jupyter notebook](#jupyter-notebook)
 * [Jupyter lab](#jupyter-lab)

### Jupyter notebook

Clone the repository then install and enable the extension:
```bash
git clone https://github.com/robertstrauss/jupytermosaic.git
jupyter nbextensions install jupytermosaic/jupyter_notebook --user
jupyter nbextensions enable jupytermosaic/jupyter_notebook/main --user
```
You may need to restart the Jupyter notebook server if it was already running.

It can be disabled by running this in the directory you cloned the repo at:
```bash
jupyter nbextensions disable jupytermosaic/jupyter_notebook/main --user
```
Or uninstalled similarly:
```bash
jupyter nbextensions uninstall jupytermosaic/jupyter_notebook --user
```

### Jupyter lab
TODO - Jupyter mosaic does not currently work on Jupyter lab.

## How to cite
Robert Strauss, 2020, https://github.com/robertstrauss/jupytermosaic
