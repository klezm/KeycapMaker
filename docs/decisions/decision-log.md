# Decision Log

Keep a chronological record of adopted design decisions. Write only the assumptions that will serve as prerequisites for future maintenance and expansion, not daily progress memos.

## 2026-07-15 - Treat negative values of dishDepth as a bulge for existing curved surfaces

- Conclusion:
  For `cylindrical` / `spherical` of `topSurfaceShape` / `topHatSurfaceShape`, treat a positive `dishDepth` as a traditional indentation, and a negative value as a bulge that is a mirror image of the same curved surface. The input range is `-1.5mm` to `+1.5mm` for both shapes, maintaining the default values of `0.5mm` for cylindrical and `1.0mm` for spherical. The convex surface starts from the actual top boundary after rounding and is cut by an envelope extending the existing sidewall gradient upwards, avoiding vertical lips or extra outer shapes. Inner ceiling and stem mounting height are not lifted by negative values.
- Reason:
  To express a convex surface tracking key dimensions, top surface tapering, JIS Enter footprint, and top edge R with the same parameters without changing the general curvature of cylindrical/spherical surfaces or the positive-side shape. Since a simple union of a sphere/cylinder and a vertical prism causes a step at the side boundary, a continuous envelope of the side is required.
- Replacement:
  Replaces the "non-negative values dedicated to indentation" from 2026-05-03, and re-adopts the initial sign contract of 2026-04-23, including the tracking of side connections, legends, homing bars, and stems.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-25 - Use latest CDN and runtime sanitizer for icon providers

- Conclusion:
  When running in the browser, load Lucide, Material Symbols, Font Awesome Free Solid, and Remix Icon from jsDelivr's `latest` packages. The acquired SVG node/body/path data is filtered to allowed tags, attributes, and path data using a sanitizer. For Lucide, stroke primitives are converted to filled paths before passing to OpenSCAD. In environments where the CDN is unavailable, fallback data derived from installed packages is passed through the same sanitizer/conversion process.
- Reason:
  To decouple icon set updates from manually generated files and always handle the latest catalogs. Previous pre-generation of Lucide stroke-to-fill caused open stroke round caps to break, resulting in shapes with missing ends like the `power` icon. Using a single path for sanitizer and conversion post-acquisition prevents recurrences.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-23 - Treat icon legends as Lucide SVG runtime assets

- Conclusion:
  Legends have a content type of `text` and `icon`. Initially supporting Lucide, the UI selects an icon set and icon name independent of text. The SCAD bridge passes the selected Lucide SVG as a runtime asset to `/icons/lucide/*.svg`, and extrudes the 2D shape `import()`ed on the SCAD side as a legend volume. If existing JSON lacks icon fields, it is loaded as `text`, maintaining compatibility with text printing.
- Reason:
  Since fonts and icons have different selection targets, licenses, and shape generation paths, separating them by content type is easier to expand than mixing them into font selection. Lucide is easy for icon name searches and SVG data acquisition, fitting well with the existing route of injecting assets into the statically delivered in-browser OpenSCAD runtime.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-24 - Expand icon legend providers to support multiple sets

- Conclusion:
  Place an icon provider registry in `src/lib/keycap-icons.js`, and the UI and SCAD bridge acquire icon metadata, searches, and SVG runtime assets using a common API based on `legendIconSet` / `legendIconName`. Additional providers are Material Symbols, Font Awesome Free Solid, and Remix Icon. The runtime asset path is `/icons/{set}/{name}.svg`.
- Reason:
  Since the data format, viewBox, and license notation vary per icon set, encapsulating them in providers makes expansion and maintaining license displays easier than adding individual branches to the UI or SCAD bridge. Existing JSON maintains the default `lucide` / `circle`, so compatibility is not broken.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-16 - User-added fonts are treated as local browser fonts

- Conclusion:
  When a user selects or drag-and-drops a TTF / OTF, the font file is not added to the bundled assets, but is held in the `My Fonts` registry within the browser. It is passed to the OpenSCAD runtime as a `/fonts/user/` asset only during preview/export, and only the `user-font:*` key derived from the file bytes' hash is saved in the edit data JSON. Unloaded `user-font:*` keys are not silently replaced with the default font, but prompt the re-addition of the same font file.
