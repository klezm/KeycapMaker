# Legend Extension TODO

## Purpose

To outline the strategy for adding side legends, multiple legends on the keycap top, and per-legend color or typeface overrides in the future, by identifying potential bottlenecks in the current SCAD / UI / export structure and proceeding in stages.

## Current Assessment

- Body and legend are treated as separate volumes, loosely coupled in that regard.
- Text shape generation is separated in `scad/modules/legend_block.scad`.
- The exposed surface of the top legend uses surface fitting assuming a top dish in `scad/base/keycap.scad`.
- The UI and bridge have `user_legend_*` for the center of the keytop, `user_top_legend_*` for the four corners, and `user_side_legend_*` for the fixed 4 sides.
- Since the 3MF generator can handle a variable number of meshes, the bottlenecks are mainly in the UI / bridge / SCAD placement surface layers.

## Conclusion

- Single top legend:
  Can be maintained with the current structure.
- Multiple top legends:
  Fixed slots for center / top right / bottom right / top left / bottom left are already supported. Arbitrary `legendItems[]` format is not yet supported.
- Side legend:
  Fixed 4 sides (front / back / left / right) are already supported. They track the inclination of the center reference plane of each side and automatically embed up to the inner surface of the wall. Arbitrary sides, multiple side legends, and strict tracking of rounded corners or notches are not supported.

## Main Bottlenecks

### 1. Lack of Surface Type Abstraction

- `keycap_legend()` directly uses the exposure band of the top dish.
- No extension points for front / back / left / right.

### 2. Data Model Assumes Fixed Legends

- The UI in `src/main.js` has fixed items for 5 keytop slots and 4 sidewall sides.
- Has not yet migrated to an arbitrary `legendItems[]` array.

### 3. Layer Management uses Fixed Names

- Preview / export assume fixed jobs: `body` / `homing` / `legend`.
- Generalization of part management is required when there are multiple legends.

### 4. Font Loading Assumes a Single Typeface

- Runtime assets are loaded only for the currently selected typeface.
- If the typeface can change per legend, a mechanism to collect the set of used fonts is necessary.

## Recommended Strategy

### Phase 1. Separation of Responsibilities for Placement Surfaces

- Separate the top dish exposure band from common legend logic.
- Make it possible to extract `keycap_dish_band()` as a top placement surface implementation.

### Phase 2. Migration to `legendItems[]`

- Move singular `legend*` items to a multiple-item model.
- Allow migration from existing singular formats when loading JSON.

### Phase 3. Generalization of part / layer management

- Flow a variable number of future parts to preview / export instead of fixed layer names.
- Handle overlay detection by attributes, not fixed `name`s.

### Phase 4. Introduction of side legend

- Add placement surface modules for `front` / `back` / `left` / `right`.
- Specify tolerances for rounded corners and slopes.

### Phase 5. Addition of Samples and Verification

- If migrating to an arbitrary number of top legends, add more samples. Samples for the fixed 5 slots are already covered in `scad/samples/keycap-top-legends.scad`.
- Add samples for side legends.
- Add verification points for preview / export / Bambu Studio.

## First Move

If starting, prioritize Phase 1: "Separation of Responsibilities for Placement Surfaces". It won't break the current UI and benefits both multiple legends and side legends.
