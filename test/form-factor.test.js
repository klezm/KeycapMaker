import test from "node:test";
import assert from "node:assert/strict";
import { createSymbolsResolver } from "../tools/keyboard-layouts/lib/xkb-symbols-resolver.js";
import { createKeycodeCanonicalizer } from "../tools/keyboard-layouts/lib/keycode-aliases.js";
import { deriveFormFactor, FORM_FACTORS, normalizeFormFactorId, resolveFormFactor, resolveFormFactorDefinition } from "../tools/keyboard-layouts/lib/form-factor.js";

const XKB_ROOT = "test/fixtures/xkb";

function keycodesFor(layout, variant = null) {
  const resolver = createSymbolsResolver(XKB_ROOT);
  const { canonicalize } = createKeycodeCanonicalizer(XKB_ROOT);
  const resolved = resolver.resolveSection(layout, variant);
  return new Set([...resolved.keys.keys()].map(canonicalize));
}

test("keycode aliases collapse onto the physical key they name", () => {
  const { canonicalize } = createKeycodeCanonicalizer(XKB_ROOT);

  assert.equal(canonicalize("AC12"), "BKSL");
  assert.equal(canonicalize("HZTG"), "TLDE");
  assert.equal(canonicalize("NFER"), "MUHE");
  assert.equal(canonicalize("XFER"), "HENK");
  assert.equal(canonicalize("AD01"), "AD01");
});

test("a yen key or a kana modifier identifies a JIS board", () => {
  assert.deepEqual(deriveFormFactor(keycodesFor("xj"), ["JP"]), { formFactor: "jis", source: "symbols" });
  assert.deepEqual(deriveFormFactor(new Set(["HKTG"]), []), { formFactor: "jis", source: "symbols" });
});

test("the extra key right of the period identifies an ABNT board", () => {
  assert.deepEqual(deriveFormFactor(new Set(["AB11", "LSGT"]), ["BR"]), { formFactor: "abnt", source: "symbols" });
});

test("the extra key left of Z identifies an ISO board", () => {
  assert.deepEqual(deriveFormFactor(keycodesFor("xa"), ["DE"]), { formFactor: "iso", source: "symbols" });
});

test("a layout without physical markers falls back to its primary country", () => {
  assert.deepEqual(deriveFormFactor(new Set(["AD01"]), ["US"]), { formFactor: "ansi", source: "region" });
  assert.deepEqual(deriveFormFactor(new Set(["AD01"]), ["FR"]), { formFactor: "iso", source: "region" });
  assert.deepEqual(deriveFormFactor(new Set(["AD01"]), ["JP"]), { formFactor: "jis", source: "region" });
  assert.deepEqual(deriveFormFactor(new Set(["AD01"]), ["BR"]), { formFactor: "abnt", source: "region" });
});

test("only the primary country decides the region fallback", () => {
  assert.equal(deriveFormFactor(new Set(["AD01"]), ["AR", "MX", "US"]).formFactor, "iso");
});

test("a layout with no country at all defaults to ANSI", () => {
  assert.deepEqual(deriveFormFactor(new Set(["AD01"]), []), { formFactor: "ansi", source: "default" });
});

test("resolveFormFactor reports the source it used", () => {
  const resolved = resolveFormFactor("xa", null, keycodesFor("xa"), ["DE"]);

  assert.equal(resolved.formFactor, "iso");
  assert.equal(resolved.source, "symbols");
  assert.equal(resolved.reason, null);
});

test("form factor ids are normalized and resolvable", () => {
  assert.equal(normalizeFormFactorId(" ISO "), "iso");
  assert.equal(normalizeFormFactorId("nope"), null);
  assert.equal(normalizeFormFactorId(null), null);
  assert.equal(resolveFormFactorDefinition("jis").keyCount, 109);
  assert.equal(resolveFormFactorDefinition("nope"), null);
});

test("every form factor names a board file and a key count", () => {
  assert.equal(FORM_FACTORS.length, 4);
  for (const formFactor of FORM_FACTORS) {
    assert.ok(formFactor.boardFile.endsWith(".json"));
    assert.ok(formFactor.keyCount > 100);
  }
});
