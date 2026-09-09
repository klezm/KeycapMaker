import fs from "node:fs";
import path from "node:path";
import { stripComments } from "./xkb-symbols-parser.js";

const ALIAS_PATTERN = /\balias\s+<([A-Za-z0-9_+-]+)>\s*=\s*<([A-Za-z0-9_+-]+)>/g;
const KEYCODE_PATTERN = /<([A-Za-z0-9_+-]+)>\s*=\s*\d+/g;

export const SUPPLEMENTAL_KEYCODE_ALIASES = Object.freeze({
  NFER: "MUHE",
  XFER: "HENK",
  KANA: "HKTG",
  HIRA: "HKTG",
  KATA: "HKTG",
  ALGR: "RALT",
  COMP: "MENU",
  LMTA: "LWIN",
  RMTA: "RWIN",
});

export function parseKeycodeAliases(source) {
  const stripped = stripComments(source);
  const aliases = new Map();
  const canonical = new Set();

  KEYCODE_PATTERN.lastIndex = 0;
  let keycodeMatch = KEYCODE_PATTERN.exec(stripped);
  while (keycodeMatch !== null) {
    canonical.add(keycodeMatch[1]);
    keycodeMatch = KEYCODE_PATTERN.exec(stripped);
  }

  ALIAS_PATTERN.lastIndex = 0;
  let aliasMatch = ALIAS_PATTERN.exec(stripped);
  while (aliasMatch !== null) {
    aliases.set(aliasMatch[1], aliasMatch[2]);
    aliasMatch = ALIAS_PATTERN.exec(stripped);
  }

  return { aliases, canonical };
}

export function createKeycodeCanonicalizer(xkbRoot) {
  const aliases = new Map();
  const canonical = new Set();

  for (const file of ["evdev", "aliases"]) {
    const filePath = path.join(xkbRoot, "keycodes", file);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const parsed = parseKeycodeAliases(fs.readFileSync(filePath, "utf8"));
    for (const name of parsed.canonical) {
      canonical.add(name);
    }
    for (const [alias, target] of parsed.aliases) {
      if (!aliases.has(alias)) {
        aliases.set(alias, target);
      }
    }
  }

  for (const [alias, target] of Object.entries(SUPPLEMENTAL_KEYCODE_ALIASES)) {
    if (!aliases.has(alias)) {
      aliases.set(alias, target);
    }
  }

  function canonicalize(keycode) {
    let current = keycode;
    for (let step = 0; step < 8; step += 1) {
      const target = aliases.get(current);
      if (target === undefined || target === current) {
        return current;
      }
      current = target;
    }
    return current;
  }

  return { canonicalize, aliases, canonical };
}
