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
- **Shape & fit** sliders for every adjustment below, plus a quality switch:
  drag and the cap rebuilds, so a taller DSA or a steeper SA is a second away.
- **Arrange** the whole catalogue instead of one cap -- see below.
- **Pin as ghost** keeps the current cap on screen, translucent, while you
  switch to another -- pin a DSA, click SA, and the height difference is
  immediate. The camera frames both, so nothing runs off the top.
- A **19.05 mm switch grid** on the floor, so sizes read at a glance.
- Live measurements: bounding box, volume, stem count and stabiliser span.
- **Download** the cap on screen as STL or 3MF.
- Arrow keys step through profiles and rows; space toggles the turntable.

Shading is flat, computed per facet from the mesh itself, so what you see is
the geometry a slicer would get rather than a smoothed impression of it.

### Arranging the catalogue

`Arrange profiles` and `Arrange rows` lay caps out instead of showing one:
either control can go on the X axis (across the screen) or the Y axis (up it),
so profiles across and rows up gives a contact sheet of the whole catalogue in
one frame. Set both to the same axis and rows become the minor step inside each
profile, giving one long line grouped by profile.

Every cap in an arrangement shares the selected size, stem and home marker; a
profile that cannot take the selected stem quietly uses one it can, so lining
up profiles never drops the low-profile one. A profile with no R5 leaves that
slot empty rather than shifting its neighbours, so row numbers line up across
every column, and a uniform profile contributes the single shape it has rather
than five copies of it.

Both arranged axes are labelled along the edges of the stage: profile names with
their home-row heights under each column, `R1` to `R5` beside each row. The
labels are HTML over the canvas rather than drawn geometry, so they stay upright
and crisp while the caps turn, and they track their column when you pan or zoom.
With both controls on one axis the row labels move to the opposite edge so the
two sets cannot collide.

**Each cap turns about its own zero point.** Dragging rotates the caps, not the
camera, so the slots never move: every cap shows the identical angle it would
show on its own, and profiles stay directly comparable at any rotation. Put
profiles on X and hit `Front` for a true orthographic strip of all twelve
silhouettes side by side, bases aligned.

That pivot also applies with a single cap, which is the one visible change to
the old behaviour: a cap now turns about its base rather than the middle of its
bounding box. Each cap carries its own small patch of ground, which turns with
it -- one shared floor cannot work once caps are spread out, because rotating a
single plane about the world origin tips it away from every slot but the middle.

`--bake <file>` writes a **standalone page** instead of serving one: the caps
the selection flags choose are built and folded into a single HTML file with
the geometry embedded. It needs no server and no network, so it travels well.
Only the baked combinations are selectable; the viewer greys out the rest.

`npm run build` bakes the page the project publishes: every profile, every row
and every stem at 1u, about 10 MB of HTML, into `dist/index.html`. That is what
the Pages workflow deploys, so the published page is this same standalone file.

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
| `--quality` | `standard` | `draft`, `standard`, `fine` -- see below |
| `--stem-slop` | 0.15 | widen the stem slot, per face |
| `--wall` | 1.5 | sidewall thickness |
| `--top-thickness` | 1.2 | roof thickness under the dish |
| `--adjust` | -- | change the profile's shape -- see below; repeatable |
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

## Adjusting the shape

Every profile is a fixed table of measurements, and adjustments are **deltas
from it**, never absolute values. `height=+2` means "two millimetres taller
than this profile is", so one setting sweeps the whole catalogue and leaves
each profile recognisable -- a DSA and an SA both 2 mm taller are still a DSA
and an SA, where setting both to 12 mm would just flatten the comparison. Zero
means the profile is left alone, which is the default for all of them.

On the command line they go through one repeatable `--adjust`, taking
`name=value` or a comma-separated list:

```
keycapgen generate --profile dsa --adjust height=+2 --adjust taper=-3
keycapgen generate --profile sa --adjust top-width=+1.5,corner-radius=+0.5
```

One option rather than a flag each keeps negative values away from the argument
parser, which would otherwise read `-3` as an option of its own.

| name | adjusts | unit | range |
|---|---|---|---|
| `height` | cap height | mm | -6 to +12 |
| `side-wall` | vertical skirt before the taper starts | mm | 0 to +10 |
| `taper` | wall angle, all four sides | deg | -15 to +12 |
| `taper-front` `taper-back` `taper-left` `taper-right` | one side each | deg | -15 to +12 |
| `top-width` `top-depth` | top face size, directly | mm | -6 to +8 |
| `tilt` | sculpt tilt of the top face | deg | -15 to +15 |
| `corner-radius` | rounding of the base corners | mm | -0.9 to +4 |
| `top-corner-radius` | rounding of the top corners | mm | -1.4 to +4 |
| `dish-depth` | how deep the dish is scooped | mm | -2 to +4 |
| `stem-height` | depth of the switch socket | mm | -2 to +6 |

