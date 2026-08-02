import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createDefaultKeycapParams,
  getShapeProfileFieldGroups,
} from "../src/data/keycap-shape-registry.js";
import {
  createEditorDataPayload,
  deleteEditorDataPayloadPath,
  EDITOR_DATA_KIND,
  EDITOR_DATA_SCHEMA_VERSION,
  getTopSurfaceShapePreset,
  mergeEditorDataPayloadParams,
  parseEditorDataPayload,
  parseEditorDataPayloadWithReport,
  sanitizeExportBaseName,
  resolveStemCrossMarginAfterStemTypeChange,
  syncDerivedKeycapParams,
} from "../src/lib/editor-data.js";
import { USER_KEYCAP_LEGEND_FONT_KEY_PREFIX } from "../src/lib/keycap-fonts.js";

async function loadFixture(name) {
  const fixtureUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const text = await readFile(fixtureUrl, "utf8");
  return JSON.parse(text);
}

test("compatible input JSON fills in missing typewriter parameters with defaults", async () => {
  const payload = await loadFixture("editor-data-sparse-typewriter.json");
  const defaults = createDefaultKeycapParams("typewriter");
  const parsed = parseEditorDataPayload(payload);

  assert.equal(parsed.shapeProfile, "typewriter");
  assert.equal(parsed.name, "Typewriter patch");
  assert.equal(parsed.rimEnabled, false);
  assert.equal(parsed.rimWidth, defaults.rimWidth);
  assert.equal(parsed.rimHeightUp, defaults.rimHeightUp);
  assert.equal(parsed.rimHeightDown, defaults.rimHeightDown);
  assert.equal(parsed.typewriterMountHeight, defaults.typewriterMountHeight);
  assert.equal(parsed.legendText, "ESC");
  assert.equal(parsed.legendFontKey, "orbitron-regular");
  assert.equal(parsed.legendFontStyleKey, "font-default");
  assert.equal(parsed.legendContentType, "text");
  assert.equal(parsed.legendIconSet, "lucide");
  assert.equal(parsed.legendIconName, "circle");
  assert.equal(parsed.stemType, defaults.stemType);
  assert.equal(parsed.topSlopeInputMode, defaults.topSlopeInputMode);
  assert.equal(parsed.topSurfaceShape, defaults.topSurfaceShape);
  assert.equal(parsed.topOffsetX, defaults.topOffsetX);
  assert.equal(parsed.topOffsetY, defaults.topOffsetY);
  assert.equal(parsed.stemEnabled, true);
  assert.ok(Number.isFinite(parsed.topFrontHeight));
  assert.ok(Number.isFinite(parsed.topVisibleCenterHeight));

  const exported = createEditorDataPayload(parsed);
  assert.equal(exported.kind, EDITOR_DATA_KIND);
  assert.equal(exported.schemaVersion, EDITOR_DATA_SCHEMA_VERSION);
  assert.deepEqual(
    Object.keys(exported.params).sort(),
    Object.keys(defaults).sort(),
  );
  assert.equal(exported.params.rimWidth, defaults.rimWidth);
  assert.equal(exported.params.rimEnabled, false);
});

test("existing text-print JSON loads as text even without icon fields", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendText: "ESC",
      legendContentType: undefined,
      legendIconSet: undefined,
      legendIconName: undefined,
    },
  });
  const exported = createEditorDataPayload(parsed);

  assert.equal(parsed.legendText, "ESC");
  assert.equal(parsed.legendContentType, "text");
  assert.equal(parsed.legendIconSet, "lucide");
  assert.equal(parsed.legendIconName, "circle");
  assert.equal(parsed.legendIconFill, false);
  assert.equal(exported.params.legendContentType, "text");
  assert.equal(exported.params.legendIconSet, "lucide");
  assert.equal(exported.params.legendIconName, "circle");
  assert.equal(exported.params.legendIconFill, false);
});

test("icon-print JSON preserves icon settings and clamps invalid icon names to the default", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendContentType: "icon",
      legendIconSet: "lucide",
      legendIconName: "volume-2",
    },
  });
  const fallback = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendContentType: "icon",
      legendIconSet: "lucide",
      legendIconName: "not-a-real-lucide-icon",
    },
  });

  assert.equal(parsed.legendContentType, "icon");
  assert.equal(parsed.legendIconSet, "lucide");
  assert.equal(parsed.legendIconName, "volume-2");
  assert.equal(parsed.legendIconFill, false);
  assert.equal(fallback.legendContentType, "icon");
  assert.equal(fallback.legendIconName, "circle");
});

test("supported icon set's fill setting is preserved as a bool in JSON", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const material = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendContentType: "icon",
      legendIconSet: "material-symbols",
      legendIconName: "circle",
      legendIconFill: true,
    },
  });
  const lucide = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendContentType: "icon",
      legendIconSet: "lucide",
      legendIconName: "circle",
      legendIconFill: true,
    },
  });
  const materialWithoutFillVariant = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendContentType: "icon",
      legendIconSet: "material-symbols",
      legendIconName: "arrow-forward",
      legendIconFill: true,
    },
  });
  const legacyRemixFillName = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendContentType: "icon",
      legendIconSet: "remix-icon",
      legendIconName: "circle-fill",
    },
  });
  const exported = createEditorDataPayload(legacyRemixFillName);

  assert.equal(material.legendIconName, "circle");
  assert.equal(material.legendIconFill, true);
  assert.equal(lucide.legendIconFill, false);
  assert.equal(materialWithoutFillVariant.legendIconName, "arrow-forward");
  assert.equal(materialWithoutFillVariant.legendIconFill, false);
  assert.equal(legacyRemixFillName.legendIconName, "circle-line");
  assert.equal(legacyRemixFillName.legendIconFill, true);
  assert.equal(exported.params.legendIconName, "circle-line");
  assert.equal(exported.params.legendIconFill, true);
});

