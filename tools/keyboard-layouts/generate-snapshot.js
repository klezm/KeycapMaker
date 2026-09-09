import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listXkbFiles, readXkbFile, resolveKeysymHeaderPath, resolveXkbRoot, resolveXkbVersion } from "./lib/xkb-source.js";
import { mergeRegistries, parseRegistryXml } from "./lib/xkb-registry.js";
import { createSymbolsResolver } from "./lib/xkb-symbols-resolver.js";
import { createKeycodeCanonicalizer } from "./lib/keycode-aliases.js";
import { loadKeyTypes } from "./lib/xkb-types-parser.js";
import { createKeysymTable, parseKeysymHeader, resolveKeysymEntry } from "./lib/xkb-keysym-table.js";
import { createKeyLevelResolver } from "./lib/key-type-resolver.js";
import { FORM_FACTORS, resolveFormFactor } from "./lib/form-factor.js";

export const SNAPSHOT_SCHEMA_VERSION = 1;

const REGISTRY_FILES = Object.freeze(["rules/base.xml", "rules/base.extras.xml"]);
const BASE_SYMBOLS_FILE = "pc";
const TOOL_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function createDisplayNames(type) {
  try {
    return new Intl.DisplayNames(["en"], { type, fallback: "none" });
  } catch {
    return null;
  }
}

