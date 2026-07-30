# High-Quality Preview Mode Idea

## Background

The current preview improves appearance through smooth normal processing on the Three.js side and adjusting the number of divisions based on the feature radius on the SCAD side. On the other hand, if we constantly push the density closer to that of the export, the response speed of the in-browser OpenSCAD runtime tends to drop.

Therefore, an idea to add an optionally selectable high-quality preview stage between the normal `preview` and `export` remains as an unadopted consideration.

## Outline of the Idea

- Keep the current `preview` prioritized for lightness.
- Add `high_preview` and increase only the number of SCAD curve divisions compared to `preview`.
- Share the drawing path on the Three.js side, mainly increasing the quality stages on the OpenSCAD generation side.
- In the UI, prioritize a form that can be toggled only when necessary, rather than being permanent.

## Expected Benefits

- Can increase density only when checking the final finish, without breaking responsiveness during normal operation.
- Easy to check the look close to the final result of curved surfaces and small arcs without running `export` every time.
- Quality stage responsibilities can be easily organized into `preview / high_preview / export`.

## Main Concerns

- The number of quality branches on the SCAD side increases, slightly complicating the responsibilities of each module.
- If a quality toggle is exposed in the UI, the number of settings increases.
- Operation rules are needed to determine how much visual difference between preview and export is acceptable.
- Depending on the browser environment, `high_preview` might be too heavy.

## Points Needing Further Consideration in this Repository

- Whether to expand the `quality` contract of `scad/base/keycap.scad` and `scad/modules/*.scad` to 3 stages.
- The bridging method from `src/lib/keycap-scad-bundle.js` to pass quality per preview job.
- Whether to expose it permanently in the UI or as a temporary toggle for confirmation.
- Which quality stage should be the default target for manual verification procedures and regression samples.

## Current Decision

Not adopted. For now, we will maintain the current `preview` as a lightweight default and reconsider if any of the following occur:

- Curved surface checks are insufficient in normal preview, causing frequent round trips to export.
- Shapes with finer curves or larger radii are added, making it difficult to judge with the current preview density.
- The difference in preview density per feature becomes too large to be easily absorbed in 2 stages.