test("sparse JSON without kind also binds top-level parameters and fills in the missing ones", async () => {
  const payload = await loadFixture("editor-data-sparse-top-level.json");
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload(payload);

  assert.equal(parsed.shapeProfile, "custom-shell");
  assert.equal(parsed.name, "top-level partial");
  assert.equal(parsed.legendEnabled, false);
  assert.equal(parsed.topCenterHeight, 11.2);
  assert.equal(parsed.topScale, defaults.topScale);
  assert.equal(parsed.topThickness, defaults.topThickness);
  assert.equal(parsed.topSurfaceShape, defaults.topSurfaceShape);
  assert.equal(parsed.homingBarEnabled, defaults.homingBarEnabled);
  assert.equal(parsed.homingBarChamfer, defaults.homingBarChamfer);
  assert.equal(parsed.legendFontKey, defaults.legendFontKey);
  assert.ok(Number.isFinite(parsed.topBackHeight));
});

test("unloaded user font key is preserved in the edit data", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const userFontKey = `${USER_KEYCAP_LEGEND_FONT_KEY_PREFIX}0123456789abcdef`;
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendFontKey: userFontKey,
      legendFontStyleKey: "unknown-style",
    },
  });
  const exported = createEditorDataPayload(parsed);

  assert.equal(parsed.legendFontKey, userFontKey);
  assert.equal(parsed.legendFontStyleKey, "font-default");
  assert.equal(exported.params.legendFontKey, userFontKey);
});

test("J-STEM-LP01 stemType is preserved in the edit data", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      stemType: "j_stem_lp01",
      jStemLp01PreviewColor: "orange",
    },
  });

  assert.equal(parsed.stemType, "j_stem_lp01");
  assert.equal(parsed.jStemLp01PreviewColor, "orange");
  assert.equal(parsed.stemEnabled, true);
});

test("J-STEM-LP01 preview color defaults to clear and clamps invalid values", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      stemType: "j_stem_lp01",
      jStemLp01PreviewColor: "blue",
    },
  });

  assert.equal(defaults.jStemLp01PreviewColor, "clear");
  assert.equal(parsed.jStemLp01PreviewColor, "clear");
});

test("J-STEM-LP01 stem start position offset clamps negative values to 0", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      stemType: "j_stem_lp01",
      stemInsetDelta: -0.4,
    },
  });

  assert.equal(parsed.stemType, "j_stem_lp01");
  assert.equal(parsed.stemInsetDelta, 0);
});

test("switching to J-STEM-LP01 starts unadjusted clearance at 0.1mm", () => {
  assert.equal(resolveStemCrossMarginAfterStemTypeChange("j_stem_lp01", 0, "choc_v2"), 0.1);
  assert.equal(resolveStemCrossMarginAfterStemTypeChange("j_stem_lp01", -0.04, "mx"), 0.1);
  assert.equal(resolveStemCrossMarginAfterStemTypeChange("j_stem_lp01", 0.12, "choc_v2"), 0.12);
  assert.equal(resolveStemCrossMarginAfterStemTypeChange("j_stem_lp01", 0, "j_stem_lp01"), 0);
  assert.equal(resolveStemCrossMarginAfterStemTypeChange("mx", 0, "choc_v2"), 0);
});

test("reports parameters that cannot be bound when loading JSON", () => {
  const { params, bindingReport } = parseEditorDataPayloadWithReport({
    shapeProfile: "typewriter",
    keyWidth: 19,
    topCornerRadius: 2,
    oldCustomField: true,
    params: {
      keyDepth: 18.5,
      legacyNestedField: 4,
    },
  });

  assert.equal(params.shapeProfile, "typewriter");
  assert.equal(params.keyWidth, 19);
  assert.equal(params.keyDepth, 18.5);
  assert.equal(bindingReport.profileKey, "typewriter");
  assert.deepEqual(
    bindingReport.unboundParams.map((entry) => entry.path).sort(),
    ["oldCustomField", "params.legacyNestedField", "topCornerRadius"].sort(),
  );
  assert.deepEqual(
    Object.fromEntries(bindingReport.unboundParams.map((entry) => [entry.path, entry.value])),
    {
      oldCustomField: true,
      "params.legacyNestedField": 4,
      topCornerRadius: 2,
    },
  );
});

test("also reports unsupported parameters left at the top level of current-format JSON", () => {
  const payload = createEditorDataPayload({
    ...createDefaultKeycapParams("typewriter"),
    name: "current with legacy field",
  });
  const { bindingReport } = parseEditorDataPayloadWithReport({
    ...payload,
    legacyTopLevelField: 7,
  });

  assert.deepEqual(bindingReport.unboundParams.map((entry) => entry.path), ["legacyTopLevelField"]);
  assert.equal(bindingReport.unboundParams[0].value, 7);
});

