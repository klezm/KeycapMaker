# Manual Verification Procedure

Since this is a client-side app integrating Three.js, OpenSCAD WASM runtime, and a complex UI, run through these manual tests to verify the core flows when making significant changes.

## Verification Scenarios

### 1. Basic Flow

- Change the `Shape Profile` and verify that the preview shape matches the profile name
- Edit numeric parameters and ensure the preview shape reflects the changes without errors
- Change `Homing Bar` to `bar` or `bump` and confirm it appears in the preview
- Export a 3MF, STEP, and STL file and verify they download correctly
- Reload the page, import the exported 3MF (if supported by a slicer) and verify it looks correct
- Drag & Drop an exported JSON to restore the editing state

### 2. Detailed Verification

- **Preview Quality**
  - Verify that curves and corners look smooth (based on `quality` settings)
  - Verify that no visual artifacts or intersecting meshes appear that shouldn't
- **Text & Legends**
  - Change the legend text and check if it reflects correctly on the keycap
  - Switch fonts and ensure the font changes in the preview
  - Check the `Legend Size` parameter behavior
  - Test legends on different sides (if implemented)
  - Try Japanese text (e.g. `あ`) with the appropriate font
- **Typewriter Profile**
  - Select the `typewriter` profile
  - Toggle the key rim on/off
  - Adjust top/bottom height of the rim
- **Custom Shell**
  - Check `Flat`, `Cylindrical`, `Spherical` top surface shapes
  - Try negative `Depth` values for convex shapes
- **Export Consistency**
  - Export a 3MF file with legends and homing bars
  - Verify in a slicer that parts are separated (body, legends, homing, rim) and named correctly

### 3. Editor Data JSON

- Modify the `Name` field in the UI
- Save the `Edit Data JSON` from the export overlay
- Verify the downloaded file is named `<Name>.json`
- Drag & Drop the JSON back into the app and confirm the state is restored perfectly

### 4. Projects

- Open the `Project` segment
- Rename the project
- Add a copy of the current keycap
- Check if multiple keycaps appear in the list with previews
- Change parameters and check if the active keycap's preview in the list updates
- Save the project (downloads as ZIP)
- Drag & Drop the ZIP back in and confirm the full project structure (multiple keycaps, active state) restores correctly

## Tools to use for verification

- **Bambu Studio / PrusaSlicer**: Used to verify 3MF structure, part separation, names, and general printability of the generated models.

## When to Execute

- After modifying `scad/base/` or `scad/modules/`
- After changing `src/main.js` (UI or export flows)
- After changing SCAD bridging logic (`src/lib/keycap-scad-bundle.js`)
- After updating the OpenSCAD runtime or font assets
