# Remix Icon

- Package: `remixicon`
- Runtime source: jsDelivr `remixicon@latest`
- Fallback package version: `4.9.1`
- Source: https://remixicon.com/
- Repository: https://github.com/Remix-Design/remixicon
- License: Remix Icon License v1.0, see `LICENSE`
- Use in this app: browser-side icon search and SVG legend generation
- Runtime subset: SVG path data parsed from `fonts/remixicon.symbol.svg`

The app loads the latest Remix Icon symbol SVG from jsDelivr when the browser is online.
Fetched SVG bodies are sanitized before being passed to OpenSCAD.
The generated installed-package path data remains only as a local fallback for tests and offline startup.
The current upstream license permits using icons as functional or decorative elements in larger works, while prohibiting standalone icon-pack resale, competing icon libraries, and logo/trademark use.
This directory keeps the upstream notice available in the published static site.
