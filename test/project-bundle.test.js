import test from "node:test";
import assert from "node:assert/strict";

import {
  PROJECT_BUNDLE_KIND,
  PROJECT_BUNDLE_SCHEMA_VERSION,
  createEmptyProjectState,
  createProjectBundlePayload,
  createProjectKeycapEntry,
  createProjectManifest,
  isProjectBundlePayload,
  parseProjectBundlePayload,
} from "../src/lib/project-data.js";

function createSampleProject() {
  const esc = createProjectKeycapEntry({ name: "Esc", legendText: "Esc" });
  const enter = createProjectKeycapEntry({ name: "Enter", legendText: "Enter", keyWidth: 41.81 });

  return createEmptyProjectState({
    name: "Sample Board",
    keycaps: [esc, enter],
    activeKeycapId: enter.id,
  });
}

test("creates a self-contained project bundle payload", () => {
  const bundle = createProjectBundlePayload(createSampleProject());

  assert.equal(bundle.kind, PROJECT_BUNDLE_KIND);
  assert.equal(bundle.schemaVersion, PROJECT_BUNDLE_SCHEMA_VERSION);
  assert.equal(bundle.name, "Sample Board");
  assert.equal(bundle.keycaps.length, 2);
  assert.deepEqual(bundle.keycaps.map((entry) => entry.name), ["Esc", "Enter"]);
  assert.ok(bundle.keycaps.every((entry) => entry.editorData != null));
});

test("round-trips a project through the bundle payload", () => {
  const project = createSampleProject();
  const restored = parseProjectBundlePayload(JSON.parse(JSON.stringify(createProjectBundlePayload(project))));

  assert.equal(restored.name, project.name);
  assert.deepEqual(restored.keycaps.map((entry) => entry.name), ["Esc", "Enter"]);
  assert.deepEqual(restored.keycaps.map((entry) => entry.params.legendText), ["Esc", "Enter"]);
  assert.equal(restored.activeKeycapId, project.activeKeycapId);
});

test("keeps keycap display order when parsing a bundle", () => {
  const bundle = createProjectBundlePayload(createSampleProject());
  bundle.keycaps.reverse();

  const restored = parseProjectBundlePayload(bundle);

  assert.deepEqual(restored.keycaps.map((entry) => entry.name), ["Esc", "Enter"]);
});

test("recognizes only project bundle payloads", () => {
  const project = createSampleProject();

  assert.equal(isProjectBundlePayload(createProjectBundlePayload(project)), true);
  assert.equal(isProjectBundlePayload(createProjectManifest(project)), false);
  assert.equal(isProjectBundlePayload({ kind: "keycap-maker/editor-params" }), false);
  assert.equal(isProjectBundlePayload(null), false);
});

test("rejects bundles that are malformed or unsupported", () => {
  assert.throws(() => parseProjectBundlePayload(null), /malformed/);
  assert.throws(() => parseProjectBundlePayload({ kind: "keycap-maker/project" }), /KeycapMaker project JSON/);
  assert.throws(
    () => parseProjectBundlePayload({ kind: PROJECT_BUNDLE_KIND, schemaVersion: 99, keycaps: [] }),
    /Unsupported project bundle schemaVersion/,
  );
  assert.throws(
    () => parseProjectBundlePayload({ kind: PROJECT_BUNDLE_KIND, schemaVersion: PROJECT_BUNDLE_SCHEMA_VERSION, keycaps: [] }),
    /no keycaps/,
  );
  assert.throws(
    () => parseProjectBundlePayload({
      kind: PROJECT_BUNDLE_KIND,
      schemaVersion: PROJECT_BUNDLE_SCHEMA_VERSION,
      keycaps: [{ name: "Esc" }],
    }),
    /missing editorData/,
  );
});
