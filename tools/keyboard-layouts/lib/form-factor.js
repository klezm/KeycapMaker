export const FORM_FACTORS = Object.freeze([
  Object.freeze({
    id: "ansi",
    label: "ANSI",
    keyCount: 104,
    boardFile: "ansi-104.json",
    description: "US 104-key board with a wide horizontal Enter and a full-width left Shift",
  }),
  Object.freeze({
    id: "iso",
    label: "ISO",
    keyCount: 105,
    boardFile: "iso-105.json",
    description: "European 105-key board with an L-shaped Enter and an extra key left of Z",
  }),
  Object.freeze({
    id: "jis",
    label: "JIS",
    keyCount: 109,
    boardFile: "jis-109.json",
    description: "Japanese 109-key board with an L-shaped Enter, a yen key and kana modifier keys",
  }),
  Object.freeze({
    id: "abnt",
    label: "ABNT-2",
    keyCount: 106,
    boardFile: "abnt-106.json",
    description: "Brazilian board with an L-shaped Enter, an extra key right of the period and a numpad comma",
  }),
]);

export const FORM_FACTOR_IDS = Object.freeze(new Set(FORM_FACTORS.map((formFactor) => formFactor.id)));

const JIS_MARKER_KEYCODES = Object.freeze(["HKTG", "MUHE", "HENK"]);
const YEN_KEYCODE = "AE13";
const ABNT_KEYCODE = "AB11";
const ISO_KEYCODE = "LSGT";

const JIS_COUNTRIES = Object.freeze(new Set(["JP"]));
const ABNT_COUNTRIES = Object.freeze(new Set(["BR"]));

const ANSI_COUNTRIES = Object.freeze(
  new Set([
    "US", "CA", "AU", "NZ", "CN", "TW", "HK", "MO", "SG", "KR", "KP", "TH", "VN",
    "PH", "ID", "MY", "BN", "IN", "LK", "BD", "PK", "NP", "BT", "MM", "KH", "LA",
    "MN", "MV",
  ]),
);

export const FORM_FACTOR_OVERRIDES = Object.freeze({});

export function deriveFormFactor(keycodes, countries) {
  const primaryCountry = (countries ?? [])[0] ?? null;

  if (keycodes.has(YEN_KEYCODE) || JIS_MARKER_KEYCODES.some((keycode) => keycodes.has(keycode))) {
    return { formFactor: "jis", source: "symbols" };
  }
  if (keycodes.has(ABNT_KEYCODE)) {
    return { formFactor: "abnt", source: "symbols" };
  }
  if (primaryCountry !== null) {
    if (JIS_COUNTRIES.has(primaryCountry)) {
      return { formFactor: "jis", source: "region" };
    }
    if (ABNT_COUNTRIES.has(primaryCountry)) {
      return { formFactor: "abnt", source: "region" };
    }
    if (ANSI_COUNTRIES.has(primaryCountry)) {
      return { formFactor: "ansi", source: "region" };
    }
  }
  if (keycodes.has(ISO_KEYCODE)) {
    return { formFactor: "iso", source: "symbols" };
  }
  if (primaryCountry !== null) {
    return { formFactor: "iso", source: "region" };
  }
  return { formFactor: "ansi", source: "default" };
}

export function normalizeFormFactorId(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return FORM_FACTOR_IDS.has(normalized) ? normalized : null;
}

export function resolveFormFactor(layoutName, variantName, keycodes, countries) {
  const overrideKey = variantName ? `${layoutName}(${variantName})` : layoutName;
  const override =
    FORM_FACTOR_OVERRIDES[overrideKey] ?? (variantName ? FORM_FACTOR_OVERRIDES[layoutName] : undefined);

  if (override !== undefined) {
    return { formFactor: override.formFactor, source: "override", reason: override.reason };
  }

  const derived = deriveFormFactor(keycodes, countries);
  return { formFactor: derived.formFactor, source: derived.source, reason: null };
}

export function resolveFormFactorDefinition(id) {
  return FORM_FACTORS.find((formFactor) => formFactor.id === id) ?? null;
}
