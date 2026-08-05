# Fonts

For the legend typeface selection, only fonts whose license clearly permits bundling with and serving from the frontend are used.

## Lightweight intake rules

- Only bundle fonts whose redistribution and web delivery are explicitly permitted.
- Keep the applicable license text, or a note on the distributor's usage terms, in the same directory as the font file.
- Record the distribution URL, the acquisition or review date, the bundled filenames, font metadata, and the SHA-256 hash in a `*-SOURCE.txt` file or equivalent provenance note.
- Fetch from a commit/tag-pinned URL whenever possible. For existing assets whose original acquisition date was never recorded, record the review date and the date first added in Git.
- Do not subset, convert formats, or alter glyphs as a rule. If that's needed, treat the result as a separate font and re-check the Reserved Font Name and license terms.
- For fonts that require UI attribution, put the actual attribution text into the font definition rather than a generic warning.
- After adding or updating a font, run `.codex/skills/keycap-font-addition/scripts/validate-font-assets.mjs` to verify consistency between the registration, bundled files, provenance, license text, SHA-256, and TTF metadata.

- `MPLUS1-Variable.ttf`
  - Display name: `M PLUS 1 Variable`
  - OpenSCAD name: `M PLUS 1`
  - Usage policy: variable font. Named styles are selectable from `Thin` to `Black`.
  - Source: M+ FONTS official `fonts/MPLUS1/variable/MPLUS1[wght].ttf`
  - Info page: https://fonts.google.com/specimen/M%2BPLUS%2B1
  - License: `MPLUS1-OFL.txt`
  - Source note: `MPLUS1-SOURCE.txt`

- `MPLUS1p-Regular.ttf`
  - Display name: `M PLUS 1p Regular`
  - OpenSCAD name: `M PLUS 1p`
  - Source: Google Fonts `ofl/mplus1p`
  - Info page: https://fonts.google.com/specimen/M%2BPLUS%2B1p
  - License: `MPLUS1p-OFL.txt`
  - Source note: `MPLUS1p-SOURCE.txt`

- `NotoSans-Variable.ttf`
  - Display name: `Noto Sans Variable`
  - OpenSCAD name: `Noto Sans`
  - Usage policy: variable font. Named styles are selectable from `Thin` to `Black`.
  - Source: Google Fonts `ofl/notosans`
  - Info page: https://fonts.google.com/noto/specimen/Noto%2BSans
  - License: `NotoSans-OFL.txt`
  - Source note: `NotoSans-SOURCE.txt`

- `NotoSansJP-Variable.ttf`
  - Display name: `Noto Sans JP Variable`
  - OpenSCAD name: `Noto Sans JP`
  - Usage policy: variable font. Named styles are selectable from `Thin` to `Black`.
  - Source: Google Fonts `ofl/notosansjp`
  - Info page: https://fonts.google.com/noto/specimen/Noto%2BSans%2BJP
  - License: `NotoSansJP-OFL.txt`
  - Source note: `NotoSansJP-SOURCE.txt`

- `MPLUSRounded1c-Regular.ttf`
  - Display name: `M PLUS Rounded 1c Regular`
  - OpenSCAD name: `M PLUS Rounded 1c`
  - Source: Google Fonts `ofl/mplusrounded1c` / M+ FONTS for Google Fonts
  - Info page: https://fonts.google.com/specimen/M%2BPLUS%2BRounded%2B1c
  - License: `MPLUSRounded1c-OFL.txt`
  - Source note: `MPLUSRounded1c-SOURCE.txt`

- `DotGothic16-Regular.ttf`
  - Display name: `DotGothic16 Regular`
  - OpenSCAD name: `DotGothic16`
  - Source: Google Fonts `ofl/dotgothic16`
  - Info page: https://fonts.google.com/specimen/DotGothic16
  - License: `DotGothic16-OFL.txt`
  - Source note: `DotGothic16-SOURCE.txt`

