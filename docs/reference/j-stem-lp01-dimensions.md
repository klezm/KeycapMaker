# J-STEM-LP01 Dimension Correspondence Table

The lengths appearing as numerical labels in `.tmp/J-STEM-LP01.jpeg` correspond one-to-one to the following constants on the SCAD side.

| Drawing Label | Meaning on Drawing | Dimension Constant in Model | Alias for Use |
| --- | --- | --- | --- |
| `12.20` | Total height of plate in top view | `stem_j_stem_lp01_drawing_top_view_height` | `stem_j_stem_lp01_nominal_plate_depth` |
| `8.11` | X-direction distance from top-left hole center to bottom-right hole center | `stem_j_stem_lp01_drawing_hole_pitch_x` | `stem_j_stem_lp01_nominal_hole_pitch_x` |
| `8.11` | Y-direction distance from top-left hole center to bottom-right hole center | `stem_j_stem_lp01_drawing_hole_pitch_y` | `stem_j_stem_lp01_nominal_hole_pitch_y` |
| `1.20` | Horizontal slot width of MX cross hole | `stem_j_stem_lp01_drawing_cross_width_horizontal` | `stem_j_stem_lp01_nominal_cross_width_horizontal` |
| `1.20` | Vertical slot width of MX cross hole | `stem_j_stem_lp01_drawing_cross_width_vertical` | `stem_j_stem_lp01_nominal_cross_width_vertical` |
| `0.80` | Plate thickness | `stem_j_stem_lp01_drawing_plate_thickness` | `stem_j_stem_lp01_nominal_plate_thickness` |
| `φ5.40` | Center cylindrical post diameter | `stem_j_stem_lp01_drawing_post_diameter` | `stem_j_stem_lp01_nominal_post_diameter` |
| `3.78` | Center cylindrical post height | `stem_j_stem_lp01_drawing_post_height` | `stem_j_stem_lp01_nominal_post_height` |

The official STEP is placed at `public/assets/j-stem-lp01/j-stem-lp01.step`, and the app preview uses `j-stem-lp01-reference.off` in the same directory as an alignment reference with color selection. Clear is displayed as translucent, while white and orange are opaque. The OFF is a derived mesh converted to the existing J-STEM local coordinates by tessellating the official STEP with FreeCAD 1.0.0.

The top surface outer shape of the socket boolean is held in `scad/modules/stem_j_stem_lp01.scad` as a sequence of outer perimeter points extracted from the official STEP. Since there are no numerical labels for the screw hole diameter in the original drawing, these are trace values to match the exported shape of the socket recess. The nominal clearance of the socket is kept at `stem_j_stem_lp01_nominal_recess_clearance = 0` to maintain correspondence with the official STEP outer shape. When switching to J-STEM-LP01 in the app, start `stemCrossMargin` in the UI at 0.1mm based on actual physical checks. If the actual fit is tight, adjust the carved outer shape of the LP01 socket in increments of 0.02mm in the positive direction; if loose, adjust in the negative direction.

`j_stem_lp01_model()` in `scad/modules/stem_j_stem_lp01.scad` is left as an old SCAD reference model, but the normal app preview uses the official STEP-derived OFF.
