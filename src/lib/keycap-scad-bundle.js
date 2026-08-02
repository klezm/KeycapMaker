import {
  createDefaultKeycapParams,
  DEFAULT_SHAPE_PROFILE_KEY,
  getShapeProfileGeometryDefaults,
  resolveShapeGeometryType,
} from "../data/keycap-shape-registry.js";
import keycapBaseScad from "../../scad/base/keycap.scad?raw";
import shellModuleScad from "../../scad/modules/keycap_shell.scad?raw";
import jisEnterModuleScad from "../../scad/modules/keycap_jis_enter.scad?raw";
import typewriterModuleScad from "../../scad/modules/keycap_typewriter.scad?raw";
import homingBarScad from "../../scad/modules/homing_bar.scad?raw";
import legendBlockScad from "../../scad/modules/legend_block.scad?raw";
import sidewallLegendScad from "../../scad/modules/sidewall_legend.scad?raw";
import stemMxScad from "../../scad/modules/stem_mx.scad?raw";
import stemChocV1Scad from "../../scad/modules/stem_choc_v1.scad?raw";
import stemChocV2Scad from "../../scad/modules/stem_choc_v2.scad?raw";
import stemAlpsScad from "../../scad/modules/stem_alps.scad?raw";
import stemJStemLp01Scad from "../../scad/modules/stem_j_stem_lp01.scad?raw";
import stemNominalsScad from "../../scad/presets/stem-nominals.scad?raw";
import {
  DEFAULT_KEYCAP_LEGEND_FONT_KEY,
  getKeycapLegendFontStyleOptions,
  getUserKeycapLegendFontBytes,
  KEYCAP_LEGEND_FONTS,
  listAvailableKeycapLegendFonts,
  parseKeycapLegendFontNameMetadata,
  registerUserKeycapLegendFont,
  removeUserKeycapLegendFont,
  resolveKeycapLegendFont,
  USER_KEYCAP_LEGEND_FONT_KEY_PREFIX,
} from "./keycap-fonts.js";
import {
  DEFAULT_LEGEND_CONTENT_TYPE,
  DEFAULT_LEGEND_ICON_FILL,
  DEFAULT_LEGEND_ICON_NAME,
  DEFAULT_LEGEND_ICON_SET,
  LEGEND_CONTENT_TYPE_ICON,
  buildLegendIconSvgAsync,
  buildLegendIconSvg,
  buildLucideIconSvg,
  getLegendIconSetMeta,
  getLegendIconRuntimePath,
  initializeLegendIconProvidersFromCdn,
  isLegendIconFillAvailable,
  isLegendIconFillSupported,
  listAvailableLegendIcons,
  listLegendIconSets,
  resolveLegendIconFill,
  resolveLegendContentType,
  resolveLegendIcon,
  resolveLegendIconName,
  resolveLegendIconSet,
  searchLegendIcons,
} from "./keycap-icons.js";

export const KEYCAP_ENTRY_PATH = "/scad/base/keycap.scad";
export const KEYCAP_JOB_PATH = "/scad/base/keycap-job.scad";
export {
  DEFAULT_KEYCAP_LEGEND_FONT_KEY,
  getKeycapLegendFontStyleOptions,
  KEYCAP_LEGEND_FONTS,
  listAvailableKeycapLegendFonts,
  parseKeycapLegendFontNameMetadata,
  registerUserKeycapLegendFont,
  removeUserKeycapLegendFont,
  resolveKeycapLegendFont,
  buildLegendIconSvg,
  buildLegendIconSvgAsync,
  buildLucideIconSvg,
  getLegendIconSetMeta,
  initializeLegendIconProvidersFromCdn,
  isLegendIconFillAvailable,
  isLegendIconFillSupported,
  listAvailableLegendIcons,
  listLegendIconSets,
  searchLegendIcons,
  resolveLegendContentType,
  resolveLegendIconFill,
  resolveLegendIcon,
  resolveLegendIconName,
  resolveLegendIconSet,
  USER_KEYCAP_LEGEND_FONT_KEY_PREFIX,
};
const LEGEND_MIN_PLAN_WIDTH_RATIO = 1.8;
const LEGEND_PLAN_PADDING_RATIO = 0.15;
const LEGEND_PLAN_MIN_PADDING = 0.2;
const LEGEND_OVERFLOW_GUARD_WIDTH_RATIO = 2.5;
const LEGEND_OVERFLOW_GUARD_DEPTH_RATIO = 3.0;
const LEGEND_TEXT_MEASURE_SCALE = 100;
const LEGEND_FIELD_SUFFIXES = Object.freeze({
  enabled: "Enabled",
  contentType: "ContentType",
  text: "Text",
  fontKey: "FontKey",
  fontStyleKey: "FontStyleKey",
  underlineEnabled: "UnderlineEnabled",
  iconSet: "IconSet",
  iconName: "IconName",
  iconFill: "IconFill",
  size: "Size",
  outlineDelta: "OutlineDelta",
  height: "Height",
  embed: "Embed",
  offsetX: "OffsetX",
  offsetY: "OffsetY",
});
const TOP_LEGEND_CONFIGS = Object.freeze([
  { slot: "center", paramPrefix: "legend", userPrefix: "legend", exportTarget: "legend" },
  {
    slot: "left-top",
    paramPrefix: "topLegendLeftTop",
    userPrefix: "top_legend_left_top",
    exportTarget: "top_legend_left_top",
  },
  {
    slot: "right-top",
    paramPrefix: "topLegendRightTop",
    userPrefix: "top_legend_right_top",
    exportTarget: "top_legend_right_top",
  },
  {
    slot: "left-bottom",
    paramPrefix: "topLegendLeftBottom",
    userPrefix: "top_legend_left_bottom",
    exportTarget: "top_legend_left_bottom",
  },
  {
    slot: "right-bottom",
    paramPrefix: "topLegendRightBottom",
    userPrefix: "top_legend_right_bottom",
    exportTarget: "top_legend_right_bottom",
  },
]);
const SIDE_LEGEND_CONFIGS = Object.freeze([
  { side: "front", paramPrefix: "sideLegendFront", userPrefix: "side_legend_front", minimumWidthField: "keyWidth" },
  { side: "back", paramPrefix: "sideLegendBack", userPrefix: "side_legend_back", minimumWidthField: "keyWidth" },
  { side: "left", paramPrefix: "sideLegendLeft", userPrefix: "side_legend_left", minimumWidthField: "keyDepth" },
  { side: "right", paramPrefix: "sideLegendRight", userPrefix: "side_legend_right", minimumWidthField: "keyDepth" },
]);
const TOP_CORNER_RADIUS_FIELD_KEYS = Object.freeze([
  "topCornerRadiusLeftTop",
  "topCornerRadiusRightTop",
  "topCornerRadiusRightBottom",
  "topCornerRadiusLeftBottom",
]);
const TOP_HAT_TOP_RADIUS_FIELD_KEYS = Object.freeze([
  "topHatTopRadiusLeftTop",
  "topHatTopRadiusRightTop",
  "topHatTopRadiusRightBottom",
  "topHatTopRadiusLeftBottom",
]);
const TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS = Object.freeze([
  "topHatBottomRadiusLeftTop",
  "topHatBottomRadiusRightTop",
  "topHatBottomRadiusRightBottom",
  "topHatBottomRadiusLeftBottom",
]);
const TYPEWRITER_MIN_STEM_HEIGHT = 0.6;
const TYPEWRITER_STEM_MOUNT_OVERLAP = 0.02;
const TOP_SCALE_MIN = 0.02;
const TOP_SCALE_MAX = 1;
const TOP_SCALE_STEP = 0.01;
const TOP_SCALE_MIN_FACE_SIZE = 0.2;
const DISH_DEPTH_MAX = 1.5;
const TOP_THICKNESS_MIN = 0.05;
const TOP_HAT_MIN_SIZE = 0.2;
const TOP_SURFACE_SHAPE_VALUES = new Set(["flat", "cylindrical", "spherical"]);
const LEGEND_FONT_MEASURE_CANVAS = typeof document === "undefined" ? null : document.createElement("canvas");
const fontBinaryPromises = new Map();
const fontMetadataPromises = new Map();

