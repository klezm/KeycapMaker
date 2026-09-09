import { roundedRectRing } from "./section.mjs";

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
  const baseRing = roundedRectRing(
    insetSpan(spec.baseWidth, inset),
    insetSpan(spec.baseDepth, inset),
    insetRadius(spec.cornerRadius, inset),
    cornerSegments,
  );

  const topPlate = roundedRectRing(
    insetSpan(spec.topWidth, inset),
    insetSpan(spec.topDepth, inset),
    insetRadius(spec.topCornerRadius, inset),
    cornerSegments,
  );

  // Tilt the top plate about the X axis running through its own centre.
  const theta = (spec.tilt * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const topRing = topPlate.map(([x, dy]) => [
    x,
    spec.topOffsetY + dy * cos,
    spec.height + dy * sin,
  ]);

  const rings = [];
  if (extendBelow > 0) {
    rings.push(baseRing.map(([x, y]) => [x, y, -extendBelow]));
  }
  for (let station = 0; station <= stations; station += 1) {
    const u = station / stations;
    const k = u ** spec.wallBow;
    rings.push(
      baseRing.map(([bx, by], i) => {
        const [tx, ty, tz] = topRing[i];
        return [bx + k * (tx - bx), by + k * (ty - by), u * tz];
      }),
    );
  }
  return rings;
}

/** A full width or depth loses the wall thickness from both sides. */
function insetSpan(span, inset) {
  return Math.max(MIN_DIMENSION, span - 2 * inset);
}

/** A corner radius follows the offset surface, so it loses the wall once. */
function insetRadius(radius, inset) {
  return Math.max(0.05, radius - inset);
}