- Reason:
  To separate the requirement of using a user's local font from the responsibility boundary of font redistribution and bundled license confirmation, without assuming server storage as a GitHub Pages delivered app.

## 2026-06-03 - STEP export generates faceted B-rep on the browser side

- Conclusion:
  Added `STEP` to individual exports, and generates a STEP AP214 `FACETED_BREP_SHAPE_REPRESENTATION` on the browser side from the OFF mesh of the `single_material_shape` target. Colors, legends, and part separations are not retained; use 3MF if they are needed.
- Reason:
  The bundled OpenSCAD WASM runtime does not support native STEP export, but we want to provide `.step` for CAD exchange while maintaining a client-side only app delivered via GitHub Pages. Faceted B-rep depends on the mesh quality generated by OpenSCAD, but can accommodate manufacturing and CAD integrations that require STEP rather than STL.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-05-03 - Revert dishDepth to a non-negative value dedicated to indentation

- Status:
  Replaced by the decision on 2026-07-15.

- Conclusion:
  `cylindrical` / `spherical` of `topSurfaceShape` treat the existing practical positive indentation behavior as correct, and `dishDepth` accepts only 0 or more. Excessive positive values are rounded to a range where the highest point of the keytop does not drop, and even for shallow values, the start position of the indentation is fixed based on the top footprint. Bulges by negative values are not handled and will be designed separately as dedicated parameters in the future.
- Reason:
  Placing a negative-value bulge on the same `dishDepth` breaks the contact points between the sidewall and keytop surface, and the tracking of legends / homing bars, and is prone to breaking the existing behavior of positive values.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-04-30 - Projects bundle multiple keycaps in a manifest within a ZIP

- Conclusion:
  The saving unit for multiple keycaps is called a project, consisting of a `KeycapMaker.json` manifest and edit data JSONs / preview images under `keycaps/`. Saving is unified to a ZIP download, and dragging and dropping a single JSON adds the loaded content to the project's keycap list and makes it active. The existing list of an already loaded project is retained.
- Supplement:
  The list preview retains the camera state `previewViewState` at the time of shooting in the manifest, and when parameters of an active keycap change, the list image is re-shot at the same angle.
- Reason:
  To allow keycap collections and list previews to be handled within a statically delivered app without destroying existing edit data JSONs.
- Related:
  [../architecture/project-data.md](../architecture/project-data.md)

## 2026-04-25 - GitHub Pages deployment is limited to main and Web resource changes

- Conclusion:
  `main` and `dev` will be maintained without deletion as continuously operating branches, and normal development will be consolidated into `dev`. `.github/workflows/deploy-pages.yml` uses pushes to `main` and manual execution as entry points, and conditions `refs/heads/main` on the job side as well. Automatic deployment target paths are limited to implementation files in `src/`, `public/`, `scad/**/*.scad`, `index.html`, and Vite / npm settings.
- Reason:
  To avoid reflecting feature branch work or docs-only updates to GitHub Pages, and to deploy only changes related to delivery assets.

## 2026-04-25 - Mount height of typewriter is based on the top surface of the body

- Conclusion:
  In the typewriter shape, `topCenterHeight` is maintained as the thickness of the keycap body, and height adjustment when mounted is handled as `typewriterMountHeight`, the distance from the center of the body's top surface to the bottom edge of the mount part.
- Reason:
  By separating the thickness of the thin keytop body and the effective length of the stem, the height on the switch can be adjusted without changing the appearance of the top surface.

## 2026-04-24 - The seat on the body side of the typewriter rim is carved with a minute clearance

- Conclusion:
  The typewriter rim does not subtract the same volume as the visible rim from the body, but carves the seat with a rim clearance volume 0.03 mm larger on the body side only.
- Reason:
  If the body and rim share the same face, the body color thinly remains on the rim surface at the separate volume boundary of preview and export.

