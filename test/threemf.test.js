import test from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";

import { getEngine } from "../src/engine.js";
import { create3mf } from "../src/io/threemf.js";

async function parts() {
  const { Manifold } = await getEngine();
  return [
    { name: "body", color: "#303030", mesh: Manifold.cube([10, 10, 10], true).getMesh() },
    { name: "insert", color: "#FFFFFF59", mesh: Manifold.cube([2, 2, 2], true).getMesh() },
  ];
}

function readModel(bytes) {
  const files = unzipSync(bytes);
  return { files, model: strFromU8(files["3D/3dmodel.model"]) };
}

test("writes the three files an OPC package needs", async () => {
  const { files } = readModel(create3mf(await parts()));
  assert.deepEqual(Object.keys(files).sort(), ["3D/3dmodel.model", "[Content_Types].xml", "_rels/.rels"]);
});

test("each part becomes its own object, material and build item", async () => {
  const { model } = readModel(create3mf(await parts()));
  assert.equal((model.match(/<object /g) || []).length, 2);
  assert.equal((model.match(/<base /g) || []).length, 2);
  assert.equal((model.match(/<item /g) || []).length, 2);
  assert.match(model, /name="body"/);
  assert.match(model, /name="insert"/);
  assert.match(model, /unit="millimeter"/);
});

test("objects point at their own material index", async () => {
  const { model } = readModel(create3mf(await parts()));
  assert.match(model, /<object id="2"[^>]*pid="1"[^>]*pindex="0"/);
  assert.match(model, /<object id="3"[^>]*pid="1"[^>]*pindex="1"/);
});

test("colours are normalised to #RRGGBBAA, keeping the insert's alpha", async () => {
  const { model } = readModel(create3mf(await parts()));
  const colors = model.match(/displaycolor="[^"]+"/g);
  assert.deepEqual(colors, ['displaycolor="#303030FF"', 'displaycolor="#FFFFFF59"']);
});

test("accepts #RGB and #RRGGBB shorthand", async () => {
  const [body, insert] = await parts();
  const { model } = readModel(create3mf([{ ...body, color: "#f00" }, { ...insert, color: "abcdef" }]));
  assert.match(model, /displaycolor="#FF0000FF"/);
  assert.match(model, /displaycolor="#ABCDEFFF"/);
});

test("writes every vertex and triangle of each mesh", async () => {
  const list = await parts();
  const { model } = readModel(create3mf(list));
  const expectedVertices = list.reduce((sum, part) => sum + part.mesh.vertProperties.length / part.mesh.numProp, 0);
  const expectedTriangles = list.reduce((sum, part) => sum + part.mesh.triVerts.length / 3, 0);
  assert.equal((model.match(/<vertex /g) || []).length, expectedVertices);
  assert.equal((model.match(/<triangle /g) || []).length, expectedTriangles);
});

test("escapes part names", async () => {
  const [body] = await parts();
  const { model } = readModel(create3mf([{ ...body, name: 'a & b <c>' }]));
  assert.match(model, /name="a &amp; b &lt;c&gt;"/);
});

test("refuses an empty package", () => {
  assert.throws(() => create3mf([]), /at least one part/i);
});
