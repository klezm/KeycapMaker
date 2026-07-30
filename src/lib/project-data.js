import {
  DEFAULT_EXPORT_BASE_NAME,
  createEditorDataPayload,
  parseEditorDataPayload,
  sanitizeExportBaseName,
} from "./editor-data.js";

export const PROJECT_DATA_KIND = "keycap-maker/project";
export const PROJECT_DATA_SCHEMA_VERSION = 1;
export const PROJECT_MANIFEST_FILENAME = "KeycapMaker.json";
export const PROJECT_KEYCAPS_DIRNAME = "keycaps";
export const PROJECT_THREE_MF_DIRNAME = "3mf";
export const DEFAULT_PROJECT_NAME = "Keycap Project";

const PROJECT_IMAGE_EXTENSION_BY_MIME = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
});
const PROJECT_ASSET_MIME_BY_EXTENSION = Object.freeze({
  "3mf": "model/3mf",
  json: "application/json",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
});

function getPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function createFallbackProjectKeycapId() {
  return `keycap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createProjectKeycapId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `keycap-${globalThis.crypto.randomUUID()}`;
  }

  return createFallbackProjectKeycapId();
}

function normalizeProjectKeycapId(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || createProjectKeycapId();
}

export function normalizeProjectName(value, fallback = DEFAULT_PROJECT_NAME) {
  return sanitizeExportBaseName(value, fallback || DEFAULT_PROJECT_NAME);
}

export function normalizeProjectAssetPath(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "");

  if (!normalized || normalized.split("/").some((segment) => segment === "..")) {
    return fallback;
  }

  return normalized;
}

export function isProjectArchiveFileName(value) {
  return /\.(zip|zlp)$/i.test(String(value ?? "").trim());
}

export function findProjectManifestPath(paths) {
  const normalizedPaths = Array.from(paths ?? [])
    .map((path) => normalizeProjectAssetPath(path))
    .filter((path) => path && !path.startsWith("__MACOSX/"));

  return normalizedPaths.find((path) => path === PROJECT_MANIFEST_FILENAME)
    ?? normalizedPaths.find((path) => path.endsWith(`/${PROJECT_MANIFEST_FILENAME}`))
    ?? "";
}

export function getProjectAssetMimeType(path) {
  const extension = String(path ?? "")
    .split(".")
    .pop()
    ?.toLowerCase();

  return PROJECT_ASSET_MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

function createProjectKeycapFileBaseName(name, id) {
  const baseName = sanitizeExportBaseName(name, DEFAULT_EXPORT_BASE_NAME);
  const idSuffix = String(id ?? "")
    .replace(/^keycap-/, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 8);

  return idSuffix
    ? sanitizeExportBaseName(`${baseName}-${idSuffix}`, baseName)
    : baseName;
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

export function normalizeProjectKeycapDisplayOrder(value, fallback = 0) {
  const displayOrder = Number(value);
  return Number.isFinite(displayOrder) && displayOrder >= 0
    ? displayOrder
    : fallback;
}

function sortProjectKeycapsByDisplayOrder(keycaps = []) {
  return Array.from(keycaps)
    .map((entry, index) => ({
      entry,
      index,
      displayOrder: normalizeProjectKeycapDisplayOrder(entry?.displayOrder, index),
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.index - right.index)
    .map(({ entry, displayOrder }) => ({
      ...entry,
      displayOrder,
    }));
}

export function assignProjectKeycapDisplayOrder(keycaps = []) {
  return Array.from(keycaps).map((entry, index) => ({
    ...entry,
    displayOrder: index,
  }));
}

function normalizeNumberArray(value, length) {
  if (!Array.isArray(value) || value.length !== length || !value.every(isFiniteNumber)) {
    return null;
  }

  return value.map((item) => Number(item));
}

export function normalizeProjectPreviewViewState(value) {
  const viewState = getPlainObject(value);
  if (!viewState || !isFiniteNumber(viewState.distanceScale) || viewState.distanceScale <= 0) {
    return null;
  }

  const direction = normalizeNumberArray(viewState.direction, 3);
  if (!direction) {
    return null;
  }

  return {
    direction,
    distanceScale: Number(viewState.distanceScale),
    targetScale: normalizeNumberArray(viewState.targetScale, 3) ?? [0, 0, 0],
    viewOffsetRatio: normalizeNumberArray(viewState.viewOffsetRatio, 2) ?? [0, 0],
  };
}

export function getProjectPreviewImageExtension(dataUrl) {
  const match = /^data:([^;,]+)/i.exec(String(dataUrl ?? ""));
  const mimeType = match?.[1]?.toLowerCase();
  return PROJECT_IMAGE_EXTENSION_BY_MIME[mimeType] ?? "png";
}

export function createProjectPreviewPlaceholderDataUrl(params = {}) {
  const name = sanitizeExportBaseName(params.name, DEFAULT_EXPORT_BASE_NAME);
  const legend = String(params.legendText ?? "").trim().slice(0, 6);
  const bodyColor = /^#[0-9a-f]{6}$/i.test(params.bodyColor) ? params.bodyColor : "#f8f9fa";
  const rimColor = /^#[0-9a-f]{6}$/i.test(params.rimColor) ? params.rimColor : "#d8ccb8";
  const legendColor = /^#[0-9a-f]{6}$/i.test(params.legendColor) ? params.legendColor : "#212529";
  const label = legend || name.slice(0, 10);
  const svg = [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 220\">",
    "<rect width=\"320\" height=\"220\" rx=\"24\" fill=\"#fcfaf6\"/>",
    `<path d="M76 72h168l24 82c2 8-4 16-13 16H65c-9 0-15-8-13-16z" fill="${escapeXml(bodyColor)}" stroke="${escapeXml(rimColor)}" stroke-width="10" stroke-linejoin="round"/>`,
    `<text x="160" y="127" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(legendColor)}" font-family="Noto Sans JP, Noto Sans, sans-serif" font-size="42" font-weight="800">${escapeXml(label)}</text>`,
    `<text x="160" y="196" text-anchor="middle" fill="#7c6a58" font-family="Noto Sans JP, Noto Sans, sans-serif" font-size="18" font-weight="700">${escapeXml(name)}</text>`,
    "</svg>",
  ].join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createProjectKeycapEntry(params = {}, options = {}) {
  const manifestEntry = getPlainObject(options.manifestEntry) ?? {};
  const id = normalizeProjectKeycapId(options.id ?? manifestEntry.id);
  const editorDataPayload = getPlainObject(options.editorDataPayload)
    ? options.editorDataPayload
    : createEditorDataPayload(params);
  const keycapParams = parseEditorDataPayload(editorDataPayload);
  const name = sanitizeExportBaseName(
    options.name ?? manifestEntry.name ?? keycapParams.name,
    DEFAULT_EXPORT_BASE_NAME,
  );
  const fileBaseName = createProjectKeycapFileBaseName(name, id);
  const previewImageDataUrl = options.previewImageDataUrl || createProjectPreviewPlaceholderDataUrl(keycapParams);
  const previewExtension = getProjectPreviewImageExtension(previewImageDataUrl);
  const previewViewState = normalizeProjectPreviewViewState(options.previewViewState ?? manifestEntry.previewViewState);
  const jsonPath = normalizeProjectAssetPath(
    options.jsonPath ?? manifestEntry.jsonPath,
    `${PROJECT_KEYCAPS_DIRNAME}/${fileBaseName}.json`,
  );
  const previewPath = normalizeProjectAssetPath(
    options.previewPath ?? manifestEntry.previewPath,
    `${PROJECT_KEYCAPS_DIRNAME}/${fileBaseName}.${previewExtension}`,
  );
  const threeMfPath = normalizeProjectAssetPath(
    options.threeMfPath ?? manifestEntry.threeMfPath,
    `${PROJECT_THREE_MF_DIRNAME}/${fileBaseName}.3mf`,
  );
  const displayOrder = normalizeProjectKeycapDisplayOrder(
    options.displayOrder ?? manifestEntry.displayOrder,
    0,
  );

  return {
    id,
    name,
    jsonPath,
    previewPath,
    threeMfPath,
    displayOrder,
    params: keycapParams,
    editorDataPayload,
    previewImageDataUrl,
    previewViewState,
  };
}

