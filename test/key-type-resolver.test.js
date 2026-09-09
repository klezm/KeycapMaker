import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createKeyLevelResolver, inferKeyType, isCasePair, MAX_KEYCAP_LEVELS, resolveKeyTypeName } from "../tools/keyboard-layouts/lib/key-type-resolver.js";
import { loadKeyTypes, parseTypesSource } from "../tools/keyboard-layouts/lib/xkb-types-parser.js";
import { parseKeysymHeader, resolveKeysymEntry } from "../tools/keyboard-layouts/lib/xkb-keysym-table.js";

const HEADER = parseKeysymHeader(fs.readFileSync("test/fixtures/keysymdef.h", "utf8"));
const resolveCharacter = (keysym) => resolveKeysymEntry(keysym, HEADER).char;
const KEY_TYPES = loadKeyTypes("test/fixtures/xkb");

test("key types carry the level names that belong on a keycap", () => {
  const fourLevel = KEY_TYPES.get("FOUR_LEVEL");

  assert.deepEqual(
    fourLevel.levels.map((level) => level.name),
    ["Base", "Shift", "AltGr", "Shift AltGr"],
  );
  assert.equal(fourLevel.levels[2].modifiers, "LevelThree");
});

test("the simplest modifier combination wins when several map to one level", () => {
  const types = parseTypesSource(`xkb_types "x" {
    type "ALPHABETIC" { modifiers = Shift + Lock;
      map[Lock] = Level2; map[Shift] = Level2;
      level_name[Level1] = "Base"; level_name[Level2] = "Caps"; };
  };`);

  assert.equal(types.get("ALPHABETIC").levels[1].modifiers, "Shift");
});

test("case pairs are detected across scripts", () => {
  assert.equal(isCasePair("q", "Q"), true);
  assert.equal(isCasePair("ä", "Ä"), true);
  assert.equal(isCasePair("1", "!"), false);
  assert.equal(isCasePair("q", "q"), false);
  assert.equal(isCasePair(null, "Q"), false);
});

test("implicit key types are inferred from level count and casing", () => {
  assert.equal(inferKeyType(["space"], resolveCharacter), "ONE_LEVEL");
  assert.equal(inferKeyType(["q", "Q"], resolveCharacter), "ALPHABETIC");
  assert.equal(inferKeyType(["1", "exclam"], resolveCharacter), "TWO_LEVEL");
  assert.equal(inferKeyType(["q", "Q", "at", "Greek_OMEGA"], resolveCharacter), "FOUR_LEVEL_SEMIALPHABETIC");
  assert.equal(inferKeyType(["a", "A", "adiaeresis", "Adiaeresis"], resolveCharacter), "FOUR_LEVEL_ALPHABETIC");
  assert.equal(inferKeyType(["1", "exclam", "at", "backslash"], resolveCharacter), "FOUR_LEVEL");
});

test("trailing empty levels do not change the inferred type", () => {
  assert.equal(inferKeyType(["q", "Q", "NoSymbol", "NoSymbol"], resolveCharacter), "ALPHABETIC");
});

test("an explicit type beats the section default, which beats inference", () => {
  assert.deepEqual(
    resolveKeyTypeName({ levels: ["q", "Q"], explicitType: "FOUR_LEVEL", typeDefault: "TWO_LEVEL" }, resolveCharacter),
    { typeName: "FOUR_LEVEL", source: "explicit" },
  );
  assert.deepEqual(
    resolveKeyTypeName({ levels: ["q", "Q"], explicitType: null, typeDefault: "TWO_LEVEL" }, resolveCharacter),
    { typeName: "TWO_LEVEL", source: "section" },
  );
  assert.deepEqual(
    resolveKeyTypeName({ levels: ["q", "Q"], explicitType: null, typeDefault: null }, resolveCharacter),
    { typeName: "ALPHABETIC", source: "inferred" },
  );
});

test("levels are labelled with the modifier that produces them", () => {
  const resolveKey = createKeyLevelResolver(KEY_TYPES, resolveCharacter);
  const resolved = resolveKey({ levels: ["q", "Q", "at", "Greek_OMEGA"], explicitType: null, typeDefault: null });

  assert.deepEqual(
    resolved.levels.map((level) => level.modifierName),
    ["Base", "Shift", "AltGr", "Shift AltGr"],
  );
  assert.equal(resolved.truncatedLevels, false);
});

test("keys with more than four levels are truncated and flagged", () => {
  const resolveKey = createKeyLevelResolver(KEY_TYPES, resolveCharacter);
  const resolved = resolveKey({
    levels: ["ssharp", "question", "backslash", "questiondown", "U1E9E"],
    explicitType: "FOUR_LEVEL_PLUS_LOCK",
    typeDefault: null,
  });

  assert.equal(resolved.levels.length, MAX_KEYCAP_LEVELS);
  assert.equal(resolved.truncatedLevels, true);
  assert.equal(resolved.totalLevels, 5);
});
