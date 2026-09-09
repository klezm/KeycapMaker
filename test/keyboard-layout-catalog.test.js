import test from "node:test";
import assert from "node:assert/strict";
import {
  createLayoutCatalog,
  KEYBOARD_LAYOUT_SCHEMA_VERSION,
  normalizeLayoutSelector,
  parseBoardGeometry,
  parseKeysymTable,
  parseLayoutCatalog,
  resolveKeyLegend,
} from "../tools/keyboard-layouts/keyboard-layout-catalog.js";

const CATALOG = {
  schemaVersion: KEYBOARD_LAYOUT_SCHEMA_VERSION,
  formFactors: [{ id: "iso", label: "ISO", keyCount: 2, boardFile: "iso-105.json" }],
  languages: [{ id: "deu", name: "German", layouts: ["xa"] }],
  countries: [{ id: "DE", name: "Germany", layouts: ["xa"] }],
  models: [{ name: "pc105", description: "Generic 105-key PC" }],
  optionGroups: [{ name: "grp", options: [{ name: "grp:alt_shift_toggle" }] }],
  layouts: [
    {
      name: "xa",
      description: "Test ISO",
      countries: ["DE"],
      languages: ["deu"],
      formFactor: "iso",
      formFactorSource: "symbols",
      level3Switch: "RALT",
      keymapFile: "keymaps/xa.json",
      variants: [{ name: "plain", description: "Test ISO (plain)", formFactor: "iso", countries: [], languages: [] }],
    },
    {
      name: "xb",
      description: "Test ANSI",
      countries: ["US"],
      languages: ["eng"],
      formFactor: "ansi",
      formFactorSource: "region",
      level3Switch: null,
      keymapFile: "keymaps/xb.json",
      variants: [],
    },
  ],
};

const KEYMAP = {
  schemaVersion: KEYBOARD_LAYOUT_SCHEMA_VERSION,
  layout: "xa",
  variants: {
    "": {
      description: "Test ISO",
      formFactor: "iso",
      level3Switch: "RALT",
      keys: {
        AD01: { type: "FOUR_LEVEL_SEMIALPHABETIC", levels: ["q", "Q", "at", "Greek_OMEGA"] },
        SPCE: { type: "ONE_LEVEL", levels: ["space"] },
        LSGT: { type: "FOUR_LEVEL", levels: ["less", "greater"] },
      },
    },
    plain: {
      description: "Test ISO (plain)",
      formFactor: "iso",
      level3Switch: "RALT",
      inherits: "",
      keys: { AD01: { type: "ALPHABETIC", levels: ["q", "Q"] } },
      removedKeys: ["LSGT"],
    },
  },
};

const KEYSYMS = {
  schemaVersion: KEYBOARD_LAYOUT_SCHEMA_VERSION,
  keysyms: {
    q: { char: "q" },
    Q: { char: "Q" },
    at: { char: "@" },
    Greek_OMEGA: { char: "Ω" },
    less: { char: "<" },
    greater: { char: ">" },
    space: { label: "Space" },
  },
};

const KEY_TYPES = {
  schemaVersion: KEYBOARD_LAYOUT_SCHEMA_VERSION,
  types: {
    ONE_LEVEL: { levels: [{ index: 1, name: "Any", modifiers: "" }] },
    ALPHABETIC: { levels: [{ index: 1, name: "Base", modifiers: "" }, { index: 2, name: "Caps", modifiers: "Shift" }] },
    FOUR_LEVEL: {
      levels: [
        { index: 1, name: "Base", modifiers: "" },
        { index: 2, name: "Shift", modifiers: "Shift" },
        { index: 3, name: "AltGr", modifiers: "LevelThree" },
        { index: 4, name: "Shift AltGr", modifiers: "Shift+LevelThree" },
      ],
    },
    FOUR_LEVEL_SEMIALPHABETIC: {
      levels: [
        { index: 1, name: "Base", modifiers: "" },
        { index: 2, name: "Shift", modifiers: "Shift" },
        { index: 3, name: "AltGr", modifiers: "LevelThree" },
        { index: 4, name: "Shift AltGr", modifiers: "Shift+LevelThree" },
      ],
    },
  },
};

const BOARD = {
  schemaVersion: KEYBOARD_LAYOUT_SCHEMA_VERSION,
  id: "iso",
  label: "ISO",
  keyCount: 3,
  keys: [
    { keycode: "AD01", cluster: "main", row: 2, x: 1.5, y: 2.5, width: 1, height: 1 },
    { keycode: "SPCE", cluster: "main", row: 5, x: 3.75, y: 5.5, width: 6.25, height: 1, fallbackLabel: "Space" },
    { keycode: "ESC", cluster: "function", row: 0, x: 0, y: 0, width: 1, height: 1, fallbackLabel: "Esc" },
  ],
};

function createCatalog() {
  return createLayoutCatalog(
    CATALOG,
    { keysyms: KEYSYMS, keyTypes: KEY_TYPES },
    {
      loadKeymap: async (layoutName) => {
        if (layoutName !== "xa") {
          throw new Error(`no keymap fixture for ${layoutName}`);
        }
        return KEYMAP;
      },
      loadBoard: async () => BOARD,
    },
  );
}

test("layout selectors accept both colon and parenthesis forms", () => {
  assert.deepEqual(normalizeLayoutSelector("de"), { layout: "de", variant: "" });
  assert.deepEqual(normalizeLayoutSelector("de:nodeadkeys"), { layout: "de", variant: "nodeadkeys" });
  assert.deepEqual(normalizeLayoutSelector("de(nodeadkeys)"), { layout: "de", variant: "nodeadkeys" });
  assert.equal(normalizeLayoutSelector("  "), null);
  assert.equal(normalizeLayoutSelector(null), null);
});

