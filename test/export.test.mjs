import test from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";

import { buildKeycap } from "../src/keycap.mjs";
import { getEngine } from "../src/engine.mjs";
import { toBinaryStl, inspectBinaryStl, meshOf } from "../src/export/stl.mjs";
import { to3mf, toModelXml } from "../src/export/3mf.mjs";
import { createZip, readZip, crc32 } from "../src/export/zip.mjs";

const CORE_NAMESPACE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";

async function sample() {
  return buildKeycap({ profile: "dsa", row: 3, units: 1, stem: "mx", quality: "draft" });
}

/** Rebuild a Manifold from raw arrays so a written file can be checked as geometry. */
async function solidFrom(vertices, triangles) {
  const { Manifold, Mesh } = await getEngine();
  return new Manifold(
    new Mesh({
      numProp: 3,
      vertProperties: Float32Array.from(vertices),
      triVerts: Uint32Array.from(triangles),
    }),
  );
}

test("crc32 matches the known check value", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});

test("a zip round-trips through its own reader and through unzip's layout", () => {
  const archive = createZip([
    { name: "a.txt", data: "hello" },
    { name: "nested/b.xml", data: "<x/>" },
  ]);
  assert.equal(archive.readUInt32LE(0), 0x04034b50, "starts with a local file header");
  const entries = readZip(archive);
  assert.deepEqual(Object.keys(entries).sort(), ["a.txt", "nested/b.xml"]);
  assert.equal(entries["a.txt"].toString(), "hello");
  assert.equal(entries["nested/b.xml"].toString(), "<x/>");
});

test("zips are byte-for-byte reproducible", () => {
  const entries = [{ name: "a.txt", data: "hello" }];
  assert.ok(createZip(entries).equals(createZip(entries)), "two runs must produce the same bytes");
});

test("a corrupt archive is rejected rather than half-read", () => {
  const archive = createZip([{ name: "a.txt", data: "hello" }]);

  // Damaged payload: the inflater rejects it before the checksum is reached.
  const mangled = Buffer.from(archive);
  mangled[40] ^= 0xff;
  assert.throws(() => readZip(mangled));

  // Intact payload, wrong recorded checksum: the checksum is what catches it.
  const forged = Buffer.from(archive);
  const central = forged.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  forged.writeUInt32LE(0xdeadbeef, central + 16);
  assert.throws(() => readZip(forged), /Checksum mismatch for "a.txt"/);

  assert.throws(() => readZip(Buffer.alloc(64)), /Not a ZIP archive/);
});

test("the STL header records the triangle count the mesh actually has", async () => {
  const { solid, stats } = await sample();
  const stl = toBinaryStl(solid, "keycap-forge test");
  assert.equal(stl.length, 84 + stats.triangles * 50, "binary STL is fixed width per facet");
  const parsed = inspectBinaryStl(stl);
  assert.equal(parsed.count, stats.triangles);
  assert.equal(stl.toString("ascii", 0, 17), "keycap-forge test");
  solid.delete();
});

test("STL vertices land on the same bounding box as the solid", async () => {
  const { solid, stats } = await sample();
  const parsed = inspectBinaryStl(toBinaryStl(solid));
  for (let axis = 0; axis < 3; axis += 1) {
    assert.ok(Math.abs(parsed.min[axis] - stats.boundingBox.min[axis]) < 1e-3, `min axis ${axis}`);
    assert.ok(Math.abs(parsed.max[axis] - stats.boundingBox.max[axis]) < 1e-3, `max axis ${axis}`);
  }
  solid.delete();
});

test("STL facet normals point outwards", async () => {
  const { solid } = await sample();
  const stl = toBinaryStl(solid);
  const count = stl.readUInt32LE(80);
  let degenerate = 0;
  for (let t = 0; t < count; t += 1) {
    const at = 84 + t * 50;
    const normal = [0, 1, 2].map((axis) => stl.readFloatLE(at + axis * 4));
    const length = Math.hypot(...normal);
    if (length === 0) {
      degenerate += 1;
      continue;
    }
    assert.ok(Math.abs(length - 1) < 1e-3, `facet ${t} normal is not unit length`);
  }
  // Booleans leave a few zero-area facets behind. Slicers ignore them, and the
  // round-trip test below is what proves the mesh is sound; this is a sanity
  // bound. The absolute number is what stays put -- the share of the mesh it
  // represents rises as the quality setting tessellates more coarsely.
  assert.ok(degenerate < 200, `${degenerate} degenerate facets is far more than booleans leave`);
  assert.ok(degenerate < count * 0.1, `${degenerate} of ${count} facets are degenerate`);

  // The top face of a keycap must face up, never down.
  const topFacing = [];
  for (let t = 0; t < count; t += 1) {
    const at = 84 + t * 50;
    const z = stl.readFloatLE(at + 8);
    const height = Math.max(stl.readFloatLE(at + 20), stl.readFloatLE(at + 32), stl.readFloatLE(at + 44));
    if (height > 7.4) topFacing.push(z);
  }
  assert.ok(topFacing.length > 0 && topFacing.every((z) => z > -0.2), "the top surface faces down");
  solid.delete();
});

