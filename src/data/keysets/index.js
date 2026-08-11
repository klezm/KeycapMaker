// Keyset registry: joins a physical layout with one or two language tables and
// resolves the result into keycap params the SCAD bridge can render.
//
// The split matters because the same xkb code moves between layouts - BKSL is
// `#` on the German ISO home row but `\` at the end of the ANSI upper row - so
// position and legend cannot live in the same table.

import { ISO_105_LAYOUT } from "./layouts/iso-105.js";
import { ANSI_104_LAYOUT } from "./layouts/ansi-104.js";
import { getModifierLabels } from "./modifier-labels.js";

import de from "./languages/de.json" with { type: "json" };
import us from "./languages/us.json" with { type: "json" };
import gb from "./languages/gb.json" with { type: "json" };
import fr from "./languages/fr.json" with { type: "json" };
import es from "./languages/es.json" with { type: "json" };
import it from "./languages/it.json" with { type: "json" };
import ru from "./languages/ru.json" with { type: "json" };
import gr from "./languages/gr.json" with { type: "json" };
import il from "./languages/il.json" with { type: "json" };

// 19.05mm key pitch, with the same ~1.05mm inter-key gap the shape JSON
// defaults already assume (custom-shell defaults to an 18mm body for 1u).
export const KEY_PITCH_MM = 19.05;
export const KEY_GAP_MM = 1.05;

const LAYOUTS = Object.freeze([ISO_105_LAYOUT, ANSI_104_LAYOUT]);
const LANGUAGES = Object.freeze([de, us, gb, fr, es, it, ru, gr, il]);

const LAYOUT_BY_ID = new Map(LAYOUTS.map((layout) => [layout.id, layout]));
const LANGUAGE_BY_ID = new Map(LANGUAGES.map((language) => [language.id, language]));

export const DEFAULT_LAYOUT_ID = ISO_105_LAYOUT.id;
export const DEFAULT_PRIMARY_LANGUAGE_ID = "de";
export const DEFAULT_SECONDARY_LANGUAGE_ID = "il";

const SHELL_PROFILE = "custom-shell";
const ISO_ENTER_PROFILE = "jis-enter";

// Noto Sans covers Latin, Greek and Cyrillic but not Hebrew, and has no arrow
// glyphs at all. Each script is routed to a font that can actually draw it; a
// test asserts every legend glyph exists in the font chosen here.
const FONT_BY_SCRIPT = Object.freeze({
  latin: "noto-sans-variable",
  greek: "noto-sans-variable",
  cyrillic: "noto-sans-variable",
  hebrew: "noto-sans-hebrew-variable",
});
const DEFAULT_LEGEND_FONT_KEY = "noto-sans-variable";
export const SYMBOL_LEGEND_FONT_KEY = "mplus1p-regular";
const SYMBOL_LEGEND_CHARS = new Set(["←", "↑", "→", "↓", "↵"]);

// An MX stem is a hollow cylinder whose wall blocks the light path in the four
// diagonal quadrants from roughly 1mm to 2.75mm out from the key center (the
// clear cross at the very center is the switch slot, too narrow to light a
// glyph). Legends therefore sit outside that ring, which is also why real
// backlit boards use north-facing legends.
//
// These values were tuned by measuring the built meshes: with them, every
// single-character legend has a completely unobstructed light path. Pushing
// further north does not help, it just runs the long labels off the top face
// onto the shoulder. Multi-letter words ("Feststell") are wider than the clear
// annulus, so part of those still sits over the stem; that is inherent to
// putting a long word on a 1u cap with a stem underneath.
const LEGEND_NORTH_SHIFT_MM = 3.6;
const LEGEND_QUADRANT_SHIFT_MM = 3.6;

/** Body size in mm for a key spanning `units` of pitch. */
export function unitsToBodyMm(units) {
  return (units * KEY_PITCH_MM) - KEY_GAP_MM;
}

export function listKeysetLayouts() {
  return LAYOUTS.map((layout) => ({ id: layout.id, label: layout.label, keyCount: layout.keyCount }));
}

export function listKeysetLanguages() {
  return LANGUAGES.map((language) => ({
    id: language.id,
    label: language.label,
    script: language.script,
  }));
}

