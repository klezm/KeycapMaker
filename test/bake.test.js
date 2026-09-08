import test from "node:test";
import assert from "node:assert/strict";

import { getEngine } from "../src/engine.js";
import { generateKeycap } from "../src/cap/generate.js";
import { parseSvg } from "../src/svg/parse-svg.js";
import { regionsToCrossSection, placeGraphic } from "../src/graphic.js";
import { bake, probeRoofUnderside } from "../src/bake.js";

const BAR = `<svg viewBox="0 0 24 24"><rect x="8" y="4" width="8" height="16"/></svg>`;
const RING = `<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2 2 H22 V22 H2 Z M7 7 V17 H17 V7 Z"/></svg>`;

async function setup(svg, { capParams = { stem: "none" }, place = { size: 8 } } = {}) {
  const cap = await generateKeycap(capParams);
  const source = await regionsToCrossSection(parseSvg(svg).regions);
  const { profile } = placeGraphic(source, place);
  return { cap, profile };
}

test("body and insert reassemble the cap, short only by the clearance kerf", async () => {
  const { cap, profile } = await setup(BAR);
  const { report } = await bake({ cap: cap.solid, profile, clearance: 0.15 });

  assert.equal(report.bodyStatus, "NoError");
  assert.equal(report.insertStatus, "NoError");
  assert.ok(report.volumeGap > 0, "there must be a kerf");

  // The kerf can be no larger than the cut perimeter times the gap times the depth.
  const perimeter = profile.toPolygons().reduce((sum, contour) => {
    let length = 0;
    for (let i = 0; i < contour.length; i += 1) {
      const [x1, y1] = contour[i];
      const [x2, y2] = contour[(i + 1) % contour.length];
      length += Math.hypot(x2 - x1, y2 - y1);
    }
    return sum + length;
  }, 0);
  const ceiling = perimeter * 0.15 * report.cutHeight * 1.05;
  assert.ok(report.volumeGap < ceiling, `kerf ${report.volumeGap} should be under ${ceiling}`);
});

test("with zero clearance the two halves account for the whole cap", async () => {
  const { cap, profile } = await setup(BAR);
  const { report } = await bake({ cap: cap.solid, profile, clearance: 0 });
  assert.ok(Math.abs(report.volumeGap) < 1e-3, `gap ${report.volumeGap}`);
});

test("the cut goes clean through: no material is left inside the footprint", async () => {
  const { cap, profile } = await setup(BAR);
  const { body, report } = await bake({ cap: cap.solid, profile, clearance: 0.15 });
  const top = cap.solid.boundingBox().max[2];

  // This is the whole point of the tool: between the cut plane and the very top
  // of the cap, the graphic's footprint must contain no body material at all.
  for (let z = report.cutFromZ + 0.05; z < top - 0.05; z += 0.25) {
    const remaining = body.slice(z).intersect(profile).area();
    assert.ok(remaining < 1e-6, `material left at z=${z.toFixed(2)}: ${remaining}`);
  }
});

test("the insert spans the full cut and nothing below it", async () => {
  const { cap, profile } = await setup(BAR);
  const { insert, report } = await bake({ cap: cap.solid, profile, clearance: 0.15 });
  const capBox = cap.solid.boundingBox();
  const insertBox = insert.boundingBox();

  // The cap's highest point is at its corners; the graphic sits down in the
  // dish, so compare against the cap's top surface within the footprint.
  const column = profile.extrude(capBox.max[2] - capBox.min[2] + 2).translate([0, 0, capBox.min[2] - 1]);
  const surfaceZ = cap.solid.intersect(column).boundingBox().max[2];

  assert.ok(surfaceZ < capBox.max[2], "the dish means the footprint sits below the cap's corners");
  assert.ok(Math.abs(insertBox.max[2] - surfaceZ) < 0.02, `insert top ${insertBox.max[2]} vs surface ${surfaceZ}`);
  assert.ok(insertBox.min[2] >= report.cutFromZ - 0.05, "the insert must not dip below the cut plane");
});

test("the probe finds the roof underside the generator built", async () => {
  const { cap, profile } = await setup(BAR);
  const probe = await probeRoofUnderside(cap.solid, profile);
  assert.ok(
    Math.abs(probe.z - cap.topWallUndersideZ) < 0.12,
    `probed ${probe.z}, generator says ${cap.topWallUndersideZ}`,
  );
});

test("a stem fused to the roof does not defeat the probe, and survives the cut", async () => {
  const { cap, profile } = await setup(BAR, { capParams: { stem: "mx" } });
  const withStem = cap.solid;
  const { body, report } = await bake({ cap: withStem, profile });

  assert.equal(report.cutFromZSource, "cavity", "an MX stem touches the roof, so the fallback path is used");
  // Well below the cut, the stem must be exactly as it was.
  const before = withStem.slice(2).area();
  const after = body.slice(2).area();
  assert.ok(Math.abs(before - after) < 1e-6, `stem cross-section changed: ${before} -> ${after}`);
});

test("reports the share of the graphic that sits over solid material", async () => {
  const centred = await setup(BAR, { capParams: { stem: "mx" }, place: { size: 8 } });
  const overStem = await bake({ cap: centred.cap.solid, profile: centred.profile });
  assert.ok(overStem.report.blockedFraction > 0.1, "a centred legend sits over the stem");

  const clear = await setup(BAR, { capParams: { stem: "none" }, place: { size: 8 } });
  const overCavity = await bake({ cap: clear.cap.solid, profile: clear.profile });
  assert.ok(overCavity.report.blockedFraction < 1e-6, "with no stem nothing blocks the cut");
});

test("cut-from-z can be set explicitly", async () => {
  const { cap, profile } = await setup(BAR);
  const { report } = await bake({ cap: cap.solid, profile, cutFromZ: 7.2 });
  assert.equal(report.cutFromZSource, "manual");
  assert.equal(report.cutFromZ, 7.2);
});

test("a wider clearance leaves a larger kerf", async () => {
  const { cap, profile } = await setup(BAR);
  const tight = await bake({ cap: cap.solid, profile, clearance: 0.1 });
  const loose = await bake({ cap: cap.solid, profile, clearance: 0.4 });
  assert.ok(loose.report.volumeGap > tight.report.volumeGap * 2);
  assert.ok(loose.report.insertVolume < tight.report.insertVolume);
});

test("refuses a clearance that would erase the graphic", async () => {
  const { cap, profile } = await setup(RING);
  await assert.rejects(() => bake({ cap: cap.solid, profile, clearance: 6 }), /erases the graphic/i);
});

test("refuses a graphic that misses the keycap", async () => {
  const { cap, profile } = await setup(BAR, { place: { size: 8, offset: [40, 0] } });
  await assert.rejects(() => bake({ cap: cap.solid, profile }), /does not overlap/i);
});

test("refuses a cut plane above the top of the cap", async () => {
  const { cap, profile } = await setup(BAR);
  await assert.rejects(() => bake({ cap: cap.solid, profile, cutFromZ: 20 }), /at or above the top/i);
});
