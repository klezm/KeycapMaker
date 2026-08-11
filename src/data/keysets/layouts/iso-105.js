// Full-size ISO 105-key physical layout.
//
// Physical only: position, size and shape. What each key is *labelled* comes
// from a language table joined on `code`, because the same xkb position carries
// different characters per language (BKSL is `#` here on German ISO, but `\` on
// ANSI's top row) and modifier wording differs too.
//
// `code` is the xkb key name, `x`/`y` are in key units from the top-left in the
// usual keyboard-layout-editor convention, `w`/`h` default to 1.

export const ISO_105_LAYOUT = Object.freeze({
  id: "iso-105",
  label: "ISO 105-key (full size)",
  keyCount: 105,
  keys: Object.freeze([
    // ---- Function row -----------------------------------------------------
    { code: "ESC", x: 0, y: 0 },
    { code: "FK01", x: 2, y: 0 },
    { code: "FK02", x: 3, y: 0 },
    { code: "FK03", x: 4, y: 0 },
    { code: "FK04", x: 5, y: 0 },
    { code: "FK05", x: 6.5, y: 0 },
    { code: "FK06", x: 7.5, y: 0 },
    { code: "FK07", x: 8.5, y: 0 },
    { code: "FK08", x: 9.5, y: 0 },
    { code: "FK09", x: 11, y: 0 },
    { code: "FK10", x: 12, y: 0 },
    { code: "FK11", x: 13, y: 0 },
    { code: "FK12", x: 14, y: 0 },
    { code: "PRSC", x: 15.25, y: 0 },
    { code: "SCLK", x: 16.25, y: 0 },
    { code: "PAUS", x: 17.25, y: 0 },

    // ---- Number row -------------------------------------------------------
    { code: "TLDE", x: 0, y: 1.5 },
    { code: "AE01", x: 1, y: 1.5 },
    { code: "AE02", x: 2, y: 1.5 },
    { code: "AE03", x: 3, y: 1.5 },
    { code: "AE04", x: 4, y: 1.5 },
    { code: "AE05", x: 5, y: 1.5 },
    { code: "AE06", x: 6, y: 1.5 },
    { code: "AE07", x: 7, y: 1.5 },
    { code: "AE08", x: 8, y: 1.5 },
    { code: "AE09", x: 9, y: 1.5 },
    { code: "AE10", x: 10, y: 1.5 },
    { code: "AE11", x: 11, y: 1.5 },
    { code: "AE12", x: 12, y: 1.5 },
    { code: "BKSP", x: 13, y: 1.5, w: 2 },
    { code: "INS", x: 15.25, y: 1.5 },
    { code: "HOME", x: 16.25, y: 1.5 },
    { code: "PGUP", x: 17.25, y: 1.5 },
    { code: "NMLK", x: 18.5, y: 1.5 },
    { code: "KPDV", x: 19.5, y: 1.5 },
    { code: "KPMU", x: 20.5, y: 1.5 },
    { code: "KPSU", x: 21.5, y: 1.5 },

    // ---- Upper letter row -------------------------------------------------
    { code: "TAB", x: 0, y: 2.5, w: 1.5 },
    { code: "AD01", x: 1.5, y: 2.5 },
    { code: "AD02", x: 2.5, y: 2.5 },
    { code: "AD03", x: 3.5, y: 2.5 },
    { code: "AD04", x: 4.5, y: 2.5 },
    { code: "AD05", x: 5.5, y: 2.5 },
    { code: "AD06", x: 6.5, y: 2.5 },
    { code: "AD07", x: 7.5, y: 2.5 },
    { code: "AD08", x: 8.5, y: 2.5 },
    { code: "AD09", x: 9.5, y: 2.5 },
    { code: "AD10", x: 10.5, y: 2.5 },
    { code: "AD11", x: 11.5, y: 2.5 },
    { code: "AD12", x: 12.5, y: 2.5 },
    // ISO Enter: 1.5u x 2u with a 0.25u x 1u notch at the bottom left. Its top
    // half sits on this row (x 13.5..15.0) and its bottom half on the home row
    // (x 13.75..15.0), which is what makes both rows total exactly 15u despite
    // having different key counts.
    { code: "RTRN", x: 13.5, y: 2.5, w: 1.5, h: 2, shape: "iso-enter" },
    { code: "DELE", x: 15.25, y: 2.5 },
    { code: "END", x: 16.25, y: 2.5 },
    { code: "PGDN", x: 17.25, y: 2.5 },
    { code: "KP7", x: 18.5, y: 2.5 },
    { code: "KP8", x: 19.5, y: 2.5 },
    { code: "KP9", x: 20.5, y: 2.5 },
    { code: "KPAD", x: 21.5, y: 2.5, h: 2 },

    // ---- Home row ---------------------------------------------------------
    { code: "CAPS", x: 0, y: 3.5, w: 1.75 },
    { code: "AC01", x: 1.75, y: 3.5 },
    { code: "AC02", x: 2.75, y: 3.5 },
    { code: "AC03", x: 3.75, y: 3.5 },
    { code: "AC04", x: 4.75, y: 3.5, homing: true },
    { code: "AC05", x: 5.75, y: 3.5 },
    { code: "AC06", x: 6.75, y: 3.5 },
    { code: "AC07", x: 7.75, y: 3.5, homing: true },
    { code: "AC08", x: 8.75, y: 3.5 },
    { code: "AC09", x: 9.75, y: 3.5 },
    { code: "AC10", x: 10.75, y: 3.5 },
    { code: "AC11", x: 11.75, y: 3.5 },
    { code: "BKSL", x: 12.75, y: 3.5 },
    { code: "KP4", x: 18.5, y: 3.5 },
    { code: "KP5", x: 19.5, y: 3.5, homing: true },
    { code: "KP6", x: 20.5, y: 3.5 },

    // ---- Lower letter row -------------------------------------------------
    { code: "LFSH", x: 0, y: 4.5, w: 1.25 },
    { code: "LSGT", x: 1.25, y: 4.5 },
    { code: "AB01", x: 2.25, y: 4.5 },
    { code: "AB02", x: 3.25, y: 4.5 },
    { code: "AB03", x: 4.25, y: 4.5 },
    { code: "AB04", x: 5.25, y: 4.5 },
    { code: "AB05", x: 6.25, y: 4.5 },
    { code: "AB06", x: 7.25, y: 4.5 },
    { code: "AB07", x: 8.25, y: 4.5 },
    { code: "AB08", x: 9.25, y: 4.5 },
    { code: "AB09", x: 10.25, y: 4.5 },
    { code: "AB10", x: 11.25, y: 4.5 },
    { code: "RTSH", x: 12.25, y: 4.5, w: 2.75 },
    { code: "UP", x: 16.25, y: 4.5 },
    { code: "KP1", x: 18.5, y: 4.5 },
    { code: "KP2", x: 19.5, y: 4.5 },
    { code: "KP3", x: 20.5, y: 4.5 },
    { code: "KPEN", x: 21.5, y: 4.5, h: 2 },

    // ---- Modifier row -----------------------------------------------------
    { code: "LCTL", x: 0, y: 5.5, w: 1.25 },
    { code: "LWIN", x: 1.25, y: 5.5, w: 1.25 },
    { code: "LALT", x: 2.5, y: 5.5, w: 1.25 },
    { code: "SPCE", x: 3.75, y: 5.5, w: 6.25 },
    { code: "RALT", x: 10, y: 5.5, w: 1.25 },
    { code: "RWIN", x: 11.25, y: 5.5, w: 1.25 },
    { code: "MENU", x: 12.5, y: 5.5, w: 1.25 },
    { code: "RCTL", x: 13.75, y: 5.5, w: 1.25 },
    { code: "LEFT", x: 15.25, y: 5.5 },
    { code: "DOWN", x: 16.25, y: 5.5 },
    { code: "RGHT", x: 17.25, y: 5.5 },
    { code: "KP0", x: 18.5, y: 5.5, w: 2 },
    { code: "KPDL", x: 20.5, y: 5.5 },
  ]),
});
