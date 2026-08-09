import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { create3mfKeysetBlob } from "../src/lib/export-3mf.js";

async function readArchive(blob) {
  const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  return Object.fromEntries(
    Object.entries(archive).map(([path, bytes]) => [path, strFromU8(bytes)]),
  );
}

function createMesh(name, colorHex, zOffset = 0) {
  return {
    name,
    colorHex,
    vertices: [
      { x: 0, y: 0, z: zOffset },
      { x: 1, y: 0, z: zOffset },
      { x: 0, y: 1, z: zOffset },
      { x: 0, y: 0, z: zOffset + 1 },
    ],
    faces: [
      [0, 2, 1],
      [0, 1, 3],
      [1, 2, 3],
      [2, 0, 3],
    ],
  };
}

function createKeycap(name, position, meshNames = ["keycap-body", "keycap-legend"]) {
  return {
    name,
    position,
    meshes: meshNames.map((meshName, index) => createMesh(meshName, index === 0 ? "#f8f9fa" : "#212529", index)),
  };
}

test("keyset 3MF places one build item per keycap at its layout position", async () => {
  const archive = await readArchive(create3mfKeysetBlob([
    createKeycap("A", { x: 0, y: 0, z: 0 }),
    createKeycap("B", { x: 19.05, y: -19.05, z: 0 }),
  ]));
  const xml = archive["3D/3dmodel.model"];

  assert.match(xml, /<model unit="millimeter"/);
  // Ids run per keycap: its parts, then its assembly. So keycap A takes 1,2 and
  // assembles as 3; keycap B takes 4,5 and assembles as 6.
  assert.match(xml, /<object id="1" name="keycap-body" partnumber="body" type="model" pid="1000" pindex="0">/);
  assert.match(xml, /<object id="2" name="keycap-legend" partnumber="legend" type="model" pid="1000" pindex="1">/);
  assert.match(xml, /<object id="4" name="keycap-body" partnumber="body" type="model" pid="1000" pindex="2">/);
  assert.match(xml, /<object id="5" name="keycap-legend" partnumber="legend" type="model" pid="1000" pindex="3">/);

  assert.match(xml, /<object id="3" name="A" type="model"><components><component objectid="1" \/><component objectid="2" \/><\/components><\/object>/);
  assert.match(xml, /<object id="6" name="B" type="model"><components><component objectid="4" \/><component objectid="5" \/><\/components><\/object>/);

  const build = xml.match(/<build>(.*)<\/build>/)[1];
  assert.match(build, /<item objectid="3" transform="1 0 0 0 1 0 0 0 1 0 0 0" \/>/);
  assert.match(build, /<item objectid="6" transform="1 0 0 0 1 0 0 0 1 19\.05 -19\.05 0" \/>/);
  assert.equal(build.match(/<item /g).length, 2, "one build item per keycap");
});

test("keyset 3MF keeps object ids unique across many keycaps", async () => {
  const keycaps = Array.from({ length: 25 }, (_, index) => createKeycap(
    `key-${index}`,
    { x: index * 19.05, y: 0, z: 0 },
    index % 3 === 0 ? ["keycap-body"] : ["keycap-body", "keycap-legend", "keycap-legend-right-bottom"],
  ));
  const archive = await readArchive(create3mfKeysetBlob(keycaps));
  const xml = archive["3D/3dmodel.model"];

  const ids = [...xml.matchAll(/<object id="(\d+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "object ids should never collide");

  const expectedObjectCount = keycaps.reduce((total, keycap) => total + keycap.meshes.length + 1, 0);
  assert.equal(ids.length, expectedObjectCount);

  const buildItems = [...xml.matchAll(/<item objectid="(\d+)"/g)].map((match) => match[1]);
  assert.equal(buildItems.length, keycaps.length);
  // Every build item must point at a real object.
  for (const objectId of buildItems) {
    assert.ok(ids.includes(objectId), `build item ${objectId} should reference a declared object`);
  }
});

test("keyset 3MF colors every part and matches color indices to parts", async () => {
  const archive = await readArchive(create3mfKeysetBlob([
    createKeycap("A", { x: 0, y: 0, z: 0 }),
    createKeycap("B", { x: 19.05, y: 0, z: 0 }),
  ]));
  const xml = archive["3D/3dmodel.model"];

  const colors = [...xml.matchAll(/<m:color color="(#[0-9A-F]{6})" \/>/g)].map((match) => match[1]);
  assert.deepEqual(colors, ["#F8F9FA", "#212529", "#F8F9FA", "#212529"]);

  const pindexes = [...xml.matchAll(/pindex="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(pindexes, [0, 1, 2, 3], "each part indexes its own color");
});

test("keyset 3MF writes per-keycap metadata for major slicers", async () => {
  const archive = await readArchive(create3mfKeysetBlob([
    createKeycap("Esc", { x: 0, y: 0, z: 0 }),
    createKeycap("Ctrl & Fn", { x: 19.05, y: 0, z: 0 }),
  ]));

  const bambu = archive["Metadata/model_settings.config"];
  assert.match(bambu, /<object id="3">\n    <metadata key="name" value="Esc"\/>/);
  assert.match(bambu, /<object id="6">\n    <metadata key="name" value="Ctrl &amp; Fn"\/>/);
  assert.match(bambu, /<part id="1" subtype="normal_part">/);
  assert.match(bambu, /<part id="4" subtype="normal_part">/);

  const slic3r = archive["Metadata/Slic3r_PE_model.config"];
  assert.match(slic3r, /key="name" value="Esc-body"/);
  assert.match(slic3r, /key="name" value="Ctrl &amp; Fn-legend"/);
});

test("keyset 3MF is a valid package and rejects empty input", async () => {
  const archive = await readArchive(create3mfKeysetBlob([createKeycap("A", { x: 0, y: 0, z: 0 })]));
  assert.ok(archive["[Content_Types].xml"]);
  assert.ok(archive["_rels/.rels"]);
  assert.match(archive["_rels/.rels"], /Target="\/3D\/3dmodel\.model"/);

  assert.throws(() => create3mfKeysetBlob([]), /no keycaps/i);
  assert.throws(() => create3mfKeysetBlob([{ name: "empty", position: {}, meshes: [] }]), /no meshes/i);
});

test("keyset 3MF defaults a missing position to the origin", async () => {
  const archive = await readArchive(create3mfKeysetBlob([
    { name: "A", meshes: [createMesh("keycap-body", "#ffffff")] },
  ]));
  assert.match(archive["3D/3dmodel.model"], /<item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0" \/>/);
});
