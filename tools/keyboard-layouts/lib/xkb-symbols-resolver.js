import fs from "node:fs";
import path from "node:path";
import { parseIncludeTarget, parseSymbolsFile } from "./xkb-symbols-parser.js";

const MAX_INCLUDE_DEPTH = 16;
const LEVEL3_KEYSYMS = Object.freeze(new Set(["ISO_Level3_Shift", "ISO_Level3_Latch"]));
const LEVEL5_KEYSYMS = Object.freeze(new Set(["ISO_Level5_Shift", "ISO_Level5_Latch"]));

export function createSymbolsResolver(xkbRoot) {
  const fileCache = new Map();
  const sectionCache = new Map();
  const warnings = [];

  function loadFile(file) {
    if (fileCache.has(file)) {
      return fileCache.get(file);
    }
    const filePath = path.join(xkbRoot, "symbols", file);
    if (!fs.existsSync(filePath)) {
      fileCache.set(file, null);
      return null;
    }
    const sections = parseSymbolsFile(fs.readFileSync(filePath, "utf8"));
    fileCache.set(file, sections);
    return sections;
  }

  function findSection(sections, sectionName) {
    if (sectionName === null) {
      return sections.find((section) => section.isDefault) ?? sections[0] ?? null;
    }
    const exact = sections.find((section) => section.name === sectionName);
    if (exact !== undefined) {
      return exact;
    }
    const caseInsensitive = sections.find(
      (section) => section.name.toLowerCase() === sectionName.toLowerCase(),
    );
    return caseInsensitive ?? null;
  }

  function resolve(file, sectionName, activePath, depth) {
    const sections = loadFile(file);
    if (sections === null) {
      warnings.push(`missing symbols file: ${file}`);
      return new Map();
    }

    const section = findSection(sections, sectionName);
    if (section === null) {
      warnings.push(`missing section: ${file}(${sectionName})`);
      return new Map();
    }

    const cacheKey = `${file}(${section.name})`;

    if (activePath.has(cacheKey)) {
      warnings.push(`include cycle skipped: ${[...activePath, cacheKey].join(" -> ")}`);
      return new Map();
    }

    if (depth > MAX_INCLUDE_DEPTH) {
      throw new Error(`include depth exceeded at ${cacheKey}: ${[...activePath].join(" -> ")}`);
    }

    if (sectionCache.has(cacheKey)) {
      return sectionCache.get(cacheKey);
    }

    activePath.add(cacheKey);

    const statements = [
      ...section.includes.map((include) => ({ kind: "include", ...include })),
      ...section.keys.map((key) => ({ kind: "key", ...key })),
    ].sort((left, right) => left.index - right.index);

    const resolved = new Map();

    for (const statement of statements) {
      if (statement.kind === "include") {
        const target = parseIncludeTarget(statement.target);
        if (target === null) {
          warnings.push(`unparsable include target: ${statement.target}`);
          continue;
        }
        if (statement.mode === "augment") {
          warnings.push(`augment include treated as override: ${file}(${section.name}) <- ${statement.target}`);
        }
        const included = resolve(target.file, target.section, activePath, depth + 1);
        for (const [keycode, entry] of included) {
          resolved.set(keycode, entry);
        }
        continue;
      }

      if (statement.levels.length === 0 && statement.explicitType === null) {
        continue;
      }

      resolved.set(statement.keycode, {
        levels: statement.levels,
        explicitType: statement.explicitType,
        typeDefault: section.keyTypeDefault,
      });
    }

    activePath.delete(cacheKey);
    sectionCache.set(cacheKey, resolved);
    return resolved;
  }

  function resolveSection(file, sectionName) {
    const keys = resolve(file, sectionName, new Set(), 0);
    const sections = loadFile(file);
    const section = sections === null ? null : findSection(sections, sectionName);

    let level3Switch = null;
    let level5Switch = null;
    for (const [keycode, entry] of keys) {
      const first = entry.levels[0];
      if (level3Switch === null && LEVEL3_KEYSYMS.has(first)) {
        level3Switch = keycode;
      }
      if (level5Switch === null && LEVEL5_KEYSYMS.has(first)) {
        level5Switch = keycode;
      }
    }

    return { keys, groupName: section?.groupName ?? null, level3Switch, level5Switch };
  }

  function listSections(file) {
    const sections = loadFile(file);
    return sections === null ? [] : sections.map((section) => section.name);
  }

  return { resolveSection, listSections, warnings };
}
