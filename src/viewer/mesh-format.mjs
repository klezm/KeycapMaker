/**
 * A compact binary mesh the viewer decodes directly into GPU buffers.
 *
 *   magic      4 bytes  "KCM1"
 *   uint32     vertex count
 *   uint32     triangle count
 *   uint32     index width in bits, 16 or 32
 *   float32[]  positions, three per vertex
 *   uintN[]    indices, three per triangle
 *
 * Manifold hands back an indexed mesh already, so this ships it as-is rather
 * than expanding it to STL's three-vertices-per-facet. That matters most for
 * the standalone page, where every model travels inside the HTML.
 */
export const MAGIC = "KCM1";
export const HEADER_BYTES = 16;

export function encodeMesh(solid) {
  const mesh = solid.getMesh();
  const stride = mesh.numProp;
  const vertexCount = mesh.vertProperties.length / stride;
  const triangleCount = mesh.triVerts.length / 3;
  const narrow = vertexCount < 65536;
  const indexBytes = narrow ? 2 : 4;

  const buffer = Buffer.alloc(
    HEADER_BYTES + vertexCount * 12 + triangleCount * 3 * indexBytes,
  );
  buffer.write(MAGIC, 0, "ascii");
  buffer.writeUInt32LE(vertexCount, 4);
  buffer.writeUInt32LE(triangleCount, 8);
  buffer.writeUInt32LE(narrow ? 16 : 32, 12);

  let at = HEADER_BYTES;
  for (let v = 0; v < vertexCount; v += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      buffer.writeFloatLE(mesh.vertProperties[v * stride + axis], at);
      at += 4;
    }
  }
  for (const index of mesh.triVerts) {
    if (narrow) buffer.writeUInt16LE(index, at);
    else buffer.writeUInt32LE(index, at);
    at += indexBytes;
  }
  return buffer;
}

/** Decode for tests; the browser has its own copy of this inside the page. */
export function decodeMesh(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const magic = Buffer.from(buffer.buffer, buffer.byteOffset, 4).toString("ascii");
  if (magic !== MAGIC) throw new Error(`Not a keycap mesh: magic was "${magic}"`);

  const vertexCount = view.getUint32(4, true);
  const triangleCount = view.getUint32(8, true);
  const indexBits = view.getUint32(12, true);
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < positions.length; i += 1) {
    positions[i] = view.getFloat32(HEADER_BYTES + i * 4, true);
  }
  const indexStart = HEADER_BYTES + vertexCount * 12;
  const indices =
    indexBits === 16 ? new Uint16Array(triangleCount * 3) : new Uint32Array(triangleCount * 3);
  for (let i = 0; i < indices.length; i += 1) {
    indices[i] =
      indexBits === 16
        ? view.getUint16(indexStart + i * 2, true)
        : view.getUint32(indexStart + i * 4, true);
  }
  return { positions, indices, vertexCount, triangleCount };
}
