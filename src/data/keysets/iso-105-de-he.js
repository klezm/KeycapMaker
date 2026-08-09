// Full-size ISO 105-key keycap set with German primary legends and Hebrew
// secondary legends, optionally cut as shine-through inserts for LED backlight.
//
// Legend sources (read from the xkb-data package, not transcribed from memory):
//   German: /usr/share/X11/xkb/symbols/de        -> xkb_symbols "basic"
//           (which includes latin(type4) -> latin(basic))
//   Hebrew: /usr/share/X11/xkb/symbols/il        -> xkb_symbols "basic"
//           ("an implementation of the Israeli standard SI-1452 (2013)")
//
// Only the unshifted base character of each key is legended. Shifted and AltGr
// third-level symbols are deliberately left off, which keeps one string per key.
//
// Positional note that is easy to get wrong: SI-1452 assigns Hebrew letters to
// *physical key positions*, not to Latin letters. German is QWERTZ, so the key
// at position AD06 types `z` (not `y`) and still carries ט, and the key at AB01
// types `y` (not `z`) and still carries ז. The Hebrew column below is therefore
// keyed by xkb position, exactly as the `il` file defines it.
//
// Every Hebrew legend here is a single character, so OpenSCAD's `text()` never
// has to resolve right-to-left run ordering.

// 19.05mm key pitch, with the same ~1.05mm inter-key gap the shape JSON defaults
// already assume (custom-shell defaults to an 18mm body for a 1u key).
export const KEY_PITCH_MM = 19.05;
export const KEY_GAP_MM = 1.05;

/** Body size in mm for a key spanning `units` of pitch. */
export function unitsToBodyMm(units) {
  return (units * KEY_PITCH_MM) - KEY_GAP_MM;
}

const SHELL = "custom-shell";
const ISO_ENTER = "jis-enter";

