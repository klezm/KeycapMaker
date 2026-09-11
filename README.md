# keycap-forge

A Node command-line tool that generates blank, 3D-printable keycap models for
every common keycap profile, in every common stem type. No legends, no fonts,
no browser -- point it at an output directory and it writes STL and 3MF files.

```
npm install
node bin/keycapgen.mjs list
node bin/keycapgen.mjs generate --profile dsa,cherry,sa --row all --format stl,3mf
node bin/keycapgen.mjs view          # browse the whole catalogue in a browser
```

Geometry is built with [manifold-3d](https://github.com/elalish/manifold), the
same CSG kernel OpenSCAD uses, running as WebAssembly inside Node. There is no
external binary to install and no OpenSCAD dependency; a cap takes tens of
milliseconds, and the whole catalogue builds in about a minute on a laptop.

Every model comes out of the kernel as a single watertight, manifold solid --
checked on the way out for `NoError` status, positive volume and a single
connected component -- so it drops straight into a slicer.

## Profiles

Twelve profiles, five of them uniform and seven sculpted per row.

| id | rows | mount | dish | home-row height |
|---|---|---|---|---|
| `dsa` | uniform | MX | spherical | 7.6 mm |
| `xda` | uniform | MX | spherical | 9.1 mm |
| `kam` | uniform | MX | spherical | 10.5 mm |
| `g20` | uniform | MX | flat | 8.9 mm |
| `choc` | uniform | Choc | cylindrical | 5.0 mm |
| `cherry` | R1-R5 | MX | cylindrical | 9.4 mm |
| `dcs` | R1-R5 | MX | cylindrical | 10.4 mm |
| `oem` | R1-R5 | MX | cylindrical | 11.9 mm |
| `mda` | R1-R5 | MX | spherical | 10.5 mm |
| `kat` | R1-R5 | MX | spherical | 13.5 mm |
| `mt3` | R1-R5 | MX | spherical (deep) | 13.0 mm |
| `sa` | R1-R4 | MX | spherical | 16.5 mm |

**Row numbering: R1 is the bottom row (nearest you), R3 the home row, R5 the
number row.** Rows above the home row tilt towards you, rows below tilt away,
and both sit higher than the home row -- the usual bowl. Uniform profiles
accept a row and ignore it, and collapse to a single file per size and stem
rather than writing five identical models.

Heights are measured to the highest point of the finished cap, so a tilted row
comes out slightly taller than the number above: the tilt lifts the back edge.

## Stems

| id | mount | depth | notes |
|---|---|---|---|
| `mx` | MX | 4.0 mm | Round Ø5.5 post, Cherry cross. The default. |
| `box` | MX | 4.0 mm | Square 5.5 mm post, Cherry cross. Easier on FDM. |
| `alps` | MX | 3.5 mm | Rectangular socket, 4.45 x 2.25 mm. |
| `choc-v1` | Choc | 3.0 mm | Twin sockets, 1.2 x 3.0 mm on 5.7 mm centres. |
| `choc-v2` | Choc | 3.0 mm | Cherry cross at low-profile height. |
| `none` | either | -- | Hollow shell, no mount. |

The cross is the Cherry MX specification figure: 4.1 mm wide with 1.17 mm arms.
`--stem-slop` widens every face of the slot; the default 0.15 mm suits resin,
and FDM usually wants more. Each stem is one extrusion running from the open
bottom up into the roof, with its slot cut into the lower part, so the post is
always bonded to the cap rather than stacked against it.

MX-mount profiles take MX-family stems and Choc profiles take Choc stems;
`none` fits either. Combinations that cannot exist are skipped, with a reason.

## Stems on wide keys

A key 2u or wider does not ride on one stem. It rides on a switch in the
middle and a stabiliser at each end, and Cherry stabiliser inserts take the
same stem the switch does -- so a wide cap is the same post repeated at the
spacing its width calls for. That happens automatically:

| key width | stems | span | MX | Choc |
|---|---|---|---|---|
| under 2u | 1 | -- | -- | -- |
| 2u to 3u | 3 | 1.25u | 23.81 mm | 22.50 mm |
| 3u to 6u | 3 | 2u | 38.10 mm | 36.00 mm |
| 6u to 6.25u | 3 | 5u | 95.25 mm | 90.00 mm |
| 6.25u to 7u | 3 | 5.25u | 100.01 mm | 94.50 mm |
| 7u and up | 3 | 6u | 114.30 mm | 108.00 mm |

Spans are whole multiples of the switch pitch, which is exactly where the
familiar millimetre figures come from -- 1.25u x 19.05 mm is the 23.8 mm every
2u stabiliser uses, and 6u x 19.05 mm is the 114.3 mm of a 7u spacebar. **The
MX figures are the standard Cherry spacings. The Choc figures are derived the
same way from the 18 mm Choc pitch and are not verified against Choc
stabiliser hardware** -- measure yours, and override if they differ.

`--stabilizers` controls this:

```
--stabilizers auto     one switch plus stabilisers by width (default)
--stabilizers none     a single centre stem, whatever the width
--stabilizers 2        stabilisers exactly 2 units apart
```

Only a deviation from `auto` changes the filename, so
`--stabilizers none` gives `cherry_r3_6.25u_mx_nostab.stl` and
`--stabilizers 2` gives `cherry_r3_6.25u_mx_stab2u.stl`.

Positions are checked against the cavity before anything is built: a stem that
would put its socket through a sidewall is refused with the position that
fails, and in a batch run that combination is skipped with the reason rather
than killing the run. A Choc v1 stem is 8.5 mm wide, for instance, so it does
not fit alongside a stabiliser on a 2u Choc cap -- but the narrower v2 stem
does, and so does v1 with `--stabilizers none`.

On narrow stabilised keys the top of a post can merge into the sidewall. That
is intentional and makes the cap stronger; the socket itself always keeps
clear of the wall, which is what the fit check enforces.

## Viewing

```
keycapgen view                       Browse at http://127.0.0.1:8080
keycapgen view --port 3000
keycapgen view --bake preview.html --profile all --row all
```

`view` starts a small local server and opens the catalogue in a browser: pick a
profile, row, size and stem from the sidebar and the cap appears. Nothing is
pre-rendered -- a cap takes tens of milliseconds to build, so each one is
generated on request and cached, and every combination is reachable straight
away. Combinations that cannot exist are greyed out with the reason.

What it gives you:

- **Orbit, zoom and pan**, plus Iso / Front / Side / Top / **Under** presets.
  Under is where the stems are, and the one to use for checking a spacebar.
- **Ortho** projection, for comparing profile silhouettes honestly.
- A **Home key marker** control, so you can see the bar or the deep dish
  before committing a set to the printer.
- **Pin as ghost** keeps the current cap on screen, translucent, while you
  switch to another -- pin a DSA, click SA, and the height difference is
  immediate. The camera frames both, so nothing runs off the top.
- A **19.05 mm switch grid** on the floor, so sizes read at a glance.
- Live measurements: bounding box, volume, stem count and stabiliser span.
- **Download** the cap on screen as STL or 3MF.
- Arrow keys step through profiles and rows; space toggles the turntable.

Shading is flat, computed per facet from the mesh itself, so what you see is
the geometry a slicer would get rather than a smoothed impression of it.

`--bake <file>` writes a **standalone page** instead of serving one: the caps
the selection flags choose are built and folded into a single HTML file with
the geometry embedded. It needs no server and no network, so it travels well.
Only the baked combinations are selectable; the viewer greys out the rest.

The viewer has no dependencies of its own -- the renderer is WebGL2 written
directly, so the page works offline and nothing is fetched from a CDN.

## Home key markers

F, J and numpad 5 need something you can find without looking. `--homing`
picks which kind:

| id | what it is |
|---|---|
| `none` | an ordinary key (default) |
| `bar` | a ridge across the front of the keytop -- the Cherry and OEM answer |
| `dot` | a single bump near the front, common on numpad 5 and low-profile sets |
| `groove` | the bar cut into the surface instead of raised |
| `scoop` | no added feature: the dish itself is cut deeper, as SA and DSA mark home |

```
keycapgen generate --profile cherry --row 3 --homing bar    # an F or J key
keycapgen generate --profile sa --row 3 --homing scoop
```

The raised bar is 6.0 x 1.2 mm and stands 0.5 mm proud; the dot is 1.8 mm
across at the same height; the recess is 0.4 mm deep; the deep dish adds
1.2 mm of scoop. All of them sit 1.9 mm in from the front edge of the keytop.

The marker is built from the cap's own dish cutter rather than from a box, so
it follows the dish and the row's tilt exactly and keeps an even thickness
across a curved top -- a box would leave a wedge, thick at one end and sunk
into the surface at the other. A marker that will not fit is refused rather
than built: a recess deeper than the roof, or a deep dish that would leave no
material under it.

Marked caps are named apart from plain ones, so an F key and a D key can live
in the same directory: `cherry_r3_1u_mx_homing-bar.stl`.

## Usage

```
keycapgen list                       Show profiles, rows, sizes and stems
keycapgen generate [options]         Build models
keycapgen view [options]             Browse the catalogue in a browser
keycapgen help
```

Selection flags take a comma-separated list or `all`:

| flag | default | example |
|---|---|---|
| `--profile` | all | `--profile dsa,cherry,sa` |
| `--row` | all | `--row 3`, `--row 1-5`, `--row 1,3,5` |
| `--size` | 1 | `--size 1,1.25,6.25` |
| `--stem` | mx | `--stem mx,box,choc-v1` |
| `--all` | -- | every profile, row, size and stem |
| `--stabilizers` | auto | `auto`, `none`, or a span in units |
| `--homing` | none | `none`, `bar`, `dot`, `groove`, `scoop` |

Output and geometry:

| flag | default | meaning |
|---|---|---|
| `--out` | `./out` | output directory |
| `--format` | `stl` | `stl`, `3mf`, or both |
| `--dry-run` | -- | list what would be built, build nothing |
| `--quality` | `standard` | `draft`, `standard`, `fine` |
| `--stem-slop` | 0.15 | widen the stem slot, per face |
| `--wall` | 1.5 | sidewall thickness |
| `--top-thickness` | 1.2 | roof thickness under the dish |
| `--jobs` | CPU count | worker threads |
| `--port` | 8080 | port for `view` |
| `--bake` | -- | write a standalone page instead of serving |

Sizes are 1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 3, 6.25 and 7 units; `--size`
also accepts any other positive number. A bare `generate` builds a 1u MX cap
for every profile and row -- a compact set to print and compare. `--all` builds
the whole catalogue.

Files land in `out/<profile>/<name>.<ext>`, where the name is
`<profile>_r<row>_<size>u_<stem>` (the row is omitted for uniform profiles):

```
out/cherry/cherry_r3_1u_mx.stl
out/dsa/dsa_1.25u_box.3mf
```

A run finishes with a table of every model, its measured bounding box, volume
and triangle count, so a bad number is visible without opening a slicer.

## Printing notes

- **Stem slop is the one number you will have to tune.** Start at 0.15 mm for
  resin or 0.3 mm for FDM and move in 0.05 mm steps: if the cap will not seat,
  raise it; if it falls off, lower it. Past about 0.35 mm the post wall between
  the cross tip and the outside of a `mx` post gets thin -- `box` has more
  material there and is the better choice at high slop.
- **`box` prints more reliably than `mx` on FDM**, having no curved post wall.
- **Orientation.** On FDM, printing on the side or at 45 degrees gives a much
  smoother top than printing upright. On resin, print upside down (stem up)
  with supports on the flat side.
- **Walls.** 1.5 mm walls with a 1.2 mm roof are the default and print well.
- **Wide caps print with three stems.** Check the stabiliser span matches your
  hardware before printing a full set -- `keycapgen list` prints the table.

## Development

```
npm test        # node --test over test/
npm run list
npm run generate -- --profile dsa --format stl,3mf
```

The pieces, in the order a cap is built:

| file | what it does |
|---|---|
| `src/profiles/data.mjs` | the dimension tables and the sculpt curve |
| `src/sizes.mjs` | unit widths per mount family |
| `src/stabilizers.mjs` | stem positions on wide keys |
| `src/homing.mjs` | tactile markers for the home keys |
| `src/geometry/section.mjs` | rounded-rectangle rings, segment budgets |
| `src/geometry/shell.mjs` | the ring stack from base to tilted top plate |
| `src/geometry/loft.mjs` | ring stack to a closed solid |
| `src/geometry/dish.mjs` | the dish cutter, reused to carve the cavity |
| `src/stems/` | one module per mount, plus shared slot helpers |
| `src/keycap.mjs` | assembly: shell, dish, cavity, stem |
| `src/export/` | binary STL, 3MF, and a small ZIP writer |
| `src/viewer/` | the browser viewer: renderer, page, server, bake |
| `src/batch.mjs` | matrix expansion and the worker pool |
| `src/cli.mjs` | argument parsing and reporting |

The tests check geometry, not just plumbing: every profile-and-stem
combination has to build a valid solid, the finished cap has to match the
footprint and height it declares, the cross slot is measured against a probe
one hair under and one hair over the switch stem, every stem position on a
wide key is probed for a real post with a usable slot, a home marker is
measured against the same strip on the back of the keytop to prove it sits at
the front and only at the front, and written STL and 3MF
files are read back and rebuilt into solids to confirm they survived the trip.
The viewer is covered too: the mesh format round-trips vertex for vertex, the
server is driven over real HTTP, and a baked page is parsed back to check every
cap asked for is actually in it.

## Provenance and licensing

**The profile shapes here are approximations built from public community
references, not manufacturer CAD.** They are close enough to compare shapes and
to print usable caps, and they are not reproductions. Heights and sculpts vary
by a millimetre or two between sources.

Profile names are associated with the companies that make them -- MT3 with
Drop and matt3o, KAT and KAM with Keyreative, SA, DSA, DCS and G20 with
Signature Plastics, Cherry with Cherry and GMK, MDA with Maxkey, XDA with
MelGeek. This tool generates independent look-alikes under those familiar
names so you can find the shape you mean; it is not affiliated with any of
them, and selling prints of a trademarked profile may carry legal risk.

Switch interface dimensions -- the Cherry MX cross, the Alps post, the Choc
prongs -- are mechanical interface specifications rather than anyone's design.

`manifold-3d` is Apache-2.0. It is the only runtime dependency; ZIP and 3MF
writing is done here on `node:zlib` to keep it that way.
