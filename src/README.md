# src Directory Guide

`src/` implements the web app itself.

## What Lives Here

- Parameter editing UI
- In-browser preview
- Connection to the OpenSCAD-based runtime
- Export execution flow

## Current Key Files

- `main.js`: the main flow for UI, PoC, editor, and export
- `lib/keycap-scad-bundle.js`: bundles the SCAD assets into files for browser execution
- `lib/preview-scene.js`: displays the OFF mesh using Three.js

## Implementation Guidelines

- Assume no server-side processing, since the target is GitHub Pages
- Keep preview and export responsibilities separate
- Keep UI parameters separate from SCAD geometry parameters

When starting implementation, first refer to Task 01 in [../docs/roadmap/implementation-plan.md](../docs/roadmap/implementation-plan.md).
