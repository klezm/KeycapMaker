import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  buildKeyset,
  createKeycapParamsForKey,
  KEY_PITCH_MM,
  listKeysetLanguages,
  listKeysetLayouts,
  resolveKeysetLayout,
  resolveKeyCenterMm,
  resolveShapeProfileForKey,
  SYMBOL_LEGEND_FONT_KEY,
  unitsToBodyMm,
} from "../src/data/keysets/index.js";
import { getModifierLabels, hasAuthoredModifierLabels } from "../src/data/keysets/modifier-labels.js";
import { createDefaultKeycapParams } from "../src/data/keycap-shape-registry.js";
import { resolveKeycapLegendFont } from "../src/lib/keycap-fonts.js";
import { arrangeIntoGrid, measureKeycapBounds } from "../src/lib/keyset-layout.js";

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

function keysByCode(keyset) {
  return new Map(keyset.keys.map((key) => [key.code, key]));
}

test("both layouts describe a complete, non-overlapping board", () => {
  for (const layoutMeta of listKeysetLayouts()) {
    const layout = resolveKeysetLayout(layoutMeta.id);
    assert.equal(layout.keys.length, layoutMeta.keyCount, `${layout.id} key count`);

    const codes = layout.keys.map((key) => key.code);
    assert.equal(new Set(codes).size, codes.length, `${layout.id} codes should be unique`);

    // Occupancy at 0.25u resolution. The ISO Enter is the one key whose bounding
    // box is not entirely filled: its bottom-left 0.25u x 1u notch is cut away,
    // which is exactly what lets the BKSL key sit beside it.
    const isoEnter = layout.keys.find((key) => key.shape === "iso-enter");
    const notchCells = new Set();
    if (isoEnter) {
      for (let dy = 1; dy < 2; dy += 0.25) {
        notchCells.add(`${isoEnter.x.toFixed(2)},${(isoEnter.y + dy).toFixed(2)}`);
      }
    }

    const occupied = new Map();
    for (const key of layout.keys) {
      const width = key.w ?? 1;
      const height = key.h ?? 1;
      for (let dx = 0; dx < width - 1e-9; dx += 0.25) {
        for (let dy = 0; dy < height - 1e-9; dy += 0.25) {
          const cell = `${(key.x + dx).toFixed(2)},${(key.y + dy).toFixed(2)}`;
          if (key.shape === "iso-enter" && notchCells.has(cell)) {
            continue;
          }
          assert.ok(
            !occupied.has(cell),
            `${layout.id}: ${key.code} overlaps ${occupied.get(cell)} at ${cell}`,
          );
          occupied.set(cell, key.code);
        }
      }
    }
  }
});

test("each main-block row spans exactly 15u on both layouts", () => {
  // The alpha rows of a full-size board are all 15u wide. On ISO the tall Enter
  // is what makes the upper and home rows come out even despite different key
  // counts; on ANSI it is the 1.5u backslash and the 2.25u Enter and shift.
  for (const layoutMeta of listKeysetLayouts()) {
    const layout = resolveKeysetLayout(layoutMeta.id);
    const rowRightEdges = new Map();

    for (const key of layout.keys) {
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
      assert.equal(rowRightEdges.get(row), 15, `${layout.id} row y=${row} should end at 15u`);
    }
  }
});

