# J-STEM-LP01 assets

This directory holds the official CAD reference assets for J-STEM-LP01.

- `j-stem-lp01.step`: the official STEP file. Copied from `/Users/workSpace/OpenGraphite/.temp/j-stem.step` on 2026-06-14.
- `j-stem-lp01-reference.off`: the derived mesh used in the app's reference preview. Generated from the official STEP file using FreeCAD 1.0.0's `Shape.tessellate(0.05)`.

`j-stem-lp01-reference.off` has already had the following transform applied to align with the existing SCAD's J-STEM local coordinates.

- `x = STEP_X - 0.3880597014925047`
- `y = STEP_Z + 0.6130028267860688`
- `z = 1.1075741889622546 - STEP_Y`

As a result, the OFF's bounding box is approximately `x/y = -6.1..6.1`, `z = -3.776..0.8`. The plate sits at `z=0..0.8`, and the MX socket post sits on the `z<0` side. On the app side, `topPitchDeg` / `topRollDeg` / `topOffsetX` / `topOffsetY` and the stem receptacle height are applied during preview placement.
