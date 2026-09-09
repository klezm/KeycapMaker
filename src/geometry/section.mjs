const MIN_CORNER_RADIUS = 0.05;

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
export function ringPointCount(cornerSegments) {
  return 4 * (cornerSegments + 1);
}

/**
 * Circular subdivisions needed to keep the facet's deviation from the true
 * circle under `maxDeviation` (the arc sagitta). Sizing by sagitta rather than
 * chord length matters here: a dish sphere can have a 40 mm radius, where a
 * chord budget would demand hundreds of needless segments.
 */
export function segmentsForRadius(radius, maxDeviation = 0.02, min = 16, max = 256) {
  const r = Math.max(radius, 0.01);
  const ratio = Math.min(1, maxDeviation / r);
  const needed = Math.ceil(Math.PI / Math.acos(1 - ratio));
  return Math.min(max, Math.max(min, needed));
}
