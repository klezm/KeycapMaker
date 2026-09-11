import { getEngine } from "./engine.mjs";
import { dishCutter } from "./geometry/dish.mjs";
import { segmentsForRadius } from "./geometry/section.mjs";

/**
 * Tactile markers for the home keys -- the ridge under your index fingers on F
 * and J, and whatever the numpad 5 uses.
 *
 * Profiles disagree about the right answer, so all four common ones are here:
 * a raised bar (Cherry and OEM), a raised dot (common on numpad 5 and on some
 * low-profile sets), a recessed bar, and a deeper dish (how the sculpted
 * spherical profiles mark their home row instead of adding anything).
 */
export const HOMING_TYPES = [
  { id: "none", name: "None", description: "An ordinary key." },
  {
    id: "bar",
    name: "Raised bar",
    description: "A ridge across the front of the keytop. The Cherry and OEM answer.",
  },
  {
    id: "dot",
    name: "Raised dot",
    description: "A single bump near the front. Common on numpad 5 and low-profile sets.",
  },
  {
    id: "groove",
    name: "Recessed bar",
    description: "The bar cut into the surface instead of raised. Nothing to snap off.",
  },
  {
    id: "scoop",
    name: "Deep dish",
    description: "No added feature: the dish itself is cut deeper, as SA and DSA mark home.",
  },
];

/**
 * Feature dimensions, in millimetres. The bar is close to what a Cherry-profile
 * F and J carry: a short ridge set just in from the front edge of the keytop.
 */
export const HOMING_SHAPE = {
  barLength: 6.0,
  barWidth: 1.2,
  barHeight: 0.5,
  dotDiameter: 1.8,
  dotHeight: 0.5,
  grooveDepth: 0.4,
  scoopExtraDepth: 1.2,
  /** How far the feature sits in from the front edge of the top plate. */
  frontMargin: 1.9,
  /** How far the feature reaches under the surface, so the union has overlap. */
  embed: 0.15,
};

const BY_ID = new Map(HOMING_TYPES.map((entry) => [entry.id, entry]));

export function homingIds() {
  return HOMING_TYPES.map((entry) => entry.id);
}

export function getHoming(id) {
  const homing = BY_ID.get(id);
  if (!homing) {
    throw new Error(`Unknown homing marker "${id}". Expected one of: ${homingIds().join(", ")}`);
  }
  return homing;
}

/** Extra dish depth this marker asks for. Only "scoop" adds any. */
export function scoopDepth(homing) {
  return homing === "scoop" ? HOMING_SHAPE.scoopExtraDepth : 0;
}

/** Where the marker sits: centred left to right, forward of the plate centre. */
function markerCentre(spec) {
  const tilt = (spec.tilt * Math.PI) / 180;
  const forward = spec.topDepth / 2 - HOMING_SHAPE.frontMargin;
  return { x: 0, y: spec.topOffsetY - forward * Math.cos(tilt) };
}

/** The plan-view outline of the marker, as a 2D cross-section. */
async function markerOutline(spec, homing) {
  const { CrossSection } = await getEngine();
  if (homing === "dot") {
    const radius = HOMING_SHAPE.dotDiameter / 2;
    return CrossSection.circle(radius, segmentsForRadius(radius));
  }
  // A stadium: a flat sliver grown sideways, which rounds the ends for free.
  const length = Math.min(HOMING_SHAPE.barLength, spec.topWidth * 0.5);
  const half = HOMING_SHAPE.barWidth / 2;
  return CrossSection.square([length - HOMING_SHAPE.barWidth, 0.001], true).offset(
    half,
    "Round",
    0,
    segmentsForRadius(half),
  );
}

/**
 * The marker, as something to add to the cap and something to cut from it.
 *
 * Both are the same construction: a slab between two copies of the cap's own
 * dish cutter, one raised and one lowered, intersected with the marker's
 * outline. Because the slab is bounded by the surface the cap was dished with,
 * the marker follows the dish and the row's tilt exactly, and keeps an even
 * thickness across a curved top. Building it from a box would leave a wedge.
 *
 * @returns {Promise<{add: object|null, subtract: object|null}>}
 */
export async function homingFeature(spec, homing) {
  if (homing === "none" || homing === "scoop") return { add: null, subtract: null };
  getHoming(homing);

  const { Manifold } = await getEngine();
  const { x, y } = markerCentre(spec);
  const prism = Manifold.extrude(await markerOutline(spec, homing), spec.height + 10).translate([
    x,
    y,
    0,
  ]);

  // A cutter lowered further covers more, so the slab between two of them is
  // the lower one minus the higher one.
  const slab = async (bottom, top) =>
    (await dishCutter(spec, bottom)).subtract(await dishCutter(spec, top));

  if (homing === "groove") {
    return {
      add: null,
      subtract: (await slab(HOMING_SHAPE.grooveDepth, -0.1)).intersect(prism),
    };
  }

  const height = homing === "dot" ? HOMING_SHAPE.dotHeight : HOMING_SHAPE.barHeight;
  return {
    add: (await slab(HOMING_SHAPE.embed, -height)).intersect(prism),
    subtract: null,
  };
}
