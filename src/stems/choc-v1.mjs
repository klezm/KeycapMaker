import { getEngine } from "../engine.mjs";
import { rectCavities } from "./cross.mjs";

const PRONG_WIDTH = 1.2;
const PRONG_DEPTH = 3.0;
const PRONG_SPACING = 5.7;
const WALL = 0.8;
const OUTER_WIDTH = PRONG_SPACING + PRONG_WIDTH + 2 * WALL;
const OUTER_DEPTH = PRONG_DEPTH + 2 * WALL;

export const spec = {
  id: "choc-v1",
  name: "Kailh Choc v1",
  mounts: ["choc"],
  height: 3.0,
  footprint: { width: OUTER_WIDTH, depth: OUTER_DEPTH },
  description: "Twin rectangular sockets for the two posts on a Choc v1 switch.",
};

const OFFSETS = [
  [-PRONG_SPACING / 2, 0],
  [PRONG_SPACING / 2, 0],
];

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
      cavityWidth: PRONG_WIDTH,
      cavityDepth: PRONG_DEPTH,
      height: spec.height,
      slop,
      offsets: OFFSETS,
    }),
  );
}
