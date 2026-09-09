# tools Directory Guide

`tools/` holds standalone Node utilities that support the app but are not part of the deployed bundle. Nothing here is imported by `src/`, and nothing here is included in the Vite build.

## Contents

- `keyboard-layouts/`: enumerates every keyboard layout variation (language, country, layout, variant, physical form factor) and resolves the legends that belong on each keycap

## Conventions

- Each tool is plain ESM with no dependencies beyond the Node standard library
- Each tool exposes a CLI entry point registered as an npm script in `package.json`
- Generated data is committed, because GitHub Pages has no server-side processing and the browser cannot run a generator