test("updates known parameters while preserving unsupported parameters in project JSON", () => {
  const existingPayload = {
    shapeProfile: "typewriter",
    name: "legacy source",
    legacyTopLevelField: 7,
    params: {
      keyDepth: 18.5,
      legacyNestedField: 4,
    },
  };
  const nextPayload = mergeEditorDataPayloadParams(existingPayload, {
    ...createDefaultKeycapParams("typewriter"),
    name: "updated source",
    keyDepth: 19.25,
  });
  const { params, bindingReport } = parseEditorDataPayloadWithReport(nextPayload);

  assert.equal(params.name, "updated source");
  assert.equal(params.keyDepth, 19.25);
  assert.equal(nextPayload.legacyTopLevelField, 7);
  assert.equal(nextPayload.params.legacyNestedField, 4);
  assert.deepEqual(
    bindingReport.unboundParams.map((entry) => entry.path).sort(),
    ["legacyTopLevelField", "params.legacyNestedField"].sort(),
  );
});

test("does not carry over parameters specific to the old shape when the base shape is changed", () => {
  const existingPayload = createEditorDataPayload({
    ...createDefaultKeycapParams("custom-shell"),
    name: "custom source",
    topHatEnabled: true,
  });
  const nextPayload = mergeEditorDataPayloadParams(existingPayload, {
    ...createDefaultKeycapParams("jis-enter"),
    name: "custom source",
  });
  const { params, bindingReport } = parseEditorDataPayloadWithReport(nextPayload);

  assert.equal(params.shapeProfile, "jis-enter");
  assert.equal(params.name, "custom source");
  assert.equal(Object.hasOwn(nextPayload.params, "topCornerRadius"), false);
  assert.equal(Object.hasOwn(nextPayload.params, "topCornerRadiusIndividualEnabled"), false);
  assert.equal(Object.hasOwn(nextPayload.params, "topHatTopWidth"), false);
  assert.equal(Object.hasOwn(nextPayload.params, "topHatTopDepth"), false);
  assert.equal(Object.hasOwn(nextPayload.params, "topHatBottomWidth"), false);
  assert.equal(Object.hasOwn(nextPayload.params, "topHatBottomDepth"), false);
  assert.deepEqual(bindingReport.unboundParams, []);
});

test("removes only the corresponding parameter from JSON using the load report's path", () => {
  const payload = {
    shapeProfile: "typewriter",
    legacyTopLevelField: 7,
    params: {
      keyDepth: 18.5,
      legacyNestedField: 4,
    },
  };
  const nestedResult = deleteEditorDataPayloadPath(payload, "params.legacyNestedField");
  const topLevelResult = deleteEditorDataPayloadPath(nestedResult.payload, "legacyTopLevelField");
  const { bindingReport } = parseEditorDataPayloadWithReport(topLevelResult.payload);

  assert.equal(nestedResult.deleted, true);
  assert.equal(topLevelResult.deleted, true);
  assert.equal(payload.params.legacyNestedField, 4);
  assert.equal(payload.legacyTopLevelField, 7);
  assert.equal(topLevelResult.payload.params.legacyNestedField, undefined);
  assert.equal(topLevelResult.payload.legacyTopLevelField, undefined);
  assert.deepEqual(bindingReport.unboundParams, []);
});

test("homing bar chamfer amount clamps negative numbers to 0", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    homingBarChamfer: -0.4,
  });

  assert.equal(parsed.homingBarChamfer, 0);
});

test("stem entrance chamfer amount is preserved, clamping negative numbers to 0", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    stemCrossChamfer: 0.2,
  });
  const rounded = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    stemCrossChamfer: -0.4,
  });

  assert.equal(defaults.stemCrossChamfer, 0);
  assert.equal(parsed.stemCrossChamfer, 0.2);
  assert.equal(rounded.stemCrossChamfer, 0);
});

test("input with only a legacy dish specification is interpreted as spherical", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    dishDepth: 0.8,
  });

  assert.equal(parsed.topSurfaceShape, "spherical");
  assert.equal(parsed.topVisibleCenterHeight, parsed.topCenterHeight - 0.8);
});

test("negative depth is treated as a bulge that mirrors the current curved surface", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "cylindrical",
    dishDepth: -0.6,
  });

  assert.equal(parsed.topSurfaceShape, "cylindrical");
  assert.equal(parsed.dishDepth, -0.6);
  assert.equal(parsed.topVisibleCenterHeight, parsed.topCenterHeight + 0.6);

  const reparsed = parseEditorDataPayload(createEditorDataPayload(parsed));
  assert.equal(reparsed.topSurfaceShape, "cylindrical");
  assert.equal(reparsed.dishDepth, -0.6);
});

test("curved surface depth keeps the default while allowing up to 1.5mm in either direction", () => {
  const cylindrical = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "cylindrical",
    dishDepth: 1.4,
  });
  const spherical = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "spherical",
    dishDepth: 1.45,
  });
  const raisedCylindrical = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "cylindrical",
    dishDepth: -1.4,
  });
  const raisedSpherical = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "spherical",
    dishDepth: -1.45,
  });
  const wideSpherical = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    keyWidth: 36,
    keyDepth: 18,
    topSurfaceShape: "spherical",
    dishDepth: 1.45,
  });
  const overMaximum = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "cylindrical",
    dishDepth: 2,
  });
  const belowMinimum = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "spherical",
    dishDepth: -2,
  });

  assert.equal(cylindrical.dishDepth, 1.4);
  assert.equal(spherical.dishDepth, 1.45);
  assert.equal(raisedCylindrical.dishDepth, -1.4);
  assert.equal(raisedSpherical.dishDepth, -1.45);
  assert.equal(wideSpherical.dishDepth, 1.45);
  assert.equal(overMaximum.dishDepth, 1.5);
  assert.equal(belowMinimum.dishDepth, -1.5);
});

