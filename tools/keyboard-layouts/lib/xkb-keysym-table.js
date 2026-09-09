import {
  ALIAS_CHARACTER_LEGENDS,
  DEAD_KEY_LABELS,
  DEAD_KEY_LEGENDS,
  DIGRAPH_LEGENDS,
  KEYPAD_LABELS,
  KEYPAD_LEGENDS,
  NAMED_KEY_LABELS,
  isEmptyKeysym,
  resolveBrailleLabel,
  resolveVendorKeyLabel,
} from "./keysym-legends.js";

const DEFINE_PATTERN = /^#define\s+XK_(\w+)\s+0x([0-9a-fA-F]+)(?:\s*\/\*\s*\(?\s*U\+([0-9A-Fa-f]{4,6}))?/gm;
const UNICODE_KEYSYM_PATTERN = /^U([0-9A-Fa-f]{1,6})$/;
const HEX_KEYSYM_PATTERN = /^0x([0-9A-Fa-f]+)$/;
const LATIN1_MIN = 0x20;
const LATIN1_MAX = 0xff;
const UNICODE_KEYSYM_BASE = 0x01000000;
const UNICODE_KEYSYM_MASK = 0x00ffffff;

function codepointFromKeysymValue(value) {
  if (value >= LATIN1_MIN && value <= LATIN1_MAX) {
    return value;
  }
  if ((value & 0xff000000) === UNICODE_KEYSYM_BASE) {
    return value & UNICODE_KEYSYM_MASK;
  }
  return null;
}

function characterFromCodepoint(codepoint) {
  if (codepoint === null || codepoint < LATIN1_MIN) {
    return null;
  }
  if (codepoint >= 0x7f && codepoint <= 0x9f) {
    return null;
  }
  return String.fromCodePoint(codepoint);
}

export function parseKeysymHeader(source) {
  const entries = new Map();
  let match = DEFINE_PATTERN.exec(source);

  while (match !== null) {
    const [, name, hexValue, unicodeHex] = match;
    if (!entries.has(name)) {
      entries.set(name, {
        value: Number.parseInt(hexValue, 16),
        codepoint: unicodeHex === undefined ? null : Number.parseInt(unicodeHex, 16),
      });
    }
    match = DEFINE_PATTERN.exec(source);
  }

  DEFINE_PATTERN.lastIndex = 0;
  return entries;
}

export function resolveKeysymEntry(name, headerEntries) {
  if (isEmptyKeysym(name)) {
    return { char: null, label: null, empty: true };
  }

  if (Object.hasOwn(DEAD_KEY_LEGENDS, name)) {
    return { char: DEAD_KEY_LEGENDS[name], label: null, dead: true };
  }

  if (Object.hasOwn(DEAD_KEY_LABELS, name)) {
    return { char: null, label: DEAD_KEY_LABELS[name], dead: true };
  }

  if (Object.hasOwn(KEYPAD_LEGENDS, name)) {
    return { char: KEYPAD_LEGENDS[name], label: null, keypad: true };
  }

  if (Object.hasOwn(KEYPAD_LABELS, name)) {
    return { char: null, label: KEYPAD_LABELS[name], keypad: true };
  }

  if (Object.hasOwn(DIGRAPH_LEGENDS, name)) {
    return { char: DIGRAPH_LEGENDS[name], label: null };
  }

  if (Object.hasOwn(ALIAS_CHARACTER_LEGENDS, name)) {
    return { char: ALIAS_CHARACTER_LEGENDS[name], label: null };
  }

  if (Object.hasOwn(NAMED_KEY_LABELS, name)) {
    return { char: null, label: NAMED_KEY_LABELS[name] };
  }

  const functionKey = /^F(\d{1,2})$/.exec(name);
  if (functionKey !== null) {
    return { char: null, label: `F${functionKey[1]}` };
  }

  const unicodeKeysym = UNICODE_KEYSYM_PATTERN.exec(name);
  if (unicodeKeysym !== null) {
    return { char: characterFromCodepoint(Number.parseInt(unicodeKeysym[1], 16)), label: null };
  }

  const hexKeysym = HEX_KEYSYM_PATTERN.exec(name);
  if (hexKeysym !== null) {
    return {
      char: characterFromCodepoint(codepointFromKeysymValue(Number.parseInt(hexKeysym[1], 16))),
      label: null,
    };
  }

  const headerEntry = headerEntries.get(name);
  if (headerEntry === undefined) {
    const brailleLabel = resolveBrailleLabel(name);
    if (brailleLabel !== null) {
      return { char: null, label: brailleLabel };
    }
    const vendorLabel = resolveVendorKeyLabel(name);
    if (vendorLabel !== null) {
      return { char: null, label: vendorLabel };
    }
    return { char: null, label: null };
  }

  const codepoint = headerEntry.codepoint ?? codepointFromKeysymValue(headerEntry.value);
  const character = characterFromCodepoint(codepoint);
  if (character !== null) {
    return { char: character, label: null };
  }

  const brailleLabel = resolveBrailleLabel(name);
  if (brailleLabel !== null) {
    return { char: null, label: brailleLabel };
  }

  const vendorLabel = resolveVendorKeyLabel(name);
  return { char: null, label: vendorLabel };
}

export function createKeysymTable(headerSource, usedKeysyms) {
  const headerEntries = parseKeysymHeader(headerSource);
  const table = {};
  const unmapped = [];

  for (const name of [...usedKeysyms].sort()) {
    const entry = resolveKeysymEntry(name, headerEntries);
    if (entry.empty === true) {
      continue;
    }
    if (entry.char === null && entry.label === null) {
      unmapped.push(name);
      continue;
    }
    const value = {};
    if (entry.char !== null) {
      value.char = entry.char;
    }
    if (entry.label !== null) {
      value.label = entry.label;
    }
    if (entry.dead === true) {
      value.dead = true;
    }
    table[name] = value;
  }

  return { table, unmapped };
}