test("ANSI differs from ISO in exactly the ways a real ANSI board does", () => {
  const iso = resolveKeysetLayout("iso-105");
  const ansi = resolveKeysetLayout("ansi-104");
  const isoCodes = new Set(iso.keys.map((key) => key.code));
  const ansiCodes = new Set(ansi.keys.map((key) => key.code));

  // The only key ANSI drops is the one beside the left shift.
  const missing = [...isoCodes].filter((code) => !ansiCodes.has(code));
  assert.deepEqual(missing, ["LSGT"]);
  assert.equal([...ansiCodes].filter((code) => !isoCodes.has(code)).length, 0);

  const isoKeys = new Map(iso.keys.map((key) => [key.code, key]));
  const ansiKeys = new Map(ansi.keys.map((key) => [key.code, key]));

  // Enter: tall and notched on ISO, a single 2.25u row on ANSI.
  assert.equal(isoKeys.get("RTRN").shape, "iso-enter");
  assert.equal(isoKeys.get("RTRN").h, 2);
  assert.equal(ansiKeys.get("RTRN").shape, undefined);
  assert.equal(ansiKeys.get("RTRN").w, 2.25);

  // BKSL moves from the ISO home row up to the end of the ANSI upper row.
  assert.equal(isoKeys.get("BKSL").y, 3.5);
  assert.equal(ansiKeys.get("BKSL").y, 2.5);
  assert.equal(ansiKeys.get("BKSL").w, 1.5);

  // Left shift takes over the space LSGT left behind.
  assert.equal(isoKeys.get("LFSH").w, 1.25);
  assert.equal(ansiKeys.get("LFSH").w, 2.25);
});

test("German legends follow the DIN layout, sourced from xkb", () => {
  const keys = keysByCode(buildKeyset({ layoutId: "iso-105", primaryLanguageId: "de" }));

  // QWERTZ: Z and Y are swapped relative to QWERTY.
  assert.equal(keys.get("AD06").primaryText, "Z");
  assert.equal(keys.get("AB01").primaryText, "Y");
  assert.deepEqual(
    ["AD01", "AD02", "AD03", "AD04", "AD05", "AD06"].map((code) => keys.get(code).primaryText),
    ["Q", "W", "E", "R", "T", "Z"],
  );

  // Umlauts and eszett sit where German expects them.
  assert.equal(keys.get("AD11").primaryText, "Ü");
  assert.equal(keys.get("AC10").primaryText, "Ö");
  assert.equal(keys.get("AC11").primaryText, "Ä");
  assert.equal(keys.get("AE11").primaryText, "ß");
  assert.equal(keys.get("BKSL").primaryText, "#");
  assert.equal(keys.get("LSGT").primaryText, "<");

  // Modifier words are German, and the spacebar stays blank.
  assert.equal(keys.get("LCTL").primaryText, "Strg");
  assert.equal(keys.get("RALT").primaryText, "Alt Gr");
  assert.equal(keys.get("CAPS").primaryText, "Feststell");
  assert.equal(keys.get("LFSH").primaryText, "Umschalt");
  assert.equal(keys.get("KPDL").primaryText, ",");
  assert.equal(keys.get("SPCE").primaryText, "");
});

test("US legends follow QWERTY and use English modifier words", () => {
  const keys = keysByCode(buildKeyset({ layoutId: "ansi-104", primaryLanguageId: "us" }));

  assert.equal(keys.get("AD06").primaryText, "Y");
  assert.equal(keys.get("AB01").primaryText, "Z");
  assert.equal(keys.get("BKSL").primaryText, "\\");
  assert.equal(keys.get("AC11").primaryText, "'");
  assert.equal(keys.get("LCTL").primaryText, "Ctrl");
  assert.equal(keys.get("CAPS").primaryText, "Caps");
  // The decimal separator is locale-specific.
  assert.equal(keys.get("KPDL").primaryText, ".");
});

test("Hebrew secondaries cover all 27 SI-1452 letters, keyed by physical position", () => {
  const keyset = buildKeyset({ layoutId: "iso-105", primaryLanguageId: "de", secondaryLanguageId: "il" });
  const keys = keysByCode(keyset);
  const withSecondary = keyset.keys.filter((key) => key.secondaryText);

  assert.equal(withSecondary.length, 27);
  assert.equal(new Set(withSecondary.map((key) => key.secondaryText)).size, 27);

  // SI-1452 is positional, so on QWERTZ the `z` key keeps tet and `y` keeps zayin.
  assert.equal(keys.get("AD06").secondaryText, "ט");
  assert.equal(keys.get("AB01").secondaryText, "ז");
  assert.equal(keys.get("AC01").secondaryText, "ש");
  assert.equal(keys.get("AD05").secondaryText, "א");
  // Final forms live on their SI-1452 positions.
  assert.equal(keys.get("AC09").secondaryText, "ך");
  assert.equal(keys.get("AB09").secondaryText, "ץ");
});

