# Lucide Icons

- Package: `@lucide/icons`
- Runtime source: jsDelivr `@lucide/icons@latest`
- Fallback package version: `1.21.0`
- Source: https://lucide.dev/
- Repository: https://github.com/lucide-icons/lucide
- License: ISC, with MIT notices for Feather-derived icons as listed in `LICENSE`
- Use in this app: browser-side icon search and SVG legend generation

The app loads the latest Lucide icon data from jsDelivr when the browser is online.
Fetched icon nodes are sanitized and converted from stroke primitives to filled paths before being passed to OpenSCAD.
The installed package data remains only as a local fallback for tests and offline startup.
This directory keeps the upstream notice available in the published static site.
