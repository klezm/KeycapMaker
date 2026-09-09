import { getEngine } from "../engine.mjs";

/**
 * Cherry MX cross slot, per the Cherry MX keycap specification: a 4.1 mm wide
 * cross with 1.17 mm arms. `slop` widens every face of the slot to suit the
 * printing process -- resin holds tighter tolerances than FDM.
 */
export const MX_CROSS = { width: 4.1, arm: 1.17 };

/** How far a cavity is extended below the cap's open bottom before cutting. */
const UNDERSHOOT = 0.5;

/** The 2D outline of a cross slot, grown by `slop` on every side. */
export async function crossOutline(slop = 0, grow = 0) {
  const { CrossSection } = await getEngine();
  const width = MX_CROSS.width + 2 * (slop + grow);
  const arm = MX_CROSS.arm + 2 * (slop + grow);
  return CrossSection.square([width, arm], true).add(
    CrossSection.square([arm, width], true),
  );
}

/**
 * The solid to subtract from a stem post to leave a cross slot: a
 * through-slot plus a flared lead-in at the bottom so the cap starts onto the
 * switch without shaving the print.
 *
 * The flare is built as one hull per bar rather than a hull of the whole
 * cross: each bar is a convex rectangle, so its hull is the tapered prism we
 * want, whereas hulling the cross itself would fill in the notches.
 */
export async function crossSlot({ height, slop = 0, leadIn = 0.3, leadInHeight = 0.6 }) {
  const { Manifold } = await getEngine();
  const outline = await crossOutline(slop);
  // Overshoot below z = 0 so the slot cuts cleanly through the open bottom,
  // but stop exactly at `height` so the mount is as deep as it says it is.
  const slot = Manifold.extrude(outline, height + UNDERSHOOT).translate([0, 0, -UNDERSHOOT]);
  if (leadIn <= 0 || leadInHeight <= 0) return slot;

  const width = MX_CROSS.width + 2 * slop;
  const arm = MX_CROSS.arm + 2 * slop;
  const thin = 0.01;
  const bars = [];
  for (const [w, a] of [
    [width, arm],
    [arm, width],
  ]) {
    bars.push(
      Manifold.hull([
        Manifold.cube([w + 2 * leadIn, a + 2 * leadIn, thin], true).translate([0, 0, thin / 2]),
        Manifold.cube([w, a, thin], true).translate([0, 0, leadInHeight]),
      ]),
    );
  }
  return slot.add(Manifold.union(bars).translate([0, 0, -thin / 2]));
}

/**
 * The cavities to subtract from a post to leave rectangular sockets, used by
 * the Alps and Choc mounts, which seat on posts rather than a cross.
 *
 * Only the holes are returned; the post itself comes from the stem module's
 * `outerSolid`, so a stem is always one extrusion with features cut out of it
 * rather than parts stacked face to face.
 */
export async function rectCavities({
  cavityWidth,
  cavityDepth,
  height,
  slop = 0,
  leadIn = 0.25,
  leadInHeight = 0.5,
  offsets = [[0, 0]],
}) {
  const { Manifold } = await getEngine();
  const width = cavityWidth + 2 * slop;
  const depth = cavityDepth + 2 * slop;
  const thin = 0.01;

  const cavities = [];
  for (const [x, y] of offsets) {
    const through = Manifold.cube([width, depth, height + UNDERSHOOT], true).translate([
      x,
      y,
      (height - UNDERSHOOT) / 2,
    ]);
    const flare = Manifold.hull([
      Manifold.cube([width + 2 * leadIn, depth + 2 * leadIn, thin], true).translate([x, y, 0]),
      Manifold.cube([width, depth, thin], true).translate([x, y, leadInHeight]),
    ]);
    cavities.push(through.add(flare));
  }
  return Manifold.union(cavities);
}