const SCAD_FILES = [
  { path: "/scad/base/keycap.scad", content: keycapBaseScad },
  { path: "/scad/modules/keycap_shell.scad", content: shellModuleScad },
  { path: "/scad/modules/keycap_jis_enter.scad", content: jisEnterModuleScad },
  { path: "/scad/modules/keycap_typewriter.scad", content: typewriterModuleScad },
  { path: "/scad/modules/homing_bar.scad", content: homingBarScad },
  { path: "/scad/modules/legend_block.scad", content: legendBlockScad },
  { path: "/scad/modules/sidewall_legend.scad", content: sidewallLegendScad },
  { path: "/scad/modules/stem_mx.scad", content: stemMxScad },
  { path: "/scad/modules/stem_choc_v1.scad", content: stemChocV1Scad },
  { path: "/scad/modules/stem_choc_v2.scad", content: stemChocV2Scad },
  { path: "/scad/modules/stem_alps.scad", content: stemAlpsScad },
  { path: "/scad/modules/stem_j_stem_lp01.scad", content: stemJStemLp01Scad },
  { path: "/scad/presets/stem-nominals.scad", content: stemNominalsScad },
];
const runtimeAssetPromises = new Map();
const measurementFontPromises = new Map();

function clampTypewriterCornerRadius(value, fallback = 0) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return Math.max(Number(fallback) || 0, 0);
  }

  return Math.max(nextValue, 0);
}

function clampMinimum(value, fallback, minimum) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(nextValue, minimum) : fallback;
}

function clampNumberRange(value, fallback, minimum, maximum) {
  const safeMaximum = Math.max(Number(maximum) || minimum, minimum);
  const fallbackValue = Number(fallback);
  const nextValue = Number(value);
  const resolvedFallback = Number.isFinite(fallbackValue)
    ? Math.min(Math.max(fallbackValue, minimum), safeMaximum)
    : minimum;
  if (!Number.isFinite(nextValue)) {
    return resolvedFallback;
  }

  return Math.min(Math.max(nextValue, minimum), safeMaximum);
}

function numberOr(value, fallback) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function legendParamKey(prefix, suffix) {
  return `${prefix}${suffix}`;
}

function atanDeg(value) {
  return (Math.atan(value) * 180) / Math.PI;
}

function roundUpTopScaleMinimum(value) {
  return Math.ceil((value - 1e-9) / TOP_SCALE_STEP) * TOP_SCALE_STEP;
}

function floorToNumericStep(value, step, base = 0) {
  const numericValue = Number(value);
  const numericStep = Number(step);
  const numericBase = Number(base);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericStep) || numericStep <= 0 || !Number.isFinite(numericBase)) {
    return numericValue;
  }

  const digits = Math.min(Math.max(String(numericStep).split(".")[1]?.length ?? 0, 0), 6);
  const scale = 10 ** digits;
  const stepCount = Math.floor((((numericValue - numericBase) * scale) + Number.EPSILON) / (numericStep * scale));
  return Math.max(numericBase, Number((numericBase + (stepCount * numericStep)).toFixed(digits)));
}

function clampBasicTopScale(value, fallback = 1) {
  const nextValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedFallback = Number.isFinite(fallbackValue)
    ? Math.min(Math.max(fallbackValue, TOP_SCALE_MIN), TOP_SCALE_MAX)
    : TOP_SCALE_MAX;
  return Math.min(Math.max(Number.isFinite(nextValue) ? nextValue : resolvedFallback, TOP_SCALE_MIN), TOP_SCALE_MAX);
}

function resolveTopScaleActiveDishDepth(params = {}) {
  const dishDepth = Number(params.dishDepth ?? 0);
  const topSurfaceShape = params.topSurfaceShape ?? (Math.abs(dishDepth) > 0.001 ? "spherical" : "flat");
  return topSurfaceShape === "flat" || !Number.isFinite(dishDepth) ? 0 : Math.max(dishDepth, 0);
}

function resolveTopScaleInnerMinimumForAxis(size, topCenterHeight, innerHeight, wall) {
  const denominator = innerHeight * size;
  const availableInnerFace = size - (wall * 2) - TOP_SCALE_MIN_FACE_SIZE;
  if (denominator <= 0 || availableInnerFace <= 0) {
    return TOP_SCALE_MAX;
  }

  return Math.max(1 - (availableInnerFace * topCenterHeight) / denominator, 0);
}

function resolveTopThickness(params = {}, defaults = createDefaultKeycapParams(params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY), geometryDefaults = getShapeProfileGeometryDefaults(params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY)) {
  const fallback = Math.max(Number(defaults.topThickness ?? geometryDefaults.topThickness ?? TOP_THICKNESS_MIN), TOP_THICKNESS_MIN);
  const nextValue = Number(params.topThickness);
  return Number.isFinite(nextValue) ? Math.max(nextValue, TOP_THICKNESS_MIN) : fallback;
}

