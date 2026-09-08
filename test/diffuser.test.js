import test from "node:test";
import assert from "node:assert/strict";

import { getEngine } from "../src/engine.js";
import { generateKeycap } from "../src/cap/generate.js";
import { parseSvg } from "../src/svg/parse-svg.js";
import { regionsToCrossSection, placeGraphic } from "../src/graphic.js";
import { bake } from "../src/bake.js";

const BAR = `<svg viewBox="0 0 24 24"><rect x="10" y="8" width="4" height="8"/></svg>`;

async function bakeWith(diffuser, { stem = "none", size = 5, ...capParams } = {}) {
  const cap = await generateKeycap({ stem, ...capParams });
  const source = await regionsToCrossSection(parseSvg(BAR).regions);
  const { profile } = placeGraphic(source, { size });
  const result = await bake({ cap: cap.solid, profile, diffuser });
  return { cap: cap.solid, generated: cap, ...result };
}

/** Vertical extent of a solid inside a narrow column, or null if it misses. */
async function columnSpan(solid, x, y) {
  const { CrossSection } = await getEngine();
  const column = CrossSection.square([0.4, 0.4], true).translate([x, y]).extrude(60).translate([0, 0, -30]);
  const slice = solid.intersect(column);
  if (slice.isEmpty()) return null;
  const box = slice.boundingBox();
  return { min: box.min[2], max: box.max[2], thickness: box.max[2] - box.min[2] };
}

test("off by default: a zero depth changes nothing", async () => {
  const off = await bakeWith({ depth: 0 });
  const omitted = await bakeWith(undefined);
  assert.equal(off.report.diffuserVolume, 0);
  assert.ok(Math.abs(off.report.bodyVolume - omitted.report.bodyVolume) < 1e-9);
  assert.ok(Math.abs(off.report.insertVolume - omitted.report.insertVolume) < 1e-9);
});

test("the layer adds transparent material and takes it from the body", async () => {
  const without = await bakeWith({ depth: 0 });
  const with06 = await bakeWith({ depth: 0.6 });

  assert.ok(with06.report.diffuserVolume > 0);
  assert.ok(with06.report.insertVolume > without.report.insertVolume);
  assert.ok(with06.report.bodyVolume < without.report.bodyVolume);
});

test("the keycap gets no thicker — this is the whole constraint", async () => {
  const { cap, body, insert } = await bakeWith({ depth: 0.8 });
  const before = cap.boundingBox();
  const after = body.add(insert).boundingBox();
  for (let axis = 0; axis < 3; axis += 1) {
    assert.ok(Math.abs(before.min[axis] - after.min[axis]) < 1e-6, `min axis ${axis}`);
    assert.ok(Math.abs(before.max[axis] - after.max[axis]) < 1e-6, `max axis ${axis}`);
  }
});

test("body and insert still account for the whole cap", async () => {
  const { report } = await bakeWith({ depth: 0.6 });
  assert.ok(report.volumeGap > 0, "there is still a kerf around the plug");
  const rebuilt = report.bodyVolume + report.insertVolume + report.volumeGap;
  assert.ok(Math.abs(rebuilt - report.capVolume) < 1e-6);
});

test("depth is proportional: twice as deep is twice the material", async () => {
  const shallow = await bakeWith({ depth: 0.4 });
  const deep = await bakeWith({ depth: 0.8 });
  const ratio = deep.report.diffuserVolume / shallow.report.diffuserVolume;
  assert.ok(ratio > 1.9 && ratio < 2.1, `expected about 2x, got ${ratio.toFixed(3)}`);
});

test("the layer hugs the dished underside instead of sitting flat", async () => {
  const depth = 0.6;
  const { insert } = await bakeWith({ depth });

  // Both columns are clear of the graphic, so they sample the layer alone. The
  // cylindrical dish runs along X, so these two sit at different heights.
  const deepest = await columnSpan(insert, 4, 0);
  const shallower = await columnSpan(insert, 4, 4);
  assert.ok(deepest && shallower, "both columns must hit the layer");

  assert.ok(shallower.min > deepest.min + 0.1, "the layer must rise with the dish, not lie flat");
  for (const span of [deepest, shallower]) {
    // Sampled over a 0.4 mm wide column, so a sloped surface reads slightly thick.
    assert.ok(span.thickness >= depth - 0.02 && span.thickness < depth + 0.2, `thickness ${span.thickness}`);
  }
});

