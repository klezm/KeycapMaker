# Development Operations

## Basic Commands

- Install dependencies: `npm install`
- Dev server: `npm run dev`
- Verify production build: `npm run build`
- Check build output: `npm run preview`

## Frequently Touched Areas

### UI and Save Format

- `src/main.js`
  Input fields, export flow, JSON import/export, state management
- `src/lib/project-data.js`
  Project manifest and in-project keycap definitions
- `src/data/keycap-shape-registry.js`
  Aggregation of shape JSON, selectors, profile switching
- `src/data/keycap-shapes/*.json`
  Per-shape defaults, geometry defaults, display groups

### SCAD Geometry

- `scad/base/keycap.scad`
  Export entry point and whole-key orchestration
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

### Distributed Assets

- `public/vendor/openscad/`
  bundled OpenSCAD runtime
- `public/fonts/`
  Fonts for legends

## Checks When Making Changes

At minimum, run the following.

1. `npm run build`
2. Open the app in a browser and confirm that the preview is displayed

Perform additional checks depending on the change.

- UI changes:
  Parameter editing, JSON save/load, project save/load, message display
- SCAD changes:
  Confirm that representative shape changes are reflected in the preview
- Export changes:
  3MF save, STEP/STL save, part count, loading in Bambu Studio
- Font changes:
  Actual character rendering, font search, enabling/disabling native style, runtime asset loading

## Where to Update Documentation

- Structure or responsibilities changed:
  `docs/architecture/`
- Operational or verification procedures changed:
  `docs/guide/`
- Adopted decisions:
  `docs/decisions/decision-log.md`
- Unstarted TODOs:
  `docs/backlog/`
- UI design source of truth:
  `docs/design/`

## Items Requiring Human Review

- License implications of bundling the OpenSCAD runtime
- License implications of bundling fonts
- Load results in Bambu Studio
- Publication check on GitHub Pages

## Notes

- 3MF / STEP / STL are user-facing exports, but compatibility checks with slicers and CAD importers are handled in a separate procedure
