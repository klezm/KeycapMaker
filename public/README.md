# public Directory Guide

`public/` is the storage for static assets to be delivered as-is on GitHub Pages.

## Deployment Candidates

- Wasm binaries
- Font files
- Icons and images
- Auxiliary files directly referenced in the build at delivery time

When bundling fonts that use `text()`, first decide the placement policy under this directory.

## Current Bundled Items

- `vendor/openscad/`: OpenSCAD WASM runtime
- `assets/j-stem-lp01/`: Official STEP and OFF derivative meshes for preview of J-STEM-LP01
- `fonts/MPLUS1-Variable.ttf`: `M PLUS 1` variable font
- `fonts/MPLUS1p-Regular.ttf`: Standard Gothic
- `fonts/NotoSans-Variable.ttf`: `Noto Sans` variable font
- `fonts/NotoSansJP-Variable.ttf`: `Noto Sans JP` variable font
- `fonts/MPLUSRounded1c-Regular.ttf`: Rounded Gothic
- `fonts/DotGothic16-Regular.ttf`: Dot-style Gothic
- `fonts/*-OFL.txt`: Licenses for each font
- `fonts/*-SOURCE.txt`: Source/metadata check memos for some fonts
