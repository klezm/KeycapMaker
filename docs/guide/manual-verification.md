# Manual Verification Procedure

## Purpose

This document summarizes the minimum items to check in the browser and in the slicer when changing the geometry contract, runtime, or export.

## Browser Verification

### 1. Initial Display

- The app opens without errors
- The initial preview is displayed
- The color picker and section switching are not broken

### 2. Editing Operations

Change the following representative values and confirm the preview does not break.

- `Width`
- `Top Center Height`
- `Add Key Rim`
- `Key Rim Width`
- `Upward Height`
- `Downward Height`
- `Front-to-Back Tilt`
- `Left-to-Right Tilt`
- `Tilt Input Method`
- `Keytop Surface`
- `Depth`
- the typewriter shape's `Top-Referenced Height`
- `Top Taper`
- `Add Keytop Legend`
- `Legend Text`
- switching `Legend Content` from `Text` to `Icon` hides the text input, typeface, and underline fields, and shows the icon set and icon search fields
- the magnifying glass button for `Icon` opens a search textbox and a scrollable selection list
- typing `volume` narrows the candidates in the currently selected icon set in real time, and selecting a candidate updates the selected icon name and the preview
- switching the icon set between Material Symbols, Font Awesome Free Solid, and Remix Icon updates the search candidates, external catalog link, and license notice to match the selected set
- icon legends also reflect `Legend Size`, `Weight Adjustment`, `Text Height`, position, and color
- increasing the text from `A` to `Shift` or `ShiftLock` does not automatically change the legend size unless `Legend Size` is touched
- the legend size changes only when `Legend Size` is changed
- `Typeface`
- below `Typeface`, a link to the selected font's page is shown with its favicon and page name, and opens the distribution/introduction page in a new tab
- the magnifying glass button for `Typeface` opens a search textbox and a scrollable selection list
- a `Built-in Fonts` / `My Fonts` segment control is shown at the top of the font selection list
- the `Built-in Fonts` segment shows only bundled fonts, and `Add Local Font` is not shown there
- choosing a TTF / OTF file from `Add Local Font` in the `My Fonts` segment adds the selected font as a `My Fonts` entry and applies it to the current legend
- dragging and dropping a TTF / OTF file onto the screen adds it to `My Fonts` rather than being treated as a project / JSON load
- while a My Font is selected, the local file name is shown along with a notice that the font itself is not bundled into the project ZIP or JSON
- pressing `Delete` while a My Font is selected reverts any legend using that font to the default font
- if a loaded JSON references an unloaded `user-font:*`, it is not silently replaced with the default font; instead the UI prompts to re-add the same TTF / OTF
- each font name in the selection list is rendered in that font
- typing `M PLUS` narrows the candidates in real time
- `M PLUS 1 Variable` can be selected from the candidates
- searching for `Noto Sans` / `Noto Sans JP` returns candidates
- searching for `Bangers` / `Creepster` / `Rye` / `Orbitron` returns candidates
- searching for `Art Gothic` returns `Grenze Gotisch Regular` and `MedievalSharp Regular` as candidates
- searching for `黒薔薇` returns `黒薔薇シンデレラ` as a candidate
- the actual copyright/license notice text is shown only while `黒薔薇シンデレラ` is selected
- the `Copy` button for `黒薔薇シンデレラ` can copy the notice text to the clipboard
- selecting `M PLUS 1 Variable` enables `Font Style`, allowing switching to named styles such as `Bold`
- selecting `Noto Sans Variable` / `Noto Sans JP Variable` enables `Font Style`, allowing switching to named styles such as `Bold`
- `Font Style` is disabled when a static font is selected
- selecting `Orbitron Regular` does not enable `Font Style`, and it stays on the Regular face
- turning on `Add Underline` changes the underline position and thickness per font, and in particular the line does not cut into the middle of the character with `M PLUS 1 Variable / Thin / A`
- with `Weight Adjustment = 0`, switching fonts does not introduce unintended thickening
- the outline changes only when `Weight Adjustment` is moved to a positive or negative value
- switching between `Bangers / A`, `Creepster / A`, `Rye / A`, and `Orbitron / A` does not break the preview
- switching between `Grenze Gotisch / A` and `MedievalSharp / A` does not break the preview
- the preview does not break around `黒薔薇シンデレラ / 鍵 / あ / 黒`
- with `Typeface = M PLUS Rounded 1c Regular` and text = `B / O / S`, the curves are not excessively angular
- for keys 2u or larger, increasing the `Legend Size` for `Digital` or `ShiftLock` shows the legend extending beyond the keytop footprint rather than being clipped
- `Add Homing Mark`
- `stemType`
- with the typewriter shape and the rim enabled, the body and rim are shown as distinct colors without visual breakage
- increasing or decreasing the typewriter shape's `Top-Referenced Height` changes only the mount portion up and down, without changing the thickness of the keytop body
- with `Upward Height = 0` and `Downward Height = 0`, the rim is flush with the keytop and shows no gaps or floating
- with `Upward Height = 0` and `Downward Height = 0`, the typewriter rim's side surface remains continuously exposed rather than being buried in the body
- there are no thin body-colored streaks or bleed-through on the outer surface of the typewriter rim
- increasing only `Upward Height` or `Downward Height` increases the outer dimensions and extends the rim in the corresponding direction
- raising `Left-to-Right Tilt` to around 28-32 degrees does not expose the stem on the top surface
- switching `Keytop Surface = Flat / Cylindrical / Spherical` does not break the preview
- for the typewriter shape, `Keytop Surface = Flat / Spherical` can be switched, and `Cylindrical` does not appear as an option
- `Depth` can be entered from `-1.5mm` to `+1.5mm` for both cylindrical and spherical; positive values produce a dish (recess), negative values produce a bulge (raised form) on the same cylindrical/spherical curved surface, and returning to 0 reverts to the flat equivalent
- for `Keytop Surface = Cylindrical / Spherical`, reducing the absolute value of `Depth` does not move the curve's start point toward the center; only the height changes, referenced to the outer perimeter
- switching between `Depth = +0.5` and `-0.5` (equal absolute values with opposite signs) produces mirror-image amounts of center recess and bulge, without changing the curvature or orientation of the cylindrical/spherical surface
- specifying a negative `Depth` for a 1u key, wide keys of 2u or larger, tall keys, and JIS Enter produces a natural convex surface that follows the top surface size, without increasing the key's outer dimensions
- combining a negative `Depth` with `Top Edge Radius`, the convex surface starts from the boundary between the rounded side and top surfaces, without a lip perpendicular to the perimeter, a two-step flat area, or extra height
- with a negative `Depth`, the inner ceiling and stem mount position remain the same as when flat, and the stem is not raised toward the top surface
- for both `Keytop Surface = Cylindrical` and `Spherical`, `Depth = ±1.5` is retained, values beyond `±1.5` are clamped symmetrically to the positive/negative limits, and the body / legend / homing bar are rendered
- with `Keytop Surface = Cylindrical / Spherical`, changing `Front-to-Back Tilt` and `Left-to-Right Tilt` keeps the curved surface visibly tilted rather than flattening it
- for both positive and negative values of `Keytop Surface = Cylindrical / Spherical`, there are no thin body-colored streaks or bleed-through on the legend's outline, and the legend is not empty for negative values
- facing the default flush legend to the front shows no body-colored flicker on the text face
- rounded outer edges, the dish, and the curved surface around the stem do not show excessively prominent per-face streaking
- edges that need a sharp ridge do not appear unnaturally rounded

