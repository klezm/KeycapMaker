export const DEFAULT_KEYCAP_LEGEND_FONT_KEY = "mplus1-variable";
export const USER_KEYCAP_LEGEND_FONT_KEY_PREFIX = "user-font:";

const VARIABLE_WEIGHT_STYLE_DEFINITIONS = Object.freeze([
  { key: "thin", label: "Thin", cssWeight: 100 },
  { key: "extra-light", label: "ExtraLight", cssWeight: 200 },
  { key: "light", label: "Light", cssWeight: 300 },
  { key: "regular", label: "Regular", cssWeight: 400 },
  { key: "medium", label: "Medium", cssWeight: 500 },
  { key: "semi-bold", label: "SemiBold", cssWeight: 600 },
  { key: "bold", label: "Bold", cssWeight: 700 },
  { key: "extra-bold", label: "ExtraBold", cssWeight: 800 },
  { key: "black", label: "Black", cssWeight: 900 },
]);

const GOOGLE_FONTS_FAVICON_URL = "https://www.gstatic.com/images/icons/material/apps/fonts/1x/catalog/v5/favicon.svg";
const MODI_FAVICON_URL = "https://modi.jpn.org/favicon.ico";

function createGoogleFontsLandingPageMeta(pageName) {
  return {
    landingPageName: `${pageName} - Google Fonts`,
    landingPageIconUrl: GOOGLE_FONTS_FAVICON_URL,
  };
}

function createVariableWeightStyleOptions(fontName) {
  return Object.freeze(VARIABLE_WEIGHT_STYLE_DEFINITIONS.map((style) => ({
    ...style,
    fontQuery: `${fontName}:style=${style.label}`,
  })));
}

const MPLUS1_VARIABLE_STYLE_OPTIONS = createVariableWeightStyleOptions("M PLUS 1");
const NOTO_SANS_VARIABLE_STYLE_OPTIONS = createVariableWeightStyleOptions("Noto Sans");
const NOTO_SANS_JP_VARIABLE_STYLE_OPTIONS = createVariableWeightStyleOptions("Noto Sans JP");

