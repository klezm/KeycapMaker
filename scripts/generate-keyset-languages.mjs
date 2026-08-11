#!/usr/bin/env node
// Generate keycap legend tables from the system's xkb data.
//
//   node scripts/generate-keyset-languages.mjs [--check]
//
// Legend text has to be right, and typing it by hand across many languages is
// how transcription errors get in. Instead this resolves each layout with the
// real xkb toolchain and maps the resulting keysyms to Unicode:
//
//   1. /usr/include/X11/keysymdef.h gives keysym -> Unicode, via its
//      "/* U+05E9 HEBREW LETTER SHIN */" comments.
//   2. `xkbcomp -w 0 -xkb` resolves a layout offline (no X display needed),
//      emitting `key <AD06> { symbols[Group1]= [ z, Z, leftarrow, yen ] }`.
//
// Output is committed JSON, so the deployed static site never needs xkb.
// Re-run this only when adding a language or refreshing against a newer
// xkb-data; `--check` verifies the committed files still match without
// writing, which is what CI would use.
//
// Requires: xkbcomp, xkb-data, and the X11 headers (libx11-dev).

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const KEYSYMDEF_PATH = "/usr/include/X11/keysymdef.h";
const OUTPUT_DIR = fileURLToPath(new URL("../src/data/keysets/languages/", import.meta.url));

// Only scripts the bundled fonts actually cover. Noto Sans handles Latin, Greek
// and Cyrillic; Noto Sans Hebrew handles Hebrew. Arabic, Thai and the Indic
// scripts would need fonts this repo does not ship, and shipping them would
// mean caps that render blank - so they are deliberately left out.
const LANGUAGES = [
  { id: "de", xkb: "de", label: "German", script: "latin" },
  { id: "us", xkb: "us", label: "English (US)", script: "latin" },
  { id: "gb", xkb: "gb", label: "English (UK)", script: "latin" },
  { id: "fr", xkb: "fr", label: "French", script: "latin" },
  { id: "es", xkb: "es", label: "Spanish", script: "latin" },
  { id: "it", xkb: "it", label: "Italian", script: "latin" },
  { id: "ru", xkb: "ru", label: "Russian", script: "cyrillic" },
  { id: "gr", xkb: "gr", label: "Greek", script: "greek" },
  { id: "il", xkb: "il", label: "Hebrew", script: "hebrew" },
];

// Dead keys carry no U+ comment in keysymdef.h, but a real keycap prints the
// spacing form of the accent, which is what these are.
const DEAD_KEY_CHARS = Object.freeze({
  dead_grave: "`",
  dead_acute: "´",
  dead_circumflex: "^",
  dead_tilde: "~",
  dead_macron: "¯",
  dead_breve: "˘",
  dead_abovedot: "˙",
  dead_diaeresis: "¨",
  dead_abovering: "˚",
  dead_doubleacute: "˝",
  dead_caron: "ˇ",
  dead_cedilla: "¸",
  dead_ogonek: "˛",
  dead_belowdot: ".",
});

