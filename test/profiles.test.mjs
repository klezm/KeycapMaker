import test from "node:test";
import assert from "node:assert/strict";

import { PROFILES, getProfile, profileIds, resolveSpec } from "../src/profiles/index.mjs";
import { footprint, SIZES } from "../src/sizes.mjs";

test("every profile declares a usable dimension set", () => {
  assert.ok(PROFILES.length >= 12, "expected the full profile catalogue");
  assert.equal(new Set(profileIds()).size, PROFILES.length, "profile ids must be unique");

  for (const profile of PROFILES) {
    assert.ok(profile.rows.length > 0, `${profile.id} declares no rows`);
    assert.ok(profile.homeHeight > 0, `${profile.id} has a non-positive height`);
    assert.ok(profile.notes, `${profile.id} is missing its provenance note`);
    assert.ok(
      ["spherical", "cylindrical", "flat"].includes(profile.dish.type),
      `${profile.id} has an unknown dish type`,
    );
    assert.ok(profile.sculpted === false || profile.sculptScale > 0, `${profile.id} sculptScale`);
  }
});

test("every declared row resolves to a sane spec", () => {
  for (const profile of PROFILES) {
    for (const row of profile.rows) {
      const spec = resolveSpec(profile.id, row, 1);
      assert.ok(spec.height > 0, `${profile.id} R${row} height`);
      assert.ok(spec.topWidth > 0 && spec.topDepth > 0, `${profile.id} R${row} top plate`);
      assert.ok(
        spec.topWidth < spec.baseWidth,
        `${profile.id} R${row} top plate is not narrower than the base`,
      );
      assert.ok(
        spec.topDepth < spec.baseDepth,
        `${profile.id} R${row} top plate is not shallower than the base`,
      );
      assert.ok(spec.topThickness < spec.height, `${profile.id} R${row} roof is thicker than the cap`);
    }
  }
});

test("sculpted profiles bowl around the home row", () => {
  for (const profile of PROFILES.filter((entry) => entry.sculpted)) {
    const heightOf = (row) => resolveSpec(profile.id, row, 1).height;
    const home = heightOf(3);
    for (const row of profile.rows.filter((entry) => entry !== 3)) {
      assert.ok(
        heightOf(row) > home,
        `${profile.id} R${row} (${heightOf(row)}) should sit above the home row (${home})`,
      );
    }
    // Rows above the home row lean towards the user, rows below lean away.
    assert.ok(resolveSpec(profile.id, 1, 1).tilt < 0, `${profile.id} R1 should tilt back`);
    assert.ok(
      resolveSpec(profile.id, profile.rows.at(-1), 1).tilt > 0,
      `${profile.id} top row should tilt towards the user`,
    );
  }
});

test("uniform profiles ignore the row", () => {
  for (const profile of PROFILES.filter((entry) => !entry.sculpted)) {
    const specs = profile.rows.map((row) => resolveSpec(profile.id, row, 1));
    for (const spec of specs) {
      assert.equal(spec.height, specs[0].height, `${profile.id} height varies by row`);
      assert.equal(spec.tilt, 0, `${profile.id} should not tilt`);
    }
  }
});

test("width grows by one switch pitch per extra unit", () => {
  const single = footprint(1, "mx");
  const double = footprint(2, "mx");
  assert.equal(Number((double.width - single.width).toFixed(3)), 19.05);
  assert.equal(double.depth, single.depth);

  const choc = footprint(1, "choc");
  assert.ok(choc.width < single.width && choc.depth < single.depth, "choc caps are smaller");
});

test("extra width lands on the top plate, keeping the sidewall taper", () => {
  for (const units of SIZES) {
    const one = resolveSpec("dsa", 3, 1);
    const wide = resolveSpec("dsa", 3, units);
    assert.equal(
      Number((wide.baseWidth - wide.topWidth).toFixed(6)),
      Number((one.baseWidth - one.topWidth).toFixed(6)),
      `${units}u taper drifted from 1u`,
    );
  }
});

test("unknown profiles, rows and sizes are rejected with a useful message", () => {
  assert.throws(() => getProfile("nope"), /Unknown profile "nope"/);
  assert.throws(() => resolveSpec("sa", 5, 1), /has no row 5/);
  assert.throws(() => resolveSpec("dsa", 3, 0), /must be positive/);
});
