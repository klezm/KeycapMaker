import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  createKeycapParamsForKey,
  GERMAN_LEGEND_FONT_KEY,
  HEBREW_LEGEND_FONT_KEY,
  ISO_105_DE_HE_KEYS,
  KEY_PITCH_MM,
  resolveKeyCenterMm,
  resolveShapeProfileForKey,
  SYMBOL_LEGEND_FONT_KEY,
  unitsToBodyMm,
} from "../src/data/keysets/iso-105-de-he.js";
import { createDefaultKeycapParams } from "../src/data/keycap-shape-registry.js";
import { resolveKeycapLegendFont } from "../src/lib/keycap-fonts.js";

const FONTS_ROOT = fileURLToPath(new URL("../public/fonts/", import.meta.url));

/** Codepoints a TTF's cmap can render (formats 4 and 12). */
async function readCoveredCodepoints(fileName) {
  const data = await readFile(FONTS_ROOT + fileName);
  const tableCount = data.readUInt16BE(4);
  const tableOffsets = {};
  for (let index = 0; index < tableCount; index += 1) {
    const record = 12 + (index * 16);
    tableOffsets[data.toString("latin1", record, record + 4)] = data.readUInt32BE(record + 8);
  }

  const cmapOffset = tableOffsets.cmap;
  assert.ok(cmapOffset !== undefined, `${fileName} should have a cmap table`);
  const subtableCount = data.readUInt16BE(cmapOffset + 2);
  const covered = new Set();

  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmapOffset + 4 + (index * 8);
    const subtable = cmapOffset + data.readUInt32BE(record + 4);
    const format = data.readUInt16BE(subtable);

    if (format === 4) {
      const segCountX2 = data.readUInt16BE(subtable + 6);
      const segCount = segCountX2 / 2;
      for (let seg = 0; seg < segCount; seg += 1) {
        const end = data.readUInt16BE(subtable + 14 + (2 * seg));
        const start = data.readUInt16BE(subtable + 16 + segCountX2 + (2 * seg));
        if (end === 0xFFFF) {
          continue;
        }
        for (let codePoint = start; codePoint <= end; codePoint += 1) {
          covered.add(codePoint);
        }
      }
    } else if (format === 12) {
      const groupCount = data.readUInt32BE(subtable + 12);
      for (let group = 0; group < groupCount; group += 1) {
        const record12 = subtable + 16 + (group * 12);
        const start = data.readUInt32BE(record12);
        const end = data.readUInt32BE(record12 + 4);
        for (let codePoint = start; codePoint <= end; codePoint += 1) {
          covered.add(codePoint);
        }
      }
    }
  }

  return covered;
}

test("the ISO keyset describes a complete, non-overlapping 105-key board", () => {
  assert.equal(ISO_105_DE_HE_KEYS.length, 105);

  const ids = ISO_105_DE_HE_KEYS.map((key) => key.id);
  assert.equal(new Set(ids).size, ids.length, "key ids should be unique");

  // Occupancy at 0.25u resolution. The ISO Enter is the one key whose bounding
  // box is not entirely filled: its bottom-left 0.25u x 1u notch is cut away,
  // which is exactly what lets the `#` key sit beside it.
  const enterKey = ISO_105_DE_HE_KEYS.find((key) => key.id === "enter");
  const notchCells = new Set();
  for (let dy = 1; dy < 2; dy += 0.25) {
    notchCells.add(`${enterKey.x.toFixed(2)},${(enterKey.y + dy).toFixed(2)}`);
  }

  const occupied = new Map();
  for (const key of ISO_105_DE_HE_KEYS) {
    const width = key.w ?? 1;
    const height = key.h ?? 1;
    for (let dx = 0; dx < width - 1e-9; dx += 0.25) {
      for (let dy = 0; dy < height - 1e-9; dy += 0.25) {
        const cell = `${(key.x + dx).toFixed(2)},${(key.y + dy).toFixed(2)}`;
        if (key.id === enterKey.id && notchCells.has(cell)) {
          continue;
        }
        assert.ok(
          !occupied.has(cell),
          `${key.id} overlaps ${occupied.get(cell)} at ${cell}`,
        );
        occupied.set(cell, key.id);
      }
    }
  }
});

