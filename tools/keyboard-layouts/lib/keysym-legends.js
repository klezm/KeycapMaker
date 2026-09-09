const DOTTED_CIRCLE = "◌";

function combining(mark) {
  return `${DOTTED_CIRCLE}${mark}`;
}

export const DEAD_KEY_LEGENDS = Object.freeze({
  dead_grave: "`",
  dead_acute: "´",
  dead_circumflex: "^",
  dead_tilde: "~",
  dead_perispomeni: combining("͂"),
  dead_macron: "¯",
  dead_breve: "˘",
  dead_abovedot: "˙",
  dead_diaeresis: "¨",
  dead_abovering: "°",
  dead_doubleacute: "˝",
  dead_caron: "ˇ",
  dead_cedilla: "¸",
  dead_ogonek: "˛",
  dead_iota: combining("ͅ"),
  dead_voiced_sound: "゛",
  dead_semivoiced_sound: "゜",
  dead_belowdot: combining("̣"),
  dead_hook: combining("̉"),
  dead_horn: combining("̛"),
  dead_stroke: combining("̵"),
  dead_abovecomma: combining("̓"),
  dead_psili: combining("̓"),
  dead_abovereversedcomma: combining("̔"),
  dead_dasia: combining("̔"),
  dead_doublegrave: combining("̏"),
  dead_belowring: combining("̥"),
  dead_belowmacron: combining("̱"),
  dead_belowcircumflex: combining("̭"),
  dead_belowtilde: combining("̰"),
  dead_belowbreve: combining("̮"),
  dead_belowdiaeresis: combining("̤"),
  dead_invertedbreve: combining("̑"),
  dead_belowcomma: combining("̦"),
  dead_currency: "¤",
  dead_hamza: "ء",
  dead_a: "a",
  dead_A: "A",
  dead_e: "e",
  dead_E: "E",
  dead_i: "i",
  dead_I: "I",
  dead_o: "o",
  dead_O: "O",
  dead_u: "u",
  dead_U: "U",
  dead_small_schwa: "ə",
  dead_schwa: "ə",
  dead_capital_schwa: "Ə",
  dead_SCHWA: "Ə",
});

export const DEAD_KEY_LABELS = Object.freeze({
  dead_greek: "Greek",
});

export const NAMED_KEY_LABELS = Object.freeze({
  Return: "Enter",
  KP_Enter: "Enter",
  BackSpace: "Backspace",
  Tab: "Tab",
  ISO_Left_Tab: "Tab",
  Escape: "Esc",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  Prior: "Page Up",
  Next: "Page Down",
  space: "Space",
  Caps_Lock: "Caps Lock",
  Num_Lock: "Num Lock",
  Scroll_Lock: "Scroll Lock",
  Shift_L: "Shift",
  Shift_R: "Shift",
  Control_L: "Ctrl",
  Control_R: "Ctrl",
  Alt_L: "Alt",
  Alt_R: "Alt",
  Meta_L: "Meta",
  Meta_R: "Meta",
  Super_L: "Super",
  Super_R: "Super",
  Hyper_L: "Hyper",
  Hyper_R: "Hyper",
  Menu: "Menu",
  Print: "Print Screen",
  Pause: "Pause",
  Break: "Break",
  Sys_Req: "SysRq",
  Up: "↑",
  Down: "↓",
  Left: "←",
  Right: "→",
  ISO_Level3_Shift: "AltGr",
  ISO_Level3_Latch: "AltGr",
  ISO_Level5_Shift: "Level5",
  ISO_Level5_Latch: "Level5",
  ISO_Group_Shift: "Group",
  ISO_Next_Group: "Group",
  Multi_key: "Compose",
  Zenkaku_Hankaku: "半角/全角",
  Henkan_Mode: "変換",
  Henkan: "変換",
  Muhenkan: "無変換",
  Hiragana_Katakana: "ひらがな",
  Hiragana: "ひらがな",
  Katakana: "カタカナ",
  Kana_Lock: "かな",
  Kana_Shift: "かな",
  Eisu_toggle: "英数",
  Hangul: "한/영",
  Hangul_Hanja: "한자",
  Hangul_switch: "한/영",
  Terminate_Server: "Terminate",
  XF86MonBrightnessUp: "Brightness +",
  XF86MonBrightnessDown: "Brightness -",
  XF86AudioMute: "Mute",
  XF86AudioLowerVolume: "Volume -",
  XF86AudioRaiseVolume: "Volume +",
  XF86AudioPlay: "Play",
  XF86AudioStop: "Stop",
  XF86AudioPrev: "Previous",
  XF86AudioNext: "Next",
  Cancel: "Cancel",
  Execute: "Execute",
  Find: "Find",
  Help: "Help",
  Undo: "Undo",
  Redo: "Redo",
  Linefeed: "Linefeed",
  Mode_switch: "Mode",
  Shift_Lock: "Shift Lock",
  Kanji: "\u6f22\u5b57",
  Romaji: "\u30ed\u30fc\u30de\u5b57",
  Group1: "Group 1",
  group1: "Group 1",
  ISO_Level3_Lock: "AltGr Lock",
  ISO_Level5_Lock: "Level5 Lock",
  ISO_Prev_Group: "Prev Group",
  ISO_First_Group: "First Group",
  ISO_Last_Group: "Last Group",
  SunFront: "Front",
  SunProps: "Props",
  SunSys_Req: "SysRq",
});

