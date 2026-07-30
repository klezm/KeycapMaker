# SCAD and Export Contract

## Purpose

This document summarizes the responsibilities between UI parameters, SCAD geometry parameters, and exported parts. The actual SCAD parameter mapping is implemented in `src/lib/keycap-scad-bundle.js`.

## Separation of Responsibilities

### UI Parameters (editor state)

- Shape definition values that the user manipulates via the screen or JSON
- Normalized for each shape profile
- Unit is mainly mm or degrees
- Legend positions use center / top left / bottom right, and sidewall uses front / back / left / right, etc.
- Native styles for variable fonts are selected by name from the UI, explicit thickness adjustments are passed as offsets, and underlining uses font metadata coordinates instead of arbitrary offsets.

### SCAD Parameters (`user_*`)

- Passed explicitly from JS bridge to wrapper SCAD
- Separates strings and numbers cleanly; arrays are joined into strings
- Uses mm units as numeric values, not string units
- When UI definitions don't map directly to geometry boundaries, bridge decomposes them into `user_*`
- `quality` is determined by the bridge (currently `preview` / `export`)

### Separated Modules (`scad/modules/`)

- Reusable modules for keycap outer shapes, stems, and legends
- Depends only on parameters passed in arguments, not globals
- Shell applies inner hollow and dish tracking for keycap shape
- Shell adds flush seat processing when typewriter rim is requested
- Stem has independent clearance and interference parameters depending on mount difference
- Backside cutout for J-STEM-LP01 socket is provided as a separate module from stem
- Legend applies contour offset for thickness adjustment according to explicit arguments. Text placement relies on font specifications, and native styles (bold, italic, etc.) are chosen from font assets
- Homing bar is provided as an option on the body side

### Samples (`scad/samples/`)

- Includes regression check targets for each module, isolated from `keycap.scad` top parameters
- `scad/samples/keycap-1u.scad`
  For regression checks of 1u keycaps with common parameters
- `scad/samples/keycap-jis-enter.scad`
  For regression checks of vertically long JIS / ISO Enter footprints and custom shell top surface degrees of freedom
- `scad/samples/keycap-typewriter-jis-enter.scad`
  For regression checks of typewriter style JIS Enter footprint, rim, and mount position
- `scad/samples/keycap-typewriter-rim.scad`
  For checking key rim separation of typewriter shape
- `scad/samples/keycap-typewriter-rim-tilted.scad`
  For checking joint of typewriter key rim with pitch / roll
- `scad/samples/keycap-typewriter-mount-height.scad`
  For checking mounting height based on typewriter shape top surface
- `scad/samples/keycap-typewriter-spherical-top.scad`
  For regression checks that spherical top does not break in typewriter shape
- `scad/samples/keycap-legend-seat.scad`
  For checking flush legend seat cutout
- `scad/samples/keycap-curved-legend-seat.scad`
  For regression checks that body does not cover legend surface even on spherical top
- `scad/samples/keycap-multi-character-legend.scad`
  For regression checks that it does not auto-shrink even with multiple characters, keeping explicit size
- `scad/samples/keycap-top-legends.scad`
  For checking center / top right / bottom right / top left / bottom left legend placement on the keycap top
- `scad/samples/keycap-rounded-legend.scad`
  For regression checks of legend contour quality with rounded fonts
- `scad/samples/keycap-sidewall-legend.scad`
  For checking front / back / left / right sidewall legend placement
- `scad/samples/keycap-homing-bar.scad`
  For checking homing bar individually
- `scad/samples/keycap-stem-clip.scad`
  For regression checks that stem top end stops along inner ceiling with strong left/right tilt
- `scad/samples/keycap-j-stem-lp01.scad`
  For checking backside carving of J-STEM-LP01 socket
- `scad/samples/keycap-surface-quality.scad`
  For regression checks evaluating surface quality of rounded corners, dish, and stem outer circumference together
- `scad/samples/keycap-convex-surfaces.scad`
  For regression checks evaluating negative `dishDepth` for cylindrical/spherical shapes on 1u, wide keys, top edge radii, and JIS Enter
- `scad/samples/keycap-top-corner-radii.scad`
  For regression checks of individual specifications for 4 corner radii on custom shell top surface
- `scad/samples/keycap-top-orientation.scad`
  For regression checks of fixed top center height + pitch / roll
- `scad/samples/keycap-top-offset.scad`
  For checking XY offset of keycap center while keeping stem origin fixed
- `scad/samples/keycap-top-edge-rounded.scad`
  For checking custom shell keycap top edge radii
- `scad/samples/keycap-shoulder-rounded.scad`
  For checking body shoulder radius of custom shell
- `scad/samples/keycap-shoulder-rounded-hollow.scad`
  For checking tracking of rounded shoulder and inner hollow in custom shell
- `scad/samples/keycap-shoulder-concave.scad`
  For checking negative body shoulder radius of custom shell
- `scad/samples/keycap-top-hat.scad`
  For checking top-hat keycap of custom shell
