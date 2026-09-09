import test from "node:test";
import assert from "node:assert/strict";

import {
  STABILIZER_SPANS,
  AUTO,
  NONE,
  stabilizerSpanUnits,
  stabilizerToken,
  resolveSpan,
  stemLayout,
} from "../src/stabilizers.mjs";
import { MOUNT_FAMILIES, SIZES } from "../src/sizes.mjs";
import { buildKeycap, stemFitProblem, cavityHalfExtent } from "../src/keycap.mjs";
import { resolveSpec } from "../src/profiles/index.mjs";
import { getStem } from "../src/stems/index.mjs";
import { getEngine, applyQuality } from "../src/engine.mjs";
import { crossOutline } from "../src/stems/cross.mjs";

/** The spacings a Cherry stabiliser actually uses, in millimetres. */
const CHERRY_SPANS = [
  [2, 23.81],
  [2.25, 23.81],
  [2.75, 23.81],
  [3, 38.1],
  [6, 95.25],
  [6.25, 100.01],
  [6.5, 100.01],
  [7, 114.3],
];

test("MX stabiliser spans reproduce the standard Cherry spacings", () => {
  for (const [units, millimetres] of CHERRY_SPANS) {
    const span = stabilizerSpanUnits(units) * MOUNT_FAMILIES.mx.pitch;
    assert.ok(
      Math.abs(span - millimetres) < 0.02,
      `${units}u should stabilise at ${millimetres} mm, got ${span.toFixed(2)}`,
    );
  }
});

test("keys narrower than 2u ride on a single stem", () => {
  for (const units of [1, 1.25, 1.5, 1.75, 1.99]) {
    assert.equal(stabilizerSpanUnits(units), 0, `${units}u should not be stabilised`);
    assert.equal(stemLayout(units, "mx").length, 1);
  }
});

test("the span table is ordered and read widest-match-wins", () => {
  for (let i = 1; i < STABILIZER_SPANS.length; i += 1) {
    assert.ok(
      STABILIZER_SPANS[i].minUnits > STABILIZER_SPANS[i - 1].minUnits,
      "minUnits must increase",
    );
    assert.ok(
      STABILIZER_SPANS[i].spanUnits > STABILIZER_SPANS[i - 1].spanUnits,
      "wider keys must stabilise wider",
    );
  }
  // A span must always stay inside the key it belongs to.
  for (const units of SIZES) {
    assert.ok(stabilizerSpanUnits(units) < units, `${units}u span exceeds the key`);
  }
});

test("a stabilised layout is symmetric, ordered and centred on the switch", () => {
  for (const units of [2, 2.75, 6.25, 7]) {
    const layout = stemLayout(units, "mx");
    assert.equal(layout.length, 3);
    assert.deepEqual(
      layout.map((position) => position.role),
      ["stabilizer", "switch", "stabilizer"],
    );
    assert.equal(layout[1].x, 0, "the switch sits at the centre");
    assert.equal(layout[0].x, -layout[2].x, "stabilisers must be symmetric");
    assert.ok(layout.every((position) => position.y === 0), "stabilisers sit on the centre line");
    assert.equal(layout[2].x * 2, stabilizerSpanUnits(units) * MOUNT_FAMILIES.mx.pitch);
  }
});

test("Choc spans follow the Choc pitch, not the MX one", () => {
  const chocSpan = stemLayout(2, "choc")[2].x * 2;
  const mxSpan = stemLayout(2, "mx")[2].x * 2;
  assert.equal(chocSpan, 1.25 * MOUNT_FAMILIES.choc.pitch);
  assert.ok(chocSpan < mxSpan, "the Choc pitch is tighter");
  assert.throws(() => stemLayout(2, "topre"), /Unknown mount family/);
});

test("the stabiliser setting accepts auto, none and an explicit span", () => {
  assert.equal(resolveSpan(6.25, AUTO), 5.25);
  assert.equal(resolveSpan(6.25, undefined), 5.25);
  assert.equal(resolveSpan(6.25, NONE), 0);
  assert.equal(resolveSpan(6.25, 2), 2);
  assert.equal(resolveSpan(6.25, 0), 0, "an explicit zero means no stabilisers");
  assert.equal(stemLayout(6.25, "mx", NONE).length, 1);
  assert.equal(stemLayout(6.25, "mx", 2)[2].x * 2, 2 * MOUNT_FAMILIES.mx.pitch);
  assert.throws(() => resolveSpan(2, "wide"), /must be "auto", "none" or a span/);
  assert.throws(() => resolveSpan(2, -1), /must be "auto", "none" or a span/);
});

test("only a deviation from the default marks the filename", () => {
  assert.equal(stabilizerToken(6.25, AUTO), "");
  assert.equal(stabilizerToken(6.25, NONE), "_nostab");
  assert.equal(stabilizerToken(6.25, 2), "_stab2u");
  assert.equal(stabilizerToken(6.25, 5.25), "", "asking for what auto would do is not a deviation");
  assert.equal(stabilizerToken(1, NONE), "", "a 1u key has no stabilisers to suppress");
});

test("the cavity narrows with height, as the loft does", () => {
  const spec = resolveSpec("cherry", 3, 1, { wall: 1.5 });
  const bottom = cavityHalfExtent(spec, 0, 1.5);
  const top = cavityHalfExtent(spec, spec.height, 1.5);
  assert.equal(bottom.x.toFixed(3), ((spec.baseWidth - 3) / 2).toFixed(3));
  assert.equal(top.x.toFixed(3), ((spec.topWidth - 3) / 2).toFixed(3));
  assert.ok(top.x < bottom.x, "the cavity should taper inwards");
  assert.deepEqual(cavityHalfExtent(spec, spec.height * 10, 1.5), top, "height is clamped");
});

