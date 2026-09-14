import { roundedRectFromEdges } from "./section.mjs";

const MIN_DIMENSION = 0.2;

/**
 * The horizontal rings of a keycap sidewall, bottom to top.
 *
 * The base ring is flat at z = 0 and the top ring is the tilted top plate;
 * intermediate rings interpolate between them vertex-for-vertex. Height
 * advances linearly with the station index while the horizontal shrink follows
 * `wallBow`, so an exponent above 1 bows the walls outward instead of running
 * them straight to the top plate.
 *
 * @param {object} spec resolved profile spec
 * @param {object} options
 * @param {number} [options.inset] shrink every ring by this much per side (walls)
 * @param {number} [options.extendBelow] add a ring this far below z = 0
 */
export function buildRings(spec, { stations, cornerSegments, inset = 0, extendBelow = 0 } = {}) {
  const baseRing = roundedRectFromEdges(
    insetEdges(
      { left: -spec.baseWidth / 2, right: spec.baseWidth / 2, front: -spec.baseDepth / 2, back: spec.baseDepth / 2 },
      inset,
    ),
    insetRadius(spec.cornerRadius, inset),
    cornerSegments,
  );

  // The top plate is built about its own centre so the row's tilt turns it on
  // its own axis, then carried out to wherever the edges put it. With an
  // asymmetric taper that centre is no longer the cap's centre.
  const topEdges = insetEdges(spec.topEdges, inset);
  const centreX = (topEdges.left + topEdges.right) / 2;
  const centreY = (topEdges.front + topEdges.back) / 2;
  const topPlate = roundedRectFromEdges(
    {
      left: topEdges.left - centreX,
      right: topEdges.right - centreX,
      front: topEdges.front - centreY,
      back: topEdges.back - centreY,
    },
    insetRadius(spec.topCornerRadius, inset),
    cornerSegments,
  );

  const theta = (spec.tilt * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const topRing = topPlate.map(([dx, dy]) => [
    centreX + dx,
    centreY + dy * cos,
    spec.height + dy * sin,
  ]);

  const rings = [];
  if (extendBelow > 0) {
    rings.push(baseRing.map(([x, y]) => [x, y, -extendBelow]));
  }
  for (const u of stationFractions(spec, stations)) {
    const k = shrinkAt(spec, u);
    rings.push(
      baseRing.map(([bx, by], i) => {
        const [tx, ty, tz] = topRing[i];
        return [bx + k * (tx - bx), by + k * (ty - by), u * tz];
      }),
    );
  }
  return rings;
}

/**
 * Where to sample the sidewall, as fractions of the cap's height.
 *
 * Evenly spaced, plus one landing exactly on the top of the skirt: the wall
 * changes direction there, and a crease that falls between two stations comes
 * out rounded off instead of sharp.
 */
function stationFractions(spec, stations) {
  const fractions = new Set();
  for (let station = 0; station <= stations; station += 1) fractions.add(station / stations);
  const skirt = skirtFraction(spec);
  if (skirt > 0) fractions.add(skirt);
  return [...fractions].sort((a, b) => a - b);
}

function skirtFraction(spec) {
  const height = Math.max(spec.height, 0.01);
  return Math.max(0, Math.min(0.95, (spec.skirt ?? 0) / height));
}

/**
 * How far the section has closed in towards the top plate at height `u`.
 *
 * Below the skirt it has not started: the walls stand vertical at the base
 * footprint. Above it, the profile's own `wallBow` easing runs over whatever
 * height is left.
 */
export function shrinkAt(spec, u) {
  const skirt = skirtFraction(spec);
  if (u <= skirt) return 0;
  const remaining = Math.max(1 - skirt, 1e-6);
  return ((u - skirt) / remaining) ** spec.wallBow;
}

/** Pull all four edges in by the wall thickness, without letting them cross. */
function insetEdges(edges, inset) {
  const keepOpen = (low, high) => {
    const span = Math.max(MIN_DIMENSION, high - low - 2 * inset);
    const middle = (low + high) / 2;
    return [middle - span / 2, middle + span / 2];
  };
  const [left, right] = keepOpen(edges.left, edges.right);
  const [front, back] = keepOpen(edges.front, edges.back);
  return { left, right, front, back };
}

/** A corner radius follows the offset surface, so it loses the wall once. */
function insetRadius(radius, inset) {
  return Math.max(0.05, radius - inset);
}