- `scad/samples/keycap-top-hat-separated.scad`
  For checking separate part target of top-hat in custom shell
- `scad/samples/keycap-top-hat-spherical.scad`
  For checking spherical top-hat top surface of custom shell
- `scad/samples/keycap-top-hat-top-radii.scad`
  For regression checks of individual specifications of top-hat top surface 4 corner radii in custom shell
- `scad/samples/keycap-top-hat-recess.scad`
  For checking negative height top-hat recess of custom shell
- `scad/samples/stem-mounts.scad`
  For checking stem mount differences

Samples are currently used for geometry regression.

## Current Export Contract

### 3MF

- Source is OFF mesh
- Object resources are separated for each part within 3MF
- In `build`, instead of placing parts sequentially, parts related to body / top-hat / rim / homing / legend are bundled as a parent object using `components`, and only one parent object is placed
- Parent object `name` uses `Name` from UI
- Current candidate parts are `body`, `top-hat`, `rim`, `homing`, `legend`, `legend-left-top`, `legend-right-top`, `legend-left-bottom`, `legend-right-bottom`, `legend-front`, `legend-back`, `legend-left`, `legend-right`
- If top-hat separation color is disabled or top-hat is recessed, `top-hat` object is not included
- If top legend is disabled, the corresponding `legend*` objects are not included
- If sidewall legend is disabled, the corresponding `legend-*` objects are not included
- Both text legends and icon legends are treated as `legend*` objects, maintaining part separation and color specification in 3MF
- If typewriter key rim is disabled, rim object is not included
- If homing bar is disabled, homing object is not included
- Parent object does not have material/color; child part objects retain their material/color
- Adds `Metadata/model_settings.config` for Bambu Studio/OrcaSlicer, and `Metadata/Slic3r_PE_model.config` for PrusaSlicer/Slic3r PE, retaining part display names as `body` / `rim` / `homing` / `legend` / `legend-*`
- Maintains child object `name` and `partnumber` for importers heavily reliant on standard 3MF (like Cura)

### STEP

- Source is OFF mesh of `single_material_shape` target
- Since bundled OpenSCAD runtime doesn't support native STEP export, browser generates it as `FACETED_BREP_SHAPE_REPRESENTATION` of STEP AP214
- Body shell, top-hat, stem, homing bar, and typewriter rim are treated as a single shape
- Legends are not included in the output
- Color, material, part name, and separate volume information are not included
- Curved surfaces represent faceted mesh generated by OpenSCAD as `POLY_LOOP` / `FACE_SURFACE`. Though for CAD exchange, it's not a parametric NURBS / analytic surface
- Use 3MF if color separation or legend is needed
- As with other exports, download file name is based on `params.name`

### STL

- Source is `single_material_shape` target
- Exported directly as binary STL from OpenSCAD runtime
- Body shell, top-hat, stem, homing bar, and typewriter rim are combined (union) into a single mesh
- Legends are not included in the output
- Color, material, part name, and separate volume information are not included
- Use 3MF if color separation or legend is needed
- As with JSON / 3MF / STEP, download file name is based on `params.name`

### Edit Data JSON

- For saving and reloading UI state
- Canonical JSON for saving has `schemaVersion`
- Includes save name in `params.name`
- Treated as a format for resuming work, not geometry export
- JSON / 3MF / STEP / STL download file names are based on `params.name`
- When saving, it holds full configuration resolving shape defaults, without dropping values for disabled UI inputs
- When loading, accepts sparse compatible input JSON in addition to canonical JSON
- Compatible input JSON can have known parameters under `params` or top-level. Missing keys fall back to shape defaults
- If `shapeProfile` is explicit, binds relative to its defaults; if unspecified, uses default profile
- Ignores unknown keys and sanitizes only known keys to reflect in state

Minimal example of compatible input JSON:

```json
{
  "shapeProfile": "typewriter",
  "legendText": "ESC",
  "rimEnabled": false
}
```

In the example above, unspecified values like `rimWidth` or `legendColor` are populated with typewriter shape JSON defaults before restoring the final editor state.

## Current Known Constraints

- Legends are fixed models of center / top right / bottom right / top left / bottom left on the keytop and sidewall front / back / left / right
- Top legend exposure assumes top dish
- Sidewall legends align with the inclination of the center reference plane of each side, and embed automatically up to the inner surface of the wall. They do not automatically track rounded corners or notched surfaces of JIS Enter
- Font assets allow a mix of variable / static, but the availability of native styles varies per font
- User-added TTF / OTF are treated as local browser fonts, and the font files are not bundled in JSON / project ZIP
- Additional quality levels like `high_preview` are not yet adopted. Re-evaluate from `docs/backlog/high-preview-quality-mode.md` if needed

These extension TODOs are documented in `docs/backlog/legend-extensibility-todo.md`.

## Update Rules

- Update this document when SCAD responsibility boundaries change
- Update this document and the manual verification procedure when the export part contract changes
- Leave adoption decisions in `docs/decisions/decision-log.md`
