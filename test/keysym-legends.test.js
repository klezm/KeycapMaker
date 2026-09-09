import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createKeysymTable, parseKeysymHeader, resolveKeysymEntry } from "../tools/keyboard-layouts/lib/xkb-keysym-table.js";
import { isEmptyKeysym, resolveVendorKeyLabel } from "../tools/keyboard-layouts/lib/keysym-legends.js";

const HEADER_SOURCE = fs.readFileSync("test/fixtures/keysymdef.h", "utf8");
const HEADER = parseKeysymHeader(HEADER_SOURCE);

function resolve(name) {
  return resolveKeysymEntry(name, HEADER);
}

test("keysyms with an explicit unicode comment resolve to that character", () => {
  assert.equal(resolve("adiaeresis").char, "ä");
  assert.equal(resolve("EuroSign").char, "€");
  assert.equal(resolve("Greek_OMEGA").char, "Ω");
});

test("deprecated parenthesised unicode comments still resolve", () => {
  assert.equal(resolve("topleftradical").char, "┌");
});

test("latin-1 range keysyms resolve from their numeric value", () => {
  assert.equal(resolve("ssharp").char, "ß");
  assert.equal(resolve("question").char, "?");
});

test("literal unicode keysyms resolve, including short forms", () => {
  assert.equal(resolve("U1E9E").char, "ẞ");
  assert.equal(resolve("U402").char, "Ђ");
});

test("hexadecimal unicode keysyms resolve through the 0x01000000 mask", () => {
  assert.equal(resolve("0x1002032").char, "′");
});

test("dead keys resolve to their spacing glyph and are flagged", () => {
  const circumflex = resolve("dead_circumflex");

  assert.equal(circumflex.char, "^");
  assert.equal(circumflex.dead, true);
  assert.equal(resolve("dead_acute").char, "´");
});

test("named keys resolve to a printable label rather than a character", () => {
  assert.deepEqual(resolve("Return"), { char: null, label: "Enter" });
  assert.deepEqual(resolve("ISO_Level3_Shift"), { char: null, label: "AltGr" });
});

test("keypad keysyms resolve to the glyph printed on the cap", () => {
  assert.equal(resolve("KP_1").char, "1");
  assert.equal(resolve("KP_Add").char, "+");
  assert.equal(resolve("KP_Home").label, "Home");
});

test("vendor keysyms fall back to a readable label", () => {
  assert.equal(resolveVendorKeyLabel("XF8610ChannelsUp"), "10 Channels Up");
  assert.equal(resolve("XF86AudioMute").label, "Mute");
});

test("empty keysyms are recognised in every spelling", () => {
  assert.equal(isEmptyKeysym("NoSymbol"), true);
  assert.equal(isEmptyKeysym("noSymbol"), true);
  assert.equal(isEmptyKeysym("VoidSymbol"), true);
  assert.equal(isEmptyKeysym("none"), true);
  assert.equal(isEmptyKeysym("q"), false);
});

test("the keysym table skips empty keysyms and reports unmapped ones", () => {
  const { table, unmapped } = createKeysymTable(HEADER_SOURCE, new Set(["q", "NoSymbol", "Return", "TotallyUnknown"]));

  assert.deepEqual(table.q, { char: "q" });
  assert.deepEqual(table.Return, { label: "Enter" });
  assert.ok(!Object.hasOwn(table, "NoSymbol"));
  assert.deepEqual(unmapped, ["TotallyUnknown"]);
});
