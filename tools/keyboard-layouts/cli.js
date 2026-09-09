#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createLayoutCatalog, normalizeLayoutSelector, normalizeFormFactorId } from "./keyboard-layout-catalog.js";
import { resolveFormFactorDefinition } from "./lib/form-factor.js";
import { generateSnapshot } from "./generate-snapshot.js";

const TOOL_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIRECTORY = path.join(TOOL_DIRECTORY, "data");
const BOARD_DIRECTORY = path.join(TOOL_DIRECTORY, "boards");

const USAGE = `keyboard-layouts - enumerate keyboard layout variations and keycap legends

usage: npm run layouts -- <command> [options]

commands:
  languages                      list languages that have a keyboard layout
  countries                      list countries that have a keyboard layout
  layouts                        list layouts (--language, --country, --form-factor)
  variants <layout>              list variants of a layout
  models                         list keyboard models
  options                        list layout option groups
  form-factors                   list physical form factors (ANSI/ISO/JIS/ABNT)
  show <layout>[:<variant>]      summarize one layout variant
  keys <layout>[:<variant>]      list every key with its modifier levels
  board <layout>[:<variant>]     list every physical key with geometry and keycap legends
  generate                       rebuild the data snapshot from the local xkeyboard-config

options:
  --json                         print raw JSON instead of a table
  --language <iso639>            filter layouts by language id
  --country <iso3166>            filter layouts by country id
  --form-factor <id>             filter layouts, or force a board form factor
  --level <1-4>                  limit "keys" output to one modifier level
  --cluster <name>               limit "board" output to main/function/navigation/numpad
  --xkb-root <path>              xkeyboard-config root for "generate"
  --out <path>                   output directory for "generate"
`;

function readJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${label} not found at ${filePath}\nrun: npm run layouts -- generate (needs xkeyboard-config installed)`,
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function createNodeCatalog() {
  const catalog = readJsonFile(path.join(DATA_DIRECTORY, "catalog.json"), "layout catalog");
  const keysyms = readJsonFile(path.join(DATA_DIRECTORY, "keysyms.json"), "keysym table");
  const keyTypes = readJsonFile(path.join(DATA_DIRECTORY, "key-types.json"), "key type table");

  return createLayoutCatalog(
    catalog,
    { keysyms, keyTypes },
    {
      loadKeymap: async (layoutName) =>
        readJsonFile(path.join(DATA_DIRECTORY, "keymaps", `${layoutName}.json`), `keymap for ${layoutName}`),
      loadBoard: async (formFactorId) => {
        const definition = resolveFormFactorDefinition(formFactorId);
        if (definition === null) {
          throw new Error(`unknown form factor: ${formFactorId}`);
        }
        return readJsonFile(path.join(BOARD_DIRECTORY, definition.boardFile), `board ${formFactorId}`);
      },
    },
  );
}

function printTable(columns, rows) {
  if (rows.length === 0) {
    console.log("(no results)");
    return;
  }
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => String(row[index] ?? "").length)),
  );
  const renderRow = (cells) =>
    cells
      .map((cell, index) => String(cell ?? "").padEnd(index === cells.length - 1 ? 0 : widths[index]))
      .join("  ")
      .trimEnd();

  console.log(renderRow(columns));
  console.log(renderRow(widths.map((width) => "-".repeat(width))));
  for (const row of rows) {
    console.log(renderRow(row));
  }
  console.log(`\n${rows.length} row${rows.length === 1 ? "" : "s"}`);
}

function emit(values, options, columns, toRow) {
  if (options.json) {
    console.log(JSON.stringify(values, null, 2));
    return;
  }
  printTable(columns, values.map(toRow));
}

function requireSelector(positionals, catalog) {
  const selector = normalizeLayoutSelector(positionals[1]);
  if (selector === null) {
    throw new Error("a layout is required, for example: de or de:nodeadkeys");
  }
  if (catalog.resolveLayout(selector.layout) === null) {
    throw new Error(`unknown layout: ${selector.layout}`);
  }
  if (selector.variant !== "" && catalog.resolveVariant(selector.layout, selector.variant) === null) {
    throw new Error(`unknown variant: ${selector.layout}:${selector.variant}`);
  }
  return selector;
}

function formatLevels(levels, levelFilter) {
  return levels
    .filter((level) => levelFilter === null || level.level === levelFilter)
    .map((level) => `${level.modifierName ?? `L${level.level}`}=${level.text ?? level.keysym}`)
    .join("  ");
}

function formatLegends(legends) {
  const slot = (name) => (legends[name] === undefined ? "" : legends[name].text);
  return [slot("legend"), slot("topLegendLeftTop"), slot("topLegendRightTop"), slot("topLegendLeftBottom"), slot("topLegendRightBottom")];
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      language: { type: "string" },
      country: { type: "string" },
      "form-factor": { type: "string" },
      level: { type: "string" },
      cluster: { type: "string" },
      "xkb-root": { type: "string" },
      out: { type: "string" },
    },
  });

  const command = positionals[0];

  if (values.help || command === undefined || command === "help") {
    console.log(USAGE);
    return;
  }

  if (command === "generate") {
    const result = generateSnapshot({ xkbRoot: values["xkb-root"], outputDirectory: values.out });
    console.log(`snapshot written to ${result.outputDirectory}`);
    console.log(`layouts: ${result.counts.layouts}  variants: ${result.counts.variants}  models: ${result.counts.models}`);
    console.log(`languages: ${result.counts.languages}  countries: ${result.counts.countries}  keysyms: ${result.counts.keysyms}`);
    console.log(`form factors: ${JSON.stringify(result.formFactorDistribution)}`);
    console.log(`keys truncated past level 4: ${result.counts.truncatedKeys}`);
    console.log(`unmapped keysyms: ${result.unmappedKeysyms.length}`);
    if (result.skippedLayouts.length > 0) {
      console.log(`layouts without symbols: ${result.skippedLayouts.join(", ")}`);
    }
    for (const warning of result.resolverWarnings) {
      console.log(`warning: ${warning}`);
    }
    console.log(`bytes written: ${(result.bytesWritten / 1024 / 1024).toFixed(2)} MB`);
    return;
  }

  const catalog = createNodeCatalog();
  const formFactorFilter = values["form-factor"] === undefined ? null : normalizeFormFactorId(values["form-factor"]);
  if (values["form-factor"] !== undefined && formFactorFilter === null) {
    throw new Error(`unknown form factor: ${values["form-factor"]}`);
  }

  if (command === "languages") {
    emit(catalog.listLanguages(), values, ["id", "name", "layouts"], (language) => [
      language.id,
      language.name ?? "",
      language.layouts.join(" "),
    ]);
    return;
  }

  if (command === "countries") {
    emit(catalog.listCountries(), values, ["id", "name", "layouts"], (country) => [
      country.id,
      country.name ?? "",
      country.layouts.join(" "),
    ]);
    return;
  }

  if (command === "models") {
    const models = catalog.listModels();
    emit(models, values, ["name", "vendor", "description"], (model) => [
      model.name,
      model.vendor ?? "",
      model.description ?? "",
    ]);
    return;
  }

  if (command === "options") {
    const groups = catalog.listOptionGroups();
    if (values.json) {
      console.log(JSON.stringify(groups, null, 2));
      return;
    }
    const rows = groups.flatMap((group) =>
      group.options.map((option) => [group.name, option.name, option.description ?? ""]),
    );
    printTable(["group", "option", "description"], rows);
    return;
  }

  if (command === "form-factors") {
    emit(catalog.listFormFactors(), values, ["id", "label", "keys", "board", "description"], (formFactor) => [
      formFactor.id,
      formFactor.label,
      formFactor.keyCount,
      formFactor.boardFile,
      formFactor.description,
    ]);
    return;
  }

  if (command === "layouts") {
    const layouts = catalog.listLayouts({
      language: values.language ?? null,
      country: values.country ?? null,
      formFactor: formFactorFilter,
    });
    emit(layouts, values, ["layout", "form", "src", "languages", "countries", "variants", "description"], (layout) => [
      layout.name,
      layout.formFactor ?? "",
      layout.formFactorSource ?? "",
      layout.languages.join(" "),
      layout.countries.join(" "),
      layout.variants.length,
      layout.description ?? "",
    ]);
    return;
  }

  if (command === "variants") {
    const selector = requireSelector(positionals, catalog);
    const layout = catalog.resolveLayout(selector.layout);
    emit(layout.variants, values, ["variant", "form", "keys", "description"], (variant) => [
      variant.name,
      variant.formFactor ?? "",
      variant.keyCount ?? "",
      variant.description ?? "",
    ]);
    return;
  }

  if (command === "show") {
    const selector = requireSelector(positionals, catalog);
    const layout = catalog.resolveLayout(selector.layout);
    const variant = catalog.resolveVariant(selector.layout, selector.variant);
    const keys = await catalog.loadKeys(selector.layout, selector.variant);
    const summary = {
      layout: layout.name,
      variant: selector.variant,
      description: variant.description ?? layout.description,
      languages: variant.languages ?? layout.languages,
      countries: variant.countries ?? layout.countries,
      formFactor: variant.formFactor ?? layout.formFactor,
      formFactorSource: variant.formFactorSource ?? layout.formFactorSource,
      level3Switch: variant.level3Switch ?? layout.level3Switch,
      keymapKeys: keys === null ? 0 : Object.keys(keys.keys).length,
      boardKeys: resolveFormFactorDefinition(variant.formFactor ?? layout.formFactor)?.keyCount ?? null,
      variantCount: layout.variants.length,
    };
    if (values.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    for (const [key, value] of Object.entries(summary)) {
      console.log(`${key.padEnd(18)} ${Array.isArray(value) ? value.join(" ") : value}`);
    }
    return;
  }

  if (command === "keys") {
    const selector = requireSelector(positionals, catalog);
    const levelFilter = values.level === undefined ? null : Number(values.level);
    const loaded = await catalog.loadKeys(selector.layout, selector.variant);
    if (loaded === null) {
      throw new Error(`no keymap for ${selector.layout}:${selector.variant}`);
    }
    const keys = Object.values(loaded.keys).sort((left, right) => left.keycode.localeCompare(right.keycode));
    if (values.json) {
      console.log(JSON.stringify(keys, null, 2));
      return;
    }
    printTable(
      ["keycode", "type", "levels"],
      keys.map((key) => [key.keycode, key.type, formatLevels(key.levels, levelFilter)]),
    );
    return;
  }

  if (command === "board") {
    const selector = requireSelector(positionals, catalog);
    const board = await catalog.resolveBoard(selector.layout, selector.variant, values["form-factor"] ?? null);
    if (board === null) {
      throw new Error(`no board for ${selector.layout}:${selector.variant}`);
    }
    const keys =
      values.cluster === undefined ? board.keys : board.keys.filter((key) => key.cluster === values.cluster);
    if (values.json) {
      console.log(JSON.stringify({ ...board, keys }, null, 2));
      return;
    }
    console.log(
      `${board.layout}${board.variant ? `:${board.variant}` : ""}  ${board.description}  [${board.formFactorLabel}, ${board.keyCount} keys, AltGr on ${board.level3Switch ?? "none"}]\n`,
    );
    printTable(
      ["keycode", "cluster", "row", "x", "w", "h", "shape", "center", "top-left", "top-right", "bottom-left", "bottom-right"],
      keys.map((key) => [
        key.keycode,
        key.cluster,
        key.row,
        key.x,
        key.width,
        key.height,
        key.shape ?? "",
        ...formatLegends(key.legends),
      ]),
    );
    return;
  }

  throw new Error(`unknown command: ${command}\n\n${USAGE}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