test("negative values with only a legacy dish specification are also interpreted as a spherical bulge", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    dishDepth: -0.6,
  });

  assert.equal(parsed.topSurfaceShape, "spherical");
  assert.equal(parsed.dishDepth, -0.6);
  assert.equal(parsed.topVisibleCenterHeight, parsed.topCenterHeight + 0.6);
});

test("typewriter accepts a spherical top", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "typewriter",
    topSurfaceShape: "spherical",
    dishDepth: 0.8,
  });

  assert.equal(parsed.topSurfaceShape, "spherical");
  assert.equal(parsed.topVisibleCenterHeight, parsed.topCenterHeight - 0.8);

  const raised = parseEditorDataPayload({
    shapeProfile: "typewriter",
    topSurfaceShape: "spherical",
    dishDepth: -0.8,
  });
  assert.equal(raised.dishDepth, -0.8);
  assert.equal(raised.topVisibleCenterHeight, raised.topCenterHeight + 0.8);
});

test("typewriter JIS enter accepts a spherical top and notch dimensions", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "typewriter-jis-enter",
    topSurfaceShape: "spherical",
    dishDepth: -0.8,
    keyWidth: 27,
    keyDepth: 36,
    jisEnterNotchWidth: 4.5,
    jisEnterNotchDepth: 18,
  });

  assert.equal(parsed.shapeProfile, "typewriter-jis-enter");
  assert.equal(parsed.topSurfaceShape, "spherical");
  assert.equal(parsed.dishDepth, -0.8);
  assert.equal(parsed.topVisibleCenterHeight, parsed.topCenterHeight + 0.8);
  assert.equal(parsed.jisEnterNotchWidth, 4.5);
  assert.equal(parsed.jisEnterNotchDepth, 18);
});

test("typewriter does not accept a cylindrical top and reverts to default", () => {
  const defaults = createDefaultKeycapParams("typewriter");
  const parsed = parseEditorDataPayload({
    shapeProfile: "typewriter",
    topSurfaceShape: "cylindrical",
    dishDepth: 0.7,
  });

  assert.equal(parsed.topSurfaceShape, defaults.topSurfaceShape);
  assert.equal(parsed.topVisibleCenterHeight, parsed.topCenterHeight);
});

test("typewriter's top reference height is clamped below the body thickness", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "typewriter",
    topCenterHeight: 5.2,
    typewriterMountHeight: 4.0,
  });

  assert.ok(Math.abs(parsed.typewriterMountHeight - 5.78) < 1e-9);
});

test("typewriter does not lose key rim width even when key dimensions temporarily become 0", () => {
  const defaults = createDefaultKeycapParams("typewriter");
  const params = syncDerivedKeycapParams({
    ...defaults,
    keyWidth: 0,
    rimEnabled: true,
    rimWidth: defaults.rimWidth,
  });

  assert.equal(params.keyWidth, defaults.keyWidth);
  assert.equal(params.rimWidth, defaults.rimWidth);
});

test("typewriter fills empty key dimension input with defaults and keeps the key rim width", () => {
  const defaults = createDefaultKeycapParams("typewriter");
  const parsed = parseEditorDataPayload({
    shapeProfile: "typewriter",
    keyWidth: "",
    keyDepth: "",
    rimEnabled: true,
    rimWidth: defaults.rimWidth,
  });

  assert.equal(parsed.keyWidth, defaults.keyWidth);
  assert.equal(parsed.keyDepth, defaults.keyDepth);
  assert.equal(parsed.rimWidth, defaults.rimWidth);
});

test("returns a representative preset for each keytop shape", () => {
  assert.deepEqual(getTopSurfaceShapePreset("flat"), {
    dishDepth: 0,
  });
  assert.deepEqual(getTopSurfaceShapePreset("cylindrical"), {
    dishDepth: 0.5,
  });
  assert.deepEqual(getTopSurfaceShapePreset("spherical"), {
    dishDepth: 1.0,
  });
});

test("keytop center offset is preserved in saved data", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topOffsetX: 1.25,
    topOffsetY: -2.5,
  });

  assert.equal(parsed.topOffsetX, 1.25);
  assert.equal(parsed.topOffsetY, -2.5);
  const exported = createEditorDataPayload(parsed);
  assert.equal(exported.params.topOffsetX, 1.25);
  assert.equal(exported.params.topOffsetY, -2.5);
});

test("print size default is 5mm", () => {
  assert.equal(createDefaultKeycapParams("custom-shell").legendSize, 5.0);
  assert.equal(createDefaultKeycapParams("jis-enter").legendSize, 5.0);
  assert.equal(createDefaultKeycapParams("typewriter").legendSize, 5.0);
  assert.equal(createDefaultKeycapParams("typewriter-jis-enter").legendSize, 5.0);
});

