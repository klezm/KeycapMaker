/**
 * Adjustments to a profile's geometry.
 *
 * Every modifier is a delta, not a value: zero means "whatever the profile
 * says". That is what lets one setting travel across profiles and still leave
 * each of them recognisable -- a DSA and an SA both 2 mm taller are still a DSA
 * and an SA, where setting both to 12 mm would flatten the comparison.
 *
 * `wall`, `topThickness` and `stemSlop` are deliberately not here. They are not
 * profile properties, so there is nothing for them to be relative to; they stay
 * the absolute options they already are.
 */

/** Which way a side's inset runs from the base edge towards the top edge. */
const SIDE_SIGN = { left: 1, right: -1, front: 1, back: -1 };

/** The smallest top plate a taper is allowed to leave, in millimetres. */
const MIN_TOP_SPAN = 2;

/** How much cap has to survive under the roof and the dish, in millimetres. */
const MIN_HEADROOM = 0.6;

/**
 * The shortest a cap may be shrunk to.
 *
 * A cap is not just its outside: the roof and the dish are cut out of the same
 * height, so on an already-flat profile like Choc the floor is most of what is
 * there. Clamping here rather than refusing means one slider setting can be
 * swept across every profile at once -- a short one simply stops shrinking.
 */
function minimumHeight(spec) {
  return spec.topThickness + spec.dish.depth + MIN_HEADROOM;
}

/** How deep the dish may be cut before it meets the roof from above. */
function deepestDish(spec) {
  return Math.max(0, spec.height - spec.topThickness - MIN_HEADROOM);
}

function insetOf(work, side) {
  return SIDE_SIGN[side] * (work.topEdges[side] - work.baseEdges[side]);
}

function setInset(work, side, inset) {
  work.topEdges[side] = work.baseEdges[side] + SIDE_SIGN[side] * inset;
}

/**
 * Turn one side in by `degrees`.
 *
 * A profile stores a top plate, not an angle, so the angle it implies is
 * recovered from how far that side already leans in over the cap's height. The
 * delta is added to that, which is what makes the control read as "steeper" or
 * "shallower" rather than replacing the profile's shape.
 */
function taperSide(work, side, degrees) {
  const height = Math.max(work.spec.height, 0.01);
  const angle = Math.atan2(insetOf(work, side), height) + (degrees * Math.PI) / 180;
  setInset(work, side, Math.tan(angle) * height);
}

/** Grow or shrink the plate about its own centre, along one axis. */
function resizeTop(work, axis, delta) {
  const [low, high] = axis === "x" ? ["left", "right"] : ["front", "back"];
  work.topEdges[low] -= delta / 2;
  work.topEdges[high] += delta / 2;
}

export const MODIFIER_GROUPS = ["size", "shape", "surface", "stem"];

/**
 * The registry. Order matters and is the order they are applied: height first,
 * because the taper angles are measured over it.
 */
export const MODIFIERS = [
  {
    id: "height",
    group: "size",
    label: "Cap height",
    unit: "mm",
    min: -6,
    max: 12,
    step: 0.1,
    apply: (work, delta) => {
      work.spec.height = Math.max(minimumHeight(work.spec), work.spec.height + delta);
    },
  },
  {
    id: "side-wall",
    group: "size",
    label: "Side wall height",
    unit: "mm",
    min: 0,
    max: 10,
    step: 0.1,
    hint: "A vertical skirt before the taper starts. The cap keeps its roof.",
    apply: (work, delta) => {
      work.spec.skirt = Math.max(0, delta);
    },
  },
  {
    id: "taper",
    group: "shape",
    label: "Taper, all sides",
    unit: "deg",
    min: -15,
    max: 12,
    step: 0.5,
    hint: "Steeper sides make a smaller top face.",
    apply: (work, delta) => {
      for (const side of Object.keys(SIDE_SIGN)) taperSide(work, side, delta);
    },
  },
  ...["front", "back", "left", "right"].map((side) => ({
    id: "taper-" + side,
    group: "shape",
    label: "Taper, " + side,
    unit: "deg",
    min: -15,
    max: 12,
    step: 0.5,
    apply: (work, delta) => taperSide(work, side, delta),
  })),
  {
    id: "top-width",
    group: "size",
    label: "Top face width",
    unit: "mm",
    // Not below the widest stem post, or the cap closes around it.
    min: -6,
    max: 8,
    step: 0.1,
    apply: (work, delta) => resizeTop(work, "x", delta),
  },
  {
    id: "top-depth",
    group: "size",
    label: "Top face depth",
    unit: "mm",
    min: -6,
    max: 8,
    step: 0.1,
    apply: (work, delta) => resizeTop(work, "y", delta),
  },
  {
    id: "tilt",
    group: "shape",
    label: "Sculpt tilt",
    unit: "deg",
    min: -15,
    max: 15,
    step: 0.5,
    hint: "The lean of the top plate, which is what separates R1 from R5.",
    apply: (work, delta) => {
      work.spec.tilt += delta;
    },
  },
  {
    id: "corner-radius",
    group: "shape",
    label: "Corner radius",
    unit: "mm",
    min: -0.9,
    max: 4,
    step: 0.1,
    apply: (work, delta) => {
      work.spec.cornerRadius = Math.max(0.05, work.spec.cornerRadius + delta);
    },
  },
  {
    id: "top-corner-radius",
    group: "shape",
    label: "Top corner radius",
    unit: "mm",
    min: -1.4,
    max: 4,
    step: 0.1,
    apply: (work, delta) => {
      work.spec.topCornerRadius = Math.max(0.05, work.spec.topCornerRadius + delta);
    },
  },
  {
    id: "dish-depth",
    group: "surface",
    label: "Dish depth",
    unit: "mm",
    min: -2,
    max: 4,
    step: 0.05,
    apply: (work, delta) => {
      const depth = Math.max(0, work.spec.dish.depth + delta);
      work.spec.dish = { ...work.spec.dish, depth: Math.min(depth, deepestDish(work.spec)) };
    },
  },
  {
    id: "stem-height",
    group: "stem",
    label: "Stem height",
    unit: "mm",
    min: -2,
    max: 6,
    step: 0.1,
    hint: "How deep the switch seats into the cap.",
    apply: (work, delta) => {
      work.spec.stemHeightDelta = delta;
    },
  },
];