test("each main-block row spans exactly 15u", () => {
  // The alpha rows of an ISO board are all 15u wide; the ISO Enter is what makes
  // the QWERTZ and home rows come out even despite having different key counts.
  const rowRightEdges = new Map();
  for (const key of ISO_105_DE_HE_KEYS) {
    if (key.x >= 15.1) {
      continue;
    }
    const width = key.w ?? 1;
    const height = key.h ?? 1;
    for (let dy = 0; dy < height - 1e-9; dy += 1) {
      const row = key.y + dy;
      rowRightEdges.set(row, Math.max(rowRightEdges.get(row) ?? 0, key.x + width));
    }
  }

  for (const row of [1.5, 2.5, 3.5, 4.5, 5.5]) {
    assert.equal(rowRightEdges.get(row), 15, `row y=${row} should end at 15u`);
  }
});

test("Hebrew legends cover all 27 SI-1452 letters, keyed by physical position", () => {
  const withHebrew = ISO_105_DE_HE_KEYS.filter((key) => key.he);
  assert.equal(withHebrew.length, 27);
  assert.equal(new Set(withHebrew.map((key) => key.he)).size, 27, "no Hebrew letter should repeat");

  const byId = new Map(ISO_105_DE_HE_KEYS.map((key) => [key.id, key]));
  // SI-1452 is positional, so on QWERTZ the `z` key keeps tet and `y` keeps zayin.
  assert.equal(byId.get("z").he, "ט", "AD06 (German z) carries tet");
  assert.equal(byId.get("y").he, "ז", "AB01 (German y) carries zayin");
  assert.equal(byId.get("a").he, "ש", "AC01 carries shin");
  assert.equal(byId.get("t").he, "א", "AD05 carries aleph");
  // Final forms live on their SI-1452 positions.
  assert.equal(byId.get("l").he, "ך", "AC09 carries final kaph");
  assert.equal(byId.get("period").he, "ץ", "AB09 carries final tsadi");

  // Keys whose SI-1452 base character is Latin punctuation get no Hebrew legend.
  for (const id of ["q", "w", "udiaeresis", "plus", "adiaeresis", "numbersign", "minus", "grave"]) {
    assert.equal(byId.get(id).he, undefined, `${id} should have no Hebrew legend`);
  }
});

test("every legend glyph exists in the font that will render it", async () => {
  const [latin, hebrew, symbol] = await Promise.all([
    readCoveredCodepoints("NotoSans-Variable.ttf"),
    readCoveredCodepoints("NotoSansHebrew-Variable.ttf"),
    readCoveredCodepoints("MPLUS1p-Regular.ttf"),
  ]);
  const coverageByFontKey = new Map([
    [GERMAN_LEGEND_FONT_KEY, latin],
    [HEBREW_LEGEND_FONT_KEY, hebrew],
    [SYMBOL_LEGEND_FONT_KEY, symbol],
  ]);

  for (const key of ISO_105_DE_HE_KEYS) {
    const params = createKeycapParamsForKey(key, createDefaultKeycapParams(resolveShapeProfileForKey(key)));

    for (const [text, fontKey] of [
      [params.legendText, params.legendFontKey],
      [params.topLegendRightBottomText, params.topLegendRightBottomFontKey],
    ]) {
      if (!text) {
        continue;
      }
      const covered = coverageByFontKey.get(fontKey);
      assert.ok(covered, `${key.id} uses an unmapped font ${fontKey}`);
      for (const character of text) {
        assert.ok(
          covered.has(character.codePointAt(0)),
          `${key.id}: "${character}" (U+${character.codePointAt(0).toString(16).toUpperCase()}) is missing from ${fontKey}`,
        );
      }
    }
  }
});

test("legend fonts referenced by the keyset are registered in the app", () => {
  for (const fontKey of [GERMAN_LEGEND_FONT_KEY, HEBREW_LEGEND_FONT_KEY, SYMBOL_LEGEND_FONT_KEY]) {
    const font = resolveKeycapLegendFont(fontKey);
    assert.ok(font && !font.isMissing, `${fontKey} should resolve to a bundled font`);
  }
});

