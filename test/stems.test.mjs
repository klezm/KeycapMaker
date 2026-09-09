import test from "node:test";
import assert from "node:assert/strict";

import { applyQuality, getEngine } from "../src/engine.mjs";
import { STEMS, getStem, stemIds, stemFitsMount } from "../src/stems/index.mjs";
import { MX_CROSS, crossOutline } from "../src/stems/cross.mjs";
import { buildKeycap } from "../src/keycap.mjs";

const CROSS_STEMS = ["mx", "box", "choc-v2"];

/** The empty space inside a stem post: what the switch actually slots into. */
async function cavityOf(id, slop) {
  const stem = getStem(id);
  const post = await stem.outerSolid(0, 12);
  return post.subtract(await stem.build({ slop, top: 12 }));
}

test("the stem registry is consistent", () => {
  assert.equal(new Set(stemIds()).size, STEMS.length, "stem ids must be unique");
  for (const stem of STEMS) {
    assert.ok(stem.spec.mounts.length > 0, `${stem.spec.id} declares no mount`);
    assert.ok(stem.spec.description, `${stem.spec.id} has no description`);
    assert.equal(typeof stem.build, "function");
    assert.equal(typeof stem.outerSolid, "function");
  }
  assert.throws(() => getStem("nope"), /Unknown stem "nope"/);
});

test("mounts are matched, not assumed", () => {
  assert.ok(stemFitsMount("mx", "mx"));
  assert.ok(!stemFitsMount("mx", "choc"));
  assert.ok(stemFitsMount("choc-v1", "choc"));
  assert.ok(!stemFitsMount("choc-v1", "mx"));
  assert.ok(stemFitsMount("none", "mx") && stemFitsMount("none", "choc"), "none fits anything");
});

test("a stem is a single extrusion running the full height it is asked for", async () => {
  await applyQuality("draft");
  for (const stem of STEMS) {
    if (stem.spec.id === "none") continue;
    const body = await stem.build({ slop: 0.15, top: 11 });
    assert.equal(body.decompose().length, 1, `${stem.spec.id} is not one connected solid`);
    assert.equal(body.boundingBox().max[2].toFixed(3), "11.000", `${stem.spec.id} height`);
  }
});

test("the mount is exactly as deep as the stem declares", async () => {
  await applyQuality("draft");
  for (const stem of STEMS) {
    if (stem.spec.id === "none") continue;
    const cavity = await cavityOf(stem.spec.id, 0.15);
    assert.equal(
      cavity.boundingBox().max[2].toFixed(3),
      stem.spec.height.toFixed(3),
      `${stem.spec.id} cavity depth`,
    );
  }
});

test("the cross slot measures the Cherry spec plus the requested slop", async () => {
  await applyQuality("standard");
  const { Manifold } = await getEngine();

  // Probe with a cross the size of a switch stem: one hair under the slot must
  // slide in without touching, one hair over must not fit. That brackets the
  // slot from both sides, which is what a fit tolerance actually means.
  for (const id of CROSS_STEMS) {
    const stem = getStem(id);
    for (const slop of [0, 0.15, 0.35]) {
      const body = await stem.build({ slop, top: 12 });
      const depth = stem.spec.height;
      const probe = async (grow) =>
        Manifold.extrude(await crossOutline(slop, grow), depth - 0.8).translate([0, 0, 0.7]);

      assert.equal(
        body.intersect(await probe(-0.01)).volume().toFixed(6),
        "0.000000",
        `${id} at slop ${slop}: an undersized cross should slide in freely`,
      );
      assert.ok(
        body.intersect(await probe(0.01)).volume() > 0,
        `${id} at slop ${slop}: the slot is wider than ${MX_CROSS.width + 2 * slop} mm`,
      );
    }
  }
});

test("slop is the only thing that moves the slot walls", async () => {
  await applyQuality("standard");
  const { Manifold } = await getEngine();
  const nominal = Manifold.extrude(await crossOutline(0), 3).translate([0, 0, 0.7]);
  const tight = await getStem("mx").build({ slop: 0, top: 12 });
  const loose = await getStem("mx").build({ slop: 0.35, top: 12 });
  assert.equal(tight.intersect(nominal).volume().toFixed(6), "0.000000", "a nominal cross fits");
  assert.equal(loose.intersect(nominal).volume().toFixed(6), "0.000000", "and still fits with slop");
});

test("the lead-in flares the mouth of the slot", async () => {
  await applyQuality("draft");
  const cavity = await cavityOf("mx", 0.15);
  const { Manifold } = await getEngine();
  const mouth = cavity.intersect(Manifold.cube([20, 20, 0.1], true).translate([0, 0, 0.05]));
  const deep = cavity.intersect(Manifold.cube([20, 20, 0.1], true).translate([0, 0, 3.0]));
  assert.ok(
    mouth.boundingBox().max[0] > deep.boundingBox().max[0],
    "the opening should be wider than the slot",
  );
});

test("more slop means a wider slot and less material", async () => {
  await applyQuality("draft");
  const tight = await getStem("mx").build({ slop: 0.05, top: 6 });
  const loose = await getStem("mx").build({ slop: 0.4, top: 6 });
  assert.ok(loose.volume() < tight.volume(), "a looser slot removes more material");
});

test("the no-stem option leaves the cavity empty", async () => {
  assert.equal(await getStem("none").build({ slop: 0.15, top: 10 }), null);
  const withStem = await buildKeycap({ profile: "dsa", row: 3, units: 1, stem: "mx", quality: "draft" });
  const without = await buildKeycap({ profile: "dsa", row: 3, units: 1, stem: "none", quality: "draft" });
  assert.ok(without.stats.volume < withStem.stats.volume, "a stem adds material");
  assert.equal(
    without.stats.height.toFixed(3),
    withStem.stats.height.toFixed(3),
    "the stem must not change the outside of the cap",
  );
  withStem.solid.delete();
  without.solid.delete();
});

test("the stem reaches the roof and is bonded to it", async () => {
  await applyQuality("draft");
  const { solid } = await buildKeycap({
    profile: "sa",
    row: 1,
    units: 1,
    stem: "mx",
    quality: "draft",
  });
  // One connected solid is the proof: an unbonded post would decompose into two.
  assert.equal(solid.decompose().length, 1, "the stem is not joined to the cap");
  solid.delete();
});
