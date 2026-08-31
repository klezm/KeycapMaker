export const KEY_UNIT_PITCH_MM = 19.05;
export const KEY_UNIT_GAP_MM = 1.05;

const LEGEND_NAME_OVERRIDES = Object.freeze({
  "`": "Backtick",
  "^": "Circumflex",
  "-": "Minus",
  "=": "Equal",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  ";": "Semicolon",
  "'": "Quote",
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  "*": "Asterisk",
  "+": "Plus",
  "#": "Hash",
  "<": "AngleBracket",
  "´": "Acute",
  "ß": "Eszett",
  "Ü": "UDiaeresis",
  "Ö": "ODiaeresis",
  "Ä": "ADiaeresis",
  "↑": "ArrowUp",
  "↓": "ArrowDown",
  "←": "ArrowLeft",
  "→": "ArrowRight",
});

function key(legend, units = 1, extra = {}) {
  return { legend, units, ...extra };
}

const FUNCTION_ROW = [
  key("Esc"),
  key("F1"), key("F2"), key("F3"), key("F4"),
  key("F5"), key("F6"), key("F7"), key("F8"),
  key("F9"), key("F10"), key("F11"), key("F12"),
  key("PrtSc"), key("ScrLk"), key("Pause"),
];

const NAVIGATION_CLUSTER_TOP = [key("Ins"), key("Home"), key("PgUp")];
const NAVIGATION_CLUSTER_MIDDLE = [key("Del"), key("End"), key("PgDn")];

const MODIFIER_ROW_ANSI = [
  key("Ctrl", 1.25, { name: "CtrlLeft" }),
  key("Win", 1.25, { name: "WinLeft" }),
  key("Alt", 1.25, { name: "AltLeft" }),
  key("", 6.25, { name: "Space" }),
  key("Alt", 1.25, { name: "AltRight" }),
  key("Win", 1.25, { name: "WinRight" }),
  key("Menu", 1.25),
  key("Ctrl", 1.25, { name: "CtrlRight" }),
  key("←"), key("↓"), key("→"),
  key("0", 2, { name: "Num0" }), key(".", 1, { name: "NumPeriod" }),
];

const MODIFIER_ROW_ISO = [
  key("Strg", 1.25, { name: "CtrlLeft" }),
  key("Win", 1.25, { name: "WinLeft" }),
  key("Alt", 1.25, { name: "AltLeft" }),
  key("", 6.25, { name: "Space" }),
  key("AltGr", 1.25),
  key("Win", 1.25, { name: "WinRight" }),
  key("Menu", 1.25),
  key("Strg", 1.25, { name: "CtrlRight" }),
  key("←"), key("↓"), key("→"),
  key("0", 2, { name: "Num0" }), key(",", 1, { name: "NumComma" }),
];

const ANSI_QWERTY_ROWS = [
  FUNCTION_ROW,
  [
    key("`"), key("1"), key("2"), key("3"), key("4"), key("5"),
    key("6"), key("7"), key("8"), key("9"), key("0"), key("-"), key("="),
    key("Backspace", 2),
    ...NAVIGATION_CLUSTER_TOP,
    key("NumLk"), key("/", 1, { name: "NumSlash" }), key("*", 1, { name: "NumAsterisk" }), key("-", 1, { name: "NumMinus" }),
  ],
  [
    key("Tab", 1.5),
    key("Q"), key("W"), key("E"), key("R"), key("T"),
    key("Y"), key("U"), key("I"), key("O"), key("P"),
    key("["), key("]"), key("\\", 1.5),
    ...NAVIGATION_CLUSTER_MIDDLE,
    key("7", 1, { name: "Num7" }), key("8", 1, { name: "Num8" }), key("9", 1, { name: "Num9" }),
    key("+", 1, { name: "NumPlus" }),
  ],
  [
    key("Caps", 1.75, { name: "CapsLock" }),
    key("A"), key("S"), key("D"), key("F", 1, { homing: true }), key("G"),
    key("H"), key("J", 1, { homing: true }), key("K"), key("L"),
    key(";"), key("'"), key("Enter", 2.25),
    key("4", 1, { name: "Num4" }), key("5", 1, { name: "Num5", homing: true }), key("6", 1, { name: "Num6" }),
  ],
  [
    key("Shift", 2.25, { name: "ShiftLeft" }),
    key("Z"), key("X"), key("C"), key("V"), key("B"), key("N"), key("M"),
    key(","), key("."), key("/"),
    key("Shift", 2.75, { name: "ShiftRight" }),
    key("↑"),
    key("1", 1, { name: "Num1" }), key("2", 1, { name: "Num2" }), key("3", 1, { name: "Num3" }),
    key("Enter", 1, { name: "NumEnter" }),
  ],
  MODIFIER_ROW_ANSI,
];

