/**
 * A deliberately minimal parametric MX keycap.
 *
 * This exists so the tool is usable and testable with no external file. It is not
 * trying to compete with a full keycap designer — for anything sculpted, export an
 * STL from a real designer and pass it with `--cap`.
 */
import { getEngine } from "../engine.js";

export const DEFAULT_CAP = {
  units: 1, // key width in U
  height: 9.0, // total cap height, mm
  baseWidth: 18.0, // footprint of a 1u cap, mm
  unitPitch: 19.05, // added per extra U
  taper: 5.0, // how much narrower the top is than the base, mm
  cornerRadius: 1.5,
  wall: 1.4, // side wall thickness, mm
  topThickness: 1.5, // roof thickness — this is what the graphic cuts through
  dish: "cyl", // "cyl" | "sph" | "flat"
  dishDepth: 1.0, // how deep the dish is at its lowest point, mm
  stem: "mx", // "mx" | "none"
  segments: 64,
};

/** Rounded rectangle centred on the origin. */
function roundedRect(CrossSection, width, depth, radius) {
  const r = Math.max(0, Math.min(radius, width / 2 - 0.01, depth / 2 - 0.01));
  if (r <= 0) return CrossSection.square([width, depth], true);
  return CrossSection.square([width - 2 * r, depth - 2 * r], true).offset(r, "Round", 2, 32);
}

function dishCutter(Manifold, options, width, depth) {
  const { dish, dishDepth, height, segments } = options;
  if (dish === "flat" || dishDepth <= 0) return null;

  if (dish === "sph") {
    // Sphere through the four top corners, dipping `dishDepth` at the centre.
    const half = Math.hypot(width, depth) / 2;
    const radius = (half * half + dishDepth * dishDepth) / (2 * dishDepth);
    return Manifold.sphere(radius, segments * 2).translate([0, 0, height + radius - dishDepth]);
  }

  // Cylindrical: axis along X, so the dish runs front-to-back.
  const half = depth / 2;
  const radius = (half * half + dishDepth * dishDepth) / (2 * dishDepth);
  return Manifold.cylinder(width * 3, radius, radius, segments * 2, true)
    .rotate([0, 90, 0])
    .translate([0, 0, height + radius - dishDepth]);
}

function mxStem(Manifold, options, ceilingZ) {
  const segments = options.segments;
  // Cherry MX nominal socket: 5.5 mm boss around a 4.1 x 1.17 mm cross.
  const boss = Manifold.cylinder(ceilingZ + 1, 2.75, 2.75, segments, false);
  const armA = Manifold.cube([4.1, 1.17, 2 * (ceilingZ + 1)], true);
  const armB = Manifold.cube([1.17, 4.1, 2 * (ceilingZ + 1)], true);
  const cross = armA.add(armB).translate([0, 0, 4.0]);
  return boss.subtract(cross);
}

/**
 * Build a keycap solid.
 *
 * @param {Partial<typeof DEFAULT_CAP>} [params]
 * @returns {Promise<{
 *   solid: import("manifold-3d").Manifold,
 *   topOutline: import("manifold-3d").CrossSection,
 *   topWallUndersideZ: number,
 *   params: typeof DEFAULT_CAP,
 * }>}
 */
export async function generateKeycap(params = {}) {
  const { Manifold, CrossSection } = await getEngine();
  const options = { ...DEFAULT_CAP, ...params };
  const { units, height, baseWidth, unitPitch, taper, cornerRadius, wall, topThickness } = options;

  const bottomWidth = baseWidth + (units - 1) * unitPitch;
  const bottomDepth = baseWidth;
  const topWidth = bottomWidth - taper;
  const topDepth = bottomDepth - taper;

  // Linear taper: hull of a thin slab at each end.
  const slab = 0.01;
  const bottomSlab = roundedRect(CrossSection, bottomWidth, bottomDepth, cornerRadius).extrude(slab);
  const topSlab = roundedRect(CrossSection, topWidth, topDepth, cornerRadius)
    .extrude(slab)
    .translate([0, 0, height - slab]);
  let outer = Manifold.hull([bottomSlab, topSlab]);

  const cutter = dishCutter(Manifold, options, topWidth, topDepth);
  if (cutter) outer = outer.subtract(cutter);

  // Offsetting the finished outer solid downwards gives an inner roof exactly
  // parallel to the dished outer roof, so the top wall has constant thickness.
  const innerColumn = roundedRect(
    CrossSection,
    bottomWidth - 2 * wall,
    bottomDepth - 2 * wall,
    Math.max(0.2, cornerRadius - wall),
  )
    .extrude(height + 2)
    .translate([0, 0, -1]);
  const cavity = outer.translate([0, 0, -topThickness]).intersect(innerColumn);

  let solid = outer.subtract(cavity);

  if (options.stem === "mx") {
    // Clamping against `outer` keeps the boss from poking through the roof.
    solid = solid.add(mxStem(Manifold, options, height).intersect(outer));
  }

  return {
    solid,
    topOutline: roundedRect(CrossSection, topWidth, topDepth, cornerRadius),
    topWallUndersideZ: height - options.dishDepth - topThickness,
    params: options,
  };
}
