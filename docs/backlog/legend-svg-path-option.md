# SVG Text-to-Path Option for Legends

## Background

In the bundled OpenSCAD runtime, using `text()` at small sizes often results in rough, polygonal curves. The current implementation improves this using `$fn` and internal scaling within OpenSCAD. As an alternative, an idea to "use an SVG where text is externally converted to paths" is kept for consideration.

## Outline of the Idea

1. Externally convert glyph outlines from fonts to paths.
2. Hold them as closed paths within the SVG, not as text elements.
3. On the OpenSCAD side, read the 2D shape with `import("legend.svg")`.
4. Extrude it into a legend volume using `linear_extrude()` as needed.

## Expected Benefits

- Can use pre-controlled outlines without relying on OpenSCAD's `text()` implementation.
- Glyph shape differences per font can be locked in at the outline stage.
- Offloading contour generation to JS makes it easier to extend to multiple legends or icon types in the future.

## Main Constraints

- SVG import in OpenSCAD is ultimately treated as closed polygons, so it doesn't truly retain vectors.
- According to the official manual, SVG import does not directly handle text/font; it expects paths converted to geometric information.
- Since the responsibility for path conversion moves outside OpenSCAD, separate designs for font metrics, kerning, placement, and caching are required.
- To keep it client-side on GitHub Pages, an in-browser text-to-path implementation or a pre-generation flow is needed.
- Converting UI input strings to SVG every time increases the management of runtime assets and export paths.

## Points Needing Further Consideration in this Repository

- Selecting a library to generate glyph outlines on the JS side.
- Coordinate system and origin contract for grouping multiple paths from a string.
- Bridge design to pass SVG assets to `src/lib/keycap-scad-bundle.js`.
- Cache design to reuse the same legend path in both preview and export routes.
- Checking if path conversion and redistribution require additional confirmation under font licenses.

## Current Decision

Not adopted. Prioritize improvements contained within OpenSCAD for now, and reconsider if any of the following conditions arise.

Note: For icon legends, separate from text glyph outline generation, we have adopted an `import()` route that passes distributed SVG icon data as runtime assets per provider. The decision not to adopt here refers to the idea of converting user input strings from fonts into paths to create SVG legends.

- The quality of curves remains insufficient even with `$fn` and internal scaling.
- The limitations of `text()`-based generation become prominent with multiple legends, icons, or side legends.
- A desire arises to use in-browser glyph outline generation for other purposes.

## References

- [OpenSCAD User Manual/Text](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Text)
- [OpenSCAD User Manual/SVG Import](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Importing_Geometry/SVG_Import)
