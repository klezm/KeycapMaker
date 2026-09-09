import test from "node:test";
import assert from "node:assert/strict";
import { parseIncludeTarget, parseSymbolsFile, stripComments } from "../tools/keyboard-layouts/lib/xkb-symbols-parser.js";
import { createSymbolsResolver } from "../tools/keyboard-layouts/lib/xkb-symbols-resolver.js";

const XKB_ROOT = "test/fixtures/xkb";

test("comments are stripped outside of quoted strings", () => {
  const source = 'key <A> {[ a ]}; // trailing\n/* block */ name[Group1]="a // b";';
  const stripped = stripComments(source);

  assert.ok(!stripped.includes("trailing"));
  assert.ok(!stripped.includes("block"));
  assert.ok(stripped.includes('name[Group1]="a // b"'));
});

test("include targets split into file and section", () => {
  assert.deepEqual(parseIncludeTarget("latin(type4)"), { file: "latin", section: "type4" });
  assert.deepEqual(parseIncludeTarget("pc"), { file: "pc", section: null });
  assert.deepEqual(parseIncludeTarget("macintosh_vndr/de(basic)"), {
    file: "macintosh_vndr/de",
    section: "basic",
  });
});

test("sections record their default flag, includes, group name and keys", () => {
  const sections = parseSymbolsFile(`default partial alphanumeric_keys
xkb_symbols "basic" {
    include "latin(type4)"
    name[Group1]="Example";
    key.type[group1] = "TWO_LEVEL";
    key <AE11> {[ ssharp, question ], type[group1]="FOUR_LEVEL_PLUS_LOCK" };
};`);

  assert.equal(sections.length, 1);
  assert.equal(sections[0].name, "basic");
  assert.equal(sections[0].isDefault, true);
  assert.equal(sections[0].groupName, "Example");
  assert.equal(sections[0].keyTypeDefault, "TWO_LEVEL");
  assert.deepEqual(sections[0].includes.map((include) => include.target), ["latin(type4)"]);
  assert.deepEqual(sections[0].keys[0].levels, ["ssharp", "question"]);
  assert.equal(sections[0].keys[0].explicitType, "FOUR_LEVEL_PLUS_LOCK");
});

test("multi-group keys resolve to group one", () => {
  const sections = parseSymbolsFile(`xkb_symbols "multi" {
    key <AD01> {[ q, Q ],[ Cyrillic_shorti, Cyrillic_SHORTI ]};
    key <AD02> { symbols[Group2]=[ x ], symbols[Group1]=[ w, W ] };
};`);

  assert.deepEqual(sections[0].keys[0].levels, ["q", "Q"]);
  assert.deepEqual(sections[0].keys[1].levels, ["w", "W"]);
});

test("includes are resolved recursively and later statements win", () => {
  const resolver = createSymbolsResolver(XKB_ROOT);
  const resolved = resolver.resolveSection("xa", null);

  assert.deepEqual(resolved.keys.get("AE01").levels, ["1", "exclam", "onesuperior", "exclamdown"]);
  assert.deepEqual(resolved.keys.get("AD02").levels, ["w", "W", "doublelowquotemark", "guillemotleft"]);
  assert.equal(resolved.groupName, "Test ISO");
});

test("a bare include resolves to the default section of the target file", () => {
  const resolver = createSymbolsResolver(XKB_ROOT);
  const resolved = resolver.resolveSection("xb", null);

  assert.deepEqual(resolved.keys.get("AD01").levels, ["q", "Q", "at", "Greek_OMEGA"]);
  assert.equal(resolved.keys.get("AE12").typeDefault, "TWO_LEVEL");
});

test("a section overrides keys brought in by its includes", () => {
  const resolver = createSymbolsResolver(XKB_ROOT);
  const resolved = resolver.resolveSection("xa", "plain");

  assert.deepEqual(resolved.keys.get("AD02").levels, ["w", "W"]);
});

test("the level3 switch key is detected from the resolved keys", () => {
  const resolver = createSymbolsResolver(XKB_ROOT);

  assert.equal(resolver.resolveSection("xa", null).level3Switch, "RALT");
  assert.equal(resolver.resolveSection("xb", null).level3Switch, null);
});

test("include cycles are broken and reported instead of hanging", () => {
  const resolver = createSymbolsResolver(XKB_ROOT);
  const resolved = resolver.resolveSection("xa", "cyclic");

  assert.equal(resolved.keys.size, 1);
  assert.ok(resolver.warnings.some((warning) => warning.startsWith("include cycle skipped")));
});

test("a missing symbols file is reported and yields no keys", () => {
  const resolver = createSymbolsResolver(XKB_ROOT);
  const resolved = resolver.resolveSection("does-not-exist", null);

  assert.equal(resolved.keys.size, 0);
  assert.ok(resolver.warnings.some((warning) => warning.includes("missing symbols file")));
});