test("opaque skin is left above the layer everywhere it runs", async () => {
  const { body, insert } = await bakeWith({ depth: 0.6 });
  for (const [x, y] of [[4, 0], [4, 4], [-4, 2], [0, 4]]) {
    const layer = await columnSpan(insert, x, y);
    const opaque = await columnSpan(body, x, y);
    assert.ok(layer && opaque, `column (${x},${y}) must have both`);
    assert.ok(opaque.max > layer.max + 0.3, `no skin above the layer at (${x},${y})`);
  }
});

test("the layer lines the roof only, never runs down the walls", async () => {
  const { insert, report } = await bakeWith({ depth: 0.6 });
  // A tapered inner wall collects a layer of its own; it must not be included.
  assert.ok(
    insert.boundingBox().min[2] >= report.cutFromZ - 0.05,
    `insert reaches down to ${insert.boundingBox().min[2]}, below the roof at ${report.cutFromZ}`,
  );
});

test("the transparent path stays one connected solid", async () => {
  for (const stem of ["none", "mx"]) {
    for (const depth of [0.3, 0.6, 0.9]) {
      const { report } = await bakeWith({ depth }, { stem, topThickness: 2 });
      assert.equal(report.insertParts, 1, `stem ${stem}, depth ${depth}`);
      assert.equal(report.insertStatus, "NoError");
      assert.equal(report.bodyStatus, "NoError");
    }
  }
});

test("the opaque skin is not severed from the walls", async () => {
  // A full-width layer could have left the roof skin as a floating lid.
  for (const stem of ["none", "mx"]) {
    const plain = await bakeWith({ depth: 0 }, { stem });
    const lined = await bakeWith({ depth: 0.6 }, { stem });
    assert.equal(lined.report.bodyParts, plain.report.bodyParts, `stem ${stem}`);
  }
});

test("warns when the skin above the layer gets thin", async () => {
  // A 1.5 mm roof cannot carry 0.9 mm of layer and still keep 0.8 mm of skin.
  const thin = await bakeWith({ depth: 0.9, minSkin: 0.8 });
  assert.ok(thin.report.thinSkinVolume > 0, "should flag the thin skin");

  const roomy = await bakeWith({ depth: 0.9, minSkin: 0.8 }, { topThickness: 2.5 });
  assert.equal(roomy.report.thinSkinVolume, 0, "a thicker roof leaves room");
});

test("refuses a layer that would break through the top surface", async () => {
  await assert.rejects(() => bakeWith({ depth: 2.0 }), /breaks through the top surface/i);
});

test("inset pulls the layer back from the walls", async () => {
  const flush = await bakeWith({ depth: 0.6, inset: 0 });
  const pulled = await bakeWith({ depth: 0.6, inset: 1.0 });
  assert.ok(pulled.report.diffuserVolume < flush.report.diffuserVolume);

  const flushBox = flush.insert.boundingBox();
  const pulledBox = pulled.insert.boundingBox();
  assert.ok(pulledBox.max[0] < flushBox.max[0] - 0.5, "the layer's edge must move inwards");
});

test("reports the depth and inset it was given", async () => {
  const { report } = await bakeWith({ depth: 0.5, inset: 0.25, minSkin: 0.6 });
  assert.equal(report.diffuserDepth, 0.5);
  assert.equal(report.diffuserInset, 0.25);
  assert.equal(report.diffuserMinSkin, 0.6);
});

test("combines with island bridging", async () => {
  const RING = `<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2 2 H22 V22 H2 Z M7 7 V17 H17 V7 Z"/></svg>`;
  const cap = await generateKeycap({ stem: "none" });
  const source = await regionsToCrossSection(parseSvg(RING).regions);
  const { profile } = placeGraphic(source, { size: 8 });

  const kept = await bake({ cap: cap.solid, profile, diffuser: { depth: 0.6 }, islands: "keep" });
  assert.equal(kept.report.islandsRemaining, 1);

  const bridged = await bake({ cap: cap.solid, profile, diffuser: { depth: 0.6 }, islands: "bridge" });
  assert.equal(bridged.report.islandsRemaining, 0);
  assert.equal(bridged.report.bodyParts, 1);
  assert.ok(bridged.report.diffuserVolume > 0);
});
