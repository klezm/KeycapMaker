import test from "node:test";
import assert from "node:assert/strict";

import {
  MODIFIERS,
  MODIFIER_GROUPS,
  modifierIds,
  getModifier,
  applyModifiers,
  parseModifiers,
  modifierToken,
  describeModifiers,
  activeModifiers,
  validateModifiers,
} from "../src/modifiers.mjs";
import { resolveSpec } from "../src/profiles/index.mjs";
import { buildKeycap } from "../src/keycap.mjs";
import { getEngine, applyQuality } from "../src/engine.mjs";
import { outputName } from "../src/batch.mjs";

const spec = (modifiers) => resolveSpec("cherry", 3, 1, { modifiers });

test("the registry is complete and sanely bounded", () => {
  assert.equal(new Set(modifierIds()).size, MODIFIERS.length, "ids must be unique");
  for (const modifier of MODIFIERS) {
    assert.ok(modifier.label, `${modifier.id} has no label`);
    assert.ok(MODIFIER_GROUPS.includes(modifier.group), `${modifier.id} group`);
    assert.ok(["mm", "deg"].includes(modifier.unit), `${modifier.id} unit`);
    assert.ok(modifier.min < modifier.max, `${modifier.id} range`);
    assert.ok(modifier.min <= 0 && modifier.max > 0, `${modifier.id} must allow zero`);
    assert.ok(modifier.step > 0, `${modifier.id} step`);
    assert.equal(typeof modifier.apply, "function");
  }
  assert.throws(() => getModifier("nope"), /Unknown adjustment "nope"/);
});

test("zero changes nothing", () => {
  const plain = spec({});
  for (const modifier of MODIFIERS) {
    const zeroed = spec({ [modifier.id]: 0 });
    assert.deepEqual(zeroed.topEdges, plain.topEdges, `${modifier.id} moved the plate`);
    assert.equal(zeroed.height, plain.height, `${modifier.id} moved the height`);
  }
  assert.deepEqual(activeModifiers({ height: 0, taper: 0 }), [], "a zero is not an adjustment");
});

test("a taper turns every side by the angle asked for", () => {
  const plain = spec({});
  const implied = Math.atan2((plain.baseWidth - plain.topWidth) / 2, plain.height);

  for (const delta of [-4, 6, 12]) {
    const turned = spec({ taper: delta });
    const expected =
      plain.baseWidth - 2 * Math.tan(implied + (delta * Math.PI) / 180) * plain.height;
    assert.ok(
      Math.abs(turned.topWidth - expected) < 1e-9,
      `taper ${delta}: top is ${turned.topWidth}, expected ${expected}`,
    );
  }
  // Steeper sides mean a smaller top face, which is the point of the control.
  assert.ok(spec({ taper: 6 }).topWidth < plain.topWidth);
  assert.ok(spec({ taper: -6 }).topWidth > plain.topWidth);
});

test("a one-sided taper moves that edge and leaves the other three", () => {
  const plain = spec({});
  for (const side of ["front", "back", "left", "right"]) {
    const turned = spec({ ["taper-" + side]: 7 });
    for (const other of ["front", "back", "left", "right"]) {
      if (other === side) {
        assert.notEqual(turned.topEdges[other], plain.topEdges[other], `${side} did not move`);
      } else {
        assert.equal(
          turned.topEdges[other],
          plain.topEdges[other],
          `tapering ${side} also moved ${other}`,
        );
      }
    }
  }
  // Turning one side in shifts the plate's centre off the cap's centre.
  assert.ok(spec({ "taper-left": 8 }).topOffsetX > 0.5, "the plate should slide away from the left");
  assert.equal(spec({}).topOffsetX, 0, "a stock cap is centred");
});

test("a combination that will not fit is refused, not built badly", async () => {
  await applyQuality("draft");
  // A taper steep enough to make the top plate narrower than the stem leaves a
  // shape that folds through itself. The shell alone is fine at any taper, so
  // this can only be caught once the stem is in.
  await assert.rejects(
    () => buildKeycap({ profile: "cherry", row: 3, units: 1, stem: "mx", quality: "draft", modifiers: { taper: 20 } }),
    /folds in on itself/,
  );
  const shell = await buildKeycap({
    profile: "cherry",
    row: 3,
    units: 1,
    stem: "none",
    quality: "draft",
    modifiers: { taper: 20 },
  });
  assert.equal(shell.solid.genus(), 0, "without a stem the same taper is perfectly sound");
  shell.solid.delete();
});