test("keytop corner prints have the same parameter set as the center print", () => {
  const shapeKeys = ["custom-shell", "jis-enter", "typewriter", "typewriter-jis-enter"];
  const prefixes = ["topLegendRightTop", "topLegendRightBottom", "topLegendLeftTop", "topLegendLeftBottom"];
  const textDefaults = {
    topLegendLeftTopText: "1",
    topLegendRightTopText: "2",
    topLegendLeftBottomText: "3",
    topLegendRightBottomText: "4",
  };
  const offsetDefaults = {
    "custom-shell": { x: 0.72, y: 0.72 },
    "jis-enter": { x: 1.08, y: 1.44 },
    "typewriter": { x: 0.72, y: 0.72 },
    "typewriter-jis-enter": { x: 1.08, y: 1.44 },
  };
  const suffixes = [
    "Enabled",
    "Color",
    "Text",
    "FontKey",
    "FontStyleKey",
    "UnderlineEnabled",
    "Size",
    "OutlineDelta",
    "Height",
    "Embed",
    "OffsetX",
    "OffsetY",
  ];

  for (const shapeKey of shapeKeys) {
    const defaults = createDefaultKeycapParams(shapeKey);
    const { x, y } = offsetDefaults[shapeKey];
    const expectedOffsets = {
      topLegendLeftTop: { x, y: -y },
      topLegendRightTop: { x: -x, y: -y },
      topLegendLeftBottom: { x, y },
      topLegendRightBottom: { x: -x, y },
    };

    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        assert.ok(`${prefix}${suffix}` in defaults);
      }

      assert.equal(defaults[`${prefix}Enabled`], false);
      assert.equal(defaults[`${prefix}Size`], 3.5);
      assert.equal(defaults[`${prefix}Height`], 0);
      assert.equal(defaults[`${prefix}Embed`], 0.6);
      assert.equal(defaults[`${prefix}Color`], "#212529");
      assert.equal(defaults[`${prefix}OffsetX`], expectedOffsets[prefix].x);
      assert.equal(defaults[`${prefix}OffsetY`], expectedOffsets[prefix].y);
    }
    for (const [textKey, expectedText] of Object.entries(textDefaults)) {
      assert.equal(defaults[textKey], expectedText);
    }
  }
});

test("sidewall print size is 4mm and height defaults to flush", () => {
  const shapeKeys = ["custom-shell", "jis-enter", "typewriter", "typewriter-jis-enter"];
  const sideSizeKeys = ["sideLegendFrontSize", "sideLegendBackSize", "sideLegendLeftSize", "sideLegendRightSize"];
  const sideHeightKeys = ["sideLegendFrontHeight", "sideLegendBackHeight", "sideLegendLeftHeight", "sideLegendRightHeight"];
  const sideTextDefaults = {
    sideLegendFrontText: "F",
    sideLegendBackText: "B",
    sideLegendLeftText: "R",
    sideLegendRightText: "F",
  };
  const sideEmbedKeys = ["sideLegendFrontEmbed", "sideLegendBackEmbed", "sideLegendLeftEmbed", "sideLegendRightEmbed"];

  for (const shapeKey of shapeKeys) {
    const defaults = createDefaultKeycapParams(shapeKey);

    for (const sideSizeKey of sideSizeKeys) {
      assert.equal(defaults[sideSizeKey], 4.0);
    }
    for (const [sideTextKey, expectedText] of Object.entries(sideTextDefaults)) {
      assert.equal(defaults[sideTextKey], expectedText);
    }
    for (const sideHeightKey of sideHeightKeys) {
      assert.equal(defaults[sideHeightKey], 0);
    }
    for (const sideEmbedKey of sideEmbedKeys) {
      assert.equal(sideEmbedKey in defaults, false);
    }
  }
});

test("negative print height value is preserved in the edit data", () => {
  const defaults = createDefaultKeycapParams("custom-shell");
  const parsed = parseEditorDataPayload({
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    params: {
      ...defaults,
      legendHeight: -0.4,
      topLegendRightTopHeight: -0.25,
      sideLegendFrontHeight: -0.3,
    },
  });
  const exported = createEditorDataPayload(parsed);

  assert.equal(parsed.legendHeight, -0.4);
  assert.equal(parsed.topLegendRightTopHeight, -0.25);
  assert.equal(parsed.sideLegendFrontHeight, -0.3);
  assert.equal(exported.params.legendHeight, -0.4);
  assert.equal(exported.params.topLegendRightTopHeight, -0.25);
  assert.equal(exported.params.sideLegendFrontHeight, -0.3);
});

test("shell-type top taper defaults to a common keycap ratio", () => {
  assert.equal(createDefaultKeycapParams("custom-shell").topScale, 0.75);
  assert.equal(createDefaultKeycapParams("jis-enter").topScale, 0.75);
  assert.equal(createDefaultKeycapParams("typewriter").topScale, 1);
  assert.equal(createDefaultKeycapParams("typewriter-jis-enter").topScale, 1);
});

test("top-center height is shown between width and depth on the shape card", () => {
  for (const profileKey of ["custom-shell", "jis-enter", "typewriter", "typewriter-jis-enter"]) {
    const shapeGroup = getShapeProfileFieldGroups(profileKey).find((group) => group.id === "shape");
    const topGroup = getShapeProfileFieldGroups(profileKey).find((group) => group.id === "top");

    assert.deepEqual(
      shapeGroup.fieldKeys.slice(1, 4),
      ["keyWidth", "topCenterHeight", "keyDepth"],
    );
    assert.equal(topGroup.fieldKeys.includes("topCenterHeight"), false);
  }
});