function resolveTopScaleMinimum(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const geometryDefaults = getShapeProfileGeometryDefaults(profileKey);
  const keyWidth = clampMinimum(params.keyWidth, defaults.keyWidth ?? 18, 1);
  const keyDepth = clampMinimum(params.keyDepth, defaults.keyDepth ?? 18, 1);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  const topThickness = resolveTopThickness(params, defaults, geometryDefaults);
  const wall = clampMinimum(params.wallThickness, defaults.wallThickness ?? 1.2, 0);
  const activeDishDepth = resolveTopScaleActiveDishDepth({ ...defaults, ...params, shapeProfile: profileKey });
  const innerHeight = Math.max(topCenterHeight - activeDishDepth - topThickness, TOP_SCALE_MIN_FACE_SIZE);
  const outerFaceMinimum = TOP_SCALE_MIN_FACE_SIZE / Math.max(Math.min(keyWidth, keyDepth), TOP_SCALE_MIN_FACE_SIZE);
  const innerFaceMinimum = Math.max(
    resolveTopScaleInnerMinimumForAxis(keyWidth, topCenterHeight, innerHeight, wall),
    resolveTopScaleInnerMinimumForAxis(keyDepth, topCenterHeight, innerHeight, wall),
  );
  const rawMinimum = Math.max(TOP_SCALE_MIN, outerFaceMinimum, innerFaceMinimum);

  return Math.min(roundUpTopScaleMinimum(rawMinimum), TOP_SCALE_MAX);
}

function clampTopScale(value, fallback = 1, params = {}) {
  const minimum = resolveTopScaleMinimum(params);
  const nextValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedFallback = Number.isFinite(fallbackValue)
    ? Math.min(Math.max(fallbackValue, minimum), TOP_SCALE_MAX)
    : TOP_SCALE_MAX;
  return Math.min(Math.max(Number.isFinite(nextValue) ? nextValue : resolvedFallback, minimum), TOP_SCALE_MAX);
}

function resolveTopScaleAngle(size, topCenterHeight, topScale) {
  const inset = Math.max(Number(size) * (1 - topScale) / 2, 0);
  return atanDeg(inset / Math.max(topCenterHeight, 0.1));
}

function getDishDepthMax(params = {}, topSurfaceShape = params.topSurfaceShape ?? "flat") {
  return topSurfaceShape === "flat" ? 0 : DISH_DEPTH_MAX;
}

function clampDishDepth(value, params = {}, topSurfaceShape = params.topSurfaceShape ?? "flat") {
  const nextValue = Number(value);
  const maximum = getDishDepthMax(params, topSurfaceShape);
  return Math.min(Math.max(Number.isFinite(nextValue) ? nextValue : 0, -maximum), maximum);
}

function resolveTopSurfaceShape(value, fallback = "flat") {
  if (TOP_SURFACE_SHAPE_VALUES.has(value)) {
    return value;
  }

  return TOP_SURFACE_SHAPE_VALUES.has(fallback) ? fallback : "flat";
}

function getTopHatDishDepthMax(params = {}, topHatSurfaceShape = params.topHatSurfaceShape ?? "flat") {
  const resolvedShape = resolveTopSurfaceShape(topHatSurfaceShape, "flat");
  return resolvedShape === "flat" ? 0 : DISH_DEPTH_MAX;
}

function clampTopHatDishDepth(value, params = {}, topHatSurfaceShape = params.topHatSurfaceShape ?? "flat") {
  const nextValue = Number(value);
  const maximum = getTopHatDishDepthMax(params, topHatSurfaceShape);
  return Math.min(Math.max(Number.isFinite(nextValue) ? nextValue : 0, -maximum), maximum);
}

function getKeycapShoulderRadiusMax({ geometryType, keyWidth, keyDepth, topCenterHeight, topScale }) {
  if (isTypewriterGeometryType(geometryType)) {
    return 0;
  }

  const horizontalOutset = Math.max(Number(keyWidth) * (1 - Number(topScale)) / 2, 0);
  const verticalOutset = Math.max(Number(keyDepth) * (1 - Number(topScale)) / 2, 0);
  return Math.max(Math.min(Number(topCenterHeight), horizontalOutset, verticalOutset), 0);
}

function getKeycapEdgeRadiusMax(params) {
  return getKeycapShoulderRadiusMax(params);
}

function isTypewriterGeometryType(geometryType) {
  return geometryType === "typewriter" || geometryType === "typewriter_jis_enter";
}

function isTopHatGeometryType(geometryType) {
  return geometryType === "shell" || geometryType === "jis_enter";
}

function getTypewriterMountHeightMinimum(params = {}) {
  const topCenterHeight = clampMinimum(params.topCenterHeight, 5.2, 0.1);
  return topCenterHeight + TYPEWRITER_MIN_STEM_HEIGHT - TYPEWRITER_STEM_MOUNT_OVERLAP;
}

function clampTypewriterMountHeight(value, params = {}, fallback = 0) {
  const minimum = getTypewriterMountHeightMinimum(params);
  const fallbackValue = Number(fallback);
  const nextValue = Number(value);
  const resolvedFallback = Number.isFinite(fallbackValue) && fallbackValue > 0
    ? fallbackValue
    : minimum;

  return Math.max(Number.isFinite(nextValue) ? nextValue : resolvedFallback, minimum);
}

function resolveShapeGeometryParameters(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const geometryDefaults = getShapeProfileGeometryDefaults(profileKey);
  const geometryType = resolveShapeGeometryType(profileKey);
  const keyWidth = clampMinimum(params.keyWidth, defaults.keyWidth ?? 18, 1);
  const keyDepth = clampMinimum(params.keyDepth, defaults.keyDepth ?? 18, 1);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  const topScale = clampTopScale(params.topScale, defaults.topScale ?? 1, params);
  const horizontalAngle = resolveTopScaleAngle(keyWidth, topCenterHeight, topScale);
  const verticalAngle = resolveTopScaleAngle(keyDepth, topCenterHeight, topScale);
  const keycapShoulderRadiusMax = getKeycapShoulderRadiusMax({
    geometryType,
    keyWidth,
    keyDepth,
    topCenterHeight,
    topScale,
  });
  const keycapShoulderRadius = clampNumberRange(
    params.keycapShoulderRadius,
    defaults.keycapShoulderRadius ?? 0,
    -keycapShoulderRadiusMax,
    keycapShoulderRadiusMax,
  );
  const keycapEdgeRadius = clampNumberRange(
    params.keycapEdgeRadius,
    defaults.keycapEdgeRadius ?? 0,
    0,
    getKeycapEdgeRadiusMax({
      geometryType,
      keyWidth,
      keyDepth,
      topCenterHeight,
      topScale,
    }),
  );
  const topWidth = isTypewriterGeometryType(geometryType) ? keyWidth : keyWidth * topScale;
  const topDepth = isTypewriterGeometryType(geometryType) ? keyDepth : keyDepth * topScale;
  const topCornerRadiusMax = Math.max(Math.min(topWidth, topDepth) / 2, 0);
  const defaultTopCornerRadius = Math.max(Number(geometryDefaults.topCornerRadius ?? 0), 0);
  const topCornerRadius = clampNumberRange(
    params.topCornerRadius,
    defaultTopCornerRadius,
    0,
    topCornerRadiusMax,
  );
  const topCornerIndividualEnabled = Boolean(params.topCornerRadiusIndividualEnabled);
  const topCornerRadii = TOP_CORNER_RADIUS_FIELD_KEYS.map((fieldKey) => (
    clampNumberRange(params[fieldKey], topCornerRadius, 0, topCornerRadiusMax)
  ));

  return {
    shapeGeometryType: geometryType,
    profileFrontAngle: isTypewriterGeometryType(geometryType) ? 0 : verticalAngle,
    profileBackAngle: isTypewriterGeometryType(geometryType) ? 0 : verticalAngle,
    profileLeftAngle: isTypewriterGeometryType(geometryType) ? 0 : horizontalAngle,
    profileRightAngle: isTypewriterGeometryType(geometryType) ? 0 : horizontalAngle,
    topThickness: resolveTopThickness(params, defaults, geometryDefaults),
    bottomCornerRadius: Math.max(Number(geometryDefaults.bottomCornerRadius ?? 0), 0),
    keycapShoulderRadius,
    keycapEdgeRadius,
    topCornerRadius,
    topCornerIndividualEnabled,
    topCornerRadii,
  };
}

