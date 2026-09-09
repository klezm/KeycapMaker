import { getEngine } from "../engine.mjs";
import { segmentsForRadius } from "../geometry/section.mjs";
import { crossSlot } from "./cross.mjs";

const DIAMETER = 5.5;

export const spec = {
  id: "mx",
  name: "Cherry MX (round)",
  mounts: ["mx"],
  height: 4.0,
  footprint: { width: DIAMETER, depth: DIAMETER },
  description: "Round post with a Cherry cross slot. The default MX mount.",
};

export async function outerSolid(z0, z1) {
  const { Manifold } = await getEngine();
  const radius = DIAMETER / 2;
  return Manifold.cylinder(z1 - z0, radius, radius, segmentsForRadius(radius)).translate([
    0,
    0,
    z0,
  ]);
}

export async function build({ slop, top = spec.height }) {
  const post = await outerSolid(0, Math.max(top, spec.height));
  return post.subtract(await crossSlot({ height: spec.height, slop }));
}
