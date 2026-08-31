import test from "node:test";
import assert from "node:assert/strict";

import {
  KEYBOARD_TEMPLATES,
  createKeyboardTemplateKeycaps,
  getKeyboardTemplate,
  keyWidthForUnits,
} from "../src/data/keyboard-templates.js";

test("converts key units to the keycap width used by the editor", () => {
  assert.equal(keyWidthForUnits(1), 18);
  assert.equal(keyWidthForUnits(1.25), 22.76);
  assert.equal(keyWidthForUnits(1.5), 27.53);
  assert.equal(keyWidthForUnits(2), 37.05);
  assert.equal(keyWidthForUnits(6.25), 118.01);
});

test("exposes the QWERTY and QWERTZ templates by key", () => {
  assert.deepEqual(KEYBOARD_TEMPLATES.map((template) => template.key), ["qwerty", "qwertz"]);
  assert.equal(getKeyboardTemplate("qwerty").projectName, "QWERTY ANSI 104");
  assert.equal(getKeyboardTemplate("qwertz").projectName, "QWERTZ ISO 105");
  assert.equal(getKeyboardTemplate("dvorak"), null);
});

test("builds a full ANSI 104 keycap set for QWERTY", () => {
  const keycaps = createKeyboardTemplateKeycaps("qwerty");

  assert.equal(keycaps.length, 104);
  assert.equal(keycaps[0].name, "Esc");
  assert.equal(keycaps.find((entry) => entry.name === "Space").keyWidth, keyWidthForUnits(6.25));
  assert.equal(keycaps.find((entry) => entry.name === "Space").legendEnabled, false);
  assert.equal(keycaps.find((entry) => entry.name === "Backspace").keyWidth, keyWidthForUnits(2));
  assert.equal(keycaps.find((entry) => entry.name === "CapsLock").keyWidth, keyWidthForUnits(1.75));
});

test("builds a full ISO 105 keycap set for QWERTZ", () => {
  const keycaps = createKeyboardTemplateKeycaps("qwertz");

  assert.equal(keycaps.length, 105);
  assert.ok(keycaps.some((entry) => entry.legendText === "Z" && entry.name === "Z"));
  assert.ok(keycaps.some((entry) => entry.name === "UDiaeresis" && entry.legendText === "Ü"));
  assert.ok(keycaps.some((entry) => entry.name === "AltGr"));
  assert.equal(keycaps.find((entry) => entry.name === "EnterIso").keyWidth, keyWidthForUnits(1.25));
});

test("marks only the homing keys with a homing bar", () => {
  for (const templateKey of ["qwerty", "qwertz"]) {
    const homingKeys = createKeyboardTemplateKeycaps(templateKey)
      .filter((entry) => entry.homingBarEnabled)
      .map((entry) => entry.name);

    assert.deepEqual(homingKeys, ["F", "J", "Num5"], `unexpected homing keys for ${templateKey}`);
  }
});

test("gives every keycap in a template a unique, file-safe name", () => {
  for (const template of KEYBOARD_TEMPLATES) {
    const names = createKeyboardTemplateKeycaps(template.key).map((entry) => entry.name);

    assert.equal(new Set(names).size, names.length, `duplicate names in ${template.key}`);
    for (const name of names) {
      assert.match(name, /^[A-Za-z0-9]+$/, `unsafe keycap name in ${template.key}: ${name}`);
    }
  }
});

test("rejects an unknown template key", () => {
  assert.throws(() => createKeyboardTemplateKeycaps("azerty"), /Unknown keyboard template/);
});
