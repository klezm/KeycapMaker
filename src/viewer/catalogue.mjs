import { PROFILES, resolveSpec, homeRowOf } from "../profiles/index.mjs";
import { STEMS } from "../stems/index.mjs";
import { SIZES, MOUNT_FAMILIES } from "../sizes.mjs";
import { STABILIZER_SPANS, stabilizerSpanUnits } from "../stabilizers.mjs";
import { HOMING_TYPES } from "../homing.mjs";
import { DEFAULTS, stemFitProblem } from "../keycap.mjs";
import { stemLayout, AUTO, NONE } from "../stabilizers.mjs";

/**
 * Combinations the generator would refuse because a stem cannot physically sit
 * in that cap. The viewer greys these out rather than letting someone pick a
 * cap that will only come back as an error.
 */
function fitConflicts(mode) {
  const conflicts = [];
  for (const profile of PROFILES) {
    for (const stem of STEMS) {
      if (!stem.spec.mounts.includes(profile.mount)) continue;
      for (const units of SIZES) {
        const reason = stemFitProblem({
          spec: resolveSpec(profile.id, profile.rows[0], units),
          stemSpec: stem.spec,
          layout: stemLayout(units, profile.mount, mode),
        });
        if (reason) conflicts.push({ profile: profile.id, units, stem: stem.spec.id, reason });
      }
    }
  }
  return conflicts;
}

/**
 * Everything the viewer's controls need to know, in one JSON-safe object:
 * what exists, what fits what, and what each choice will produce.
 */
export function buildCatalogue() {
  return {
    profiles: PROFILES.map((profile) => {
      const homeRow = homeRowOf(profile);
      return {
        id: profile.id,
        name: profile.name,
        mount: profile.mount,
        sculpted: profile.sculpted,
        rows: profile.rows,
        homeRow,
        homeHeight: Number(resolveSpec(profile.id, homeRow, 1).height.toFixed(2)),
        dish: profile.dish.type,
        notes: profile.notes,
      };
    }),
    stems: STEMS.map((stem) => ({
      id: stem.spec.id,
      name: stem.spec.name,
      mounts: stem.spec.mounts,
      height: stem.spec.height,
      description: stem.spec.description,
    })),
    sizes: SIZES.map((units) => ({
      units,
      stabilizerSpanUnits: stabilizerSpanUnits(units),
    })),
    homing: HOMING_TYPES,
    mounts: MOUNT_FAMILIES,
    stabilizerSpans: STABILIZER_SPANS,
    conflicts: {
      [AUTO]: fitConflicts(AUTO),
      [NONE]: fitConflicts(NONE),
    },
    defaults: {
      profile: "cherry",
      row: 3,
      units: 1,
      stem: "mx",
      stabilizers: DEFAULTS.stabilizers,
      homing: DEFAULTS.homing,
    },
  };
}