test("a taper steep enough to invert the plate is held open instead", () => {
  const extreme = spec({ taper: 20, "top-width": -8, "top-depth": -8 });
  assert.ok(extreme.topWidth >= 2, `top width collapsed to ${extreme.topWidth}`);
  assert.ok(extreme.topDepth >= 2, `top depth collapsed to ${extreme.topDepth}`);
  assert.ok(extreme.topEdges.right > extreme.topEdges.left, "the plate turned inside out");
});

test("each adjustment moves what it names and nothing else", () => {
  const plain = spec({});
  assert.equal(spec({ height: 2.5 }).height, plain.height + 2.5);
  assert.equal(spec({ tilt: 4 }).tilt, plain.tilt + 4);
  assert.equal(spec({ "dish-depth": 0.5 }).dish.depth, plain.dish.depth + 0.5);
  assert.equal(spec({ "corner-radius": 1 }).cornerRadius, plain.cornerRadius + 1);
  assert.equal(spec({ "top-corner-radius": 1 }).topCornerRadius, plain.topCornerRadius + 1);
  assert.equal(spec({ "side-wall": 3 }).skirt, 3);
  assert.equal(spec({ "stem-height": 1.5 }).stemHeightDelta, 1.5);
  assert.equal(spec({ "top-width": 2 }).topWidth, plain.topWidth + 2);
  assert.equal(spec({ "top-depth": 2 }).topDepth, plain.topDepth + 2);

  // Nothing may drive a dimension negative, however far the slider goes.
  assert.ok(spec({ height: -20 }).height > 0);
  assert.ok(spec({ "dish-depth": -20 }).dish.depth >= 0);
  assert.ok(spec({ "corner-radius": -20 }).cornerRadius > 0);
});

test("height is applied before the taper angles are measured over it", () => {
  // If the order were reversed the taper would be computed against the old
  // height and the top face would come out at the wrong size.
  const plain = spec({});
  const raised = plain.height + 4;
  const both = spec({ height: 4, taper: 5 });
  const implied = Math.atan2((plain.baseWidth - plain.topWidth) / 2, raised);
  const expected = plain.baseWidth - 2 * Math.tan(implied + (5 * Math.PI) / 180) * raised;
  assert.ok(
    Math.abs(both.topWidth - expected) < 1e-9,
    `got ${both.topWidth}, expected ${expected} when measured over the adjusted height`,
  );
});

test("name=value pairs are read, and bad ones refused", () => {
  assert.deepEqual(parseModifiers(["height=+2"]), { height: 2 });
  assert.deepEqual(parseModifiers(["height=2", "taper=-3"]), { height: 2, taper: -3 });
  assert.deepEqual(parseModifiers(["height=1,taper=2"]), { height: 1, taper: 2 });
  assert.deepEqual(parseModifiers([]), {});
  assert.deepEqual(parseModifiers(["  "]), {});

  assert.throws(() => parseModifiers(["height"]), /needs a value/);
  assert.throws(() => parseModifiers(["nope=1"]), /Unknown adjustment "nope"/);
  assert.throws(() => parseModifiers(["height=tall"]), /must be a number/);
  assert.throws(() => validateModifiers({ height: Number.NaN }), /must be a number/);
});

test("an adjusted cap is named and described apart from a stock one", () => {
  const base = { profile: "cherry", row: 3, units: 1, stem: "mx" };
  assert.equal(outputName(base), "cherry_r3_1u_mx");
  assert.equal(outputName({ ...base, modifiers: {} }), "cherry_r3_1u_mx");
  assert.equal(outputName({ ...base, modifiers: { height: 0 } }), "cherry_r3_1u_mx");
  assert.equal(
    outputName({ ...base, modifiers: { height: 2, taper: -3 } }),
    "cherry_r3_1u_mx_height+2_taper-3",
  );
  // Registry order, not the order they were given, so a name is stable.
  assert.equal(
    outputName({ ...base, modifiers: { taper: -3, height: 2 } }),
    "cherry_r3_1u_mx_height+2_taper-3",
  );
  assert.equal(modifierToken({}), "");
  assert.equal(describeModifiers({}), "none");
  assert.equal(describeModifiers({ height: 2, taper: -3 }), "height +2 mm, taper -3 deg");
});

