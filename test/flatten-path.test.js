import test from "node:test";
import assert from "node:assert/strict";

import { flattenPathData } from "../src/svg/flatten-path.js";

/** Shoelace area; positive is counter-clockwise in a y-up frame. */
function signedArea(contour) {
  let total = 0;
  for (let i = 0; i < contour.length; i += 1) {
    const [x1, y1] = contour[i];
    const [x2, y2] = contour[(i + 1) % contour.length];
    total += x1 * y2 - x2 * y1;
  }
  return total / 2;
}

test("flattens an axis-aligned path without adding points", () => {
  const contours = flattenPathData("M0 0 H10 V10 H0 Z");
  assert.equal(contours.length, 1);
  assert.deepEqual(contours[0], [[0, 0], [10, 0], [10, 10], [0, 10]]);
});

test("converts relative and shorthand commands to absolute geometry", () => {
  const explicit = flattenPathData("M0 0 L10 0 L10 10 Z");
  const shorthand = flattenPathData("m0 0 h10 v10 z");
  assert.deepEqual(shorthand[0], explicit[0]);
});

test("approximates an arc-drawn circle to within the flatness tolerance", () => {
  const contours = flattenPathData("M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z", { flatness: 0.01 });
  assert.equal(contours.length, 1);
  const area = Math.abs(signedArea(contours[0]));
  // A flattened polygon always undershoots the true circle.
  assert.ok(area < Math.PI * 100, `expected under ${Math.PI * 100}, got ${area}`);
  assert.ok(area > Math.PI * 100 * 0.999, `expected within 0.1%, got ${area}`);
});

test("a tighter flatness produces a closer approximation", () => {
  const coarse = flattenPathData("M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z", { flatness: 0.5 });
  const fine = flattenPathData("M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z", { flatness: 0.005 });
  assert.ok(fine[0].length > coarse[0].length);
  assert.ok(Math.abs(signedArea(fine[0])) > Math.abs(signedArea(coarse[0])));
});

test("keeps subpaths separate and preserves their opposite windings", () => {
  const contours = flattenPathData("M0 0 H10 V10 H0 Z M2 2 V8 H8 V2 Z");
  assert.equal(contours.length, 2);
  assert.equal(signedArea(contours[0]), 100);
  assert.equal(signedArea(contours[1]), -36);
});

test("applies a transform matrix before flattening", () => {
  const contours = flattenPathData("M0 0 H10 V10 H0 Z", { matrix: [2, 0, 0, 2, 5, 5] });
  assert.deepEqual(contours[0], [[5, 5], [25, 5], [25, 25], [5, 25]]);
});

test("closes an unclosed subpath rather than discarding it", () => {
  const contours = flattenPathData("M0 0 H10 V10");
  assert.equal(contours.length, 1);
  assert.equal(Math.abs(signedArea(contours[0])), 50);
});

test("flattens quadratic curves", () => {
  const contours = flattenPathData("M0 0 Q10 20 20 0 Z", { flatness: 0.01 });
  assert.ok(contours[0].length > 8);
  // Area under a quadratic arc is two thirds of its bounding box.
  assert.ok(Math.abs(Math.abs(signedArea(contours[0])) - (2 / 3) * 20 * 10) < 1);
});
