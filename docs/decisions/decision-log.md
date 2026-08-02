# Decision Log

Records adopted design decisions in chronological order. This is not a day-to-day progress memo — it only records content that future maintenance and extension work will rely on as a given.

## 2026-07-15 - Treat negative dishDepth as a raised form on the existing curved surface

- Conclusion:
  For `topSurfaceShape` / `topHatSurfaceShape`, `cylindrical` / `spherical` continue to treat a positive `dishDepth` as a dish as before, and now treat a negative value as a raised form that is the mirror image of the same curved surface. The input range for both shapes is `-1.5mm` to `+1.5mm`, and the existing defaults of `0.5mm` for cylindrical and `1.0mm` for spherical are kept. The convex form is anchored at the actual top-surface boundary after rounding, and is cut by an envelope that extends the existing sidewall slope upward, so no vertical lip or extra outline is produced. The inner ceiling and stem mounting height are not raised by the negative value.
- Rationale:
  This preserves the general curvature and the shape on the positive side for both cylindrical and spherical surfaces, while letting the same parameter express a convex form that still follows key dimensions, top-surface taper, the JIS Enter footprint, and top-edge rounding. A simple sum of a sphere/cylinder and a vertical prism would create a step at the side boundary, so a continuous side envelope is required.
- Supersedes:
  Replaces the "non-negative values only for dish" decision from 2026-05-03, and re-adopts the original sign convention from 2026-04-23, including follow-through for side connection, legend, homing bar, and stem.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-25 - Icon provider uses the latest CDN release with a runtime sanitizer

- Conclusion:
  At browser runtime, Lucide, Material Symbols, Font Awesome Free Solid, and Remix Icon are loaded from the `latest` package on jsDelivr. The retrieved SVG node / body / path data is passed through a sanitizer that restricts it to allowed tags, attributes, and path data only, and for Lucide the stroke primitives are converted to filled paths before being passed to OpenSCAD. In environments where the CDN is unavailable, fallback data from the installed package goes through the same sanitizer / conversion pipeline.
- Rationale:
  This decouples following icon-set updates from updating manually generated files, so the latest catalog is always available. The previous approach of pre-generating Lucide stroke-to-fill conversions broke the round cap of open strokes, causing shapes like `power` to have missing edges at the tips, so routing everything through a single sanitize-then-convert pipeline after fetching prevents recurrence.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-23 - Icon legends are treated as Lucide SVG runtime assets

- Conclusion:
  A legend now has a content type of `text` or `icon`. Lucide is supported first, and the UI lets the user pick an icon set and icon name independently of the text. The SCAD bridge passes the selected Lucide SVG as a runtime asset at `/icons/lucide/*.svg`, and the SCAD side extrudes the 2D shape obtained via `import()` as the legend volume. If an existing JSON has no icon-related field, it is loaded as `text`, preserving compatibility with text legends.
- Rationale:
  Fonts and icons differ in what can be selected, in licensing, and in the shape-generation path, so separating them by content type rather than mixing icons into font selection makes future extension easier. Lucide is easy to search by icon name and to fetch SVG data from, and it fits the existing pipeline of injecting assets into the statically served, in-browser OpenSCAD runtime.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-24 - Extend the icon legend provider to support multiple icon sets

- Conclusion:
  An icon provider registry lives in `src/lib/keycap-icons.js`, and both the UI and the SCAD bridge fetch icon metadata, perform search, and obtain SVG runtime assets through a common API driven by `legendIconSet` / `legendIconName`. The added providers are Material Symbols, Font Awesome Free Solid, and Remix Icon. The runtime asset path is `/icons/{set}/{name}.svg`.
- Rationale:
  Because each icon set differs in data format, viewBox, and license notice, containing these differences inside the provider is easier to extend and to keep license attribution correct than adding per-set branches throughout the UI and SCAD bridge. Existing JSON keeps the default `lucide` / `circle` values, so compatibility is preserved.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-06-16 - User-added fonts are treated as in-browser "My Fonts"

- Conclusion:
  When a user selects or drags-and-drops a TTF/OTF file, that font file is not added to the bundled assets; instead it is kept in an in-browser "My Fonts" registry. It is only passed to the OpenSCAD runtime as a `/fonts/user/` asset during preview/export, and the saved edit-data JSON stores only a `user-font:*` key derived from the hash of the file bytes. An unresolved `user-font:*` key is not silently replaced with a default font — instead the user is prompted to re-add the same font file.
