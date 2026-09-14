import { PROFILES, resolveSpec, homeRowOf } from "../profiles/index.mjs";
import { STEMS } from "../stems/index.mjs";
import { SIZES, MOUNT_FAMILIES } from "../sizes.mjs";
import { STABILIZER_SPANS, stabilizerSpanUnits } from "../stabilizers.mjs";
import { HOMING_TYPES } from "../homing.mjs";
import { MODIFIERS, MODIFIER_GROUPS } from "../modifiers.mjs";
import { QUALITY_PRESETS } from "../engine.mjs";
import { DEFAULTS, stemFitProblem } from "../keycap.mjs";
import { DEFAULT_QUALITY } from "../engine.mjs";
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
/**
 * Everything the page needs to build its own controls.
 *
 * `built` describes how the caps on a standalone page were actually made. The
 * page cannot rebuild them, so reporting the live defaults there would have it
 * claim a quality or a wall thickness the models do not have.
 */
export function buildCatalogue(built = {}) {
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
    // Serialised without the apply functions: the page builds its controls from
    // this, and runs none of the geometry itself.
    modifiers: MODIFIERS.map(({ id, group, label, unit, min, max, step, hint }) => ({
      id,
      group,
      label,
      unit,
      min,
      max,
      step,
      hint,
    })),
    modifierGroups: MODIFIER_GROUPS,
    qualities: Object.keys(QUALITY_PRESETS).map((id) => ({
      id,
      deviation: QUALITY_PRESETS[id].deviation,
    })),
    settings: [
      { id: "wall", label: "Wall thickness", unit: "mm", min: 0.6, max: 3, step: 0.05, value: built.wall ?? DEFAULTS.wall },
      { id: "topThickness", label: "Roof thickness", unit: "mm", min: 0.4, max: 3, step: 0.05, value: built.topThickness ?? DEFAULTS.topThickness },
      { id: "stemSlop", label: "Stem slop", unit: "mm", min: 0, max: 0.5, step: 0.01, value: built.stemSlop ?? DEFAULTS.stemSlop },
    ],
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
      quality: built.quality ?? DEFAULT_QUALITY,
      modifiers: built.modifiers ?? {},
    },
  };
}