const ISO_QWERTZ_ROWS = [
  FUNCTION_ROW,
  [
    key("^"), key("1"), key("2"), key("3"), key("4"), key("5"),
    key("6"), key("7"), key("8"), key("9"), key("0"), key("ß"), key("´"),
    key("Backspace", 2),
    ...NAVIGATION_CLUSTER_TOP,
    key("NumLk"), key("/", 1, { name: "NumSlash" }), key("*", 1, { name: "NumAsterisk" }), key("-", 1, { name: "NumMinus" }),
  ],
  [
    key("Tab", 1.5),
    key("Q"), key("W"), key("E"), key("R"), key("T"),
    key("Z"), key("U"), key("I"), key("O"), key("P"),
    key("Ü"), key("+"),
    key("Enter", 1.25, { name: "EnterIso" }),
    ...NAVIGATION_CLUSTER_MIDDLE,
    key("7", 1, { name: "Num7" }), key("8", 1, { name: "Num8" }), key("9", 1, { name: "Num9" }),
    key("+", 1, { name: "NumPlus" }),
  ],
  [
    key("Fest", 1.75, { name: "CapsLock" }),
    key("A"), key("S"), key("D"), key("F", 1, { homing: true }), key("G"),
    key("H"), key("J", 1, { homing: true }), key("K"), key("L"),
    key("Ö"), key("Ä"), key("#"),
    key("4", 1, { name: "Num4" }), key("5", 1, { name: "Num5", homing: true }), key("6", 1, { name: "Num6" }),
  ],
  [
    key("Shift", 1.25, { name: "ShiftLeft" }),
    key("<"),
    key("Y"), key("X"), key("C"), key("V"), key("B"), key("N"), key("M"),
    key(","), key("."), key("-", 1, { name: "MinusIso" }),
    key("Shift", 2.75, { name: "ShiftRight" }),
    key("↑"),
    key("1", 1, { name: "Num1" }), key("2", 1, { name: "Num2" }), key("3", 1, { name: "Num3" }),
    key("Enter", 1, { name: "NumEnter" }),
  ],
  MODIFIER_ROW_ISO,
];

export const KEYBOARD_TEMPLATES = Object.freeze([
  Object.freeze({
    key: "qwerty",
    projectName: "QWERTY ANSI 104",
    rows: ANSI_QWERTY_ROWS,
  }),
  Object.freeze({
    key: "qwertz",
    projectName: "QWERTZ ISO 105",
    rows: ISO_QWERTZ_ROWS,
  }),
]);

export function keyWidthForUnits(units) {
  const width = Number(units) * KEY_UNIT_PITCH_MM - KEY_UNIT_GAP_MM;
  return Math.round(width * 100) / 100;
}

export function getKeyboardTemplate(templateKey) {
  return KEYBOARD_TEMPLATES.find((template) => template.key === templateKey) ?? null;
}

function resolveKeyName(entry, index) {
  if (entry.name) {
    return entry.name;
  }

  const override = LEGEND_NAME_OVERRIDES[entry.legend];
  if (override) {
    return override;
  }

  const cleaned = String(entry.legend ?? "").replace(/[^A-Za-z0-9]/g, "");
  return cleaned || `Key${index + 1}`;
}

export function createKeyboardTemplateKeycaps(templateKey) {
  const template = getKeyboardTemplate(templateKey);
  if (!template) {
    throw new Error(`Unknown keyboard template: ${templateKey}`);
  }

  const keys = template.rows.flat();

  return keys.map((entry, index) => ({
    name: resolveKeyName(entry, index),
    legendText: String(entry.legend ?? ""),
    legendEnabled: String(entry.legend ?? "").length > 0,
    keyWidth: keyWidthForUnits(entry.units ?? 1),
    homingBarEnabled: Boolean(entry.homing),
  }));
}
