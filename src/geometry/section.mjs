import { surfaceDeviation } from "../engine.mjs";

const MIN_CORNER_RADIUS = 0.05;

/** Used when no quality preset has been applied yet. */
const FALLBACK_DEVIATION = 0.02;

/**
 * A sphere's facet curves away in two directions at once, so it strays further
 * from the true surface than a circle's arc does at the same angular step.
 * Measured against the kernel's own spheres the factor is a steady 2.7; 3 is
 * used here so the budget stays a guarantee rather than a target.
 */
const SPHERE_FACET_FACTOR = 3;

/**
 * Points of a closed rounded-rectangle outline, counter-clockwise when viewed
 * from +Z, starting on the +X edge at the bottom of the +X/+Y corner arc.
 *
 * Every ring in a loft must carry the same number of points in the same order,
 * so the point count depends only on `cornerSegments` -- never on the radius.
 *
 * @param {number} width      full size along X
 * @param {number} depth      full size along Y
 * @param {number} radius     corner radius, clamped to fit the rectangle
 * @param {number} cornerSegments  arc subdivisions per corner
 * @returns {Array<[number, number]>} 4 * (cornerSegments + 1) points
 */
export function roundedRectRing(width, depth, radius, cornerSegments) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const r = Math.max(MIN_CORNER_RADIUS, Math.min(radius, halfW, halfD));
  const insetX = halfW - r;
  const insetY = halfD - r;

  // Corner arc centres in the order the outline visits them, each paired with
  // the arc's start angle. Sweeping +90 degrees from each keeps winding CCW.
  const corners = [
    [insetX, insetY, 0],
    [-insetX, insetY, 90],
    [-insetX, -insetY, 180],
    [insetX, -insetY, 270],
  ];

  const points = [];
  for (const [cx, cy, startAngle] of corners) {
    for (let step = 0; step <= cornerSegments; step += 1) {
      const angle = ((startAngle + (90 * step) / cornerSegments) * Math.PI) / 180;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }
  return points;
}

/** Number of points `roundedRectRing` returns for a given corner subdivision. */
function usableBudget(maxDeviation) {
  return Number.isFinite(maxDeviation) && maxDeviation > 0 ? maxDeviation : FALLBACK_DEVIATION;
}

export function ringPointCount(cornerSegments) {
  return 4 * (cornerSegments + 1);
}

/**
 * Circular subdivisions needed to keep the facet's deviation from the true
 * circle under `maxDeviation` (the arc sagitta). Sizing by sagitta rather than
 * chord length matters here: a dish sphere can have a 40 mm radius, where a
 * chord budget would demand hundreds of needless segments.
 *
 * The budget defaults to the active quality preset's, which is what carries
 * `--quality` through to the dish and so to the top surface of the cap.
 */
export function segmentsForRadius(radius, maxDeviation = surfaceDeviation(), min = 16, max = 512) {
  const r = Math.max(radius, 0.01);
  const budget = usableBudget(maxDeviation);
  const ratio = Math.min(1, budget / r);
  const needed = Math.ceil(Math.PI / Math.acos(1 - ratio));
  return Math.min(max, Math.max(min, needed));
}

/**
 * Subdivisions for a sphere of the given radius, held to the same deviation
 * budget a flat arc gets. A prism around a circle meets the budget at the
 * midpoint of each face, but a sphere's facet has to account for curvature in
 * both directions, so it needs a tighter arc to land in the same place.
 */
export function segmentsForSphere(radius, maxDeviation = surfaceDeviation(), min = 16, max = 512) {
  return segmentsForRadius(radius, usableBudget(maxDeviation) / SPHERE_FACET_FACTOR, min, max);
}
