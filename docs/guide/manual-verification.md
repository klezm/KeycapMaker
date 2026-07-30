# Manual Verification Procedure

## Purpose

When modifying the geometry contract, runtime, or export, this document summarizes the minimum items that must be verified on the browser and the slicer.

## Browser Verification

### 1. Initial Display

- App opens without errors
- Initial preview is displayed
- Color picker and section switching are not broken

### 2. Editing Operations

Change the following representative values and verify that the preview does not break.

- `Width`
- `Top Center Height`
- `Add Key Rim`
- `Key Rim Width`
- `Top Direction Height`
- `Bottom Direction Height`
- `Front to Back Incline`
- `Left to Right Incline`
- `Incline Input Method`
- `Keytop Shape`
- `Depth`
- Typewriter shape `Top Reference Height`
- `Top Taper`
- `Add Legend`
- `Text to Enter`
- When switching `Legend Content` from `Text` to `Icon`, text input, typeface, and underline fields are hidden, and icon set and icon search fields are displayed
- Magnifying glass button in `Icon` opens a search textbox and scrollable selection list
- Typing `volume`, etc., filters the candidates for the selected icon set in real-time, and selecting a candidate updates the selected icon name and preview
- Switching the icon set to Material Symbols, Font Awesome Free Solid, or Remix Icon keeps the search candidates, external catalog links, and license notations in sync with the selected set
- Icon legends also reflect `Legend Size`, `Thickness Correction`, `Text Height`, position, and color
- Increasing text from `A` to `Shift` or `ShiftLock` does not automatically change the legend size unless `Legend Size` is touched
- Legend size only changes when `Legend Size` is changed
- `Typeface`
- A link to open the page for the selected font is displayed below `Typeface` with a favicon and page name, navigating to the distribution/introduction page in a new tab
- Magnifying glass button in `Typeface` opens a search textbox and scrollable selection list
- A segment control for `Built-in Fonts` / `My Fonts` is displayed at the top of the font selection list
- Only bundled fonts are displayed in the `Built-in Fonts` segment, and `Add Local Font` is not shown
- Selecting a TTF / OTF from `Add Local Font` in the `My Fonts` segment adds the selected font as `My Fonts` and reflects it in the current legend
- Dragging & dropping a TTF / OTF file onto the screen adds it to `My Fonts` instead of loading a project / JSON
- While `My Fonts` is selected, the local filename is displayed, and an explanation that the font file itself is not bundled in the project ZIP or JSON is shown
- Pressing `Delete` while `My Fonts` is selected returns legends using that font to the default font
- If a saved JSON references an un-loaded `user-font:*`, it is not silently replaced with the default font, but displays a prompt to re-add the same TTF / OTF
- Each font name in the selection list is displayed in that font
- Typing `M PLUS`, etc., filters candidates in real-time
- `M PLUS 1 Variable` can be selected from the candidates
- Searching for `Noto Sans` / `Noto Sans JP` shows candidates
- Searching for `Bangers` / `Creepster` / `Rye` / `Orbitron` shows candidates
- Searching for `Art Gothic` shows `Grenze Gotisch Regular` and `MedievalSharp Regular` as candidates
- Searching for `Kurobara` shows `Kurobara Cinderella` as a candidate
- The copyright/license notation text actually used is displayed only while `Kurobara Cinderella` is selected
- The `Copy` button for `Kurobara Cinderella` outputs the notation text to the clipboard
- `In-font Style` is enabled when `M PLUS 1 Variable` is selected, and can switch to named styles like `Bold`
- `In-font Style` is enabled when `Noto Sans Variable` / `Noto Sans JP Variable` is selected, and can switch to named styles like `Bold`
- `In-font Style` is disabled when a static font is selected
- Even if `Orbitron Regular` is selected, `In-font Style` is not enabled and is treated as the Regular face
- When `Add Underline` is turned on, the underline position and thickness per font change, and particularly for `M PLUS 1 Variable / Thin / A`, the line does not dig into the center of the character
- When `Thickness Correction = 0`, changing the font does not introduce unintended fattening
- The contour only changes when `Thickness Correction` is swung to plus / minus
- Preview does not break when switching between `Bangers / A`, `Creepster / A`, `Rye / A`, `Orbitron / A`
- Preview does not break when switching between `Grenze Gotisch / A`, `MedievalSharp / A`
- Preview does not break before/after `Kurobara Cinderella / Key / A / Black`
- Curves do not become excessively angular before/after `Typeface = M PLUS Rounded 1c Regular`, Text = `B / O / S`
- Even if `Legend Size` is increased for `Digital` or `ShiftLock` on keys 2u or larger, the legend is not clipped by the top surface footprint and is displayed overhanging
- `Add Mark`
- `stemType`
- When rim is enabled in typewriter shape, body and rim appear cleanly separated with different colors without breaking
- When increasing/decreasing `Top Reference Height` for typewriter shape, the keytop body thickness does not change, and only the mounting part moves vertically
- When `Top Direction Height = 0`, `Bottom Direction Height = 0`, the rim is flush with the keytop without chipping or floating
- Even if `Top Direction Height = 0`, `Bottom Direction Height = 0`, the side of the typewriter rim is exposed continuously without being buried in the body
- Thin streaks or bleeding of the body color do not appear on the outer surface of the typewriter rim
- Outer dimensions increase and the rim extends in the corresponding direction only when `Top Direction Height` or `Bottom Direction Height` is increased
- Stem does not protrude through the top surface even if `Left to Right Incline` is raised to around 28-32 degrees
- Preview does not break even if `Keytop Shape = Flat / Cylindrical / Spherical` are switched
- `Keytop Shape = Flat / Spherical` can be toggled for the typewriter shape, and `Cylindrical` does not appear as an option
- `Depth` can be input from `-1.5mm` to `+1.5mm` for both cylindrical / spherical, positive values result in indentation, negative values result in a bulge of the same cylindrical/spherical surface, returning to 0 returns it to equivalent to flat
- Even if the absolute value of `Depth` in `Keytop Shape = Cylindrical / Spherical` is made shallow, the starting position of the curved surface does not move towards the center, only the height changes while maintaining the outer perimeter reference
- Toggling positive/negative with the same absolute value for `Depth = +0.5 / -0.5`, the amount of depression and bulge at the center become mirror images, and the curvature and direction of the cylindrical/spherical surface do not change
- Specifying a negative `Depth` on 1u, keys wider than 2u, vertically long keys, or JIS Enter results in a natural convex surface tracking the top surface size, without increasing the key's outer dimensions
- Using negative `Depth` with `Keytop Top Edge R` results in the convex surface starting from the side/top boundary after rounding, without creating vertical lips on the outer perimeter, two-step planes, or extra height
- Even with negative `Depth`, the inner ceiling and stem mounting position are the same as flat, and the stem is not lifted to the top surface side
- `Depth = ±1.5` is maintained for both `Keytop Shape = Cylindrical / Spherical`, inputs exceeding `±1.5` are symmetrically rounded to the positive/negative maximum limits, and body / legend / homing bar are drawn
- Changing `Front to Back Incline` and `Left to Right Incline` while keeping `Keytop Shape = Cylindrical / Spherical` keeps the curved surface tilted without flattening it
- For both positive/negative `Keytop Shape = Cylindrical / Spherical`, thin streaks or bleeding of body color do not appear on the legend contour, and the legend does not become empty with negative values
- Even when facing the front with flush legend default values, flickering of the body color does not appear on the text surface
- Seam lines between faces are not overly noticeable on curved surfaces of rounded outer shapes, dish, and stem outer circumference
- Contours do not appear unnaturally rounded in places where ridge lines are required

