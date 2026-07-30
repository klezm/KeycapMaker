# scad Directory Guide

`scad/` contains SCAD assets related to keycap shapes. Here, we maintain a separation of responsibilities for preview and production output, as well as a structure where the body and legend can be treated as separate volumes. The stems (MX / Choc v1 / Choc v2 / Alps mount differences) and the subtracted shape for the J-STEM-LP01 socket are separated into `modules/`.

## Subdirectory Roles

- `base/`: Contains the basic shape of the entire keycap and export entries.
- `modules/`: Contains reusable modules such as stem, legend, and shape differences.
- `presets/`: Contains stem nominal constants and parameter sets for samples.
- `samples/`: Contains samples used for shape regression checks.

## Current Main Files

- `base/keycap.scad`: Basic entry to switch between `preview / body / body_core / top_hat / rim / homing / legend / top_legend_* / side_legend_* / single_material_shape / j_stem_lp01_reference` with `export_target`.
- `modules/keycap_shell.scad`: Outer shell based on `top_center_height + pitch / roll`, dish, and inner hollow.
- `modules/keycap_jis_enter.scad`: Shell for vertically long JIS / ISO Enter footprint, typewriter variant, and inner hollow.
- `modules/stem_mx.scad`: MX compatible stem body.
- `modules/stem_choc_v1.scad`: 2-prong stem for Kailh Choc v1.
- `modules/stem_choc_v2.scad`: MX compatible stem for Kailh Choc v2.
- `modules/stem_alps.scad`: Stem for Alps / Matias.
- `modules/stem_j_stem_lp01.scad`: Backside carved shape to receive J-STEM-LP01 top surface, and old SCAD reference model. The app's reference preview uses the official STEP-derived OFF in `public/assets/j-stem-lp01/`, making only clear translucent by color selection, and white/orange opaque.
- `modules/homing_bar.scad`: Optional homing bar shape added to the body side.
- `modules/legend_block.scad`: Font-independent legend volume.
- `modules/keycap_typewriter.scad`: Thin typewriter-style keycap outer shape.
- `presets/stem-nominals.scad`: Nominal dimensions for stem shapes.
- `samples/keycap-1u.scad`: Minimum keycap sample for regression checks.
- `samples/keycap-jis-enter.scad`: Sample for vertically long JIS / ISO Enter footprint check.
- `samples/keycap-jis-enter-top-hat.scad`: Sample for top-hat check along JIS Enter footprint.
- `samples/keycap-typewriter-jis-enter.scad`: Sample for typewriter style JIS Enter footprint check.
- `samples/keycap-typewriter.scad`: Sample for typewriter-style keycap check.
- `samples/keycap-typewriter-mount-height.scad`: Sample for checking mounting height based on typewriter shape top surface.
- `samples/keycap-typewriter-rim.scad`: Sample for checking key rim separation of typewriter shape.
- `samples/keycap-typewriter-rim-tilted.scad`: Sample for checking joint of typewriter key rim with pitch / roll.
- `samples/keycap-legend-seat.scad`: Sample for checking flush legend seat cutout.
- `samples/keycap-multi-character-legend.scad`: Sample to check if explicit size is maintained even with multiple characters.
- `samples/keycap-top-legends.scad`: Sample for checking center / top-right / bottom-right / top-left / bottom-left legend placement on the keycap top.
- `samples/keycap-rounded-legend.scad`: Sample for checking legend quality of rounded fonts.
- `samples/keycap-homing-bar.scad`: Sample for checking homing bar standalone output.
- `samples/keycap-stem-clip.scad`: Sample to check if the stem stops at the inner ceiling even with strong left/right tilt.
- `samples/keycap-j-stem-lp01.scad`: Sample for checking the backside carving of the J-STEM-LP01 socket.
- `samples/keycap-surface-quality.scad`: Sample for checking curved surface quality of rounded corners, dish, and stem outer circumference.
- `samples/keycap-convex-surfaces.scad`: Sample for checking convex surfaces of cylindrical / spherical `dishDepth = -1.5mm`, wide keys, top edge R, and JIS Enter.
- `samples/keycap-top-corner-radii.scad`: Sample for checking individual specification of 4 corner R on custom shell top surface.
- `samples/keycap-top-orientation.scad`: Sample for checking fixed top center height + pitch / roll.
- `samples/keycap-top-offset.scad`: Sample for checking XY offset of keycap center with fixed stem origin.
- `samples/keycap-top-edge-rounded.scad`: Sample for checking top edge R of custom shell.
- `samples/keycap-shoulder-rounded.scad`: Sample for checking body shoulder R of custom shell.
- `samples/keycap-shoulder-rounded-hollow.scad`: Sample for checking rounded shoulder and inner hollow tracking of custom shell.
- `samples/keycap-shoulder-concave.scad`: Sample for checking negative body shoulder R of custom shell.
- `samples/keycap-top-hat.scad`: Sample for checking top-hat keycap and bottom R of custom shell.
- `samples/keycap-top-hat-separated.scad`: Sample for checking top-hat separate part target of custom shell.
- `samples/keycap-top-hat-spherical.scad`: Sample for checking spherical top-hat top surface of custom shell.
- `samples/keycap-top-hat-top-radii.scad`: Sample for checking individual specification of top-hat top surface 4 corner R of custom shell.
- `samples/keycap-top-hat-recess.scad`: Sample for checking negative height top-hat recess of custom shell.
- `samples/keycap-top-hat-rounded-shoulder.scad`: Sample for checking top-hat shoulder R of custom shell.
- `samples/keycap-top-hat-concave-shoulder.scad`: Sample for checking negative top-hat shoulder R of custom shell.
- `samples/stem-mounts.scad`: Sample for regression checking of mount differences.

## Operation Policy

- Weight and precision may be separated for preview and export.
- Do not rely solely on color specifications; maintain the separability of body and legend.
- Treat the key rim of the typewriter shape as a separate volume from the body, and maintain it as an independent part on the 3MF side as well.
- The top-hat is usually treated as integrated with the body, adding the `top_hat` target and 3MF part only when separate colors are enabled. For `single_material_shape` for STEP / STL, it is integrated regardless of the presence or absence of separate colors.
- Treat the homing bar as a tactile marker on the body side, and separate its responsibility from the legend.
- When passing UI parameters to the in-browser OpenSCAD runtime, inject the explicit values resolved from the shape JSON into `user_*` of the wrapper SCAD.
- When using `text()`, clarify font dependencies and check asset placement and licenses.