- `KurobaraCinderella-Regular.ttf`
  - Display name: `黒薔薇シンデレラ`
  - OpenSCAD name: `kurobara-cinderella`
  - Usage policy: static font. Used as a spiked Japanese gothic display face for Japanese legends.
  - Source: MODI Factory `font_kurobara-cinderella.php`
  - Info page: https://modi.jpn.org/font_kurobara-cinderella.php
  - License: `KurobaraCinderella-MODI.txt` and `MPLUS1-OFL.txt`

- `Bangers-Regular.ttf`
  - Display name: `Bangers Regular`
  - OpenSCAD name: `Bangers`
  - Usage policy: static font. Used for short legends as a comic-cover-leaning display face.
  - Source: Google Fonts `ofl/bangers`
  - Info page: https://fonts.google.com/specimen/Bangers
  - License: `Bangers-OFL.txt`
  - Source note: `Bangers-SOURCE.txt`

- `Creepster-Regular.ttf`
  - Display name: `Creepster Regular`
  - OpenSCAD name: `Creepster`
  - Usage policy: static font. Used for short legends as a horror-movie-title-leaning display face.
  - Source: Google Fonts `ofl/creepster`
  - Info page: https://fonts.google.com/specimen/Creepster
  - License: `Creepster-OFL.txt`
  - Source note: `Creepster-SOURCE.txt`

- `Rye-Regular.ttf`
  - Display name: `Rye Regular`
  - OpenSCAD name: `Rye`
  - Usage policy: static font. Used for short legends as a western-poster-leaning display face.
  - Source: Google Fonts `ofl/rye`
  - Info page: https://fonts.google.com/specimen/Rye
  - License: `Rye-OFL.txt`
  - Source note: `Rye-SOURCE.txt`

- `Orbitron-Variable.ttf`
  - Display name: `Orbitron Regular`
  - OpenSCAD name: `Orbitron`
  - Usage policy: the variable font's distribution package is bundled, but the current UI treats it as the family's default Regular face.
  - Source: Google Fonts `ofl/orbitron`
  - Info page: https://fonts.google.com/specimen/Orbitron
  - License: `Orbitron-OFL.txt`
  - Source note: `Orbitron-SOURCE.txt`

- `GrenzeGotisch-Variable.ttf`
  - Display name: `Grenze Gotisch Regular`
  - OpenSCAD name: `Grenze Gotisch`
  - Usage policy: the variable font's distribution package is bundled, but the current UI treats it as the family's default Regular face.
  - Category: an easy-to-find approximate candidate for an `Art Gothic` search. A blackletter-leaning display face.
  - Source: Google Fonts `ofl/grenzegotisch`
  - Info page: https://fonts.google.com/specimen/Grenze%2BGotisch
  - License: `GrenzeGotisch-OFL.txt`
  - Source note: `GrenzeGotisch-SOURCE.txt`

- `MedievalSharp-Regular.ttf`
  - Display name: `MedievalSharp Regular`
  - OpenSCAD name: `MedievalSharp`
  - Usage policy: static font. Used for short legends as a stone-inscription-leaning gothic display face.
  - Category: an easy-to-find approximate candidate for an `Art Gothic` search.
  - Source: Google Fonts `ofl/medievalsharp`
  - Info page: https://fonts.google.com/specimen/MedievalSharp
  - License: `MedievalSharp-OFL.txt`
  - Source note: `MedievalSharp-SOURCE.txt`

Static fonts use the face exactly as named in the file; no pseudo-italic/slanted/bold is applied. Any explicit outline adjustment is done only through the UI's numeric inputs.

`Add underline` uses the `UnderlinePosition` and `UnderlineThickness` values from the font file's `post` table. When font metadata isn't available, it does not fall back to an arbitrary value — no underline is drawn instead.

All of these are used for the legend's `text()` generation. The additional display faces are mainly intended for short legends. `黒薔薇シンデレラ` is treated as a Japanese display face that includes Japanese characters; the MODI distributor's usage terms and the note on its M+ FONTS derivation are kept in `KurobaraCinderella-MODI.txt`. `Art Gothic` itself is not bundled in this repository; instead, an approximate candidate from an OFL distribution with clear redistribution terms is included.
