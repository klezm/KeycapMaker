import ManifoldModule from "manifold-3d";

/**
 * Quality presets. `segments` drives circular primitives (stem posts, dish
 * cutters, rounded corners); `stations` is the number of horizontal rings the
 * keycap sidewall loft is sampled at.
 */
export const QUALITY_PRESETS = {
  draft: { segments: 32, stations: 12, cornerSegments: 4 },
  standard: { segments: 64, stations: 24, cornerSegments: 8 },
  fine: { segments: 128, stations: 48, cornerSegments: 16 },
};

export const DEFAULT_QUALITY = "standard";

let enginePromise = null;

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
  return preset;
}