- Rationale:
  This separates the requirement of using the user's local fonts — without assuming server-side storage, since the app is served from GitHub Pages — from the responsibility boundary around font redistribution and bundled-license verification.

## 2026-06-03 - STEP export generates a faceted B-rep in the browser

- Conclusion:
  `STEP` is added to the individual export options, and a STEP AP214 `FACETED_BREP_SHAPE_REPRESENTATION` is generated in the browser from the OFF mesh of the `single_material_shape` target. Color, legend, and part separation are not preserved; use 3MF instead if these are needed.
- Rationale:
  The bundled OpenSCAD WASM runtime does not support native STEP export, so this provides a `.step` file for CAD interchange while keeping everything client-side, consistent with the GitHub Pages hosting model. The faceted B-rep depends on the mesh quality produced by OpenSCAD, but it supports manufacturing/CAD workflows that require STEP rather than STL.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-05-03 - Restrict dishDepth back to non-negative values, for dish only

- Status:
  Superseded by the 2026-07-15 decision.

- Conclusion:
  For `topSurfaceShape`, `cylindrical` / `spherical` treat the existing, proven positive-value dish behavior as canonical, and `dishDepth` only accepts values of 0 or greater. An excessively large positive value is rounded to a range that does not lower the keytop's highest point, and even for shallow values the dish's starting position is fixed relative to the top-surface footprint. Raised forms from negative values are not handled here and are left as a separate future design with a dedicated parameter.
- Rationale:
  Loading a negative-value raised form onto the same `dishDepth` parameter breaks the contact point between the sidewall and the keytop's top surface, breaks legend/homing-bar follow-through, and is prone to breaking the existing positive-side behavior as well.
- Related:
  [../architecture/scad-and-export.md](../architecture/scad-and-export.md)

## 2026-04-30 - A project bundles multiple keycaps via a manifest inside a ZIP

- Conclusion:
  The save unit for multiple keycaps is called a project, and it consists of the `KeycapMaker.json` manifest plus the edit-data JSON and preview images under `keycaps/`. Saving is unified around a ZIP download; dragging and dropping a single JSON adds the loaded content to the project's keycap list and makes it active. The existing list in an already-loaded project is preserved.
- Supplementary note:
  The preview used in the list keeps the `previewViewState` camera state at capture time in the manifest, and when the active keycap's parameters change, the list thumbnail is re-captured at the same angle.
- Rationale:
  This lets a set of keycaps and their list-view previews be handled inside a statically served app without breaking the existing edit-data JSON format.
- Related:
  [../architecture/project-data.md](../architecture/project-data.md)

## 2026-04-25 - GitHub Pages deploys are limited to main and changes to web assets

- Conclusion:
  `main` and `dev` remain ongoing branches and are not deleted; regular development is consolidated onto `dev`. `.github/workflows/deploy-pages.yml` is triggered by pushes to `main` and by manual runs, and the job itself also gates on `refs/heads/main`. The paths that trigger automatic deployment are limited to implementation files under `src/`, `public/`, `scad/**/*.scad`, `index.html`, and Vite/npm configuration.
- Rationale:
  This keeps feature-branch work and docs-only updates from being reflected on GitHub Pages, so only changes relevant to the deployed artifact trigger a deploy.

## 2026-04-25 - Typewriter mounting height is measured from the top of the body

- Conclusion:
  For the typewriter shape, `topCenterHeight` continues to represent the thickness of the keytop body, while the mounting height adjustment is held separately as `typewriterMountHeight`, measured from the center of the top surface to the bottom of the mounting part.
- Rationale:
  Separating the thin keytop body's thickness from the stem's effective length allows the height above the switch to be adjusted without changing the top-surface appearance.

## 2026-04-24 - The body-side seat of the typewriter rim is cut with a tiny clearance

- Conclusion:
  The typewriter rim does not subtract the same volume as the visible rim from the body; instead only the body-side seat is cut using a rim clearance volume that is 0.03 mm larger.
- Rationale:
  When the body and rim share exactly the same face, the body color faintly shows through on the rim surface at the separate-volume boundary in preview and export.

