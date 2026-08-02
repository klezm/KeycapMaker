# scad directory guide

`scad/` holds the SCAD assets related to keycap shapes. Here we maintain the separation of responsibilities between preview and production output, and the structure that allows body / legend to be handled as separate volumes. Stems separate the mount differences for `MX / Choc v1 / Choc v2 / Alps` and the subtractive shape for the J-STEM-LP01 receptacle into `modules/`.

## Roles of the subdirectories

- `base/`: holds the overall keycap base shape and export entry points
- `modules/`: holds reusable modules for stems, legends, shape variants, etc.
- `presets/`: holds stem nominal constants and sample parameter sets
- `samples/`: holds samples used for shape regression checks

## Current key files

- `base/keycap.scad`: the base entry point that switches `preview / body / body_core / top_hat / rim / homing / legend / top_legend_* / side_legend_* / single_material_shape / j_stem_lp01_reference` via `export_target`
- `modules/keycap_shell.scad`: the outer shell based on `top_center_height + pitch / roll`, the dish, and the inner hollow
- `modules/keycap_jis_enter.scad`: the shell for the tall JIS/ISO-style Enter footprint, the typewriter variant, and the inner hollow
- `modules/stem_mx.scad`: the MX-compatible stem body
- `modules/stem_choc_v1.scad`: the two-prong stem for Kailh Choc v1
- `modules/stem_choc_v2.scad`: the MX-compatible stem for Kailh Choc v2
- `modules/stem_alps.scad`: the stem for Alps / Matias
- `modules/stem_j_stem_lp01.scad`: the underside recess shape that receives the J-STEM-LP01 top face, plus a legacy SCAD reference model. The app's reference preview uses an OFF derived from the official STEP in `public/assets/j-stem-lp01/`, with the clear color option shown semi-transparent and white/orange shown opaque
- `modules/homing_bar.scad`: the optional homing bar shape added to the body side
- `modules/legend_block.scad`: the font-independent legend volume
- `modules/keycap_typewriter.scad`: the thin typewriter-style keytop outline
- `presets/stem-nominals.scad`: the nominal dimensions for stem shapes
- `samples/keycap-1u.scad`: a minimal keycap sample for regression checks
- `samples/keycap-jis-enter.scad`: a sample for checking the tall JIS/ISO-style Enter footprint
- `samples/keycap-jis-enter-top-hat.scad`: a sample for checking the top-hat that follows the JIS Enter footprint
- `samples/keycap-typewriter-jis-enter.scad`: a sample for checking a typewriter-style JIS Enter footprint
- `samples/keycap-typewriter.scad`: a sample for checking the typewriter-style keytop
- `samples/keycap-typewriter-mount-height.scad`: a sample for checking mount height referenced from the top face for the typewriter shape
- `samples/keycap-typewriter-rim.scad`: a sample for checking the key rim separated from the body for the typewriter shape
- `samples/keycap-typewriter-rim-tilted.scad`: a sample for checking the joint of the typewriter key rim with pitch / roll applied
- `samples/keycap-legend-seat.scad`: a sample for checking the cutout for the flush legend seat
- `samples/keycap-multi-character-legend.scad`: a sample for checking whether an explicit size is kept even with multiple characters
- `samples/keycap-top-legends.scad`: a sample for checking legend placement at the center / top-right / bottom-right / top-left / bottom-left on the keytop
- `samples/keycap-rounded-legend.scad`: a sample for checking legend quality with a rounded typeface
- `samples/keycap-homing-bar.scad`: a sample for checking standalone homing bar output
- `samples/keycap-stem-clip.scad`: a sample for checking whether the stem stops at the inner ceiling even under strong left/right tilt
- `samples/keycap-j-stem-lp01.scad`: a sample for checking the underside recess for the J-STEM-LP01 receptacle
- `samples/keycap-surface-quality.scad`: a sample that checks the curved-surface quality of rounded corners, the dish, and the stem perimeter together
- `samples/keycap-convex-surfaces.scad`: a sample for checking convex surfaces with cylindrical / spherical `dishDepth = -1.5mm`, a wide key, a rounded top edge, and JIS Enter
- `samples/keycap-top-corner-radii.scad`: a sample for checking individually specified corner radii on all four corners of the custom shell's top face
- `samples/keycap-top-orientation.scad`: a sample for checking a fixed top-center height plus pitch / roll
- `samples/keycap-top-offset.scad`: a sample for checking the keytop-center XY offset with the stem origin fixed
- `samples/keycap-top-edge-rounded.scad`: a sample for checking the rounded top edge of the custom shell's keytop
- `samples/keycap-shoulder-rounded.scad`: a sample for checking the body shoulder radius of the custom shell
- `samples/keycap-shoulder-rounded-hollow.scad`: a sample for checking that the inner hollow follows a rounded shoulder of the custom shell
- `samples/keycap-shoulder-concave.scad`: a sample for checking a negative body shoulder radius on the custom shell
- `samples/keycap-top-hat.scad`: a sample for checking the top-hat keytop and bottom radius of the custom shell
- `samples/keycap-top-hat-separated.scad`: a sample for checking the top-hat as a separate part target on the custom shell
- `samples/keycap-top-hat-spherical.scad`: a sample for checking the spherical top-hat top face of the custom shell
- `samples/keycap-top-hat-top-radii.scad`: a sample for checking individually specified corner radii on all four corners of the top-hat top face of the custom shell
- `samples/keycap-top-hat-recess.scad`: a sample for checking a negative-height top-hat recess on the custom shell
- `samples/keycap-top-hat-rounded-shoulder.scad`: a sample for checking the top-hat shoulder radius of the custom shell
- `samples/keycap-top-hat-concave-shoulder.scad`: a sample for checking a negative top-hat shoulder radius on the custom shell
- `samples/stem-mounts.scad`: a sample for regression checks of mount differences

## Operating policy

- Preview and export may differ in weight and precision
- Do not rely solely on color assignment; keep body and legend separable
- Treat the typewriter shape's key rim as a separate volume from the body, keeping it an independent part on the 3MF side as well
- Normally treat the top-hat as unified with the body, only adding a `top_hat` target and 3MF part when separate coloring is in effect. For `single_material_shape` used for STEP / STL, always unify it regardless of separate coloring
- Treat the homing bar as a tactile marker on the body side, kept as a separate responsibility from the legend
- When passing UI parameters to the in-browser OpenSCAD runtime, inject explicit values resolved from the shape JSON into the wrapper SCAD's `user_*`
- When using `text()`, make the font dependency explicit and confirm asset placement and licensing
