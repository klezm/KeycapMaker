# keyboard-layouts

Enumerates the keyboard layout variations that exist, and resolves the legends that belong on each physical keycap, so a keycap set can be modelled and printed for a specific layout.

```
npm run layouts -- board de
npm run layouts -- layouts --form-factor jis
npm run layouts -- keys de --level 3
```

## What it answers

- Which **languages** and **countries** have a keyboard layout (ISO 639 / ISO 3166)
- Which **layouts** and **variants** exist (`de`, `de:nodeadkeys`, `us:dvorak`, …)
- Which **physical form factor** a layout is printed on: ANSI 104, ISO 105, JIS 109, ABNT‑2 106
- Which **models** and **layout options** xkeyboard-config knows about
- For every key on the board: its position and size, and the text for every modifier level — base, Shift, AltGr, Shift+AltGr

## Commands

| Command | Purpose |
| --- | --- |
| `languages`, `countries` | list languages / countries that have a layout |
| `layouts` | list layouts, filterable by `--language`, `--country`, `--form-factor` |
| `variants <layout>` | list the variants of one layout |
| `models`, `options`, `form-factors` | list keyboard models, layout options, physical form factors |
| `show <layout>[:<variant>]` | summarize one layout variant |
| `keys <layout>[:<variant>]` | every key with its modifier levels, optionally one `--level` |
| `board <layout>[:<variant>]` | **the print target**: every physical key with geometry and keycap legends |
| `generate` | rebuild `data/` from the local xkeyboard-config installation |

`--json` prints the raw structure instead of a table. `--cluster main|function|navigation|numpad` narrows `board`.

## Where the data comes from

Everything is derived from **xkeyboard-config**, read from the local system at generate time — nothing is downloaded.

| Source | Used for |
| --- | --- |
| `rules/base.xml`, `rules/base.extras.xml` | layouts, variants, models, options, languages, countries |
| `symbols/` | which keysym each key produces at each level |
| `types/` | which modifier produces each level (`Base`, `Shift`, `AltGr`, `Shift AltGr`) |
| `keycodes/evdev`, `keycodes/aliases` | canonical key names, so `AC12`/`BKSL` and `HZTG`/`TLDE` collapse onto one physical key |
| `/usr/include/X11/keysymdef.h` | keysym → Unicode character |

Every keymap is composed the way the rules file specifies: the shared `pc` symbols first, then the layout and variant on top.

To rebuild after an xkeyboard-config upgrade:

```
npm run layouts -- generate            # or: --xkb-root /path/to/xkb
```

The generator writes to a staging directory and renames it, so a failed run never leaves a half-written snapshot. Output is minified with stable ordering, so regenerating on the same input is byte-identical.

## Files

```
cli.js                       CLI entry point
generate-snapshot.js         rebuilds data/ from xkeyboard-config
keyboard-layout-catalog.js   runtime module - pure ESM, no node: imports, usable in a browser
lib/                         parsers and resolvers used by the generator
boards/                      hand-authored physical board geometry (source, not generated)
data/                        generated snapshot (committed)
```

`boards/*.json` are **hand-authored** and are never overwritten by `generate`. `data/*` is **generated** and should only be changed by running `generate`.

## Board geometry

One file per form factor. Positions and sizes are in key units (`u`, 19.05 mm), with `x`/`y` measured from the top-left of the board.

```json
{ "keycode": "RTRN", "cluster": "main", "row": 2, "x": 13.5, "y": 2.5,
  "width": 1.5, "height": 1, "shape": "iso-enter",
  "secondaryRect": { "x": 13.75, "y": 3.5, "width": 1.25, "height": 1 } }
```

The L-shaped ISO and JIS Enter is described as two rectangles rather than one bounding box, so it does not overlap the key below it. `shape` matches the existing `jis-enter` keycap shape in `src/data/keycap-shapes/`. `fallbackLabel` supplies a legend for keys that XKB gives no printable symbol.

To adjust a board, edit its JSON directly — the tests assert key counts, unique keycodes, and that no two key footprints overlap.

## Keycap legends

`board` returns five legend slots per key, named to match the editor's keytop fields:

| Slot | Content |
| --- | --- |
| `legend` | centre — the capital of a cased key, or a named key's label (`Enter`, `Space`) |
| `topLegendLeftBottom` | level 1, Base |
| `topLegendLeftTop` | level 2, Shift |
| `topLegendRightBottom` | level 3, AltGr |
| `topLegendRightTop` | level 4, Shift+AltGr |

A cased key collapses levels 1–2 into one centred capital instead of printing `q` and `Q`. A repeated legend is printed once. Dead keys print their spacing glyph (`^`, `´`, `¨`) and stay flagged `dead: true`. Each slot records the `level`, `modifier` and `keysym` it came from, so nothing is lost.

## Deliberate limits

- **Four levels.** Base, Shift, AltGr, Shift+AltGr. Layouts that go deeper (German Neo 2, Bone) are truncated and flagged `truncatedLevels` with a `totalLevels` count — never silently cut.
- **Group 1 only.** Multi-group layouts and layout combinations (`us,ru`) are out of scope; a keycap shows one group.
- **Ignored XKB constructs.** `modifier_map`, `virtual_modifiers`, `interpret`. An `augment` include would be merged as an override and is reported as a warning; the current xkeyboard-config uses none.
- **Form factor is partly regional.** A layout that does not redefine the key left of Z inherits it from `pc`, so absence proves nothing. Symbol evidence is used first (yen and kana keys ⇒ JIS, the key right of the period ⇒ ABNT, an explicit key left of Z ⇒ ISO); otherwise the layout's primary country decides. Every entry records `formFactorSource` (`symbols`, `region`, `default`, `override`) so guesses are visible. `FORM_FACTOR_OVERRIDES` in `lib/form-factor.js` corrects individual cases.
- **13 unmapped keysyms.** `symbols/in` encodes a few keysyms as Unicode C1 control codepoints upstream. They are listed in `catalog.unmappedKeysyms`, and the keysym name is kept in the keymap, so the data is not lossy.
- **ABNT‑2 is modelled as 106 physical keys** (ISO 105 plus the key right of the period). It is often quoted as 107 by counting the numpad comma as a separate scancode; xkeyboard-config models that key as the numpad decimal, and this tool follows the physical board.

## Using the data from the browser

`keyboard-layout-catalog.js` imports nothing from `node:`. It takes the snapshot plus two loader functions, so the caller decides how files are fetched:

```js
const catalog = createLayoutCatalog(
  await (await fetch("catalog.json")).json(),
  { keysyms, keyTypes },
  {
    loadKeymap: async (layout) => (await fetch(`keymaps/${layout}.json`)).json(),
    loadBoard: async (formFactor) => (await fetch(`boards/${formFactor}.json`)).json(),
  },
);
const board = await catalog.resolveBoard("de", "");
```

The catalog is small and always loaded; per-layout keymaps are loaded on demand. Every snapshot file carries a `schemaVersion` that is validated on load and throws on mismatch.
