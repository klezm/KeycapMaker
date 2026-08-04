# App overview

## Current product scope

KeycapMaker is a client-side-only keycap editing app served via GitHub Pages. The main current features are as follows.

- Editing keycap shapes
- Editing the legend's text, typeface, in-font style, explicit weight correction, position, and height. The keytop legend's embed depth can also be edited
- Switching between homing bar and stem types
- Adding a key rim dedicated to the typewriter shape
- Preview via Three.js
- A project that bundles multiple keycaps together
- 3MF export
- STEP export for CAD interchange
- STL export for single-material shapes
- Saving JSON for resuming edits, and drag-and-drop loading

## Fixed implementation assumptions

- Deployment uses GitHub Pages
- No server-side processing is assumed
- OpenSCAD execution, preview, and export are all self-contained in the browser
- preview and export have separate responsibilities
- body / legend keep the separate-volume approach
- Color assignment is auxiliary information; the semantic meaning of a part is defined primarily by the separate-volume structure

## Main code responsibilities

### UI and state management

- `src/main.js`
  The center of app state, forms, preview updates, export, and JSON I/O
- `src/lib/editor-data.js`
  Handles the canonical export of editor data JSON, and import of compatible input JSON that fills in missing fields with defaults
- `src/lib/project-data.js`
  Handles the project manifest that bundles multiple keycaps, and normalization of keycap entries within a project
- `src/data/keycap-shape-registry.js`
  Aggregates shape JSON, provides a selector, and resolves the default shape
- `src/data/keycap-shapes/*.json`
  Per-shape initial values, geometry defaults, and display group definitions
- `src/lib/keycap-fonts.js`
  Shares legend font choices and style resolution across UI / export / import

### OpenSCAD execution

- `src/lib/openscad-client.js`
  A thin client that launches the Web Worker
- `src/openscad-worker.js`
  The worker that runs OpenSCAD jobs using the bundled runtime
- `public/vendor/openscad/`
  The bundled OpenSCAD WASM runtime

### SCAD bridge

- `src/lib/keycap-scad-bundle.js`
  Bridges the SCAD file set, fonts, and wrapper SCAD to the runtime
- `scad/base/keycap.scad`
  The entry point for the whole keycap
- `scad/modules/`
  Reusable shapes such as shell, legend, stem, and homing bar
- `scad/presets/`
  SCAD-specific nominal constants and sample parameter sets

### Preview and export

- `src/lib/off-parser.js`
  A parser for handling OFF meshes in JS
- `src/lib/preview-scene.js`
  Preview display via Three.js
- `src/lib/export-3mf.js`
  Generates a 3MF package from a set of OFF meshes
- `src/lib/export-step.js`
  Generates a STEP AP214 faceted B-rep from a single shape's OFF mesh
- `public/assets/j-stem-lp01/`
  The official STEP for J-STEM-LP01, and an OFF mesh derived from that official STEP for reference preview

## Data flow

1. `src/main.js` holds UI input in state
2. `src/lib/keycap-scad-bundle.js` generates wrapper SCAD containing `user_*` definitions
3. The worker runs the SCAD via the bundled OpenSCAD runtime
4. In preview, the OFF is parsed and passed to the Three.js display
5. When J-STEM-LP01 is selected, the preview adds the OFF derived from the official STEP as a color-selectable alignment reference
6. In export, OFF meshes are collected per part to generate a 3MF, or a STEP is generated from a single shape's OFF, or a single STL is generated from the OpenSCAD runtime. Editor data JSON is generated from state
7. A project bundles multiple editor data JSON files and preview images together via a `KeycapMaker.json` manifest
8. On import, the app reads a project directory, a saved editor data JSON, or a sparse compatible input JSON, merges it with defaults, and restores state

### Overall flow as a Mermaid diagram

```mermaid
flowchart LR
  screen["Screen / src/main.js"] --> state["editor state"]
  shapeJson["shape JSON / src/data/keycap-shapes/*.json"] --> state
  state --> editorJson["editor data JSON"]
  state --> projectJson["project / KeycapMaker.json + keycaps/"]
  state --> bridge["SCAD bridge / src/lib/keycap-scad-bundle.js"]
  shapeJson --> bridge
  bridge --> wrapper["wrapper SCAD / user_*"]
  scadAssets["SCAD assets / scad/base + scad/modules"] --> wrapper
  wrapper --> worker["Worker / src/openscad-worker.js"]
  worker --> wasm["OpenSCAD WASM runtime"]
  wasm --> off["OFF meshes"]
  officialStep["Official J-STEM STEP / derived OFF"] --> preview
  off --> preview["Three.js preview"]
  off --> export3mf["3MF export"]
  off --> exportStep["single-shape STEP export"]
  wasm --> exportStl["single-material STL export"]
```

## Current user-facing output

- `3MF`
  Holds the body / rim / homing / keytop legend / sidewall legend meshes as part objects, and bundles them under a parent `components` object
- `STEP`
  Saves the single shape derived from `single_material_shape` as a STEP AP214 faceted B-rep. Does not include color, legend, or part separation
- `STL`
  An optional single-material shape output. Does not include color or legend, and is saved as a single mesh
- `Editor data JSON`
  A format for saving UI state and reloading it later
- `Project`
  A directory format that bundles multiple editor data JSON files and preview images via a `KeycapMaker.json` manifest

## Current implementation constraints

- legend uses a fixed model of center / top-right / bottom-right / top-left / bottom-left on the keytop, and front / back / left / right on the sidewall
- The keytop legend's exposed face assumes a top dish
- The sidewall legend is placed to match the tilt of each side's center reference plane, and is automatically embedded up to the wall's inner surface. It does not automatically follow rounded corners or the notch face of JIS Enter
- Variable fonts' native styles can be used, but italic / slanted cannot be produced unless the font itself has that data
- 3MF includes color information, but slicer compatibility must be separately verified manually
- License review of the bundled OpenSCAD runtime and fonts requires final human confirmation

## Related documents

- [scad-and-export.md](scad-and-export.md)
- [project-data.md](project-data.md)
- [../guide/development.md](../guide/development.md)
- [../guide/manual-verification.md](../guide/manual-verification.md)
- [../backlog/legend-extensibility-todo.md](../backlog/legend-extensibility-todo.md)
</content>
</invoke>