test("top hat shows the base immediately after the top surface in a card independent of the keytop", () => {
  const groups = getShapeProfileFieldGroups("custom-shell");
  const topGroup = groups.find((group) => group.id === "top");
  const topHatGroup = groups.find((group) => group.id === "topHat");
  const jisGroups = getShapeProfileFieldGroups("jis-enter");
  const jisTopGroup = jisGroups.find((group) => group.id === "top");
  const jisTopHatGroup = jisGroups.find((group) => group.id === "topHat");

  assert.equal(topGroup.fieldKeys.includes("topHatEnabled"), false);
  assert.notEqual(topHatGroup, undefined);
  assert.deepEqual(
    topHatGroup.fieldKeys.slice(0, 3),
    ["topHatEnabled", "topHatSeparateColorEnabled", "topHatColor"],
  );
  const topWidthIndex = topHatGroup.fieldKeys.indexOf("topHatTopWidth");
  assert.notEqual(topWidthIndex, -1);
  assert.deepEqual(
    topHatGroup.fieldKeys.slice(topWidthIndex, topWidthIndex + 4),
    ["topHatTopWidth", "topHatTopDepth", "topHatBottomWidth", "topHatBottomDepth"],
  );
  assert.equal(jisTopGroup.fieldKeys.includes("topHatEnabled"), false);
  assert.notEqual(jisTopHatGroup, undefined);
  assert.deepEqual(jisTopHatGroup.fieldKeys, [
    "topHatEnabled",
    "topHatSeparateColorEnabled",
    "topHatColor",
    "topHatSurfaceShape",
    "topHatDishDepth",
    "topHatInset",
    "topHatTopRadius",
    "topHatBottomRadius",
    "topHatHeight",
    "topHatShoulderAngle",
    "topHatShoulderRadius",
  ]);
});

test("top taper widens the lower bound for pointed shapes while preserving inner clearance", () => {
  const pointed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topScale: 0.01,
  });
  const narrow = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    keyWidth: 10,
    keyDepth: 10,
    topScale: 0.02,
  });

  assert.equal(pointed.topScale, 0.02);
  assert.equal(narrow.topScale, 0.13);
});

test("keycap body shoulder radius is clamped to the taper width range", () => {
  const rounded = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    keyWidth: 18,
    keyDepth: 18,
    topCenterHeight: 9.5,
    topScale: 0.75,
    keycapShoulderRadius: 99,
  });
  const concave = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    keyWidth: 18,
    keyDepth: 18,
    topCenterHeight: 9.5,
    topScale: 0.75,
    keycapShoulderRadius: -99,
  });

  assert.ok(Math.abs(rounded.keycapShoulderRadius - 2.25) < 1e-9);
  assert.ok(Math.abs(concave.keycapShoulderRadius + 2.25) < 1e-9);
});

test("keytop top edge radius is clamped to 0 or above and within the taper width range", () => {
  const rounded = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    keyWidth: 18,
    keyDepth: 18,
    topCenterHeight: 9.5,
    topScale: 0.75,
    keycapEdgeRadius: 99,
  });
  const negative = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    keyWidth: 18,
    keyDepth: 18,
    topCenterHeight: 9.5,
    topScale: 0.75,
    keycapEdgeRadius: -1,
  });

  assert.equal(createDefaultKeycapParams("custom-shell").keycapEdgeRadius, 0);
  assert.equal(createDefaultKeycapParams("jis-enter").keycapEdgeRadius, 0);
  assert.ok(Math.abs(rounded.keycapEdgeRadius - 2.25) < 1e-9);
  assert.equal(negative.keycapEdgeRadius, 0);
});

test("keytop wall thickness is preserved as saved data and keeps the minimum value", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topThickness: 2.4,
  });
  const clamped = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topThickness: -1,
  });

  assert.equal(parsed.topThickness, 2.4);
  assert.equal(clamped.topThickness, 0.05);
});

test("custom shell top radius preserves shared and individual values and clamps within the top surface", () => {
  const shared = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topCornerRadius: 2.4,
    topCornerRadiusIndividualEnabled: false,
    topCornerRadiusLeftTop: 4.2,
  });
  const individual = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topCornerRadius: 99,
    topCornerRadiusIndividualEnabled: true,
    topCornerRadiusLeftTop: 1,
    topCornerRadiusRightTop: 99,
    topCornerRadiusRightBottom: 3,
    topCornerRadiusLeftBottom: 4,
  });

  assert.equal(shared.topCornerRadius, 2.4);
  assert.equal(shared.topCornerRadiusLeftTop, 2.4);
  assert.equal(shared.topCornerRadiusRightTop, 2.4);
  assert.equal(shared.topCornerRadiusRightBottom, 2.4);
  assert.equal(shared.topCornerRadiusLeftBottom, 2.4);

  assert.equal(individual.topCornerRadius, 6.75);
  assert.equal(individual.topCornerRadiusIndividualEnabled, true);
  assert.equal(individual.topCornerRadiusLeftTop, 1);
  assert.equal(individual.topCornerRadiusRightTop, 6.75);
  assert.equal(individual.topCornerRadiusRightBottom, 3);
  assert.equal(individual.topCornerRadiusLeftBottom, 4);
});

