# legend text-to-path SVG option

## Background

In the bundled OpenSCAD runtime, using `text()` at small sizes tends to produce coarse, polygonized curves. The current implementation improves this using `$fn` and internal scaling within OpenSCAD, but we keep as an alternative option the idea of "using an SVG where the characters have been converted to paths externally."

## Outline of the approach

1. Convert glyph outlines from a font to paths externally
2. Keep them as closed paths rather than `text` elements within the SVG
3. Load the 2D shape on the OpenSCAD side with `import("legend.svg")`
4. `linear_extrude()` as needed to turn it into a legend volume

## Expected benefits

- Does not depend on OpenSCAD's `text()` implementation; can use outlines controlled in advance
- Per-font glyph-shape differences can be locked in at the glyph-outline stage
- If outline generation is offloaded to the JS side, it becomes easier to extend to multiple legends or icon-type content in the future

## Main constraints

- Since OpenSCAD's SVG import is ultimately treated as closed polygons as well, it does not truly preserve vector data
- Per the official manual, SVG import does not handle text/font directly; it assumes paths already converted to geometric data
- Since the responsibility for path conversion moves outside OpenSCAD, font metrics, kerning, placement, and cache design need to be handled separately
- To keep this self-contained on GitHub Pages, either a browser-side text-to-path implementation or a pre-generation flow is needed
- If UI input strings are converted to SVG on each change, management of runtime assets and the export path increases

## Points needing further consideration in this repository

- Choice of a library for generating glyph outlines on the JS side
- Coordinate system and origin convention for combining multiple paths from a string
- Bridge design for passing SVG assets to `src/lib/keycap-scad-bundle.js`
- Cache design so the same legend path can be reused across both the preview and export paths
- Whether font licensing requires additional confirmation regarding path conversion or redistribution

## Current decision

Not adopted. Prioritize improvements that stay self-contained within OpenSCAD for now, and reconsider if any of the following conditions arise.

Note: for icon legends, separately from glyph-outline generation for text, an `import()` path has already been adopted that passes pre-distributed SVG icon data as a per-provider runtime asset. The "not adopted" decision here refers specifically to the approach of converting user-input strings from a font into paths for an SVG legend.

- Even with `$fn` and internal scaling, curve quality remains insufficient
- The limits of the `text()`-based approach become pronounced with multiple legends, icons, or side legends
- We want to reuse browser-side glyph-outline generation for other purposes as well

## References

- [OpenSCAD User Manual/Text](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Text)
- [OpenSCAD User Manual/SVG Import](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Importing_Geometry/SVG_Import)
