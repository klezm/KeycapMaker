import keycapEditorProfiles, {
  createDefaultKeycapParams,
  DEFAULT_SHAPE_PROFILE_KEY,
  EDITOR_SELECTOR_KEYS,
  getShapeProfileGeometryDefaults,
  resolveShapeGeometryType,
  SHAPE_PROFILE_MAP,
} from "../data/keycap-shape-registry.js";
import { normalizeHexColor } from "./color-utils.js";
import {
  DEFAULT_KEYCAP_LEGEND_FONT_KEY,
  getKeycapLegendFontStyleOptions,
  isUserKeycapLegendFontKey,
  resolveKeycapLegendFont,
} from "./keycap-fonts.js";
import {
  DEFAULT_LEGEND_ICON_NAME,
  DEFAULT_LEGEND_ICON_SET,
  DEFAULT_LEGEND_ICON_FILL,
  DEFAULT_LEGEND_CONTENT_TYPE,
  inferLegendIconFillFromName,
  isLegendIconFillAvailable,
  resolveLegendContentType,
  resolveLegendIconFill,
  resolveLegendIconName,
  resolveLegendIconSet,
} from "./keycap-icons.js";
import { resolveJStemLp01PreviewColor } from "./j-stem-lp01-reference.js";

export const DEFAULT_EXPORT_BASE_NAME = "keycap-preview";
export const EDITOR_DATA_KIND = "keycap-maker/editor-params";
export const LEGACY_EDITOR_DATA_KINDS = new Set([EDITOR_DATA_KIND.replace("keycap-maker", "keycap" + "s-maker")]);
export const EDITOR_DATA_SCHEMA_VERSION = 5;
export const EDITOR_DATA_COMPAT_KIND = "keycap-maker/editor-params-patch";
export const EDITOR_DATA_COMPAT_SCHEMA_VERSION = 1;
export const J_STEM_LP01_RECOMMENDED_RECESS_CLEARANCE = 0.1;

