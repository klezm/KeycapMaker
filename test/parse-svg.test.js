import test from "node:test";
import assert from "node:assert/strict";

import { parseSvg } from "../src/svg/parse-svg.js";

function totalArea(result) {
  return result.regions.reduce((sum, region) => {
    for (const contour of region.contours) {
      let area = 0;
      for (let i = 0; i < contour.length; i += 1) {
        const [x1, y1] = contour[i];
        const [x2, y2] = contour[(i + 1) % contour.length];
        area += x1 * y2 - x2 * y1;
      }
      sum += Math.abs(area / 2);
    }
    return sum;
  }, 0);
}

test("reads the viewBox", () => {
  const { viewBox } = parseSvg(`<svg viewBox="1 2 24 36"></svg>`);
  assert.deepEqual(viewBox, { x: 1, y: 2, width: 24, height: 36 });
});

test("converts rect, circle, ellipse and polygon to geometry", () => {
  assert.equal(totalArea(parseSvg(`<svg><rect x="2" y="2" width="10" height="4"/></svg>`)), 40);
  assert.equal(totalArea(parseSvg(`<svg><polygon points="0,0 10,0 10,10"/></svg>`)), 50);
  assert.ok(Math.abs(totalArea(parseSvg(`<svg><circle cx="0" cy="0" r="5"/></svg>`)) - Math.PI * 25) < 0.2);
  assert.ok(Math.abs(totalArea(parseSvg(`<svg><ellipse cx="0" cy="0" rx="6" ry="3"/></svg>`)) - Math.PI * 18) < 0.2);
});

test("honours rounded rect corners", () => {
  const area = totalArea(parseSvg(`<svg><rect width="10" height="10" rx="2"/></svg>`));
  assert.ok(Math.abs(area - (100 - (4 - Math.PI) * 4)) < 0.05, `got ${area}`);
});

test("composes transforms through nested groups", () => {
  const result = parseSvg(`<svg><g transform="translate(10,0)"><g transform="scale(2)"><rect width="5" height="5"/></g></g></svg>`);
  assert.equal(totalArea(result), 100);
  const xs = result.regions[0].contours[0].map(([x]) => x);
  assert.equal(Math.min(...xs), 10);
  assert.equal(Math.max(...xs), 20);
});

test("supports rotate about a point", () => {
  const result = parseSvg(`<svg><g transform="rotate(90 0 0)"><rect width="4" height="2"/></g></svg>`);
  assert.equal(totalArea(result), 8);
  const ys = result.regions[0].contours[0].map(([, y]) => y);
  assert.ok(Math.max(...ys) > 3.9 && Math.max(...ys) < 4.1);
});

test("reads fill-rule from an attribute, from style, and by inheritance", () => {
  assert.equal(parseSvg(`<svg><path fill-rule="evenodd" d="M0 0 H1 V1 Z"/></svg>`).regions[0].fillRule, "EvenOdd");
  assert.equal(parseSvg(`<svg><path style="fill-rule:evenodd" d="M0 0 H1 V1 Z"/></svg>`).regions[0].fillRule, "EvenOdd");
  assert.equal(parseSvg(`<svg><g fill-rule="evenodd"><path d="M0 0 H1 V1 Z"/></g></svg>`).regions[0].fillRule, "EvenOdd");
  assert.equal(parseSvg(`<svg><path d="M0 0 H1 V1 Z"/></svg>`).regions[0].fillRule, "NonZero");
});

test("counts stroke-only shapes instead of treating them as filled", () => {
  const result = parseSvg(`<svg><path fill="none" stroke="#000" d="M0 0 H10"/><rect width="2" height="2"/></svg>`);
  assert.equal(result.strokeOnlyCount, 1);
  assert.equal(result.regions.length, 1);
});

test("ignores elements that carry no area", () => {
  const result = parseSvg(`<svg><title>x</title><defs><path d="M0 0 H1 V1 Z"/></defs><line x1="0" y1="0" x2="5" y2="5"/><rect width="0" height="5"/></svg>`);
  // The <defs> path is still geometry to this reader; the line and empty rect are not.
  assert.equal(result.regions.length, 1);
});
