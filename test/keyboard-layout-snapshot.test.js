import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FORM_FACTORS } from "../tools/keyboard-layouts/lib/form-factor.js";
import {
  createLayoutCatalog,
  parseKeyTypeTable,
  parseKeysymTable,
  parseLayoutCatalog,
  parseLayoutKeymap,
} from "../tools/keyboard-layouts/keyboard-layout-catalog.js";

const DATA_DIRECTORY = "tools/keyboard-layouts/data";
const BOARD_DIRECTORY = "tools/keyboard-layouts/boards";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const catalog = parseLayoutCatalog(readJson(path.join(DATA_DIRECTORY, "catalog.json")));
const keysyms = parseKeysymTable(readJson(path.join(DATA_DIRECTORY, "keysyms.json")));
const keyTypes = parseKeyTypeTable(readJson(path.join(DATA_DIRECTORY, "key-types.json")));

function createSnapshotCatalog() {
  return createLayoutCatalog(
    catalog,
    { keysyms, keyTypes },
    {
      loadKeymap: async (layoutName) => readJson(path.join(DATA_DIRECTORY, "keymaps", `${layoutName}.json`)),
      loadBoard: async (formFactorId) => {
        const definition = FORM_FACTORS.find((formFactor) => formFactor.id === formFactorId);
        return readJson(path.join(BOARD_DIRECTORY, definition.boardFile));
      },
    },
  );
}

test("the committed catalog counts match its own arrays", () => {
  assert.equal(catalog.counts.layouts, catalog.layouts.length);
  assert.equal(catalog.counts.languages, catalog.languages.length);
  assert.equal(catalog.counts.countries, catalog.countries.length);
  assert.equal(catalog.counts.models, catalog.models.length);
  assert.equal(catalog.counts.optionGroups, catalog.optionGroups.length);
  assert.equal(
    catalog.counts.variants,
    catalog.layouts.reduce((total, layout) => total + layout.variants.length, 0),
  );
  assert.equal(catalog.counts.keysyms, Object.keys(keysyms.keysyms).length);
});

test("the catalog covers the layouts a keycap set is usually printed for", () => {
  const names = new Set(catalog.layouts.map((layout) => layout.name));

  for (const name of ["us", "de", "fr", "gb", "jp", "br", "es", "it", "ru", "se"]) {
    assert.ok(names.has(name), `catalog is missing layout ${name}`);
  }
  assert.ok(catalog.layouts.length > 90);
});

test("every layout references a keymap file that exists and parses", () => {
  for (const layout of catalog.layouts) {
    const keymapPath = path.join(DATA_DIRECTORY, layout.keymapFile);
    assert.ok(fs.existsSync(keymapPath), `missing ${layout.keymapFile}`);
    const keymap = parseLayoutKeymap(readJson(keymapPath));
    assert.equal(keymap.layout, layout.name);
    assert.ok(Object.hasOwn(keymap.variants, ""), `${layout.name} has no base variant`);
  }
});

test("every layout and variant names a known form factor", () => {
  const ids = new Set(FORM_FACTORS.map((formFactor) => formFactor.id));

  for (const layout of catalog.layouts) {
    assert.ok(ids.has(layout.formFactor), `${layout.name} has form factor ${layout.formFactor}`);
    for (const variant of layout.variants) {
      assert.ok(ids.has(variant.formFactor), `${layout.name}:${variant.name} has ${variant.formFactor}`);
    }
  }
});

test("every keysym referenced by a keymap is present in the shared table", () => {
  const known = new Set(Object.keys(keysyms.keysyms));
  const unmapped = new Set(catalog.unmappedKeysyms);
  const empty = new Set(["NoSymbol", "noSymbol", "VoidSymbol", "voidSymbol", "any", "none", "None"]);

  for (const layout of catalog.layouts) {
    const keymap = readJson(path.join(DATA_DIRECTORY, layout.keymapFile));
    for (const variant of Object.values(keymap.variants)) {
      for (const key of Object.values(variant.keys)) {
        for (const keysym of key.levels) {
          assert.ok(
            known.has(keysym) || unmapped.has(keysym) || empty.has(keysym),
            `${layout.name} uses unknown keysym ${keysym}`,
          );
        }
      }
    }
  }
});