test("a stem that would breach the sidewall is reported, not built", () => {
  // A Choc v1 stem is 8.5 mm wide and a 2u Choc cap is small: it does not fit.
  const tight = resolveSpec("choc", 3, 2, { wall: 1.5 });
  const problem = stemFitProblem({
    spec: tight,
    stemSpec: getStem("choc-v1").spec,
    layout: stemLayout(2, "choc"),
  });
  assert.match(problem, /choc-v1 stabilizer stem at x=-11.25 mm would breach the sidewall/);

  // The same cap without stabilisers is fine, and so is the narrower v2 stem.
  assert.equal(
    stemFitProblem({
      spec: tight,
      stemSpec: getStem("choc-v1").spec,
      layout: stemLayout(2, "choc", NONE),
    }),
    null,
  );
  assert.equal(
    stemFitProblem({
      spec: tight,
      stemSpec: getStem("choc-v2").spec,
      layout: stemLayout(2, "choc"),
    }),
    null,
  );
  assert.equal(
    stemFitProblem({ spec: tight, stemSpec: getStem("none").spec, layout: stemLayout(2, "choc") }),
    null,
    "no stem cannot breach anything",
  );
});

test("an absurd span is refused rather than punched through the wall", async () => {
  await assert.rejects(
    () => buildKeycap({ profile: "cherry", row: 3, units: 2, stem: "mx", stabilizers: 6 }),
    /would breach the sidewall/,
  );
});

test("stabiliser posts land exactly where the layout says", async () => {
  await applyQuality("draft");
  const { Manifold } = await getEngine();

  /** Does a cross-shaped void -- a usable slot -- sit at this x? */
  const slotAt = async (cap, x, depth) => {
    const probe = Manifold.extrude(await crossOutline(0.15, -0.01), depth - 1).translate([
      x,
      0,
      0.7,
    ]);
    return cap.intersect(probe).volume() < 1e-6;
  };

  /** Is there post material around this x, rather than open cavity? */
  const postAt = (cap, x, depth) =>
    cap
      .intersect(Manifold.cylinder(depth - 1, 2.7, 2.7, 32).translate([x, 0, 0.5]))
      .volume() > 15;

  for (const [units, mode] of [
    [2, AUTO],
    [2.75, AUTO],
    [6.25, AUTO],
    [7, AUTO],
    [6.25, 3],
  ]) {
    const { solid, stats, layout } = await buildKeycap({
      profile: "cherry",
      row: 3,
      units,
      stem: "mx",
      stabilizers: mode,
      quality: "draft",
    });
    const depth = getStem("mx").spec.height;
    const label = `${units}u ${mode}`;

    for (const position of layout) {
      assert.ok(postAt(solid, position.x, depth), `${label}: no post at x=${position.x.toFixed(2)}`);
      assert.ok(
        await slotAt(solid, position.x, depth),
        `${label}: the post at x=${position.x.toFixed(2)} has no usable slot`,
      );
    }

    // Nothing where the layout does not ask for a stem, including the place
    // the automatic span would have chosen when it has been overridden.
    const decoys = [layout[1].x + 6, ...(mode === 3 ? [stabilizerSpanUnits(units) * 19.05 / 2] : [])];
    for (const x of decoys) {
      assert.ok(!postAt(solid, x, depth), `${label}: unexpected post at x=${x.toFixed(2)}`);
    }

    assert.equal(stats.stems, layout.length);
    assert.equal(
      stats.stemSpan.toFixed(3),
      (layout.at(-1).x - layout[0].x).toFixed(3),
      `${label}: reported span does not match the layout`,
    );
    assert.equal(solid.decompose().length, 1, `${label}: posts are not bonded to the cap`);
    assert.equal(solid.genus(), 0);

    // Stems must never push the cap past its own footprint.
    const box = solid.boundingBox();
    const spec = resolveSpec("cherry", 3, units);
    assert.ok(
      box.max[0] - box.min[0] <= spec.baseWidth + 0.01,
      `${label}: a stem broke out through the sidewall`,
    );
    solid.delete();
  }
});

test("stabilisers add material without changing the outside of the cap", async () => {
  await applyQuality("draft");
  for (const units of [2, 6.25]) {
    const options = { profile: "cherry", row: 3, units, stem: "mx", quality: "draft" };
    const stabilised = await buildKeycap(options);
    const plain = await buildKeycap({ ...options, stabilizers: NONE });

    assert.ok(stabilised.stats.volume > plain.stats.volume, `${units}u: stabilisers add material`);
    assert.equal(stabilised.stats.stems, 3);
    assert.equal(plain.stats.stems, 1);
    assert.equal(plain.stats.stemSpan, 0);
    for (const axis of ["width", "depth", "height"]) {
      assert.equal(
        stabilised.stats[axis].toFixed(3),
        plain.stats[axis].toFixed(3),
        `${units}u: ${axis} changed`,
      );
    }
    stabilised.solid.delete();
    plain.solid.delete();
  }
});

test("every stem type stabilises a wide key it fits", async () => {
  await applyQuality("draft");
  for (const [profile, stem] of [
    ["cherry", "mx"],
    ["cherry", "box"],
    ["cherry", "alps"],
    ["choc", "choc-v2"],
    ["dsa", "none"],
  ]) {
    const { solid, stats } = await buildKeycap({
      profile,
      row: 3,
      units: 6.25,
      stem,
      quality: "draft",
    });
    const expected = stem === "none" ? 0 : 3;
    assert.equal(stats.stems, expected, `${profile} + ${stem}`);
    assert.equal(solid.decompose().length, 1, `${profile} + ${stem} is not one solid`);
    solid.delete();
  }
});