test("a secondary legend only appears when it is in that language's own script", () => {
  // SI-1452 puts Latin punctuation among the Hebrew letters (`/` on AD01, `'`
  // on AD02, `\` on BKSL). Repeating those beside the primary legend would be
  // noise, so only real Hebrew characters carry over.
  const hebrew = keysByCode(buildKeyset({
    layoutId: "iso-105",
    primaryLanguageId: "de",
    secondaryLanguageId: "il",
  }));
  for (const code of ["AD01", "AD02", "AD11", "AD12", "AC11", "BKSL", "AB10", "TLDE"]) {
    assert.equal(hebrew.get(code).secondaryText, "", `${code} should have no Hebrew secondary`);
  }

  // Two Latin languages only differ where the letter itself differs, so digits
  // and shared punctuation stay single-legend.
  const french = buildKeyset({ layoutId: "iso-105", primaryLanguageId: "de", secondaryLanguageId: "fr" });
  const frenchKeys = keysByCode(french);
  assert.equal(frenchKeys.get("AE01").secondaryText, "", "digits match, so no secondary");
  assert.equal(frenchKeys.get("AD01").secondaryText, "A", "AZERTY puts A where QWERTZ has Q");
  assert.equal(frenchKeys.get("AD03").secondaryText, "", "E is E in both");

  // Non-Latin scripts come through in full.
  const russian = buildKeyset({ layoutId: "iso-105", primaryLanguageId: "de", secondaryLanguageId: "ru" });
  assert.equal(russian.keys.filter((key) => key.secondaryText).length, 33);

  // No secondary language means no secondary legends at all.
  const single = buildKeyset({ layoutId: "iso-105", primaryLanguageId: "de", secondaryLanguageId: null });
  assert.equal(single.keys.filter((key) => key.secondaryText).length, 0);
});

test("every legend glyph exists in the font that will render it", async () => {
  const [latin, hebrew, symbol] = await Promise.all([
    readCoveredCodepoints("NotoSans-Variable.ttf"),
    readCoveredCodepoints("NotoSansHebrew-Variable.ttf"),
    readCoveredCodepoints("MPLUS1p-Regular.ttf"),
  ]);
  const coverageByFontKey = new Map([
    ["noto-sans-variable", latin],
    ["noto-sans-hebrew-variable", hebrew],
    [SYMBOL_LEGEND_FONT_KEY, symbol],
  ]);

  for (const layout of listKeysetLayouts()) {
    for (const language of listKeysetLanguages()) {
      const keyset = buildKeyset({
        layoutId: layout.id,
        primaryLanguageId: language.id,
        secondaryLanguageId: "il",
        createDefaults: createDefaultKeycapParams,
      });

      for (const key of keyset.keys) {
        for (const [text, fontKey] of [
          [key.params.legendText, key.params.legendFontKey],
          [key.params.topLegendRightBottomText, key.params.topLegendRightBottomFontKey],
        ]) {
          if (!text) {
            continue;
          }
          const covered = coverageByFontKey.get(fontKey);
          assert.ok(covered, `${key.code} uses an unmapped font ${fontKey}`);
          for (const character of text) {
            assert.ok(
              covered.has(character.codePointAt(0)),
              `${layout.id}/${language.id} ${key.code}: "${character}" `
              + `(U+${character.codePointAt(0).toString(16).toUpperCase()}) is missing from ${fontKey}`,
            );
          }
        }
      }
    }
  }
});

