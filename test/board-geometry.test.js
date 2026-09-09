import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FORM_FACTORS } from "../tools/keyboard-layouts/lib/form-factor.js";
import { parseBoardGeometry } from "../tools/keyboard-layouts/keyboard-layout-catalog.js";

const BOARD_DIRECTORY = "tools/keyboard-layouts/boards";
const CLUSTERS = new Set(["main", "function", "navigation", "numpad"]);
const REQUIRED_KEYCODES = [
  "ESC", "TLDE", "AE01", "AE12", "TAB", "AD01", "AD12", "CAPS", "AC01", "AC11",
  "RTRN", "LFSH", "AB01", "AB10", "RTSH", "LCTL", "LALT", "SPCE", "RALT", "RCTL",
  "BKSP", "FK01", "FK12", "UP", "DOWN", "LEFT", "RGHT", "KP0", "KP9", "KPEN",
];

function loadBoard(formFactor) {
  return parseBoardGeometry(
    JSON.parse(fs.readFileSync(path.join(BOARD_DIRECTORY, formFactor.boardFile), "utf8")),
  );
}

function rectanglesOf(board) {
  return board.keys.flatMap((key) => {
    const rectangles = [{ keycode: key.keycode, x: key.x, y: key.y, width: key.width, height: key.height }];
    if (key.secondaryRect !== undefined) {
      rectangles.push({ keycode: `${key.keycode}(2)`, ...key.secondaryRect });
    }
    return rectangles;
  });
}

for (const formFactor of FORM_FACTORS) {
  test(`${formFactor.id} board has exactly ${formFactor.keyCount} keys`, () => {
    const board = loadBoard(formFactor);

    assert.equal(board.id, formFactor.id);
    assert.equal(board.keyCount, formFactor.keyCount);
    assert.equal(board.keys.length, formFactor.keyCount);
  });

  test(`${formFactor.id} board has unique keycodes in known clusters`, () => {
    const board = loadBoard(formFactor);
    const keycodes = board.keys.map((key) => key.keycode);

    assert.equal(new Set(keycodes).size, keycodes.length);
    for (const key of board.keys) {
      assert.ok(CLUSTERS.has(key.cluster), `${key.keycode} has unknown cluster ${key.cluster}`);
      assert.match(key.keycode, /^[A-Z0-9]+$/);
      assert.ok(key.width > 0 && key.height > 0);
    }
  });

  test(`${formFactor.id} board keys never overlap`, () => {
    const rectangles = rectanglesOf(loadBoard(formFactor));

    for (let left = 0; left < rectangles.length; left += 1) {
      for (let right = left + 1; right < rectangles.length; right += 1) {
        const a = rectangles[left];
        const b = rectangles[right];
        const overlapsX = a.x < b.x + b.width && b.x < a.x + a.width;
        const overlapsY = a.y < b.y + b.height && b.y < a.y + a.height;
        assert.ok(!(overlapsX && overlapsY), `${a.keycode} overlaps ${b.keycode}`);
      }
    }
  });

  test(`${formFactor.id} board contains every key a full-size board needs`, () => {
    const keycodes = new Set(loadBoard(formFactor).keys.map((key) => key.keycode));

    for (const keycode of REQUIRED_KEYCODES) {
      assert.ok(keycodes.has(keycode), `${formFactor.id} is missing ${keycode}`);
    }
  });
}

test("only ISO, JIS and ABNT boards carry the extra key left of Z", () => {
  const withLsgt = FORM_FACTORS.filter((formFactor) =>
    loadBoard(formFactor).keys.some((key) => key.keycode === "LSGT"),
  ).map((formFactor) => formFactor.id);

  assert.deepEqual(withLsgt.sort(), ["abnt", "iso"]);
});

test("JIS is the only board with a yen key and kana modifiers", () => {
  for (const formFactor of FORM_FACTORS) {
    const keycodes = new Set(loadBoard(formFactor).keys.map((key) => key.keycode));
    const expected = formFactor.id === "jis";

    assert.equal(keycodes.has("AE13"), expected);
    assert.equal(keycodes.has("HKTG"), expected);
    assert.equal(keycodes.has("MUHE"), expected);
    assert.equal(keycodes.has("HENK"), expected);
  }
});

test("ISO, JIS and ABNT use an L-shaped Enter with two rectangles", () => {
  for (const formFactor of FORM_FACTORS) {
    const enter = loadBoard(formFactor).keys.find((key) => key.keycode === "RTRN");

    if (formFactor.id === "ansi") {
      assert.equal(enter.shape, undefined);
      assert.equal(enter.secondaryRect, undefined);
      assert.equal(enter.width, 2.25);
      continue;
    }
    assert.ok(enter.shape === "iso-enter" || enter.shape === "jis-enter");
    assert.ok(enter.secondaryRect !== undefined);
  }
});