const STEM_TYPE_VALUES = new Set(["none", "mx", "choc_v1", "choc_v2", "alps", "j_stem_lp01"]);
const TOP_SLOPE_INPUT_MODE_VALUES = new Set(["angle", "edge-height"]);
const TOP_SURFACE_SHAPE_VALUES = new Set(["flat", "cylindrical", "spherical"]);
const TYPEWRITER_TOP_SURFACE_SHAPE_VALUES = new Set(["flat", "spherical"]);
const TOP_SURFACE_SHAPE_PRESETS = Object.freeze({
  flat: Object.freeze({
    dishDepth: 0,
  }),
  cylindrical: Object.freeze({
    dishDepth: 0.5,
  }),
  spherical: Object.freeze({
    dishDepth: 1.0,
  }),
});
const COLOR_FIELD_KEYS = new Set([
  "bodyColor",
  "topHatColor",
  "rimColor",
  "legendColor",
  "topLegendRightTopColor",
  "topLegendRightBottomColor",
  "topLegendLeftTopColor",
  "topLegendLeftBottomColor",
  "sideLegendFrontColor",
  "sideLegendBackColor",
  "sideLegendLeftColor",
  "sideLegendRightColor",
  "homingBarColor",
]);
const LEGEND_MIN_SIZE = 0.5;
const LEGEND_OUTLINE_MIN = -1.2;
const LEGEND_OUTLINE_MAX = 1.2;
const LEGEND_FONT_STYLE_FALLBACK_KEY = "font-default";
const LEGEND_FIELD_SUFFIXES = Object.freeze({
  enabled: "Enabled",
  color: "Color",
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
const TOP_LEGEND_PARAM_PREFIXES = Object.freeze([
  "legend",
  "topLegendLeftTop",
  "topLegendRightTop",
  "topLegendLeftBottom",
  "topLegendRightBottom",
]);
const SIDE_LEGEND_PARAM_PREFIXES = Object.freeze(["sideLegendFront", "sideLegendBack", "sideLegendLeft", "sideLegendRight"]);
const LEGEND_PARAM_PREFIXES = Object.freeze([...TOP_LEGEND_PARAM_PREFIXES, ...SIDE_LEGEND_PARAM_PREFIXES]);
const TYPEWRITER_MIN_STEM_HEIGHT = 0.6;
const TYPEWRITER_STEM_MOUNT_OVERLAP = 0.02;
const TOP_SCALE_MIN = 0.02;
const TOP_SCALE_MAX = 1;
const TOP_SCALE_STEP = 0.01;
const TOP_SCALE_MIN_FACE_SIZE = 0.2;
const DISH_DEPTH_MAX = 1.5;
const TOP_THICKNESS_MIN = 0.05;
const TOP_HAT_MIN_SIZE = 0.2;
const TOP_HAT_MIN_HEIGHT = 0.05;
const TOP_HAT_MIN_SHOULDER_ANGLE = 5;
const TOP_HAT_MAX_SHOULDER_ANGLE = 85;
const TOP_HAT_MIN_SHOULDER_RADIUS = 0;
const TOP_HAT_EDGE_CLEARANCE = 0.2;
const TOP_HAT_RECESS_CLEARANCE = 0.05;
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
const RESERVED_COMPAT_PAYLOAD_KEYS = new Set(["kind", "schemaVersion", "profileSchemaVersion", "savedAt", "selectors", "params"]);
const KNOWN_EDITOR_PARAM_KEYS = Object.freeze(
  Array.from(new Set(keycapEditorProfiles.profiles.flatMap((profile) => Object.keys(profile.defaults ?? {})))),
);
const KNOWN_EDITOR_PARAM_KEY_SET = new Set(KNOWN_EDITOR_PARAM_KEYS);

function getPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function isRecognizedShapeProfileKey(profileKey) {
  return SHAPE_PROFILE_MAP.has(profileKey);
}

function isTypewriterGeometryType(geometryType) {
  return geometryType === "typewriter" || geometryType === "typewriter_jis_enter";
}

function isJisEnterGeometryType(geometryType) {
  return geometryType === "jis_enter" || geometryType === "typewriter_jis_enter";
}

function isJisEnterTopHatGeometry(params = {}) {
  return resolveShapeGeometryType(params.shapeProfile) === "jis_enter";
}

function resolveLegendFontConfig(fontKey = DEFAULT_KEYCAP_LEGEND_FONT_KEY) {
  return resolveKeycapLegendFont(fontKey);
}

function sanitizeLegendFontKey(value) {
  const resolvedFont = resolveLegendFontConfig(value);
  if (resolvedFont.isMissing && isUserKeycapLegendFontKey(value)) {
    return String(value);
  }

  return resolvedFont.key;
}

function legendParamKey(prefix, suffix) {
  return `${prefix}${suffix}`;
}

function findLegendParamPrefix(fieldKey, suffix) {
  return LEGEND_PARAM_PREFIXES.find((prefix) => fieldKey === legendParamKey(prefix, suffix));
}

function getLegendFontStyleFieldOptions(legendFontKey = DEFAULT_KEYCAP_LEGEND_FONT_KEY) {
  const nativeStyleOptions = getKeycapLegendFontStyleOptions(legendFontKey);
  if (nativeStyleOptions.length === 0) {
    return [{ value: LEGEND_FONT_STYLE_FALLBACK_KEY, label: "Same as font name" }];
  }

  return nativeStyleOptions.map((option) => ({
    value: option.key,
    label: option.label,
  }));
}

function clampMinimum(value, fallback, minimum) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(nextValue, minimum) : fallback;
}

function clampPositiveDimension(value, fallback, minimum = 1) {
  const nextValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedFallback = Number.isFinite(fallbackValue) && fallbackValue > 0
    ? fallbackValue
    : minimum;

  return Number.isFinite(nextValue) && nextValue > 0
    ? Math.max(nextValue, minimum)
    : Math.max(resolvedFallback, minimum);
}

function degTan(value) {
  return Math.tan((Number(value) * Math.PI) / 180);
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

function resolveTopScaleInnerMinimumForAxis(size, topCenterHeight, innerHeight, wall) {
  const denominator = innerHeight * size;
  const availableInnerFace = size - (wall * 2) - TOP_SCALE_MIN_FACE_SIZE;
  if (denominator <= 0 || availableInnerFace <= 0) {
    return TOP_SCALE_MAX;
  }

  return Math.max(1 - (availableInnerFace * topCenterHeight) / denominator, 0);
}

function resolveTopScaleMinimum(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const geometryDefaults = resolveShapeProfileGeometryDefaults(profileKey);
  const keyWidth = clampMinimum(params.keyWidth, defaults.keyWidth ?? 18, 1);
  const keyDepth = clampMinimum(params.keyDepth, defaults.keyDepth ?? 18, 1);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  const wall = clampMinimum(params.wallThickness, defaults.wallThickness ?? 1.2, 0);
  const topThickness = resolveTopThickness(params, defaults, geometryDefaults);
  const activeDishDepth = resolveActiveDishDepth({ ...defaults, ...params, shapeProfile: profileKey });
  const innerHeight = Math.max(
    topCenterHeight - Math.max(activeDishDepth, 0) - topThickness,
    TOP_SCALE_MIN_FACE_SIZE,
  );
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

export function getDishDepthMax(params = {}) {
  const topSurfaceShape = resolveProfileTopSurfaceShape(params.shapeProfile, params.topSurfaceShape, "flat");
  return topSurfaceShape === "flat" ? 0 : DISH_DEPTH_MAX;
}

function clampDishDepth(value, params = {}, fallback = 0) {
  const maximum = getDishDepthMax(params);
  return clampNumberRange(value, fallback, -maximum, maximum);
}

function resolveTopSlopeInputMode(value, fallback = "angle") {
  return TOP_SLOPE_INPUT_MODE_VALUES.has(value) ? value : fallback;
}

function resolveTopSurfaceShape(value, fallback = "flat") {
  if (TOP_SURFACE_SHAPE_VALUES.has(value)) {
    return value;
  }

  return TOP_SURFACE_SHAPE_VALUES.has(fallback) ? fallback : "flat";
}

function getAllowedTopSurfaceShapeValues(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  return isTypewriterGeometryType(resolveShapeGeometryType(profileKey))
    ? TYPEWRITER_TOP_SURFACE_SHAPE_VALUES
    : TOP_SURFACE_SHAPE_VALUES;
}

function resolveProfileTopSurfaceShape(profileKey, value, fallback = "flat") {
  const allowedValues = getAllowedTopSurfaceShapeValues(profileKey);
  const resolvedValue = resolveTopSurfaceShape(value, fallback);
  if (allowedValues.has(resolvedValue)) {
    return resolvedValue;
  }

  const resolvedFallback = resolveTopSurfaceShape(fallback, "flat");
  return allowedValues.has(resolvedFallback) ? resolvedFallback : "flat";
}

export function getTopSurfaceShapePreset(value, fallback = "flat") {
  const resolvedShape = resolveTopSurfaceShape(value, fallback);
  const preset = TOP_SURFACE_SHAPE_PRESETS[resolvedShape] ?? TOP_SURFACE_SHAPE_PRESETS.flat;
  return {
    dishDepth: preset.dishDepth,
  };
}

function inferLegacyTopSurfaceShape(params = {}) {
  const dishDepth = Number(params.dishDepth ?? 0);
  if (params.topSurfaceShape != null || !Number.isFinite(dishDepth) || Math.abs(dishDepth) <= 0.001) {
    return null;
  }

  return "spherical";
}

function inferMissingTopHatColor(params = {}) {
  return params.topHatColor == null && params.bodyColor != null
    ? { topHatColor: params.bodyColor }
    : {};
}

function resolveActiveDishDepth(params = {}) {
  const dishDepth = Number(params.dishDepth ?? 0);
  if (!Number.isFinite(dishDepth)) {
    return 0;
  }

  return resolveProfileTopSurfaceShape(params.shapeProfile, params.topSurfaceShape, "flat") === "flat"
    ? 0
    : dishDepth;
}

function clampTypewriterCornerRadius(value, fallback = 0, params = {}) {
  return clampTypewriterCornerRadiusForParams(value, params, fallback);
}

function getJisEnterFootprintLimits(params = {}) {
  const keyWidth = Math.max(Number(params.keyWidth ?? 0), 0);
  const keyDepth = Math.max(Number(params.keyDepth ?? 0), 0);
  const notchWidth = Math.min(Math.max(Number(params.jisEnterNotchWidth ?? 0), 0), Math.max(keyWidth - 0.2, 0));
  const notchDepth = Math.min(Math.max(Number(params.jisEnterNotchDepth ?? 0), 0), Math.max(keyDepth - 0.2, 0));

  return {
    keyWidth,
    keyDepth,
    notchWidth,
    notchDepth,
    lowerBodyWidth: Math.max(keyWidth - notchWidth, 0),
    upperBodyDepth: Math.max(keyDepth - notchDepth, 0),
  };
}

function getTypewriterCornerRadiusMax(params = {}) {
  const keyWidth = Math.max(Number(params.keyWidth ?? 0), 0);
  const keyDepth = Math.max(Number(params.keyDepth ?? 0), 0);
  if (isJisEnterGeometryType(resolveShapeGeometryType(params.shapeProfile))) {
    const limits = getJisEnterFootprintLimits(params);
    return Math.max(Math.min(
      limits.keyWidth,
      limits.keyDepth,
      limits.lowerBodyWidth,
      limits.upperBodyDepth,
    ) / 2, 0);
  }

  return Math.max(Math.min(keyWidth, keyDepth) / 2, 0);
}

function clampTypewriterCornerRadiusForParams(value, params = {}, fallback = 0) {
  const maxRadius = getTypewriterCornerRadiusMax(params);
  const nextValue = Number(value);
  const fallbackValue = Math.min(Math.max(Number(fallback) || 0, 0), maxRadius);
  if (!Number.isFinite(nextValue)) {
    return fallbackValue;
  }

  return Math.min(Math.max(nextValue, 0), maxRadius);
}

function clampNonNegativeNumber(value, fallback = 0) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return Math.max(Number(fallback) || 0, 0);
  }

  return Math.max(nextValue, 0);
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

function getTopHatFootprintLimits(params = {}) {
  const geometry = resolveTopPlaneGeometry(params);
  return {
    width: Math.max(geometry.topRight - geometry.topLeft, TOP_HAT_MIN_SIZE),
    depth: Math.max(geometry.topBack - geometry.topFront, TOP_HAT_MIN_SIZE),
  };
}

function getTopHatUsableFootprintLimits(params = {}) {
  const limits = getTopHatFootprintLimits(params);
  return {
    width: Math.max(limits.width - TOP_HAT_EDGE_CLEARANCE * 2, TOP_HAT_MIN_SIZE),
    depth: Math.max(limits.depth - TOP_HAT_EDGE_CLEARANCE * 2, TOP_HAT_MIN_SIZE),
  };
}

export function getTopHatDishDepthMax(params = {}, topHatSurfaceShape = params.topHatSurfaceShape ?? "flat") {
  const resolvedShape = resolveTopSurfaceShape(topHatSurfaceShape, "flat");
  return resolvedShape === "flat" ? 0 : DISH_DEPTH_MAX;
}

function clampTopHatDishDepth(value, params = {}, fallback = 0) {
  const maximum = getTopHatDishDepthMax(params);
  return clampNumberRange(value, fallback, -maximum, maximum);
}

function getJisEnterTopHatInsetMax(params = {}) {
  const limits = getTopHatFootprintLimits(params);
  const notchWidth = Math.min(Math.max(Number(params.jisEnterNotchWidth ?? 0), 0), Math.max(limits.width - TOP_HAT_MIN_SIZE, 0));
  const notchDepth = Math.min(Math.max(Number(params.jisEnterNotchDepth ?? 0), 0), Math.max(limits.depth - TOP_HAT_MIN_SIZE, 0));
  const lowerWidth = Math.max(limits.width - notchWidth, 0);
  const upperDepth = Math.max(limits.depth - notchDepth, 0);
  return Math.max(Math.min(
    (limits.width - TOP_HAT_MIN_SIZE) / 2,
    (limits.depth - TOP_HAT_MIN_SIZE) / 2,
    (lowerWidth - TOP_HAT_MIN_SIZE) / 2,
    (upperDepth - TOP_HAT_MIN_SIZE) / 2,
  ), 0);
}

function clampTopHatShoulderAngle(value, fallback = 45) {
  return clampNumberRange(value, fallback, TOP_HAT_MIN_SHOULDER_ANGLE, TOP_HAT_MAX_SHOULDER_ANGLE);
}

function clampTopHatInset(value, params = {}, fallback = TOP_HAT_MIN_SIZE) {
  return clampNumberRange(value, fallback, 0, getJisEnterTopHatInsetMax(params));
}

function clampTopHatTopWidth(value, params = {}, fallback = TOP_HAT_MIN_SIZE) {
  return clampNumberRange(value, fallback, TOP_HAT_MIN_SIZE, getTopHatUsableFootprintLimits(params).width);
}

function clampTopHatTopDepth(value, params = {}, fallback = TOP_HAT_MIN_SIZE) {
  return clampNumberRange(value, fallback, TOP_HAT_MIN_SIZE, getTopHatUsableFootprintLimits(params).depth);
}

function clampTopHatBottomWidth(value, params = {}, fallback = TOP_HAT_MIN_SIZE) {
  const limits = getTopHatUsableFootprintLimits(params);
  const topWidth = clampTopHatTopWidth(params.topHatTopWidth, params, params.topHatTopWidth);
  return clampNumberRange(value, fallback, topWidth, limits.width);
}

function clampTopHatBottomDepth(value, params = {}, fallback = TOP_HAT_MIN_SIZE) {
  const limits = getTopHatUsableFootprintLimits(params);
  const topDepth = clampTopHatTopDepth(params.topHatTopDepth, params, params.topHatTopDepth);
  return clampNumberRange(value, fallback, topDepth, limits.depth);
}

function getTopHatTopRadiusMax(params = {}) {
  if (isJisEnterTopHatGeometry(params) && ("topHatInset" in params)) {
    const limits = getTopHatFootprintLimits(params);
    const inset = clampTopHatInset(params.topHatInset, params, params.topHatInset);
    const width = Math.max(limits.width - inset * 2, TOP_HAT_MIN_SIZE);
    const depth = Math.max(limits.depth - inset * 2, TOP_HAT_MIN_SIZE);
    const notchWidth = Math.min(Math.max(Number(params.jisEnterNotchWidth ?? 0), 0), Math.max(width - TOP_HAT_MIN_SIZE, 0));
    const notchDepth = Math.min(Math.max(Number(params.jisEnterNotchDepth ?? 0), 0), Math.max(depth - TOP_HAT_MIN_SIZE, 0));
    const lowerWidth = Math.max(width - notchWidth, TOP_HAT_MIN_SIZE);
    const upperDepth = Math.max(depth - notchDepth, TOP_HAT_MIN_SIZE);
    return Math.max(Math.min(width, depth, lowerWidth, upperDepth, notchWidth || width, notchDepth || depth) / 2, 0);
  }

  const width = clampTopHatTopWidth(params.topHatTopWidth, params, params.topHatTopWidth);
  const depth = clampTopHatTopDepth(params.topHatTopDepth, params, params.topHatTopDepth);
  return Math.max(Math.min(width, depth) / 2, 0);
}

function clampTopHatTopRadius(value, params = {}, fallback = 0) {
  return clampNumberRange(value, fallback, 0, getTopHatTopRadiusMax(params));
}

function getTopHatBottomRadiusMax(params = {}) {
  const actualOutset = getTopHatActualShoulderOutset(params);

  if (isJisEnterTopHatGeometry(params) && ("topHatInset" in params)) {
    const limits = getTopHatFootprintLimits(params);
    const topInset = clampTopHatInset(params.topHatInset, params, params.topHatInset);
    const baseInset = Math.max(topInset - actualOutset, 0);
    const width = Math.max(limits.width - baseInset * 2, TOP_HAT_MIN_SIZE);
    const depth = Math.max(limits.depth - baseInset * 2, TOP_HAT_MIN_SIZE);
    const notchWidth = Math.min(Math.max(Number(params.jisEnterNotchWidth ?? 0), 0), Math.max(width - TOP_HAT_MIN_SIZE, 0));
    const notchDepth = Math.min(Math.max(Number(params.jisEnterNotchDepth ?? 0), 0), Math.max(depth - TOP_HAT_MIN_SIZE, 0));
    const lowerWidth = Math.max(width - notchWidth, TOP_HAT_MIN_SIZE);
    const upperDepth = Math.max(depth - notchDepth, TOP_HAT_MIN_SIZE);
    return Math.max(Math.min(width, depth, lowerWidth, upperDepth, notchWidth || width, notchDepth || depth) / 2, 0);
  }

  const baseWidth = clampTopHatBottomWidth(params.topHatBottomWidth, params, params.topHatBottomWidth);
  const baseDepth = clampTopHatBottomDepth(params.topHatBottomDepth, params, params.topHatBottomDepth);
  return Math.max(Math.min(baseWidth, baseDepth) / 2, 0);
}

function clampTopHatBottomRadius(value, params = {}, fallback = 0) {
  return clampNumberRange(value, fallback, 0, getTopHatBottomRadiusMax(params));
}

function getTopHatShoulderOutset(params = {}) {
  if (isJisEnterTopHatGeometry(params) && ("topHatInset" in params)) {
    return clampTopHatInset(params.topHatInset, params, params.topHatInset);
  }

  const topWidth = clampTopHatTopWidth(params.topHatTopWidth, params, params.topHatTopWidth);
  const topDepth = clampTopHatTopDepth(params.topHatTopDepth, params, params.topHatTopDepth);
  const bottomWidth = clampTopHatBottomWidth(params.topHatBottomWidth, params, params.topHatBottomWidth);
  const bottomDepth = clampTopHatBottomDepth(params.topHatBottomDepth, params, params.topHatBottomDepth);
  return Math.min(
    Math.max((bottomWidth - topWidth) / 2, 0),
    Math.max((bottomDepth - topDepth) / 2, 0),
  );
}

function getTopHatActualShoulderOutset(params = {}) {
  const shoulderOutset = getTopHatShoulderOutset(params);
  if (!isJisEnterTopHatGeometry(params) || !("topHatInset" in params)) {
    return shoulderOutset;
  }

  const height = Math.abs(clampTopHatHeight(params.topHatHeight, params, params.topHatHeight ?? TOP_HAT_MIN_HEIGHT));
  const shoulderAngle = clampTopHatShoulderAngle(params.topHatShoulderAngle, params.topHatShoulderAngle ?? 45);
  return Math.min(shoulderOutset, height / degTan(shoulderAngle));
}

function getTopHatHeightMax(params = {}) {
  const availableOutset = getTopHatShoulderOutset(params);
  const shoulderAngle = clampTopHatShoulderAngle(params.topHatShoulderAngle, params.topHatShoulderAngle ?? 45);

  return Math.max(availableOutset * degTan(shoulderAngle), TOP_HAT_MIN_HEIGHT);
}

function getTopHatHeightMin(params = {}) {
  const geometry = resolveTopPlaneGeometry(params);
  return -Math.max(Number(geometry.topThickness ?? 0) - TOP_HAT_RECESS_CLEARANCE, 0);
}

function clampTopHatHeight(value, params = {}, fallback = TOP_HAT_MIN_HEIGHT) {
  return clampNumberRange(value, fallback, getTopHatHeightMin(params), getTopHatHeightMax(params));
}

function getTopHatShoulderRadiusMax(params = {}) {
  const height = Math.abs(clampTopHatHeight(params.topHatHeight, params, params.topHatHeight ?? TOP_HAT_MIN_HEIGHT));
  return Math.max(Math.min(height, getTopHatActualShoulderOutset(params)), TOP_HAT_MIN_SHOULDER_RADIUS);
}

function getTopHatShoulderRadiusMin(params = {}) {
  return -getTopHatShoulderRadiusMax(params);
}

function clampTopHatShoulderRadius(value, params = {}, fallback = 0) {
  return clampNumberRange(value, fallback, getTopHatShoulderRadiusMin(params), getTopHatShoulderRadiusMax(params));
}

function getTypewriterRimMaxWidth(params = {}) {
  if (isJisEnterGeometryType(resolveShapeGeometryType(params.shapeProfile))) {
    const limits = getJisEnterFootprintLimits(params);
    return Math.max(Math.min(
      limits.keyWidth,
      limits.keyDepth,
      limits.lowerBodyWidth,
      limits.upperBodyDepth,
    ) / 2, 0);
  }

  return Math.max(Math.min(Number(params.keyWidth ?? 0), Number(params.keyDepth ?? 0)) / 2, 0);
}

function clampTypewriterRimWidth(value, params = {}, fallback = 0) {
  const maxWidth = getTypewriterRimMaxWidth(params);
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return Math.min(Math.max(Number(fallback) || 0, 0), maxWidth);
  }

  return Math.min(Math.max(nextValue, 0), maxWidth);
}

function getJisEnterNotchWidthMax(params = {}) {
  return Math.max(Number(params.keyWidth ?? 0) - 0.2, 0);
}

function getJisEnterNotchDepthMax(params = {}) {
  return Math.max(Number(params.keyDepth ?? 0) - 0.2, 0);
}

function clampJisEnterNotchDimension(value, maxValue, fallback = 0) {
  const nextValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedFallback = Number.isFinite(fallbackValue) ? Math.max(fallbackValue, 0) : 0;
  if (!Number.isFinite(nextValue)) {
    return Math.min(resolvedFallback, maxValue);
  }

  return Math.min(Math.max(nextValue, 0), maxValue);
}

function clampJisEnterNotchWidth(value, params = {}, fallback = 0) {
  return clampJisEnterNotchDimension(value, getJisEnterNotchWidthMax(params), fallback);
}

function clampJisEnterNotchDepth(value, params = {}, fallback = 0) {
  return clampJisEnterNotchDimension(value, getJisEnterNotchDepthMax(params), fallback);
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

function clampLegendOutlineDelta(value, fallback = 0) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.min(Math.max(nextValue, LEGEND_OUTLINE_MIN), LEGEND_OUTLINE_MAX);
}

function clampLegendSize(value, fallback = LEGEND_MIN_SIZE) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(nextValue, LEGEND_MIN_SIZE) : fallback;
}