test("legend fonts referenced by a keyset are registered in the app", () => {
  const keyset = buildKeyset({
    primaryLanguageId: "de",
    secondaryLanguageId: "il",
    createDefaults: createDefaultKeycapParams,
  });
  const fontKeys = new Set(keyset.keys.flatMap((key) => [
    key.params.legendFontKey,
    key.params.topLegendRightBottomFontKey,
  ]));

  for (const fontKey of fontKeys) {
    const font = resolveKeycapLegendFont(fontKey);
    assert.ok(font && !font.isMissing, `${fontKey} should resolve to a bundled font`);
  }
});

test("keys resolve into params with shine-through legends", () => {
  const keyset = buildKeyset({
    layoutId: "iso-105",
    primaryLanguageId: "de",
    secondaryLanguageId: "il",
    createDefaults: createDefaultKeycapParams,
  });
  const keys = keysByCode(keyset);

  const a = keys.get("AC01").params;
  assert.equal(a.keyWidth, 18);
  assert.equal(a.keyDepth, 18);
  assert.equal(a.legendText, "A");
  assert.equal(a.topLegendRightBottomText, "ש");
  assert.equal(a.legendShineThroughEnabled, true);
  assert.equal(a.topLegendRightBottomShineThroughEnabled, true);
  // A flush, full-depth insert needs no extra embed of its own.
  assert.equal(a.legendEmbed, 0);
  assert.equal(a.legendHeight, 0);

  // Shine-through can be turned off wholesale for a plain opaque set.
  const opaque = buildKeyset({
    primaryLanguageId: "de",
    secondaryLanguageId: "il",
    shineThrough: false,
    createDefaults: createDefaultKeycapParams,
  });
  const opaqueA = keysByCode(opaque).get("AC01").params;
  assert.equal(opaqueA.legendShineThroughEnabled, false);
  assert.equal(opaqueA.topLegendRightBottomShineThroughEnabled, false);

  // A key with no secondary leaves the corner slot off and stays centered.
  const esc = keys.get("ESC").params;
  assert.equal(esc.topLegendRightBottomEnabled, false);
  assert.equal(esc.legendOffsetX, 0);

  // The spacebar carries no legend, so nothing is cut through it.
  const space = keys.get("SPCE").params;
  assert.equal(space.legendEnabled, false);
  assert.equal(space.legendShineThroughEnabled, false);
  assert.equal(space.keyWidth, unitsToBodyMm(6.25));

  // Homing bumps land on the two index-finger keys and numpad 5.
  assert.deepEqual(
    keyset.keys.filter((key) => key.homing).map((key) => key.code).sort(),
    ["AC04", "AC07", "KP5"],
  );
});

test("the ISO Enter uses the tall notched footprint", () => {
  const keyset = buildKeyset({
    layoutId: "iso-105",
    primaryLanguageId: "de",
    createDefaults: createDefaultKeycapParams,
  });
  const enter = keysByCode(keyset).get("RTRN");

  assert.equal(enter.shapeProfile, "jis-enter");
  assert.equal(resolveShapeProfileForKey({ shape: "iso-enter" }), "jis-enter");
  assert.equal(enter.params.keyWidth, unitsToBodyMm(1.5));
  assert.equal(enter.params.keyDepth, unitsToBodyMm(2));
  assert.ok(
    Math.abs(enter.params.jisEnterNotchWidth - (0.25 * KEY_PITCH_MM)) < 1e-9,
    "notch should be 0.25u wide",
  );
  assert.ok(
    Math.abs(enter.params.jisEnterNotchDepth - (unitsToBodyMm(2) / 2)) < 1e-9,
    "notch should be one row deep",
  );

  // ANSI's Enter is an ordinary shell key instead.
  const ansiEnter = keysByCode(buildKeyset({
    layoutId: "ansi-104",
    primaryLanguageId: "us",
    createDefaults: createDefaultKeycapParams,
  })).get("RTRN");
  assert.equal(ansiEnter.shapeProfile, "custom-shell");
  assert.equal(ansiEnter.params.keyWidth, unitsToBodyMm(2.25));
});

