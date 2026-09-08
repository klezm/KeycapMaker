# keycap-bake

Bake 2D vector graphics **through** a keycap, so the legend is a real window
rather than an engraving.

That is the whole point: a cut that goes all the way through the roof can be
filled with a clear second material, or lit from below. Legends that are milled
part-way into the top can't do either.

```
keycap-bake bake --svg logo.svg --out out --preview
```

Each bake produces two solids that fit together exactly:

| part | what it is |
| --- | --- |
| **body** | the keycap with a window cut clean through its roof |
| **insert** | the plug that fills that window, flush on both faces |

Print the body in an opaque filament and the insert in a transparent one and the
legend lights up. The `.3mf` carries both as separate objects with their own
materials, so a slicer can assign a different filament to each.

## Install

```
npm install
```

Needs Node 20.19+. The only runtime dependencies are `manifold-3d` (geometry),
`svgpath` (SVG path normalisation) and `fflate` (3MF is a zip). Everything runs
locally — no CAD install, no network.

## Quick start

Bake into the built-in keycap:

```
node bin/keycap-bake.js bake --svg examples/ring.svg --out out --preview --cut-plan
```

Bake into a keycap you already have:

```
node bin/keycap-bake.js bake --svg logo.svg --cap my-keycap.stl --out out
```

Write a blank keycap, or examine any mesh:

```
node bin/keycap-bake.js cap --out out --units 2
node bin/keycap-bake.js inspect my-keycap.stl
```

`--help` lists every flag.

### What comes out

- `<name>.3mf` — body and insert as two objects with two materials
- `<name>-body.stl`, `<name>-insert.stl` — the same pair as plain meshes
- `<name>-preview.html` (`--preview`) — a single self-contained file you can
  double-click; the insert is drawn translucent, and unticking it shows the bare
  window. No server, no CDN, nothing to install.
- `<name>-cut-plan.svg` (`--cut-plan`) — a top-down drawing of what is being
  removed, with detached pieces flagged in red. The fastest way to catch a
  graphic that is mirrored, rotated or the wrong size.

## How it works

Both outputs come from the same solid:

```
body   = cap − grownProfile      (the cap, with a window in it)
insert = cap ∩ shrunkProfile     (the plug that fills that window)
```

Because the insert is an intersection with the untouched cap, it inherits the
dished top surface and the roof underside for free — there is no surface-fitting
step, and the two halves reassemble the original cap minus the clearance gap.
`--clearance` (0.15 mm by default) sets that gap: the window is grown by half of
it and the plug shrunk by half, so the fit is symmetric.

### Cut depth is measured, not configured

A prism dropped through a centred legend would slice straight through the stem.
So the depth is probed rather than guessed:

1. Intersect a full-height prism with the cap and decompose it. On a cap whose
   stem stands clear of the roof this separates the roof slab outright, and its
   bounding box gives the answer exactly.
2. When the stem is fused to the roof — which is normal for MX — that yields one
   lump, so the interior cavity is isolated instead and sliced downwards until
   its area stops growing. That plateau is where the ceiling bottoms out.

`--cut-from-z` overrides both. This is what lets an arbitrary imported STL work
without you measuring its wall thickness first.

Any part of the graphic that still has material beneath it is reported as a
percentage rather than silently producing an opaque patch:

```
note      35% of the graphic sits over solid material (usually the stem),
          so that part will not be see-through.
```

Move the legend off the stem with `--offset-x` / `--offset-y` if that matters.

### Letters with holes in them

Cutting an **O**, **A**, **8**, **e** or **R** clean through leaves its counter —
the enclosed middle — floating free. `decompose()` detects this exactly, and
`--islands` decides what happens:

- `keep` (default) — the counter stays in the body file as a separate shell. It
  is held in place by the insert, so this is the right choice whenever you are
  printing a transparent legend. The tool says how many there are.
- `bridge` — tie each counter back to the mainland with a bar (`--bridge-width`,
  `--bridge-count`). Use this for a single-material open window, where nothing
  would hold the counter. The bars are placed where they cross the least cut
  material, so they are as unobtrusive as the shape allows.
- `error` — refuse to write anything.

## Input SVGs

`<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>` and `<polyline>` are
supported, with `transform` on any element and on nested `<g>`, and `fill-rule`
(both the attribute and `style="fill-rule:…"`), inherited down the tree. Arcs and
curves are flattened at `--flatness` (0.02 mm).

**Fills only.** A stroke has no area, so a stroke-only SVG is rejected with a
message rather than quietly producing nothing — convert strokes to outlines
first (in Inkscape, *Path → Stroke to Path*). The same applies to text: convert
it to paths before baking.

SVG's Y axis points down and the model's points up, so graphics are flipped once
on the way in. If a letter comes out mirrored, that is what `--mirror` is for.

## Printing

The `.3mf` is the format that preserves the point of all this. Loaded into a
slicer you should see two objects in the same position; assign the opaque
filament to `body` and a transparent one to `insert`.

Some practical notes:

- Print the cap upside down (top face on the plate) so the window and plug meet
  on a flat layer boundary.
- `--clearance 0.15` suits a well-tuned FDM printer. Tighten it toward `0` for
  resin, loosen it if the insert will not seat.
- With `--islands keep`, the counters are only held once the insert is actually
  printed. Printing the body on its own will drop them.

**This last step needs a human.** Nothing here has been verified against a real
slicer or a real printer — the geometry is checked by the test suite, the
printability is not.

## Development

```
npm test
```

68 tests, about two seconds, no network. The ones that matter most assert that
the cut genuinely goes through (no body material anywhere inside the footprint,
at any height between the cut plane and the top surface), that `body + insert`
reconstructs the cap to within the clearance kerf, that the probed cut depth
matches the depth the generator actually built, and that an MX stem is untouched
below the cut.

### Layout

```
bin/keycap-bake.js     CLI
src/engine.js          manifold-3d bootstrap
src/svg/               SVG document -> flattened contours
src/graphic.js         contours -> a placed, scaled 2D cut profile
src/cap/generate.js    the built-in parametric MX keycap
src/cap/import-mesh.js loading a keycap from STL
src/bake.js            the cut itself, and the cut-depth probe
src/islands.js         detached counters: detection and bridging
src/io/                STL, 3MF and cut-plan output
src/preview/           the self-contained WebGL preview page
```

## Limitations

- The built-in keycap generator is deliberately minimal: a linear taper, a
  cylindrical, spherical or flat dish, and an MX stem. For a sculpted profile,
  export an STL from a real keycap designer and pass it with `--cap`.
- STL is the only mesh input format.
- An imported cap must be a closed solid. `inspect` reports whether one is.
- A legend directly over the stem cannot be fully see-through; that is a fact
  about the keycap, not a limitation the tool can code around, so it reports it.