## 2026-04-23 - Custom-shell keytops can switch between flat / cylindrical / spherical

- Conclusion:
  The custom-shell keytop shape is switched via `topSurfaceShape`, and `dishDepth` is treated as a dish when positive and as a raised form when negative. Cylindrical uses a fixed orientation, and changing `topPitchDeg` / `topRollDeg` tilts the dish while preserving its curvature.
- Supplementary note:
  The negative-value raised-form part of `dishDepth` was withdrawn once on 2026-05-03, but after implementing side-connection and dependent-shape follow-through, it was re-adopted on 2026-07-15.
- Rationale:
  A flat-only option offers a narrow range of keytop feel and appearance, and the general difference between cylindrical and spherical can be expressed with a small UI extension.

## 2026-04-23 - Typewriter keytop shape is limited to flat / spherical

- Conclusion:
  For the typewriter shape, only `flat` and `spherical` are exposed for `topSurfaceShape`; `cylindrical` is not accepted from state or import, and is rounded to the profile default.
- Rationale:
  The current requirement is to add spherical to typewriter; exposing cylindrical, which was defined for custom-shell, as-is would blur the meaning of the UI and saved data.

## 2026-04-16 - Adopt a static-hosting premise

- Conclusion:
  Proceed with a configuration premised on GitHub Pages, fully client-side.
- Rationale:
  Distribution and operation should be closed within static hosting alone.

## 2026-04-16 - Adopt Vite as the frontend foundation

- Conclusion:
  Adopt Vite, and automatically resolve the GitHub Pages base path from `GITHUB_REPOSITORY`.
- Rationale:
  This handles both local development and Pages deployment simply.

## 2026-04-16 - Bundle the OpenSCAD WASM runtime

- Conclusion:
  Bundle a prebuilt WASM runtime derived from OpenSCAD Playground under `public/vendor/openscad/`.
- Rationale:
  This keeps in-browser execution possible with no external dependency.

## 2026-04-16 - 3MF is assembled in the browser

- Conclusion:
  Output OFF from the OpenSCAD runtime and assemble the 3MF package in the browser.
- Rationale:
  This keeps a stable export path consistent with the bundled runtime.

## 2026-04-16 - Separate volumes as the baseline contract

- Conclusion:
  Adopt as the baseline contract a structure where body/legend can be handled as separate volumes, not relying on color alone.
- Rationale:
  This makes slicer compatibility and manufacturing semantics easier to keep stable.

## 2026-04-16 - Separate the SCAD base structure

- Conclusion:
  Use `scad/base/keycap.scad` as the entry point, with shell / legend / stem / preset separated out.
- Rationale:
  This makes it easier to separate preview/export responsibilities and to bridge from the UI.

## 2026-04-16 - Basic structure of the UI and preview

- Conclusion:
  Center everything on `src/main.js`, driving both preview and export from the same input state.
- Rationale:
  This unifies input responsibility in one place and reduces inconsistency between preview and export.

## 2026-04-16 - Fix the GitHub Pages deployment flow

- Conclusion:
  Fix `.github/workflows/deploy-pages.yml` to `npm ci -> npm run build -> deploy`.
- Rationale:
  This keeps the deployment path self-contained within the repository.

## 2026-04-18 - Update to the final base shape

- Conclusion:
  Replace the simple shell with the profile shell / Choc v2 stem / homing bar configuration derived from the final model.
- Rationale:
  This moves closer to a realistic keycap shape while keeping module boundaries intact.

## 2026-04-18 - Separate the homing bar and legend

- Conclusion:
  Treat the homing bar as a body-side option and the legend as a separate, coexisting volume.
- Rationale:
  Tactile markers and legends are separate responsibilities both in manufacturing and in the UI.

## 2026-04-18 - Inject `user_*` via a wrapper SCAD

- Conclusion:
  Rather than relying on `-D` overrides in the browser runtime, generate a wrapper SCAD file on each run.
- Rationale:
  This reliably applies the same parameters across both the preview and export paths.

## 2026-04-18 - Move legend to a `text()`-based approach

- Conclusion:
  Base the legend on `text()`, switching between bundled font assets' family/face.
- Rationale:
  This lets the UI handle arbitrary strings and multiple typefaces.

## 2026-04-18 - Treat a legend height of 0 as flush

