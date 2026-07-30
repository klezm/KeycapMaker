# src Directory Guide

`src/` contains the implementation of the main web app.

## What is Handled Here

- Parameter editing UI
- In-browser preview
- Connection with OpenSCAD runtime
- Export execution flow

## Current Main Files

- `main.js`: Main flow for UI, PoC, editor, and export
- `lib/keycap-scad-bundle.js`: Bundles SCAD assets into files for browser execution
- `lib/preview-scene.js`: Displays OFF meshes using Three.js

## Implementation Policy

- Do not assume server-side processing, as it is based on GitHub Pages
- Separate responsibilities of preview and export
- Separate UI parameters and SCAD geometric parameters

When starting implementation, first refer to Task 01 in [../docs/roadmap/implementation-plan.md](../docs/roadmap/implementation-plan.md).