function isSupportedStemType(stemType) {
  return STEM_TYPE_VALUES.has(stemType);
}

function resolveDefaultStemType(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const defaults = createDefaultKeycapParams(profileKey);
  return isSupportedStemType(defaults.stemType) ? defaults.stemType : "choc_v2";
}

export function resolveStemType(params = {}) {
  if (isSupportedStemType(params.stemType)) {
    return params.stemType;
  }

  return resolveDefaultStemType(params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY);
}

export function resolveStemCrossMarginAfterStemTypeChange(
  nextStemType,
  currentStemCrossMargin,
  previousStemType = null,
) {
  if (nextStemType !== "j_stem_lp01" || previousStemType === "j_stem_lp01") {
    return currentStemCrossMargin;
  }

  const currentValue = Number(currentStemCrossMargin);
  return !Number.isFinite(currentValue) || currentValue <= 0
    ? J_STEM_LP01_RECOMMENDED_RECESS_CLEARANCE
    : currentValue;
}

function resolveShapeProfileGeometryDefaults(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const geometryDefaults = getShapeProfileGeometryDefaults(profileKey);
  const geometryType = resolveShapeGeometryType(profileKey);

  return {
    geometryType,
    profileFrontAngle: clampMinimum(geometryDefaults.profileFrontAngle, Number(geometryDefaults.profileFrontAngle) || 0, 0),
    profileBackAngle: clampMinimum(geometryDefaults.profileBackAngle, Number(geometryDefaults.profileBackAngle) || 0, 0),
    profileLeftAngle: clampMinimum(geometryDefaults.profileLeftAngle, Number(geometryDefaults.profileLeftAngle) || 0, 0),
    profileRightAngle: clampMinimum(geometryDefaults.profileRightAngle, Number(geometryDefaults.profileRightAngle) || 0, 0),
    topThickness: clampMinimum(geometryDefaults.topThickness, Number(geometryDefaults.topThickness) || TOP_THICKNESS_MIN, TOP_THICKNESS_MIN),
    bottomCornerRadius: clampMinimum(geometryDefaults.bottomCornerRadius, Number(geometryDefaults.bottomCornerRadius) || 0, 0),
    topCornerRadius: clampMinimum(geometryDefaults.topCornerRadius, Number(geometryDefaults.topCornerRadius) || 0, 0),
  };
}

