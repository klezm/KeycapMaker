import test from "node:test";
import assert from "node:assert/strict";

import {
  createSquareThumbnailDrawPlan,
  expandPixelBounds,
  findOpaquePixelBounds,
} from "../src/lib/preview-thumbnail.js";

function createImageData(width, height, opaquePixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  opaquePixels.forEach(([x, y, alpha = 255]) => {
    data[((y * width + x) * 4) + 3] = alpha;
  });
  return { data };
}

test("detects the drawn pixel range against a transparent background", () => {
  const imageData = createImageData(8, 6, [
    [2, 1],
    [5, 4],
    [1, 5, 2],
  ]);

  assert.deepEqual(findOpaquePixelBounds(imageData, 8, 6), {
    x: 2,
    y: 1,
    width: 4,
    height: 4,
  });
});

test("treats the case with no drawn pixels as having no range", () => {
  assert.equal(findOpaquePixelBounds(createImageData(4, 4, []), 4, 4), null);
});

test("expands the detected range within the image bounds", () => {
  assert.deepEqual(expandPixelBounds({ x: 1, y: 2, width: 3, height: 2 }, 5, 5, 2), {
    x: 0,
    y: 0,
    width: 5,
    height: 5,
  });
});

test("creates a draw plan that centers content in a square thumbnail with padding", () => {
  const plan = createSquareThumbnailDrawPlan(
    { x: 10, y: 20, width: 120, height: 60 },
    200,
    { contentRatio: 0.8 },
  );

  assert.deepEqual(plan, {
    sourceX: 10,
    sourceY: 20,
    sourceWidth: 120,
    sourceHeight: 60,
    destinationX: 20,
    destinationY: 60,
    destinationWidth: 160,
    destinationHeight: 80,
  });
});