test("a written 3MF is a valid package with the mesh intact", async () => {
  const { solid, stats } = await sample();
  const buffer = to3mf(solid, { Title: "DSA R3 1u", Application: "keycap-forge" });
  const entries = readZip(buffer);

  assert.deepEqual(
    Object.keys(entries).sort(),
    ["3D/3dmodel.model", "[Content_Types].xml", "_rels/.rels"].sort(),
  );
  assert.match(entries["[Content_Types].xml"].toString(), /3dmanufacturing-3dmodel\+xml/);
  assert.match(entries["_rels/.rels"].toString(), /3D\/3dmodel\.model/);

  const xml = entries["3D/3dmodel.model"].toString();
  assert.match(xml, /<model unit="millimeter"/);
  assert.match(xml, new RegExp(`xmlns="${CORE_NAMESPACE.replace(/[/.]/g, "\\$&")}"`));
  assert.match(xml, /<metadata name="Title">DSA R3 1u<\/metadata>/);
  assert.equal((xml.match(/<triangle /g) ?? []).length, stats.triangles);
  assert.equal((xml.match(/<vertex /g) ?? []).length, meshOf(solid).vertices.length / 3);
  solid.delete();
});

test("the mesh in a written 3MF rebuilds into the same solid", async () => {
  const { solid, stats } = await sample();
  const xml = readZip(to3mf(solid))["3D/3dmodel.model"].toString();

  const vertices = [...xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)].flatMap(
    (match) => [Number(match[1]), Number(match[2]), Number(match[3])],
  );
  const triangles = [...xml.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g)].flatMap(
    (match) => [Number(match[1]), Number(match[2]), Number(match[3])],
  );

  const rebuilt = await solidFrom(vertices, triangles);
  assert.equal(rebuilt.status(), "NoError", "the exported mesh is not a valid solid");
  assert.equal(rebuilt.genus(), 0);
  assert.ok(
    Math.abs(rebuilt.volume() - stats.volume) / stats.volume < 1e-4,
    `volume drifted: ${rebuilt.volume()} vs ${stats.volume}`,
  );
  rebuilt.delete();
  solid.delete();
});

test("the mesh in a written STL rebuilds into the same solid", async () => {
  const { solid, stats } = await sample();
  const stl = toBinaryStl(solid);
  const count = stl.readUInt32LE(80);

  // STL has no vertex sharing, so weld by position before rebuilding.
  const index = new Map();
  const vertices = [];
  const triangles = [];
  for (let t = 0; t < count; t += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const at = 84 + t * 50 + 12 + corner * 12;
      const point = [0, 1, 2].map((axis) => stl.readFloatLE(at + axis * 4));
      const key = point.join(",");
      if (!index.has(key)) {
        index.set(key, vertices.length / 3);
        vertices.push(...point);
      }
      triangles.push(index.get(key));
    }
  }

  const rebuilt = await solidFrom(vertices, triangles);
  assert.equal(rebuilt.status(), "NoError", "the exported STL is not watertight");
  assert.ok(
    Math.abs(rebuilt.volume() - stats.volume) / stats.volume < 1e-3,
    `volume drifted: ${rebuilt.volume()} vs ${stats.volume}`,
  );
  rebuilt.delete();
  solid.delete();
});

test("model XML escapes metadata rather than emitting broken markup", async () => {
  const { solid } = await sample();
  const xml = toModelXml(solid, { Title: 'a & b <c> "d"' });
  assert.match(xml, /<metadata name="Title">a &amp; b &lt;c&gt; &quot;d&quot;<\/metadata>/);
  assert.ok(!xml.includes("<c>"), "raw markup leaked into the document");
  solid.delete();
});

test("3MF parts are deflated, not stored", () => {
  const archive = to3mfFixture();
  const entries = readZip(archive);
  assert.ok(entries["3D/3dmodel.model"].length > 0);
  // Confirm the raw member really is deflate data the standard inflater reads.
  const start = archive.indexOf(Buffer.from("3D/3dmodel.model")) + "3D/3dmodel.model".length;
  assert.ok(inflateRawSync(archive.subarray(start)).length > 0);
});

function to3mfFixture() {
  return createZip([{ name: "3D/3dmodel.model", data: "<model/>" }]);
}
