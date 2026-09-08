/**
 * STL read/write.
 *
 * STL is a "triangle soup": every triangle carries its own three vertices with no
 * shared indices. Manifold needs a topologically closed mesh, so imported soup is
 * run through `Mesh.merge()`, which welds coincident vertices into a manifold.
 */
import { getEngine } from "../engine.js";

const BINARY_HEADER_BYTES = 84;
const BINARY_TRIANGLE_BYTES = 50;

/**
 * Serialise a manifold Mesh as binary STL.
 *
 * @param {{numProp: number, vertProperties: Float32Array, triVerts: Uint32Array}} mesh
 * @param {string} [header] up to 80 chars of free text
 * @returns {Uint8Array}
 */
export function writeBinaryStl(mesh, header = "keycap-bake") {
  const { numProp, vertProperties, triVerts } = mesh;
  const triangleCount = triVerts.length / 3;
  const buffer = new ArrayBuffer(BINARY_HEADER_BYTES + triangleCount * BINARY_TRIANGLE_BYTES);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < Math.min(header.length, 79); i += 1) {
    bytes[i] = header.charCodeAt(i) & 0x7f;
  }
  view.setUint32(80, triangleCount, true);

  const position = (vert, axis) => vertProperties[vert * numProp + axis];

  for (let tri = 0; tri < triangleCount; tri += 1) {
    const a = triVerts[tri * 3];
    const b = triVerts[tri * 3 + 1];
    const c = triVerts[tri * 3 + 2];

    const ux = position(b, 0) - position(a, 0);
    const uy = position(b, 1) - position(a, 1);
    const uz = position(b, 2) - position(a, 2);
    const vx = position(c, 0) - position(a, 0);
    const vy = position(c, 1) - position(a, 1);
    const vz = position(c, 2) - position(a, 2);

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      nx /= length;
      ny /= length;
      nz /= length;
    }

    let offset = BINARY_HEADER_BYTES + tri * BINARY_TRIANGLE_BYTES;
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    offset += 12;
    for (const vert of [a, b, c]) {
      view.setFloat32(offset, position(vert, 0), true);
      view.setFloat32(offset + 4, position(vert, 1), true);
      view.setFloat32(offset + 8, position(vert, 2), true);
      offset += 12;
    }
    view.setUint16(offset, 0, true);
  }

  return bytes;
}

/**
 * Serialise a manifold Mesh as ASCII STL. Only used for fixtures and debugging —
 * binary is the default everywhere else.
 *
 * @param {{numProp: number, vertProperties: Float32Array, triVerts: Uint32Array}} mesh
 * @param {string} [name]
 * @returns {string}
 */
export function writeAsciiStl(mesh, name = "keycap_bake") {
  const { numProp, vertProperties, triVerts } = mesh;
  const at = (vert) => [
    vertProperties[vert * numProp],
    vertProperties[vert * numProp + 1],
    vertProperties[vert * numProp + 2],
  ];
  const lines = [`solid ${name}`];
  for (let tri = 0; tri < triVerts.length / 3; tri += 1) {
    lines.push("  facet normal 0 0 0", "    outer loop");
    for (let corner = 0; corner < 3; corner += 1) {
      const [x, y, z] = at(triVerts[tri * 3 + corner]);
      lines.push(`      vertex ${x} ${y} ${z}`);
    }
    lines.push("    endloop", "  endfacet");
  }
  lines.push(`endsolid ${name}`, "");
  return lines.join("\n");
}

function isBinaryStl(bytes) {
  if (bytes.length < BINARY_HEADER_BYTES) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  // The byte count is exact for well-formed binary STL. Some writers emit an
  // ASCII file that still starts with "solid", so size is the reliable signal.
  return bytes.length === BINARY_HEADER_BYTES + triangleCount * BINARY_TRIANGLE_BYTES;
}

function parseBinaryStl(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const vertProperties = new Float32Array(triangleCount * 9);
  const triVerts = new Uint32Array(triangleCount * 3);
  for (let tri = 0; tri < triangleCount; tri += 1) {
    // Skip the 12-byte facet normal; it is redundant and often wrong.
    let offset = BINARY_HEADER_BYTES + tri * BINARY_TRIANGLE_BYTES + 12;
    for (let corner = 0; corner < 3; corner += 1) {
      const vert = tri * 3 + corner;
      vertProperties[vert * 3] = view.getFloat32(offset, true);
      vertProperties[vert * 3 + 1] = view.getFloat32(offset + 4, true);
      vertProperties[vert * 3 + 2] = view.getFloat32(offset + 8, true);
      triVerts[vert] = vert;
      offset += 12;
    }
  }
  return { numProp: 3, vertProperties, triVerts };
}

function parseAsciiStl(text) {
  const coordinates = [];
  const pattern = /vertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    coordinates.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if (coordinates.length % 9 !== 0) {
    throw new Error(`ASCII STL has ${coordinates.length / 3} vertices, which is not a whole number of triangles`);
  }
  const vertProperties = Float32Array.from(coordinates);
  const triVerts = new Uint32Array(coordinates.length / 3);
  for (let vert = 0; vert < triVerts.length; vert += 1) triVerts[vert] = vert;
  return { numProp: 3, vertProperties, triVerts };
}

/**
 * Parse binary or ASCII STL into a raw (unwelded) mesh description.
 *
 * @param {Uint8Array} bytes
 * @returns {{numProp: number, vertProperties: Float32Array, triVerts: Uint32Array}}
 */
export function readStl(bytes) {
  if (isBinaryStl(bytes)) return parseBinaryStl(bytes);
  return parseAsciiStl(new TextDecoder().decode(bytes));
}

/**
 * Parse STL bytes and weld them into a Manifold solid.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<import("manifold-3d").Manifold>}
 * @throws if the welded mesh is not a closed, orientable surface
 */
export async function stlToManifold(bytes) {
  const { Manifold, Mesh } = await getEngine();
  const raw = readStl(bytes);
  if (raw.triVerts.length === 0) throw new Error("STL contains no triangles");

  const mesh = new Mesh(raw);
  mesh.merge();
  const solid = Manifold.ofMesh(mesh);
  const status = solid.status();
  if (status !== "NoError") {
    throw new Error(
      `STL is not a solid manifold (manifold status: ${status}). ` +
        "Repair it in a mesh tool — it likely has holes, duplicate faces, or self-intersections.",
    );
  }
  return solid;
}
