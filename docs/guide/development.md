# Development Guide

## Basic Commands

- Install dependencies: `npm install`
- Development server: `npm run dev`
- Production build check: `npm run build`
- Check build artifacts: `npm run preview`
- Run tests: `npm run test`

## Frequently Modified Areas

### UI and Save Formats

- `src/main.js`
  Input fields, export flow, JSON I/O, state management
- `src/lib/project-data.js`
  Project manifest and project inner keycap definitions
- `src/data/keycap-shape-registry.js`
  Aggregation of shape JSON, selector, profile switching
- `src/data/keycap-shapes/*.json`
  Initial values for each shape, geometry defaults, display groups

### SCAD Geometry

- `scad/base/keycap.scad`
  Export entry and whole-key orchestration
- `scad/modules/`
  Shell, legend, stem, homing bar
- `scad/presets/`
  Stem nominal constants and sample parameter sets

### Runtime / Preview / Export

- `src/lib/keycap-scad-bundle.js`
  Bridge between JS and SCAD
- `src/lib/openscad-client.js`
  OpenSCAD worker execution
- `src/lib/preview-scene.js`
  Three.js preview
- `src/lib/export-3mf.js`
  3MF generation
- `src/lib/export-step.js`
  STEP AP214 faceted B-rep generation

### Delivery Assets

- `public/vendor/openscad/`
  Bundled OpenSCAD runtime
- `public/fonts/`
  Fonts for legends

## Verification upon Modification

At a minimum, run the following:

1. `npm run build`
2. Open the app in the browser and confirm that the preview is displayed

Perform additional checks depending on the modifications:

- UI modifications:
  Parameter editing, JSON save/load, Project save/load, message display
- SCAD modifications:
  Confirm that representative shape changes are reflected in the preview
- Export modifications:
  3MF save, STEP/STL save, part count, loading in Bambu Studio
- Font modifications:
  Actual text display, font search, enabling/disabling native styles, loading runtime assets

## Document Update Locations

- When structure or responsibilities change:
  `docs/architecture/`
- When operation or verification procedures change:
  `docs/guide/`
- Adopted decisions:
  `docs/decisions/decision-log.md`
- Unstarted TODOs:
  `docs/backlog/`
- Source of truth for UI design:
  `docs/design/`

## Items Requiring Human Verification

- License impact of bundling the OpenSCAD runtime
- License impact of bundling fonts
- Loading results in Bambu Studio
- Publication verification on GitHub Pages

## Supplementary Information

- 3MF / STEP / STL are user-facing exports, but checking slicer and CAD importer compatibility is handled as a separate procedure.
