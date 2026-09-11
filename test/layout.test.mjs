import test from "node:test";
import assert from "node:assert/strict";

import { arrangeSlots, axisTicks, pitchFor, swingRadius, AXES, SLOT_GAP } from "../src/viewer/layout.js";
import { mat4 } from "../src/viewer/client-gl.js";

const PROFILE_ORDER = ["dsa", "xda", "cherry", "sa"];
const ROW_ORDER = [1, 2, 3, 4, 5];
const PITCH = { x: 20, y: 25 };

const place = (picks, profileAxis, rowAxis) =>
  arrangeSlots({ picks, profileOrder: PROFILE_ORDER, rowOrder: ROW_ORDER, profileAxis, rowAxis, pitch: PITCH });

const offsetOf = (slots, profile, row) =>
  slots.find((slot) => slot.pick.profile === profile && slot.pick.row === row)?.offset;

test("axes are the screen's: across is world X, up is world Z", () => {
  const picks = [
    { profile: "dsa", row: 3 },
    { profile: "cherry", row: 3 },
  ];
  const across = place(picks, "x", "off");
  assert.equal(across[1].offset[0] - across[0].offset[0], PITCH.x * 2, "two catalogue steps apart");
  assert.ok(across.every((slot) => slot.offset[1] === 0 && slot.offset[2] === 0));

  const up = place(picks, "y", "off");
  assert.equal(up[1].offset[2] - up[0].offset[2], PITCH.y * 2);
  // Nothing may land on world Y: that is the camera's line of sight, where one
  // cap would simply hide behind another.
  assert.ok(up.every((slot) => slot.offset[1] === 0), "world Y must stay clear");
});

test("an arrangement straddles the origin", () => {
  const picks = PROFILE_ORDER.map((profile) => ({ profile, row: 3 }));
  for (const [profileAxis, rowAxis] of [["x", "off"], ["y", "off"], ["x", "y"]]) {
    const slots = place(picks, profileAxis, rowAxis);
    for (const axis of [0, 2]) {
      const values = slots.map((slot) => slot.offset[axis]);
      const centre = (Math.min(...values) + Math.max(...values)) / 2;
      assert.ok(Math.abs(centre) < 1e-9, `${profileAxis}/${rowAxis} axis ${axis} off centre by ${centre}`);
    }
  }
});

test("a profile missing a row leaves the slot empty without shifting its neighbours", () => {
  const picks = [
    { profile: "cherry", row: 1 },
    { profile: "cherry", row: 5 },
    { profile: "sa", row: 1 },
    // SA has no R5 at all, so nothing is placed there.
  ];
  const slots = place(picks, "x", "y");

  assert.equal(slots.length, 3, "no slot is invented for the row SA does not have");
  // Rows still line up across profiles: both R1s share a height.
  assert.equal(offsetOf(slots, "cherry", 1)[2], offsetOf(slots, "sa", 1)[2]);
  // And columns keep their catalogue spacing whatever rows they happen to hold.
  assert.equal(
    offsetOf(slots, "sa", 1)[0] - offsetOf(slots, "cherry", 1)[0],
    PITCH.x,
    "SA follows Cherry by one column",
  );
  assert.notEqual(offsetOf(slots, "cherry", 1)[2], offsetOf(slots, "cherry", 5)[2]);
});

test("both axes on one line groups rows inside profiles", () => {
  const picks = [
    { profile: "cherry", row: 1 },
    { profile: "cherry", row: 2 },
    { profile: "sa", row: 1 },
  ];
  const slots = place(picks, "x", "x");
  const x = (profile, row) => offsetOf(slots, profile, row)[0];

  assert.ok(slots.every((slot) => slot.offset[2] === 0), "one line means no second axis");
  assert.equal(x("cherry", 2) - x("cherry", 1), PITCH.x, "rows step by one inside a profile");
  // Cherry is catalogue index 2 and SA index 3, so a whole row-block apart.
  assert.equal(x("sa", 1) - x("cherry", 1), PITCH.x * ROW_ORDER.length);
});

test("no arrangement puts the single cap at the origin", () => {
  const slots = place([{ profile: "cherry", row: 3 }], "off", "off");
  assert.equal(slots.length, 1);
  assert.deepEqual(slots[0].offset, [0, 0, 0]);
});

test("an unknown axis is refused", () => {
  assert.deepEqual(AXES, ["off", "x", "y"]);
  assert.throws(() => place([], "z", "off"), /profileAxis must be one of/);
  assert.throws(() => place([], "x", "diagonal"), /rowAxis must be one of/);
});

test("pitch clears the largest cap on screen", () => {
  const pitch = pitchFor([
    { width: 18.16, depth: 18.16, height: 7.6 },
    { width: 37.21, depth: 18.16, height: 16.71 },
  ]);
  assert.equal(pitch.x, 37.21 + SLOT_GAP, "the widest cap sets the horizontal step");
  // Vertically the caps stack on screen, so height matters as much as depth.
  assert.equal(pitch.y, 18.16 + SLOT_GAP);
  assert.equal(pitchFor([{ width: 18.16, depth: 18.16, height: 30 }]).y, 30 + SLOT_GAP);
});

test("the swept radius covers every corner of a cap", () => {
  const box = { min: [-9.08, -9.08, 0], max: [9.08, 9.08, 16.71] };
  const radius = swingRadius(box);
  assert.ok(Math.abs(radius - Math.hypot(9.08, 9.08, 16.71)) < 1e-9, "the far top corner is furthest");
  assert.ok(radius > box.max[2], "a tall cap reaches past its own height when it turns");
});

