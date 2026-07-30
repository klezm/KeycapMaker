# Project Data Specification

## Purpose

A project is a working unit that holds multiple keycaps currently being edited. A single edit data JSON is a format that restores only the keycap currently displayed. A project is treated as a directory format that bundles those JSONs and preview images.

## Directory Structure

A project is considered valid with the following structure:

```text
Project Name/
├── KeycapMaker.json
├── keycaps/
│   ├── <keycap>.json
│   └── <keycap>.png or <keycap>.svg
└── 3mf/
    └── <keycap>.3mf
```

- `KeycapMaker.json`
  Project manifest. Holds the project name, keycap list, currently selected keycap ID, and the JSON / preview paths for each keycap.
- `keycaps/*.json`
  Canonical editor data, same as the existing JSON for resuming edits.
- `keycaps/*.(png|svg|webp|jpg)`
  Preview image to display in the list in the project segment. Usually saves a scaled-down PNG of the current Three.js preview. If a preview cannot be obtained, saves an SVG placeholder.
- `3mf/*.3mf`
  3MF for printing each keycap. Generated from the edit values of each `keycaps/*.json` during project saving and bundled in the ZIP.

## Manifest

The current schema for `KeycapMaker.json` is as follows:

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

- `kind` is fixed to `keycap-maker/project`.
- `schemaVersion` is `1`. It is updated only when introducing incompatible changes.
- `jsonPath`, `previewPath`, `threeMfPath` are relative paths from the project directory.
- If the keycap name changes, `jsonPath`, `previewPath`, `threeMfPath` will track the current save name.
- `displayOrder` is the display order in the project segment. When saving, it is reassigned starting from 0 according to the current list order.
- `previewViewState` is the camera direction, distance, and view offset when the preview for the list was captured. It is optional.
- Edit values of the keycap itself are not duplicated in the manifest; each `keycaps/*.json` is the source of truth.
- If `activeKeycapId` exists, it is used as the current keycap immediately after loading. If it doesn't exist, the first item in the list is used.
- A project always has one or more keycaps. Upon initial display, the first keycap is created from the current edit values and made active. If a project with 0 items is loaded, 1 item is similarly supplemented. The last remaining item cannot be deleted.

## UI Behavior

Place `Project` on the far left of the segment control. The project segment holds:

- Project Name
- Keycap List
  - Displays the preview image and keycap name.
  - Clicking a keycap swaps it into the current edit target.
  - Has a display order, and can be reordered by grabbing and dragging the order handle. During drag, the list order is updated immediately before dropping, and existing cards move with animation. Each card retains its order number at the start of the drag, and is updated to its final order after drop / cancel.
  - Opens a selection overlay for JSON / 3MF / STEP / STL export from individual export buttons.
  - Add a copy of the keycap currently being edited.
- Save Project

If a keycap selected from the project list is edited, the JSON of that active keycap will track within the project. If a single JSON is dragged and dropped, the loaded content is added as a new item to the keycap list, and that keycap becomes the active keycap. The existing list of the loaded project is retained.

The preview for the list retains the `previewViewState` from when it was captured. Only when preview regeneration due to parameter changes of the active keycap is completed, the list image for that single item is recaptured with the same `previewViewState`. The capture angle itself is not changed, as drawing continues after returning to the camera state currently being manipulated. Image updates for inactive keycaps are not executed in parallel.

There is no traditional export segment; user-facing JSON / 3MF / STEP / STL exports are executed from individual overlays of keycaps in the project.

## Drag & Drop

If the dropped item is a directory:

1. Look for `KeycapMaker.json`
2. Validate the manifest
3. Read `keycaps/*.json` with the same parser as existing edit data JSON
4. Read the image at `previewPath` for list display
5. Make the active keycap or the first keycap the current edit target

If the dropped item is a JSON file:

- Load it as edit data JSON and reflect it in the current edit values.
- Add the loaded content to the keycap list, and make the added keycap the current edit target.
- Even if a project is already loaded, retain the existing project list.
- Even if it contains parameters that cannot be bound to the current shape, the corresponding fields of the original JSON are kept in `editorDataPayload` of the project keycap. A JSON load report is recalculated and displayed when that keycap is made active, and that path can be deleted from the JSON via the `x` in the report.

## Saving

Saving a project is always treated as a ZIP download. Inside the ZIP, `KeycapMaker.json`, `keycaps/`, and `3mf/` are stored with the same directory structure. For each keycap, the JSON for resuming edits, the preview for the list, and the 3MF for printing are bundled.

Direct writing to directories is not performed. This is to avoid browser differences during saving and permission differences with the File System Access API as a statically delivered app on GitHub Pages.

A saved ZIP can be loaded directly via drag & drop. When loading, it looks for `KeycapMaker.json` inside the archive, extracts `keycaps/` under the same root, and restores it as a project. Accepts `.zip` extension and filenames accidentally named `.zlp`.

## Implementation Locations

- `src/lib/project-data.js`
  Normalization of project manifest, paths, preview placeholders, and project keycap entries.
- `src/main.js`
  Project segment UI, directory / ZIP drag & drop, ZIP saving.
- `test/project-data.test.js`
  Checks manifest round-trip, path normalization, preview data URLs, and rejection of non-project JSONs.