export const KEYCAP_LEGEND_FONTS = Object.freeze([
  {
    key: "mplus1-variable",
    label: "M PLUS 1 Variable",
    searchLabel: "M PLUS 1 Variable",
    fontKind: "variable",
    fontName: "M PLUS 1",
    fontQuery: "M PLUS 1",
    nativeStyleOptions: MPLUS1_VARIABLE_STYLE_OPTIONS,
    defaultStyleKey: "regular",
    assetPath: "fonts/MPLUS1-Variable.ttf",
    runtimePath: "/fonts/MPLUS1-Variable.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/M%2BPLUS%2B1",
    ...createGoogleFontsLandingPageMeta("M PLUS 1"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend M PLUS 1 Variable",
  },
  {
    key: "mplus1p-regular",
    label: "M PLUS 1p Regular",
    searchLabel: "M PLUS 1p Regular",
    fontKind: "static",
    fontName: "M PLUS 1p",
    fontQuery: "M PLUS 1p",
    assetPath: "fonts/MPLUS1p-Regular.ttf",
    runtimePath: "/fonts/MPLUS1p-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/M%2BPLUS%2B1p",
    ...createGoogleFontsLandingPageMeta("M PLUS 1p"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend M PLUS 1p Regular",
    cssWeight: 400,
  },
  {
    key: "noto-sans-variable",
    label: "Noto Sans Variable",
    searchLabel: "Noto Sans Variable Latin Greek Cyrillic Devanagari standard sans",
    fontKind: "variable",
    fontName: "Noto Sans",
    fontQuery: "Noto Sans",
    nativeStyleOptions: NOTO_SANS_VARIABLE_STYLE_OPTIONS,
    defaultStyleKey: "regular",
    assetPath: "fonts/NotoSans-Variable.ttf",
    runtimePath: "/fonts/NotoSans-Variable.ttf",
    landingPageUrl: "https://fonts.google.com/noto/specimen/Noto%2BSans",
    ...createGoogleFontsLandingPageMeta("Noto Sans"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Noto Sans Variable",
  },
  {
    key: "noto-sans-jp-variable",
    label: "Noto Sans JP Variable",
    searchLabel: "Noto Sans JP Variable Japanese gothic standard sans",
    fontKind: "variable",
    fontName: "Noto Sans JP",
    fontQuery: "Noto Sans JP",
    nativeStyleOptions: NOTO_SANS_JP_VARIABLE_STYLE_OPTIONS,
    defaultStyleKey: "regular",
    assetPath: "fonts/NotoSansJP-Variable.ttf",
    runtimePath: "/fonts/NotoSansJP-Variable.ttf",
    landingPageUrl: "https://fonts.google.com/noto/specimen/Noto%2BSans%2BJP",
    ...createGoogleFontsLandingPageMeta("Noto Sans JP"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Noto Sans JP Variable",
  },
  {
    key: "mplusrounded1c-regular",
    label: "M PLUS Rounded 1c Regular",
    searchLabel: "M PLUS Rounded 1c Regular",
    fontKind: "static",
    fontName: "M PLUS Rounded 1c",
    fontQuery: "M PLUS Rounded 1c",
    assetPath: "fonts/MPLUSRounded1c-Regular.ttf",
    runtimePath: "/fonts/MPLUSRounded1c-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/M%2BPLUS%2BRounded%2B1c",
    ...createGoogleFontsLandingPageMeta("M PLUS Rounded 1c"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend M PLUS Rounded 1c Regular",
    cssWeight: 400,
  },
  {
    key: "dotgothic16-regular",
    label: "DotGothic16 Regular",
    searchLabel: "DotGothic16 Regular",
    fontKind: "static",
    fontName: "DotGothic16",
    fontQuery: "DotGothic16",
    assetPath: "fonts/DotGothic16-Regular.ttf",
    runtimePath: "/fonts/DotGothic16-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/DotGothic16",
    ...createGoogleFontsLandingPageMeta("DotGothic16"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend DotGothic16 Regular",
    cssWeight: 400,
  },
  {
    key: "kurobara-cinderella-regular",
    label: "Kurobara Cinderella",
    searchLabel: "Kurobara Cinderella kurobara-cinderella kurobara cinderella gothic rose",
    fontKind: "static",
    fontName: "kurobara-cinderella",
    fontQuery: "kurobara-cinderella",
    assetPath: "fonts/KurobaraCinderella-Regular.ttf",
    runtimePath: "/fonts/KurobaraCinderella-Regular.ttf",
    landingPageUrl: "https://modi.jpn.org/font_kurobara-cinderella.php",
    landingPageName: "Kurobara Cinderella - MODI Factory",
    landingPageIconUrl: MODI_FAVICON_URL,
    licenseLabel: "MODI / M+ FONTS derived",
    requiredAttributionLines: [
      "Font used: Kurobara Cinderella Version 1.00.20180805",
      "Copyright info: Copyright(c) 2017 M+ FONTS PROJECT/MODI",
      "License info: This font is free software. Unlimited permission is granted to use, copy, and distribute it, with or without modification, either commercially or noncommercially. THIS FONT IS PROVIDED \"AS IS\" WITHOUT WARRANTY.",
      "Derived from license: SIL Open Font License, Version 1.1",
      "Distribution page: https://modi.jpn.org/font_kurobara-cinderella.php",
    ],
    measurementFamily: "Keycap Legend Kurobara Cinderella",
    cssWeight: 400,
  },
  {
    key: "bangers-regular",
    label: "Bangers Regular",
    searchLabel: "Bangers Regular comic superhero manga",
    fontKind: "static",
    fontName: "Bangers",
    fontQuery: "Bangers",
    assetPath: "fonts/Bangers-Regular.ttf",
    runtimePath: "/fonts/Bangers-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/Bangers",
    ...createGoogleFontsLandingPageMeta("Bangers"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Bangers Regular",
    cssWeight: 400,
  },
  {
    key: "creepster-regular",
    label: "Creepster Regular",
    searchLabel: "Creepster Regular horror spooky",
    fontKind: "static",
    fontName: "Creepster",
    fontQuery: "Creepster",
    assetPath: "fonts/Creepster-Regular.ttf",
    runtimePath: "/fonts/Creepster-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/Creepster",
    ...createGoogleFontsLandingPageMeta("Creepster"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Creepster Regular",
    cssWeight: 400,
  },
  {
    key: "rye-regular",
    label: "Rye Regular",
    searchLabel: "Rye Regular western woodtype cowboy",
    fontKind: "static",
    fontName: "Rye",
    fontQuery: "Rye",
    assetPath: "fonts/Rye-Regular.ttf",
    runtimePath: "/fonts/Rye-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/Rye",
    ...createGoogleFontsLandingPageMeta("Rye"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Rye Regular",
    cssWeight: 400,
  },
  {
    key: "orbitron-regular",
    label: "Orbitron Regular",
    searchLabel: "Orbitron Regular sci-fi scifi futuristic cyberpunk",
    fontKind: "static",
    fontName: "Orbitron",
    fontQuery: "Orbitron",
    assetPath: "fonts/Orbitron-Variable.ttf",
    runtimePath: "/fonts/Orbitron-Variable.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/Orbitron",
    ...createGoogleFontsLandingPageMeta("Orbitron"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Orbitron Regular",
    cssWeight: 400,
  },
  {
    key: "grenzegotisch-regular",
    label: "Grenze Gotisch Regular",
    searchLabel: "Grenze Gotisch Regular art gothic blackletter gothic",
    fontKind: "static",
    fontName: "Grenze Gotisch",
    fontQuery: "Grenze Gotisch",
    assetPath: "fonts/GrenzeGotisch-Variable.ttf",
    runtimePath: "/fonts/GrenzeGotisch-Variable.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/Grenze%2BGotisch",
    ...createGoogleFontsLandingPageMeta("Grenze Gotisch"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend Grenze Gotisch Regular",
    cssWeight: 400,
  },
  {
    key: "medievalsharp-regular",
    label: "MedievalSharp Regular",
    searchLabel: "MedievalSharp Regular art gothic medieval stone gothic",
    fontKind: "static",
    fontName: "MedievalSharp",
    fontQuery: "MedievalSharp",
    assetPath: "fonts/MedievalSharp-Regular.ttf",
    runtimePath: "/fonts/MedievalSharp-Regular.ttf",
    landingPageUrl: "https://fonts.google.com/specimen/MedievalSharp",
    ...createGoogleFontsLandingPageMeta("MedievalSharp"),
    licenseLabel: "SIL Open Font License 1.1",
    measurementFamily: "Keycap Legend MedievalSharp Regular",
    cssWeight: 400,
  },
]);

const KEYCAP_LEGEND_FONT_MAP = new Map(KEYCAP_LEGEND_FONTS.map((font) => [font.key, font]));
const USER_KEYCAP_LEGEND_FONT_MAP = new Map();
const USER_KEYCAP_LEGEND_FONT_BYTES = new Map();

export function resolveKeycapLegendFont(fontKey = DEFAULT_KEYCAP_LEGEND_FONT_KEY) {
  const key = String(fontKey ?? DEFAULT_KEYCAP_LEGEND_FONT_KEY);
  const builtInFont = KEYCAP_LEGEND_FONT_MAP.get(key);
  if (builtInFont) {
    return builtInFont;
  }

  const userFont = USER_KEYCAP_LEGEND_FONT_MAP.get(key);
  if (userFont) {
    return userFont;
  }

  if (isUserKeycapLegendFontKey(key)) {
    return createMissingUserKeycapLegendFont(key);
  }

  return KEYCAP_LEGEND_FONT_MAP.get(DEFAULT_KEYCAP_LEGEND_FONT_KEY);
}

export function getKeycapLegendFontStyleOptions(fontKey = DEFAULT_KEYCAP_LEGEND_FONT_KEY) {
  return resolveKeycapLegendFont(fontKey).nativeStyleOptions ?? [];
}

export function isUserKeycapLegendFontKey(fontKey) {
  return String(fontKey ?? "").startsWith(USER_KEYCAP_LEGEND_FONT_KEY_PREFIX);
}

function createMissingUserKeycapLegendFont(fontKey) {
  return Object.freeze({
    key: String(fontKey),
    label: "Missing local font",
    searchLabel: "missing local font",
    fontKind: "missing",
    fontName: "",
    fontQuery: "",
    measurementFamily: "",
    cssWeight: 400,
    isUserFont: true,
    isMissing: true,
  });
}

function normalizeUserFontBytes(bytes) {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  return new Uint8Array(0);
}

function normalizeUserFontKey(key) {
  const normalizedKey = String(key ?? "");
  return isUserKeycapLegendFontKey(normalizedKey)
    ? normalizedKey
    : `${USER_KEYCAP_LEGEND_FONT_KEY_PREFIX}${normalizedKey}`;
}

export function listUserKeycapLegendFonts() {
  return Array.from(USER_KEYCAP_LEGEND_FONT_MAP.values());
}

export function listAvailableKeycapLegendFonts() {
  return [
    ...listUserKeycapLegendFonts(),
    ...KEYCAP_LEGEND_FONTS,
  ];
}

export function getUserKeycapLegendFontBytes(fontKey) {
  return USER_KEYCAP_LEGEND_FONT_BYTES.get(String(fontKey ?? "")) ?? null;
}

export function registerUserKeycapLegendFont(fontDefinition = {}) {
  const key = normalizeUserFontKey(fontDefinition.key);
  const existingFont = USER_KEYCAP_LEGEND_FONT_MAP.get(key);
  const nextBytes = normalizeUserFontBytes(fontDefinition.bytes);

  if (nextBytes.byteLength === 0 && !existingFont) {
    throw new Error("User font bytes are empty.");
  }

  if (existingFont) {
    if (
      fontDefinition.objectUrl
      && fontDefinition.objectUrl !== existingFont.objectUrl
      && typeof URL !== "undefined"
      && typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(fontDefinition.objectUrl);
    }
    return existingFont;
  }

  const label = String(fontDefinition.label || fontDefinition.fileName || "Local Font");
  const fontName = String(fontDefinition.fontName || fontDefinition.fontQuery || label);
  const runtimePath = String(fontDefinition.runtimePath || `/fonts/user/${key.slice(USER_KEYCAP_LEGEND_FONT_KEY_PREFIX.length)}.ttf`);
  const font = Object.freeze({
    key,
    label,
    searchLabel: String(fontDefinition.searchLabel || `${label} ${fontDefinition.fileName ?? ""}`),
    fontKind: "static",
    fontName,
    fontQuery: String(fontDefinition.fontQuery || fontName),
    assetPath: "",
    runtimePath,
    licenseLabel: "",
    measurementFamily: String(fontDefinition.measurementFamily || `Keycap User Font ${key.slice(USER_KEYCAP_LEGEND_FONT_KEY_PREFIX.length)}`),
    cssWeight: Number.isFinite(Number(fontDefinition.cssWeight)) ? Number(fontDefinition.cssWeight) : 400,
    isUserFont: true,
    fileName: String(fontDefinition.fileName || label),
    byteLength: Number(fontDefinition.byteLength ?? nextBytes.byteLength) || nextBytes.byteLength,
    objectUrl: fontDefinition.objectUrl || "",
    sourceKind: String(fontDefinition.sourceKind || "local"),
    sourceUrl: String(fontDefinition.sourceUrl || ""),
    sourceLabel: String(fontDefinition.sourceLabel || ""),
    provider: String(fontDefinition.provider || ""),
  });

  USER_KEYCAP_LEGEND_FONT_MAP.set(key, font);
  USER_KEYCAP_LEGEND_FONT_BYTES.set(key, nextBytes);
  return font;
}

export function removeUserKeycapLegendFont(fontKey) {
  const key = String(fontKey ?? "");
  const font = USER_KEYCAP_LEGEND_FONT_MAP.get(key);
  if (!font) {
    return false;
  }

  if (font.objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(font.objectUrl);
  }

  USER_KEYCAP_LEGEND_FONT_MAP.delete(key);
  USER_KEYCAP_LEGEND_FONT_BYTES.delete(key);
  return true;
}

export function clearUserKeycapLegendFonts() {
  for (const font of USER_KEYCAP_LEGEND_FONT_MAP.values()) {
    if (font.objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(font.objectUrl);
    }
  }

  USER_KEYCAP_LEGEND_FONT_MAP.clear();
  USER_KEYCAP_LEGEND_FONT_BYTES.clear();
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

function decodeUtf16Be(bytes) {
  let text = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    text += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }

  return text;
}

function decodeSfntNameRecord(bytes, platformId) {
  if (platformId === 0 || platformId === 3) {
    return decodeUtf16Be(bytes);
  }

  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("macintosh").decode(bytes);
    } catch {}
    try {
      return new TextDecoder("latin1").decode(bytes);
    } catch {}
  }

  return String.fromCharCode(...bytes);
}

function scoreSfntNameRecord(record) {
  let score = 0;
  if (record.platformId === 3) {
    score += 40;
  }
  if (record.platformId === 0) {
    score += 30;
  }
  if (record.languageId === 0x0409 || record.languageId === 0) {
    score += 20;
  }
  if (record.text && /^[\x20-\x7e]+$/.test(record.text)) {
    score += 5;
  }
  return score;
}

function selectSfntName(records, nameIds) {
  return records
    .filter((record) => nameIds.includes(record.nameId) && record.text)
    .sort((a, b) => scoreSfntNameRecord(b) - scoreSfntNameRecord(a))[0]?.text
    ?? "";
}

export function parseKeycapLegendFontNameMetadata(bytes) {
  const fontBytes = normalizeUserFontBytes(bytes);
  const tables = readSfntTableDirectory(fontBytes);
  const nameTable = tables?.get("name");
  if (!nameTable || !hasByteRange(nameTable.offset, nameTable.length, fontBytes.byteLength)) {
    return {};
  }

  const view = new DataView(fontBytes.buffer, fontBytes.byteOffset, fontBytes.byteLength);
  const nameTableOffset = nameTable.offset;
  if (!hasByteRange(nameTableOffset, 6, fontBytes.byteLength)) {
    return {};
  }

  const count = view.getUint16(nameTableOffset + 2);
  const stringOffset = nameTableOffset + view.getUint16(nameTableOffset + 4);
  const records = [];
  for (let index = 0; index < count; index += 1) {
    const recordOffset = nameTableOffset + 6 + (index * 12);
    if (!hasByteRange(recordOffset, 12, fontBytes.byteLength)) {
      continue;
    }

    const platformId = view.getUint16(recordOffset);
    const encodingId = view.getUint16(recordOffset + 2);
    const languageId = view.getUint16(recordOffset + 4);
    const nameId = view.getUint16(recordOffset + 6);
    const length = view.getUint16(recordOffset + 8);
    const offset = view.getUint16(recordOffset + 10);
    const textStart = stringOffset + offset;
    if (!hasByteRange(textStart, length, fontBytes.byteLength)) {
      continue;
    }

    const recordBytes = fontBytes.subarray(textStart, textStart + length);
    const text = decodeSfntNameRecord(recordBytes, platformId).replace(/\0/g, "").trim();
    records.push({
      platformId,
      encodingId,
      languageId,
      nameId,
      text,
    });
  }

  const familyName = selectSfntName(records, [16, 1]);
  const subfamilyName = selectSfntName(records, [17, 2]);
  const fullName = selectSfntName(records, [4]);
  const postScriptName = selectSfntName(records, [6]);

  return {
    familyName,
    subfamilyName,
    fullName,
    postScriptName,
  };
}
