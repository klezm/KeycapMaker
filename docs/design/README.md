# design directory guide

`docs/design/` is where the source of truth for the screen design lives. When in doubt about appearance or structure during implementation, check here first.

## Contents

- `Keycap_maker.pen`: the Pencil source file. Treated as the source of truth when the design changes
- `assets/`: holds the related assets referenced by the `.pen` file. The current render image `keycap-render.png` is also placed here

## Operating rules

- When the screen design changes, update the `.pen` file first, and update the corresponding preview image as needed
- The implementation-side UI should match the contents of this directory; if a discrepancy arises, `docs/design/` is the basis for the decision
