import { MOUNT_FAMILIES } from "./sizes.mjs";

/**
 * Where the stabiliser stems sit on a wide key.
 *
 * A wide keycap rides on one switch plus a stabiliser at each end, and Cherry
 * stabiliser inserts take the same stem the switch does -- so a wide cap needs
 * the same stem repeated at the right spacing, not a different part.
 *
 * Spans are whole multiples of the switch pitch, which is where the familiar
 * millimetre figures come from: on MX's 19.05 mm pitch, 1.25u is 23.81 mm,
 * 2u is 38.10 mm, 5.25u is 100.01 mm and 6u is 114.30 mm. Choc figures are
 * derived the same way from the 18 mm Choc pitch; check them against your own
 * stabiliser hardware, and override with an explicit span if they differ.
 *
 * The table is read last-match-wins: the widest entry whose `minUnits` the key
 * reaches decides the span.
 */
export const STABILIZER_SPANS = [
  { minUnits: 2, spanUnits: 1.25 },
  { minUnits: 3, spanUnits: 2 },
  { minUnits: 6, spanUnits: 5 },
  { minUnits: 6.25, spanUnits: 5.25 },
  { minUnits: 7, spanUnits: 6 },
];

/** The narrowest key that gets stabilisers at all. */
export const STABILIZER_MIN_UNITS = STABILIZER_SPANS[0].minUnits;

export const AUTO = "auto";
export const NONE = "none";

/** Stabiliser span for a key of `units` width, in units. 0 means none. */
export function stabilizerSpanUnits(units) {
  let span = 0;
  for (const entry of STABILIZER_SPANS) {
    if (units >= entry.minUnits) span = entry.spanUnits;
  }
  return span;
}

/**
 * Resolve a `--stabilizers` setting into a span in units.
 * Accepts "auto", "none", or an explicit span (0 for none).
 */
export function resolveSpan(units, mode = AUTO) {
  if (mode === NONE) return 0;
  if (mode === AUTO || mode === undefined) return stabilizerSpanUnits(units);
  if (typeof mode === "number" && Number.isFinite(mode) && mode >= 0) return mode;
  throw new Error(`Stabiliser setting must be "auto", "none" or a span in units, received "${mode}"`);
}

/**
 * Every stem position on a key, as offsets from the cap centre.
 *
 * The switch always sits at the centre; stabilisers, when the key is wide
 * enough, sit symmetrically either side of it.
 *
 * @returns {Array<{x: number, y: number, role: "switch"|"stabilizer"}>}
 */
export function stemLayout(units, mount, mode = AUTO) {
  const family = MOUNT_FAMILIES[mount];
  if (!family) {
    throw new Error(
      `Unknown mount family "${mount}". Expected one of: ${Object.keys(MOUNT_FAMILIES).join(", ")}`,
    );
  }
  const positions = [{ x: 0, y: 0, role: "switch" }];
  const span = resolveSpan(units, mode) * family.pitch;
  if (span > 0) {
    positions.unshift({ x: -span / 2, y: 0, role: "stabilizer" });
    positions.push({ x: span / 2, y: 0, role: "stabilizer" });
  }
  return positions;
}

/**
 * How a stabiliser setting is written into a filename. The default is left
 * unmarked, so only a deliberate deviation changes the name.
 */
export function stabilizerToken(units, mode = AUTO) {
  if (mode === AUTO || mode === undefined) return "";
  const span = resolveSpan(units, mode);
  const automatic = stabilizerSpanUnits(units);
  if (span === automatic) return "";
  return span === 0 ? "_nostab" : `_stab${Number(span.toFixed(3))}u`;
}
