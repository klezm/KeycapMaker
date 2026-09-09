import { FORM_FACTORS, normalizeFormFactorId, resolveFormFactorDefinition } from "./lib/form-factor.js";
import { KEYCAP_LEGEND_SLOTS, resolveKeycapLegends, resolveKeysymLegend } from "./lib/keycap-legends.js";

export const KEYBOARD_LAYOUT_SCHEMA_VERSION = 1;
export { FORM_FACTORS, KEYCAP_LEGEND_SLOTS, normalizeFormFactorId, resolveFormFactorDefinition };

function getPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function assertSchemaVersion(value, label) {
  const record = getPlainObject(value);
  if (record === null) {
    throw new Error(`${label} must be an object`);
  }
  if (record.schemaVersion !== KEYBOARD_LAYOUT_SCHEMA_VERSION) {
    throw new Error(
      `${label} schemaVersion ${record.schemaVersion} does not match ${KEYBOARD_LAYOUT_SCHEMA_VERSION}`,
    );
  }
  return record;
}

export function parseLayoutCatalog(value) {
  const catalog = assertSchemaVersion(value, "layout catalog");
  if (!Array.isArray(catalog.layouts)) {
    throw new Error("layout catalog must contain a layouts array");
  }
  return catalog;
}

export function parseLayoutKeymap(value) {
  const keymap = assertSchemaVersion(value, "layout keymap");
  if (getPlainObject(keymap.variants) === null) {
    throw new Error("layout keymap must contain a variants object");
  }
  return keymap;
}

export function parseKeysymTable(value) {
  const table = assertSchemaVersion(value, "keysym table");
  if (getPlainObject(table.keysyms) === null) {
    throw new Error("keysym table must contain a keysyms object");
  }
  return table;
}

export function parseKeyTypeTable(value) {
  const table = assertSchemaVersion(value, "key type table");
  if (getPlainObject(table.types) === null) {
    throw new Error("key type table must contain a types object");
  }
  return table;
}

export function parseBoardGeometry(value) {
  const board = assertSchemaVersion(value, "board geometry");
  if (!Array.isArray(board.keys)) {
    throw new Error("board geometry must contain a keys array");
  }
  return board;
}

export function normalizeLayoutSelector(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const separator = trimmed.search(/[:(]/);
  if (separator === -1) {
    return { layout: trimmed, variant: "" };
  }
  const layout = trimmed.slice(0, separator).trim();
  const variant = trimmed
    .slice(separator + 1)
    .replace(/\)$/, "")
    .trim();
  return { layout, variant };
}

export function resolveKeyLegend(keysym, keysymTable) {
  return resolveKeysymLegend(keysym, keysymTable);
}

function resolveVariantKeys(keymap, variantName) {
  const variant = keymap.variants[variantName];
  if (variant === undefined) {
    return null;
  }
  if (typeof variant.inherits !== "string") {
    return { variant, keys: { ...variant.keys } };
  }
  const inherited = keymap.variants[variant.inherits];
  if (inherited === undefined) {
    return { variant, keys: { ...variant.keys } };
  }
  const keys = { ...inherited.keys, ...variant.keys };
  for (const keycode of variant.removedKeys ?? []) {
    delete keys[keycode];
  }
  return { variant, keys };
}

function attachLevelModifiers(key, keyTypes) {
  const definition = keyTypes[key.type] ?? null;
  return key.levels.map((keysym, offset) => ({
    level: offset + 1,
    keysym,
    modifierName: definition?.levels[offset]?.name ?? null,
    modifiers: definition?.levels[offset]?.modifiers ?? null,
  }));
}