// The alphanumeric block. Everything else on a keyboard (Esc, Tab, Shift, the
// function row) is a named function keysym, not a character, so its label is
// language-specific prose and lives in modifier-labels.js instead.
const CHARACTER_KEY_CODES = new Set([
  "TLDE",
  ...Array.from({ length: 12 }, (_, index) => `AE${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 12 }, (_, index) => `AD${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 11 }, (_, index) => `AC${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `AB${String(index + 1).padStart(2, "0")}`),
  "BKSL",
  "LSGT",
]);

/** keysym name -> printable character, from keysymdef.h plus the dead keys. */
async function readKeysymTable() {
  const source = await readFile(KEYSYMDEF_PATH, "utf8");
  const table = new Map();

  for (const line of source.split("\n")) {
    // e.g. #define XK_hebrew_shin  0x0cf9  /* U+05E9 HEBREW LETTER SHIN */
    const match = line.match(/^#define\s+XK_(\S+)\s+0x[0-9a-fA-F]+\s*\/\*\s*U\+([0-9a-fA-F]{4,6})\s/);
    if (!match) {
      continue;
    }
    const [, name, hex] = match;
    const codePoint = Number.parseInt(hex, 16);
    // Control characters are not printable legends.
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      continue;
    }
    if (!table.has(name)) {
      table.set(name, String.fromCodePoint(codePoint));
    }
  }

  for (const [name, character] of Object.entries(DEAD_KEY_CHARS)) {
    table.set(name, character);
  }

  return table;
}

/** Resolve one xkb layout to a flat keymap using the real xkb toolchain. */
async function compileKeymap(xkbLayout) {
  const workDir = await mkdtemp(path.join(tmpdir(), "keycap-xkb-"));
  try {
    const inputPath = path.join(workDir, "in.xkb");
    const outputPath = path.join(workDir, "out.xkb");
    await writeFile(inputPath, [
      "xkb_keymap {",
      '  xkb_keycodes { include "evdev+aliases(qwerty)" };',
      '  xkb_types    { include "complete" };',
      '  xkb_compat   { include "complete" };',
      `  xkb_symbols  { include "pc+${xkbLayout}+inet(evdev)" };`,
      '  xkb_geometry { include "pc(pc105)" };',
      "};",
      "",
    ].join("\n"));

    // -w 0 silences the unrelated "keysym not resolved" noise from inet(evdev).
    await execFileAsync("xkbcomp", ["-w", "0", "-xkb", inputPath, outputPath]);
    return await readFile(outputPath, "utf8");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** code -> [level1, level2, ...] keysym names, for the first group only. */
function parseKeymapSymbols(keymapText) {
  const symbolsByCode = new Map();
  const keyPattern = /key\s+<([A-Z0-9_+-]+)>\s*\{([^}]*)\}/g;

  for (const keyMatch of keymapText.matchAll(keyPattern)) {
    const [, code, body] = keyMatch;
    // xkbcomp emits two forms: a verbose one carrying an explicit type,
    //   key <AD01> { type= "ALPHABETIC", symbols[Group1]= [ q, Q ] };
    // and a shorthand for plain keys with no symbols[] at all,
    //   key <AE01> { [ 1, exclam ] };
    const symbolsMatch = body.match(/symbols\[Group1\]\s*=\s*\[([^\]]*)\]/)
      ?? body.match(/\[([^\]]*)\]/);
    if (!symbolsMatch) {
      continue;
    }
    const levels = symbolsMatch[1]
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    symbolsByCode.set(code, levels);
  }

  return symbolsByCode;
}

/** A single keysym name -> the character it prints, or null. */
function resolveKeysymCharacter(keysymName, keysymTable) {
  if (!keysymName || keysymName === "NoSymbol" || keysymName === "VoidSymbol" || keysymName === "any") {
    return null;
  }
  // Layouts may name a codepoint directly, e.g. U05B8.
  const directMatch = keysymName.match(/^U([0-9a-fA-F]{4,6})$/);
  if (directMatch) {
    return String.fromCodePoint(Number.parseInt(directMatch[1], 16));
  }
  return keysymTable.get(keysymName) ?? null;
}

/**
 * The legend a real keycap prints for this key.
 *
 * Latin, Greek and Cyrillic keys are engraved uppercase even though xkb's first
 * level is lowercase, so prefer level 2 when the two form a case pair. Scripts
 * without case (Hebrew) keep level 1 - which also guards against Hebrew layouts
 * whose second level is the Latin letter.
 */
function resolveLegend(levels, keysymTable) {
  const level1 = resolveKeysymCharacter(levels[0], keysymTable);
  const level2 = resolveKeysymCharacter(levels[1], keysymTable);

  if (level1 && level2 && level1 !== level2 && level2.toLowerCase() === level1.toLowerCase()) {
    return level2.toUpperCase() === level2 ? level2 : level1;
  }

  return level1;
}

async function generateLanguage(language, keysymTable) {
  const keymapText = await compileKeymap(language.xkb);
  const symbolsByCode = parseKeymapSymbols(keymapText);
  const legends = {};

  for (const code of CHARACTER_KEY_CODES) {
    const levels = symbolsByCode.get(code);
    if (!levels) {
      continue;
    }
    const legend = resolveLegend(levels, keysymTable);
    if (legend) {
      legends[code] = legend;
    }
  }

  return {
    id: language.id,
    label: language.label,
    script: language.script,
    xkbLayout: language.xkb,
    source: `xkbcomp: pc+${language.xkb}+inet(evdev), group 1`,
    legends: Object.fromEntries(Object.entries(legends).sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const keysymTable = await readKeysymTable();
  console.log(`Loaded ${keysymTable.size} keysym mappings from ${KEYSYMDEF_PATH}`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const generated = new Map();

  for (const language of LANGUAGES) {
    const table = await generateLanguage(language, keysymTable);
    const count = Object.keys(table.legends).length;
    if (count < 40) {
      throw new Error(`${language.id}: only ${count} legends resolved, expected the full alphanumeric block`);
    }
    generated.set(`${language.id}.json`, `${JSON.stringify(table, null, 2)}\n`);
    console.log(`  ${language.id.padEnd(3)} ${String(count).padStart(3)} legends  (${language.label})`);
  }

  if (checkOnly) {
    const existing = new Set((await readdir(OUTPUT_DIR)).filter((name) => name.endsWith(".json")));
    let drifted = 0;

    for (const [fileName, contents] of generated) {
      existing.delete(fileName);
      const current = await readFile(path.join(OUTPUT_DIR, fileName), "utf8").catch(() => null);
      if (current !== contents) {
        console.error(`DRIFT: ${fileName} differs from freshly generated output`);
        drifted += 1;
      }
    }
    for (const orphan of existing) {
      console.error(`DRIFT: ${orphan} is not produced by this generator`);
      drifted += 1;
    }

    if (drifted > 0) {
      console.error(`\n${drifted} file(s) out of date. Re-run without --check.`);
      process.exitCode = 1;
      return;
    }
    console.log("\nCommitted language tables match the generator.");
    return;
  }

  for (const [fileName, contents] of generated) {
    await writeFile(path.join(OUTPUT_DIR, fileName), contents);
  }
  console.log(`\nWrote ${generated.size} language tables to ${OUTPUT_DIR}`);
}

await main();
