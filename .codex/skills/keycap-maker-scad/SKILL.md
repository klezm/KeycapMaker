---
name: keycap-maker-scad
description: Extend and maintain Keycap Maker's modular OpenSCAD assets under `scad/` and the browser parameter bridge that feeds them. Use when Codex needs to work on this repository's keycap-specific structure, including body/legend split, preview/export separation, `scad/base` vs `scad/modules` placement, presets, samples, or the `src/lib/keycap-scad-bundle.js` `-D` parameter mapping.
---

# Keycap Maker Scad

## Quick Start

1. Use `$openscad-authoring` for standard OpenSCAD syntax and geometry decisions.
2. Read [references/repo-conventions.md](references/repo-conventions.md) before editing any `scad/` asset in this repository.
3. Confirm which layer you are changing:
   - `scad/base/` for export entrypoints and whole-key orchestration.
   - `scad/modules/` for reusable geometry pieces.
   - `scad/presets/` for defaults and parameter sets.
   - `scad/samples/` for regression fixtures and minimal examples.
4. Preserve the repo's core design choices:
   - separation of responsibilities between preview and export
   - keeping body and legend as separate volumes
   - separation of UI parameters and SCAD geometry parameters
5. If a parameter crosses the app boundary, inspect `src/lib/keycap-scad-bundle.js` and keep the `-D` bridge aligned.

## Repo Rules

- Keep `scad/base/keycap.scad` style orchestration explicit: entry module, body module, legend module, preview module, and export target selection.
- Prefer adding a new module file over expanding `base/` with low-level geometry.
- Use `include` for preset/default value files and `use` for reusable geometry modules.
- Keep origin and Z-baseline consistent across body, legend, and subtractive features.
- Treat legend geometry as an explicit body unless the task specifically requires union or engraving.
- When introducing text legends, document font source and leave final font-license confirmation to the human reviewer.

## Change Workflow

1. Read the relevant repo docs called out in [references/repo-conventions.md](references/repo-conventions.md).
2. Inspect adjacent `scad/` files before deciding where a change belongs.
3. Keep preview/export and body/legend behavior explicit in code structure, not implicit in scattered conditionals.
4. Add or update a sample under `scad/samples/` for non-trivial geometry changes.
5. If app-exposed parameters change, update the `user_*` / `-D` wiring consistently.

## Output Expectations

- Return edits that preserve the modular split of this repository.
- Mention when a requested change conflicts with preview/export separation or body/legend separation.
- Prefer small additive changes to existing `scad/modules/` and `scad/presets/` assets over large rewrites.