export function resolveKeysetLayout(layoutId = DEFAULT_LAYOUT_ID) {
  return LAYOUT_BY_ID.get(layoutId) ?? ISO_105_LAYOUT;
}

export function resolveKeysetLanguage(languageId) {
  return LANGUAGE_BY_ID.get(languageId) ?? null;
}

function resolveLegendFontKey(text, language) {
  if ([...String(text)].some((character) => SYMBOL_LEGEND_CHARS.has(character))) {
    return SYMBOL_LEGEND_FONT_KEY;
  }
  return FONT_BY_SCRIPT[language?.script] ?? DEFAULT_LEGEND_FONT_KEY;
}

// A secondary legend is only worth engraving when it is actually in the second
// language's own script. Every layout puts some shared punctuation on the
// letter block - SI-1452 has `/`, `'`, `[`, `]`, `,`, `.` and `\` among the
// Hebrew letters - and repeating those beside the primary legend is noise, not
// information. Unicode script properties draw the line for us: digits and
// ASCII punctuation are Script=Common, so they never match.
const SCRIPT_PATTERNS = Object.freeze({
  latin: /\p{Script=Latin}/u,
  greek: /\p{Script=Greek}/u,
  cyrillic: /\p{Script=Cyrillic}/u,
  hebrew: /\p{Script=Hebrew}/u,
});

function isInScript(text, script) {
  const pattern = SCRIPT_PATTERNS[script];
  return pattern ? pattern.test(text) : Boolean(text);
}

/**
 * The legend a key shows in one language: a character from the generated table,
 * or an authored word for the modifier and function keys.
 */
function resolveKeyLegend(code, language, { includeWordLabels }) {
  const character = language?.legends?.[code];
  if (character) {
    return character;
  }
  if (!includeWordLabels) {
    return "";
  }
  return getModifierLabels(language?.id)[code] ?? "";
}

// A long word like "Feststell" has to shrink to stay on the cap; the app never
// auto-fits, so the size comes from the label length and the key width.
function resolveLegendSize(label, widthUnits) {
  const length = [...String(label)].length;
  if (length <= 1) {
    return 5;
  }
  const availableMm = unitsToBodyMm(widthUnits) * 0.72;
  // ~0.62em advance per character at these sizes.
  return Math.max(1.6, Math.min(4, availableMm / (length * 0.62)));
}

/** Board-space center of a key, in mm, with +x right and +y up. */
export function resolveKeyCenterMm(key) {
  const widthUnits = key.w ?? 1;
  const heightUnits = key.h ?? 1;
  return {
    x: (key.x + (widthUnits / 2)) * KEY_PITCH_MM,
    // Layout y grows downward; flip it so the board reads the right way up.
    y: -(key.y + (heightUnits / 2)) * KEY_PITCH_MM,
  };
}

/** Shape profile key to feed createDefaultKeycapParams() for a layout key. */
export function resolveShapeProfileForKey(key) {
  return key.shape === "iso-enter" ? ISO_ENTER_PROFILE : SHELL_PROFILE;
}

/**
 * Turn one layout key plus its resolved legends into SCAD bridge params.
 * `defaults` must come from createDefaultKeycapParams() for the key's profile.
 */
