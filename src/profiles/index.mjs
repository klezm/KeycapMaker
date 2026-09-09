import { PROFILES, SCULPT_ROWS } from "./data.mjs";
import { footprint } from "../sizes.mjs";

const BY_ID = new Map(PROFILES.map((profile) => [profile.id, profile]));

export { PROFILES, SCULPT_ROWS };

/** All profile ids, in declaration order. */
export function profileIds() {
  return PROFILES.map((profile) => profile.id);
}

export function getProfile(id) {
  const profile = BY_ID.get(id);
  if (!profile) {
    throw new Error(`Unknown profile "${id}". Expected one of: ${profileIds().join(", ")}`);
  }
  return profile;
}

/**
 * Resolve a profile, row and key size into the flat dimension set the geometry
 * builder consumes. Uniform profiles ignore the row but still accept it, so a
 * caller can sweep rows across every profile without special-casing.
 */
export function resolveSpec(profileId, row, units, options = {}) {
  const profile = getProfile(profileId);
  if (!profile.rows.includes(row)) {
    throw new Error(
      `Profile "${profileId}" has no row ${row}. Available rows: ${profile.rows.join(", ")}`,
    );
  }

  const base = footprint(units, profile.mount);
  const sculpt = profile.sculpted
    ? SCULPT_ROWS[row]
    : { rise: 0, tilt: 0, shift: 0 };
  const scale = profile.sculptScale ?? 1;

  // Extra width beyond 1u lands on the top plate as well, so a 6.25u cap keeps
  // the same sidewall taper as a 1u cap instead of turning into a wedge.
  const widthGrowth = base.width - footprint(1, profile.mount).width;

  return {
    profile: profile.id,
    profileName: profile.name,
    mount: profile.mount,
    row,
    units,
    baseWidth: base.width,
    baseDepth: base.depth,
    topWidth: profile.topWidth + widthGrowth,
    topDepth: profile.topDepth,
    height: profile.homeHeight + sculpt.rise * scale,
    tilt: sculpt.tilt,
    topOffsetY: sculpt.shift,
    cornerRadius: profile.cornerRadius,
    topCornerRadius: profile.topCornerRadius,
    wallBow: profile.wallBow,
    dish: { ...profile.dish },
    wall: options.wall ?? 1.5,
    topThickness: options.topThickness ?? 1.2,
    notes: profile.notes,
  };
}