function resolveTopThickness(params = {}, defaults = createDefaultKeycapParams(params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY), geometryDefaults = resolveShapeProfileGeometryDefaults(params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY)) {
  return clampMinimum(
    params.topThickness,
    defaults.topThickness ?? geometryDefaults.topThickness ?? TOP_THICKNESS_MIN,
    TOP_THICKNESS_MIN,
  );
}

function resolveProfileAngles(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const geometryDefaults = resolveShapeProfileGeometryDefaults(profileKey);
  const topThickness = resolveTopThickness(params, defaults, geometryDefaults);

  if (isTypewriterGeometryType(geometryDefaults.geometryType)) {
    return {
      front: 0,
      back: 0,
      left: 0,
      right: 0,
      topThickness,
    };
  }

  const keyWidth = clampMinimum(params.keyWidth, defaults.keyWidth ?? 18, 1);
  const keyDepth = clampMinimum(params.keyDepth, defaults.keyDepth ?? 18, 1);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  const topScale = clampTopScale(params.topScale, defaults.topScale ?? 1, params);
  const horizontalAngle = resolveTopScaleAngle(keyWidth, topCenterHeight, topScale);
  const verticalAngle = resolveTopScaleAngle(keyDepth, topCenterHeight, topScale);

  return {
    front: verticalAngle,
    back: verticalAngle,
    left: horizontalAngle,
    right: horizontalAngle,
    topThickness,
  };
}

function resolveTopPlaneGeometry(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const resolvedAngles = resolveProfileAngles(params);
  const keyWidth = clampMinimum(params.keyWidth, defaults.keyWidth ?? 18, 1);
  const keyDepth = clampMinimum(params.keyDepth, defaults.keyDepth ?? 18, 1);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  const topLeft = -keyWidth / 2 + topCenterHeight * degTan(resolvedAngles.left);
  const topRight = keyWidth / 2 - topCenterHeight * degTan(resolvedAngles.right);
  const topFront = -keyDepth / 2 + topCenterHeight * degTan(resolvedAngles.front);
  const topBack = keyDepth / 2 - topCenterHeight * degTan(resolvedAngles.back);

  return {
    topCenterHeight,
    topLeft,
    topRight,
    topFront,
    topBack,
    topThickness: resolvedAngles.topThickness,
  };
}

function getTopCornerRadiusMax(params = {}) {
  const geometry = resolveTopPlaneGeometry(params);
  return Math.max(Math.min(
    geometry.topRight - geometry.topLeft,
    geometry.topBack - geometry.topFront,
  ) / 2, 0);
}

