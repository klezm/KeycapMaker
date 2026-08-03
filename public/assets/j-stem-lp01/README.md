# J-STEM-LP01 assets

This directory places the official CAD reference assets of J-STEM-LP01.

- `j-stem-lp01.step`: Official STEP. Copied from `/Users/workSpace/OpenGraphite/.temp/j-stem.step` on 2026-06-14.
- `j-stem-lp01-reference.off`: Derived mesh used in the app's reference preview. Generated from the official STEP with `Shape.tessellate(0.05)` in FreeCAD 1.0.0.

`j-stem-lp01-reference.off` has the following transformations applied to match the existing J-STEM local coordinates in SCAD.

- `x = STEP_X - 0.3880597014925047`
- `y = STEP_Z + 0.6130028267860688`
- `z = 1.1075741889622546 - STEP_Y`

This makes the OFF's bounding box approximately `x/y = -6.1..6.1`, `z = -3.776..0.8`. The plate is at `z=0..0.8`, and the MX socket post is placed on the `z<0` side. On the app side, it is placed by applying `topPitchDeg` / `topRollDeg` / `topOffsetX` / `topOffsetY` / stem socket height during preview.