function resolveDisplayName(displayNames, code) {
  if (displayNames === null) {
    return null;
  }
  try {
    return displayNames.of(code) ?? null;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
  return fs.statSync(filePath).size;
}

function resolveVariantKeys(symbolsResolver, canonicalize, baseKeys, layoutName, variantName) {
  const section = symbolsResolver.resolveSection(layoutName, variantName);
  if (section.keys.size === 0) {
    return null;
  }

  const ownKeys = new Map();
  for (const [keycode, entry] of section.keys) {
    ownKeys.set(canonicalize(keycode), entry);
  }

  return {
    ownKeys,
    boardKeys: new Map([...baseKeys, ...ownKeys]),
    groupName: section.groupName,
    level3Switch: section.level3Switch === null ? null : canonicalize(section.level3Switch),
    level5Switch: section.level5Switch === null ? null : canonicalize(section.level5Switch),
  };
}

export function generateSnapshot(options = {}) {
  const xkbRoot = resolveXkbRoot(options.xkbRoot);
  const keysymHeaderPath = resolveKeysymHeaderPath(options.keysymHeader);
  const outputDirectory = path.resolve(options.outputDirectory ?? path.join(TOOL_DIRECTORY, "data"));

  const keysymHeaderSource = fs.readFileSync(keysymHeaderPath, "utf8");
  const headerEntries = parseKeysymHeader(keysymHeaderSource);
  const resolveCharacter = (keysym) => resolveKeysymEntry(keysym, headerEntries).char;

  const availableRegistryFiles = REGISTRY_FILES.filter((file) =>
    fs.existsSync(path.join(xkbRoot, file)),
  );
  const registry = mergeRegistries(
    availableRegistryFiles.map((file) => parseRegistryXml(readXkbFile(xkbRoot, file))),
  );

  const keyTypes = loadKeyTypes(xkbRoot);
  const resolveKeyLevels = createKeyLevelResolver(keyTypes, resolveCharacter);
  const symbolsResolver = createSymbolsResolver(xkbRoot);
  const { canonicalize } = createKeycodeCanonicalizer(xkbRoot);

  const baseSection = symbolsResolver.resolveSection(BASE_SYMBOLS_FILE, null);
  const baseKeys = new Map();
  for (const [keycode, entry] of baseSection.keys) {
    baseKeys.set(canonicalize(keycode), entry);
  }

  const languageDisplayNames = createDisplayNames("language");
  const regionDisplayNames = createDisplayNames("region");

  const usedKeysyms = new Set();
  const keymaps = new Map();
  const catalogLayouts = [];
  const languageIndex = new Map();
  const countryIndex = new Map();
  const skippedLayouts = [];
  let truncatedKeyCount = 0;

  for (const layout of registry.layouts) {
    const variantEntries = [{ name: "", registry: null }, ...layout.variants.map((variant) => ({ name: variant.name, registry: variant }))];
    const variantSnapshots = {};
    const catalogVariants = [];
    let layoutFormFactor = null;
    let layoutLevel3Switch = null;

    for (const variantEntry of variantEntries) {
      const variantName = variantEntry.name === "" ? null : variantEntry.name;
      const resolved = resolveVariantKeys(symbolsResolver, canonicalize, baseKeys, layout.name, variantName);

      if (resolved === null) {
        if (variantName === null) {
          skippedLayouts.push(layout.name);
        }
        continue;
      }

      const countries =
        variantEntry.registry !== null && variantEntry.registry.countries.length > 0
          ? variantEntry.registry.countries
          : layout.countries;
      const languages =
        variantEntry.registry !== null && variantEntry.registry.languages.length > 0
          ? variantEntry.registry.languages
          : layout.languages;

      const formFactor = resolveFormFactor(
        layout.name,
        variantName,
        new Set(resolved.ownKeys.keys()),
        countries,
      );

      const keys = {};
      for (const [keycode, entry] of [...resolved.boardKeys].sort(([left], [right]) => left.localeCompare(right))) {
        const resolvedKey = resolveKeyLevels(entry);
        if (resolvedKey.levels.length === 0) {
          continue;
        }
        for (const level of resolvedKey.levels) {
          usedKeysyms.add(level.keysym);
        }
        const value = { type: resolvedKey.type, levels: resolvedKey.levels.map((level) => level.keysym) };
        if (resolvedKey.truncatedLevels) {
          value.truncatedLevels = true;
          value.totalLevels = resolvedKey.totalLevels;
          truncatedKeyCount += 1;
        }
        keys[keycode] = value;
      }

      variantSnapshots[variantEntry.name] = {
        description: variantEntry.registry?.description ?? layout.description,
        groupName: resolved.groupName,
        formFactor: formFactor.formFactor,
        level3Switch: resolved.level3Switch,
        level5Switch: resolved.level5Switch,
        keys,
      };

      const catalogEntry = {
        name: variantEntry.name,
        description: variantEntry.registry?.description ?? layout.description,
        countries,
        languages,
        formFactor: formFactor.formFactor,
        formFactorSource: formFactor.source,
        level3Switch: resolved.level3Switch,
        keyCount: Object.keys(keys).length,
      };

      if (variantName === null) {
        layoutFormFactor = formFactor;
        layoutLevel3Switch = resolved.level3Switch;
      } else {
        catalogVariants.push(catalogEntry);
      }

      for (const language of languages) {
        if (!languageIndex.has(language)) {
          languageIndex.set(language, new Set());
        }
        languageIndex.get(language).add(layout.name);
      }
      for (const country of countries) {
        if (!countryIndex.has(country)) {
          countryIndex.set(country, new Set());
        }
        countryIndex.get(country).add(layout.name);
      }
    }

    if (Object.keys(variantSnapshots).length === 0) {
      continue;
    }

    const baseVariantKeys = variantSnapshots[""]?.keys ?? null;
    if (baseVariantKeys !== null) {
      for (const [variantName, snapshot] of Object.entries(variantSnapshots)) {
        if (variantName === "") {
          continue;
        }
        const changedKeys = {};
        for (const [keycode, value] of Object.entries(snapshot.keys)) {
          if (JSON.stringify(baseVariantKeys[keycode]) !== JSON.stringify(value)) {
            changedKeys[keycode] = value;
          }
        }
        const removedKeys = Object.keys(baseVariantKeys)
          .filter((keycode) => !Object.hasOwn(snapshot.keys, keycode))
          .sort();
        snapshot.inherits = "";
        snapshot.keys = changedKeys;
        if (removedKeys.length > 0) {
          snapshot.removedKeys = removedKeys;
        }
      }
    }

    keymaps.set(layout.name, {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      layout: layout.name,
      variants: sortObjectKeys(variantSnapshots),
    });

    catalogLayouts.push({
      name: layout.name,
      description: layout.description,
      shortDescription: layout.shortDescription,
      countries: layout.countries,
      languages: layout.languages,
      formFactor: layoutFormFactor?.formFactor ?? null,
      formFactorSource: layoutFormFactor?.source ?? null,
      level3Switch: layoutLevel3Switch,
      keymapFile: `keymaps/${layout.name}.json`,
      variants: catalogVariants,
    });
  }

  const { table: keysymTable, unmapped } = createKeysymTable(keysymHeaderSource, usedKeysyms);

  const languages = [...languageIndex.entries()]
    .map(([id, layoutNames]) => ({
      id,
      name: resolveDisplayName(languageDisplayNames, id),
      layouts: [...layoutNames].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const countries = [...countryIndex.entries()]
    .map(([id, layoutNames]) => ({
      id,
      name: resolveDisplayName(regionDisplayNames, id),
      layouts: [...layoutNames].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const models = registry.models.map((model) => ({ ...model }));

  const catalog = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    source: {
      name: "xkeyboard-config",
      xkbRoot,
      rulesFiles: availableRegistryFiles,
      keysymHeader: keysymHeaderPath,
      ...(resolveXkbVersion(xkbRoot) ?? {}),
      symbolsFileCount: listXkbFiles(xkbRoot, "symbols").length,
    },
    counts: {
      layouts: catalogLayouts.length,
      variants: catalogLayouts.reduce((total, layout) => total + layout.variants.length, 0),
      models: models.length,
      languages: languages.length,
      countries: countries.length,
      optionGroups: registry.optionGroups.length,
      options: registry.optionGroups.reduce((total, group) => total + group.options.length, 0),
      keysyms: Object.keys(keysymTable).length,
      truncatedKeys: truncatedKeyCount,
    },
    formFactors: FORM_FACTORS.map((formFactor) => ({ ...formFactor })),
    unmappedKeysyms: unmapped,
    skippedLayouts,
    resolverWarnings: symbolsResolver.warnings,
    languages,
    countries,
    models,
    optionGroups: registry.optionGroups,
    layouts: catalogLayouts,
  };

  const keyTypeTable = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    types: sortObjectKeys(
      Object.fromEntries([...keyTypes].map(([name, definition]) => [name, { levels: definition.levels }])),
    ),
  };

  const stagingDirectory = `${outputDirectory}.staging`;
  fs.rmSync(stagingDirectory, { recursive: true, force: true });
  fs.mkdirSync(path.join(stagingDirectory, "keymaps"), { recursive: true });

  let bytesWritten = 0;
  bytesWritten += writeJsonFile(path.join(stagingDirectory, "catalog.json"), catalog);
  bytesWritten += writeJsonFile(path.join(stagingDirectory, "keysyms.json"), {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    keysyms: keysymTable,
  });
  bytesWritten += writeJsonFile(path.join(stagingDirectory, "key-types.json"), keyTypeTable);

  for (const [layoutName, keymap] of [...keymaps].sort(([left], [right]) => left.localeCompare(right))) {
    bytesWritten += writeJsonFile(path.join(stagingDirectory, "keymaps", `${layoutName}.json`), keymap);
  }

  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.renameSync(stagingDirectory, outputDirectory);

  return {
    outputDirectory,
    bytesWritten,
    counts: catalog.counts,
    unmappedKeysyms: unmapped,
    skippedLayouts,
    resolverWarnings: symbolsResolver.warnings,
    formFactorDistribution: catalogLayouts.reduce((distribution, layout) => {
      const key = layout.formFactor ?? "unknown";
      distribution[key] = (distribution[key] ?? 0) + 1;
      return distribution;
    }, {}),
  };
}
