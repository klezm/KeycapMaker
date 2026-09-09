import fs from "node:fs";
import path from "node:path";
import { stripComments } from "./xkb-symbols-parser.js";

const TYPE_PATTERN = /\btype\s+"([^"]+)"\s*\{/g;
const MODIFIERS_PATTERN = /\bmodifiers\s*=\s*([^;]+);/;
const MAP_PATTERN = /\bmap\s*\[\s*([^\]]+?)\s*\]\s*=\s*[Ll]evel\s*(\d+)/g;
const LEVEL_NAME_PATTERN = /\blevel_name\s*\[\s*[Ll]evel\s*(\d+)\s*\]\s*=\s*"([^"]*)"/g;

const FALLBACK_LEVEL_NAMES = Object.freeze({
  1: "Base",
  2: "Shift",
  3: "AltGr",
  4: "Shift AltGr",
  5: "Level5",
  6: "Shift Level5",
  7: "AltGr Level5",
  8: "Shift AltGr Level5",
});

function readBalancedBody(source, openIndex) {
  let depth = 1;
  let index = openIndex + 1;

  while (index < source.length) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { body: source.slice(openIndex + 1, index), endIndex: index };
      }
    }
    index += 1;
  }

  throw new Error("unterminated type block");
}

function normalizeModifierCombination(value) {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "none") {
    return "";
  }
  return trimmed
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .join("+");
}

function scoreModifierCombination(combination) {
  if (combination === "") {
    return 0;
  }
  const parts = combination.split("+");
  return parts.length * 10 + (combination.includes("Lock") ? 5 : 0);
}

export function parseTypesSource(source) {
  const stripped = stripComments(source);
  const types = new Map();

  TYPE_PATTERN.lastIndex = 0;
  let typeMatch = TYPE_PATTERN.exec(stripped);
  while (typeMatch !== null) {
    const openIndex = TYPE_PATTERN.lastIndex - 1;
    const block = readBalancedBody(stripped, openIndex);
    const body = block.body;

    const modifiersMatch = MODIFIERS_PATTERN.exec(body);
    const modifiers = modifiersMatch === null ? "" : normalizeModifierCombination(modifiersMatch[1]);

    const levelModifiers = new Map();
    MAP_PATTERN.lastIndex = 0;
    let mapMatch = MAP_PATTERN.exec(body);
    while (mapMatch !== null) {
      const level = Number(mapMatch[2]);
      const combination = normalizeModifierCombination(mapMatch[1]);
      const existing = levelModifiers.get(level);
      if (existing === undefined || scoreModifierCombination(combination) < scoreModifierCombination(existing)) {
        levelModifiers.set(level, combination);
      }
      mapMatch = MAP_PATTERN.exec(body);
    }

    const levelNames = new Map();
    LEVEL_NAME_PATTERN.lastIndex = 0;
    let levelNameMatch = LEVEL_NAME_PATTERN.exec(body);
    while (levelNameMatch !== null) {
      levelNames.set(Number(levelNameMatch[1]), levelNameMatch[2]);
      levelNameMatch = LEVEL_NAME_PATTERN.exec(body);
    }

    const highestLevel = Math.max(1, ...levelModifiers.keys(), ...levelNames.keys());
    const levels = [];
    for (let index = 1; index <= highestLevel; index += 1) {
      levels.push({
        index,
        name: levelNames.get(index) ?? FALLBACK_LEVEL_NAMES[index] ?? `Level${index}`,
        modifiers: levelModifiers.get(index) ?? (index === 1 ? "" : null),
      });
    }

    types.set(typeMatch[1], { name: typeMatch[1], modifiers, levels });

    TYPE_PATTERN.lastIndex = block.endIndex + 1;
    typeMatch = TYPE_PATTERN.exec(stripped);
  }

  return types;
}

export function loadKeyTypes(xkbRoot) {
  const directory = path.join(xkbRoot, "types");
  const types = new Map();

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "README") {
      continue;
    }
    for (const [name, definition] of parseTypesSource(fs.readFileSync(path.join(directory, entry.name), "utf8"))) {
      if (!types.has(name)) {
        types.set(name, definition);
      }
    }
  }

  return types;
}
