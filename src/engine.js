/**
 * manifold-3d WASM bootstrap.
 *
 * The module factory is expensive and stateful (it owns the WASM heap), so it is
 * initialised once and shared. `setup()` must be called before any class is used.
 */
import Module from "manifold-3d";

let enginePromise = null;

/**
 * @returns {Promise<import("manifold-3d").ManifoldToplevel>}
 */
export function getEngine() {
  if (!enginePromise) {
    enginePromise = Module().then((wasm) => {
      wasm.setup();
      return wasm;
    });
  }
  return enginePromise;
}
