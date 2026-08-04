# J-STEM-LP01 dimension mapping

The lengths that appear as numeric labels in `.tmp/J-STEM-LP01.jpeg` map one-to-one to the following constants on the SCAD side.

| Drawing label | Meaning on the drawing | Model dimension constant | Alias used at |
| --- | --- | --- | --- |
| `12.20` | Overall plate length in the top view | `stem_j_stem_lp01_drawing_top_view_height` | `stem_j_stem_lp01_nominal_plate_depth` |
| `8.11` | X-direction distance from the top-left hole center to the bottom-right hole center | `stem_j_stem_lp01_drawing_hole_pitch_x` | `stem_j_stem_lp01_nominal_hole_pitch_x` |
| `8.11` | Y-direction distance from the top-left hole center to the bottom-right hole center | `stem_j_stem_lp01_drawing_hole_pitch_y` | `stem_j_stem_lp01_nominal_hole_pitch_y` |
| `1.20` | Width of the horizontal slot of the MX cross hole | `stem_j_stem_lp01_drawing_cross_width_horizontal` | `stem_j_stem_lp01_nominal_cross_width_horizontal` |
| `1.20` | Width of the vertical slot of the MX cross hole | `stem_j_stem_lp01_drawing_cross_width_vertical` | `stem_j_stem_lp01_nominal_cross_width_vertical` |
| `0.80` | Plate thickness | `stem_j_stem_lp01_drawing_plate_thickness` | `stem_j_stem_lp01_nominal_plate_thickness` |
| `φ5.40` | Center cylindrical post diameter | `stem_j_stem_lp01_drawing_post_diameter` | `stem_j_stem_lp01_nominal_post_diameter` |
| `3.78` | Center cylindrical post height | `stem_j_stem_lp01_drawing_post_height` | `stem_j_stem_lp01_nominal_post_height` |

The official STEP is located at `public/assets/j-stem-lp01/j-stem-lp01.step`, and the app preview uses `j-stem-lp01-reference.off` in the same directory as a color-selectable alignment reference. Clear is shown semi-transparent, and white and orange are shown opaque. The OFF is a derived mesh obtained by tessellating the official STEP with FreeCAD 1.0.0 and converting it into the existing J-STEM local coordinate system.

The top-face outline of the receiving-recess boolean is kept in `scad/modules/stem_j_stem_lp01.scad` as a perimeter point list extracted from the official STEP. Since the screw hole diameter has no numeric label on the original drawing, it is a traced value used to match the output shape of the receiving recess. The receiving recess's nominal clearance is kept at `stem_j_stem_lp01_nominal_recess_clearance = 0` to preserve correspondence with the official STEP outline. When switching to J-STEM-LP01 in the app, the UI's `stemCrossMargin` starts at 0.1mm based on physical fit-test results. If the physical fit is too tight, adjust in the positive direction; if too loose, adjust in the negative direction, in 0.02mm increments to the LP01 receiving recess's cut outline.

`j_stem_lp01_model()` in `scad/modules/stem_j_stem_lp01.scad` remains as the legacy SCAD reference model, but the normal app preview uses the OFF derived from the official STEP.
</content>
</invoke>