## 2026-04-23 - The custom-shell keytop can switch between flat / cylindrical / spherical

- Conclusion:
  The keytop shape of the custom-shell is switched with `topSurfaceShape`, and `dishDepth` is treated as an indentation for positive and a bulge for negative. Cylindrical has a fixed orientation, and tilting it with `topPitchDeg` / `topRollDeg` keeps the dish's curvature intact.
- Supplement:
  The negative bulge part of `dishDepth` was withdrawn once on 2026-05-03, but re-adopted on 2026-07-15 after implementing side connection and tracking of dependent shapes.
- Reason:
  Because flat alone has a narrow range of feel and appearance for the keytop, and the general differences between cylindrical / spherical can be expressed with small UI extensions.

## 2026-04-23 - Typewriter keytop shapes are limited to flat / spherical

- Conclusion:
  For the typewriter shape, only `flat` and `spherical` are exposed in `topSurfaceShape`, and `cylindrical` is rounded to the profile default in state / import.
- Reason:
  The requirement this time was to add spherical to typewriter, and exposing cylindrical defined for custom-shell as is would blur the meaning of the UI and saved data.

## 2026-04-16 - Adoption of static delivery premise

- Conclusion:
  Proceed with a structure assuming GitHub Pages and complete client-side execution.
- Reason:
  To contain delivery and operation solely within static hosting.

## 2026-04-16 - Adoption of Vite as the frontend base

- Conclusion:
  Adopt Vite, automatically resolving the GitHub Pages base from `GITHUB_REPOSITORY`.
- Reason:
  To simply handle both local development and Pages deployment.

## 2026-04-16 - Bundling OpenSCAD WASM runtime

- Conclusion:
  Bundle the OpenSCAD Playground series prebuilt WASM runtime in `public/vendor/openscad/`.
- Reason:
  To maintain in-browser execution without external dependencies.

## 2026-04-16 - 3MF is assembled on the browser side

- Conclusion:
  Output OFF from OpenSCAD runtime and generate 3MF packages on the browser side.
- Reason:
  To have a stable export route matching the bundled runtime.

## 2026-04-16 - Separate volume as the base contract

- Conclusion:
  Make a structure that can treat the body / legend as separate volumes the basic contract, and do not rely solely on color.
- Reason:
  To stabilize slicer compatibility and significance in manufacturing.

## 2026-04-16 - Separation of SCAD base structure

- Conclusion:
  Separate shell / legend / stem / presets using `scad/base/keycap.scad` as the entry point.
- Reason:
  To make handling the preview / export responsibility separation and the bridge from the UI easier.

## 2026-04-16 - Basic structure of UI and preview

- Conclusion:
  Drive preview and export from the same input state, centered on `src/main.js`.
- Reason:
  To centralize input responsibilities and reduce inconsistencies between preview and export.

## 2026-04-16 - Fixing the GitHub Pages deployment flow

- Conclusion:
  Fix `npm ci -> npm run build -> deploy` in `.github/workflows/deploy-pages.yml`.
- Reason:
  To contain the delivery route within the repository.

## 2026-04-18 - Update to final base shape

- Conclusion:
  Replaced the simple shell with a profile shell / Choc v2 stem / homing bar configuration derived from the final model.
- Reason:
  To bring it closer to real keycap shapes while maintaining module boundaries.

## 2026-04-18 - Separation of homing bar and legend

- Conclusion:
  Make the homing bar an option on the body side and the legend a separate volume side-by-side.
- Reason:
  Because tactile markers and printing have different responsibilities in manufacturing and the UI.

## 2026-04-18 - `user_*` is injected via wrapper SCAD

- Conclusion:
  Instead of relying on `-D` overrides in the browser runtime, generate a wrapper SCAD for each execution.
- Reason:
  To ensure the same parameters are reflected in both preview / export paths.

## 2026-04-18 - Migration of legends to `text()` base

- Conclusion:
  Legends are based on `text()`, switching the family / face of bundled font assets.
- Reason:
  To be able to handle arbitrary strings and multiple typefaces from the UI.

## 2026-04-18 - Legend height 0 is treated as flush

