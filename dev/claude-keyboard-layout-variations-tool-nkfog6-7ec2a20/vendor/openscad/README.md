# Bundled OpenSCAD WASM

- Bundled location: `public/vendor/openscad/`
- Purpose: the WebAssembly runtime for running OpenSCAD in the browser
- Source: `https://files.openscad.org/playground/OpenSCAD-2025.03.25.wasm24456-WebAssembly-web.zip`
- Related projects:
  - OpenSCAD Playground: `https://github.com/openscad/openscad-playground`
  - OpenSCAD WASM Port: `https://github.com/DSchroer/openscad-wasm`

## Why it's bundled

- So it can run on GitHub Pages without depending on an external distribution source
- To keep app implementation and ongoing maintenance sustainable from within this repository alone

## License

- `COPYING` is included
- Before production use, a human should do a final check of the distribution terms and their license impact on the app as a whole