test("every key type used by a keymap is defined in the shared type table", () => {
  const known = new Set(Object.keys(keyTypes.types));

  for (const layout of catalog.layouts) {
    const keymap = readJson(path.join(DATA_DIRECTORY, layout.keymapFile));
    for (const variant of Object.values(keymap.variants)) {
      for (const key of Object.values(variant.keys)) {
        assert.ok(known.has(key.type), `${layout.name} uses unknown key type ${key.type}`);
      }
    }
  }
});

test("German prints its ISO board with Shift and AltGr legends", async () => {
  const board = await createSnapshotCatalog().resolveBoard("de", "");

  assert.equal(board.formFactor, "iso");
  assert.equal(board.keyCount, 105);
  assert.equal(board.level3Switch, "RALT");

  const z = board.keys.find((key) => key.keycode === "AD06");
  assert.equal(z.legends.legend.text, "Z", "German is QWERTZ");

  const y = board.keys.find((key) => key.keycode === "AB01");
  assert.equal(y.legends.legend.text, "Y");

  const sharpS = board.keys.find((key) => key.keycode === "AE11");
  assert.equal(sharpS.legends.topLegendLeftBottom.text, "ß");
  assert.equal(sharpS.legends.topLegendLeftTop.text, "?");
  assert.equal(sharpS.legends.topLegendRightBottom.text, "\\");

  const euro = board.keys.find((key) => key.keycode === "AD03");
  assert.equal(euro.legends.legend.text, "E");
  assert.equal(euro.legends.topLegendRightBottom.text, "€");
  assert.equal(euro.legends.topLegendRightBottom.modifier, "AltGr");

  assert.equal(board.keys.find((key) => key.keycode === "RTRN").shape, "iso-enter");
  assert.ok(board.keys.some((key) => key.keycode === "LSGT"));
});

test("US prints an ANSI board with no extra key and a wide Enter", async () => {
  const board = await createSnapshotCatalog().resolveBoard("us", "");

  assert.equal(board.formFactor, "ansi");
  assert.equal(board.keyCount, 104);
  assert.ok(!board.keys.some((key) => key.keycode === "LSGT"));
  assert.equal(board.keys.find((key) => key.keycode === "RTRN").width, 2.25);
  assert.equal(board.keys.find((key) => key.keycode === "AD06").legends.legend.text, "Y");
});

test("Japanese prints a JIS board with kana keys and a yen key", async () => {
  const board = await createSnapshotCatalog().resolveBoard("jp", "");

  assert.equal(board.formFactor, "jis");
  assert.equal(board.keyCount, 109);
  assert.equal(board.keys.find((key) => key.keycode === "RTRN").shape, "jis-enter");
  assert.equal(board.keys.find((key) => key.keycode === "MUHE").legends.legend.text, "無変換");
  assert.equal(board.keys.find((key) => key.keycode === "HENK").legends.legend.text, "変換");
  assert.equal(board.keys.find((key) => key.keycode === "TLDE").legends.legend.text, "半角/全角");
});

test("Brazilian prints an ABNT board with the extra key right of the period", async () => {
  const board = await createSnapshotCatalog().resolveBoard("br", "");

  assert.equal(board.formFactor, "abnt");
  assert.equal(board.keyCount, 106);
  assert.ok(board.keys.some((key) => key.keycode === "AB11"));
  assert.ok(board.keys.some((key) => key.keycode === "LSGT"));
});

test("a variant changes the legends without changing the board", async () => {
  const snapshot = createSnapshotCatalog();
  const base = await snapshot.resolveBoard("de", "");
  const noDeadKeys = await snapshot.resolveBoard("de", "nodeadkeys");

  assert.equal(base.keyCount, noDeadKeys.keyCount);
  assert.equal(base.keys.find((key) => key.keycode === "TLDE").legends.topLegendLeftBottom.dead, true);
  assert.equal(noDeadKeys.keys.find((key) => key.keycode === "TLDE").legends.topLegendLeftBottom.dead, false);
});

test("every board key that carries a legend can be printed", async () => {
  const snapshot = createSnapshotCatalog();

  for (const layoutName of ["us", "de", "jp"]) {
    const board = await snapshot.resolveBoard(layoutName, "");
    for (const key of board.keys) {
      for (const slot of Object.values(key.legends)) {
        assert.equal(typeof slot.text, "string");
        assert.ok(slot.text.length > 0, `${layoutName} ${key.keycode} has an empty legend`);
      }
    }
  }
});