test("key centers sit on the 19.05mm pitch grid with the board upright", () => {
  const keys = keysByCode(buildKeyset({ layoutId: "iso-105", primaryLanguageId: "de" }));

  const esc = keys.get("ESC").position;
  assert.ok(Math.abs(esc.x - (0.5 * KEY_PITCH_MM)) < 1e-9);
  assert.ok(Math.abs(esc.y - (-0.5 * KEY_PITCH_MM)) < 1e-9);

  // The function row is the top row, so its centers are above the modifier row.
  assert.ok(esc.y > keys.get("LCTL").position.y, "function row should sit above the modifier row");

  // A wide key is centered on its span, not on its left edge.
  const space = keys.get("SPCE").position;
  assert.ok(Math.abs(space.x - ((3.75 + 3.125) * KEY_PITCH_MM)) < 1e-9);

  assert.deepEqual(resolveKeyCenterMm({ x: 0, y: 0, w: 2, h: 2 }), {
    x: KEY_PITCH_MM,
    y: -KEY_PITCH_MM,
  });
});

test("createKeycapParamsForKey routes arrow legends to a font that has them", () => {
  // Noto Sans has no arrow glyphs, so an arrow legend must not be left with it.
  const params = createKeycapParamsForKey(
    { code: "UP", x: 0, y: 0 },
    createDefaultKeycapParams("custom-shell"),
    { primaryText: "↑", primaryLanguage: { id: "de", script: "latin" } },
  );
  assert.equal(params.legendFontKey, SYMBOL_LEGEND_FONT_KEY);

  const plain = createKeycapParamsForKey(
    { code: "AC01", x: 0, y: 0 },
    createDefaultKeycapParams("custom-shell"),
    { primaryText: "A", primaryLanguage: { id: "de", script: "latin" } },
  );
  assert.equal(plain.legendFontKey, "noto-sans-variable");
});

test("modifier labels fall back to English for languages without their own", () => {
  assert.ok(hasAuthoredModifierLabels("de"));
  assert.ok(hasAuthoredModifierLabels("us"));
  assert.ok(!hasAuthoredModifierLabels("ru"));
  assert.equal(getModifierLabels("de").LCTL, "Strg");
  assert.equal(getModifierLabels("ru").LCTL, "Ctrl", "unauthored languages use the English fallback");
  assert.equal(getModifierLabels("ru").SPCE, "");
});

test("the grid packer places every keycap without collisions", () => {
  // Two footprints that would overlap at their board positions.
  const makeKeycap = (name, width, depth) => ({
    name,
    meshes: [{
      name: "keycap-body",
      colorHex: "#ffffff",
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: width, y: 0, z: 0 },
        { x: width, y: depth, z: 0 },
        { x: 0, y: depth, z: 10 },
      ],
      faces: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]],
    }],
  });
  const keycaps = Array.from({ length: 30 }, (_, index) => makeKeycap(`k${index}`, 18, 18));

  const { placed, widthMm, depthMm } = arrangeIntoGrid(keycaps, 100);
  assert.equal(placed.length, keycaps.length);
  assert.ok(widthMm <= 100 + 1e-9, `packed width ${widthMm} should fit the bed`);
  assert.ok(depthMm > 0);

  const boxes = placed.map((keycap) => {
    const bounds = measureKeycapBounds(keycap);
    return {
      name: keycap.name,
      minX: bounds.minX + keycap.position.x,
      maxX: bounds.maxX + keycap.position.x,
      minY: bounds.minY + keycap.position.y,
      maxY: bounds.maxY + keycap.position.y,
    };
  });

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
      assert.ok(
        overlapX <= 1e-9 || overlapY <= 1e-9,
        `${a.name} overlaps ${b.name} after packing`,
      );
    }
  }
});
