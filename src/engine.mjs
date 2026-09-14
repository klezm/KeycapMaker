import { AsyncLocalStorage } from "node:async_hooks";

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
 * The set of solids the innermost open arena will free, or undefined outside
 * one. Held per async chain rather than in a plain variable, because two
 * builds can be in flight at once -- two viewer requests, say -- and a shared
 * arena would have whichever finished first free the other's geometry.
 *
 * Manifold lives in WebAssembly, where a solid is a handle the garbage
 * collector knows nothing about: dropping the last JS reference to one leaks
 * it. A keycap is built from dozens of intermediates -- the shell, the dish
 * cutter, the cavity, each stem, and a new solid for every boolean and every
 * translate along the way -- so a batch run that never frees them grows by
 * about 7 MB a cap and is eventually killed. Nothing here changes what is
 * built; it only takes the bookkeeping off every call site.
 */
const arenas = new AsyncLocalStorage();

/** Note a solid, if one was produced, so the open arena can free it later. */
function track(value) {
  const arena = arenas.getStore();
  if (!arena || !value) return value;
  if (Array.isArray(value)) {
    for (const item of value) track(item);
    return value;
  }
  if (typeof value.delete === "function" && typeof value.isDeleted === "function") arena.add(value);
  return value;
}

/**
 * Have every solid a type hands out register itself with the open arena.
 *
 * Wrapping the shared prototype rather than each call site means a new piece
 * of geometry cannot forget to clean up after itself. Anything that returns
 * something other than a solid -- a volume, a bounding box, a mesh -- passes
 * straight through, so only handles are ever collected.
 */
function trackCreations(type) {
  const methods = Object.getPrototypeOf(type.prototype);
  for (const owner of [type, methods]) {
    for (const name of Object.getOwnPropertyNames(owner)) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, name);
      if (name === "constructor" || typeof descriptor.value !== "function") continue;
      if (!descriptor.writable || !descriptor.configurable) continue;
      const original = descriptor.value;
      owner[name] = function (...args) {
        return track(original.apply(this, args));
      };
    }
  }
}

/**
 * Free every solid built inside `run`, keeping only what it hands to `keep`.
 *
 * Arenas nest: a kept solid is handed up to the arena outside, so a caller
 * that wraps a build of its own still frees it in the end.
 */
export async function withArena(run) {
  const outer = arenas.getStore();
  const mine = new Set();
  const keep = (object) => {
    mine.delete(object);
    if (outer) outer.add(object);
    return object;
  };
  try {
    return await arenas.run(mine, () => run(keep));
  } finally {
    for (const object of mine) {
      if (!object.isDeleted()) object.delete();
    }
  }
}

/**
 * Boot the Manifold WASM kernel once per process (or per worker thread) and
 * hand back its exported types. Repeated calls share the same instance.
 */
export async function getEngine() {
  if (!enginePromise) {
    enginePromise = ManifoldModule().then((wasm) => {
      wasm.setup();
      trackCreations(wasm.Manifold);
      trackCreations(wasm.CrossSection);
      // A solid built straight from a mesh is the one route that does not go
      // through a method, so the constructor is caught here instead.
      const Base = wasm.Manifold;
      wasm.Manifold = class Manifold extends Base {
        constructor(...args) {
          super(...args);
          track(this);
        }
      };
      for (const name of Object.getOwnPropertyNames(Base)) {
        if (name in wasm.Manifold) continue;
        wasm.Manifold[name] = Base[name];
      }
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