// x/y are in key units from the top-left of the board, matching the usual
// keyboard-layout-editor convention. w/h default to 1.
//
// `de` is the German legend, `he` the Hebrew one (present only on the 27 keys
// that SI-1452 gives an actual Hebrew letter). `homing` marks the F/J bumps.
export const ISO_105_DE_HE_KEYS = Object.freeze([
  // ---- Function row -------------------------------------------------------
  { id: "esc", x: 0, y: 0, de: "Esc" },
  { id: "f1", x: 2, y: 0, de: "F1" },
  { id: "f2", x: 3, y: 0, de: "F2" },
  { id: "f3", x: 4, y: 0, de: "F3" },
  { id: "f4", x: 5, y: 0, de: "F4" },
  { id: "f5", x: 6.5, y: 0, de: "F5" },
  { id: "f6", x: 7.5, y: 0, de: "F6" },
  { id: "f7", x: 8.5, y: 0, de: "F7" },
  { id: "f8", x: 9.5, y: 0, de: "F8" },
  { id: "f9", x: 11, y: 0, de: "F9" },
  { id: "f10", x: 12, y: 0, de: "F10" },
  { id: "f11", x: 13, y: 0, de: "F11" },
  { id: "f12", x: 14, y: 0, de: "F12" },
  { id: "print", x: 15.25, y: 0, de: "Druck" },
  { id: "scroll", x: 16.25, y: 0, de: "Rollen" },
  { id: "pause", x: 17.25, y: 0, de: "Pause" },

  // ---- Number row (xkb TLDE, AE01..AE12) ---------------------------------
  // de(basic): TLDE dead_circumflex, AE02 quotedbl, AE03 section, AE04 dollar,
  // AE11 ssharp, AE12 dead_acute; AE06..AE10 come from latin(type4).
  // il(basic): TLDE semicolon, AE01..AE12 digits/symbols - no Hebrew letters.
  { id: "grave", x: 0, y: 1.5, de: "^" },
  { id: "1", x: 1, y: 1.5, de: "1" },
  { id: "2", x: 2, y: 1.5, de: "2" },
  { id: "3", x: 3, y: 1.5, de: "3" },
  { id: "4", x: 4, y: 1.5, de: "4" },
  { id: "5", x: 5, y: 1.5, de: "5" },
  { id: "6", x: 6, y: 1.5, de: "6" },
  { id: "7", x: 7, y: 1.5, de: "7" },
  { id: "8", x: 8, y: 1.5, de: "8" },
  { id: "9", x: 9, y: 1.5, de: "9" },
  { id: "0", x: 10, y: 1.5, de: "0" },
  { id: "ssharp", x: 11, y: 1.5, de: "ß" },
  { id: "acute", x: 12, y: 1.5, de: "´" },
  { id: "backspace", x: 13, y: 1.5, w: 2, de: "←" },
  { id: "insert", x: 15.25, y: 1.5, de: "Einfg" },
  { id: "home", x: 16.25, y: 1.5, de: "Pos1" },
  { id: "pageup", x: 17.25, y: 1.5, de: "Bild↑" },
  { id: "numlock", x: 18.5, y: 1.5, de: "Num" },
  { id: "kpdivide", x: 19.5, y: 1.5, de: "/" },
  { id: "kpmultiply", x: 20.5, y: 1.5, de: "*" },
  { id: "kpminus", x: 21.5, y: 1.5, de: "-" },

  // ---- QWERTZ row (xkb AD01..AD12) ---------------------------------------
  { id: "tab", x: 0, y: 2.5, w: 1.5, de: "Tab" },
  { id: "q", x: 1.5, y: 2.5, de: "Q" },                    // AD01 il: slash
  { id: "w", x: 2.5, y: 2.5, de: "W" },                    // AD02 il: apostrophe
  { id: "e", x: 3.5, y: 2.5, de: "E", he: "ק" },           // AD03 hebrew_qoph
  { id: "r", x: 4.5, y: 2.5, de: "R", he: "ר" },           // AD04 hebrew_resh
  { id: "t", x: 5.5, y: 2.5, de: "T", he: "א" },           // AD05 hebrew_aleph
  { id: "z", x: 6.5, y: 2.5, de: "Z", he: "ט" },           // AD06 de: z (QWERTZ), hebrew_tet
  { id: "u", x: 7.5, y: 2.5, de: "U", he: "ו" },           // AD07 hebrew_waw
  { id: "i", x: 8.5, y: 2.5, de: "I", he: "ן" },           // AD08 hebrew_finalnun
  { id: "o", x: 9.5, y: 2.5, de: "O", he: "ם" },           // AD09 hebrew_finalmem
  { id: "p", x: 10.5, y: 2.5, de: "P", he: "פ" },          // AD10 hebrew_pe
  { id: "udiaeresis", x: 11.5, y: 2.5, de: "Ü" },          // AD11 il: bracketright
  { id: "plus", x: 12.5, y: 2.5, de: "+" },                // AD12 il: bracketleft
  // ISO Enter: 1.5u x 2u with a 0.25u x 1u notch at the bottom left. Its top
  // half sits on this row (x 13.5..15.0) and its bottom half on the home row
  // (x 13.75..15.0), which is what makes both rows total exactly 15u.
  { id: "enter", x: 13.5, y: 2.5, w: 1.5, h: 2, shape: ISO_ENTER, de: "↵" },
  { id: "delete", x: 15.25, y: 2.5, de: "Entf" },
  { id: "end", x: 16.25, y: 2.5, de: "Ende" },
  { id: "pagedown", x: 17.25, y: 2.5, de: "Bild↓" },
  { id: "kp7", x: 18.5, y: 2.5, de: "7" },
  { id: "kp8", x: 19.5, y: 2.5, de: "8" },
  { id: "kp9", x: 20.5, y: 2.5, de: "9" },
  { id: "kpplus", x: 21.5, y: 2.5, h: 2, de: "+" },

  // ---- Home row (xkb AC01..AC11, BKSL) -----------------------------------
  { id: "capslock", x: 0, y: 3.5, w: 1.75, de: "Feststell" },
  { id: "a", x: 1.75, y: 3.5, de: "A", he: "ש" },          // AC01 hebrew_shin
  { id: "s", x: 2.75, y: 3.5, de: "S", he: "ד" },          // AC02 hebrew_dalet
  { id: "d", x: 3.75, y: 3.5, de: "D", he: "ג" },          // AC03 hebrew_gimel
  { id: "f", x: 4.75, y: 3.5, de: "F", he: "כ", homing: true },  // AC04 hebrew_kaph
  { id: "g", x: 5.75, y: 3.5, de: "G", he: "ע" },          // AC05 hebrew_ayin
  { id: "h", x: 6.75, y: 3.5, de: "H", he: "י" },          // AC06 hebrew_yod
  { id: "j", x: 7.75, y: 3.5, de: "J", he: "ח", homing: true },  // AC07 hebrew_chet
  { id: "k", x: 8.75, y: 3.5, de: "K", he: "ל" },          // AC08 hebrew_lamed
  { id: "l", x: 9.75, y: 3.5, de: "L", he: "ך" },          // AC09 hebrew_finalkaph
  { id: "odiaeresis", x: 10.75, y: 3.5, de: "Ö", he: "ף" }, // AC10 hebrew_finalpe
  { id: "adiaeresis", x: 11.75, y: 3.5, de: "Ä" },         // AC11 il: comma
  { id: "numbersign", x: 12.75, y: 3.5, de: "#" },         // BKSL il: backslash
  { id: "kp4", x: 18.5, y: 3.5, de: "4" },
  { id: "kp5", x: 19.5, y: 3.5, de: "5", homing: true },
  { id: "kp6", x: 20.5, y: 3.5, de: "6" },

  // ---- Bottom alpha row (xkb LSGT, AB01..AB10) ---------------------------
  { id: "lshift", x: 0, y: 4.5, w: 1.25, de: "Umschalt" },
  { id: "less", x: 1.25, y: 4.5, de: "<" },                // LSGT
  { id: "y", x: 2.25, y: 4.5, de: "Y", he: "ז" },          // AB01 de: y (QWERTZ), hebrew_zain
  { id: "x", x: 3.25, y: 4.5, de: "X", he: "ס" },          // AB02 hebrew_samech
  { id: "c", x: 4.25, y: 4.5, de: "C", he: "ב" },          // AB03 hebrew_bet
  { id: "v", x: 5.25, y: 4.5, de: "V", he: "ה" },          // AB04 hebrew_he
  { id: "b", x: 6.25, y: 4.5, de: "B", he: "נ" },          // AB05 hebrew_nun
  { id: "n", x: 7.25, y: 4.5, de: "N", he: "מ" },          // AB06 hebrew_mem
  { id: "m", x: 8.25, y: 4.5, de: "M", he: "צ" },          // AB07 hebrew_zade
  { id: "comma", x: 9.25, y: 4.5, de: ",", he: "ת" },      // AB08 hebrew_taw
  { id: "period", x: 10.25, y: 4.5, de: ".", he: "ץ" },    // AB09 hebrew_finalzade
  { id: "minus", x: 11.25, y: 4.5, de: "-" },              // AB10 il: period
  { id: "rshift", x: 12.25, y: 4.5, w: 2.75, de: "Umschalt" },
  { id: "up", x: 16.25, y: 4.5, de: "↑" },
  { id: "kp1", x: 18.5, y: 4.5, de: "1" },
  { id: "kp2", x: 19.5, y: 4.5, de: "2" },
  { id: "kp3", x: 20.5, y: 4.5, de: "3" },
  { id: "kpenter", x: 21.5, y: 4.5, h: 2, de: "↵" },

  // ---- Modifier row -------------------------------------------------------
  { id: "lctrl", x: 0, y: 5.5, w: 1.25, de: "Strg" },
  { id: "lsuper", x: 1.25, y: 5.5, w: 1.25, de: "Super" },
  { id: "lalt", x: 2.5, y: 5.5, w: 1.25, de: "Alt" },
  { id: "space", x: 3.75, y: 5.5, w: 6.25, de: "" },
  { id: "altgr", x: 10, y: 5.5, w: 1.25, de: "Alt Gr" },
  { id: "rsuper", x: 11.25, y: 5.5, w: 1.25, de: "Super" },
  { id: "menu", x: 12.5, y: 5.5, w: 1.25, de: "Menü" },
  { id: "rctrl", x: 13.75, y: 5.5, w: 1.25, de: "Strg" },
  { id: "left", x: 15.25, y: 5.5, de: "←" },
  { id: "down", x: 16.25, y: 5.5, de: "↓" },
  { id: "right", x: 17.25, y: 5.5, de: "→" },
  { id: "kp0", x: 18.5, y: 5.5, w: 2, de: "0" },
  { id: "kpdecimal", x: 20.5, y: 5.5, de: "," },
]);

