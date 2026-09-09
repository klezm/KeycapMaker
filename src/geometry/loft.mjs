import { getEngine } from "../engine.mjs";

/**
 * Turn a stack of horizontal rings into a closed solid.
 *
 * Rings run bottom to top, each an array of [x, y, z] points wound
 * counter-clockwise seen from +Z, and all of the same length. Consecutive
 * rings are joined by side quads; the first and last are closed with a
 * centroid fan. Unlike a convex hull this reproduces concave silhouettes,
 * which every sculpted keycap profile needs.
 *
 * @param {Array<Array<[number, number, number]>>} rings
 * @returns {Promise<object>} a Manifold solid
 */
export async function loftRings(rings) {
  if (rings.length < 2) {
    throw new Error(`A loft needs at least 2 rings, received ${rings.length}`);
  }
  const ringSize = rings[0].length;
  for (const [index, ring] of rings.entries()) {
    if (ring.length !== ringSize) {
      throw new Error(
        `Ring ${index} has ${ring.length} points but ring 0 has ${ringSize}; all rings must match`,
      );
    }
  }

  const vertices = [];
  for (const ring of rings) {
    for (const [x, y, z] of ring) vertices.push(x, y, z);
  }

  const triangles = [];
  for (let level = 0; level < rings.length - 1; level += 1) {
    for (let i = 0; i < ringSize; i += 1) {
      const next = (i + 1) % ringSize;
      const a = level * ringSize + i;
      const b = level * ringSize + next;
      const c = (level + 1) * ringSize + i;
      const d = (level + 1) * ringSize + next;
      triangles.push(a, b, d, a, d, c);
    }
  }

  // Bottom fan, wound clockwise from +Z so its normals face -Z.
  const bottomCentre = vertices.length / 3;
  pushCentroid(vertices, rings[0]);
  for (let i = 0; i < ringSize; i += 1) {
    triangles.push(bottomCentre, (i + 1) % ringSize, i);
  }

  // Top fan, wound counter-clockwise so its normals face +Z.
  const topCentre = vertices.length / 3;
  pushCentroid(vertices, rings.at(-1));
  const topBase = (rings.length - 1) * ringSize;
  for (let i = 0; i < ringSize; i += 1) {
    triangles.push(topCentre, topBase + i, topBase + ((i + 1) % ringSize));
  }

  const { Manifold, Mesh } = await getEngine();
  const solid = new Manifold(
    new Mesh({
      numProp: 3,
      vertProperties: Float32Array.from(vertices),
      triVerts: Uint32Array.from(triangles),
    }),
  );

  const status = solid.status();
  if (status !== "NoError") {
    throw new Error(`Loft produced an invalid solid: ${status}`);
  }
  return solid;
}

function pushCentroid(vertices, ring) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const point of ring) {
    x += point[0];
    y += point[1];
    z += point[2];
  }
  vertices.push(x / ring.length, y / ring.length, z / ring.length);
}