test("JIS enter clamps the notch dimensions within the key dimensions", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "jis-enter",
    keyWidth: 27,
    keyDepth: 36,
    jisEnterNotchWidth: 99,
    jisEnterNotchDepth: 99,
  });

  assert.equal(parsed.shapeProfile, "jis-enter");
  assert.equal(parsed.jisEnterNotchWidth, 26.8);
  assert.equal(parsed.jisEnterNotchDepth, 35.8);
  assert.equal(parsed.topSurfaceShape, "flat");
});

test("JIS enter's default dimensions place the stem origin at the center of the lower body", () => {
  const params = createDefaultKeycapParams("jis-enter");
  const left = -params.keyWidth / 2 - params.jisEnterNotchWidth / 2;
  const right = params.keyWidth / 2 - params.jisEnterNotchWidth / 2;
  const notchX = left + params.jisEnterNotchWidth;
  const lowerBodyCenterX = (notchX + right) / 2;
  const lowerBodyWidth = right - notchX;

  assert.equal(lowerBodyCenterX, 0);
  assert.equal(lowerBodyWidth, 22.5);
  assert.equal(params.keyDepth, 36);
  assert.equal(params.jisEnterNotchDepth, 18);
});

test("top-hat parameters are preserved per supported shape and clamped within the top surface", () => {
  const wideTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatTopWidth: 99,
    topHatTopDepth: 99,
    topHatBottomWidth: 99,
    topHatBottomDepth: 99,
    topHatTopRadius: 99,
    topHatBottomRadius: 99,
    topHatHeight: 20,
    topHatShoulderAngle: 100,
    topHatShoulderRadius: 99,
  });
  const smallTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatTopWidth: 3,
    topHatTopDepth: 3,
    topHatTopRadius: 99,
    topHatHeight: 20,
    topHatShoulderAngle: 45,
    topHatShoulderRadius: 0.6,
  });
  const individualTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatTopWidth: 4,
    topHatTopDepth: 6,
    topHatTopRadius: 1.2,
    topHatTopRadiusIndividualEnabled: true,
    topHatTopRadiusLeftTop: 0.4,
    topHatTopRadiusRightTop: 99,
    topHatTopRadiusRightBottom: 1.6,
    topHatTopRadiusLeftBottom: 2.4,
  });
  const separateBottomTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatTopWidth: 4,
    topHatTopDepth: 6,
    topHatBottomWidth: 6,
    topHatBottomDepth: 8,
    topHatTopRadius: 1,
    topHatBottomRadius: 4,
    topHatHeight: 1,
    topHatShoulderAngle: 45,
  });
  const individualBottomTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatTopWidth: 4,
    topHatTopDepth: 6,
    topHatBottomWidth: 6,
    topHatBottomDepth: 8,
    topHatBottomRadius: 1,
    topHatBottomRadiusIndividualEnabled: true,
    topHatBottomRadiusLeftTop: 0.4,
    topHatBottomRadiusRightTop: 99,
    topHatBottomRadiusRightBottom: 1.2,
    topHatBottomRadiusLeftBottom: 2.4,
    topHatHeight: 1,
    topHatShoulderAngle: 45,
  });
  const recessedTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatHeight: -99,
  });
  const shallowRecessTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatHeight: -0.8,
    topHatShoulderRadius: -0.4,
  });
  const overRadiusRecessTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatHeight: -0.5,
    topHatShoulderRadius: -1.0,
  });
  const jisTopHat = parseEditorDataPayload({
    shapeProfile: "jis-enter",
    topHatEnabled: true,
    topHatInset: 99,
    topHatTopRadius: 99,
    topHatHeight: 20,
    topHatShoulderRadius: 99,
  });
  const curvedTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topSurfaceShape: "flat",
    topHatEnabled: true,
    topHatSurfaceShape: "spherical",
    topHatDishDepth: 0.8,
  });
  const raisedTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatSurfaceShape: "spherical",
    topHatDishDepth: -4,
  });
  const coloredTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatSeparateColorEnabled: true,
    topHatColor: "#123abc",
  });
  const fallbackColoredTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    topHatEnabled: true,
    topHatSeparateColorEnabled: "yes",
    topHatColor: "not-a-color",
  });
  const missingColoredTopHat = parseEditorDataPayload({
    shapeProfile: "custom-shell",
    bodyColor: "#cc3300",
    topHatEnabled: true,
    topHatSeparateColorEnabled: true,
  });
  const jisEnterDefaults = createDefaultKeycapParams("jis-enter");

  assert.equal(wideTopHat.topHatEnabled, true);
  assert.ok(wideTopHat.topHatTopWidth < wideTopHat.keyWidth);
  assert.ok(wideTopHat.topHatTopDepth < wideTopHat.keyDepth);
  assert.ok(wideTopHat.topHatBottomWidth < wideTopHat.keyWidth);
  assert.ok(wideTopHat.topHatBottomDepth < wideTopHat.keyDepth);
  assert.equal(wideTopHat.topHatTopRadius, Math.min(wideTopHat.topHatTopWidth, wideTopHat.topHatTopDepth) / 2);
  assert.equal(wideTopHat.topHatShoulderAngle, 85);
  assert.ok(wideTopHat.topHatShoulderRadius <= 0.001);
  assert.ok(wideTopHat.topHatHeight <= 0.051);
  assert.ok(smallTopHat.topHatHeight > wideTopHat.topHatHeight);
  assert.equal(smallTopHat.topHatShoulderRadius, 0.6);
  assert.ok(smallTopHat.topHatBottomRadius > smallTopHat.topHatTopRadius);
  assert.equal(individualTopHat.topHatTopRadiusIndividualEnabled, true);
  assert.equal(individualTopHat.topHatTopRadiusLeftTop, 0.4);
  assert.equal(individualTopHat.topHatTopRadiusRightTop, 2);
  assert.equal(individualTopHat.topHatTopRadiusRightBottom, 1.6);
  assert.equal(individualTopHat.topHatTopRadiusLeftBottom, 2);
  assert.equal(separateBottomTopHat.topHatTopRadius, 1);
  assert.equal(separateBottomTopHat.topHatBottomWidth, 6);
  assert.equal(separateBottomTopHat.topHatBottomDepth, 8);
  assert.equal(separateBottomTopHat.topHatBottomRadius, 3);
  assert.equal(individualBottomTopHat.topHatBottomRadiusIndividualEnabled, true);
  assert.equal(individualBottomTopHat.topHatBottomRadiusLeftTop, 0.4);
  assert.equal(individualBottomTopHat.topHatBottomRadiusRightTop, 3);
  assert.equal(individualBottomTopHat.topHatBottomRadiusRightBottom, 1.2);
  assert.equal(individualBottomTopHat.topHatBottomRadiusLeftBottom, 2.4);
  assert.ok(Math.abs(recessedTopHat.topHatHeight + 1.45) < 1e-9);
  assert.equal(shallowRecessTopHat.topHatHeight, -0.8);
  assert.equal(shallowRecessTopHat.topHatShoulderRadius, -0.4);
  assert.equal(overRadiusRecessTopHat.topHatShoulderRadius, -0.5);
  assert.equal("topHatTopWidth" in jisTopHat, false);
  assert.equal(jisTopHat.topHatEnabled, true);
  assert.ok(jisTopHat.topHatInset < jisTopHat.keyWidth / 2);
  assert.ok(jisTopHat.topHatTopRadius < 3);
  assert.equal(jisTopHat.topHatTopRadiusIndividualEnabled, false);
  assert.equal(jisTopHat.topHatTopRadiusLeftTop, jisTopHat.topHatTopRadius);
  assert.ok(jisTopHat.topHatHeight < 20);
  assert.ok(jisTopHat.topHatShoulderRadius <= jisTopHat.topHatInset);
  assert.equal(curvedTopHat.topSurfaceShape, "flat");
  assert.equal(curvedTopHat.topHatSurfaceShape, "spherical");
  assert.equal(curvedTopHat.topHatDishDepth, 0.8);
  assert.equal(raisedTopHat.topHatSurfaceShape, "spherical");
  assert.equal(raisedTopHat.topHatDishDepth, -1.5);
  assert.equal(coloredTopHat.topHatSeparateColorEnabled, true);
  assert.equal(coloredTopHat.topHatColor, "#123abc");
  assert.equal(fallbackColoredTopHat.topHatSeparateColorEnabled, false);
  assert.equal(fallbackColoredTopHat.topHatColor, "#f8f9fa");
  assert.equal(missingColoredTopHat.topHatSeparateColorEnabled, true);
  assert.equal(missingColoredTopHat.topHatColor, "#cc3300");
  assert.equal(jisEnterDefaults.topHatSurfaceShape, "flat");
  assert.equal(jisEnterDefaults.topHatDishDepth, 0);
  assert.equal(jisEnterDefaults.topHatEnabled, false);
});

