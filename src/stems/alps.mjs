import { getEngine } from "../engine.mjs";
import { rectCavities } from "./cross.mjs";

const CAVITY_WIDTH = 4.45;
const CAVITY_DEPTH = 2.25;
const WALL = 0.9;
const OUTER_WIDTH = CAVITY_WIDTH + 2 * WALL;
const OUTER_DEPTH = CAVITY_DEPTH + 2 * WALL;

export const spec = {
  id: "alps",
  name: "Alps / Matias",
  mounts: ["mx"],
  height: 3.5,
  footprint: { width: OUTER_WIDTH, depth: OUTER_DEPTH },
  description: "Rectangular socket for Alps and Matias switch posts.",
};

export async function outerSolid(z0, z1) {
  const { Manifold } = await getEngine();
  return Manifold.cube([OUTER_WIDTH, OUTER_DEPTH, z1 - z0], true).translate([
    0,
    0,
    (z0 + z1) / 2,
  ]);
}

export async function build({ slop, top = spec.height }) {
  const post = await outerSolid(0, Math.max(top, spec.height));
  return post.subtract(
    await rectCavities({
      cavityWidth: CAVITY_WIDTH,
      cavityDepth: CAVITY_DEPTH,
      height: spec.height,
      slop,
    }),
  );
}