test("a schema version mismatch is rejected on every snapshot file", () => {
  assert.throws(() => parseLayoutCatalog({ ...CATALOG, schemaVersion: 999 }), /schemaVersion 999/);
  assert.throws(() => parseKeysymTable({ ...KEYSYMS, schemaVersion: 0 }), /schemaVersion 0/);
  assert.throws(() => parseBoardGeometry({ ...BOARD, schemaVersion: 2 }), /schemaVersion 2/);
  assert.throws(() => parseLayoutCatalog(null), /must be an object/);
  assert.throws(() => parseLayoutCatalog({ schemaVersion: KEYBOARD_LAYOUT_SCHEMA_VERSION }), /layouts array/);
});

test("layouts can be filtered by language, country and form factor", () => {
  const catalog = createCatalog();

  assert.deepEqual(catalog.listLayouts({ language: "deu" }).map((layout) => layout.name), ["xa"]);
  assert.deepEqual(catalog.listLayouts({ country: "US" }).map((layout) => layout.name), ["xb"]);
  assert.deepEqual(catalog.listLayouts({ formFactor: "iso" }).map((layout) => layout.name), ["xa"]);
  assert.equal(catalog.listLayouts({}).length, 2);
  assert.equal(catalog.listLayouts({ language: "zzz" }).length, 0);
});

test("the base variant is described from the layout itself", () => {
  const catalog = createCatalog();
  const variant = catalog.resolveVariant("xa", "");

  assert.equal(variant.name, "");
  assert.equal(variant.description, "Test ISO");
  assert.equal(variant.level3Switch, "RALT");
  assert.equal(catalog.resolveVariant("xa", "nope"), null);
  assert.equal(catalog.resolveLayout("nope"), null);
});

test("levels are labelled with the modifier that produces them", async () => {
  const catalog = createCatalog();
  const loaded = await catalog.loadKeys("xa", "");

  assert.deepEqual(
    loaded.keys.AD01.levels.map((level) => [level.modifierName, level.text]),
    [["Base", "q"], ["Shift", "Q"], ["AltGr", "@"], ["Shift AltGr", "Ω"]],
  );
});

test("a variant is merged onto the base variant it inherits from", async () => {
  const catalog = createCatalog();
  const loaded = await catalog.loadKeys("xa", "plain");

  assert.equal(loaded.keys.AD01.type, "ALPHABETIC");
  assert.equal(loaded.keys.AD01.levels.length, 2);
  assert.ok(Object.hasOwn(loaded.keys, "SPCE"));
  assert.ok(!Object.hasOwn(loaded.keys, "LSGT"), "removedKeys should drop inherited keys");
});

test("an unknown variant resolves to null rather than throwing", async () => {
  const catalog = createCatalog();

  assert.equal(await catalog.loadKeys("xa", "missing"), null);
});

test("a board joins geometry to keycap legends", async () => {
  const catalog = createCatalog();
  const board = await catalog.resolveBoard("xa", "");

  assert.equal(board.formFactor, "iso");
  assert.equal(board.formFactorLabel, "ISO");
  assert.equal(board.level3Switch, "RALT");
  assert.equal(board.keys.length, 3);

  const alpha = board.keys.find((key) => key.keycode === "AD01");
  assert.equal(alpha.legends.legend.text, "Q");
  assert.equal(alpha.legends.topLegendRightBottom.text, "@");
  assert.equal(alpha.legends.topLegendRightBottom.modifier, "AltGr");
  assert.equal(alpha.width, 1);
});

test("a board key with no symbol falls back to its printed label", async () => {
  const catalog = createCatalog();
  const board = await catalog.resolveBoard("xa", "");
  const escape = board.keys.find((key) => key.keycode === "ESC");

  assert.equal(escape.legends.legend.text, "Esc");
  assert.deepEqual(escape.levels, []);
  assert.equal(escape.type, null);
});

test("the board form factor can be overridden per call", async () => {
  const catalog = createCatalog();
  const board = await catalog.resolveBoard("xa", "", "jis");

  assert.equal(board.formFactor, "jis");
});

test("keymap files are only loaded once per layout", async () => {
  let loads = 0;
  const catalog = createLayoutCatalog(
    CATALOG,
    { keysyms: KEYSYMS, keyTypes: KEY_TYPES },
    {
      loadKeymap: async () => {
        loads += 1;
        return KEYMAP;
      },
      loadBoard: async () => BOARD,
    },
  );

  await catalog.loadKeys("xa", "");
  await catalog.loadKeys("xa", "plain");
  await catalog.resolveBoard("xa", "");

  assert.equal(loads, 1);
});

test("resolveKeyLegend reports unknown keysyms as null", () => {
  assert.deepEqual(resolveKeyLegend("q", KEYSYMS.keysyms), {
    text: "q",
    keysym: "q",
    dead: false,
    printable: true,
  });
  assert.equal(resolveKeyLegend("nope", KEYSYMS.keysyms), null);
});

test("resolving a board without a loader is an explicit error", async () => {
  const catalog = createLayoutCatalog(
    CATALOG,
    { keysyms: KEYSYMS, keyTypes: KEY_TYPES },
    { loadKeymap: async () => KEYMAP },
  );

  await assert.rejects(() => catalog.resolveBoard("xa", ""), /no board loader/);
});