- Conclusion:
  A `legend height = 0` is not treated as an invalid value; it is shown flush with the surface, at the same height.
- Rationale:
  This is easier for end users to understand in the UI.

## 2026-04-18 - Expose the legend following the top dish

- Conclusion:
  Rather than placing the legend as a flat extrusion, cut it within the same curved band as the dish.
- Rationale:
  This prevents a flush legend from being buried in and clipped by the body.

## 2026-04-19 - Priority order for legend extensions

- Conclusion:
  Before adding support for multiple top legends, prioritize separating the responsibility of the placement surface.
- Rationale:
  The current legend placement is tightly coupled to the top dish, which is a bottleneck for introducing side legends.
- Related:
  [../backlog/legend-extensibility-todo.md](../backlog/legend-extensibility-todo.md)

## 2026-04-21 - Increase resolution inside OpenSCAD for rounded legend typefaces

- Conclusion:
  The legend's `text()` raises `$fn` for both preview and export, and for small character sizes the text is enlarged internally before being scaled back down.
- Rationale:
  In the bundled OpenSCAD runtime, small `text()` calls tend to be polygonized coarsely, and rounded typefaces showed noticeably angular edges as a result.
- Related:
  [../backlog/legend-svg-path-option.md](../backlog/legend-svg-path-option.md)

## 2026-04-21 - Do not apply artificial bold-style correction to legends

- Conclusion:
  Do not apply an outward `offset()` to the legend's glyph outlines; use the selected font's outline as-is.
- Rationale:
  Mixing in unintended thickening that the user did not intend makes it harder to tell how the result differs from the selected font.

## 2026-04-21 - Legend style selection prioritizes the font spec

- Conclusion:
  For styles such as bold / italic / slanted, prefer the font's own named styles or separate faces, and do not apply a pseudo-style without explicit user action.
- Rationale:
  Using the selected font's own specification as-is keeps the visual origin clear and easier to maintain.

## 2026-04-21 - Prioritize variable fonts over static faces

- Conclusion:
  Bundle `M PLUS 1 Variable` and expose its native styles in the UI. For static fonts, let the user pick a face directly from the font-name search.
- Rationale:
  For families that have a variable font, handling named styles from a single file simplifies both the UI and asset management.

## 2026-04-21 - Prefer OFL-distributed fonts for franchise-independent thematic legends

- Conclusion:
  Avoid typefaces tied to specific movie or comic logos, and instead bundle Google Fonts `Bangers`, `Creepster`, `Rye`, and `Orbitron` for legends, since their redistribution terms are clear.
- Rationale:
  This lets the fonts be bundled for GitHub Pages distribution and adds comic, horror, western, and sci-fi directions, while keeping the rights situation away from proprietary franchise fonts.

## 2026-04-21 - Handle "Art Gothic"-style fonts with an approximate OFL typeface

- Conclusion:
  Do not bundle the "Art Gothic" family itself; instead add Google Fonts `Grenze Gotisch` and `MedievalSharp` as approximate alternatives.
- Rationale:
  This keeps redistribution terms clear within the repository while addressing the "Art Gothic" search need and the gothic-display direction.

## 2026-04-21 - Bundle a provenance note alongside externally distributed Japanese display fonts

- Conclusion:
  Add MODI Factory's `Kurobara Cinderella` font, and record the distribution source URL and the note about its derivation from M+ FONTS in `public/fonts/KurobaraCinderella-MODI.txt`.
- Rationale:
  Japanese fonts that are not distributed via Google Fonts tend to have scattered reference sources, so keeping a license-verification trail inside the repository is easier to maintain.

## 2026-04-21 - Only allow outline correction via geometry when explicitly requested

- Conclusion:
  Separately from font-native style selection, provide `legendOutlineDelta` as an explicit user input, and only apply outline correction via `offset()` when this is used.
- Rationale:
  This preserves fine-tuning capability for cases where native styles alone are not enough, while avoiding unrequested correction.

## 2026-04-21 - Underline follows the font's metadata

- Conclusion:
  When `legendUnderlineEnabled` is on, read `UnderlinePosition` / `UnderlineThickness` and the line-box center from the font file's `post` / `head` / `hhea` tables, convert them into coordinates for center-aligned text, and use them to determine the underline position and thickness. If the metadata cannot be retrieved, do not fall back to an arbitrary fixed value.
