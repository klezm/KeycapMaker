import test from "node:test";
import assert from "node:assert/strict";

import { buildKeycap } from "../src/keycap.mjs";
import { getEngine } from "../src/engine.mjs";
import { PROFILES, resolveSpec } from "../src/profiles/index.mjs";
import { STEMS, stemFitsMount } from "../src/stems/index.mjs";
import { dishRadius, topPlateMaxRadius } from "../src/geometry/dish.mjs";
import { roundedRectRing, ringPointCount, segmentsForRadius } from "../src/geometry/section.mjs";
import { loftRings } from "../src/geometry/loft.mjs";

const TOLERANCE = 0.05;

test("a rounded rectangle ring has a fixed point count and stays in bounds", () => {
  for (const segments of [4, 8, 16]) {
    const ring = roundedRectRing(18.16, 18.16, 1.5, segments);
    assert.equal(ring.length, ringPointCount(segments));
    for (const [x, y] of ring) {
      assert.ok(Math.abs(x) <= 18.16 / 2 + 1e-9, "x escaped the rectangle");
      assert.ok(Math.abs(y) <= 18.16 / 2 + 1e-9, "y escaped the rectangle");
    }
  }
  // A radius larger than the rectangle is clamped rather than inverted.
  const clamped = roundedRectRing(4, 4, 99, 8);
  for (const [x, y] of clamped) assert.ok(Math.hypot(x, y) <= 2 + 1e-9);
});

test("segment counts follow the sagitta budget, not the circumference", () => {
  for (const radius of [1.17, 2.75, 9.2, 42.8]) {
    const segments = segmentsForRadius(radius, 0.02);
    const deviation = radius * (1 - Math.cos(Math.PI / segments));
    assert.ok(deviation <= 0.0201, `R${radius} deviates by ${deviation}`);
  }
  assert.ok(segmentsForRadius(42.8) > segmentsForRadius(2.75), "bigger circles need more segments");
});

test("a loft of non-convex rings stays a valid closed solid", async () => {
  // A waisted stack: a convex hull would bridge the waist, a loft must not.
  const rings = [9, 6, 8].map((size, index) =>
    roundedRectRing(size * 2, size * 2, 1, 8).map(([x, y]) => [x, y, index * 4]),
  );
  const solid = await loftRings(rings);
  assert.equal(solid.status(), "NoError");
  assert.equal(solid.genus(), 0);
  const hullVolume = solid.hull().volume();
  assert.ok(solid.volume() < hullVolume, "the waist should make the loft smaller than its hull");
});

test("rings of different lengths are rejected rather than silently skewed", async () => {
  const good = roundedRectRing(10, 10, 1, 8).map(([x, y]) => [x, y, 0]);
  const bad = roundedRectRing(8, 8, 1, 4).map(([x, y]) => [x, y, 5]);
  await assert.rejects(() => loftRings([good, bad]), /all rings must match/);
  await assert.rejects(() => loftRings([good]), /at least 2 rings/);
});

test("the dish arc matches the sagitta it is asked for", () => {
  const halfSpan = 6.5;
  const depth = 1.5;
  const radius = dishRadius(halfSpan, depth);
  // The arc must pass through the rim: R - sqrt(R^2 - halfSpan^2) === depth.
  assert.ok(Math.abs(radius - Math.sqrt(radius ** 2 - halfSpan ** 2) - depth) < 1e-9);

  const spec = resolveSpec("dsa", 3, 1);
  const corner = topPlateMaxRadius(spec);
  assert.ok(corner > spec.topWidth / 2, "the corner is further out than the edge midpoint");
  assert.ok(corner < Math.hypot(spec.topWidth / 2, spec.topDepth / 2), "but inside the sharp corner");
});

test("every profile and stem combination builds a valid solid", async () => {
  await getEngine();
  for (const profile of PROFILES) {
    for (const stem of STEMS) {
      if (!stemFitsMount(stem.spec.id, profile.mount)) continue;
      const row = profile.rows.includes(3) ? 3 : profile.rows[0];
      const { solid, stats } = await buildKeycap({
        profile: profile.id,
        row,
        units: 1,
        stem: stem.spec.id,
        quality: "draft",
      });
      const label = `${profile.id} R${row} ${stem.spec.id}`;
      assert.equal(solid.status(), "NoError", `${label} status`);
      assert.equal(solid.genus(), 0, `${label} genus`);
      assert.ok(stats.volume > 0, `${label} volume`);
      assert.ok(stats.triangles > 0, `${label} triangles`);
      solid.delete();
    }
  }
});

