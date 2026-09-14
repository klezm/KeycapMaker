import test from "node:test";
import assert from "node:assert/strict";

import { getEngine, withArena, applyQuality, QUALITY_PRESETS } from "../src/engine.mjs";
import { buildKeycap } from "../src/keycap.mjs";

test("an arena frees the solids built inside it", async () => {
  const { Manifold } = await getEngine();
  let intermediates = [];
  const kept = await withArena(async (keep) => {
    const block = Manifold.cube([10, 10, 10], true);
    const ball = Manifold.sphere(6);
    const moved = block.subtract(ball).translate([1, 0, 0]);
    intermediates = [block, ball];
    return keep(moved);
  });

  assert.ok(
    intermediates.every((solid) => solid.isDeleted()),
    "every intermediate should be freed on the way out",
  );
  assert.equal(kept.isDeleted(), false, "the kept solid must survive the arena");
  assert.ok(kept.volume() > 0);
  kept.delete();
});

test("an arena frees the solids of a build that throws", async () => {
  const { Manifold } = await getEngine();
  let orphan = null;
  await assert.rejects(
    withArena(async () => {
      orphan = Manifold.cube([4, 4, 4]);
      throw new Error("nope");
    }),
    /nope/,
  );
  assert.equal(orphan.isDeleted(), true);
});

test("arenas nest, handing kept solids to the arena outside", async () => {
  const { Manifold } = await getEngine();
  let inner = null;
  await withArena(async () => {
    inner = await withArena(async (keep) => keep(Manifold.cube([2, 2, 2])));
    assert.equal(inner.isDeleted(), false, "the outer arena still holds it");
  });
  assert.equal(inner.isDeleted(), true, "and frees it when it closes in turn");
});

test("builds in flight at once do not free each other's geometry", async () => {
  // Two viewer requests, or any two callers, can be part-way through a build
  // at the same time. A single shared arena had whichever finished first free
  // the other's intermediates, and the survivor came back as a dead handle.
  const [tall, flat] = await Promise.all([
    buildKeycap({ profile: "sa", row: 1, units: 1, stem: "mx", quality: "draft" }),
    buildKeycap({ profile: "choc", row: 3, units: 1, stem: "choc-v2", quality: "draft" }),
  ]);
  assert.ok(tall.solid.volume() > 0);
  assert.ok(flat.solid.volume() > 0);
  assert.ok(tall.stats.height > flat.stats.height, "and they are still the caps that were asked for");
  tall.solid.delete();
  flat.solid.delete();
});

test("building caps does not grow the heap", async () => {
  // Manifold's solids live in WebAssembly, where the garbage collector cannot
  // reach them: every intermediate a cap is built from has to be freed by
  // hand. Left alone, 60 standard-quality caps grew the process by 207 MB and
  // the full matrix was killed outright -- so this measures the thing that
  // actually breaks rather than counting delete() calls. With the arena the
  // same 60 cost 5 MB, so the threshold has room on both sides.
  await applyQuality("standard");
  const build = async () => {
    const { solid } = await buildKeycap({ profile: "cherry", row: 3, units: 1, stem: "mx" });
    solid.delete();
  };

  // Let the kernel reach its working size before taking the baseline.
  for (let index = 0; index < 10; index += 1) await build();
  const settled = process.memoryUsage().rss;
  for (let index = 0; index < 60; index += 1) await build();
  const grew = (process.memoryUsage().rss - settled) / 1024 / 1024;

  assert.ok(grew < 60, `60 caps grew the process by ${grew.toFixed(0)} MB`);
});

test("every quality preset carries a deviation budget", () => {
  // A missing budget used to leave the facet count undefined, which silently
  // fell back to the kernel's global resolution and made quality look like it
  // worked while ignoring the setting.
  for (const [name, preset] of Object.entries(QUALITY_PRESETS)) {
    assert.ok(Number.isFinite(preset.deviation), `${name} has no deviation budget`);
    assert.ok(preset.deviation > 0, `${name} budget must be positive`);
  }
});