export const GERMAN_LEGEND_FONT_KEY = "noto-sans-variable";
export const HEBREW_LEGEND_FONT_KEY = "noto-sans-hebrew-variable";
// Noto Sans has no arrow glyphs (verified against the bundled TTF's cmap), so the
// keys German boards label with arrows would come out blank. M PLUS 1p is already
// bundled and covers both the arrows and every Latin label used here.
export const SYMBOL_LEGEND_FONT_KEY = "mplus1p-regular";

const SYMBOL_LEGEND_CHARS = new Set(["←", "↑", "→", "↓", "↵"]);

// An MX stem is a hollow cylinder whose wall blocks the light path in the four
// diagonal quadrants from roughly 1mm to 2.75mm out from the key center (the
// clear cross at the very center is the switch slot, too narrow to light a
// glyph). Legends therefore sit outside that ring, which is also why real
// backlit boards use north-facing legends.
//
// These values were tuned by measuring the built meshes: with them, every
// single-character legend - all the alphanumerics and all 27 Hebrew letters -
// has a completely unobstructed light path. Pushing further north does not
// help, it just runs the long labels off the top face onto the shoulder.
// Multi-letter German words ("Feststell", "Umschalt") are wider than the clear
// annulus, so part of those still sits over the stem; that is inherent to
// putting a long word on a 1u cap with a stem underneath, not a modelling gap.
const LEGEND_NORTH_SHIFT_MM = 3.6;
const LEGEND_QUADRANT_SHIFT_MM = 3.6;