function clampTopCornerRadius(value, params = {}, fallback = 0) {
  return clampNumberRange(value, fallback, 0, getTopCornerRadiusMax(params));
}

function getKeycapShoulderOutset(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  if (isTypewriterGeometryType(resolveShapeGeometryType(profileKey))) {
    return 0;
  }

  const defaults = createDefaultKeycapParams(profileKey);
  const resolvedAngles = resolveProfileAngles(params);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);

  return Math.max(Math.min(
    topCenterHeight * degTan(resolvedAngles.front),
    topCenterHeight * degTan(resolvedAngles.back),
    topCenterHeight * degTan(resolvedAngles.left),
    topCenterHeight * degTan(resolvedAngles.right),
  ), 0);
}

function getKeycapShoulderRadiusMax(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  return Math.max(Math.min(topCenterHeight, getKeycapShoulderOutset(params)), 0);
}

function getKeycapEdgeRadiusMax(params = {}) {
  return getKeycapShoulderRadiusMax(params);
}

function clampKeycapEdgeRadius(value, params = {}, fallback = 0) {
  return clampNumberRange(value, fallback, 0, getKeycapEdgeRadiusMax(params));
}

function getKeycapShoulderRadiusMin(params = {}) {
  return -getKeycapShoulderRadiusMax(params);
}

function clampKeycapShoulderRadius(value, params = {}, fallback = 0) {
  return clampNumberRange(value, fallback, getKeycapShoulderRadiusMin(params), getKeycapShoulderRadiusMax(params));
}

function resolveTopEdgeHeights(params = {}) {
  const geometry = resolveTopPlaneGeometry(params);
  const topPitchDeg = Number(params.topPitchDeg ?? 0);
  const topRollDeg = Number(params.topRollDeg ?? 0);
  const pitchSlope = degTan(topPitchDeg);
  const rollSlope = degTan(topRollDeg);
  const activeDishDepth = resolveActiveDishDepth(params);

  return {
    topFrontHeight: geometry.topCenterHeight + geometry.topFront * pitchSlope,
    topBackHeight: geometry.topCenterHeight + geometry.topBack * pitchSlope,
    topLeftHeight: geometry.topCenterHeight + geometry.topLeft * rollSlope,
    topRightHeight: geometry.topCenterHeight + geometry.topRight * rollSlope,
    topVisibleCenterHeight: geometry.topCenterHeight - activeDishDepth,
  };
}

function syncLegendFontParams(params = {}, prefix = "legend") {
  const contentTypeKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.contentType);
  const iconSetKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.iconSet);
  const iconNameKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.iconName);
  const fontKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.fontKey);
  const fontStyleKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.fontStyleKey);
  const outlineDeltaKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.outlineDelta);
  const iconFillKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.iconFill);

  params[contentTypeKey] = resolveLegendContentType(params[contentTypeKey] ?? DEFAULT_LEGEND_CONTENT_TYPE);
  params[iconSetKey] = resolveLegendIconSet(params[iconSetKey] ?? DEFAULT_LEGEND_ICON_SET);
  const inferredIconFill = inferLegendIconFillFromName(params[iconNameKey], params[iconSetKey]);
  params[iconNameKey] = resolveLegendIconName(params[iconNameKey] ?? DEFAULT_LEGEND_ICON_NAME, params[iconSetKey]);
  params[iconFillKey] = isLegendIconFillAvailable(params[iconNameKey], params[iconSetKey])
    ? (resolveLegendIconFill(params[iconFillKey] ?? DEFAULT_LEGEND_ICON_FILL) || inferredIconFill)
    : DEFAULT_LEGEND_ICON_FILL;
  params[fontKey] = sanitizeLegendFontKey(params[fontKey]);
  const styleOptions = getLegendFontStyleFieldOptions(params[fontKey]);
  const fallbackStyleKey = styleOptions[0]?.value ?? LEGEND_FONT_STYLE_FALLBACK_KEY;
  const allowedStyleKeys = new Set(styleOptions.map((option) => option.value));
  params[fontStyleKey] = allowedStyleKeys.has(params[fontStyleKey])
    ? params[fontStyleKey]
    : fallbackStyleKey;
  params[outlineDeltaKey] = clampLegendOutlineDelta(params[outlineDeltaKey], 0);
  return params;
}