const BY_ID = new Map(MODIFIERS.map((entry) => [entry.id, entry]));

export function modifierIds() {
  return MODIFIERS.map((entry) => entry.id);
}

export function getModifier(id) {
  const modifier = BY_ID.get(id);
  if (!modifier) {
    throw new Error(`Unknown adjustment "${id}". Expected one of: ${modifierIds().join(", ")}`);
  }
  return modifier;
}

/** Reject anything that is not a known id with a finite delta. */
export function validateModifiers(modifiers = {}) {
  for (const [id, delta] of Object.entries(modifiers)) {
    getModifier(id);
    if (!Number.isFinite(delta)) {
      throw new Error(`Adjustment "${id}" must be a number, received "${delta}"`);
    }
  }
  return modifiers;
}

/** The ones actually set, in registry order, for naming and reporting. */
export function activeModifiers(modifiers = {}) {
  return MODIFIERS.filter((entry) => Number.isFinite(modifiers[entry.id]) && modifiers[entry.id] !== 0).map(
    (entry) => ({ id: entry.id, delta: modifiers[entry.id], unit: entry.unit }),
  );
}

/**
 * Apply every set modifier to a resolved spec, in registry order.
 *
 * The plate is carried as four independent edges while this runs, so a taper on
 * one side moves that side alone; width, depth and offsets are derived back out
 * at the end for everything downstream that still thinks in spans.
 */
export function applyModifiers(spec, modifiers = {}) {
  validateModifiers(modifiers);
  if (Object.keys(modifiers).length === 0) return spec;

  const work = {
    spec,
    baseEdges: {
      left: -spec.baseWidth / 2,
      right: spec.baseWidth / 2,
      front: -spec.baseDepth / 2,
      back: spec.baseDepth / 2,
    },
    topEdges: { ...spec.topEdges },
  };

  for (const modifier of MODIFIERS) {
    const delta = modifiers[modifier.id];
    if (Number.isFinite(delta) && delta !== 0) modifier.apply(work, delta);
  }

  // A steep enough taper would turn the plate inside out; hold it open instead.
  for (const [low, high] of [["left", "right"], ["front", "back"]]) {
    const span = work.topEdges[high] - work.topEdges[low];
    if (span >= MIN_TOP_SPAN) continue;
    const middle = (work.topEdges[low] + work.topEdges[high]) / 2;
    work.topEdges[low] = middle - MIN_TOP_SPAN / 2;
    work.topEdges[high] = middle + MIN_TOP_SPAN / 2;
  }

  spec.topEdges = work.topEdges;
  spec.topWidth = work.topEdges.right - work.topEdges.left;
  spec.topDepth = work.topEdges.back - work.topEdges.front;
  spec.topOffsetX = (work.topEdges.left + work.topEdges.right) / 2;
  spec.topOffsetY = (work.topEdges.front + work.topEdges.back) / 2;
  return spec;
}

/** A compact, sorted filename token so adjusted caps never collide with stock ones. */
export function modifierToken(modifiers = {}) {
  return activeModifiers(modifiers)
    .map(({ id, delta }) => `_${id}${delta > 0 ? "+" : ""}${Number(delta.toFixed(3))}`)
    .join("");
}

/** A one-line summary for reports and file metadata. */
export function describeModifiers(modifiers = {}) {
  const active = activeModifiers(modifiers);
  if (active.length === 0) return "none";
  return active
    .map(({ id, delta, unit }) => `${id} ${delta > 0 ? "+" : ""}${Number(delta.toFixed(3))} ${unit}`)
    .join(", ");
}

/**
 * Read `name=value` pairs, as the command line and the viewer's query string
 * both supply them. Values are deltas, so a bare number is signed either way.
 */
export function parseModifiers(entries = []) {
  const modifiers = {};
  for (const entry of entries.flatMap((item) => String(item).split(","))) {
    const text = entry.trim();
    if (!text) continue;
    const at = text.indexOf("=");
    if (at < 0) {
      throw new Error(`Adjustment "${text}" needs a value, as in height=+2`);
    }
    const id = text.slice(0, at).trim();
    const delta = Number(text.slice(at + 1).trim());
    getModifier(id);
    if (!Number.isFinite(delta)) {
      throw new Error(`Adjustment "${id}" must be a number, received "${text.slice(at + 1).trim()}"`);
    }
    modifiers[id] = delta;
  }
  return modifiers;
}
