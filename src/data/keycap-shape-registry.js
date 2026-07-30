import manifest from "./keycap-shapes/manifest.json" with { type: "json" };
import customShell from "./keycap-shapes/custom-shell.json" with { type: "json" };
import jisEnter from "./keycap-shapes/jis-enter.json" with { type: "json" };
import typewriter from "./keycap-shapes/typewriter.json" with { type: "json" };
import typewriterJisEnter from "./keycap-shapes/typewriter-jis-enter.json" with { type: "json" };

const SHAPE_PROFILES = Object.freeze([customShell, jisEnter, typewriter, typewriterJisEnter]);
const SHAPE_PROFILE_MAP = new Map(SHAPE_PROFILES.map((profile) => [profile.key, profile]));
const MANIFEST_SHAPE_KEYS = manifest.shapeKeys ?? SHAPE_PROFILES.map((profile) => profile.key);

if (new Set(MANIFEST_SHAPE_KEYS).size !== MANIFEST_SHAPE_KEYS.length) {
  throw new Error("shape manifest has duplicate keys.");
}

for (const shapeKey of MANIFEST_SHAPE_KEYS) {
  if (!SHAPE_PROFILE_MAP.has(shapeKey)) {
    throw new Error(`No JSON corresponding to shape manifest: ${shapeKey}`);
  }
}

if (SHAPE_PROFILE_MAP.size !== MANIFEST_SHAPE_KEYS.length) {
  throw new Error("shapeKeys in shape JSON and manifest do not match.");
}

const DEFAULT_SHAPE_PROFILE_KEY = manifest.defaultProfileKey ?? SHAPE_PROFILES[0]?.key ?? "custom-shell";
const EDITOR_SELECTOR_KEYS = Object.freeze(manifest.selectorKeys ?? ["shapeProfile", "legendFontKey", "stemType"]);

function cloneSerializable(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export default Object.freeze({
  schemaVersion: manifest.schemaVersion ?? 1,
  defaultProfileKey: DEFAULT_SHAPE_PROFILE_KEY,
  selectorKeys: EDITOR_SELECTOR_KEYS,
  profiles: SHAPE_PROFILES,
});

export { DEFAULT_SHAPE_PROFILE_KEY, EDITOR_SELECTOR_KEYS, SHAPE_PROFILE_MAP };

export function resolveShapeProfileConfig(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  return SHAPE_PROFILE_MAP.get(profileKey) ?? SHAPE_PROFILE_MAP.get(DEFAULT_SHAPE_PROFILE_KEY);
}

export function resolveShapeGeometryType(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const geometryType = resolveShapeProfileConfig(profileKey)?.geometryType;
  if (geometryType === "typewriter" || geometryType === "jis_enter" || geometryType === "typewriter_jis_enter") {
    return geometryType;
  }

  return "shell";
}

export function createDefaultKeycapParams(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const profile = resolveShapeProfileConfig(profileKey);
  return cloneSerializable(profile?.defaults ?? {});
}

export function getShapeProfileGeometryDefaults(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const profile = resolveShapeProfileConfig(profileKey);
  return cloneSerializable(profile?.geometryDefaults ?? {});
}

export function getShapeProfileFieldGroups(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const profile = resolveShapeProfileConfig(profileKey);
  return cloneSerializable(profile?.fieldGroups ?? []);
}

export function getShapeProfileFieldOverride(profileKey = DEFAULT_SHAPE_PROFILE_KEY, fieldKey) {
  const profile = resolveShapeProfileConfig(profileKey);
  return cloneSerializable(profile?.fieldOverrides?.[fieldKey] ?? null);
}