export function syncDerivedKeycapParams(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const geometryDefaults = resolveShapeProfileGeometryDefaults(profileKey);

  params.keyWidth = clampPositiveDimension(params.keyWidth, defaults.keyWidth ?? 18);
  params.keyDepth = clampPositiveDimension(params.keyDepth, defaults.keyDepth ?? 18);
  params.topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  params.topThickness = resolveTopThickness(params, defaults, geometryDefaults);
  params.topPitchDeg = Number.isFinite(Number(params.topPitchDeg)) ? Number(params.topPitchDeg) : Number(defaults.topPitchDeg ?? 0);
  params.topRollDeg = Number.isFinite(Number(params.topRollDeg)) ? Number(params.topRollDeg) : Number(defaults.topRollDeg ?? 0);
  params.topOffsetX = Number.isFinite(Number(params.topOffsetX)) ? Number(params.topOffsetX) : Number(defaults.topOffsetX ?? 0);
  params.topOffsetY = Number.isFinite(Number(params.topOffsetY)) ? Number(params.topOffsetY) : Number(defaults.topOffsetY ?? 0);
  params.topSlopeInputMode = resolveTopSlopeInputMode(params.topSlopeInputMode, resolveTopSlopeInputMode(defaults.topSlopeInputMode));
  params.topSurfaceShape = resolveProfileTopSurfaceShape(
    profileKey,
    params.topSurfaceShape,
    resolveProfileTopSurfaceShape(profileKey, defaults.topSurfaceShape, "flat"),
  );
  params.dishDepth = clampDishDepth(params.dishDepth, params, defaults.dishDepth ?? 0);
  params.topScale = clampTopScale(params.topScale, defaults.topScale ?? 1, params);
  if ("keycapEdgeRadius" in defaults || "keycapEdgeRadius" in params) {
    params.keycapEdgeRadius = clampKeycapEdgeRadius(
      params.keycapEdgeRadius,
      params,
      defaults.keycapEdgeRadius ?? 0,
    );
  }
  if ("keycapShoulderRadius" in defaults || "keycapShoulderRadius" in params) {
    params.keycapShoulderRadius = clampKeycapShoulderRadius(
      params.keycapShoulderRadius,
      params,
      defaults.keycapShoulderRadius ?? 0,
    );
  }
  if ("topCornerRadius" in defaults || "topCornerRadius" in params) {
    params.topCornerRadius = clampTopCornerRadius(
      params.topCornerRadius,
      params,
      defaults.topCornerRadius ?? 0,
    );
    params.topCornerRadiusIndividualEnabled = typeof params.topCornerRadiusIndividualEnabled === "boolean"
      ? params.topCornerRadiusIndividualEnabled
      : Boolean(defaults.topCornerRadiusIndividualEnabled);
    TOP_CORNER_RADIUS_FIELD_KEYS.forEach((fieldKey) => {
      params[fieldKey] = params.topCornerRadiusIndividualEnabled
        ? clampTopCornerRadius(params[fieldKey], params, defaults[fieldKey] ?? params.topCornerRadius)
        : params.topCornerRadius;
    });
  }
  params.typewriterCornerRadius = clampTypewriterCornerRadius(
    params.typewriterCornerRadius,
    defaults.typewriterCornerRadius ?? getTypewriterCornerRadiusMax(params),
    params,
  );
  const geometryType = resolveShapeGeometryType(profileKey);
  if (isTypewriterGeometryType(geometryType)) {
    params.typewriterMountHeight = clampTypewriterMountHeight(
      params.typewriterMountHeight,
      params,
      defaults.typewriterMountHeight ?? 0,
    );
  }
  if (isJisEnterGeometryType(geometryType)) {
    params.jisEnterNotchWidth = clampJisEnterNotchWidth(
      params.jisEnterNotchWidth,
      params,
      defaults.jisEnterNotchWidth ?? 0,
    );
    params.jisEnterNotchDepth = clampJisEnterNotchDepth(
      params.jisEnterNotchDepth,
      params,
      defaults.jisEnterNotchDepth ?? 0,
    );
  }
  if ("topHatEnabled" in defaults || "topHatEnabled" in params) {
    params.topHatEnabled = typeof params.topHatEnabled === "boolean"
      ? params.topHatEnabled
      : Boolean(defaults.topHatEnabled);
    params.topHatSeparateColorEnabled = typeof params.topHatSeparateColorEnabled === "boolean"
      ? params.topHatSeparateColorEnabled
      : Boolean(defaults.topHatSeparateColorEnabled);
    params.topHatColor = normalizeHexColor(params.topHatColor)
      ?? normalizeHexColor(defaults.topHatColor)
      ?? normalizeHexColor(params.bodyColor)
      ?? "#f8f9fa";
    params.topHatShoulderAngle = clampTopHatShoulderAngle(params.topHatShoulderAngle, defaults.topHatShoulderAngle ?? 45);
    if ("topHatInset" in defaults || "topHatInset" in params) {
      params.topHatInset = clampTopHatInset(params.topHatInset, params, defaults.topHatInset ?? 2.0);
    }
    if ("topHatTopWidth" in defaults || "topHatTopWidth" in params) {
      params.topHatTopWidth = clampTopHatTopWidth(params.topHatTopWidth, params, defaults.topHatTopWidth ?? 10.5);
    }
    if ("topHatTopDepth" in defaults || "topHatTopDepth" in params) {
      params.topHatTopDepth = clampTopHatTopDepth(params.topHatTopDepth, params, defaults.topHatTopDepth ?? 9.5);
    }
    if ("topHatBottomWidth" in defaults || "topHatBottomWidth" in params) {
      params.topHatBottomWidth = clampTopHatBottomWidth(params.topHatBottomWidth, params, defaults.topHatBottomWidth ?? params.topHatTopWidth);
    }
    if ("topHatBottomDepth" in defaults || "topHatBottomDepth" in params) {
      params.topHatBottomDepth = clampTopHatBottomDepth(params.topHatBottomDepth, params, defaults.topHatBottomDepth ?? params.topHatTopDepth);
    }
    params.topHatSurfaceShape = resolveTopSurfaceShape(
      params.topHatSurfaceShape,
      resolveTopSurfaceShape(defaults.topHatSurfaceShape, "flat"),
    );
    params.topHatDishDepth = params.topHatSurfaceShape === "flat"
      ? 0
      : clampTopHatDishDepth(params.topHatDishDepth, params, defaults.topHatDishDepth ?? 0);
    params.topHatHeight = clampTopHatHeight(params.topHatHeight, params, defaults.topHatHeight ?? 1.4);
    params.topHatShoulderRadius = clampTopHatShoulderRadius(params.topHatShoulderRadius, params, defaults.topHatShoulderRadius ?? 0);
    params.topHatTopRadius = clampTopHatTopRadius(params.topHatTopRadius, params, defaults.topHatTopRadius ?? 0);
    params.topHatBottomRadius = clampTopHatBottomRadius(params.topHatBottomRadius, params, defaults.topHatBottomRadius ?? 0);
    params.topHatTopRadiusIndividualEnabled = typeof params.topHatTopRadiusIndividualEnabled === "boolean"
      ? params.topHatTopRadiusIndividualEnabled
      : Boolean(defaults.topHatTopRadiusIndividualEnabled);
    TOP_HAT_TOP_RADIUS_FIELD_KEYS.forEach((fieldKey) => {
      params[fieldKey] = params.topHatTopRadiusIndividualEnabled
        ? clampTopHatTopRadius(params[fieldKey], params, defaults[fieldKey] ?? params.topHatTopRadius)
        : params.topHatTopRadius;
    });
    params.topHatBottomRadiusIndividualEnabled = typeof params.topHatBottomRadiusIndividualEnabled === "boolean"
      ? params.topHatBottomRadiusIndividualEnabled
      : Boolean(defaults.topHatBottomRadiusIndividualEnabled);
    TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS.forEach((fieldKey) => {
      params[fieldKey] = params.topHatBottomRadiusIndividualEnabled
        ? clampTopHatBottomRadius(params[fieldKey], params, defaults[fieldKey] ?? params.topHatBottomRadius)
        : params.topHatBottomRadius;
    });
  }
  params.rimWidth = clampTypewriterRimWidth(params.rimWidth, params, defaults.rimWidth ?? 0);
  params.rimHeightUp = clampNonNegativeNumber(params.rimHeightUp, defaults.rimHeightUp ?? 0);
  params.rimHeightDown = clampNonNegativeNumber(params.rimHeightDown, defaults.rimHeightDown ?? 0);
  LEGEND_PARAM_PREFIXES.forEach((prefix) => {
    const sizeKey = legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.size);
    const defaultLegendSize = clampLegendSize(defaults[sizeKey], LEGEND_MIN_SIZE);
    syncLegendFontParams(params, prefix);
    params[sizeKey] = clampLegendSize(params[sizeKey], defaultLegendSize);
  });
  Object.assign(params, resolveTopEdgeHeights(params));
  params.stemType = resolveStemType(params);
  if (params.stemType === "j_stem_lp01") {
    params.stemInsetDelta = clampNonNegativeNumber(params.stemInsetDelta, defaults.stemInsetDelta ?? 0);
  }
  params.jStemLp01PreviewColor = resolveJStemLp01PreviewColor(
    params.jStemLp01PreviewColor,
    defaults.jStemLp01PreviewColor,
  );
  params.stemEnabled = params.stemType !== "none";
  return params;
}

export function sanitizeExportBaseName(value, fallback = DEFAULT_EXPORT_BASE_NAME) {
  const fallbackValue = String(fallback ?? "").trim() || DEFAULT_EXPORT_BASE_NAME;
  const normalized = String(value ?? "")
    .trim()
    .replace(/\.(json|3mf|step|stl)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "");

  return normalized || fallbackValue;
}

export function pickEditorSelectors(params = {}) {
  return Object.fromEntries(
    EDITOR_SELECTOR_KEYS
      .filter((key) => key in params)
      .map((key) => [key, params[key]]),
  );
}

export function listEditableParamKeys(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const defaults = createDefaultKeycapParams(profileKey);
  return Object.keys(defaults);
}