`keycapgen list` prints the same table, and a run that used any of them says so
in its summary. They also travel with the output: the filename gains a sorted
token per adjustment, so an adjusted cap never overwrites a stock one, and a
3MF records them in its metadata, which is the only lasting record of how a
model was made.

```
out/cherry/cherry_r3_1u_mx_height+2_taper-3.stl
```

### Taper, and why it is an angle

A profile does not store a wall angle -- it stores a top plate. The angle each
side implies is recovered from how far that side already leans in over the
cap's height, and the delta is added to *that*, so the control reads as
"steeper" or "shallower" rather than replacing the profile's shape. Because the
angle is measured per side from the profile's own edges, the sculpt shift that
pushes a row's top face forward is already accounted for, and the four
single-side names give front/back and left/right asymmetry.

### Side wall

`side-wall` is a vertical skirt at the bottom of the cap, with the taper
starting above it, which is what lets a stem sit higher than the walls around
it. The cap keeps its roof and stays closed; only the silhouette changes.

### Thickness and fit

`--wall`, `--top-thickness` and `--stem-slop` stay absolute, in the viewer as
well. They are not profile properties, so there is nothing for them to be
relative to, and a delta twin would give two ways to set one number.

### When an adjustment will not fit

Adjustments are clamped where a limit is structural and reported where it is a
real conflict. A cap will not shrink below its own roof and dish, so `height=-6`
on a 5 mm Choc simply stops early rather than producing a cap with no inside.
But pulling the top face in far enough to leave a stabiliser stem outside the
wall is refused, with the measurement and the adjustments in force:

```
Cannot build dsa R3 2u: a alps stabilizer stem at x=-11.91 mm would breach the
sidewall of a dsa 2u cap. Adjustments in force: top-width -6 mm.
```

A batch run skips such a combination and carries on; the viewer shows the same
sentence and keeps the last good cap on screen.

## Quality

`--quality` sets how far a facetted surface may sit from the true one. That
budget is what decides the smoothness of the **top surface**, which on a keycap
is the whole dish -- the part you look at and touch.

| quality | budget | a 1u DSA | measured dish error |
|---|---|---|---|
| `draft` | 0.08 mm | ~930 triangles | 0.050 mm |
| `standard` | 0.02 mm | ~1,900 triangles | 0.014 mm |
| `fine` | 0.005 mm | ~6,400 triangles | 0.003 mm |

Everything sized by its own radius follows that budget -- the dish, the round
stem posts, the home markers -- so a 22 mm dish sphere and a 2.75 mm stem post
are each subdivided for the accuracy they need rather than sharing one segment
count. Sculpt stations and corner subdivisions step up alongside it.

A sphere's facet curves away in two directions at once and strays about 2.7
times as far from the true surface as a flat arc does at the same angular step,
so the dish sphere is subdivided more finely to land inside the same budget.
`standard` is a good default for printing; `fine` roughly triples the triangle
count and takes about 2.5x as long.

The viewer has the same three settings as chips, so you can see the difference
rather than infer it from a number: a 1u Cherry goes from 1,336 triangles at
`draft` through 3,736 at `standard` to 11,682 at `fine`.

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
npm run build   # bake dist/index.html, the page Pages deploys
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
| `src/engine.mjs` | the WASM kernel, quality presets, and the arena below |
| `src/modifiers.mjs` | the adjustment registry every front end reads |
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
the front and only at the front, each quality's finished dish is measured
against the sphere it is meant to be and has to land inside that quality's
budget, and written STL and 3MF
files are read back and rebuilt into solids to confirm they survived the trip.
The viewer is covered too: the mesh format round-trips vertex for vertex, the
server is driven over real HTTP, and a baked page is parsed back to check every
cap asked for is actually in it.

### Solids live in WebAssembly

Manifold's solids are handles the JavaScript garbage collector knows nothing
about: dropping the last reference to one leaks it. A cap is built from dozens
of intermediates -- the shell, the dish cutter, the cavity, each stem, and a
fresh solid for every boolean and every translate on the way -- so freeing them
by hand at each call site is a rule that geometry code will eventually forget.

`src/engine.mjs` takes the bookkeeping away instead. Every method that hands
out a solid registers it with the open **arena**, and `buildKeycap` wraps a
build in one: when it ends, everything made inside is freed except the cap
handed to `keep`. Arenas are held per async chain, so two builds in flight at
once -- two viewer requests, say -- cannot free each other's geometry.

The difference is not marginal. Sixty standard-quality caps grew the process by
207 MB before and 5 MB after, and `--all` went from being killed part-way
through to 1,549 models at a 336 MB peak, in half the time. A test measures
that growth directly rather than counting `delete()` calls.

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