### 3. Editor Data JSON

- change the `Name` at the top of the design tab to a clear, descriptive string
- add a copy of the currently edited keycap in the `Project` segment
- press the export button for the added keycap and save the `Editor Data JSON` from the overlay
- confirm the downloaded file name is `Name + .json`
- load the saved JSON via drag and drop
- confirm that after loading, the view switches to the project segment, the keycap is added to the keycap list, and the added keycap becomes the one being edited
- confirm that the preview and input fields revert accordingly
- prepare, under a different name, a compatible input JSON with a few fields removed from the saved JSON
- load the compatible input JSON via drag and drop
- confirm the loaded JSON is added to the keycap list and the added keycap becomes the one being edited
- confirm that removed fields are filled in from the shape defaults, and only the remaining fields are applied
- confirm that an existing text-legend JSON without icon fields is loaded with `Legend Content = Text`, preserving the existing `Legend Text` and font settings
- confirm that a JSON saved with `Legend Content = Icon`, `Icon = volume-2`, etc. is restored with the same icon selection after loading
- confirm that if `rimEnabled` or `legendEnabled` is set to false, re-enabling it restores the hidden values to their original defaults

### 4. Project

- open the `Project` segment
- confirm the project name can be changed
- add a copy of the currently edited keycap and confirm the preview image and keycap name appear in the list
- rotate the preview to an arbitrary angle, recapture the preview image for the active keycap, then confirm that changing parameters afterward still updates the list image at the same angle
- change the name or legend and add again, confirming multiple entries appear in the list
- grab the numbered order handle on a keycap list entry and drag it; confirm the cards shift with a move animation before the drop, each card keeps its original order number during the drag, and the order numbers update to their final values after the drop
- confirm that clicking a keycap in the list switches the current editing content and preview to that keycap
- confirm that pressing the export button for a keycap in the list opens an overlay with JSON / 3MF / STEP / STL options
- confirm that `Save Project` saves a project ZIP containing `KeycapMaker.json`, `keycaps/`, and `3mf/`
- drag and drop a saved project directory and confirm the project list and active keycap are restored
- drag and drop a saved project ZIP and confirm the project list and active keycap are restored after extraction
- with a project already loaded, drag and drop a single editor data JSON and confirm it is added as a new keycap while keeping the existing project list, with the added keycap becoming the one being edited
- load an editor data JSON containing parameters that cannot be applied to the current shape, and confirm that the JSON import report is displayed, that the report reappears after switching to another keycap and back, and that the `x` on each row removes only that parameter from the JSON to be saved