function hasByteRange(start, length, totalLength) {
  return Number.isInteger(start)
    && Number.isInteger(length)
    && start >= 0
    && length >= 0
    && start + length <= totalLength;
}

function readSfntTag(fontBytes, offset) {
  return String.fromCharCode(...fontBytes.subarray(offset, offset + 4));
}

function readSfntTableDirectory(fontBytes) {
  if (!hasByteRange(0, 12, fontBytes.byteLength)) {
    return null;
  }

  const view = new DataView(fontBytes.buffer, fontBytes.byteOffset, fontBytes.byteLength);
  const numTables = view.getUint16(4);
  const directoryLength = 12 + (numTables * 16);
  if (!hasByteRange(0, directoryLength, fontBytes.byteLength)) {
    return null;
  }

  const tables = new Map();
  for (let index = 0; index < numTables; index += 1) {
    const entryOffset = 12 + (index * 16);
    const tag = readSfntTag(fontBytes, entryOffset);
    const offset = view.getUint32(entryOffset + 8);
    const length = view.getUint32(entryOffset + 12);
    tables.set(tag, { offset, length });
  }

  return tables;
}

function parseLegendFontMetadata(fontBytes) {
  const tables = readSfntTableDirectory(fontBytes);
  if (!tables) {
    return null;
  }

  const headTable = tables.get("head");
  const hheaTable = tables.get("hhea");
  const postTable = tables.get("post");
  if (!headTable || !hheaTable || !postTable) {
    return null;
  }

  const headUnitsOffset = headTable.offset + 18;
  const hheaAscentOffset = hheaTable.offset + 4;
  const hheaDescentOffset = hheaTable.offset + 6;
  const postUnderlinePositionOffset = postTable.offset + 8;
  const postUnderlineThicknessOffset = postTable.offset + 10;
  if (
    !hasByteRange(headUnitsOffset, 2, fontBytes.byteLength)
    || !hasByteRange(hheaAscentOffset, 2, fontBytes.byteLength)
    || !hasByteRange(hheaDescentOffset, 2, fontBytes.byteLength)
    || !hasByteRange(postUnderlinePositionOffset, 2, fontBytes.byteLength)
    || !hasByteRange(postUnderlineThicknessOffset, 2, fontBytes.byteLength)
  ) {
    return null;
  }

  const view = new DataView(fontBytes.buffer, fontBytes.byteOffset, fontBytes.byteLength);
  const unitsPerEm = view.getUint16(headUnitsOffset);
  if (!Number.isFinite(unitsPerEm) || unitsPerEm <= 0) {
    return null;
  }

  const ascent = view.getInt16(hheaAscentOffset);
  const descent = view.getInt16(hheaDescentOffset);
  const underlinePosition = view.getInt16(postUnderlinePositionOffset);
  const underlineThickness = view.getInt16(postUnderlineThicknessOffset);

  return {
    unitsPerEm,
    underlinePositionEm: underlinePosition / unitsPerEm,
    underlineThicknessEm: Math.max(underlineThickness / unitsPerEm, 0),
    lineBoxCenterEm: (ascent + descent) / (2 * unitsPerEm),
  };
}

function clampLegendSize(value) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(nextValue, 0.5) : 4.0;
}

function resolveKeycapLegendFontStyle(font, styleKey) {
  const nativeStyleOptions = font?.nativeStyleOptions ?? [];
  if (nativeStyleOptions.length === 0) {
    return null;
  }

  return nativeStyleOptions.find((option) => option.key === styleKey)
    ?? nativeStyleOptions.find((option) => option.key === font.defaultStyleKey)
    ?? nativeStyleOptions[0];
}

function legendTextSize(depth) {
  return Math.max(Number(depth), 0);
}

function estimateLegendTextWidth(label, size) {
  return Array.from(String(label ?? "")).length * size;
}

function positiveTextMetric(value) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(nextValue, 0) : 0;
}

function resolveLegendMeasurementWeight(selectedFont, selectedFontStyle) {
  return selectedFontStyle?.cssWeight ?? selectedFont.cssWeight ?? 400;
}

async function ensureMeasurementFontLoaded(selectedFont) {
  if (!selectedFont?.measurementFamily || typeof FontFace === "undefined" || typeof document === "undefined") {
    return null;
  }
  if (selectedFont.isMissing) {
    throw new Error(`My Font is not loaded: ${selectedFont.key}`);
  }

  const cachedPromise = measurementFontPromises.get(selectedFont.key);
  if (cachedPromise) {
    return cachedPromise;
  }

  const descriptors = selectedFont.fontKind === "variable"
    ? { style: "normal", weight: "100 900" }
    : { style: "normal", weight: `${selectedFont.cssWeight ?? 400}` };
  const fontFacePromise = new FontFace(
    selectedFont.measurementFamily,
    `url(${resolveLegendFontAssetUrl(selectedFont)})`,
    descriptors,
  )
    .load()
    .then((loadedFace) => {
      document.fonts.add(loadedFace);
      return loadedFace;
    })
    .catch((error) => {
      measurementFontPromises.delete(selectedFont.key);
      throw error;
    });

  measurementFontPromises.set(selectedFont.key, fontFacePromise);
  return fontFacePromise;
}

