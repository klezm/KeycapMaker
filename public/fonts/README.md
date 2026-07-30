# Fonts

When selecting fonts for printing, we only use those with licenses that allow them to be bundled and delivered to the frontend.

## Lightweight Incorporation Rules

- Bundle only fonts that explicitly permit redistribution and web delivery.
- Leave the text of the applicable license or the distributor's terms of use memo in the same directory as the font file.
- Leave the distributor URL, acquisition date or review date, bundled filenames, font metadata, and SHA-256 in `*-SOURCE.txt` or equivalent provenance note.
- Acquire using URLs fixed by commit / tag as much as possible. For existing assets where the original acquisition date is unrecorded, record the review date and the initial addition date on Git.
- Subsetting, format conversion, and glyph modification are generally not performed. If necessary, treat it as a separate font and reconfirm the Reserved Font Name and license conditions.
- For fonts that require attribution on the UI, include the actual notation text in the font definition, not abstract warnings.
- When a font is added or updated, execute `.codex/skills/keycap-font-addition/scripts/validate-font-assets.mjs` to check the consistency of registration, bundled files, provenance, license text, SHA-256, and TTF metadata.

- `MPLUS1-Variable.ttf`
  - Display Name: `M PLUS 1 Variable`
  - OpenSCAD Name: `M PLUS 1`
  - Usage Policy: variable font. named style is selected from `Thin` to `Black`.
  - Source: M+ FONTS Official `fonts/MPLUS1/variable/MPLUS1[wght].ttf`
  - View Page: https://fonts.google.com/specimen/M%2BPLUS%2B1
  - License: `MPLUS1-OFL.txt`
  - Source Memo: `MPLUS1-SOURCE.txt`

- `MPLUS1p-Regular.ttf`
  - Display Name: `M PLUS 1p Regular`
  - OpenSCAD Name: `M PLUS 1p`
  - Source: Google Fonts `ofl/mplus1p`
  - View Page: https://fonts.google.com/specimen/M%2BPLUS%2B1p
  - License: `MPLUS1p-OFL.txt`
  - Source Memo: `MPLUS1p-SOURCE.txt`

- `NotoSans-Variable.ttf`
  - Display Name: `Noto Sans Variable`
  - OpenSCAD Name: `Noto Sans`
  - Usage Policy: variable font. named style is selected from `Thin` to `Black`.
  - Source: Google Fonts `ofl/notosans`
  - View Page: https://fonts.google.com/noto/specimen/Noto%2BSans
  - License: `NotoSans-OFL.txt`
  - Source Memo: `NotoSans-SOURCE.txt`

- `NotoSansJP-Variable.ttf`
  - Display Name: `Noto Sans JP Variable`
  - OpenSCAD Name: `Noto Sans JP`
  - Usage Policy: variable font. named style is selected from `Thin` to `Black`.
  - Source: Google Fonts `ofl/notosansjp`
  - View Page: https://fonts.google.com/noto/specimen/Noto%2BSans%2BJP
  - License: `NotoSansJP-OFL.txt`
  - Source Memo: `NotoSansJP-SOURCE.txt`

- `MPLUSRounded1c-Regular.ttf`
  - Display Name: `M PLUS Rounded 1c Regular`
  - OpenSCAD Name: `M PLUS Rounded 1c`
  - Source: Google Fonts `ofl/mplusrounded1c` / M+ FONTS for Google Fonts
  - View Page: https://fonts.google.com/specimen/M%2BPLUS%2BRounded%2B1c
  - License: `MPLUSRounded1c-OFL.txt`
  - Source Memo: `MPLUSRounded1c-SOURCE.txt`

- `DotGothic16-Regular.ttf`
  - Display Name: `DotGothic16 Regular`
  - OpenSCAD Name: `DotGothic16`
  - Source: Google Fonts `ofl/dotgothic16`
  - View Page: https://fonts.google.com/specimen/DotGothic16
  - License: `DotGothic16-OFL.txt`
  - Source Memo: `DotGothic16-SOURCE.txt`