### 3. Edit Data JSON

- Change the `Name` at the top of the design tab to a distinguishable string
- Add a copy of the keycap currently being edited in the `Project` segment
- Press the export button for the added keycap and save `Edit Data JSON` from the overlay
- Confirm the downloaded filename is `Name + .json`
- Drag & drop to load the saved JSON
- Confirm that after loading, the display shifts to the project segment, it is added to the keycap list, and the added keycap becomes the one being edited
- Confirm the preview and input fields revert correctly
- Prepare a compatible input JSON saved under a different name by stripping a few items from the saved JSON
- Drag & drop to load the compatible input JSON
- Confirm the loaded JSON is added to the keycap list, and the added keycap becomes the one being edited
- Confirm the stripped items are supplemented by shape defaults, and only the kept items are reflected
- Confirm that existing text legend JSONs without icon fields are loaded as `Legend Content = Text`, and the existing `Text to Enter` and font settings are maintained
- Confirm that JSONs saved with `Legend Content = Icon`, `Icon = volume-2`, etc., are restored with the same icon selection after loading
- Confirm that even if `rimEnabled` or `legendEnabled` were set to false, turning them back on reveals that the hidden values remained at their defaults

### 4. Project

- Open the `Project` segment
- Confirm the project name can be changed
- Add a copy of the keycap being edited, and confirm the preview image and keycap name appear in the list
- Rotate the preview to an arbitrary angle and recapture the preview image for the active keycap, then verify that changing parameters updates the list image at that same angle
- Change it to a different name or legend and add it again, confirming multiple items appear in the list
- Drag the handle with the order number in the keycap list, confirm that before dropping, the cards pack with a moving animation, each card retains its original order number, and updates to the final order after dropping
- Pressing a keycap in the list switches the current editing content and preview to that keycap
- Pressing the export button for each keycap in the list opens an overlay with JSON / 3MF / STEP / STL options
- Confirm `Save Project` downloads a project ZIP containing `KeycapMaker.json`, `keycaps/`, and `3mf/`
- Drag & drop the saved project directory, and confirm the project list and active keycap are restored
- Drag & drop the saved project ZIP, and confirm the extracted project list and active keycap are restored
- Drag & drop a single edit data JSON while a project is already loaded, and confirm it is added as a new keycap while retaining the existing project list, and the newly added one becomes active for editing
- Load an edit data JSON containing parameters that cannot be reflected in the current shape, confirm the JSON Load Report is displayed, confirm the report reappears even if you switch to another keycap and return, and confirm you can delete only that parameter from the JSON to be saved via the `x` on each line

