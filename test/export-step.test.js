import test from "node:test";
import assert from "node:assert/strict";

import { createStepBlob, createStepText } from "../src/lib/export-step.js";

function createTetraMesh() {
  return {
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
    faces: [
      [0, 2, 1],
      [0, 1, 3],
      [1, 2, 3],
      [2, 0, 3],
    ],
  };
}

test("STEP export generates AP214 faceted B-rep", async () => {
  const blob = createStepBlob(createTetraMesh(), {
    name: "Esc",
    createdAt: "2026-06-03T00:00:00.000Z",
  });
  const text = await blob.text();

  assert.equal(blob.type, "model/step;charset=utf-8");
  assert.match(text, /^ISO-10303-21;/);
  assert.match(text, /FILE_SCHEMA\(\('AUTOMOTIVE_DESIGN_CC2 \{ 1 2 10303 214 2 1 1 \}'\)\);/);
  assert.match(text, /FACETED_BREP\('Esc',#\d+\);/);
  assert.match(text, /FACETED_BREP_SHAPE_REPRESENTATION\('Esc',\(#\d+,#\d+\),#\d+\);/);
  assert.match(text, /POLY_LOOP\('',\(#\d+,#\d+,#\d+\)\);/);
  assert.match(text, /FACE_SURFACE\('',\(#\d+\),#\d+,.T.\);/);
  assert.match(text, /END-ISO-10303-21;\n$/);
});

test("STEP export encodes non-ASCII names as Part 21 strings", () => {
  const text = createStepText(createTetraMesh(), {
    name: "Name",
    createdAt: "2026-06-03T00:00:00.000Z",
  });

  assert.match(text, /PRODUCT\('\\X2\\540D79F0\\X0\\','\\X2\\540D79F0\\X0\\',''/);
  assert.match(text, /FILE_NAME\('\\X2\\540D79F0\\X0\\.step'/);
});

test("STEP export rejects empty meshes", () => {
  assert.throws(
    () => createStepText({ vertices: [], faces: [] }),
    /No meshes to include in STEP./,
  );
});
