# Font Awesome Free Solid Icons

- Package: `@fortawesome/free-solid-svg-icons`
- Runtime source: jsDelivr `@fortawesome/free-solid-svg-icons@latest`
- Fallback package version: `7.2.0`
- Source: https://fontawesome.com/
- Free icon search: https://fontawesome.com/search?ic=free&s=solid
- License: icons are CC BY 4.0, code is MIT, see `LICENSE.txt`
- Use in this app: browser-side icon search and SVG legend generation
- Runtime subset: SVG path data and string aliases from the Free Solid package

The app loads the latest Free Solid package module from jsDelivr when the browser is online.
Fetched path data is validated before being passed to OpenSCAD.
The generated installed-package path data remains only as a local fallback for tests and offline startup.
Font Awesome Free SVG/JS icons require attribution under CC BY 4.0.
This directory keeps the upstream notice available in the published static site.