### 5. 3MF

- Press the export button on the keycap list and save `3MF` from the overlay
- Confirm the downloaded filename is `Name + .3mf`
- Confirm the parent object name on the slicer matches `Name`

### 6. STEP

- Press the export button on the keycap list and confirm `STEP` appears between `3MF` and `STL` in the overlay
- Save `STEP` from the overlay
- Confirm the downloaded filename is `Name + .step`
- Confirm the saved STEP opens as a STEP AP214 file containing `FACETED_BREP_SHAPE_REPRESENTATION`
- Confirm the STEP does not contain legend shapes even if legend is enabled
- Confirm the STEP is loaded as a single shape and does not include color or part separation
- Confirm an explanation to use 3MF if color separation or legend is required is displayed in the UI

### 7. STL

- Press the export button on the keycap list and save `STL` from the overlay
- Confirm the downloaded filename is `Name + .stl`
- Confirm the STL does not contain legend shapes even if legend is enabled
- Confirm the STL is loaded as a single mesh and does not include color or part separation
- Confirm an explanation to use 3MF if color separation or legend is required is displayed in the UI

## Bambu Studio Verification

When you change geometry or export contracts, open the saved `Name + .3mf` in Bambu Studio and verify the following.

- Units are not broken
- No scaling warnings pop up due to small individual parts during import
- body / rim / homing / legend maintain expected positional relationships
- Part names are identifiable as `body` / `rim` / `homing` / `legend` on the object list
- Homing bar and legends do not float in the air even with `pitch / roll`
- Stem does not penetrate through the top surface even with strong `pitch / roll`
- Even with `pitch / roll`, the concave / convex surface of cylindrical / spherical does not float from the top face, continuing seamlessly into the sides while tilted
- If legend is enabled, the text is visible and not buried
- Body and legend do not overlap on the same plane around flush legends
- If typewriter key rim is enabled, the rim is intact as a separate part from the body
- If homing bar is enabled, it is intact as a separate part
- If there are multiple parts, object separation is maintained

Color is treated as auxiliary information. Verify part separation and positional relationships first over whether the colors are visible.

## Execution Timing

- When `scad/base/` or `scad/modules/` is changed
- When the export UI / export execution path in `src/main.js` is changed
- When `src/lib/keycap-scad-bundle.js` is changed
- When `src/lib/export-3mf.js` is changed
- When runtimes or font assets are swapped

## Recording Destination

- Adopted decisions or critical verification results:
  `docs/decisions/decision-log.md`
- Unresolved issues or next extension tasks:
  `docs/backlog/`