test("the finished cap matches the footprint and height it declares", async () => {
  for (const [profile, row, units] of [
    ["dsa", 3, 1],
    ["cherry", 5, 1],
    ["sa", 1, 1],
    ["oem", 3, 6.25],
    ["choc", 3, 1.5],
    ["g20", 3, 2],
  ]) {
    const spec = resolveSpec(profile, row, units);
    const { solid, stats } = await buildKeycap({ profile, row, units, stem: "none", quality: "draft" });
    const label = `${profile} R${row} ${units}u`;

    assert.ok(Math.abs(stats.width - spec.baseWidth) < TOLERANCE, `${label} width ${stats.width}`);
    assert.ok(Math.abs(stats.depth - spec.baseDepth) < TOLERANCE, `${label} depth ${stats.depth}`);

    // Tilt lifts the back edge above the nominal plate height by a known amount.
    const lift = Math.abs(Math.sin((spec.tilt * Math.PI) / 180)) * (spec.topDepth / 2);
    assert.ok(
      Math.abs(stats.height - (spec.height + lift)) < 0.15,
      `${label} height ${stats.height}, expected about ${spec.height + lift}`,
    );
    solid.delete();
  }
});

test("a spherical dish keeps its scoop however wide the key gets", async () => {
  // Sizing the dish to a widened plate would flatten wide caps almost to
  // nothing; the sphere is swept along the length instead, so the front-to-back
  // arc stays the profile's own.
  const sag = (units) => {
    const spec = resolveSpec("dsa", 3, units);
    const sweep = spec.widthGrowth / 2;
    const radius = dishRadius(
      topPlateMaxRadius({ ...spec, topWidth: spec.topWidth - 2 * sweep }),
      spec.dish.depth,
    );
    const halfDepth = spec.topDepth / 2;
    return radius - Math.sqrt(radius * radius - halfDepth * halfDepth);
  };

  const reference = sag(1);
  assert.ok(reference > 0.9, `a 1u DSA should scoop about 1 mm, got ${reference}`);
  for (const units of [2, 3, 6.25, 7]) {
    assert.ok(
      Math.abs(sag(units) - reference) < 1e-6,
      `${units}u scoops ${sag(units).toFixed(3)} mm, expected ${reference.toFixed(3)} mm`,
    );
  }
});

test("wide caps still reach their declared height across the whole top", async () => {
  for (const units of [1, 6.25, 7]) {
    const spec = resolveSpec("dsa", 3, units);
    const { solid, stats } = await buildKeycap({
      profile: "dsa",
      row: 3,
      units,
      stem: "none",
      quality: "draft",
    });
    assert.ok(
      Math.abs(stats.height - spec.height) < 0.05,
      `${units}u is ${stats.height} mm tall, expected ${spec.height}`,
    );
    solid.delete();
  }
});

test("walls and roof honour the requested thickness", async () => {
  const wall = 2.0;
  const topThickness = 1.8;
  const thin = await buildKeycap({ profile: "dsa", row: 3, units: 1, stem: "none", quality: "draft" });
  const thick = await buildKeycap({
    profile: "dsa",
    row: 3,
    units: 1,
    stem: "none",
    wall,
    topThickness,
    quality: "draft",
  });
  assert.ok(thick.stats.volume > thin.stats.volume, "thicker walls mean more material");
  assert.equal(thick.stats.height.toFixed(2), thin.stats.height.toFixed(2), "outer shape is unchanged");
  thin.solid.delete();
  thick.solid.delete();
});

test("impossible requests fail loudly instead of producing junk", async () => {
  await assert.rejects(
    () => buildKeycap({ profile: "dsa", row: 3, units: 1, stem: "choc-v1" }),
    /does not fit a mx-mount profile/,
  );
  await assert.rejects(
    () => buildKeycap({ profile: "choc", row: 3, units: 1, stem: "mx" }),
    /does not fit a choc-mount profile/,
  );
  await assert.rejects(
    () => buildKeycap({ profile: "choc", row: 3, units: 1, stem: "none", topThickness: 9 }),
    /exceeds the choc R3 height/,
  );
  await assert.rejects(
    () => buildKeycap({ profile: "dsa", row: 3, units: 1, stem: "none", wall: 12 }),
    /too thick/,
  );
});
