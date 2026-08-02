# legend extensibility TODO

## Purpose

Before adding future side legends, multiple legends on the keytop, or per-legend color/font overrides, sort out ahead of time where the current SCAD / UI / export structure tends to get stuck, and leave a plan for tackling it in stages.

## Current assessment

- body and legend are treated as separate volumes, so they are loosely coupled in that sense
- generation of the character shapes is split out into `scad/modules/legend_block.scad`
- the exposed surface of the keytop legend uses surface fitting in `scad/base/keycap.scad` on the assumption of a top dish
- the UI and bridge have `user_legend_*` for the keytop center, `user_top_legend_*` for the four keytop corners, and `user_side_legend_*` for the fixed four side faces
- the 3MF generator can already handle a variable number of meshes, so the bottleneck is mainly in the UI / bridge / SCAD placement-surface layers

## Conclusions

- Single top legend:
  can be kept as-is with the current structure
- Multiple top legends:
  the fixed slots (center / top-right / bottom-right / top-left / bottom-left) are already supported. An arbitrary-count `legendItems[]` format is not yet supported
- Side legend:
  the fixed four faces (front / back / left / right) are already supported. It follows the tilt of each side's center reference plane and automatically embeds into the inner wall surface. Arbitrary faces, multiple side legends, and strict following of rounded corners or notches are not yet supported

## Main sticking points

### 1. No abstraction for surface types

- `keycap_legend()` directly uses the exposed band of the top dish
- there is no extension point for front / back / left / right

### 2. Data model assumes fixed legends

- the UI in `src/main.js` has fixed fields for the keytop's 5 slots and the sidewall's 4 faces
- it has not yet migrated to an arbitrary-count `legendItems[]`

### 3. Layer management uses fixed names

- preview / export assume fixed jobs named `body` / `homing` / `legend`
- once legends become plural, part management needs to be generalized

### 4. Font loading assumes a single typeface

- the runtime asset only loads the one currently selected typeface
- if fonts are to vary per legend, collecting the set of fonts in use will be necessary

## Recommended approach

### Phase 1. Separate the responsibility for placement surfaces

- separate the exposed band of the top dish from the common legend logic
- make `keycap_dish_band()` extractable as the top placement-surface implementation

### Phase 2. Migrate to `legendItems[]`

- move the singular `legend*` fields toward a multi-item model
- allow migration from the existing singular format when loading JSON

### Phase 3. Generalize part / layer management

- feed a future variable number of parts into preview / export instead of fixed layer names
- handle overlay detection via attributes rather than a fixed `name`

### Phase 4. Introduce side legends

- add placement-surface modules for `front` / `back` / `left` / `right`
- specify the tolerance for rounded corners and tilt

### Phase 5. Add samples and verification

- add more samples if migrating to an arbitrary number of top legends. A sample for the fixed 5 slots is already covered by `scad/samples/keycap-top-legends.scad`
- add samples for side legends
- add verification checkpoints for preview / export / Bambu Studio

## First step

If starting anywhere, prioritize Phase 1's "separate the responsibility for placement surfaces." It doesn't break the current UI and benefits both multiple legends and side legends.