- Rationale:
  Basing the underline on the selected font's own specification, like other style aspects, keeps the visual origin clear and avoids mixing in arbitrary decoration.

## 2026-04-21 - Font-selection UI does not rely on the browser's native datalist

- Conclusion:
  Implement font selection with a custom search popover: a magnifying-glass button opens a search textbox and a scrollable list. Each font renders its own preview in the candidate list, filtered in real time as the user types.
- Rationale:
  `datalist` has weak control over option appearance, making it hard to build an experience where the user previews the font itself while choosing.

## 2026-04-22 - Consolidate per-shape editor defaults into JSON

- Conclusion:
  Consolidate per-shape default values, geometry defaults, and display group definitions into `src/data/keycap-shapes/*.json`; `scad/base/keycap.scad` holds no fail-safe defaults on the SCAD side and instead requires explicit `user_*` values.
- Rationale:
  This makes the responsibility boundary between the editor and SCAD clear, and lets default values and UI structure for new shapes be maintained in a single JSON location.

## 2026-04-22 - Treat the typewriter key rim as a separate volume

- Conclusion:
  For the typewriter shape, the key rim is handled as a top-level parameter; a flush seat is subtracted from the body, and the rim is output to preview/3MF as a `rim` part.
- Rationale:
  For the requirement of coloring the rim differently from the body, separating the mesh itself, not just color metadata, keeps preview, export, and slicer behavior consistent.

## 2026-04-25 - 3MF export bundles parts into a parent object via components

- Conclusion:
  In the 3MF file, body / rim / homing / legend remain as separate-volume object resources, and `build` contains a single parent object that bundles them together via `components`.
- Rationale:
  This avoids Bambu Studio treating small legend/homing parts as independent printable objects, while still preserving part separation for filament switching and relative positioning.

## 2026-04-25 - 3MF part names are written into both standard attributes and slicer metadata

- Conclusion:
  Keep the standard 3MF child-object `name` / `partnumber` attributes, and additionally add `Metadata/model_settings.config` for Bambu Studio / OrcaSlicer and `Metadata/Slic3r_PE_model.config` for PrusaSlicer / Slic3r PE.
- Rationale:
  Displaying child-part names under components is slicer-implementation-dependent in standard 3MF alone, and Bambu / Orca / Prusa-family slicers use Slic3r-derived model config metadata to restore part/volume names.

## 2026-04-25 - The 3MF parent object name uses the UI's name

- Conclusion:
  Put the UI's `Name` value into both the `name` attribute of the components parent object and the parent-object metadata in `Metadata/model_settings.config` for Bambu Studio / OrcaSlicer.
- Rationale:
  This lets the user identify the object by the name they assigned, not just by filename, within the slicer's object list as well.

## 2026-04-26 - STL export is an optional single-material-shape output

- Conclusion:
  Treat STL as an optional export rather than the recommended one, outputting a single mesh without color or legend from the `single_material_shape` target.
- Rationale:
  STL does not natively preserve color, material, part separation, or assembly information, so 3MF better suits KeycapMaker's separate-volume / coloring / legend requirements. However, since some slicer or manufacturing requirements call for STL, a single-material-shape save path is provided as well.

## 2026-04-25 - Bundled font assets require a lightweight provenance note

- Conclusion:
  For each bundled font, place either the license text or a note on the distribution terms under `public/fonts/`, and also keep a `*-SOURCE.txt` (or equivalent) provenance note recording the distribution URL, review date, bundled filename, metadata, and SHA-256.
- Rationale:
  Since past versions served over the web may persist, this lets license or distribution-source changes be tracked lightweight — recording which version was incorporated under which terms — even after the fact.

## 2026-04-25 - Oversized legends are not clipped to the key footprint

- Conclusion:
  The legend's working area is not capped at the keytop's top-surface footprint; instead a sufficiently large surface-fitting area, sized to the character count and character size, is passed from the JS bridge to SCAD. Even when characters overflow the top of the key, they are not auto-shrunk, and are instead treated as an overhang of the legend part.
- Rationale:
  This preserves creative freedom for users who intentionally place large or multiple characters, while avoiding unintended clipping caused by font-measurement differences or key width.