export function createProjectKeycapEntriesForSave(keycaps = []) {
  return assignProjectKeycapDisplayOrder(Array.isArray(keycaps) ? keycaps : [])
    .map((entry) => createProjectKeycapEntry(entry.params, {
      id: entry.id,
      name: entry.name,
      displayOrder: entry.displayOrder,
      editorDataPayload: entry.editorDataPayload,
      previewImageDataUrl: entry.previewImageDataUrl,
      previewViewState: entry.previewViewState,
    }));
}

export function createEmptyProjectState(options = {}) {
  const keycaps = assignProjectKeycapDisplayOrder(
    sortProjectKeycapsByDisplayOrder(Array.isArray(options.keycaps) ? options.keycaps : []),
  );
  const activeKeycapId = keycaps.some((entry) => entry.id === options.activeKeycapId)
    ? options.activeKeycapId
    : "";

  return {
    name: normalizeProjectName(options.name, DEFAULT_PROJECT_NAME),
    keycaps,
    activeKeycapId,
    directoryHandle: options.directoryHandle ?? null,
    isDirty: Boolean(options.isDirty),
  };
}

export function createProjectStateWithActiveKeycap(options = {}) {
  const sourceKeycaps = Array.isArray(options.keycaps) ? options.keycaps : [];
  const keycaps = sourceKeycaps.length > 0
    ? sourceKeycaps
    : [createProjectKeycapEntry(options.fallbackKeycapParams, options.fallbackKeycapOptions)];
  const project = createEmptyProjectState({
    ...options,
    keycaps,
  });
  project.activeKeycapId ||= project.keycaps[0].id;
  return project;
}

