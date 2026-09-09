const HEADER_BYTES = 80;
const TRIANGLE_BYTES = 50;

/**
 * Pull the plain vertex/triangle arrays out of a Manifold solid.
 * `numProp` can exceed 3 when a solid carries extra vertex properties, so the
 * stride has to come from the mesh rather than being assumed.
 */
export function meshOf(solid) {
  const mesh = solid.getMesh();
  return { vertices: mesh.vertProperties, triangles: mesh.triVerts, stride: mesh.numProp };
}

/**
 * Serialise a solid as a binary STL.
 *
 * Facet normals are recomputed from the winding rather than trusted from
 * elsewhere, and degenerate facets get a zero normal, which every slicer
 * accepts.
 *
 * @param {object} solid a Manifold solid
 * @param {string} [header] up to 80 bytes of free text
 * @returns {Buffer}
 */
export function toBinaryStl(solid, header = "") {
  const { vertices, triangles, stride } = meshOf(solid);
  const count = triangles.length / 3;
  const buffer = Buffer.alloc(HEADER_BYTES + 4 + count * TRIANGLE_BYTES);

  buffer.write(header.slice(0, HEADER_BYTES - 1), 0, "ascii");
  buffer.writeUInt32LE(count, HEADER_BYTES);

  let at = HEADER_BYTES + 4;
  for (let t = 0; t < count; t += 1) {
    const a = triangles[t * 3] * stride;
    const b = triangles[t * 3 + 1] * stride;
    const c = triangles[t * 3 + 2] * stride;

    const ux = vertices[b] - vertices[a];
    const uy = vertices[b + 1] - vertices[a + 1];
    const uz = vertices[b + 2] - vertices[a + 2];
    const vx = vertices[c] - vertices[a];
    const vy = vertices[c + 1] - vertices[a + 1];
    const vz = vertices[c + 2] - vertices[a + 2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      nx /= length;
      ny /= length;
      nz /= length;
    } else {
      nx = 0;
      ny = 0;
      nz = 0;
    }

    buffer.writeFloatLE(nx, at);
    buffer.writeFloatLE(ny, at + 4);
    buffer.writeFloatLE(nz, at + 8);
    at += 12;
    for (const base of [a, b, c]) {
      buffer.writeFloatLE(vertices[base], at);
      buffer.writeFloatLE(vertices[base + 1], at + 4);
      buffer.writeFloatLE(vertices[base + 2], at + 8);
      at += 12;
    }
    buffer.writeUInt16LE(0, at);
    at += 2;
  }

  return buffer;
}

/** Read a binary STL back into triangle count and bounding box, for tests. */
export function inspectBinaryStl(buffer) {
  const count = buffer.readUInt32LE(HEADER_BYTES);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < count; t += 1) {
    const base = HEADER_BYTES + 4 + t * TRIANGLE_BYTES + 12;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = buffer.readFloatLE(base + vertex * 12 + axis * 4);
        if (value < min[axis]) min[axis] = value;
        if (value > max[axis]) max[axis] = value;
      }
    }
  }
  return { count, min, max };
}
