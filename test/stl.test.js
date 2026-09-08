import test from "node:test";
import assert from "node:assert/strict";

import { getEngine } from "../src/engine.js";
import { readStl, writeBinaryStl, writeAsciiStl, stlToManifold } from "../src/io/stl.js";

async function cube() {
  const { Manifold } = await getEngine();
  return Manifold.cube([10, 10, 10], true);
}

test("binary STL survives a write/read round trip", async () => {
  const solid = await cube();
  const bytes = writeBinaryStl(solid.getMesh());
  // 84-byte header plus 50 bytes per triangle.
  assert.equal(bytes.length, 84 + 12 * 50);
  const back = await stlToManifold(bytes);
  assert.equal(back.status(), "NoError");
  assert.ok(Math.abs(back.volume() - 1000) < 1e-3);
  assert.equal(back.genus(), 0);
});

test("ASCII STL survives a write/read round trip", async () => {
  const solid = await cube();
  const bytes = new TextEncoder().encode(writeAsciiStl(solid.getMesh()));
  const back = await stlToManifold(bytes);
  assert.ok(Math.abs(back.volume() - 1000) < 1e-3);
});

test("reading yields a triangle soup that merge() welds back together", async () => {
  const solid = await cube();
  const raw = readStl(writeBinaryStl(solid.getMesh()));
  // Every triangle carries its own three vertices before welding.
  assert.equal(raw.triVerts.length, 36);
  assert.equal(raw.vertProperties.length / raw.numProp, 36);
  const welded = await stlToManifold(writeBinaryStl(solid.getMesh()));
  assert.equal(welded.getMesh().numVert, 8);
});

test("preserves an off-centre position and non-cubic size", async () => {
  const { Manifold } = await getEngine();
  const solid = Manifold.cube([4, 6, 8], false).translate([1, 2, 3]);
  const back = await stlToManifold(writeBinaryStl(solid.getMesh()));
  const box = back.boundingBox();
  assert.deepEqual(box.min.map((v) => Math.round(v)), [1, 2, 3]);
  assert.deepEqual(box.max.map((v) => Math.round(v)), [5, 8, 11]);
});

test("rejects a mesh that is not a closed solid", async () => {
  // A lone triangle can never bound a volume.
  const mesh = { numProp: 3, vertProperties: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]), triVerts: Uint32Array.from([0, 1, 2]) };
  await assert.rejects(() => stlToManifold(writeBinaryStl(mesh)), /not a solid manifold/i);
});

test("rejects an empty STL", async () => {
  const mesh = { numProp: 3, vertProperties: new Float32Array(0), triVerts: new Uint32Array(0) };
  await assert.rejects(() => stlToManifold(writeBinaryStl(mesh)), /no triangles/i);
});
