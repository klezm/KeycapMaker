import { getEngine } from "../engine.mjs";
import { segmentsForRadius } from "../geometry/section.mjs";
import { crossSlot } from "./cross.mjs";

const DIAMETER = 5.5;

export const spec = {
  id: "choc-v2",
  name: "Kailh Choc v2",
  mounts: ["choc"],
  height: 3.0,
  footprint: { width: DIAMETER, depth: DIAMETER },
  description:
    "Cherry cross slot on a short post, for Choc v2 switches, which take MX-style stems at low-profile height.",
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