### 5. 3MF

- press the export button for a keycap in the list and save `3MF` from the overlay
- confirm the downloaded file name is `Name + .3mf`
- confirm the parent object name in the slicer matches `Name`

### 6. STEP

- press the export button for a keycap in the list and confirm that `STEP` is shown between `3MF` and `STL` in the overlay
- save `STEP` from the overlay
- confirm the downloaded file name is `Name + .step`
- confirm the saved STEP file opens as a STEP AP214 file containing `FACETED_BREP_SHAPE_REPRESENTATION`
- confirm that STEP does not include legend geometry even when the legend is enabled
- confirm that STEP loads as a single shape without colors or part separation
- confirm the UI shows guidance to use 3MF when colors or legends are needed

### 7. STL

- press the export button for a keycap in the list and save `STL` from the overlay
- confirm the downloaded file name is `Name + .stl`
- confirm that STL does not include legend geometry even when the legend is enabled
- confirm that STL loads as a single mesh without colors or part separation
- confirm the UI shows guidance to use 3MF when colors or legends are needed

## Bambu Studio Verification

When geometry or the export contract has changed, open the saved `Name + .3mf` in Bambu Studio and check the following.

- units are not broken
- no scale warning appears at import time due to a small standalone part
- body / rim / homing / legend maintain the expected positional relationship
- parts can be identified in the object list as `body` / `rim` / `homing` / `legend`
- the homing bar and legend do not float in midair when `pitch / roll` is applied
- the stem does not penetrate the top surface even with strong `pitch / roll` values
- the cylindrical/spherical dish/bulge surface does not float above the top face when `pitch / roll` is applied, remaining continuous with the tilted sidewall
- when the legend is enabled, the legend is visible and not buried
- around a flush legend, the body and legend do not overlap on the same plane
- when the typewriter key rim is enabled, the rim remains a separate part from the body without breaking apart
- when the homing bar is enabled, it remains a separate part without breaking apart
- when there are multiple parts, object separation is preserved

Color is treated as auxiliary information. Prioritize checking part separation and positional relationships over whether colors are visible.

## When to Run This

- when `scad/base/` or `scad/modules/` is changed
- when the export UI / export execution path in `src/main.js` is changed
- when `src/lib/keycap-scad-bundle.js` is changed
- when `src/lib/export-3mf.js` is changed
- when runtime or font assets are replaced

## Where to Record Results

- Adopted decisions or important verification results:
  `docs/decisions/decision-log.md`
- Unresolved issues or next extension tasks:
  `docs/backlog/`
