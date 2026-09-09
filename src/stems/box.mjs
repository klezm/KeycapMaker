import { getEngine } from "../engine.mjs";
import { crossSlot } from "./cross.mjs";

const SIDE = 5.5;
const CORNER_RADIUS = 0.4;

export const spec = {
  id: "box",
  name: "Box Cherry (square)",
  mounts: ["mx"],
  height: 4.0,
  footprint: { width: SIDE, depth: SIDE },
  description:
    "Square post with a Cherry cross slot, sized for Kailh Box switches. Prints more reliably than the round post on FDM.",
};

export async function outerSolid(z0, z1) {
  const { Manifold, CrossSection } = await getEngine();
  const outline = CrossSection.square([SIDE - 2 * CORNER_RADIUS, SIDE - 2 * CORNER_RADIUS], true)
    .offset(CORNER_RADIUS, "Round")
    .simplify(0.001);
  return Manifold.extrude(outline, z1 - z0).translate([0, 0, z0]);
}

export async function build({ slop, top = spec.height }) {
  const post = await outerSolid(0, Math.max(top, spec.height));
  return post.subtract(await crossSlot({ height: spec.height, slop }));
}
