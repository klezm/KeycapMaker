import { getEngine } from "../engine.mjs";
import { segmentsForRadius } from "./section.mjs";

/**
 * Radius of the arc that sags `depth` over a half-span of `halfSpan`.
 * Solving R^2 = halfSpan^2 + (R - depth)^2 gives the standard sagitta relation.
 */
export function dishRadius(halfSpan, depth) {
  return (halfSpan * halfSpan + depth * depth) / (2 * depth);
}

/**
 * Distance from the top plate's centre to its outermost point. A rounded
 * rectangle's furthest point is the 45-degree point of a corner arc, not the
 * sharp corner, and sizing the dish to it is what makes the finished cap's
 * highest point land exactly on the profile's declared height.
 */
export function topPlateMaxRadius(spec) {
  const r = Math.min(spec.topCornerRadius, spec.topWidth / 2, spec.topDepth / 2);
  const diagonal = r / Math.SQRT2;
  return Math.hypot(spec.topWidth / 2 - r + diagonal, spec.topDepth / 2 - r + diagonal);
}

/**
 * A solid that removes everything above the keycap's dished top surface.
 *
 * It is shaped so the dish surface passes exactly through the rim of the top
 * plate and bottoms out `depth` below it, then tilted and placed to match the
 * row's top plate. Lowering the same cutter by the roof thickness carves the
 * inside of the cap, which is what keeps the roof an even thickness.
 *
 * @param {object} spec resolved profile spec
 * @param {number} [lower] shift the cutter down by this many millimetres
 */
export async function dishCutter(spec, lower = 0) {
  const { Manifold } = await getEngine();
  const depth = Math.max(spec.dish.depth, 0.01);
  const halfDepth = spec.topDepth / 2;
  let cutter;

  if (spec.dish.type === "spherical") {
    const radius = dishRadius(topPlateMaxRadius(spec), depth);
    cutter = Manifold.sphere(radius, segmentsForRadius(radius)).translate([
      0,
      0,
      radius - depth,
    ]);
  } else if (spec.dish.type === "cylindrical") {
    // Curves front-to-back only, so the span that matters is the plate depth.
    const radius = dishRadius(halfDepth, depth);
    const length = spec.topWidth + 20;
    cutter = Manifold.cylinder(length, radius, radius, segmentsForRadius(radius), true)
      .rotate([0, 90, 0])
      .translate([0, 0, radius - depth]);
  } else if (spec.dish.type === "flat") {
    // No dish at all: the cutter's underside sits on the top plate, so it only
    // does anything once it is lowered to carve the inside of the cap.
    const margin = 40;
    cutter = Manifold.cube(
      [spec.topWidth + margin, spec.topDepth + margin, margin],
      true,
    ).translate([0, 0, margin / 2]);
  } else {
    throw new Error(
      `Unknown dish type "${spec.dish.type}". Expected spherical, cylindrical or flat.`,
    );
  }

  return cutter
    .rotate([spec.tilt, 0, 0])
    .translate([0, spec.topOffsetY, spec.height - lower]);
}