export function createProjectManifest(project = {}, savedAt = new Date().toISOString()) {
  const keycaps = assignProjectKeycapDisplayOrder(Array.isArray(project.keycaps) ? project.keycaps : []);
  const activeKeycapId = keycaps.some((entry) => entry.id === project.activeKeycapId)
    ? project.activeKeycapId
    : "";

  return {
    kind: PROJECT_DATA_KIND,
    schemaVersion: PROJECT_DATA_SCHEMA_VERSION,
    name: normalizeProjectName(project.name, DEFAULT_PROJECT_NAME),
    savedAt,
    activeKeycapId,
    keycaps: keycaps.map((entry) => ({
      id: normalizeProjectKeycapId(entry.id),
      name: sanitizeExportBaseName(entry.name ?? entry.params?.name, DEFAULT_EXPORT_BASE_NAME),
      jsonPath: normalizeProjectAssetPath(entry.jsonPath),
      previewPath: normalizeProjectAssetPath(entry.previewPath),
      threeMfPath: normalizeProjectAssetPath(entry.threeMfPath),
      displayOrder: normalizeProjectKeycapDisplayOrder(entry.displayOrder),
      ...(normalizeProjectPreviewViewState(entry.previewViewState)
        ? { previewViewState: normalizeProjectPreviewViewState(entry.previewViewState) }
        : {}),
    })),
  };
}

export function isProjectManifestPayload(payload) {
  return getPlainObject(payload)?.kind === PROJECT_DATA_KIND;
}

export function parseProjectManifest(payload, fallbackName = DEFAULT_PROJECT_NAME) {
  const manifest = getPlainObject(payload);
  if (!manifest) {
    throw new Error("Invalid Project JSON format.");
  }

  if (manifest.kind !== PROJECT_DATA_KIND) {
    throw new Error("Not a KeycapMaker Project JSON.");
  }

  if (manifest.schemaVersion !== PROJECT_DATA_SCHEMA_VERSION) {
    throw new Error(`Unsupported Project schemaVersion: ${manifest.schemaVersion}`);
  }

  const keycaps = assignProjectKeycapDisplayOrder(sortProjectKeycapsByDisplayOrder(
    Array.isArray(manifest.keycaps)
      ? manifest.keycaps.map((entry, index) => {
          const normalizedEntry = getPlainObject(entry);
          if (!normalizedEntry) {
            throw new Error(`Project keycap definition ${index + 1} is invalid.`);
          }

          const jsonPath = normalizeProjectAssetPath(normalizedEntry.jsonPath);
          if (!jsonPath) {
            throw new Error(`Project keycap definition ${index + 1} is missing jsonPath.`);
          }

          return {
            id: normalizeProjectKeycapId(normalizedEntry.id),
            name: sanitizeExportBaseName(normalizedEntry.name, DEFAULT_EXPORT_BASE_NAME),
            jsonPath,
            previewPath: normalizeProjectAssetPath(normalizedEntry.previewPath),
            threeMfPath: normalizeProjectAssetPath(normalizedEntry.threeMfPath),
            displayOrder: normalizeProjectKeycapDisplayOrder(normalizedEntry.displayOrder, index),
            previewViewState: normalizeProjectPreviewViewState(normalizedEntry.previewViewState),
          };
        })
      : [],
  ));
  const activeKeycapId = keycaps.some((entry) => entry.id === manifest.activeKeycapId)
    ? manifest.activeKeycapId
    : "";

  return {
    kind: PROJECT_DATA_KIND,
    schemaVersion: PROJECT_DATA_SCHEMA_VERSION,
    name: normalizeProjectName(manifest.name, fallbackName),
    savedAt: typeof manifest.savedAt === "string" ? manifest.savedAt : "",
    activeKeycapId,
    keycaps,
  };
}
