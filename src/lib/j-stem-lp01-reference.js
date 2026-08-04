import { parseOff } from "./off-parser.js";

export const J_STEM_LP01_REFERENCE_OFF_PATH = "assets/j-stem-lp01/j-stem-lp01-reference.off";
export const DEFAULT_J_STEM_LP01_PREVIEW_COLOR = "clear";
export const J_STEM_LP01_PREVIEW_COLOR_VALUES = Object.freeze(["clear", "white", "orange"]);
export const J_STEM_LP01_PREVIEW_COLOR_STYLES = Object.freeze({
  clear: Object.freeze({
    colorHex: "#d7e1ea",
    color: 0xd7e1ea,
    opacity: 0.32,
  }),
  white: Object.freeze({
    colorHex: "#f7f4ec",
    color: 0xf7f4ec,
    opacity: 1,
  }),
  orange: Object.freeze({
    colorHex: "#ff7a1a",
    color: 0xff7a1a,
    opacity: 1,
  }),
});

const TOP_THICKNESS_MIN = 0.05;
const J_STEM_LP01_NOMINAL_PLATE_THICKNESS = 0.8;
const J_STEM_LP01_RECEIVER_RECESS_TOP_CLEARANCE = 0.05;
const STEM_RECEIVER_MOUNT_Z_MIN = 0.2;
const J_STEM_LP01_PREVIEW_COLOR_VALUE_SET = new Set(J_STEM_LP01_PREVIEW_COLOR_VALUES);

function numberOr(value, fallback) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function degTan(value) {
  return Math.tan((numberOr(value, 0) * Math.PI) / 180);
}

function resolveActiveDishDepth(params = {}) {
  const dishDepth = Number(params.dishDepth ?? 0);
  if (params.topSurfaceShape === "flat" || !Number.isFinite(dishDepth)) {
    return 0;
  }

  return Math.max(dishDepth, 0);
}

export function resolveJStemLp01PreviewColor(value, fallback = DEFAULT_J_STEM_LP01_PREVIEW_COLOR) {
  const fallbackValue = J_STEM_LP01_PREVIEW_COLOR_VALUE_SET.has(fallback)
    ? fallback
    : DEFAULT_J_STEM_LP01_PREVIEW_COLOR;
  return J_STEM_LP01_PREVIEW_COLOR_VALUE_SET.has(value) ? value : fallbackValue;
}

export function getJStemLp01PreviewStyle(value) {
  return J_STEM_LP01_PREVIEW_COLOR_STYLES[resolveJStemLp01PreviewColor(value)];
}

export function getJStemLp01ReferenceInsetOffset(params = {}) {
  const topThickness = Math.max(numberOr(params.topThickness, 1.5), TOP_THICKNESS_MIN);
  const stemInsetDelta = Math.max(numberOr(params.stemInsetDelta, 0), 0);
  const recessDepthLimit = Math.max(topThickness - J_STEM_LP01_RECEIVER_RECESS_TOP_CLEARANCE, 0.02);
  const recessDepth = Math.min(
    Math.max(J_STEM_LP01_NOMINAL_PLATE_THICKNESS + stemInsetDelta, 0.05),
    recessDepthLimit,
  );

  return Math.max(recessDepth - J_STEM_LP01_NOMINAL_PLATE_THICKNESS, 0);
}

export function getJStemLp01ReferenceTransform(params = {}) {
  const topCenterHeight = Math.max(numberOr(params.topCenterHeight, 9.5), 0.1);
  const topThickness = Math.max(numberOr(params.topThickness, 1.5), TOP_THICKNESS_MIN);
  const mountZ = Math.max(
    topCenterHeight - resolveActiveDishDepth(params) - topThickness,
    STEM_RECEIVER_MOUNT_Z_MIN,
  );

  return {
    mountZ,
    insetOffset: getJStemLp01ReferenceInsetOffset(params),
    pitchSlope: degTan(params.topPitchDeg),
    rollSlope: degTan(params.topRollDeg),
    topOffsetX: numberOr(params.topOffsetX, 0),
    topOffsetY: numberOr(params.topOffsetY, 0),
  };
}

export function transformJStemLp01ReferenceMesh(mesh, params = {}) {
  const transform = getJStemLp01ReferenceTransform(params);

  return {
    vertices: mesh.vertices.map((vertex) => ({
      x: vertex.x + transform.topOffsetX,
      y: vertex.y + transform.topOffsetY,
      z: vertex.z
        + transform.insetOffset
        + vertex.x * transform.rollSlope
        + vertex.y * transform.pitchSlope
        + transform.mountZ,
    })),
    faces: mesh.faces.map((face) => [...face]),
  };
}

export async function loadJStemLp01ReferenceMesh(assetUrl, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch to load J-STEM-LP01 reference OFF is unavailable.");
  }

  const response = await fetchImpl(assetUrl);
  if (!response.ok) {
    throw new Error(`Failed to load J-STEM-LP01 reference OFF: ${assetUrl}`);
  }

  return parseOff(await response.text());
}