async function getFontBinaryAsset(selectedFont) {
  if (selectedFont?.isMissing) {
    throw new Error(`My Font is not loaded: ${selectedFont.key}`);
  }

  const cachedPromise = fontBinaryPromises.get(selectedFont.key);
  if (cachedPromise) {
    return cachedPromise;
  }

  const binaryPromise = selectedFont.isUserFont
    ? Promise.resolve(getUserKeycapLegendFontBytes(selectedFont.key))
    : loadBinaryAsset(selectedFont.assetPath);

  const checkedBinaryPromise = binaryPromise
    .then((fontBytes) => {
      if (!(fontBytes instanceof Uint8Array) || (selectedFont.isUserFont && fontBytes.byteLength === 0)) {
        throw new Error(`Failed to load font asset: ${selectedFont.key}`);
      }

      return fontBytes;
    })
    .catch((error) => {
      fontBinaryPromises.delete(selectedFont.key);
      throw error;
    });

  fontBinaryPromises.set(selectedFont.key, checkedBinaryPromise);
  return checkedBinaryPromise;
}

async function getLegendFontMetadata(selectedFont) {
  const cachedPromise = fontMetadataPromises.get(selectedFont.key);
  if (cachedPromise) {
    return cachedPromise;
  }

  const metadataPromise = getFontBinaryAsset(selectedFont)
    .then((fontBytes) => parseLegendFontMetadata(fontBytes))
    .catch((error) => {
      fontMetadataPromises.delete(selectedFont.key);
      throw error;
    });

  fontMetadataPromises.set(selectedFont.key, metadataPromise);
  return metadataPromise;
}

async function measureLegendTextWidth({ label, size, selectedFont, selectedFontStyle }) {
  const bounds = await measureLegendTextBounds({
    label,
    size,
    selectedFont,
    selectedFontStyle,
  });

  return bounds.width;
}

async function measureLegendTextBounds({ label, size, selectedFont, selectedFontStyle }) {
  if (!label) {
    return {
      width: 0,
      depth: size,
    };
  }

  if (!LEGEND_FONT_MEASURE_CANVAS) {
    return {
      width: estimateLegendTextWidth(label, size),
      depth: size,
    };
  }

  let loadedMeasurementFont = null;
  try {
    loadedMeasurementFont = await ensureMeasurementFontLoaded(selectedFont);
  } catch {
    return {
      width: estimateLegendTextWidth(label, size),
      depth: size,
    };
  }
  if (!loadedMeasurementFont) {
    return {
      width: estimateLegendTextWidth(label, size),
      depth: size,
    };
  }

  const context = LEGEND_FONT_MEASURE_CANVAS.getContext("2d");
  if (!context) {
    return {
      width: estimateLegendTextWidth(label, size),
      depth: size,
    };
  }

  const measurementWeight = resolveLegendMeasurementWeight(selectedFont, selectedFontStyle);
  context.font = `${measurementWeight} ${LEGEND_TEXT_MEASURE_SCALE}px "${selectedFont.measurementFamily}"`;
  const metrics = context.measureText(label);
  const metricScale = size / LEGEND_TEXT_MEASURE_SCALE;
  const advanceWidth = metrics.width * metricScale;
  const actualWidth = (
    positiveTextMetric(metrics.actualBoundingBoxLeft)
    + positiveTextMetric(metrics.actualBoundingBoxRight)
  ) * metricScale;
  const actualDepth = (
    positiveTextMetric(metrics.actualBoundingBoxAscent)
    + positiveTextMetric(metrics.actualBoundingBoxDescent)
  ) * metricScale;
  const fontDepth = (
    positiveTextMetric(metrics.fontBoundingBoxAscent)
    + positiveTextMetric(metrics.fontBoundingBoxDescent)
  ) * metricScale;
  const measuredWidth = Math.max(advanceWidth, actualWidth, 0);

  return {
    width: measuredWidth > 0 ? measuredWidth : estimateLegendTextWidth(label, size),
    depth: Math.max(actualDepth, fontDepth, size, 0),
  };
}

async function resolveLegendUnderlineSpan({
  label,
  size,
  selectedFont,
  selectedFontStyle,
}) {
  const measuredTextWidth = await measureLegendTextWidth({
    label,
    size,
    selectedFont,
    selectedFontStyle,
  });

  return measuredTextWidth;
}

async function resolveLegendUnderlineGeometry({
  enabled,
  label,
  size,
  selectedFont,
  selectedFontStyle,
}) {
  if (!enabled) {
    return {
      enabled: false,
      span: 0,
      thickness: 0,
      centerOffset: 0,
    };
  }

  let fontMetadata = null;
  try {
    fontMetadata = await getLegendFontMetadata(selectedFont);
  } catch {
    return {
      enabled: false,
      span: 0,
      thickness: 0,
      centerOffset: 0,
    };
  }

  if (!fontMetadata || fontMetadata.underlineThicknessEm <= 0) {
    return {
      enabled: false,
      span: 0,
      thickness: 0,
      centerOffset: 0,
    };
  }

  const span = await resolveLegendUnderlineSpan({
    label,
    size,
    selectedFont,
    selectedFontStyle,
  });
  const thickness = fontMetadata.underlineThicknessEm * size;
  const centerOffset = (
    fontMetadata.underlinePositionEm
    - (fontMetadata.underlineThicknessEm / 2)
    - fontMetadata.lineBoxCenterEm
  ) * size;

  if (!(span > 0) || !(thickness > 0)) {
    return {
      enabled: false,
      span: 0,
      thickness: 0,
      centerOffset: 0,
    };
  }

  return {
    enabled: true,
    span,
    thickness,
    centerOffset,
  };
}

function resolveLegendPlanPadding(size, outlineDelta) {
  return Math.max(size * LEGEND_PLAN_PADDING_RATIO, Math.abs(Number(outlineDelta) || 0), LEGEND_PLAN_MIN_PADDING);
}

function resolveLegendUnderlineDepth(underlineGeometry) {
  return underlineGeometry.enabled
    ? Math.abs(underlineGeometry.centerOffset) * 2 + underlineGeometry.thickness
    : 0;
}

function resolveLegendOverflowGuardSize({ label, size, outlineDelta, underlineGeometry }) {
  const padding = resolveLegendPlanPadding(size, outlineDelta);
  const characterCount = Math.max(Array.from(String(label ?? "")).length, 1);

  return {
    width: (characterCount * size * LEGEND_OVERFLOW_GUARD_WIDTH_RATIO) + padding * 2,
    depth: Math.max(size * LEGEND_OVERFLOW_GUARD_DEPTH_RATIO, resolveLegendUnderlineDepth(underlineGeometry)) + padding * 2,
  };
}