test("a cap's slot does not move, whatever the rotation", () => {
  // This is the whole premise of the mode: the cap turns about its own zero
  // point and is then carried to its slot, so the slot is fixed on screen no
  // matter where the rotation goes.
  const slots = place(
    PROFILE_ORDER.map((profile) => ({ profile, row: 3 })),
    "x",
    "y",
  );
  const rotations = [
    mat4.identity(),
    mat4.rotationZ(0.9),
    mat4.rotationX(-1.2),
    mat4.multiply(mat4.rotationX(0.42), mat4.rotationZ(-0.62)),
  ];

  for (const slot of slots) {
    for (const rotation of rotations) {
      const transform = mat4.multiply(mat4.translation(slot.offset), rotation);
      // Where the cap's own zero point ends up: the last column of the matrix.
      const origin = [transform[12], transform[13], transform[14]];
      assert.deepEqual(
        origin.map((value) => Number(value.toFixed(9))),
        slot.offset.map((value) => Number(value.toFixed(9))),
        `${slot.pick.profile} moved off its slot under rotation`,
      );
    }
  }
});

/* ----------------------------------------------------------- axis labels --- */

const ticksFrom = (picks, profileAxis, rowAxis) =>
  axisTicks({ slots: place(picks, profileAxis, rowAxis), profileAxis, rowAxis });

test("an axis gets one tick per column, wherever that column's caps sit", () => {
  const picks = [
    { profile: "dsa", row: 3 },
    { profile: "cherry", row: 1 },
    { profile: "cherry", row: 3 },
    { profile: "cherry", row: 5 },
    { profile: "sa", row: 1 },
  ];
  const ticks = ticksFrom(picks, "x", "y");

  assert.deepEqual(ticks.profiles.map((tick) => tick.id), ["dsa", "cherry", "sa"]);
  assert.deepEqual(ticks.rows.map((tick) => tick.row), [1, 3, 5]);

  // Cherry appears three times but gets one label, on its column.
  const slots = place(picks, "x", "y");
  const cherryColumn = offsetOf(slots, "cherry", 3)[0];
  assert.equal(ticks.profiles.find((tick) => tick.id === "cherry").coord, cherryColumn);
  // And a row's tick sits on that row's line.
  assert.equal(ticks.rows.find((tick) => tick.row === 1).coord, offsetOf(slots, "cherry", 1)[2]);
});

test("ticks run in the order they appear on screen", () => {
  const ticks = ticksFrom(
    [
      { profile: "sa", row: 3 },
      { profile: "dsa", row: 3 },
      { profile: "cherry", row: 3 },
    ],
    "x",
    "off",
  );
  const coords = ticks.profiles.map((tick) => tick.coord);
  assert.deepEqual([...coords].sort((a, b) => a - b), coords, "ticks must be sorted along the axis");
  assert.deepEqual(ticks.profiles.map((tick) => tick.id), ["dsa", "cherry", "sa"]);
});

test("an axis that is off gets no labels at all", () => {
  const picks = [{ profile: "dsa", row: 3 }, { profile: "cherry", row: 3 }];

  const profilesOnly = ticksFrom(picks, "x", "off");
  assert.equal(profilesOnly.rows.length, 0);
  assert.equal(profilesOnly.rowEdge, null);
  assert.equal(profilesOnly.profileEdge, "bottom");

  const nothing = ticksFrom(picks, "off", "off");
  assert.deepEqual(nothing.profiles, []);
  assert.deepEqual(nothing.rows, []);
  assert.equal(nothing.profileEdge, null);
});

test("the two label sets never share an edge", () => {
  // Perpendicular axes take the natural edge for each.
  const perpendicular = ticksFrom([{ profile: "dsa", row: 3 }], "x", "y");
  assert.equal(perpendicular.profileEdge, "bottom");
  assert.equal(perpendicular.rowEdge, "left");

  const swapped = ticksFrom([{ profile: "dsa", row: 3 }], "y", "x");
  assert.equal(swapped.profileEdge, "left");
  assert.equal(swapped.rowEdge, "bottom");

  // Sharing one axis would put them on top of each other, so rows move across.
  for (const axis of ["x", "y"]) {
    const shared = ticksFrom([{ profile: "dsa", row: 3 }], axis, axis);
    assert.notEqual(shared.rowEdge, shared.profileEdge, `${axis}: labels would collide`);
    assert.equal(shared.rowEdge, axis === "x" ? "top" : "right");
  }
});

test("on one shared line a profile is labelled at the centre of its block", () => {
  const picks = [
    { profile: "cherry", row: 1 },
    { profile: "cherry", row: 2 },
    { profile: "cherry", row: 3 },
    { profile: "sa", row: 1 },
  ];
  const slots = place(picks, "x", "x");
  const ticks = axisTicks({ slots, profileAxis: "x", rowAxis: "x" });

  const cherry = ticks.profiles.find((tick) => tick.id === "cherry");
  const spread = [1, 2, 3].map((row) => offsetOf(slots, "cherry", row)[0]);
  assert.equal(cherry.coord, (Math.min(...spread) + Math.max(...spread)) / 2, "under the group");

  // Each profile block repeats the rows, so a row label belongs to a cap --
  // keying by the number alone would collapse every R1 into one label.
  assert.equal(ticks.rows.length, picks.length);
  assert.deepEqual(ticks.rows.map((tick) => tick.row), [1, 2, 3, 1]);
});