test("descriptors convert into keycap params with shine-through legends", () => {
  const byId = new Map(ISO_105_DE_HE_KEYS.map((key) => [key.id, key]));

  const aKey = byId.get("a");
  const aParams = createKeycapParamsForKey(aKey, createDefaultKeycapParams("custom-shell"));
  assert.equal(aParams.keyWidth, 18);
  assert.equal(aParams.keyDepth, 18);
  assert.equal(aParams.legendText, "A");
  assert.equal(aParams.topLegendRightBottomText, "ש");
  assert.equal(aParams.legendShineThroughEnabled, true);
  assert.equal(aParams.topLegendRightBottomShineThroughEnabled, true);
  // A flush, full-depth insert needs no extra embed of its own.
  assert.equal(aParams.legendEmbed, 0);
  assert.equal(aParams.legendHeight, 0);

  // Shine-through can be turned off wholesale for a plain opaque set.
  const opaque = createKeycapParamsForKey(aKey, createDefaultKeycapParams("custom-shell"), { shineThrough: false });
  assert.equal(opaque.legendShineThroughEnabled, false);
  assert.equal(opaque.topLegendRightBottomShineThroughEnabled, false);

  // A key with no Hebrew letter leaves the corner slot off entirely.
  const escParams = createKeycapParamsForKey(byId.get("esc"), createDefaultKeycapParams("custom-shell"));
  assert.equal(escParams.topLegendRightBottomEnabled, false);
  assert.equal(escParams.legendOffsetX, 0);

  // Spacebar carries no legend at all, so nothing is cut through it.
  const spaceParams = createKeycapParamsForKey(byId.get("space"), createDefaultKeycapParams("custom-shell"));
  assert.equal(spaceParams.legendEnabled, false);
  assert.equal(spaceParams.legendShineThroughEnabled, false);
  assert.equal(spaceParams.keyWidth, unitsToBodyMm(6.25));

  // Homing bumps land on F, J and numpad 5.
  assert.deepEqual(
    ISO_105_DE_HE_KEYS.filter((key) => key.homing).map((key) => key.id).sort(),
    ["f", "j", "kp5"],
  );
});

test("the ISO Enter uses the tall notched footprint", () => {
  const enterKey = ISO_105_DE_HE_KEYS.find((key) => key.id === "enter");
  assert.equal(resolveShapeProfileForKey(enterKey), "jis-enter");

  const params = createKeycapParamsForKey(enterKey, createDefaultKeycapParams("jis-enter"));
  assert.equal(params.keyWidth, unitsToBodyMm(1.5));
  assert.equal(params.keyDepth, unitsToBodyMm(2));
  assert.ok(
    Math.abs(params.jisEnterNotchWidth - (0.25 * KEY_PITCH_MM)) < 1e-9,
    "notch should be 0.25u wide",
  );
  assert.ok(
    Math.abs(params.jisEnterNotchDepth - (unitsToBodyMm(2) / 2)) < 1e-9,
    "notch should be one row deep",
  );
});

test("key centers sit on the 19.05mm pitch grid with the board upright", () => {
  const byId = new Map(ISO_105_DE_HE_KEYS.map((key) => [key.id, key]));

  const esc = resolveKeyCenterMm(byId.get("esc"));
  assert.ok(Math.abs(esc.x - (0.5 * KEY_PITCH_MM)) < 1e-9);
  assert.ok(Math.abs(esc.y - (-0.5 * KEY_PITCH_MM)) < 1e-9);

  // The function row is the top row, so its centers are above the modifier row.
  const ctrl = resolveKeyCenterMm(byId.get("lctrl"));
  assert.ok(esc.y > ctrl.y, "function row should sit above the modifier row");

  // A 2u-wide key is centered on its span, not on its left edge.
  const space = resolveKeyCenterMm(byId.get("space"));
  assert.ok(Math.abs(space.x - ((3.75 + 3.125) * KEY_PITCH_MM)) < 1e-9);
});
