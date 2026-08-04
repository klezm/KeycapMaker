import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { create3mfBlob } from "../src/lib/export-3mf.js";

async function readArchive(blob) {
  const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  return Object.fromEntries(
    Object.entries(archive).map(([path, bytes]) => [path, strFromU8(bytes)]),
  );
}

async function readModelXml(blob) {
  const archive = await readArchive(blob);
  const model = archive["3D/3dmodel.model"];

  assert.ok(model, "3D model payload should exist");
  return model;
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

test("3MF export bundles parts into components parent object", async () => {
  const blob = create3mfBlob([
    createMesh("keycap-body", "#f8f9fa"),
    createMesh("keycap-legend", "#212529", 1),
  ]);
  const xml = await readModelXml(blob);

  assert.match(xml, /<model unit="millimeter"/);
  assert.match(
    xml,
    /<object id="1" name="keycap-body" partnumber="body" type="model" pid="1000" pindex="0">/,
  );
  assert.match(
    xml,
    /<object id="2" name="keycap-legend" partnumber="legend" type="model" pid="1000" pindex="1">/,
  );
  assert.match(
    xml,
    /<object id="3" name="keycap" type="model"><components><component objectid="1" \/><component objectid="2" \/><\/components><\/object>/,
  );
  assert.match(xml, /<build><item objectid="3" \/><\/build>/);
  assert.doesNotMatch(xml, /<build>.*objectid="1".*<\/build>/);
  assert.doesNotMatch(xml, /<build>.*objectid="2".*<\/build>/);
});

test("3MF export includes part name metadata for major slicers", async () => {
  const archive = await readArchive(create3mfBlob([
    createMesh("keycap-body", "#f8f9fa"),
    createMesh("keycap-legend", "#212529", 1),
  ]));

  assert.match(
    archive["Metadata/model_settings.config"],
    /<object id="3">\n    <metadata key="name" value="keycap"\/>\n    <part id="1" subtype="normal_part">\n      <metadata key="name" value="body"\/>/,
  );
  assert.match(
    archive["Metadata/model_settings.config"],
    /<part id="2" subtype="normal_part">\n      <metadata key="name" value="legend"\/>/,
  );
  assert.match(
    archive["Metadata/Slic3r_PE_model.config"],
    /<object id="1" instances_count="1">\n  <metadata type="object" key="name" value="body"\/>\n  <volume firstid="0" lastid="3">/,
  );
  assert.match(
    archive["Metadata/Slic3r_PE_model.config"],
    /<metadata type="volume" key="name" value="legend"\/>/,
  );
});

test("3MF export uses specified name for parent object name", async () => {
  const archive = await readArchive(create3mfBlob(
    [
      createMesh("keycap-body", "#f8f9fa"),
      createMesh("keycap-legend", "#212529", 1),
    ],
    { assemblyName: "Ctrl & Fn" },
  ));

  assert.match(
    archive["3D/3dmodel.model"],
    /<object id="3" name="Ctrl &amp; Fn" type="model"><components>/,
  );
  assert.match(
    archive["Metadata/model_settings.config"],
    /<metadata key="name" value="Ctrl &amp; Fn"\/>/,
  );
});