- `KurobaraCinderella-Regular.ttf`
  - Display Name: `Kurobara Cinderella`
  - OpenSCAD Name: `kurobara-cinderella`
  - Usage Policy: static font. Used for Japanese legends as a thorny Japanese gothic display.
  - Source: MODI Factory `font_kurobara-cinderella.php`
  - View Page: https://modi.jpn.org/font_kurobara-cinderella.php
  - License: `KurobaraCinderella-MODI.txt` and `MPLUS1-OFL.txt`

- `Bangers-Regular.ttf`
  - Display Name: `Bangers Regular`
  - OpenSCAD Name: `Bangers`
  - Usage Policy: static font. Used for short legends as a display leaning towards comic covers.
  - Source: Google Fonts `ofl/bangers`
  - View Page: https://fonts.google.com/specimen/Bangers
  - License: `Bangers-OFL.txt`
  - Source Memo: `Bangers-SOURCE.txt`

- `Creepster-Regular.ttf`
  - Display Name: `Creepster Regular`
  - OpenSCAD Name: `Creepster`
  - Usage Policy: static font. Used for short legends as a display leaning towards horror movie titles.
  - Source: Google Fonts `ofl/creepster`
  - View Page: https://fonts.google.com/specimen/Creepster
  - License: `Creepster-OFL.txt`
  - Source Memo: `Creepster-SOURCE.txt`

- `Rye-Regular.ttf`
  - Display Name: `Rye Regular`
  - OpenSCAD Name: `Rye`
  - Usage Policy: static font. Used for short legends as a display leaning towards Western movie posters.
  - Source: Google Fonts `ofl/rye`
  - View Page: https://fonts.google.com/specimen/Rye
  - License: `Rye-OFL.txt`
  - Source Memo: `Rye-SOURCE.txt`

- `Orbitron-Variable.ttf`
  - Display Name: `Orbitron Regular`
  - OpenSCAD Name: `Orbitron`
  - Usage Policy: Bundles the variable font distribution, but handles it as the Regular face, the family default, in the current UI.
  - Source: Google Fonts `ofl/orbitron`
  - View Page: https://fonts.google.com/specimen/Orbitron
  - License: `Orbitron-OFL.txt`
  - Source Memo: `Orbitron-SOURCE.txt`

- `GrenzeGotisch-Variable.ttf`
  - Display Name: `Grenze Gotisch Regular`
  - OpenSCAD Name: `Grenze Gotisch`
  - Usage Policy: Bundles the variable font distribution, but handles it as the Regular face, the family default, in the current UI.
  - Lineage: Approximate candidate easy to find with `Art Gothic` search. Display leaning towards Blackletter.
  - Source: Google Fonts `ofl/grenzegotisch`
  - View Page: https://fonts.google.com/specimen/Grenze%2BGotisch
  - License: `GrenzeGotisch-OFL.txt`
  - Source Memo: `GrenzeGotisch-SOURCE.txt`

- `MedievalSharp-Regular.ttf`
  - Display Name: `MedievalSharp Regular`
  - OpenSCAD Name: `MedievalSharp`
  - Usage Policy: static font. Used for short legends as a gothic display leaning towards stone inscriptions.
  - Lineage: Approximate candidate easy to find with `Art Gothic` search.
  - Source: Google Fonts `ofl/medievalsharp`
  - View Page: https://fonts.google.com/specimen/MedievalSharp
  - License: `MedievalSharp-OFL.txt`
  - Source Memo: `MedievalSharp-SOURCE.txt`

Static fonts use the face as named in the file, without pseudo-italic / slanted / bold. Explicit contour correction is done only from numerical input on the UI.

`Add underline` uses `UnderlinePosition` and `UnderlineThickness` in the `post` table of the font file. If font metadata cannot be used, it does not fallback to an arbitrary value and does not output an underline.

All are used for `text()` generation of legends. Additional display fonts are mainly for short legends. `Kurobara Cinderella` is treated as a Japanese display including Japanese characters, leaving the MODI distributor's terms of use and M+ FONTS derivative notes in `KurobaraCinderella-MODI.txt`. `Art Gothic` itself is not bundled in this repository, but an approximate candidate of an OFL distribution with clear redistribution conditions is included.