export function createKeycapParamsForKey(key, defaults, options = {}) {
  const {
    primaryText = "",
    secondaryText = "",
    primaryLanguage = null,
    secondaryLanguage = null,
    shineThrough = true,
  } = options;

  const widthUnits = key.w ?? 1;
  const heightUnits = key.h ?? 1;
  const isIsoEnter = key.shape === "iso-enter";
  const hasPrimary = String(primaryText).length > 0;
  const hasSecondary = String(secondaryText).length > 0;

  return {
    ...defaults,
    name: key.code,
    keyWidth: unitsToBodyMm(widthUnits),
    keyDepth: unitsToBodyMm(heightUnits),
    ...(isIsoEnter
      ? {
        // 0.25u x 1u notch, matching the ISO Enter footprint.
        jisEnterNotchWidth: 0.25 * KEY_PITCH_MM,
        jisEnterNotchDepth: unitsToBodyMm(heightUnits) / 2,
      }
      : {}),

    stemEnabled: true,
    stemType: "mx",
    homingBarEnabled: Boolean(key.homing),

    // Primary legend, centered but clear of the stem.
    legendEnabled: hasPrimary,
    legendContentType: "text",
    legendText: primaryText,
    legendFontKey: resolveLegendFontKey(primaryText, primaryLanguage),
    legendFontStyleKey: "medium",
    legendSize: resolveLegendSize(primaryText, widthUnits),
    legendHeight: 0,
    legendEmbed: 0,
    legendShineThroughEnabled: shineThrough && hasPrimary,
    legendOffsetX: hasSecondary ? -LEGEND_QUADRANT_SHIFT_MM : 0,
    legendOffsetY: hasSecondary ? LEGEND_QUADRANT_SHIFT_MM : LEGEND_NORTH_SHIFT_MM,

    // Secondary legend, bottom-right - the usual placement on bilingual
    // keycaps, and the natural side for a right-to-left script.
    topLegendRightBottomEnabled: hasSecondary,
    topLegendRightBottomContentType: "text",
    topLegendRightBottomText: secondaryText,
    topLegendRightBottomFontKey: resolveLegendFontKey(secondaryText, secondaryLanguage),
    topLegendRightBottomFontStyleKey: "medium",
    topLegendRightBottomSize: 3.6,
    topLegendRightBottomHeight: 0,
    topLegendRightBottomEmbed: 0,
    topLegendRightBottomShineThroughEnabled: shineThrough && hasSecondary,
    // The right-bottom anchor already sits ~4.5mm out on a 1u key, clear of the
    // stem; these nudge it back toward the face so it does not crowd the edge.
    topLegendRightBottomOffsetX: -0.6,
    topLegendRightBottomOffsetY: 0.6,
  };
}

/**
 * Build a complete keyset description.
 *
 * Returns one entry per physical key with its resolved legends, its board
 * position in mm, and the shape profile to render it with. Params are produced
 * lazily by the caller (which knows how to build shape defaults) via
 * createKeycapParamsForKey, or eagerly when `createDefaults` is supplied.
 */
export function buildKeyset({
  layoutId = DEFAULT_LAYOUT_ID,
  primaryLanguageId = DEFAULT_PRIMARY_LANGUAGE_ID,
  secondaryLanguageId = null,
  shineThrough = true,
  createDefaults = null,
} = {}) {
  const layout = resolveKeysetLayout(layoutId);
  const primaryLanguage = resolveKeysetLanguage(primaryLanguageId);
  const secondaryLanguage = resolveKeysetLanguage(secondaryLanguageId);

  const keys = layout.keys.map((key) => {
    const primaryText = resolveKeyLegend(key.code, primaryLanguage, { includeWordLabels: true });
    // Only characters carry over to the secondary legend: repeating "Strg" in a
    // second language on the same cap would be noise, and there is no room.
    const rawSecondary = resolveKeyLegend(key.code, secondaryLanguage, { includeWordLabels: false });
    const secondaryText = rawSecondary && rawSecondary !== primaryText
      && isInScript(rawSecondary, secondaryLanguage?.script)
      ? rawSecondary
      : "";

    const entry = {
      code: key.code,
      x: key.x,
      y: key.y,
      w: key.w ?? 1,
      h: key.h ?? 1,
      shape: key.shape ?? null,
      homing: Boolean(key.homing),
      primaryText,
      secondaryText,
      shapeProfile: resolveShapeProfileForKey(key),
      position: resolveKeyCenterMm(key),
    };

    if (createDefaults) {
      entry.params = createKeycapParamsForKey(key, createDefaults(entry.shapeProfile), {
        primaryText,
        secondaryText,
        primaryLanguage,
        secondaryLanguage,
        shineThrough,
      });
    }

    return entry;
  });

  return {
    layout: { id: layout.id, label: layout.label, keyCount: layout.keyCount },
    primaryLanguage: primaryLanguage
      ? { id: primaryLanguage.id, label: primaryLanguage.label, script: primaryLanguage.script }
      : null,
    secondaryLanguage: secondaryLanguage
      ? { id: secondaryLanguage.id, label: secondaryLanguage.label, script: secondaryLanguage.script }
      : null,
    shineThrough,
    keys,
  };
}
