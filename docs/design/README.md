# design Directory Guide

`docs/design/` is the place to put the source of truth for screen design. If you are unsure about the appearance or structure during implementation, refer to this first.

## Contents

- `Keycap_maker.pen`: Pencil original edit file. Treated as the source of truth when changing the design.
- `assets/`: Holds related assets referenced by `.pen`. The current rendering image `keycap-render.png` is also placed here.

## Operation Rules

- When changing the screen design, update `.pen` first, and update the preview image corresponding to that change as necessary.
- Match the UI on the implementation side with the contents of this directory, and if differences arise, judge based on `docs/design/`.
