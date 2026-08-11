# Keycap sets

Render a whole keyboard's worth of keycaps at once — a physical layout combined
with one or two languages — and export the set as a single 3MF. Available both
in the app's **Keyset** tab and from a CLI.

## In the app

Open the **Keyset** segment, choose a keyboard layout, a primary language and
optionally a secondary language, then press **Build keyset**. The board appears
in the preview as it renders, and the two export buttons save it as one 3MF.

Building a full-size board is roughly 210 OpenSCAD runs and takes about 45–60
seconds on a typical machine (it runs several workers in parallel, so it scales
with cores). Progress is shown while it works and the build can be cancelled.
Results are cached, so re-building after changing only some settings is faster.

Export needs no second render: the SCAD bridge passes no quality override, so
the preview and the export are the same geometry.

## From the CLI

```sh
npm install
npm run build:keyset                          # ISO-105, German + Hebrew
node scripts/build-keyset.mjs --arrange grid  # packed for a print bed
node scripts/build-keyset.mjs --layout ansi-104 --primary us --secondary none
```

Output goes to `out/` (not `dist/`, which `npm run build` empties).

| Flag | Meaning |
| --- | --- |
| `--layout <id>` | `iso-105` (default) or `ansi-104` |
| `--primary <lang>` | Primary language id. Default `de` |
| `--secondary <lang>\|none` | Secondary language id, or `none`. Default `il` |
| `--out <path>` | Output file |
| `--arrange board\|grid` | `board` (default) uses true keyboard positions; `grid` packs for a print bed |
| `--bed <mm>` | Bed width for `--arrange grid`. Default 250 |
| `--no-shine-through` | Solid legends with a body-colored floor instead of through-cuts |
| `--only <code,...>` | Build just these xkb key codes, e.g. `AC01,RTRN,SPCE` |
| `--jobs <n>` | Parallel OpenSCAD instances |

The CLI drives the same modules the app does — there is no second geometry path.

## What comes out

- One 3MF containing every keycap, each as a parent object with a `body`,
  a `legend`, and (where there is one) a `legend-right-bottom` part
- One `build` item per keycap carrying its placement transform
- `board` spans about 410 × 105 mm of key centers, wider than a common print
  bed; `grid` packs the same caps into about 241 × 217 mm with 2 mm gaps

## Layouts

`src/data/keysets/layouts/` holds the physical arrangements — position, size and
shape only. ANSI-104 differs from ISO-105 in four real ways: no key beside the
left shift (hence one fewer key), a single-row 2.25u Enter instead of the tall
notched ISO Enter, `BKSL` moved up to the end of the upper row at 1.5u, and a
2.25u left shift.

The ISO Enter uses the `jis-enter` geometry type, which the SCAD side already
describes as the JIS/ISO-family tall Enter: 1.5u × 2u with a 0.25u × 1u notch at
the bottom left. Its top half sits on the upper row and its bottom half on the
home row, which is what makes both rows total exactly 15u despite having
different key counts.

Key pitch is 19.05 mm and bodies are `units × 19.05 − 1.05` mm, so a 1u key is
18 mm — matching the `custom-shell` shape default. Homing bumps are on the two
index-finger keys and numpad 5.

## Languages

Layout and language are separate tables joined on the xkb key code, because the
same code moves: `BKSL` is `#` on the German ISO home row but `\` at the end of
the ANSI upper row.

`src/data/keysets/languages/*.json` is **generated**, not typed by hand:

```sh
node scripts/generate-keyset-languages.mjs          # regenerate
node scripts/generate-keyset-languages.mjs --check  # verify committed output
```

The generator resolves each layout with the real xkb toolchain
(`xkbcomp -w 0 -xkb`, which needs no X display) and maps the resulting keysyms
to Unicode through `/usr/include/X11/keysymdef.h`. It requires `xkbcomp`,
`xkb-data` and `libx11-dev`; the output is committed so the deployed static site
never needs any of them.

Currently generated: German, English (US), English (UK), French, Spanish,
Italian, Russian, Greek, Hebrew. The set is limited to scripts the bundled fonts
cover — Noto Sans handles Latin, Greek and Cyrillic, and Noto Sans Hebrew
handles Hebrew. Arabic, Thai and the Indic scripts would need fonts this repo
does not ship, and adding them without the fonts would produce blank caps. A
test asserts every legend glyph exists in whichever font will render it, so that
failure mode is caught rather than printed.

Two things the generator cannot supply:

- **Modifier words.** xkb reports `Control_L`, not "Strg". Those live in
  `src/data/keysets/modifier-labels.js`. German and English are authored; other
  languages fall back to English, so a French set currently shows "Ctrl / Shift
  / Enter" rather than "Ctrl / Maj / Entrée". Adding a language is one more
  entry in that file.
- **Arrow glyphs.** Noto Sans has none, so any legend containing `← ↑ ↓ → ↵` is
  routed to M PLUS 1p, which covers both the arrows and the Latin labels.

Only the unshifted base character of each key is legended; shifted and AltGr
symbols are left off, which keeps one string per key.

### Secondary legends

A secondary legend is only engraved when the character is in that language's own
script. Every layout puts shared punctuation on the letter block — SI-1452 has
`/`, `'`, `[`, `]`, `,`, `.` and `\` among the Hebrew letters — and repeating
those beside the primary legend is noise. Unicode script properties draw the
line, since digits and ASCII punctuation are `Script=Common`.

So German + Hebrew yields exactly the 27 Hebrew letters (including the five
final forms ך ם ן ף ץ), German + Russian yields 33 Cyrillic letters, and German
+ French yields only the 11 keys where the Latin letter actually differs.

SI-1452 is positional: it assigns Hebrew letters to *physical key positions*,
not to Latin letters. On QWERTZ the key that types `z` carries ט and the key
that types `y` carries ז.

## Shine-through and the light path

Shine-through cuts the legend clean through the top wall, and the legend part is
the exact insert that fills it (see the legend section of
[../architecture/scad-and-export.md](../architecture/scad-and-export.md)). Print
the body opaque and the inserts translucent.

Cutting the hole is not by itself enough to light a legend: an MX stem is a
hollow cylinder whose wall blocks the light path in four diagonal quadrants from
roughly 1 mm to 2.75 mm out from the key center. The clear cross at the very
center is the switch slot, too narrow to light a glyph. Legends are therefore
placed outside that ring — shifted north on single-legend keys, and split into
upper-left primary / lower-right secondary on bilingual keys. This is also why
real backlit boards use north-facing legends.

With that placement, every single-character legend has a fully unobstructed
light path, which `test/keycap-legend-shine-through.test.js` asserts by
ray-casting through the built meshes. Multi-letter words such as `Feststell` are
wider than the clear annulus, so part of those still sits over the stem; that is
inherent to putting a long word on a 1u cap with a stem underneath.

## Performance notes

Deduplication by geometry signature saves less than it looks like it should. A
legend is *cut into* the body — a shine-through legend punches through it, a
flush one recesses into it — so two caps with different legends do not share a
body. Only genuinely identical caps collapse, such as the two `Strg` keys. An
ISO-105 German+Hebrew board goes from 236 parts to about 213 jobs; the real
speed-up comes from the worker pool in `src/lib/openscad-client.js`.
