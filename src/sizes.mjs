/**
 * Keycap footprints by mount family.
 *
 * `pitch` is the switch spacing; the cap footprint is deliberately narrower so
 * neighbouring caps clear each other. A key that is `u` units wide grows by one
 * pitch per extra unit.
 */
export const MOUNT_FAMILIES = {
  mx: { pitch: 19.05, unitWidth: 18.16, depth: 18.16 },
  choc: { pitch: 18.0, unitWidth: 17.5, depth: 16.5 },
};

/** Widths offered on the command line, in units. */
export const SIZES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 3, 6.25, 7];

/** Base footprint in millimetres for a cap of `units` width on `mount`. */
export function footprint(units, mount) {
  const family = MOUNT_FAMILIES[mount];
  if (!family) {
    throw new Error(
      `Unknown mount family "${mount}". Expected one of: ${Object.keys(MOUNT_FAMILIES).join(", ")}`,
    );
  }
  if (!(units > 0)) throw new Error(`Key size must be positive, received ${units}`);
  return {
    width: family.unitWidth + (units - 1) * family.pitch,
    depth: family.depth,
  };
}

/** Format a size for filenames: 1 -> "1u", 1.25 -> "1.25u". */
export function formatSize(units) {
  return `${Number(units.toFixed(3))}u`;
}
