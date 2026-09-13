
Set up
```sh
git clone git@github.com:/robertstrauss/jupytermosaic.git
cd jupytermosaic
jlpm install
jlpm build # or `jlpm watch` for automatic rebuilding on file changes
pip install -e .
```

To automatically move build files to the jupyter environment, to skip having to un+reinstall with pip every time you make a change:
```sh
jupyter-builder develop --overwrite .
```

Useful for debugging: run jupyter server in with an option to expose jupyterapp object in the browser console.

<!--
using full --dev-mode requires building from source
# git clone https://github.com/jupyterlab/jupyterlab.git
# cd jupyterlab
# jlpm install
# jlpm build:core
# jupyter lab build # uses local dev_mode/ folder
-->
```sh
jupyter lab --expose-app-in-browser 
```


The official jupyter lab extension guide can be useful for understanding the structure and build/install process, as well as other tips: https://jupyterlab.readthedocs.io/en/latest/extension/extension_tutorial.html