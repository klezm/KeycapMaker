import test from "node:test";
import assert from "node:assert/strict";

import { getEngine } from "../src/engine.js";
import { parseSvg } from "../src/svg/parse-svg.js";
import { regionsToCrossSection, placeGraphic } from "../src/graphic.js";

// An "F" is asymmetric both ways, so it catches flips in either axis.
const F = `<svg viewBox="0 0 24 24"><path d="M4 2 H20 V6 H8 V10 H16 V14 H8 V22 H4 Z"/></svg>`;

async function profileOf(svg) {
  return regionsToCrossSection(parseSvg(svg).regions);
}

test("flips SVG's y-down space into the model's y-up space", async () => {
  const profile = await profileOf(F);
  const { min, max } = profile.bounds();
  // Source y ran 2..22; after the flip it must run -22..-2, with x untouched.
  assert.ok(Math.abs(min[1] + 22) < 1e-6, `min y ${min[1]}`);
  assert.ok(Math.abs(max[1] + 2) < 1e-6, `max y ${max[1]}`);
  assert.ok(Math.abs(min[0] - 4) < 1e-6);
  assert.ok(Math.abs(max[0] - 20) < 1e-6);
});

test("keeps the F upright: its widest bar ends up at the top", async () => {
  const { CrossSection } = await getEngine();
  const { profile } = placeGraphic(await profileOf(F), { size: 10 });
  const band = (offsetY) => profile.intersect(CrossSection.square([20, 5], true).translate([0, offsetY])).area();
  assert.ok(band(2.5) > band(-2.5), "the top half of an F carries more ink than the bottom");
});

test("contain fits inside the box, cover fills it, exact matches it", async () => {
  const source = await profileOf(F);
  const contain = placeGraphic(source, { size: [8, 4], fit: "contain" }).bounds;
  assert.ok(contain.width <= 8 + 1e-6 && contain.height <= 4 + 1e-6);

  const cover = placeGraphic(source, { size: [8, 4], fit: "cover" }).bounds;
  assert.ok(cover.width >= 8 - 1e-6 && cover.height >= 4 - 1e-6);

  const exact = placeGraphic(source, { size: [8, 4], fit: "exact" }).bounds;
  assert.ok(Math.abs(exact.width - 8) < 1e-3 && Math.abs(exact.height - 4) < 1e-3);
});

test("a single size value means a square target box", async () => {
  const { bounds } = placeGraphic(await profileOf(F), { size: 10 });
  assert.ok(Math.max(bounds.width, bounds.height) <= 10 + 1e-6);
  assert.ok(Math.abs(Math.max(bounds.width, bounds.height) - 10) < 1e-6);
});

test("rotating by 90 degrees swaps the bounding box", async () => {
  const source = await profileOf(F);
  const upright = placeGraphic(source, { size: 10 }).bounds;
  const turned = placeGraphic(source, { size: 10, rotate: 90 }).bounds;
  assert.ok(Math.abs(turned.width - upright.height) < 1e-3);
  assert.ok(Math.abs(turned.height - upright.width) < 1e-3);
});

test("offset is measured from the graphic's own centre", async () => {
  const { bounds } = placeGraphic(await profileOf(F), { size: 10, offset: [3, -2] });
  assert.ok(Math.abs(bounds.centre[0] - 3) < 1e-6);
  assert.ok(Math.abs(bounds.centre[1] + 2) < 1e-6);
});

test("mirror flips the graphic left to right", async () => {
  const { CrossSection } = await getEngine();
  const source = await profileOf(F);
  const rightHalf = (profile) => profile.intersect(CrossSection.square([5, 20], true).translate([2.5, 0])).area();
  const plain = placeGraphic(source, { size: 10 }).profile;
  const mirrored = placeGraphic(source, { size: 10, mirror: true }).profile;
  assert.ok(Math.abs(rightHalf(plain) - rightHalf(mirrored)) > 1e-3, "mirroring must change the shape");
  assert.ok(Math.abs(plain.area() - mirrored.area()) < 1e-6, "mirroring must preserve area");
});

test("fitBox is used when no explicit size is given", async () => {
  const { bounds } = placeGraphic(await profileOf(F), { fitBox: [6, 6] });
  assert.ok(Math.max(bounds.width, bounds.height) <= 6 + 1e-6);
});

test("rejects an SVG with nothing to cut", async () => {
  await assert.rejects(() => regionsToCrossSection([]), /no filled shapes/i);
});
