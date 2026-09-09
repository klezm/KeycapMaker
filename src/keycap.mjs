import { applyQuality, DEFAULT_QUALITY } from "./engine.mjs";
import { resolveSpec } from "./profiles/index.mjs";
import { getStem, stemFitsMount } from "./stems/index.mjs";
import { buildRings } from "./geometry/shell.mjs";
import { loftRings } from "./geometry/loft.mjs";
import { dishCutter } from "./geometry/dish.mjs";
import { stemLayout, AUTO } from "./stabilizers.mjs";
import { getEngine } from "./engine.mjs";

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

/** Clearance kept between a stem and the inside of the sidewall. */
const STEM_WALL_CLEARANCE = 0.2;

export const DEFAULTS = {
  wall: 1.5,
  topThickness: 1.2,
  stemSlop: 0.15,
  quality: DEFAULT_QUALITY,
  stabilizers: AUTO,
};

/**
 * Half the inside width and depth of the cavity at height `z`.
 *
 * This mirrors the loft in `buildRings`: height advances linearly while the
 * horizontal shrink follows `wallBow`. Knowing the cavity's cross-section at
 * the top of a stem is what lets a stabiliser position be checked before any
 * geometry is built.
 */
export function cavityHalfExtent(spec, z, wall) {
  const u = Math.min(1, Math.max(0, z / spec.height));
  const k = u ** spec.wallBow;
  const at = (base, top) => (base - 2 * wall + k * (top - base)) / 2;
  return {
    x: at(spec.baseWidth, spec.topWidth),
    y: at(spec.baseDepth, spec.topDepth),
  };
}

/**
 * Why a stem layout will not fit inside a cap, or null if it fits.
 *
 * Checked at the top of the stem, where the tapering cavity is narrowest
 * around it. Callers that build a single cap treat this as an error; the batch
 * runner treats it as a reason to skip the combination.
 */
export function stemFitProblem({ spec, stemSpec, layout, wall = DEFAULTS.wall }) {
  if (!stemSpec.footprint.width) return null;
  const room = cavityHalfExtent(spec, stemSpec.height, wall);
  const halfWidth = stemSpec.footprint.width / 2;
  const halfDepth = stemSpec.footprint.depth / 2;

  if (halfDepth + STEM_WALL_CLEARANCE > room.y) {
    return `a ${stemSpec.id} stem is ${stemSpec.footprint.depth} mm deep, too deep for the cavity of a ${spec.profile} ${spec.units}u cap`;
  }
  for (const position of layout) {
    if (Math.abs(position.x) + halfWidth + STEM_WALL_CLEARANCE > room.x) {
      return `a ${stemSpec.id} ${position.role} stem at x=${position.x.toFixed(2)} mm would breach the sidewall of a ${spec.profile} ${spec.units}u cap`;
    }
  }
  return null;
}

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
  stabilizers = DEFAULTS.stabilizers,
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
  // A wide key rides on one switch plus a stabiliser at each end. Cherry
  // stabiliser inserts take the same stem the switch does, so the same post is
  // repeated at the spacing the key width calls for.
  const layout = stemLayout(units, spec.mount, stabilizers);
  const problem = stemFitProblem({ spec, stemSpec: stem.spec, layout, wall });
  if (problem) throw new Error(`Cannot build ${profile} R${row} ${units}u: ${problem}`);

  const stemBody = await stem.build({ slop: stemSlop, top: spec.height + 5 });
  if (stemBody) {
    const { Manifold } = await getEngine();
    const bondCutter = await dishCutter(spec, topThickness * STEM_BOND_FRACTION);
    const posts = layout.map((position) => stemBody.translate([position.x, position.y, 0]));
    solid = solid.add(Manifold.union(posts).subtract(bondCutter));
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
    layout,
    stats: {
      stems: stemBody ? layout.length : 0,
      stemSpan: layout.length > 1 ? layout.at(-1).x - layout[0].x : 0,
      triangles: solid.numTri(),
      volume,
      width: box.max[0] - box.min[0],
      depth: box.max[1] - box.min[1],
      height: box.max[2] - box.min[2],
      boundingBox: box,
    },
  };
}
