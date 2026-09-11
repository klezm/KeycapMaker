import test from "node:test";
import assert from "node:assert/strict";

import {
  HOMING_TYPES,
  HOMING_SHAPE,
  homingIds,
  getHoming,
  scoopDepth,
  homingFeature,
} from "../src/homing.mjs";
import { buildKeycap } from "../src/keycap.mjs";
import { resolveSpec } from "../src/profiles/index.mjs";
import { getEngine, applyQuality } from "../src/engine.mjs";
import { outputName, expandMatrix } from "../src/batch.mjs";
import { resolveOptions } from "../src/cli.mjs";
import { buildCatalogue } from "../src/viewer/catalogue.mjs";

const MARKED = homingIds().filter((id) => id !== "none");

async function cap(homing, overrides = {}) {
  return buildKeycap({
    profile: "g20",
    row: 3,
    units: 1,
    stem: "none",
    quality: "draft",
    homing,
    ...overrides,
  });
}

test("the marker registry is consistent", () => {
  assert.equal(new Set(homingIds()).size, HOMING_TYPES.length, "ids must be unique");
  assert.equal(homingIds()[0], "none", "no marker is the default and comes first");
  for (const entry of HOMING_TYPES) {
    assert.ok(entry.name, `${entry.id} has no name`);
    assert.ok(entry.description, `${entry.id} has no description`);
  }
  assert.throws(() => getHoming("bump"), /Unknown homing marker "bump"/);
});

test("only the deep dish changes the dish itself", () => {
  assert.equal(scoopDepth("scoop"), HOMING_SHAPE.scoopExtraDepth);
  for (const id of homingIds().filter((entry) => entry !== "scoop")) {
    assert.equal(scoopDepth(id), 0, `${id} should not deepen the dish`);
  }
});

test("a deep dish is cut into the cap, not added on top of it", async () => {
  const spec = resolveSpec("cherry", 3, 1);
  const plain = await buildKeycap({ profile: "cherry", row: 3, units: 1, stem: "none", quality: "draft" });
  const scooped = await buildKeycap({
    profile: "cherry",
    row: 3,
    units: 1,
    stem: "none",
    homing: "scoop",
    quality: "draft",
  });

  assert.deepEqual(await homingFeature(spec, "scoop"), { add: null, subtract: null });
  assert.ok(scooped.stats.volume < plain.stats.volume, "a deeper dish removes material");
  assert.equal(
    scooped.stats.height.toFixed(3),
    plain.stats.height.toFixed(3),
    "the rim, and so the cap height, is unchanged",
  );
  plain.solid.delete();
  scooped.solid.delete();
});

test("a marker sits at the front of the keytop and nowhere else", async () => {
  await applyQuality("draft");
  const { Manifold } = await getEngine();
  // A flat-topped, untilted profile is symmetric front to back, so comparing
  // the two strips isolates the marker from the shape of the cap.
  const strip = (spec, y) => Manifold.cube([8, 3, 4], true).translate([0, y, spec.height]);

  const plain = await cap("none");
  const reference = plain.solid.intersect(strip(plain.spec, -4.1)).volume();

  for (const homing of MARKED.filter((id) => id !== "scoop")) {
    const marked = await cap(homing);
    const front = marked.solid.intersect(strip(marked.spec, -4.1)).volume();
    const back = marked.solid.intersect(strip(marked.spec, 4.1)).volume();

    assert.equal(
      back.toFixed(3),
      reference.toFixed(3),
      `${homing}: the back of the keytop must be untouched`,
    );
    if (homing === "groove") {
      assert.ok(front < reference - 0.5, `${homing}: the recess should remove material`);
    } else {
      assert.ok(front > reference + 0.3, `${homing}: the marker should add material`);
    }
    marked.solid.delete();
  }
  plain.solid.delete();
});

