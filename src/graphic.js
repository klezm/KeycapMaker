/**
 * Turn parsed SVG regions into a positioned 2D cutting profile.
 *
 * SVG's Y axis points down and the model's points up, so the profile is mirrored
 * once on the way in. Skipping that flip silently mirrors every letter.
 */
import { getEngine } from "./engine.js";

/**
 * Union the parsed regions into a single CrossSection, honouring each region's
 * own fill rule (Clipper2 resolves holes and self-intersections for us).
 *
 * @param {Array<{contours: number[][][], fillRule: "NonZero"|"EvenOdd"}>} regions
 * @returns {Promise<import("manifold-3d").CrossSection>}
 */
export async function regionsToCrossSection(regions) {
  const { CrossSection } = await getEngine();
  const sections = regions
    .filter((region) => region.contours.length > 0)
    .map((region) => new CrossSection(region.contours, region.fillRule));
  if (sections.length === 0) {
    throw new Error("The SVG contains no filled shapes to cut with.");
  }
  const combined = sections.reduce((accumulated, section) => accumulated.add(section));
  // Negating Y converts SVG's y-down space to the model's y-up. manifold's
  // `mirror` takes the NORMAL of the mirror line, so [0, 1] flips Y.
  return combined.mirror([0, 1]);
}

function boundsOf(crossSection) {
  const { min, max } = crossSection.bounds();
  return {
    min,
    max,
    width: max[0] - min[0],
    height: max[1] - min[1],
    centre: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2],
  };
}

/**
 * Scale, rotate and position a profile on the keycap's top face.
 *
 * @param {import("manifold-3d").CrossSection} profile
 * @param {object} [options]
 * @param {number|[number,number]|null} [options.size] target size in mm
 * @param {[number,number]|null} [options.fitBox] fallback box when `size` is absent
 * @param {"contain"|"cover"|"exact"} [options.fit]
 * @param {number} [options.rotate] degrees, counter-clockwise
 * @param {[number,number]} [options.offset] mm, applied last
 * @param {boolean} [options.mirror] mirror left-to-right
 * @returns {{profile: import("manifold-3d").CrossSection, scale: [number, number], bounds: object}}
 */
export function placeGraphic(profile, options = {}) {
  const { size = null, fitBox = null, fit = "contain", rotate = 0, offset = [0, 0], mirror = false } = options;

  if (profile.isEmpty()) {
    throw new Error("The graphic has no filled area to cut with.");
  }

  const source = boundsOf(profile);
  if (source.width <= 0 || source.height <= 0) {
    throw new Error("The graphic is degenerate (zero width or height).");
  }

  const target = size !== null ? (Array.isArray(size) ? size : [size, size]) : fitBox;
  if (!target) throw new Error("Either `size` or `fitBox` is required to scale the graphic.");

  let scaleX;
  let scaleY;
  if (fit === "exact") {
    scaleX = target[0] / source.width;
    scaleY = target[1] / source.height;
  } else {
    const byWidth = target[0] / source.width;
    const byHeight = target[1] / source.height;
    const uniform = fit === "cover" ? Math.max(byWidth, byHeight) : Math.min(byWidth, byHeight);
    scaleX = uniform;
    scaleY = uniform;
  }

  let placed = profile
    .translate([-source.centre[0], -source.centre[1]])
    .scale([scaleX, scaleY]);
  if (mirror) placed = placed.mirror([1, 0]);
  if (rotate) placed = placed.rotate(rotate);
  // Re-centre after rotation so `offset` is measured from the graphic's own centre.
  const rotated = boundsOf(placed);
  placed = placed.translate([-rotated.centre[0] + offset[0], -rotated.centre[1] + offset[1]]);

  return { profile: placed, scale: [scaleX, scaleY], bounds: boundsOf(placed) };
}