export function sanitizeEditorParamValue(fieldKey, value, fallback, paramsContext = {}) {
  if (fieldKey === "name") {
    return sanitizeExportBaseName(value, fallback);
  }

  if (fieldKey === "shapeProfile") {
    return isRecognizedShapeProfileKey(value) ? value : fallback;
  }

  if (findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.fontKey)) {
    return sanitizeLegendFontKey(value);
  }

  if (findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.contentType)) {
    return resolveLegendContentType(value ?? fallback);
  }

  if (findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.iconSet)) {
    return resolveLegendIconSet(value ?? fallback);
  }

  const legendIconNamePrefix = findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.iconName);
  if (legendIconNamePrefix) {
    const iconSet = resolveLegendIconSet(paramsContext?.[legendParamKey(legendIconNamePrefix, LEGEND_FIELD_SUFFIXES.iconSet)] ?? DEFAULT_LEGEND_ICON_SET);
    const iconFillKey = legendParamKey(legendIconNamePrefix, LEGEND_FIELD_SUFFIXES.iconFill);
    const inferredIconFill = inferLegendIconFillFromName(value ?? fallback, iconSet);
    if (inferredIconFill && isLegendIconFillAvailable(value ?? fallback, iconSet) && paramsContext) {
      paramsContext[iconFillKey] = resolveLegendIconFill(paramsContext[iconFillKey] ?? DEFAULT_LEGEND_ICON_FILL) || inferredIconFill;
    }
    return resolveLegendIconName(value ?? fallback, iconSet);
  }

  const legendIconFillPrefix = findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.iconFill);
  if (legendIconFillPrefix) {
    const iconSet = resolveLegendIconSet(paramsContext?.[legendParamKey(legendIconFillPrefix, LEGEND_FIELD_SUFFIXES.iconSet)] ?? DEFAULT_LEGEND_ICON_SET);
    const iconName = paramsContext?.[legendParamKey(legendIconFillPrefix, LEGEND_FIELD_SUFFIXES.iconName)] ?? DEFAULT_LEGEND_ICON_NAME;
    return isLegendIconFillAvailable(iconName, iconSet) ? resolveLegendIconFill(value ?? fallback) : DEFAULT_LEGEND_ICON_FILL;
  }

  const legendFontStylePrefix = findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.fontStyleKey);
  if (legendFontStylePrefix) {
    const legendFontKey = resolveLegendFontConfig(paramsContext?.[legendParamKey(legendFontStylePrefix, LEGEND_FIELD_SUFFIXES.fontKey)]).key;
    const styleOptions = getLegendFontStyleFieldOptions(legendFontKey);
    const allowedValues = new Set(styleOptions.map((option) => option.value));
    const fallbackValue = allowedValues.has(fallback) ? fallback : (styleOptions[0]?.value ?? LEGEND_FONT_STYLE_FALLBACK_KEY);
    return allowedValues.has(value) ? value : fallbackValue;
  }

  if (fieldKey === "stemType") {
    return isSupportedStemType(value) ? value : fallback;
  }

  if (fieldKey === "jStemLp01PreviewColor") {
    return resolveJStemLp01PreviewColor(value, fallback);
  }

  if (fieldKey === "stemInsetDelta" && resolveStemType(paramsContext) === "j_stem_lp01") {
    return clampNonNegativeNumber(value, fallback);
  }

  if (fieldKey === "topSlopeInputMode") {
    return resolveTopSlopeInputMode(value, resolveTopSlopeInputMode(fallback));
  }

  if (fieldKey === "topSurfaceShape") {
    const profileKey = paramsContext?.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
    return resolveProfileTopSurfaceShape(
      profileKey,
      value,
      resolveProfileTopSurfaceShape(profileKey, fallback, "flat"),
    );
  }

  if (fieldKey === "dishDepth") {
    return clampDishDepth(value, paramsContext, fallback);
  }

  if (fieldKey === "topScale") {
    return clampTopScale(value, fallback, paramsContext);
  }

  if (fieldKey === "topThickness") {
    return clampMinimum(value, fallback, TOP_THICKNESS_MIN);
  }

  if (fieldKey === "topCornerRadius" || TOP_CORNER_RADIUS_FIELD_KEYS.includes(fieldKey)) {
    return clampTopCornerRadius(value, paramsContext, fallback);
  }

  if (fieldKey === "keycapShoulderRadius") {
    return clampKeycapShoulderRadius(value, paramsContext, fallback);
  }

  if (fieldKey === "keycapEdgeRadius") {
    return clampKeycapEdgeRadius(value, paramsContext, fallback);
  }

  if (findLegendParamPrefix(fieldKey, LEGEND_FIELD_SUFFIXES.outlineDelta)) {
    return clampLegendOutlineDelta(value, fallback);
  }

  if (fieldKey === "typewriterCornerRadius") {
    return clampTypewriterCornerRadius(value, fallback, paramsContext);
  }

  if (fieldKey === "rimWidth") {
    return clampTypewriterRimWidth(value, paramsContext, fallback);
  }

  if (fieldKey === "typewriterMountHeight") {
    return clampTypewriterMountHeight(value, paramsContext, fallback);
  }

  if (fieldKey === "jisEnterNotchWidth") {
    return clampJisEnterNotchWidth(value, paramsContext, fallback);
  }

  if (fieldKey === "jisEnterNotchDepth") {
    return clampJisEnterNotchDepth(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatTopWidth") {
    return clampTopHatTopWidth(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatInset") {
    return clampTopHatInset(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatTopDepth") {
    return clampTopHatTopDepth(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatBottomWidth") {
    return clampTopHatBottomWidth(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatBottomDepth") {
    return clampTopHatBottomDepth(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatSurfaceShape") {
    return resolveTopSurfaceShape(value, resolveTopSurfaceShape(fallback, "flat"));
  }

  if (fieldKey === "topHatDishDepth") {
    return clampTopHatDishDepth(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatTopRadius" || TOP_HAT_TOP_RADIUS_FIELD_KEYS.includes(fieldKey)) {
    return clampTopHatTopRadius(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatBottomRadius" || TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS.includes(fieldKey)) {
    return clampTopHatBottomRadius(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatHeight") {
    return clampTopHatHeight(value, paramsContext, fallback);
  }

  if (fieldKey === "topHatShoulderAngle") {
    return clampTopHatShoulderAngle(value, fallback);
  }

  if (fieldKey === "topHatShoulderRadius") {
    return clampTopHatShoulderRadius(value, paramsContext, fallback);
  }

  if (
    fieldKey === "rimHeightUp"
    || fieldKey === "rimHeightDown"
    || fieldKey === "homingBarChamfer"
    || fieldKey === "stemCrossChamfer"
  ) {
    return clampNonNegativeNumber(value, fallback);
  }

  if (fieldKey === "keyWidth" || fieldKey === "keyDepth") {
    return clampPositiveDimension(value, fallback);
  }

  if (COLOR_FIELD_KEYS.has(fieldKey)) {
    return normalizeHexColor(value) ?? fallback;
  }

  if (typeof fallback === "boolean") {
    return typeof value === "boolean" ? value : fallback;
  }

  if (typeof fallback === "number") {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
  }

  if (typeof fallback === "string") {
    return typeof value === "string" ? value : fallback;
  }

  return value ?? fallback;
}

export function createExportableKeycapParams(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const paramsContext = {
    ...defaults,
    ...params,
    shapeProfile: profileKey,
  };
  const sanitizedContext = { ...paramsContext };
  const exportableParams = {};

  for (const key of listEditableParamKeys(profileKey)) {
    exportableParams[key] = sanitizeEditorParamValue(key, sanitizedContext[key], defaults[key], sanitizedContext);
    sanitizedContext[key] = exportableParams[key];
  }

  return exportableParams;
}

export function createEditorDataPayloadFromParams(params, savedAt = new Date().toISOString()) {
  const sanitizedParams = createExportableKeycapParams(params);
  return {
    kind: EDITOR_DATA_KIND,
    schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
    profileSchemaVersion: keycapEditorProfiles.schemaVersion ?? 1,
    savedAt,
    selectors: pickEditorSelectors(sanitizedParams),
    params: sanitizedParams,
  };
}

export function createEditorDataPayload(params) {
  return createEditorDataPayloadFromParams(params);
}

export function mergeEditorDataPayloadParams(payload, params) {
  const nextPayload = createEditorDataPayload(params);
  const existingPayload = getPlainObject(payload) ? cloneJsonValue(payload) : null;
  if (!existingPayload) {
    return nextPayload;
  }

  const previousProfileKey = resolveEditorDataPayloadShapeProfile(existingPayload);
  const nextProfileKey = nextPayload.params?.shapeProfile;
  if (previousProfileKey && nextProfileKey && previousProfileKey !== nextProfileKey) {
    return nextPayload;
  }

  const existingParams = getPlainObject(existingPayload.params) ?? {};
  return {
    ...existingPayload,
    ...nextPayload,
    params: {
      ...existingParams,
      ...nextPayload.params,
    },
  };
}

function resolveEditorDataPayloadShapeProfile(payload) {
  try {
    return parseEditorDataPayloadResult(payload).params.shapeProfile;
  } catch {
    const selectors = getPlainObject(payload?.selectors) ?? {};
    const params = getPlainObject(payload?.params) ?? {};
    const rawProfileKey = selectors.shapeProfile ?? params.shapeProfile ?? payload?.shapeProfile;
    return isRecognizedShapeProfileKey(rawProfileKey) ? rawProfileKey : null;
  }
}

export function deleteEditorDataPayloadPath(payload, path) {
  const nextPayload = getPlainObject(payload) ? cloneJsonValue(payload) : {};
  const pathParts = String(path ?? "")
    .split(".")
    .filter(Boolean);

  if (pathParts.length === 0) {
    return {
      payload: nextPayload,
      deleted: false,
    };
  }

  const fieldName = pathParts.pop();
  let parent = nextPayload;
  for (const pathPart of pathParts) {
    parent = getPlainObject(parent?.[pathPart]);
    if (!parent) {
      return {
        payload: nextPayload,
        deleted: false,
      };
    }
  }

  if (!Object.prototype.hasOwnProperty.call(parent, fieldName)) {
    return {
      payload: nextPayload,
      deleted: false,
    };
  }

  delete parent[fieldName];
  return {
    payload: nextPayload,
    deleted: true,
  };
}

export function createShapeProfileDefaultPayload(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  return createEditorDataPayloadFromParams(createDefaultKeycapParams(profileKey), null);
}

function isCurrentOrLegacyEditorDataKind(kind) {
  return kind === EDITOR_DATA_KIND || LEGACY_EDITOR_DATA_KINDS.has(kind);
}

function isCompatiblePatchKind(kind) {
  return kind === EDITOR_DATA_COMPAT_KIND;
}

function getCompatibleTopLevelParams(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !RESERVED_COMPAT_PAYLOAD_KEYS.has(key) && KNOWN_EDITOR_PARAM_KEY_SET.has(key)),
  );
}

function getCompatibleTopLevelParamCandidates(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !RESERVED_COMPAT_PAYLOAD_KEYS.has(key)),
  );
}

function hasKnownKeys(object, allowedKeys) {
  return Object.keys(object).some((key) => allowedKeys.has(key));
}

function hasRecognizedCompatibleInput(payload) {
  const params = getPlainObject(payload.params) ?? {};
  const selectors = getPlainObject(payload.selectors) ?? {};
  const topLevelParams = getCompatibleTopLevelParams(payload);

  return hasKnownKeys(params, KNOWN_EDITOR_PARAM_KEY_SET)
    || hasKnownKeys(selectors, new Set(EDITOR_SELECTOR_KEYS))
    || hasKnownKeys(topLevelParams, KNOWN_EDITOR_PARAM_KEY_SET);
}

function parseFullEditorDataPayload(payload) {
  if (payload.schemaVersion !== EDITOR_DATA_SCHEMA_VERSION) {
    throw new Error(`Unsupported editor-data schemaVersion: ${payload.schemaVersion}`);
  }

  const params = getPlainObject(payload.params);
  if (!params) {
    throw new Error("The editor-data JSON is missing params.");
  }

  const selectors = getPlainObject(payload.selectors) ?? {};
  const rawProfileKey = selectors.shapeProfile ?? params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  if (!isRecognizedShapeProfileKey(rawProfileKey)) {
    throw new Error(`Unsupported shape base: ${rawProfileKey}`);
  }

  const defaults = createDefaultKeycapParams(rawProfileKey);
  const legacyTopSurfaceShape = inferLegacyTopSurfaceShape(params);
  return {
    ...pickEditorSelectors(defaults),
    ...selectors,
    ...params,
    ...inferMissingTopHatColor(params),
    ...(legacyTopSurfaceShape == null ? {} : { topSurfaceShape: legacyTopSurfaceShape }),
    shapeProfile: rawProfileKey,
  };
}

function parseCompatibleEditorDataPayload(payload) {
  if (payload.kind != null && !isCompatiblePatchKind(payload.kind)) {
    throw new Error("This does not look like a KeycapMaker editor-data JSON / compatible input JSON.");
  }

  if (isCompatiblePatchKind(payload.kind) && payload.schemaVersion != null && payload.schemaVersion !== EDITOR_DATA_COMPAT_SCHEMA_VERSION) {
    throw new Error(`Unsupported compatible-input schemaVersion: ${payload.schemaVersion}`);
  }

  if (!hasRecognizedCompatibleInput(payload)) {
    throw new Error("The compatible-input JSON is missing editor parameters.");
  }

  const selectors = getPlainObject(payload.selectors) ?? {};
  const nestedParams = getPlainObject(payload.params) ?? {};
  const topLevelParams = getCompatibleTopLevelParams(payload);
  const mergedInputParams = {
    ...nestedParams,
    ...topLevelParams,
  };
  const rawProfileKey = selectors.shapeProfile ?? mergedInputParams.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  if (!isRecognizedShapeProfileKey(rawProfileKey)) {
    throw new Error(`Unsupported shape base: ${rawProfileKey}`);
  }

  const defaults = createDefaultKeycapParams(rawProfileKey);
  const legacyTopSurfaceShape = inferLegacyTopSurfaceShape(mergedInputParams);
  return {
    ...pickEditorSelectors(defaults),
    ...selectors,
    ...mergedInputParams,
    ...inferMissingTopHatColor(mergedInputParams),
    ...(legacyTopSurfaceShape == null ? {} : { topSurfaceShape: legacyTopSurfaceShape }),
    shapeProfile: rawProfileKey,
  };
}

function collectEditorDataBindingReport(payload, profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const bindableKeys = new Set(listEditableParamKeys(profileKey));
  const unboundParamMap = new Map();
  const addParams = (params, source) => {
    for (const [key, value] of Object.entries(params)) {
      if (bindableKeys.has(key)) {
        continue;
      }

      const path = source === "params" ? `params.${key}` : key;
      if (!unboundParamMap.has(path)) {
        unboundParamMap.set(path, {
          key,
          path,
          source,
          value,
        });
      }
    }
  };

  addParams(getPlainObject(payload.params) ?? {}, "params");
  addParams(getCompatibleTopLevelParamCandidates(payload), "top-level");

  return {
    profileKey,
    unboundParams: Array.from(unboundParamMap.values()),
  };
}

function parseEditorDataPayloadResult(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The editor-data JSON is malformed.");
  }

  if (payload.kind != null && !isCurrentOrLegacyEditorDataKind(payload.kind) && !isCompatiblePatchKind(payload.kind)) {
    throw new Error("This does not look like a KeycapMaker editor-data JSON / compatible input JSON.");
  }

  const mergedRawParams = isCurrentOrLegacyEditorDataKind(payload.kind)
    ? parseFullEditorDataPayload(payload)
    : parseCompatibleEditorDataPayload(payload);
  const rawProfileKey = mergedRawParams.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(rawProfileKey);
  const paramsContext = {
    ...defaults,
    ...mergedRawParams,
    shapeProfile: rawProfileKey,
  };
  const sanitizedContext = { ...paramsContext };
  const nextParams = {};

  for (const key of listEditableParamKeys(rawProfileKey)) {
    nextParams[key] = sanitizeEditorParamValue(key, sanitizedContext[key], defaults[key], sanitizedContext);
    sanitizedContext[key] = nextParams[key];
  }

  return {
    params: syncDerivedKeycapParams(nextParams),
    bindingReport: collectEditorDataBindingReport(payload, rawProfileKey),
  };
}

export function parseEditorDataPayloadWithReport(payload) {
  return parseEditorDataPayloadResult(payload);
}

export function parseEditorDataPayload(payload) {
  return parseEditorDataPayloadResult(payload).params;
}

export function createInitialKeycapParams(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  return parseEditorDataPayload(createShapeProfileDefaultPayload(profileKey));
}