test("every adjustment builds a valid cap at both ends of its range", async () => {
  await applyQuality("draft");
  // Four profiles that between them bracket the catalogue: the tallest, a
  // middling sculpted one, a flat uniform one and the shortest there is. A
  // range that survives all four on a 1u cap is safe to put on a slider.
  const cases = [
    { profile: "sa", stem: "mx", row: 1 },
    { profile: "cherry", stem: "mx", row: 3 },
    { profile: "dsa", stem: "alps", row: 3 },
    { profile: "choc", stem: "choc-v2", row: 3 },
  ];
  for (const modifier of MODIFIERS) {
    for (const delta of [modifier.min, modifier.max]) {
      if (delta === 0) continue;
      for (const { profile, stem, row } of cases) {
        const { solid, stats } = await buildKeycap({
          profile,
          row,
          units: 1,
          stem,
          quality: "draft",
          modifiers: { [modifier.id]: delta },
        });
        const label = `${profile} ${stem}: ${modifier.id} at ${delta}`;
        assert.equal(solid.status(), "NoError", label);
        assert.equal(solid.decompose().length, 1, `${label} is not one solid`);
        assert.equal(solid.genus(), 0, `${label} genus`);
        assert.ok(stats.volume > 0, label);
        solid.delete();
      }
    }
  }
});

test("shrinking a cap past its stems is refused, naming the adjustment", async () => {
  await applyQuality("draft");
  // A 2u cap carries stabiliser stems out near its edges, so pulling the top
  // plate in far enough leaves them nowhere to stand. That is a real conflict
  // and not something to clamp away silently: it has to say so, and say which
  // setting to back off.
  await assert.rejects(
    buildKeycap({
      profile: "dsa",
      row: 3,
      units: 2,
      stem: "alps",
      quality: "draft",
      modifiers: { "top-width": -6 },
    }),
    (error) => {
      assert.match(error.message, /stabilizer stem/);
      assert.match(error.message, /Adjustments in force: top-width -6 mm/);
      return true;
    },
  );
  // The same cap unadjusted is fine, so the refusal is about the adjustment.
  const { solid } = await buildKeycap({
    profile: "dsa",
    row: 3,
    units: 2,
    stem: "alps",
    quality: "draft",
  });
  assert.equal(solid.genus(), 0);
  solid.delete();
});

test("a short profile stops shrinking before it runs out of roof", async () => {
  // Choc is 5 mm tall, so the full -6 mm of cap height would leave nothing at
  // all. The floor is the roof plus the dish, which keeps one slider setting
  // meaningful across profiles of very different heights.
  const flattened = resolveSpec("choc", 3, 1, { modifiers: { height: -6 } });
  assert.ok(flattened.height > flattened.topThickness + flattened.dish.depth);
  assert.ok(flattened.height < resolveSpec("choc", 3, 1, {}).height);
  // A tall profile has the room, so it takes the whole delta.
  const tall = resolveSpec("sa", 1, 1, {});
  assert.ok(
    Math.abs(resolveSpec("sa", 1, 1, { modifiers: { height: -6 } }).height - (tall.height - 6)) <
      1e-9,
  );
  // Dishing deeper stops at the roof for the same reason.
  const scooped = resolveSpec("choc", 3, 1, { modifiers: { "dish-depth": 4 } });
  assert.ok(scooped.dish.depth < scooped.height - scooped.topThickness);
});

test("a side wall keeps the base footprint up to its own height", async () => {
  await applyQuality("standard");
  const { Manifold } = await getEngine();
  const skirt = 4;
  const { solid, spec: built } = await buildKeycap({
    profile: "cherry",
    row: 3,
    units: 1,
    stem: "none",
    quality: "standard",
    modifiers: { "side-wall": skirt },
  });

  // Slice just below the top of the skirt and just above it: the lower slice
  // must still be the full base footprint, the upper one must have started to
  // pull in.
  const widthAt = (z) => {
    const slab = Manifold.cube([60, 60, 0.2], true).translate([0, 0, z]);
    const box = solid.intersect(slab).boundingBox();
    return box.max[0] - box.min[0];
  };
  const low = widthAt(skirt - 0.5);
  const high = widthAt(skirt + 1.5);

  assert.ok(
    Math.abs(low - built.baseWidth) < 0.05,
    `at ${skirt - 0.5} mm the wall should still be ${built.baseWidth} mm wide, got ${low}`,
  );
  assert.ok(high < low - 0.3, `above the skirt the wall should taper, got ${high} vs ${low}`);
  solid.delete();
});

test("adjusting one profile leaves another alone", () => {
  // Deltas are what make an arrangement still readable: every profile keeps its
  // own character, shifted by the same amount.
  const dsa = resolveSpec("dsa", 3, 1, { modifiers: { height: 3 } });
  const sa = resolveSpec("sa", 3, 1, { modifiers: { height: 3 } });
  assert.equal(dsa.height - resolveSpec("dsa", 3, 1).height, 3);
  assert.equal(sa.height - resolveSpec("sa", 3, 1).height, 3);
  assert.ok(sa.height > dsa.height, "SA must still be the taller of the two");
});
