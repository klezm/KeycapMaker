# public Directory Guide

`public/` is where static assets served as-is via GitHub Pages live.

## Candidate Contents

- Wasm binaries
- Font files
- Icons and images
- Supporting files referenced directly by the build at delivery time

If you plan to bundle a font that uses `text()`, decide on the placement policy within this directory first.

## Current Contents

- `vendor/openscad/`: OpenSCAD WASM runtime
- `assets/j-stem-lp01/`: the official STEP file for J-STEM-LP01 and a derived OFF mesh for preview
- `fonts/MPLUS1-Variable.ttf`: the `M PLUS 1` variable font
- `fonts/MPLUS1p-Regular.ttf`: a standard gothic typeface
- `fonts/NotoSans-Variable.ttf`: the `Noto Sans` variable font
- `fonts/NotoSansJP-Variable.ttf`: the `Noto Sans JP` variable font
- `fonts/MPLUSRounded1c-Regular.ttf`: a rounded gothic typeface
- `fonts/DotGothic16-Regular.ttf`: a dot-matrix-style gothic typeface
- `fonts/*-OFL.txt`: license for each font
- `fonts/*-SOURCE.txt`: source/metadata verification notes for some fonts