- Conclusion:
  `Text Height = 0` is not an invalid value, but a state seen at the same height as the surface.
- Reason:
  Because the meaning is easier to understand as an end-user UI.

## 2026-04-18 - Legend exposure along the top dish

- Conclusion:
  Legends are not placed as flat extrusions, but cut out in the same curve band as the dish.
- Reason:
  To prevent flush legends from being buried and chipped by the body.

## 2026-04-19 - Priorities for legend extension

- Conclusion:
  Prioritize separating the responsibilities of placement surfaces before handling multiple top legends.
- Reason:
  Because the current legend placement is tightly coupled to the top dish, making it a bottleneck for introducing side legends.
- Related:
  [../backlog/legend-extensibility-todo.md](../backlog/legend-extensibility-todo.md)

## 2026-04-21 - High definition of rounded legend typefaces within OpenSCAD

- Conclusion:
  For legend `text()`, increase `$fn` for each preview / export, and for small text sizes, internally expand and then shrink.
- Reason:
  Because small `text()` in the bundled OpenSCAD runtime tends to be roughly polygonized, making jaggedness noticeable in rounded typefaces.
- Related:
  [../backlog/legend-svg-path-option.md](../backlog/legend-svg-path-option.md)

## 2026-04-21 - No pseudo-fattening correction for legends

- Conclusion:
  Do not apply outer circumference `offset()` to the legend's glyph outline, but use the outline of the selected font as is.
- Reason:
  If unintended fattening visually mixes in, it becomes difficult to see the difference from the selected font.

## 2026-04-21 - Style selection for legends prioritizes font specs

- Conclusion:
  For styles like bold / italic / slanted, prioritize named styles or separate faces the font has, and do not add pseudo-styles without user action.
- Reason:
  Using the specifications of the selected font as is makes the origin of the appearance clearer and easier to maintain.

## 2026-04-21 - Variable fonts prioritize static faces

- Conclusion:
  Bundle `M PLUS 1 Variable` and allow native styles to be selected from the UI. Static fonts have their face selected directly from font name searches.
- Reason:
  For families with variable fonts, handling named styles in a single file simplifies the UI and asset management.

## 2026-04-21 - Worldview fonts without copyright dependence prioritize OFL distributions

- Conclusion:
  Avoid specific logo typefaces of movies and comics, and bundle Google Fonts' `Bangers`, `Creepster`, `Rye`, and `Orbitron` with clear redistribution terms for legends.
- Reason:
  Because they can be bundled via GitHub Pages delivery, adding directions for comics, horror, westerns, and sci-fi without leaning on proprietary franchise font rights.

## 2026-04-21 - Art Gothic lineage is handled with approximate OFL typefaces

- Conclusion:
  Do not bundle the specific `Art Gothic` family itself, but add Google Fonts' `Grenze Gotisch` and `MedievalSharp` as approximate candidates.
- Reason:
  To meet the `Art Gothic` search needs and the direction of gothic display while keeping redistribution conditions clear within the repository.

## 2026-04-21 - Externally distributed Japanese display fonts include source notes

- Conclusion:
  Add `Kurobara Cinderella` from MODI Factory, leaving the distributor URL and note of M+ FONTS derivation in `public/fonts/KurobaraCinderella-MODI.txt`.
- Reason:
  Because Japanese fonts not distributed by Google Fonts tend to have scattered sources, keeping the license confirmation route in the repo is easier to maintain.

## 2026-04-21 - Only explicit contour correction operations are permitted in geometry

- Conclusion:
  Separate from font-native style selection, provide `legendOutlineDelta` as an explicit operation from user input, and apply contour correction with `offset()` only at this time.
- Reason:
  To leave fine-tuning needs that native styles alone cannot cover, while avoiding unrequested corrections.

## 2026-04-21 - Underline follows font metadata

- Conclusion:
  When `legendUnderlineEnabled` is active, read `UnderlinePosition` / `UnderlineThickness` and the center of the line box from the font file's `post` / `head` / `hhea`, convert to coordinates of centered text, and determine the underline position and thickness. If metadata cannot be obtained, do not fallback to arbitrary fixed values.
