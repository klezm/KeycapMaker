# ISO-105 German + Hebrew keycap set

Builds one 3MF holding a full-size ISO 105-key keycap set, with German primary
legends, Hebrew secondary legends, and shine-through legends for LED backlight.

## Building it

```sh
npm install
node scripts/build-iso-de-he-keyset.mjs                       # keyboard layout
node scripts/build-iso-de-he-keyset.mjs --arrange grid        # print-ready plate
```

Output goes to `out/` (not `dist/`, which `npm run build` empties). A full run is
about 105 keycaps x 2-3 OpenSCAD invocations and takes roughly 70 seconds on four
cores.

| Flag | Meaning |
| --- | --- |
| `--out <path>` | Output file. Default `out/iso-105-de-he-keyset.3mf` |
| `--arrange board\|grid` | `board` (default) uses true keyboard positions; `grid` packs for a print bed |
| `--bed <mm>` | Bed width for `--arrange grid`. Default 250 |
| `--no-shine-through` | Solid legends with a body-colored floor instead of through-cuts |
| `--only <id,...>` | Build just these key ids - useful for a quick check |
| `--jobs <n>` | Parallel OpenSCAD instances. Defaults to the core count, capped at 8 |

The script drives the same `src/lib/keycap-scad-bundle.js` the app uses, loaded
through Vite's SSR module runner so its `?raw` SCAD imports resolve, and the same
bundled OpenSCAD WASM build. There is no second geometry path: what this produces
is what the app produces.

## What comes out

- 105 keycaps, each a parent object with `body`, `legend`, and (on 27 keys) a
  `legend-right-bottom` part - 236 parts total
- One `build` item per keycap, carrying that cap's placement transform
- `board` arrangement spans about 410 x 105 mm of key centers, which is wider
  than a common print bed; `grid` packs the same caps into about 241 x 217 mm
  with 2 mm between neighbours

## Legends

Both legend tables are read from the `xkb-data` package rather than transcribed
by hand, and `src/data/keysets/iso-105-de-he.js` cites the source line for each:

- German: `/usr/share/X11/xkb/symbols/de`, `xkb_symbols "basic"`
- Hebrew: `/usr/share/X11/xkb/symbols/il`, `xkb_symbols "basic"`, described there
  as "an implementation of the Israeli standard SI-1452 (2013)"

Only the unshifted base character of each key is legended; shifted and AltGr
symbols are left off, which keeps one string per key.

SI-1452 assigns Hebrew letters to **physical key positions**, not to Latin
letters. German is QWERTZ, so the key that types `z` carries ט and the key that
types `y` carries ז - following position, not letter. All 27 Hebrew letters
appear, including the five final forms (ך ם ן ף ץ). Every Hebrew legend is a
single character, so `text()` never has to resolve right-to-left run ordering.

Fonts: German uses Noto Sans, Hebrew uses the bundled Noto Sans Hebrew. Noto Sans
has no arrow glyphs, so keys German boards label with arrows (`←`, `↑`, `↓`, `→`,
`↵`) fall back to M PLUS 1p, which covers both the arrows and every Latin label
used here. A test asserts every legend glyph exists in whichever font will render
it, so a missing glyph fails the build rather than printing a blank cap.

## Shine-through and the light path

Shine-through cuts the legend clean through the top wall, and the legend part is
the exact insert that fills it (see the legend section of
[../architecture/scad-and-export.md](../architecture/scad-and-export.md)). Print
the body opaque and the inserts translucent.

Cutting the hole is not by itself enough to light a legend: an MX stem is a
hollow cylinder whose wall blocks the light path in four diagonal quadrants from
roughly 1 mm to 2.75 mm out from the key center. The clear cross at the very
center is the switch slot, too narrow to light a glyph. Legends are therefore
placed outside that ring - shifted north on single-legend keys, and split into
upper-left German / lower-right Hebrew on the bilingual keys. This is also why
real backlit boards use north-facing legends.

With that placement, every single-character legend - all the alphanumerics and
all 27 Hebrew letters - has a fully unobstructed light path, which
`test/keycap-legend-shine-through.test.js` asserts by ray-casting through the
built meshes. Multi-letter German words such as `Feststell` and `Umschalt` are
wider than the clear annulus, so part of those still sits over the stem; that is
inherent to putting a long word on a 1u cap with a stem underneath.

## Layout notes

Key pitch is 19.05 mm and bodies are `units * 19.05 - 1.05` mm, so a 1u key is
18 mm - matching the `custom-shell` shape default.

The ISO Enter uses the `jis-enter` geometry type, which the SCAD side already
describes as the JIS/ISO-family tall Enter footprint: 1.5u x 2u with a
0.25u x 1u notch at the bottom left. Its top half sits on the QWERTZ row and its
bottom half on the home row, which is what makes both rows total exactly 15u
despite having different key counts.

Homing bumps are on `F`, `J`, and numpad `5`.