test("typewriter JIS enter's default dimensions also place the stem origin at the center of the lower body", () => {
  const params = createDefaultKeycapParams("typewriter-jis-enter");
  const left = -params.keyWidth / 2 - params.jisEnterNotchWidth / 2;
  const right = params.keyWidth / 2 - params.jisEnterNotchWidth / 2;
  const notchX = left + params.jisEnterNotchWidth;
  const lowerBodyCenterX = (notchX + right) / 2;

  assert.equal(lowerBodyCenterX, 0);
  assert.equal(params.typewriterMountHeight, 11.68);
  assert.equal(params.rimEnabled, true);
});

test("typewriter JIS enter clamps radius and rim width within the JIS footprint", () => {
  const parsed = parseEditorDataPayload({
    shapeProfile: "typewriter-jis-enter",
    keyWidth: 27,
    keyDepth: 36,
    jisEnterNotchWidth: 4.5,
    jisEnterNotchDepth: 18,
    typewriterCornerRadius: 99,
    rimWidth: 99,
  });

  assert.equal(parsed.typewriterCornerRadius, 9);
  assert.equal(parsed.rimWidth, 9);
});

test("saved-name extension normalization also covers STEP and STL", () => {
  assert.equal(sanitizeExportBaseName("sample.step"), "sample");
  assert.equal(sanitizeExportBaseName("sample.stl"), "sample");
  assert.equal(sanitizeExportBaseName("sample.3mf"), "sample");
  assert.equal(sanitizeExportBaseName("sample.json"), "sample");
});
