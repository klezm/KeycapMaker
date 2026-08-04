import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_J_STEM_LP01_PREVIEW_COLOR,
  getJStemLp01ReferenceInsetOffset,
  getJStemLp01PreviewStyle,
  getJStemLp01ReferenceTransform,
  loadJStemLp01ReferenceMesh,
  resolveJStemLp01PreviewColor,
  transformJStemLp01ReferenceMesh,
} from "../src/lib/j-stem-lp01-reference.js";
import { parseOff } from "../src/lib/off-parser.js";

function createBounds(vertices) {
  return vertices.reduce((bounds, vertex) => ({
    minX: Math.min(bounds.minX, vertex.x),
    maxX: Math.max(bounds.maxX, vertex.x),
    minY: Math.min(bounds.minY, vertex.y),
    maxY: Math.max(bounds.maxY, vertex.y),
    minZ: Math.min(bounds.minZ, vertex.z),
    maxZ: Math.max(bounds.maxZ, vertex.z),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

function parseJStemLp01ScadOutlinePoints(scad) {
  const match = scad.match(/function j_stem_lp01_plate_outline_base_points[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(match, "J-STEM-LP01 SCAD outline point list should exist");

  return Array.from(match[1].matchAll(/\[\s*([+-]?\d+\.\d+),\s*([+-]?\d+\.\d+)\s*\]/g))
    .map((pointMatch) => ({
      x: Number(pointMatch[1]),
      y: Number(pointMatch[2]),
    }));
}

test("Official STEP-derived J-STEM-LP01 OFF is aligned to existing local coordinates", async () => {
  const off = await readFile("public/assets/j-stem-lp01/j-stem-lp01-reference.off", "utf8");
  const mesh = parseOff(off);
  const bounds = createBounds(mesh.vertices);
  const plateEdgeBounds = createBounds(mesh.vertices.filter((vertex) => (
    Math.abs(vertex.x) > 5.9 || Math.abs(vertex.y) > 5.9
  )));

  assert.equal(mesh.vertices.length, 1408);
  assert.equal(mesh.faces.length, 2820);
  assertClose(bounds.minX, -6.1, "min x");
  assertClose(bounds.maxX, 6.1, "max x");
  assertClose(bounds.minY, -6.1, "min y");
  assertClose(bounds.maxY, 6.1, "max y");
  assertClose(bounds.maxZ, 0.8, "max z");
  assert.ok(bounds.minZ < -3.77 && bounds.minZ > -3.78);
  assert.ok(plateEdgeBounds.minZ >= -1e-9, "plate edge should be on the receiver side");
  assertClose(plateEdgeBounds.maxZ, 0.8, "plate edge max z");
});

test("J-STEM-LP01 socket boolean outer perimeter is oriented same as official STEP", async () => {
  const scad = await readFile("scad/modules/stem_j_stem_lp01.scad", "utf8");
  const points = parseJStemLp01ScadOutlinePoints(scad);
  const bounds = createBounds(points.map((point) => ({ x: point.x, y: point.y, z: 0 })));

  assert.equal(points.length, 32);
  assert.deepEqual(points[0], { x: -6.1, y: 5.2 });
  assert.deepEqual(points[1], { x: -6.1, y: -2.8 });
  assert.ok(points.some((point) => point.x === 6.1 && point.y === 2.8));
  assert.ok(points.some((point) => point.x === 0.1716 && point.y === -3.7));
  assertClose(bounds.minX, -6.1, "SCAD outline min x");
  assertClose(bounds.maxX, 6.1, "SCAD outline max x");
  assertClose(bounds.minY, -6.1, "SCAD outline min y");
  assertClose(bounds.maxY, 6.1, "SCAD outline max y");
  assert.doesNotMatch(scad, /top_left_center = \[-5\.250, 5\.220\]/);
});

test("J-STEM-LP01 reference mesh is placed with same formula as SCAD top plane transform", () => {
  const mesh = {
    vertices: [{ x: 1, y: 2, z: 3 }],
    faces: [[0, 0, 0]],
  };
  const params = {
    topCenterHeight: 9.5,
    topThickness: 1.5,
    topSurfaceShape: "spherical",
    dishDepth: 0.5,
    topPitchDeg: 10,
    topRollDeg: 5,
    topOffsetX: 0.25,
    topOffsetY: -0.5,
  };
  const transformed = transformJStemLp01ReferenceMesh(mesh, params);
  const transform = getJStemLp01ReferenceTransform(params);
  const flatTransform = getJStemLp01ReferenceTransform({ ...params, topSurfaceShape: "flat", dishDepth: 0 });
  const raisedTransform = getJStemLp01ReferenceTransform({ ...params, dishDepth: -0.5 });

  assert.deepEqual(transformed.faces, mesh.faces);
  assertClose(transformed.vertices[0].x, 1.25, "transformed x");
  assertClose(transformed.vertices[0].y, 1.5, "transformed y");
  assertClose(
    transformed.vertices[0].z,
    3 + transform.mountZ + Math.tan(5 * Math.PI / 180) + (2 * Math.tan(10 * Math.PI / 180)),
    "transformed z",
  );
  assertClose(raisedTransform.mountZ, flatTransform.mountZ, "raised surface keeps receiver mount height");
});

test("J-STEM-LP01 reference mesh tracks recess depth correction of socket", () => {
  const mesh = {
    vertices: [{ x: 0, y: 0, z: 0 }],
    faces: [[0, 0, 0]],
  };
  const params = {
    topCenterHeight: 9.5,
    topThickness: 1.5,
    topSurfaceShape: "flat",
    dishDepth: 0,
    stemInsetDelta: 0.3,
    topPitchDeg: 0,
    topRollDeg: 0,
    topOffsetX: 0,
    topOffsetY: 0,
  };
  const transformed = transformJStemLp01ReferenceMesh(mesh, params);
  const transform = getJStemLp01ReferenceTransform(params);

  assertClose(getJStemLp01ReferenceInsetOffset(params), 0.3, "inset offset");
  assertClose(transformed.vertices[0].z, transform.mountZ + 0.3, "transformed z follows inset");
  assertClose(
    getJStemLp01ReferenceInsetOffset({ ...params, stemInsetDelta: 1 }),
    0.65,
    "inset offset follows SCAD recess depth limit",
  );
});

test("J-STEM-LP01 reference preview color defaults to clear, resolving white and orange", () => {
  assert.equal(DEFAULT_J_STEM_LP01_PREVIEW_COLOR, "clear");
  assert.equal(resolveJStemLp01PreviewColor("orange"), "orange");
  assert.equal(resolveJStemLp01PreviewColor("white"), "white");
  assert.equal(resolveJStemLp01PreviewColor("blue"), "clear");
  assert.equal(resolveJStemLp01PreviewColor("blue", "orange"), "orange");

  assert.equal(getJStemLp01PreviewStyle("clear").colorHex, "#d7e1ea");
  assert.equal(getJStemLp01PreviewStyle("white").color, 0xf7f4ec);
  assert.equal(getJStemLp01PreviewStyle("white").opacity, 1);
  assert.equal(getJStemLp01PreviewStyle("orange").opacity, 1);
});

test("J-STEM-LP01 reference OFF loader parses public asset response", async () => {
  const mesh = await loadJStemLp01ReferenceMesh("asset.off", async (assetUrl) => ({
    ok: assetUrl === "asset.off",
    async text() {
      return "OFF\n3 1 0\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n";
    },
  }));

  assert.equal(mesh.vertices.length, 3);
  assert.equal(mesh.faces.length, 1);
});