export function createLayoutCatalog(catalogValue, tables, loaders) {
  const catalog = parseLayoutCatalog(catalogValue);
  const keysyms = parseKeysymTable(tables.keysyms).keysyms;
  const keyTypes = parseKeyTypeTable(tables.keyTypes).types;
  const loadKeymapFile = loaders.loadKeymap;
  const loadBoardFile = loaders.loadBoard ?? null;

  const layoutsByName = new Map(catalog.layouts.map((layout) => [layout.name, layout]));
  const keymapCache = new Map();
  const boardCache = new Map();

  async function loadKeymap(layoutName) {
    if (!keymapCache.has(layoutName)) {
      keymapCache.set(layoutName, parseLayoutKeymap(await loadKeymapFile(layoutName)));
    }
    return keymapCache.get(layoutName);
  }

  async function loadBoard(formFactorId) {
    if (loadBoardFile === null) {
      throw new Error("no board loader was provided");
    }
    if (!boardCache.has(formFactorId)) {
      boardCache.set(formFactorId, parseBoardGeometry(await loadBoardFile(formFactorId)));
    }
    return boardCache.get(formFactorId);
  }

  function resolveLayout(name) {
    return layoutsByName.get(name) ?? null;
  }

  function resolveVariant(name, variantName) {
    const layout = resolveLayout(name);
    if (layout === null) {
      return null;
    }
    if (!variantName) {
      return {
        name: "",
        description: layout.description,
        countries: layout.countries,
        languages: layout.languages,
        formFactor: layout.formFactor,
        formFactorSource: layout.formFactorSource,
        level3Switch: layout.level3Switch,
      };
    }
    return layout.variants.find((variant) => variant.name === variantName) ?? null;
  }

  function listLayouts(filters = {}) {
    const language = filters.language ?? null;
    const country = filters.country ?? null;
    const formFactor = filters.formFactor ?? null;

    return catalog.layouts.filter((layout) => {
      if (language !== null && !layout.languages.includes(language)) {
        return false;
      }
      if (country !== null && !layout.countries.includes(country)) {
        return false;
      }
      if (formFactor !== null && layout.formFactor !== formFactor) {
        return false;
      }
      return true;
    });
  }

  async function loadKeys(layoutName, variantName = "") {
    const keymap = await loadKeymap(layoutName);
    const resolved = resolveVariantKeys(keymap, variantName ?? "");
    if (resolved === null) {
      return null;
    }

    const keys = {};
    for (const [keycode, key] of Object.entries(resolved.keys)) {
      keys[keycode] = {
        keycode,
        type: key.type,
        truncatedLevels: key.truncatedLevels === true,
        totalLevels: key.totalLevels ?? key.levels.length,
        levels: attachLevelModifiers(key, keyTypes).map((level) => ({
          ...level,
          ...(resolveKeysymLegend(level.keysym, keysyms) ?? { text: null, dead: false, printable: false }),
        })),
      };
    }

    return { variant: resolved.variant, keys };
  }

  async function resolveBoard(layoutName, variantName = "", formFactorOverride = null) {
    const layout = resolveLayout(layoutName);
    if (layout === null) {
      return null;
    }

    const keymap = await loadKeymap(layoutName);
    const resolved = resolveVariantKeys(keymap, variantName ?? "");
    if (resolved === null) {
      return null;
    }

    const formFactorId =
      normalizeFormFactorId(formFactorOverride) ?? resolved.variant.formFactor ?? layout.formFactor;
    const board = await loadBoard(formFactorId);

    const keys = board.keys.map((geometry) => {
      const key = resolved.keys[geometry.keycode] ?? null;
      const levels = key === null ? [] : attachLevelModifiers(key, keyTypes);
      const legends =
        key === null
          ? resolveKeycapLegends({ levels: [] }, keysyms, geometry.fallbackLabel)
          : resolveKeycapLegends({ levels }, keysyms, geometry.fallbackLabel);

      return {
        ...geometry,
        type: key?.type ?? null,
        truncatedLevels: key?.truncatedLevels === true,
        levels: levels.map((level) => ({
          ...level,
          ...(resolveKeysymLegend(level.keysym, keysyms) ?? { text: null, dead: false, printable: false }),
        })),
        legends,
      };
    });

    return {
      layout: layoutName,
      variant: variantName ?? "",
      description: resolved.variant.description ?? layout.description,
      formFactor: formFactorId,
      formFactorLabel: resolveFormFactorDefinition(formFactorId)?.label ?? formFactorId,
      level3Switch: resolved.variant.level3Switch ?? layout.level3Switch,
      keyCount: keys.length,
      keys,
    };
  }

  return {
    catalog,
    listLanguages: () => catalog.languages,
    listCountries: () => catalog.countries,
    listModels: () => catalog.models,
    listOptionGroups: () => catalog.optionGroups,
    listFormFactors: () => catalog.formFactors,
    listLayouts,
    resolveLayout,
    resolveVariant,
    loadKeys,
    resolveBoard,
  };
}
