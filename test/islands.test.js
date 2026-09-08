import test from "node:test";
import assert from "node:assert/strict";

import { generateKeycap } from "../src/cap/generate.js";
import { parseSvg } from "../src/svg/parse-svg.js";
import { regionsToCrossSection, placeGraphic } from "../src/graphic.js";
import { bake } from "../src/bake.js";
import { findIslands } from "../src/islands.js";

// One enclosed counter, like an O.
const RING = `<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2 2 H22 V22 H2 Z M7 7 V17 H17 V7 Z"/></svg>`;
// Two enclosed counters, like an 8.
const DOUBLE = `<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M3 1 H21 V23 H3 Z M7 4 V10 H17 V4 Z M7 14 V20 H17 V14 Z"/></svg>`;
// No counters at all.
const BAR = `<svg viewBox="0 0 24 24"><rect x="8" y="4" width="8" height="16"/></svg>`;

async function bakeSvg(svg, options = {}) {
  const { solid } = await generateKeycap({ stem: "none" });
  const source = await regionsToCrossSection(parseSvg(svg).regions);
  const { profile } = placeGraphic(source, { size: 8 });
  return bake({ cap: solid, profile, ...options });
}

test("a shape with no counters detaches nothing", async () => {
  const { report } = await bakeSvg(BAR);
  assert.equal(report.islandsDetected, 0);
  assert.equal(report.bodyParts, 1);
});

test("counters are detected exactly, one per enclosed region", async () => {
  assert.equal((await bakeSvg(RING)).report.islandsDetected, 1);
  assert.equal((await bakeSvg(DOUBLE)).report.islandsDetected, 2);
});

test("keep leaves the islands in the body mesh rather than dropping them", async () => {
  const { body, report } = await bakeSvg(RING, { islands: "keep" });
  assert.equal(report.islandsRemaining, 1);
  assert.equal(report.bodyParts, 2);

  // The island has to survive into the exported geometry, not just the report.
  const { main, islands } = findIslands(body);
  assert.equal(islands.length, 1);
  assert.ok(islands[0].volume() > 0);
  assert.ok(Math.abs(body.volume() - (main.volume() + islands[0].volume())) < 1e-6);
});

test("bridge ties every island back on", async () => {
  for (const svg of [RING, DOUBLE]) {
    const { report } = await bakeSvg(svg, { islands: "bridge", bridge: { width: 0.8, count: 1 } });
    assert.equal(report.islandsRemaining, 0);
    assert.equal(report.bodyParts, 1);
    assert.ok(report.bridgesAdded >= report.islandsDetected);
  }
});

test("bridging costs cut area, so the insert gets smaller", async () => {
  const kept = await bakeSvg(RING, { islands: "keep" });
  const bridged = await bakeSvg(RING, { islands: "bridge" });
  assert.ok(bridged.report.insertVolume < kept.report.insertVolume);
});

test("wider bridges remove more of the cut", async () => {
  const thin = await bakeSvg(RING, { islands: "bridge", bridge: { width: 0.5 } });
  const thick = await bakeSvg(RING, { islands: "bridge", bridge: { width: 1.5 } });
  assert.ok(thick.report.insertVolume < thin.report.insertVolume);
});

test("error refuses rather than shipping loose parts", async () => {
  await assert.rejects(() => bakeSvg(RING, { islands: "error" }), /detaches 1 island/i);
  // A shape with no counters is fine under the same policy.
  const { report } = await bakeSvg(BAR, { islands: "error" });
  assert.equal(report.islandsDetected, 0);
});

test("findIslands returns the largest component as the mainland", async () => {
  const { body } = await bakeSvg(RING);
  const { main, islands } = findIslands(body);
  assert.ok(main.volume() > islands[0].volume() * 10);
});
