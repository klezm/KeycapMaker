import { applyQuality, DEFAULT_QUALITY } from "./engine.mjs";
import { resolveSpec } from "./profiles/index.mjs";
import { getStem, stemFitsMount } from "./stems/index.mjs";
import { buildRings } from "./geometry/shell.mjs";
import { loftRings } from "./geometry/loft.mjs";
import { dishCutter } from "./geometry/dish.mjs";

/**
 * How far up into the roof the stem post is buried, as a fraction of the roof
 * thickness. Anything strictly between 0 and 1 gives a clean overlap.
 */
const STEM_BOND_FRACTION = 0.4;

/**
 * Vertex merge tolerance applied once the cap is assembled. At a micron it
 * only collapses geometry the booleans left coplanar -- the flat sidewall
 * panels a loft emits as separate quads, mostly -- which drops around a fifth
 * of the triangles for a volume change in the eighth decimal place.
 */
const SIMPLIFY_TOLERANCE = 1e-6;

export const DEFAULTS = {
  wall: 1.5,
  topThickness: 1.2,
  stemSlop: 0.15,
  quality: DEFAULT_QUALITY,
};

/**
 * Build one blank keycap as a single watertight solid.
 *
 * Outer shell, dish, cavity and stem are all cut from the same profile spec,
 * so the roof keeps an even thickness and the stem meets the underside of the
 * dish exactly, whatever the row's tilt.
 *
 * @returns {Promise<{solid: object, spec: object, stats: object}>}
 */
export async function buildKeycap({
  profile,
  row,
  units = 1,
  stem: stemId = "mx",
  wall = DEFAULTS.wall,
  topThickness = DEFAULTS.topThickness,
  stemSlop = DEFAULTS.stemSlop,
  quality = DEFAULTS.quality,
}) {
  const spec = resolveSpec(profile, row, units, { wall, topThickness });
  const stem = getStem(stemId);
  if (!stemFitsMount(stemId, spec.mount)) {
    throw new Error(
      `Stem "${stemId}" does not fit a ${spec.mount}-mount profile like "${profile}". ` +
        `It mounts on: ${stem.spec.mounts.join(", ")}`,
    );
  }
  if (2 * wall >= Math.min(spec.baseWidth, spec.baseDepth)) {
    throw new Error(`Wall thickness ${wall} mm is too thick for a ${profile} ${units}u cap`);
  }
  if (topThickness >= spec.height) {
    throw new Error(`Roof thickness ${topThickness} mm exceeds the ${profile} R${row} height`);
  }

  const { stations, cornerSegments } = await applyQuality(quality);
  const ringOptions = { stations, cornerSegments };

  const outer = await loftRings(buildRings(spec, ringOptions));
  // A flat top has no dish to cut; the cutter still carves the cavity below.
  const cap =
    spec.dish.type === "flat" ? outer : outer.subtract(await dishCutter(spec, 0));

  const roofCutter = await dishCutter(spec, topThickness);
  const cavity = (
    await loftRings(buildRings(spec, { ...ringOptions, inset: wall, extendBelow: 1 }))
  ).subtract(roofCutter);

  let solid = cap.subtract(cavity);

  // The stem is one extrusion running from the open bottom up past the roof,
  // with its slot or sockets cut into the lower part. Cutting it back with a
  // dish cutter that sits a little higher than the one that carved the cavity
  // leaves the post buried inside the roof: stopping it exactly at the roof
  // would have the stem and the shell share a surface, and the union of two
  // co-surface solids leaves degenerate slivers behind. An overlap does not.
  const stemBody = await stem.build({ slop: stemSlop, top: spec.height + 5 });
  if (stemBody) {
    const bondCutter = await dishCutter(spec, topThickness * STEM_BOND_FRACTION);
    solid = solid.add(stemBody.subtract(bondCutter));
  }

  solid = solid.simplify(SIMPLIFY_TOLERANCE);

  const status = solid.status();
  if (status !== "NoError") {
    throw new Error(`${profile} R${row} ${units}u ${stemId} produced an invalid solid: ${status}`);
  }
  const volume = solid.volume();
  if (!(volume > 0)) {
    throw new Error(`${profile} R${row} ${units}u ${stemId} produced an empty solid`);
  }

  const box = solid.boundingBox();
  return {
    solid,
    spec,
    stats: {
      triangles: solid.numTri(),
      volume,
      width: box.max[0] - box.min[0],
      depth: box.max[1] - box.min[1],
      height: box.max[2] - box.min[2],
      boundingBox: box,
    },
  };
}
