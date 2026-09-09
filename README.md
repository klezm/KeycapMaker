# keycap-forge

A Node command-line tool that generates blank, 3D-printable keycap models for
every common keycap profile, in every common stem type. No legends, no fonts,
no browser -- point it at an output directory and it writes STL and 3MF files.

```
npm install
node bin/keycapgen.mjs list
node bin/keycapgen.mjs generate --profile dsa,cherry,sa --row all --format stl,3mf
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

## Usage

```
keycapgen list                       Show profiles, rows, sizes and stems
keycapgen generate [options]         Build models
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
- Wide caps get a single centre stem. Stabiliser stems are not generated.

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
| `src/geometry/section.mjs` | rounded-rectangle rings, segment budgets |
| `src/geometry/shell.mjs` | the ring stack from base to tilted top plate |
| `src/geometry/loft.mjs` | ring stack to a closed solid |
| `src/geometry/dish.mjs` | the dish cutter, reused to carve the cavity |
| `src/stems/` | one module per mount, plus shared slot helpers |
| `src/keycap.mjs` | assembly: shell, dish, cavity, stem |
| `src/export/` | binary STL, 3MF, and a small ZIP writer |
| `src/batch.mjs` | matrix expansion and the worker pool |
| `src/cli.mjs` | argument parsing and reporting |

The tests check geometry, not just plumbing: every profile-and-stem
combination has to build a valid solid, the finished cap has to match the
footprint and height it declares, the cross slot is measured against a probe
one hair under and one hair over the switch stem, and written STL and 3MF
files are read back and rebuilt into solids to confirm they survived the trip.

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
