// Where each cap sits when the viewer arranges more than one of them. Pure
// arithmetic: no GL, no DOM, so it can be unit-tested on its own and still be
// inlined into the standalone page.

export const AXES = ["off", "x", "y"];

/**
 * The axes are the screen's, not the world's. The viewer's camera looks along
 * world +Y with Z up, so "x" spreads caps across the screen and "y" spreads
 * them up it. Laying them out along world Y would stack them along the line of
 * sight, where every cap but the nearest is hidden behind another.
 */
const WORLD_INDEX = { x: 0, y: 2 };

/** Gap left between neighbouring caps, in millimetres. */
export const SLOT_GAP = 4;

/**
 * Lay picks out on a grid, centred on the origin.
 *
 * A slot's index comes from the profile's place in the catalogue and from the
 * row number itself, never from a running counter -- so a profile that has no
 * R5 leaves that slot empty instead of pulling later profiles along, and row
 * numbers line up across every column.
 *
 * Setting both axes the same is meaningful rather than an error: rows become
 * the minor step inside each profile's group, giving one line grouped by
 * profile.
 *
 * @param {object} options
 * @param {Array<{profile: string, row: number}>} options.picks caps to place
 * @param {string[]} options.profileOrder profile ids, in catalogue order
 * @param {number[]} options.rowOrder row numbers, ascending
 * @param {"off"|"x"|"y"} options.profileAxis
 * @param {"off"|"x"|"y"} options.rowAxis
 * @param {{x: number, y: number}} options.pitch centre-to-centre spacing
 * @returns {Array<{pick: object, offset: [number, number, number]}>}
 */
export function arrangeSlots({ picks, profileOrder, rowOrder, profileAxis, rowAxis, pitch }) {
  for (const [name, axis] of [["profileAxis", profileAxis], ["rowAxis", rowAxis]]) {
    if (!AXES.includes(axis)) {
      throw new Error(`${name} must be one of ${AXES.join(", ")}, received "${axis}"`);
    }
  }

  const stacked = profileAxis !== "off" && profileAxis === rowAxis;
  const rowSpan = stacked ? rowOrder.length : 1;

  const placed = picks.map((pick) => {
    const profileIndex = profileOrder.indexOf(pick.profile);
    const rowIndex = rowOrder.indexOf(pick.row);
    // Along one axis, a profile occupies a block of row-sized slots.
    const profileStep = profileAxis === "off" ? 0 : Math.max(0, profileIndex) * rowSpan;
    const rowStep = rowAxis === "off" ? 0 : Math.max(0, rowIndex);

    const offset = [0, 0, 0];
    if (profileAxis !== "off") add(offset, profileAxis, profileStep, pitch);
    if (rowAxis !== "off") add(offset, rowAxis, rowStep, pitch);
    return { pick, offset };
  });

  return centre(placed);
}

function add(offset, axis, steps, pitch) {
  offset[WORLD_INDEX[axis]] += steps * pitch[axis];
}

/** Shift the whole arrangement so it straddles the origin. */
function centre(placed) {
  if (placed.length === 0) return placed;
  for (const index of [WORLD_INDEX.x, WORLD_INDEX.y]) {
    const values = placed.map((entry) => entry.offset[index]);
    const middle = (Math.min(...values) + Math.max(...values)) / 2;
    for (const entry of placed) entry.offset[index] -= middle;
  }
  return placed;
}

/**
 * Centre-to-centre spacing wide enough for the largest cap on screen, so a
 * row of 1u caps sits tight and a row of spacebars does not overlap.
 */
export function pitchFor(sizes, gap = SLOT_GAP) {
  return {
    x: Math.max(...sizes.map((size) => size.width), 1) + gap,
    // Vertical on screen, so the caps' height is what has to clear, not their
    // depth -- an SA stacked above a DSA needs room for 16.7 mm, not 18.2 mm
    // of footprint.
    y: Math.max(...sizes.map((size) => Math.max(size.height, size.depth)), 1) + gap,
  };
}

/**
 * How far the furthest point of a cap can swing from its own origin. Framing
 * has to allow for this: caps turn about their base, so a tall one sweeps a
 * wider circle than its footprint suggests.
 */
export function swingRadius(box) {
  return Math.max(
    ...[
      [box.min[0], box.min[1], box.min[2]],
      [box.min[0], box.min[1], box.max[2]],
      [box.min[0], box.max[1], box.min[2]],
      [box.min[0], box.max[1], box.max[2]],
      [box.max[0], box.min[1], box.min[2]],
      [box.max[0], box.min[1], box.max[2]],
      [box.max[0], box.max[1], box.min[2]],
      [box.max[0], box.max[1], box.max[2]],
    ].map((corner) => Math.hypot(corner[0], corner[1], corner[2])),
  );
}

/** Which stage edge a set of labels runs along. */
const DEFAULT_EDGE = { x: "bottom", y: "left" };
const OPPOSITE_EDGE = { bottom: "top", left: "right" };

/**
 * The label positions for an arrangement: one tick per column and per row,
 * with the stage edge each set belongs to.
 *
 * A column holds many caps, so ticks are deduplicated by coordinate. With both
 * axes running along one line, a profile's tick sits at the centre of its block
 * of row slots, so its name lands under the group rather than under its first
 * cap. The two sets never share an edge: whichever would collide moves to the
 * opposite side.
 *
 * @param {object} options
 * @param {Array<{pick: object, offset: number[]}>} options.slots placed caps
 * @param {"off"|"x"|"y"} options.profileAxis
 * @param {"off"|"x"|"y"} options.rowAxis
 */
export function axisTicks({ slots, profileAxis, rowAxis }) {
  const stacked = profileAxis !== "off" && profileAxis === rowAxis;
  const profiles = ticksFor(slots, profileAxis, (pick) => pick.profile, (pick) => pick.profile);
  // On one shared line each profile block repeats the rows, so a row tick
  // belongs to a cap rather than to a row number: keying by the number alone
  // would collapse every R1 in the arrangement into one label in the middle.
  const rows = ticksFor(
    slots,
    rowAxis,
    stacked ? (pick) => pick.profile + "|" + pick.row : (pick) => pick.row,
    (pick) => pick.row,
  );

  const profileEdge = profileAxis === "off" ? null : DEFAULT_EDGE[profileAxis];
  let rowEdge = rowAxis === "off" ? null : DEFAULT_EDGE[rowAxis];
  if (rowEdge && rowEdge === profileEdge) rowEdge = OPPOSITE_EDGE[rowEdge];

  return {
    profiles: profiles.map(({ label, coord }) => ({ id: label, coord })),
    rows: rows.map(({ label, coord }) => ({ row: label, coord })),
    profileEdge,
    rowEdge,
  };
}

function ticksFor(slots, axis, keyOf, labelOf) {
  if (axis === "off") return [];
  const index = WORLD_INDEX[axis];
  const spans = new Map();
  for (const slot of slots) {
    const key = keyOf(slot.pick);
    const at = slot.offset[index];
    const span = spans.get(key);
    if (span) {
      span.min = Math.min(span.min, at);
      span.max = Math.max(span.max, at);
    } else {
      spans.set(key, { min: at, max: at, label: labelOf(slot.pick) });
    }
  }
  return [...spans.values()]
    .map((span) => ({ label: span.label, coord: (span.min + span.max) / 2 }))
    .sort((a, b) => a.coord - b.coord);
}