- Reason:
  Matching underlines to the specifications of the selected font makes the origin of the appearance clearer and prevents arbitrary decorations from mixing in.

## 2026-04-21 - Font selection UI does not rely on browser standard datalists

- Conclusion:
  Implement font selection with a custom search popover, opening a search textbox and scrollable list from a magnifying glass button. Candidates are displayed in each font itself, and filtered in real-time as you type.
- Reason:
  Because datalists have weak control over the appearance of options, making it hard to create an experience of selecting fonts while previewing them.

## 2026-04-22 - Editor default values for each shape are consolidated into JSON

- Conclusion:
  Consolidate default values, geometry defaults, and display group definitions for each shape into `src/data/keycap-shapes/*.json`, and have `scad/base/keycap.scad` receive explicit `user_*` without SCAD-side fail-safe defaults.
- Reason:
  To clarify the responsibility boundary between the editor and SCAD, and allow maintaining initial values and UI structures when adding shapes in a single JSON file.

## 2026-04-22 - Typewriter key rims are made separate volumes

- Conclusion:
  Treat typewriter shape key rims as top parameters, subtract a flush seat from the body, and output it to preview / 3MF as a `rim` part.
- Reason:
  For the requirement to handle rims in a different color from the body, separating the mesh itself, not just color metadata, makes it easier to maintain consistency between preview / export / slicer.

## 2026-04-25 - 3MF export bundles parts into components parent objects

- Conclusion:
  Leave 3MF body / rim / homing / legend as separate volume object resources, and place only one parent object bundling them in `components` in `build`.
- Reason:
  To prevent Bambu Studio from judging small legend / homing parts as independent objects, while maintaining part separation and relative positions for filament switching.

## 2026-04-25 - 3MF part names are placed in both standard attributes and slicer metadata

- Conclusion:
  While maintaining standard 3MF child object `name` / `partnumber`, add `Metadata/model_settings.config` for Bambu Studio / OrcaSlicer, and `Metadata/Slic3r_PE_model.config` for PrusaSlicer / Slic3r PE.
- Reason:
  Display of child part names in components depends on slicer implementation for standard 3MF alone, and Bambu / Orca / Prusa series use Slic3r-derived model config metadata to restore part / volume names.

## 2026-04-25 - 3MF parent object names use UI names

- Conclusion:
  Place the `Name` from the UI into the `name` of the components parent object and the parent object metadata of `Metadata/model_settings.config` for Bambu Studio / OrcaSlicer.
- Reason:
  To allow users to identify parts by the names they gave, not just by filename, but also in object lists within slicers.

## 2026-04-26 - STL export is made a single-color shape option

- Conclusion:
  STL is treated as an option rather than a recommended export, output as a single mesh without color and legends from the `single_material_shape` target.
- Reason:
  Since STL standardly does not hold color, material, part separation, and assembly information, 3MF is more suitable for KeycapMaker's separate volume / color separation / legend requirements. However, since STL may be required depending on slicers or manufacturing requirements, a saving route as a single-color shape is provided.

## 2026-04-25 - Font assets mandate lightweight provenance notes

- Conclusion:
  For bundled fonts, place the license text or distributor conditions memo in `public/fonts/`, and together leave the distributor URL, review date, bundled filename, metadata, and SHA-256 in `*-SOURCE.txt` or equivalent provenance note.
- Reason:
  Assuming past web-delivered versions might remain, this allows lightweight tracking of which version was incorporated under which conditions, even if licenses or distributors change.

## 2026-04-25 - Oversized legends are not clipped by the key footprint

- Conclusion:
  The workspace for legends is not capped by the footprint of the keycap top; a sufficiently large surface-fitting area corresponding to the number and size of characters is passed from the JS bridge to SCAD. Even if characters overhang the keytop, they are treated as an overhang of the legend part without automatic shrinking.
- Reason:
  To leave creative room for users to intentionally place large or multiple characters, and to avoid unintended clipping due to font measurement differences or key widths.
