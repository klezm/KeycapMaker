import ManifoldModule from "manifold-3d";

export const DEFAULT_QUALITY = "standard";

/**
 * Quality presets.
 *
 * `deviation` is the budget, in millimetres, for how far a facetted curve may
 * sit from the true one. It sets the resolution of everything sized by its own
 * radius -- above all the dish, which forms the whole top surface of the cap --
 * so it is the number that decides how smooth a finished cap is. `segments` is
 * the fallback subdivision for circles with no radius to reason about,
 * `stations` is how many horizontal rings the sidewall loft is sampled at, and
 * `cornerSegments` subdivides each rounded corner of those rings.
 */
export const QUALITY_PRESETS = {
  draft: { deviation: 0.08, segments: 32, stations: 12, cornerSegments: 4 },
  standard: { deviation: 0.02, segments: 64, stations: 24, cornerSegments: 8 },
  fine: { deviation: 0.005, segments: 128, stations: 48, cornerSegments: 16 },
};

let enginePromise = null;
let deviation = QUALITY_PRESETS[DEFAULT_QUALITY].deviation;

/**
 * The active facet deviation budget in millimetres. Read by anything that
 * subdivides a curve by its radius, so one quality setting reaches the dish,
 * the stem posts and the home markers alike.
 */
export function surfaceDeviation() {
  return deviation;
}

/**
 * Boot the Manifold WASM kernel once per process (or per worker thread) and
 * hand back its exported types. Repeated calls share the same instance.
 */
export async function getEngine() {
  if (!enginePromise) {
    enginePromise = ManifoldModule().then((wasm) => {
      wasm.setup();
      return wasm;
    });
  }
  return enginePromise;
}

/**
 * Apply a quality preset to the kernel's global circular resolution and return
 * the resolved preset so callers can read `stations` from it.
 */
export async function applyQuality(quality = DEFAULT_QUALITY) {
  const preset = QUALITY_PRESETS[quality];
  if (!preset) {
    throw new Error(
      `Unknown quality "${quality}". Expected one of: ${Object.keys(QUALITY_PRESETS).join(", ")}`,
    );
  }
  const wasm = await getEngine();
  wasm.setCircularSegments(preset.segments);
  deviation = preset.deviation;
  return preset;
}
