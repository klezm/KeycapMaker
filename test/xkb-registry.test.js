import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mergeRegistries, parseRegistryXml } from "../tools/keyboard-layouts/lib/xkb-registry.js";

const FIXTURE = fs.readFileSync("test/fixtures/xkb/rules/base.xml", "utf8");

test("registry parsing extracts layouts, variants, models and options", () => {
  const registry = parseRegistryXml(FIXTURE);

  assert.equal(registry.layouts.length, 3);
  assert.equal(registry.models.length, 2);
  assert.equal(registry.optionGroups.length, 1);
  assert.equal(registry.optionGroups[0].options.length, 1);

  const iso = registry.layouts.find((layout) => layout.name === "xa");
  assert.equal(iso.description, "Test ISO");
  assert.equal(iso.shortDescription, "xa");
  assert.deepEqual(iso.countries, ["DE"]);
  assert.deepEqual(iso.languages, ["deu"]);
  assert.deepEqual(
    iso.variants.map((variant) => variant.name),
    ["plain", "cyclic"],
  );
});

test("registry parsing decodes xml entities in descriptions", () => {
  const registry = parseRegistryXml(FIXTURE);
  const layout = registry.layouts.find((entry) => entry.name === "xb");

  assert.equal(layout.description, "Test ANSI & friends");
});

test("model vendor is read from the model config item", () => {
  const registry = parseRegistryXml(FIXTURE);
  const model = registry.models.find((entry) => entry.name === "pc105");

  assert.equal(model.vendor, "Generic");
  assert.equal(model.description, "Generic 105-key PC");
});

test("merging registries deduplicates layouts and appends new variants", () => {
  const extra = parseRegistryXml(`<?xml version="1.0" encoding="UTF-8"?>
<xkbConfigRegistry version="1.1">
  <layoutList>
    <layout>
      <configItem><name>xa</name><description>Test ISO</description></configItem>
      <variantList>
        <variant><configItem><name>plain</name><description>duplicate</description></configItem></variant>
        <variant><configItem><name>extra</name><description>Test ISO (extra)</description></configItem></variant>
      </variantList>
    </layout>
  </layoutList>
</xkbConfigRegistry>`);

  const merged = mergeRegistries([parseRegistryXml(FIXTURE), extra]);
  const layout = merged.layouts.find((entry) => entry.name === "xa");

  assert.equal(merged.layouts.length, 3);
  assert.deepEqual(
    layout.variants.map((variant) => variant.name),
    ["plain", "cyclic", "extra"],
  );
  assert.equal(layout.variants.find((variant) => variant.name === "plain").description, "Test ISO (plain)");
});

test("layouts are sorted by name after merging", () => {
  const merged = mergeRegistries([parseRegistryXml(FIXTURE)]);

  assert.deepEqual(
    merged.layouts.map((layout) => layout.name),
    ["xa", "xb", "xj"],
  );
});
