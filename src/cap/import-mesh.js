/**
 * Load a keycap from a mesh file.
 *
 * Any keycap works — exported from a keycap designer, downloaded, or produced by
 * this tool's own generator — as long as it is a closed solid.
 */
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { stlToManifold } from "../io/stl.js";

/**
 * @param {string} path
 * @returns {Promise<import("manifold-3d").Manifold>}
 */
export async function loadCapMesh(path) {
  const extension = extname(path).toLowerCase();
  if (extension !== ".stl") {
    throw new Error(`Unsupported keycap mesh format "${extension || basename(path)}" — only .stl is supported.`);
  }
  const bytes = await readFile(path);
  try {
    return await stlToManifold(new Uint8Array(bytes));
  } catch (error) {
    throw new Error(`Could not load ${basename(path)}: ${error.message}`);
  }
}