function resolveLegendPlanSize({ size, outlineDelta, textBounds, underlineGeometry, minimumWidth = 0, minimumDepth = 0 }) {
  const padding = resolveLegendPlanPadding(size, outlineDelta);
  const underlineDepth = resolveLegendUnderlineDepth(underlineGeometry);

  return {
    width: Math.max(
      positiveTextMetric(minimumWidth),
      size * LEGEND_MIN_PLAN_WIDTH_RATIO,
      Math.max(Number(textBounds.width) || 0, underlineGeometry.span || 0, 0) + padding * 2,
    ),
    depth: Math.max(
      positiveTextMetric(minimumDepth),
      size,
      Math.max(Number(textBounds.depth) || 0, underlineDepth, 0) + padding * 2,
    ),
  };
}

function resolveLegendIconPlanSize({ size, outlineDelta, minimumWidth = 0, minimumDepth = 0 }) {
  const padding = resolveLegendPlanPadding(size, outlineDelta);
  const iconExtent = Math.max(size + padding * 2, 0);

  return {
    width: Math.max(positiveTextMetric(minimumWidth), iconExtent),
    depth: Math.max(positiveTextMetric(minimumDepth), iconExtent),
  };
}

async function resolveLegendBridgeDefinitions({
  params,
  paramPrefix,
  userPrefix,
  minimumWidth,
  minimumDepth,
  includeEmbed = true,
}) {
  const enabledKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.enabled);
  const contentTypeKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.contentType);
  const textKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.text);
  const fontKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.fontKey);
  const fontStyleKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.fontStyleKey);
  const underlineEnabledKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.underlineEnabled);
  const iconSetKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.iconSet);
  const iconNameKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.iconName);
  const iconFillKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.iconFill);
  const sizeKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.size);
  const outlineDeltaKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.outlineDelta);
  const heightKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.height);
  const embedKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.embed);
  const offsetXKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.offsetX);
  const offsetYKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.offsetY);
  const contentType = resolveLegendContentType(params[contentTypeKey] ?? DEFAULT_LEGEND_CONTENT_TYPE);
  const isIconLegend = contentType === LEGEND_CONTENT_TYPE_ICON;
  const iconSet = resolveLegendIconSet(params[iconSetKey] ?? DEFAULT_LEGEND_ICON_SET);
  const iconName = resolveLegendIconName(params[iconNameKey] ?? DEFAULT_LEGEND_ICON_NAME, iconSet);
  const iconFill = isLegendIconFillAvailable(iconName, iconSet)
    && resolveLegendIconFill(params[iconFillKey] ?? DEFAULT_LEGEND_ICON_FILL);
  const legendSize = clampLegendSize(params[sizeKey]);
  const resolvedTextSize = legendTextSize(legendSize);
  const label = params[textKey] ?? "";
  const outlineDelta = isIconLegend ? 0 : (params[outlineDeltaKey] ?? 0);
  const selectedFont = isIconLegend ? null : resolveKeycapLegendFont(params[fontKey]);
  const selectedFontStyle = isIconLegend ? null : resolveKeycapLegendFontStyle(selectedFont, params[fontStyleKey]);
  const textBounds = isIconLegend
    ? { width: resolvedTextSize, depth: resolvedTextSize }
    : await measureLegendTextBounds({
      label,
      size: resolvedTextSize,
      selectedFont,
      selectedFontStyle,
    });
  const underlineGeometry = isIconLegend
    ? { enabled: false, span: 0, thickness: 0, centerOffset: 0 }
    : await resolveLegendUnderlineGeometry({
      enabled: params[underlineEnabledKey],
      label,
      size: resolvedTextSize,
      selectedFont,
      selectedFontStyle,
    });
  const planSize = isIconLegend
    ? resolveLegendIconPlanSize({
      size: resolvedTextSize,
      outlineDelta,
      minimumWidth,
      minimumDepth,
    })
    : (() => {
      const overflowGuard = resolveLegendOverflowGuardSize({
        label,
        size: resolvedTextSize,
        outlineDelta,
        underlineGeometry,
      });
      return resolveLegendPlanSize({
        size: resolvedTextSize,
        outlineDelta,
        textBounds,
        underlineGeometry,
        minimumWidth: Math.max(positiveTextMetric(minimumWidth), overflowGuard.width),
        minimumDepth: Math.max(positiveTextMetric(minimumDepth), overflowGuard.depth),
      });
    })();

  return {
    [`user_${userPrefix}_enabled`]: Boolean(params[enabledKey]),
    [`user_${userPrefix}_content_type`]: contentType,
    [`user_${userPrefix}_text`]: label,
    [`user_${userPrefix}_font_name`]: selectedFontStyle?.fontQuery ?? selectedFont?.fontQuery ?? selectedFont?.fontName ?? "",
    [`user_${userPrefix}_icon_path`]: getLegendIconRuntimePath(iconName, iconSet, { filled: iconFill }),
    [`user_${userPrefix}_underline_enabled`]: underlineGeometry.enabled,
    [`user_${userPrefix}_underline_width`]: underlineGeometry.span,
    [`user_${userPrefix}_underline_thickness`]: underlineGeometry.thickness,
    [`user_${userPrefix}_underline_offset_y`]: underlineGeometry.centerOffset,
    [`user_${userPrefix}_width`]: planSize.width,
    [`user_${userPrefix}_depth`]: planSize.depth,
    [`user_${userPrefix}_text_size`]: resolvedTextSize,
    [`user_${userPrefix}_height`]: params[heightKey],
    ...(includeEmbed ? { [`user_${userPrefix}_embed`]: params[embedKey] } : {}),
    [`user_${userPrefix}_outline_delta`]: outlineDelta,
    [`user_${userPrefix}_offset_x`]: params[offsetXKey],
    [`user_${userPrefix}_offset_y`]: params[offsetYKey],
  };
}