function resolveGermanLegendFontKey(label) {
  return [...String(label)].some((character) => SYMBOL_LEGEND_CHARS.has(character))
    ? SYMBOL_LEGEND_FONT_KEY
    : GERMAN_LEGEND_FONT_KEY;
}

// A long word like "Feststell" or "Umschalt" has to shrink to stay on the cap;
// the app never auto-fits, so pick the size from the label length and key width.
function resolveGermanLegendSize(label, widthUnits) {
  const length = [...String(label)].length;
  if (length <= 1) {
    return 5;
  }
  const availableMm = unitsToBodyMm(widthUnits) * 0.72;
  // ~0.62em advance per character for Noto Sans at these sizes.
  return Math.max(1.6, Math.min(4, availableMm / (length * 0.62)));
}

/**
 * Turn a layout descriptor into the `params` shape the SCAD bridge expects.
 * `defaults` must come from createDefaultKeycapParams() for the key's profile.
 */
export function createKeycapParamsForKey(key, defaults, { shineThrough = true } = {}) {
  const widthUnits = key.w ?? 1;
  const heightUnits = key.h ?? 1;
  const isIsoEnter = key.shape === ISO_ENTER;
  const hasGerman = String(key.de ?? "").length > 0;
  const hasHebrew = String(key.he ?? "").length > 0;

  return {
    ...defaults,
    name: key.id,
    keyWidth: unitsToBodyMm(widthUnits),
    keyDepth: unitsToBodyMm(heightUnits),
    ...(isIsoEnter
      ? {
        // 0.25u x 1u notch, matching the ISO Enter footprint described above.
        jisEnterNotchWidth: 0.25 * KEY_PITCH_MM,
        jisEnterNotchDepth: unitsToBodyMm(heightUnits) / 2,
      }
      : {}),

    stemEnabled: true,
    stemType: "mx",
    homingBarEnabled: Boolean(key.homing),

    // German primary legend, centered.
    legendEnabled: hasGerman,
    legendContentType: "text",
    legendText: key.de ?? "",
    legendFontKey: resolveGermanLegendFontKey(key.de ?? ""),
    legendFontStyleKey: "medium",
    legendSize: resolveGermanLegendSize(key.de ?? "", widthUnits),
    legendHeight: 0,
    legendEmbed: 0,
    legendShineThroughEnabled: shineThrough && hasGerman,
    // Placed clear of the stem: an MX stem blocks the light path in four
    // quadrants out to ~2.75mm from the key center, so a legend sitting on top
    // of it would be cut through but never actually lit. Shifting north also
    // matches where backlit boards put their LED. See LEGEND_NORTH_SHIFT_MM.
    legendOffsetX: hasHebrew ? -LEGEND_QUADRANT_SHIFT_MM : 0,
    legendOffsetY: hasHebrew ? LEGEND_QUADRANT_SHIFT_MM : LEGEND_NORTH_SHIFT_MM,

    // Hebrew secondary legend, bottom-right - the usual placement on Israeli
    // bilingual keycaps, and the natural side for a right-to-left script.
    topLegendRightBottomEnabled: hasHebrew,
    topLegendRightBottomContentType: "text",
    topLegendRightBottomText: key.he ?? "",
    topLegendRightBottomFontKey: HEBREW_LEGEND_FONT_KEY,
    topLegendRightBottomFontStyleKey: "medium",
    topLegendRightBottomSize: 3.6,
    topLegendRightBottomHeight: 0,
    topLegendRightBottomEmbed: 0,
    // The right-bottom anchor already sits ~4.5mm out on a 1u key, clear of the
    // stem; these nudge it back toward the face so it does not crowd the edge.
    topLegendRightBottomOffsetX: -0.6,
    topLegendRightBottomOffsetY: 0.6,
    topLegendRightBottomShineThroughEnabled: shineThrough && hasHebrew,
  };
}

/** Profile key to feed createDefaultKeycapParams() for a given descriptor. */
export function resolveShapeProfileForKey(key) {
  return key.shape === ISO_ENTER ? ISO_ENTER : SHELL;
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