test("a raised marker stands exactly its own height above the top", async () => {
  const plain = await cap("none");
  for (const [homing, height] of [
    ["bar", HOMING_SHAPE.barHeight],
    ["dot", HOMING_SHAPE.dotHeight],
  ]) {
    const marked = await cap(homing);
    assert.ok(
      Math.abs(marked.stats.height - plain.stats.height - height) < 0.01,
      `${homing}: top went from ${plain.stats.height} to ${marked.stats.height}, expected +${height}`,
    );
    marked.solid.delete();
  }
  plain.solid.delete();
});

test("a marker keeps an even thickness over any dish", async () => {
  await applyQuality("standard");
  // Built from the cap's own dish cutter, so a flat top, a cylindrical scoop
  // and a deep spherical bowl all get the same amount of marker.
  const volumes = [];
  for (const profile of ["g20", "cherry", "dsa", "mt3"]) {
    const feature = await homingFeature(resolveSpec(profile, 3, 1), "bar");
    volumes.push(feature.add.volume());
  }
  for (const volume of volumes) {
    assert.ok(
      Math.abs(volume - volumes[0]) < 1e-6,
      `marker volume varied with the dish: ${volumes.join(", ")}`,
    );
  }
});

test("a marker follows the row's tilt", async () => {
  await applyQuality("draft");
  // The marker rides the tilted top plate, so its own height tracks the row.
  const front = (row) => homingFeature(resolveSpec("cherry", row, 1), "bar");
  const low = (await front(5)).add.boundingBox();
  const high = (await front(1)).add.boundingBox();
  assert.ok(
    high.max[2] > low.max[2],
    "R1 tilts its front edge up, so its marker should sit higher than R5's",
  );
});

test("every profile takes every marker", async () => {
  for (const profile of ["dsa", "xda", "g20", "choc", "cherry", "sa", "mt3"]) {
    for (const homing of homingIds()) {
      const stem = profile === "choc" ? "choc-v2" : "mx";
      const { solid, stats } = await buildKeycap({
        profile,
        row: 3,
        units: 1,
        stem,
        homing,
        quality: "draft",
      });
      const label = `${profile} + ${homing}`;
      assert.equal(solid.status(), "NoError", label);
      assert.equal(solid.genus(), 0, `${label} genus`);
      assert.equal(solid.decompose().length, 1, `${label} is not one solid`);
      assert.equal(stats.homing, homing);
      solid.delete();
    }
  }
});

test("a marker that will not fit the cap is refused", async () => {
  await assert.rejects(
    () => cap("groove", { topThickness: 0.3 }),
    /would cut through a 0.3 mm roof/,
  );
  await assert.rejects(
    () => cap("scoop", { profile: "choc", stem: "choc-v2", topThickness: 3 }),
    /leaves no room under a 3 mm roof/,
  );
  await assert.rejects(() => cap("bump"), /Unknown homing marker/);
});

test("a marked cap is named apart from a plain one", () => {
  const base = { profile: "cherry", row: 3, units: 1, stem: "mx" };
  assert.equal(outputName(base), "cherry_r3_1u_mx");
  assert.equal(outputName({ ...base, homing: "none" }), "cherry_r3_1u_mx");
  assert.equal(outputName({ ...base, homing: "bar" }), "cherry_r3_1u_mx_homing-bar");
  assert.equal(outputName({ ...base, homing: "scoop" }), "cherry_r3_1u_mx_homing-scoop");

  const { jobs } = expandMatrix({
    profiles: ["cherry"],
    rows: [3],
    sizes: [1],
    stems: ["mx"],
    homing: "dot",
  });
  assert.equal(jobs[0].name, "cherry_r3_1u_mx_homing-dot");
  assert.equal(jobs[0].homing, "dot");
});

test("the flag defaults to no marker and rejects anything unknown", () => {
  assert.equal(resolveOptions({}).homing, "none");
  assert.equal(resolveOptions({ homing: "bar" }).homing, "bar");
  assert.throws(() => resolveOptions({ homing: "bump" }), /Unknown homing "bump"/);
});

test("the viewer is offered every marker", () => {
  const catalogue = buildCatalogue();
  assert.deepEqual(
    catalogue.homing.map((entry) => entry.id),
    homingIds(),
  );
  assert.equal(catalogue.defaults.homing, "none");
});