function formatDefinitionValue(value) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatDefinitionValue(item)).join(", ")}]`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return `${value}`;
}

async function createKeycapDefinitions({ params, exportTarget }) {
  const requestedDishDepth = Number(params.dishDepth ?? 0);
  const topSurfaceShape = params.topSurfaceShape ?? (Math.abs(requestedDishDepth) > 0.001 ? "spherical" : "flat");
  const dishDepth = topSurfaceShape === "flat" || !Number.isFinite(requestedDishDepth)
    ? 0
    : clampDishDepth(requestedDishDepth, params, topSurfaceShape);
  const topHatSurfaceShape = resolveTopSurfaceShape(params.topHatSurfaceShape, "flat");
  const requestedTopHatDishDepth = Number(params.topHatDishDepth ?? 0);
  const topHatDishDepth = topHatSurfaceShape === "flat" || !Number.isFinite(requestedTopHatDishDepth)
    ? 0
    : clampTopHatDishDepth(requestedTopHatDishDepth, params, topHatSurfaceShape);
  const shapeGeometry = resolveShapeGeometryParameters({ ...params, dishDepth });
  const topHatTopRadius = Math.max(numberOr(params.topHatTopRadius, 1.8), 0);
  const topHatTopRadiusIndividualEnabled = Boolean(params.topHatTopRadiusIndividualEnabled);
  const topHatTopRadii = topHatTopRadiusIndividualEnabled
    ? TOP_HAT_TOP_RADIUS_FIELD_KEYS.map((fieldKey) => (
      Math.max(numberOr(params[fieldKey], topHatTopRadius), 0)
    ))
    : [topHatTopRadius, topHatTopRadius, topHatTopRadius, topHatTopRadius];
  const topHatBottomRadius = Math.max(numberOr(params.topHatBottomRadius, topHatTopRadius), 0);
  const topHatBottomRadiusIndividualEnabled = Boolean(params.topHatBottomRadiusIndividualEnabled);
  const topHatBottomRadii = topHatBottomRadiusIndividualEnabled
    ? TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS.map((fieldKey) => (
      Math.max(numberOr(params[fieldKey], topHatBottomRadius), 0)
    ))
    : [topHatBottomRadius, topHatBottomRadius, topHatBottomRadius, topHatBottomRadius];
  const topLegendDefinitionList = await Promise.all(TOP_LEGEND_CONFIGS.map((config) => (
    resolveLegendBridgeDefinitions({
      params,
      paramPrefix: config.paramPrefix,
      userPrefix: config.userPrefix,
      // Keep this as an overlarge surface-fitting region, not a key footprint cap.
      // Oversized legends are allowed to overhang instead of being clipped.
      minimumWidth: positiveTextMetric(params.keyWidth),
      minimumDepth: positiveTextMetric(params.keyDepth),
    })
  )));
  const topLegendDefinitions = Object.assign({}, ...topLegendDefinitionList);
  const sideLegendDefinitionList = await Promise.all(SIDE_LEGEND_CONFIGS.map((config) => (
    resolveLegendBridgeDefinitions({
      params,
      paramPrefix: config.paramPrefix,
      userPrefix: config.userPrefix,
      minimumWidth: positiveTextMetric(params[config.minimumWidthField]),
      minimumDepth: positiveTextMetric(params.topCenterHeight),
      includeEmbed: false,
    })
  )));
  const sideLegendDefinitions = Object.assign({}, ...sideLegendDefinitionList);

  return {
    export_target: exportTarget,
    user_shape_geometry_type: shapeGeometry.shapeGeometryType,
    user_key_width: params.keyWidth,
    user_key_depth: params.keyDepth,
    user_jis_enter_notch_width: Math.max(Number(params.jisEnterNotchWidth ?? 0), 0),
    user_jis_enter_notch_depth: Math.max(Number(params.jisEnterNotchDepth ?? 0), 0),
    user_top_center_height: params.topCenterHeight,
    user_wall_thickness: params.wallThickness,
    user_typewriter_mount_height: clampTypewriterMountHeight(
      params.typewriterMountHeight,
      params,
      createDefaultKeycapParams(params.shapeProfile ?? "typewriter").typewriterMountHeight
        ?? createDefaultKeycapParams("typewriter").typewriterMountHeight,
    ),
    user_typewriter_corner_radius: clampTypewriterCornerRadius(
      params.typewriterCornerRadius,
      Math.min(Number(params.keyWidth ?? 18), Number(params.keyDepth ?? 18)) / 2,
    ),
    user_profile_front_angle: shapeGeometry.profileFrontAngle,
    user_profile_back_angle: shapeGeometry.profileBackAngle,
    user_profile_left_angle: shapeGeometry.profileLeftAngle,
    user_profile_right_angle: shapeGeometry.profileRightAngle,
    user_top_thickness: shapeGeometry.topThickness,
    user_bottom_corner_radius: shapeGeometry.bottomCornerRadius,
    user_keycap_shoulder_radius: shapeGeometry.keycapShoulderRadius,
    user_keycap_edge_radius: shapeGeometry.keycapEdgeRadius,
    user_top_corner_radius: shapeGeometry.topCornerRadius,
    user_top_corner_individual_enabled: shapeGeometry.topCornerIndividualEnabled,
    user_top_corner_radii: shapeGeometry.topCornerRadii,
    user_top_shape_type: topSurfaceShape,
    user_dish_radius: params.dishRadius,
    user_dish_depth: dishDepth,
    user_top_pitch_deg: params.topPitchDeg,
    user_top_roll_deg: params.topRollDeg,
    user_top_offset_x: numberOr(params.topOffsetX, 0),
    user_top_offset_y: numberOr(params.topOffsetY, 0),
    user_top_hat_enabled: isTopHatGeometryType(shapeGeometry.shapeGeometryType) && Boolean(params.topHatEnabled),
    user_top_hat_separate_enabled: isTopHatGeometryType(shapeGeometry.shapeGeometryType) && Boolean(params.topHatSeparateColorEnabled),
    user_top_hat_top_width: Math.max(numberOr(params.topHatTopWidth, 10.5), 0.2),
    user_top_hat_top_depth: Math.max(numberOr(params.topHatTopDepth, 9.5), 0.2),
    user_top_hat_bottom_width: Math.max(numberOr(params.topHatBottomWidth, numberOr(params.topHatTopWidth, 10.5)), 0.2),
    user_top_hat_bottom_depth: Math.max(numberOr(params.topHatBottomDepth, numberOr(params.topHatTopDepth, 9.5)), 0.2),
    user_top_hat_inset: Math.max(numberOr(params.topHatInset, 2.0), 0),
    user_top_hat_top_radius: topHatTopRadius,
    user_top_hat_top_radius_individual_enabled: topHatTopRadiusIndividualEnabled,
    user_top_hat_top_radii: topHatTopRadii,
    user_top_hat_bottom_radius: topHatBottomRadius,
    user_top_hat_bottom_radius_individual_enabled: topHatBottomRadiusIndividualEnabled,
    user_top_hat_bottom_radii: topHatBottomRadii,
    user_top_hat_height: numberOr(params.topHatHeight, 1.4),
    user_top_hat_shoulder_angle: Math.min(Math.max(numberOr(params.topHatShoulderAngle, 45), 5), 85),
    user_top_hat_shoulder_radius: numberOr(params.topHatShoulderRadius, 0),
    user_top_hat_shape_type: topHatSurfaceShape,
    user_top_hat_dish_radius: params.dishRadius,
    user_top_hat_dish_depth: topHatDishDepth,
    user_rim_enabled: Boolean(params.rimEnabled),
    user_rim_width: Math.max(Number(params.rimWidth ?? 0), 0),
    user_rim_height_up: Math.max(Number(params.rimHeightUp ?? 0), 0),
    user_rim_height_down: Math.max(Number(params.rimHeightDown ?? 0), 0),
    ...topLegendDefinitions,
    ...sideLegendDefinitions,
    user_homing_bar_enabled: params.homingBarEnabled,
    user_homing_bar_length: params.homingBarLength,
    user_homing_bar_width: params.homingBarWidth,
    user_homing_bar_height: params.homingBarHeight,
    user_homing_bar_offset_y: params.homingBarOffsetY,
    user_homing_bar_chamfer: Math.max(Number(params.homingBarChamfer ?? 0), 0),
    user_stem_type: params.stemType,
    user_stem_enabled: params.stemEnabled,
    user_stem_outer_delta: params.stemOuterDelta,
    user_stem_cross_margin: params.stemCrossMargin,
    user_stem_cross_chamfer: Math.max(Number(params.stemCrossChamfer ?? 0), 0),
    user_stem_inset_delta: params.stemInsetDelta,
  };
}

function buildKeycapJobScad(definitions) {
  const prelude = Object.entries(definitions)
    .map(([key, value]) => `${key} = ${formatDefinitionValue(value)};`)
    .join("\n");

  return `// Browser-side OpenSCAD runtime ignores -D overrides, so generate a wrapper entrypoint.\n${prelude}\ninclude <keycap.scad>\n`;
}

