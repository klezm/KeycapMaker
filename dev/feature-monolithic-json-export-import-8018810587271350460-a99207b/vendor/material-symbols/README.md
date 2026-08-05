# Material Symbols

- Icon set: Material Symbols by Google
- Data package: `@iconify-json/material-symbols`
- Runtime source: jsDelivr `@iconify-json/material-symbols@latest`
- Fallback data package version: `1.2.79`
- Source: https://fonts.google.com/icons
- Iconify package page: https://icon-sets.iconify.design/material-symbols/
- License: Apache License 2.0, see `LICENSE`
- Use in this app: browser-side icon search and SVG legend generation
- Runtime subset: default Material Symbols shapes; rounded and sharp variants are omitted; outline shapes are paired with base filled shapes when available

The app loads the latest Material Symbols icon data from jsDelivr when the browser is online.
Fetched SVG bodies are sanitized before being passed to OpenSCAD.
The generated installed-package subset remains only as a local fallback for tests and offline startup.
This directory keeps the upstream license notice available in the published static site.