export const KEYPAD_LEGENDS = Object.freeze({
  KP_0: "0",
  KP_1: "1",
  KP_2: "2",
  KP_3: "3",
  KP_4: "4",
  KP_5: "5",
  KP_6: "6",
  KP_7: "7",
  KP_8: "8",
  KP_9: "9",
  KP_Add: "+",
  KP_Subtract: "\u2212",
  KP_Multiply: "*",
  KP_Divide: "/",
  KP_Decimal: ".",
  KP_Separator: ",",
  KP_Equal: "=",
  KP_Space: " ",
  KP_Begin: "5",
});

export const KEYPAD_LABELS = Object.freeze({
  KP_Delete: "Del",
  KP_Insert: "Ins",
  KP_Home: "Home",
  KP_End: "End",
  KP_Prior: "Page Up",
  KP_Next: "Page Down",
  KP_Up: "\u2191",
  KP_Down: "\u2193",
  KP_Left: "\u2190",
  KP_Right: "\u2192",
  KP_Tab: "Tab",
});

export const ALIAS_CHARACTER_LEGENDS = Object.freeze({
  Arabic_heh: "\u0647",
});

export const DIGRAPH_LEGENDS = Object.freeze({
  CH: "CH",
  C_H: "CH",
  C_h: "Ch",
  Ch: "Ch",
  c_h: "ch",
  ch: "ch",
});

const VENDOR_KEYSYM_PREFIX = "XF86";

export function resolveVendorKeyLabel(name) {
  if (!name.startsWith(VENDOR_KEYSYM_PREFIX)) {
    return null;
  }
  const body = name.slice(VENDOR_KEYSYM_PREFIX.length);
  if (body === "") {
    return null;
  }
  return body
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

export function resolveBrailleLabel(name) {
  const match = /^braille_dot_(\d{1,2})$/.exec(name);
  return match === null ? null : `Dot ${match[1]}`;
}

export const EMPTY_KEYSYMS = Object.freeze(new Set(["NoSymbol", "noSymbol", "VoidSymbol", "voidSymbol", "any", "none", "None"]));

export function isEmptyKeysym(name) {
  return name === undefined || name === null || name === "" || EMPTY_KEYSYMS.has(name);
}

export function resolveFunctionKeyLabel(name) {
  const match = /^F(\d{1,2})$/.exec(name);
  return match === null ? null : `F${match[1]}`;
}
