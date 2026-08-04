# Project data specification

## Purpose

A project is a unit of work that holds multiple keycaps being edited together. A single editor data JSON is a format that restores only the currently displayed keycap, whereas a project is treated as a directory format that bundles that JSON together with preview images.

## Directory structure

A project is defined to have the following structure.

```text
project-name/
├── KeycapMaker.json
├── keycaps/
│   ├── <keycap>.json
│   └── <keycap>.png or <keycap>.svg
└── 3mf/
    └── <keycap>.3mf
```

- `KeycapMaker.json`
  The project manifest. Holds the project name, the list of keycaps, the currently selected keycap ID, and the JSON / preview path for each keycap.
- `keycaps/*.json`
  The same canonical editor data as the existing resume-editing JSON.
- `keycaps/*.(png|svg|webp|jpg)`
  Preview images shown in the project segment's list. Normally a downscaled PNG of the current Three.js preview is saved; if a preview cannot be obtained, an SVG placeholder is saved instead.
- `3mf/*.3mf`
  The print-ready 3MF for each keycap. Generated from each `keycaps/*.json` file's edit values when the project is saved, and bundled into the ZIP.

## Manifest

The current schema of `KeycapMaker.json` is as follows.

```json
{
  "kind": "keycap-maker/project",
  "schemaVersion": 1,
  "name": "My Project",
  "savedAt": "2026-04-30T00:00:00.000Z",
  "activeKeycapId": "keycap-...",
  "keycaps": [
    {
      "id": "keycap-...",
      "name": "Esc",
      "jsonPath": "keycaps/Esc.json",
      "previewPath": "keycaps/Esc.png",
      "threeMfPath": "3mf/Esc.3mf",
      "displayOrder": 0,
      "previewViewState": {
        "direction": [0.62, 0.52, 0.58],
        "distanceScale": 2.3,
        "targetScale": [0, 0, 0],
        "viewOffsetRatio": [0, 0]
      }
    }
  ]
}
```

Rules:

- `kind` is fixed as `keycap-maker/project`.
- `schemaVersion` is `1`. Only updated when a backward-incompatible change is introduced.
- `jsonPath`, `previewPath`, and `threeMfPath` are relative paths from the project directory.
- If a keycap's name is changed, `jsonPath`, `previewPath`, and `threeMfPath` follow the current saved name.
- `displayOrder` is the display order in the project segment's list. When saving, it is renumbered starting from 0 according to the current list order.
- `previewViewState` is the camera direction, distance, and display offset at the time the list preview was captured. Optional.
- The keycap's own edit values are not duplicated into the manifest; each `keycaps/*.json` remains the source of truth.
- If `activeKeycapId` is present, it is used as the current keycap right after loading. If absent, the first item in the list is used.
- A project always holds one or more keycaps. On initial display, the first keycap is created from the current edit values and made active; likewise, if a project with zero keycaps is loaded, one keycap is supplemented in the same way. The last remaining keycap cannot be deleted.

## UI behavior

`Project` is placed at the leftmost position of the segmented control. The project segment has the following elements.

- Project name
- Keycap list
  - Shows the preview image and keycap name
  - Pressing a keycap swaps it into the current edit target
  - Has a display order that can be reordered via drag-and-drop by grabbing the order handle. During dragging, the list order updates immediately before the drop, and existing cards shift with a move animation to make room. Each card's order number keeps the value from the start of the drag, and updates to the final order after drop / cancel
  - Individual export buttons open a selection overlay for JSON / 3MF / STEP / STL
  - Adds a copy of the keycap currently being edited
- Save project

If a keycap selected from the project list is edited, that active keycap's JSON is kept in sync within the project. If a single JSON file is loaded via drag-and-drop, the loaded content is added as a new entry to the keycap list, and that keycap becomes the active keycap. The existing list of an already-loaded project is preserved.

The list preview keeps the `previewViewState` from when it was captured. Only when the preview regeneration triggered by a parameter change to the active keycap completes is that one list image recaptured with the same `previewViewState`. Rendering then returns to whatever camera state is currently being operated, so the capture angle itself is not changed. Image updates for non-active keycaps are not run in parallel.

There is no legacy export segment; user-facing JSON / 3MF / STEP / STL export is performed from the per-keycap overlay within the project.

## Drag and drop

If the dropped item is a directory:

1. Look for `KeycapMaker.json`
2. Validate the manifest
3. Load `keycaps/*.json` with the same parser as the existing editor data JSON
4. Load the `previewPath` image for display in the list
5. Make the active keycap, or the first keycap, the current edit target

If the dropped item is a JSON file:

- It is loaded as editor data JSON and applied to the current edit values.
- The loaded content is added to the keycap list, and the added keycap becomes the current edit target.
- If a project is already loaded, the existing project list is preserved.
- Even if the source JSON contains parameters that cannot be bound to the current shape, the corresponding fields are kept in the project keycap's `editorDataPayload`. When that keycap is made active, the JSON load report is recalculated and displayed, and the `×` in the report can be used to remove that path from the JSON.

## Saving

Saving a project is always treated as a ZIP download. The ZIP contains `KeycapMaker.json`, `keycaps/`, and `3mf/` in the same directory structure. For each keycap, the resume-editing JSON, the list preview image, and the print-ready 3MF are all bundled in.

Direct writes to a directory are not performed, in order to avoid differences in browser behavior and File System Access API permissions when saving, given that this is a static app served on GitHub Pages.

A saved ZIP can be loaded directly via drag-and-drop. On load, the app looks for `KeycapMaker.json` inside the archive, expands `keycaps/` under the same root, and restores it as a project. Both the `.zip` extension and filenames mistakenly saved as `.zlp` are accepted.

## Implementation location

- `src/lib/project-data.js`
  Normalization of the project manifest, paths, preview placeholders, and project keycap entries.
- `src/main.js`
  The project segment UI, directory / ZIP drag-and-drop, and ZIP saving.
- `test/project-data.test.js`
  Verifies manifest round-trips, path normalization, preview data URLs, and rejection of non-project JSON.
</content>
</invoke>
