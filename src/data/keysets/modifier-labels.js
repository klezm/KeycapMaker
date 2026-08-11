// Labels for keys whose legend is a word rather than a character.
//
// The generated language tables cover the alphanumeric block only, because that
// is all xkb can tell us: it reports `Control_L` for the control key, not the
// word a German keycap actually prints ("Strg"). Those words are prose and have
// to be authored.
//
// German and English are filled in properly. Any language without its own entry
// falls back to English, which is what most non-German boards print for the
// modifiers anyway - but it does mean e.g. a French set currently shows "Ctrl /
// Shift / Enter" rather than "Ctrl / Maj / Entrée". Adding a language is just
// another entry here.
//
// Arrow and Enter glyphs (← ↑ ↓ → ↵) are not in Noto Sans; the keyset builder
// routes any legend containing them to a font that has them.

const NUMPAD_LABELS = Object.freeze({
  NMLK: "Num",
  KPDV: "/",
  KPMU: "*",
  KPSU: "-",
  KPAD: "+",
  KPEN: "↵",
  KP0: "0",
  KP1: "1",
  KP2: "2",
  KP3: "3",
  KP4: "4",
  KP5: "5",
  KP6: "6",
  KP7: "7",
  KP8: "8",
  KP9: "9",
  // Decimal separator follows the locale, so languages override this one.
  KPDL: ".",
});

const FUNCTION_ROW_LABELS = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [
      `FK${String(index + 1).padStart(2, "0")}`,
      `F${index + 1}`,
    ]),
  ),
);

const ARROW_LABELS = Object.freeze({
  UP: "↑",
  DOWN: "↓",
  LEFT: "←",
  RGHT: "→",
});

const ENGLISH_LABELS = Object.freeze({
  ...FUNCTION_ROW_LABELS,
  ...NUMPAD_LABELS,
  ...ARROW_LABELS,
  ESC: "Esc",
  PRSC: "PrtSc",
  SCLK: "Scroll",
  PAUS: "Pause",
  BKSP: "←",
  INS: "Ins",
  HOME: "Home",
  PGUP: "PgUp",
  DELE: "Del",
  END: "End",
  PGDN: "PgDn",
  TAB: "Tab",
  CAPS: "Caps",
  RTRN: "↵",
  LFSH: "Shift",
  RTSH: "Shift",
  LCTL: "Ctrl",
  RCTL: "Ctrl",
  LALT: "Alt",
  RALT: "Alt Gr",
  LWIN: "Super",
  RWIN: "Super",
  MENU: "Menu",
  // The spacebar is deliberately blank.
  SPCE: "",
});

const GERMAN_LABELS = Object.freeze({
  ...ENGLISH_LABELS,
  PRSC: "Druck",
  SCLK: "Rollen",
  INS: "Einfg",
  HOME: "Pos1",
  PGUP: "Bild↑",
  DELE: "Entf",
  END: "Ende",
  PGDN: "Bild↓",
  CAPS: "Feststell",
  LFSH: "Umschalt",
  RTSH: "Umschalt",
  LCTL: "Strg",
  RCTL: "Strg",
  MENU: "Menü",
  KPDL: ",",
});

const LABELS_BY_LANGUAGE = Object.freeze({
  de: GERMAN_LABELS,
  us: ENGLISH_LABELS,
  gb: ENGLISH_LABELS,
});

export const FALLBACK_MODIFIER_LABELS = ENGLISH_LABELS;

/** Word labels for a language, falling back to English. */
export function getModifierLabels(languageId) {
  return LABELS_BY_LANGUAGE[languageId] ?? ENGLISH_LABELS;
}

/** True when this language has its own authored labels rather than the fallback. */
export function hasAuthoredModifierLabels(languageId) {
  return Object.hasOwn(LABELS_BY_LANGUAGE, languageId);
}
