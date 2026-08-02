# High-detail preview mode option

## Background

The current preview improves its look via smooth normal handling on the Three.js side and via segment-count adjustment based on feature radius on the SCAD side. However, if it were always pushed to export-equivalent density, the responsiveness of the in-browser OpenSCAD runtime tends to drop.

So we keep, as an unadopted item for consideration, the idea of adding an optional high-detail preview stage between the normal `preview` and `export`.

## Outline of the approach

- Keep the current `preview` as-is, prioritizing lightness
- Add `high_preview`, raising only the SCAD curve segment count above `preview`
- Keep the Three.js rendering path shared, and mainly add a quality stage on the OpenSCAD generation side
- On the UI side, prefer a form that can be toggled only when needed, rather than something always on

## Expected benefits

- Density can be raised only when checking the finished look, without breaking responsiveness during normal operation
- Makes it easier to get a check close to the final appearance of curved surfaces or small arcs without running `export` every time
- Makes it easier to organize the responsibilities of quality stages across `preview / high_preview / export`

## Main concerns

- More quality branching on the SCAD side, making each module's responsibilities slightly more complex
- If a quality toggle is exposed in the UI, the number of settings increases
- Operational rules would be needed for how much visual difference between preview and export is acceptable
- In some browser environments, `high_preview` could turn out to be too heavy

## Points needing further consideration in this repository

- Whether to extend the `quality` contract in `scad/base/keycap.scad` and `scad/modules/*.scad` to three stages
- How to bridge quality settings per preview job from `src/lib/keycap-scad-bundle.js`
- Whether to expose this in the UI as a permanent control or a temporary check-only toggle
- Which quality stage to treat as the default check target in manual verification steps and regression samples

## Current decision

Not adopted. Keep the current `preview` as a lightweight default for now, and reconsider if any of the following occurs.

- The normal preview isn't enough to verify curved surfaces, causing frequent round-trips with export
- Shapes with finer curves or large radii are added, making them hard to judge at the current preview density
- Preview density gaps become large per feature, becoming hard to absorb with just two stages
