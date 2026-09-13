# Jupyter Mosaic

A Jupyter Lab extension to make notebooks more visual and usable.


[Installation](#installation)

[New Features](#new-features---v20)

[Please Cite](#please-cite)

<!-- [Demo Videos]() -->

# About

Jupyter Mosaic is now on PyPI as `jupyter-mosaic`!
Install on the machine running the jupyter server with 
```sh
pip install jupyter-mosaic
```

Jupyter Mosaic is an extension for Jupyter Lab that gives Jupyter Notebooks two-dimensional subdividable tiling grid layouts.

Drag-and-drop cells or use `a`, `s`, `f`, and `b` in command mode to subdivide, inserting a cell above, left, right, or below the selected cell, respectively.

[Backwards Compatable](#backwards-compatable-still-just-a-notebook)! Notebooks still use the same file type and are completely usable without Mosaic; opened with vanilla Jupyter, the layout will be linear but execution will still flow the same way.

# Uses of the Interface


## Parallel experiments in two columns.

Align your similarly structured experiment sequences and see the corresponding steps in line with each other.

![Two-column experiment layout](https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/experiment_2_columns.png)

## Structured, intuitive notebooks.

A really good notebook uses markdown documentation and latex to give an exact breakdown of what the code does, rather than leaving it up to a reader to decipher your esoteric functions. Plus, 

<img alt="Example LaTeX+Code Layout" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/tiled_markdown_corner.png"/>




## Easy visual plot comparison.

Drag and drop plots together rather than use `plt.subplots`. Faster, more intuitive, easily rearrangable, and self-documenting by showinge exactly what commands make which mosaic 'subplot'.

![Mosaic row of plots](https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/plot_row.png)


## Create self-documenting research or tutorial notebooks.

Tile theoretical explanations in line with code, walking through concepts while implementing them right there.


<img alt="Monte Carlo Theory+Code Example" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/markdown_col_plots.png"/>



## Dashboard interface

Use notebooks as interactive tools rather than scripts, now with a real layout instead of a long linear document.

<img alt="Example Layout" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/example-front.png"/>


## Present your results compactly in video confrences.

Show relevant tables and plots together alongside generating code, without fussing with graphics tools or losing your audience by scrolling back and forth.

<img alt="Example Table+Plot Layout" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/tiled_dataframes.png"/>



## Output beside code

Mosaic also adds a button to move cell output to the right of code, a popular format for interactive development.

<img alt="Plot below code" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/output_below_plot.png" width="45%"/>
 --> <img alt="Plot beside code" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/output_beside_plot.png" width="45%"/>

-----
<img alt="Table below code" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/output_below_table.png" width="45%"/>
 --> <img alt="Table beside code" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/output_besides_table.png" width="45%"/>

<!-- <img alt="Two plots beside code cells" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/two_output_beside_plot.png"/> -->


# No Whitespace, No Waste.

Most lines of code barely reach halfway across the screen. All that blank space on the right half of the page is why you're always scrolling back and forth between related parts of your code that end up separated by an inconvenient vertical distance.

# Backwards-Compatable (Still Just a Notebook!)

On the disk, your mosaic notebook still is just a normal linear Jupyter Notebook. It's exactly the same file type, so someone without the extension can still open and use your notebook and everything will execute correctly, just in a flattened one-dimensional layout. This does not change any of the core functionality of jupyter, just the UI.

You can even synchronously collaborate with non-Mosaic users and edit the same notebook; they see it linearly while you see a grid layout, but changes are shared instantly.

You can double-check how non-Mosaic users will see your notebook by right-clicing the file and selecting `Open With` > `Notebook`

<img alt="Open With context menu" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/open_with_notebook.png"/>
<img alt="Side-by-side mosaic and normal notebooks" src="https://raw.githubusercontent.com/robertstrauss/jupytermosaic/main/gallery/mosaic_vs_normal_together.png"/>

## Grid Structure and Execution Order (how is it linearized?)
The mosaic notebook is divided into rows, each of which may contain multiple cells and columns, which may be again divided into rows recursively, and so on and so on.

Each row is executed left-to-right. Each column is executed top-to-bottom.
When a column is inside a row, the column is executed entirely before continuing to the right, and vice versa for rows inside columns.

This execution order is also how the cells are linearized when the notebook is opened without the Jupyter Mosaic extension.


# New Features - v2.0

* Side-by-side output

A button moves cell output to the right of code, or puts it back below.

* Synchronous mosaic/normal-notebook editing works

* Markdown exand/collapse sections

Built-in jupyter expand/collapse functionality showing/hiding cells under markdown headers now works.

* Collapse grid to normal column if too small

* Grid navigation and division keybinds.

In command mode:

`h` - move left one cell

`j` - move down one cell

`k` - move up one cell

`l` - move right one cell

To create new cells in the grid layout:

`a` - create cell <u>a</u>bove (divide horizontally)

`b` - create cell <u>b</u>elow (divide horizontally)

`s` - create cell to the left (divide vertically)

`f` - create cell to the right (divide vertically)


# Installation


Jupyter Mosaic is now on PyPI as `jupyter-mosaic`!
Install on the machine running the jupyter server with 
```sh
pip install jupyter-mosaic
```
And you're done! Restart jupyterlab, and check its enabled in the extensions menu (left sidebar puzzle piece).

## Manual/Development Install
Or, you can manually clone and install it.
Clone it (or download and unpack the archive from the repository's Code
button), then install in editable mode from inside the directory:

```sh
git clone https://github.com/robertstrauss/jupytermosaic.git
cd jupytermosaic
pip install -e .
```
<!-- 
The equivalent without git:

```sh
wget https://github.com/robertstrauss/jupytermosaic/archive/refs/heads/main.zip
unzip main.zip
cd jupytermosaic-main
pip install -e .
```

Restart the Jupyter server if it was already running. You should see a Mosaic
entry in the launcher alongside the usual Notebook one.

Installing straight from the repository, without a local copy, also works:

```sh
pip install git+https://github.com/robertstrauss/jupytermosaic.git
``` -->

## Uninstall

```bash
pip uninstall jupyter-mosaic
```

## NbClassic (Jupyter Notebook Version < 7)

DEPRECATED



# Please Cite
Robert Strauss, "Jupyter Mosaic" 2020, https://github.com/robertstrauss/jupytermosaic