function resolvePublicAssetUrl(relativePath) {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(relativePath, baseUrl).toString();
}

function resolveLegendFontAssetUrl(font) {
  if (font?.objectUrl) {
    return font.objectUrl;
  }

  return resolvePublicAssetUrl(font?.assetPath ?? "");
}

async function loadBinaryAsset(relativePath) {
  const response = await fetch(resolvePublicAssetUrl(relativePath));
  if (!response.ok) {
    throw new Error(`Failed to load runtime asset: ${relativePath}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function getRuntimeAssetsForFont(fontKey) {
  const selectedFont = resolveKeycapLegendFont(fontKey);
  const cachedPromise = runtimeAssetPromises.get(selectedFont.key);

  if (cachedPromise) {
    return cachedPromise;
  }

  const assetPromise = getFontBinaryAsset(selectedFont)
    .then((fontBytes) => [
      {
        path: selectedFont.runtimePath,
        content: fontBytes,
      },
    ])
    .catch((error) => {
      runtimeAssetPromises.delete(selectedFont.key);
      throw error;
    });

  runtimeAssetPromises.set(selectedFont.key, assetPromise);
  return assetPromise;
}

function getLegendFontKeys(params = {}) {
  return [
    ...TOP_LEGEND_CONFIGS,
    ...SIDE_LEGEND_CONFIGS,
  ]
    .filter((config) => resolveLegendContentType(
      params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.contentType)] ?? DEFAULT_LEGEND_CONTENT_TYPE,
    ) !== LEGEND_CONTENT_TYPE_ICON)
    .map((config) => params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.fontKey)])
    .filter(Boolean);
}

function getLegendIconDescriptors(params = {}) {
  return [
    ...TOP_LEGEND_CONFIGS,
    ...SIDE_LEGEND_CONFIGS,
  ]
    .filter((config) => Boolean(params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled)]))
    .map((config) => {
      const contentType = resolveLegendContentType(
        params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.contentType)] ?? DEFAULT_LEGEND_CONTENT_TYPE,
      );
      if (contentType !== LEGEND_CONTENT_TYPE_ICON) {
        return null;
      }

      const iconSet = resolveLegendIconSet(
        params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.iconSet)] ?? DEFAULT_LEGEND_ICON_SET,
      );
      const iconName = resolveLegendIconName(
        params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.iconName)] ?? DEFAULT_LEGEND_ICON_NAME,
        iconSet,
      );
      const iconFill = isLegendIconFillAvailable(iconName, iconSet)
        && resolveLegendIconFill(
          params[legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.iconFill)] ?? DEFAULT_LEGEND_ICON_FILL,
        );

      return { iconSet, iconName, iconFill };
    })
    .filter(Boolean);
}

function getRuntimeAssetsForIcon(iconDescriptor) {
  const iconSet = resolveLegendIconSet(iconDescriptor?.iconSet);
  const iconName = resolveLegendIconName(iconDescriptor?.iconName, iconSet);
  const iconFill = isLegendIconFillAvailable(iconName, iconSet)
    && resolveLegendIconFill(iconDescriptor?.iconFill ?? DEFAULT_LEGEND_ICON_FILL);
  const cacheKey = `icon:${iconSet}:${iconName}:${iconFill ? "filled" : "outlined"}`;
  const cachedPromise = runtimeAssetPromises.get(cacheKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const assetPromise = buildLegendIconSvgAsync({ name: iconName, iconSet }, { filled: iconFill })
    .then((content) => [
      {
        path: getLegendIconRuntimePath(iconName, iconSet, { filled: iconFill }),
        content,
      },
    ].filter(Boolean));

  runtimeAssetPromises.set(cacheKey, assetPromise);
  return assetPromise;
}

async function getRuntimeAssets(params = {}) {
  const fontKeys = Array.from(new Set(getLegendFontKeys(params)));
  const iconDescriptors = Array.from(
    new Map(getLegendIconDescriptors(params).map((descriptor) => [
      `${descriptor.iconSet}:${descriptor.iconName}:${descriptor.iconFill ? "filled" : "outlined"}`,
      descriptor,
    ])).values(),
  );
  const assetLists = await Promise.all([
    ...fontKeys.map((fontKey) => getRuntimeAssetsForFont(fontKey)),
    ...iconDescriptors.map((descriptor) => getRuntimeAssetsForIcon(descriptor)),
  ]);
  return assetLists.flat();
}

export async function createKeycapFiles({ params, exportTarget }) {
  const definitions = await createKeycapDefinitions({ params, exportTarget });
  const runtimeAssets = await getRuntimeAssets(params);

  return [
    ...SCAD_FILES.map((file) => ({ ...file })),
    ...runtimeAssets.map((file) => ({ ...file })),
    {
      path: KEYCAP_JOB_PATH,
      content: buildKeycapJobScad(definitions),
    },
  ];
}

export function buildKeycapArgs({ outputPath, outputFormat }) {
  return [
    "-o",
    outputPath,
    "--backend=manifold",
    `--export-format=${outputFormat === "stl" ? "binstl" : outputFormat}`,
    KEYCAP_JOB_PATH,
  ];
}
