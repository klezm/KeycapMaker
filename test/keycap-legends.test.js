import test from "node:test";
import assert from "node:assert/strict";
import { KEYCAP_LEGEND_SLOTS, resolveKeycapLegends } from "../tools/keyboard-layouts/lib/keycap-legends.js";

const KEYSYMS = {
  q: { char: "q" },
  Q: { char: "Q" },
  at: { char: "@" },
  Greek_OMEGA: { char: "Ω" },
  1: { char: "1" },
  exclam: { char: "!" },
  onesuperior: { char: "¹" },
  exclamdown: { char: "¡" },
  e: { char: "e" },
  E: { char: "E" },
  EuroSign: { char: "€" },
  dead_circumflex: { char: "^", dead: true },
  degree: { char: "°" },
  BackSpace: { label: "Backspace" },
  Terminate_Server: { label: "Terminate" },
  space: { label: "Space" },
};

function levels(...keysyms) {
  const names = ["Base", "Shift", "AltGr", "Shift AltGr"];
  return { levels: keysyms.map((keysym, offset) => ({ level: offset + 1, keysym, modifierName: names[offset] })) };
}

test("the five keycap slots match the editor legend fields", () => {
  assert.deepEqual(KEYCAP_LEGEND_SLOTS, [
    "legend",
    "topLegendLeftTop",
    "topLegendRightTop",
    "topLegendLeftBottom",
    "topLegendRightBottom",
  ]);
});

test("a cased key collapses to a single centred capital", () => {
  const legends = resolveKeycapLegends(levels("q", "Q", "at", "Greek_OMEGA"), KEYSYMS, null);

  assert.equal(legends.legend.text, "Q");
  assert.equal(legends.topLegendRightBottom.text, "@");
  assert.equal(legends.topLegendRightTop.text, "Ω");
  assert.ok(!Object.hasOwn(legends, "topLegendLeftBottom"));
  assert.ok(!Object.hasOwn(legends, "topLegendLeftTop"));
});

test("an uncased key fills the four corners in modifier order", () => {
  const legends = resolveKeycapLegends(levels("1", "exclam", "onesuperior", "exclamdown"), KEYSYMS, null);

  assert.equal(legends.topLegendLeftBottom.text, "1");
  assert.equal(legends.topLegendLeftTop.text, "!");
  assert.equal(legends.topLegendRightBottom.text, "¹");
  assert.equal(legends.topLegendRightTop.text, "¡");
  assert.ok(!Object.hasOwn(legends, "legend"));
});

test("each slot records the level and modifier it came from", () => {
  const legends = resolveKeycapLegends(levels("1", "exclam", "onesuperior", "exclamdown"), KEYSYMS, null);

  assert.equal(legends.topLegendRightBottom.level, 3);
  assert.equal(legends.topLegendRightBottom.modifier, "AltGr");
  assert.equal(legends.topLegendRightBottom.keysym, "onesuperior");
});

test("a repeated legend is printed only once", () => {
  const legends = resolveKeycapLegends(levels("e", "E", "EuroSign", "EuroSign"), KEYSYMS, null);

  assert.equal(legends.legend.text, "E");
  assert.equal(legends.topLegendRightBottom.text, "€");
  assert.ok(!Object.hasOwn(legends, "topLegendRightTop"));
});

test("dead keys print their spacing glyph and stay flagged", () => {
  const legends = resolveKeycapLegends(levels("dead_circumflex", "degree"), KEYSYMS, null);

  assert.equal(legends.topLegendLeftBottom.text, "^");
  assert.equal(legends.topLegendLeftBottom.dead, true);
  assert.equal(legends.topLegendLeftTop.text, "°");
});

test("a named key is centred and hides its other levels", () => {
  const legends = resolveKeycapLegends(levels("BackSpace", "Terminate_Server"), KEYSYMS, null);

  assert.deepEqual(Object.keys(legends), ["legend"]);
  assert.equal(legends.legend.text, "Backspace");
});

test("a key with no symbols falls back to the board label", () => {
  const legends = resolveKeycapLegends({ levels: [] }, KEYSYMS, "Esc");

  assert.equal(legends.legend.text, "Esc");
  assert.equal(legends.legend.keysym, null);
});

test("a key with no symbols and no fallback yields no legends", () => {
  assert.deepEqual(resolveKeycapLegends({ levels: [] }, KEYSYMS, null), {});
});

test("unknown keysyms are skipped rather than printed raw", () => {
  const legends = resolveKeycapLegends(levels("q", "Q", "MysteryKeysym"), KEYSYMS, null);

  assert.equal(legends.legend.text, "Q");
  assert.ok(!Object.hasOwn(legends, "topLegendRightBottom"));
});
