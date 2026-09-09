import { isCasePair } from "./key-type-resolver.js";

export const KEYCAP_LEGEND_SLOTS = Object.freeze([
  "legend",
  "topLegendLeftTop",
  "topLegendRightTop",
  "topLegendLeftBottom",
  "topLegendRightBottom",
]);

const LEVEL_SLOTS = Object.freeze({
  1: "topLegendLeftBottom",
  2: "topLegendLeftTop",
  3: "topLegendRightBottom",
  4: "topLegendRightTop",
});

export function resolveKeysymLegend(keysym, keysymTable) {
  const entry = keysymTable[keysym];
  if (entry === undefined) {
    return null;
  }
  const text = entry.char ?? entry.label ?? null;
  if (text === null) {
    return null;
  }
  return { text, keysym, dead: entry.dead === true, printable: entry.char !== undefined };
}

function createSlotEntry(level, legend) {
  return {
    text: legend.text,
    keysym: legend.keysym,
    level: level.level,
    modifier: level.modifierName,
    dead: legend.dead,
  };
}

export function resolveKeycapLegends(key, keysymTable, fallbackLabel) {
  const legends = key.levels.map((level) => ({ level, legend: resolveKeysymLegend(level.keysym, keysymTable) }));
  const present = legends.filter((entry) => entry.legend !== null);
  const slots = {};

  if (present.length === 0) {
    if (fallbackLabel !== undefined && fallbackLabel !== null) {
      slots.legend = { text: fallbackLabel, keysym: null, level: null, modifier: null, dead: false };
    }
    return slots;
  }

  const first = present[0];
  const second = present.find((entry) => entry.level.level === 2) ?? null;

  const cased =
    second !== null &&
    first.level.level === 1 &&
    isCasePair(first.legend.printable ? first.legend.text : null, second.legend.printable ? second.legend.text : null);

  const namedKey = first.level.level === 1 && !first.legend.printable;

  const consumed = new Set();

  if (cased) {
    slots.legend = createSlotEntry(second.level, second.legend);
    consumed.add(1);
    consumed.add(2);
  } else if (namedKey) {
    slots.legend = createSlotEntry(first.level, first.legend);
    for (const entry of present) {
      consumed.add(entry.level.level);
    }
  }

  const seenText = new Set(Object.values(slots).map((slot) => slot.text));

  for (const entry of present) {
    if (consumed.has(entry.level.level)) {
      continue;
    }
    const slotName = LEVEL_SLOTS[entry.level.level];
    if (slotName === undefined || Object.hasOwn(slots, slotName)) {
      continue;
    }
    if (seenText.has(entry.legend.text)) {
      continue;
    }
    slots[slotName] = createSlotEntry(entry.level, entry.legend);
    seenText.add(entry.legend.text);
  }

  if (Object.keys(slots).length === 0 && fallbackLabel !== undefined && fallbackLabel !== null) {
    slots.legend = { text: fallbackLabel, keysym: null, level: null, modifier: null, dead: false };
  }

  return slots;
}
