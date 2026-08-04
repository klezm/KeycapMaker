import "./styles.css";
import { strToU8, unzipSync, zipSync } from "fflate";
import {
  LOCALE_OPTIONS,
  getInitialLocale,
  normalizeLocale,
  setLocalePreference,
  translate,
} from "./i18n/index.js";
import keycapEditorProfiles, {
  createDefaultKeycapParams,
  DEFAULT_SHAPE_PROFILE_KEY,
  EDITOR_SELECTOR_KEYS,
  getShapeProfileFieldGroups,
  getShapeProfileFieldOverride,
  getShapeProfileGeometryDefaults,
  resolveShapeGeometryType,
} from "./data/keycap-shape-registry.js";
import { runOpenScad } from "./lib/openscad-client.js";
import { hexColorToNumber, normalizeHexColor } from "./lib/color-utils.js";
import {
  DEFAULT_EXPORT_BASE_NAME,
  createEditorDataPayload,
  deleteEditorDataPayloadPath,
  createInitialKeycapParams,
  getDishDepthMax,
  getTopHatDishDepthMax,
  getTopSurfaceShapePreset,
  listEditableParamKeys,
  mergeEditorDataPayloadParams,
  parseEditorDataPayloadWithReport,
  resolveStemCrossMarginAfterStemTypeChange,
  resolveStemType,
  sanitizeEditorParamValue,
  sanitizeExportBaseName,
  syncDerivedKeycapParams,
} from "./lib/editor-data.js";
import { create3mfBlob } from "./lib/export-3mf.js";
import { createStepBlob } from "./lib/export-step.js";
import { resolveUserFontSource } from "./lib/font-source-resolver.js";
import {
  J_STEM_LP01_REFERENCE_OFF_PATH,
  getJStemLp01PreviewStyle,
  loadJStemLp01ReferenceMesh,
  resolveJStemLp01PreviewColor,
  transformJStemLp01ReferenceMesh,
} from "./lib/j-stem-lp01-reference.js";
import { parseOff } from "./lib/off-parser.js";
import {
  DEFAULT_PROJECT_NAME,
  PROJECT_MANIFEST_FILENAME,
  assignProjectKeycapDisplayOrder,
  createProjectStateWithActiveKeycap,
  createProjectKeycapEntriesForSave,
  createProjectKeycapEntry,
  createProjectManifest,
  createProjectPreviewPlaceholderDataUrl,
  findProjectManifestPath,
  getProjectAssetMimeType,
  getProjectPreviewImageExtension,
  isProjectArchiveFileName,
  normalizeProjectName,
  parseProjectManifest,
} from "./lib/project-data.js";
import {
  createSquareThumbnailDrawPlan,
  expandPixelBounds,
  findOpaquePixelBounds,
} from "./lib/preview-thumbnail.js";
import {
  DEFAULT_KEYCAP_LEGEND_FONT_KEY,
  buildLegendIconSvg,
  buildKeycapArgs,
  createKeycapFiles,
  getLegendIconSetMeta,
  initializeLegendIconProvidersFromCdn,
  isLegendIconFillAvailable,
  getKeycapLegendFontStyleOptions,
  listAvailableKeycapLegendFonts,
  listAvailableLegendIcons,
  listLegendIconSets,
  parseKeycapLegendFontNameMetadata,
  registerUserKeycapLegendFont,
  removeUserKeycapLegendFont,
  resolveLegendContentType,
  resolveLegendIcon,
  resolveLegendIconName,
  resolveLegendIconSet,
  resolveKeycapLegendFont,
  searchLegendIcons,
  USER_KEYCAP_LEGEND_FONT_KEY_PREFIX,
} from "./lib/keycap-scad-bundle.js";

const app = document.querySelector("#app");
const LEGEND_FONT_PICKER_SEGMENT_BUILTIN = "builtin";
const LEGEND_FONT_PICKER_SEGMENT_USER = "user";
const LEGEND_FONT_PICKER_SEGMENTS = Object.freeze([
  {
    key: LEGEND_FONT_PICKER_SEGMENT_BUILTIN,
    labelKey: "font.builtinFontsSegment",
  },
  {
    key: LEGEND_FONT_PICKER_SEGMENT_USER,
    labelKey: "font.myFontsSegment",
  },
]);
const LEGEND_FONT_SOURCE_MODE_GOOGLE = "google-fonts";
const LEGEND_FONT_SOURCE_MODE_CSS_URL = "css-url";
const LEGEND_FONT_SOURCE_MODE_FONT_FACE = "font-face";
const LEGEND_FONT_SOURCE_MODE_FONT_FILE = "font-file";
const LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT = 2;
const LEGEND_FONT_SOURCE_EDITOR_TRANSITION_MS = 180;
const LEGEND_FONT_SOURCE_EDITOR_EXIT_MS = 90;
const LEGEND_FONT_SOURCE_INPUT_PANEL_FADE_MS = 140;
const LEGEND_FONT_SOURCE_INPUT_MODES = Object.freeze([
  {
    key: LEGEND_FONT_SOURCE_MODE_GOOGLE,
    labelKey: "font.sourceModes.googleFonts",
    placeholderKey: "font.sourcePlaceholders.googleFonts",
    hintKey: "font.sourceHints.googleFonts",
    multiline: true,
  },
  {
    key: LEGEND_FONT_SOURCE_MODE_CSS_URL,
    labelKey: "font.sourceModes.cssUrl",
    placeholderKey: "font.sourcePlaceholders.cssUrl",
    hintKey: "font.sourceHints.cssUrl",
    multiline: false,
  },
  {
    key: LEGEND_FONT_SOURCE_MODE_FONT_FACE,
    labelKey: "font.sourceModes.fontFace",
    placeholderKey: "font.sourcePlaceholders.fontFace",
    hintKey: "font.sourceHints.fontFace",
    multiline: true,
  },
  {
    key: LEGEND_FONT_SOURCE_MODE_FONT_FILE,
    labelKey: "font.sourceModes.fontFile",
    placeholderKey: "font.sourcePlaceholders.fontFile",
    hintKey: "font.sourceHints.fontFile",
    multiline: false,
  },
]);
const keycapBodyPreviewPath = "/outputs/keycap-body-preview.off";
const keycapTopHatPreviewPath = "/outputs/keycap-top-hat-preview.off";
const keycapRimPreviewPath = "/outputs/keycap-rim-preview.off";
const keycapHomingPreviewPath = "/outputs/keycap-homing-preview.off";
const keycapLegendPreviewPath = "/outputs/keycap-legend-preview.off";
const keycapStepSourceOffPath = "/outputs/keycap-single-material-step.off";
const keycapStlExportPath = "/outputs/keycap-single-material.stl";
const TOP_LEGEND_CONFIGS = Object.freeze([
  {
    id: "center",
    paramPrefix: "legend",
    exportTarget: "legend",
    outputPath: keycapLegendPreviewPath,
    colorFieldKey: "legendColor",
    titleKey: "legendCards.center",
    partName: "legend",
  },
  {
    id: "left-top",
    paramPrefix: "topLegendLeftTop",
    exportTarget: "top_legend_left_top",
    outputPath: "/outputs/keycap-top-legend-left-top-preview.off",
    colorFieldKey: "topLegendLeftTopColor",
    titleKey: "legendCards.leftTop",
    partName: "legend-left-top",
  },
  {
    id: "right-top",
    paramPrefix: "topLegendRightTop",
    exportTarget: "top_legend_right_top",
    outputPath: "/outputs/keycap-top-legend-right-top-preview.off",
    colorFieldKey: "topLegendRightTopColor",
    titleKey: "legendCards.rightTop",
    partName: "legend-right-top",
  },
  {
    id: "left-bottom",
    paramPrefix: "topLegendLeftBottom",
    exportTarget: "top_legend_left_bottom",
    outputPath: "/outputs/keycap-top-legend-left-bottom-preview.off",
    colorFieldKey: "topLegendLeftBottomColor",
    titleKey: "legendCards.leftBottom",
    partName: "legend-left-bottom",
  },
  {
    id: "right-bottom",
    paramPrefix: "topLegendRightBottom",
    exportTarget: "top_legend_right_bottom",
    outputPath: "/outputs/keycap-top-legend-right-bottom-preview.off",
    colorFieldKey: "topLegendRightBottomColor",
    titleKey: "legendCards.rightBottom",
    partName: "legend-right-bottom",
  },
]);
const SIDE_LEGEND_CONFIGS = Object.freeze([
  {
    side: "front",
    paramPrefix: "sideLegendFront",
    exportTarget: "side_legend_front",
    outputPath: "/outputs/keycap-side-legend-front-preview.off",
    colorFieldKey: "sideLegendFrontColor",
  },
  {
    side: "back",
    paramPrefix: "sideLegendBack",
    exportTarget: "side_legend_back",
    outputPath: "/outputs/keycap-side-legend-back-preview.off",
    colorFieldKey: "sideLegendBackColor",
  },
  {
    side: "left",
    paramPrefix: "sideLegendLeft",
    exportTarget: "side_legend_left",
    outputPath: "/outputs/keycap-side-legend-left-preview.off",
    colorFieldKey: "sideLegendLeftColor",
  },
  {
    side: "right",
    paramPrefix: "sideLegendRight",
    exportTarget: "side_legend_right",
    outputPath: "/outputs/keycap-side-legend-right-preview.off",
    colorFieldKey: "sideLegendRightColor",
  },
]);
const CHEVRON_ICON_URLS = Object.freeze({
  expanded: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-up.svg",
  collapsed: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-down.svg",
});
const SEARCH_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12m0-1.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 0 1 0-15m8.56 14.94l2.22 2.22a.75.75 0 1 1-1.06 1.06L18 19a.75.75 0 0 1 1.06-1.06"
      fill="currentColor"
    />
  </svg>
`;
const GLOBE_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a13.5 13.5 0 0 1 0 18" />
    <path d="M12 3a13.5 13.5 0 0 0 0 18" />
  </svg>
`;
const SUN_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
`;
const MOON_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79Z" />
  </svg>
`;
const EXPORT_ICON_MARKUP = Object.freeze({
  file: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  `,
  plus: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  `,
  x: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  `,
  package: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  `,
  download: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  `,
  design: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M2 14h4" />
      <path d="M10 8h4" />
      <path d="M18 16h4" />
    </svg>
  `,
  grip: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="9" cy="5" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  `,
  trash: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  `,
});
const PARAMETER_GROUP_ICON_PATHS = Object.freeze({
  name: "icons/parameters/name.svg",
  shape: "icons/parameters/shape.svg",
  top: "icons/parameters/top.svg",
  topHat: "icons/parameters/key-top-hat.svg?v=rough-c",
  legend: "icons/parameters/legend.svg",
  homing: "icons/parameters/homing.svg",
  stem: "icons/parameters/stem.svg",
});
const KEY_UNIT_BASIS_ICON_PATH = "icons/parameters/key-unit-basis.svg?v=rough-a";
const KEY_DEPTH_BASIS_ICON_PATH = "icons/parameters/key-depth-basis.svg?v=rough-b";
const KEY_WALL_THICKNESS_ICON_PATH = "icons/parameters/key-wall-thickness.svg?v=rough-a";
const KEY_TOP_TAPER_ICON_PATH = "icons/parameters/key-top-taper.svg?v=rough-a";
const KEYCAP_EDGE_RADIUS_ICON_PATH = "icons/parameters/keycap-edge-radius.svg?v=vtracer-f";
const KEYCAP_SHOULDER_RADIUS_ICON_PATH = "icons/parameters/keycap-shoulder-radius.svg?v=vtracer-a";
const KEY_TOP_CENTER_HEIGHT_ICON_PATH = "icons/parameters/key-top-center-height.svg?v=rough-a";
const KEY_TOP_OFFSET_ICON_PATH = "icons/parameters/key-top-offset.svg?v=rough-e";
const KEY_TOP_SURFACE_SHAPE_ICON_PATH = "icons/parameters/key-top-surface-shape.svg?v=rough-c";
const KEY_TOP_HAT_ICON_PATH = "icons/parameters/key-top-hat.svg?v=rough-c";
const KEY_TOP_SLOPE_INPUT_MODE_ICON_PATH = "icons/parameters/key-top-slope-input-mode.svg?v=vtracer-target-a";
const PARAMETER_GROUP_CAPTION_KEYS = Object.freeze({
  name: "parameterGroupCaptions.name",
  top: "parameterGroupCaptions.top",
  topHat: "parameterGroupCaptions.topHat",
  legend: "parameterGroupCaptions.legend",
});
let disposePreviewScene = null;
let previewDebounceTimer = 0;
let previewSceneModulePromise = null;
let colorisLoadPromise = null;
let latestPreviewRequestId = 0;
let previewViewState = null;
let jStemLp01ReferenceMeshPromise = null;
let viewportLayoutMode = getViewportLayoutMode();
let hasAttachedEditorDataDropListeners = false;
let editorDataDragDepth = 0;
let projectKeycapDragSourceId = "";
let projectKeycapDragTargetId = "";
let projectKeycapDragPlacement = "before";
let projectKeycapDragDidMove = false;
let projectKeycapDragOrderLabels = new Map();
let fontAttributionCopyResetTimer = 0;
let iconAttributionCopyResetTimer = 0;
const legendFontPreviewPromises = new Map();
const pendingCheckboxFieldChanges = new Map();
const pendingFieldHintSyncs = new Map();
const pendingFieldInputSyncs = new Map();
const pendingLinkedSizeInputSyncs = new Set();
let pendingLegendFontPickerFocus = false;
let pendingLegendFontSourceInputFocus = false;
let pendingLegendIconPickerFocus = false;
let pendingActiveProjectSyncTimer = 0;
let pendingFieldUiSyncTimer = 0;
let legendFontSourceEditorTransitionToken = 0;
let legendFontSourceEditorTransitionTimer = 0;
let legendFontSourceEditorCleanupTimer = 0;
let legendFontSourceInputPanelFadeTimer = 0;
let themeFallbackFadeTimer = 0;
let themeViewTransitionToken = 0;
let hasPendingVisibleTopFieldSync = false;
let pendingVisibleTopFieldActiveField = null;
const textDecoder = new TextDecoder();
const supportsUiViewTransitions = typeof document.startViewTransition === "function";
const reduceMotionQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
const themePreferenceQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const FIELD_GROUP_COLLAPSE_ANIMATION_ID = "field-group-collapse";
const FIELD_GROUP_COLLAPSE_GAP_ANIMATION_ID = "field-group-collapse-gap";
const FIELD_GROUP_COLLAPSE_ANIMATION_DURATION_MS = 220;
const FIELD_GROUP_COLLAPSE_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const CHECKBOX_TOGGLE_COMMIT_DELAY_MS = 190;
const FIELD_UI_SYNC_DELAY_MS = 80;
const ACTIVE_PROJECT_SYNC_DELAY_MS = 900;
const THEME_SWITCH_ANIMATION_DURATION_MS = 260;
const THEME_FADE_DURATION_MS = 320;
const THEME_VIEW_TRANSITION_CLASS = "is-theme-transitioning";
const THEME_FALLBACK_FADE_CLASS = "is-theme-css-fading";
const PROJECT_KEYCAP_REORDER_ANIMATION_ID = "project-keycap-reorder";
const PROJECT_KEYCAP_REORDER_ANIMATION_DURATION_MS = 180;
const PROJECT_KEYCAP_REORDER_ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const PROJECT_KEYCAP_REORDER_ANIMATION_MIN_DELTA_PX = 0.5;
const DEFAULT_KEY_UNIT_MM = 18;
const KEY_UNIT_MIN_MM = 1;
const KEY_UNIT_STORAGE_KEY = "keycap-maker:key-unit-mm";
const KEY_UNIT_FIELD_KEY = "keyUnitMm";
const THEME_STORAGE_KEY = "keycap-maker:theme";
const THEME_OPTIONS = Object.freeze(["light", "dark"]);
const LEGEND_MIN_SIZE = 0.5;
const LEGEND_OUTLINE_MIN = -1.2;
const LEGEND_OUTLINE_MAX = 1.2;
const LEGEND_FONT_STYLE_FALLBACK_KEY = "font-default";
const LEGEND_CONTENT_TYPE_TEXT = "text";
const LEGEND_CONTENT_TYPE_ICON = "icon";
const LEGEND_ICON_PICKER_RESULT_LIMIT = 96;
const USER_LEGEND_FONT_FILE_ACCEPT = ".ttf,.otf,font/ttf,font/otf,application/font-sfnt,application/x-font-ttf,application/x-font-otf,application/vnd.ms-opentype";
const USER_LEGEND_FONT_FILE_EXTENSIONS = new Set([".ttf", ".otf"]);
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
function createLegendFieldKeys(paramPrefix, { side = null } = {}) {
  const isSideLegend = side != null;
  const keys = [
    LEGEND_FIELD_SUFFIXES.enabled,
    LEGEND_FIELD_SUFFIXES.color,
    LEGEND_FIELD_SUFFIXES.contentType,
    LEGEND_FIELD_SUFFIXES.iconSet,
    LEGEND_FIELD_SUFFIXES.iconName,
    LEGEND_FIELD_SUFFIXES.iconFill,
    LEGEND_FIELD_SUFFIXES.text,
    LEGEND_FIELD_SUFFIXES.fontKey,
    LEGEND_FIELD_SUFFIXES.fontStyleKey,
    LEGEND_FIELD_SUFFIXES.underlineEnabled,
    LEGEND_FIELD_SUFFIXES.size,
    LEGEND_FIELD_SUFFIXES.outlineDelta,
    LEGEND_FIELD_SUFFIXES.height,
    ...(!isSideLegend ? [LEGEND_FIELD_SUFFIXES.embed] : []),
    LEGEND_FIELD_SUFFIXES.offsetX,
    LEGEND_FIELD_SUFFIXES.offsetY,
  ];

  return Object.freeze(keys.map((suffix) => legendParamKey(paramPrefix, suffix)));
}

const LEGEND_CARD_DEFINITIONS = Object.freeze([
  ...TOP_LEGEND_CONFIGS.map((config) => ({
    id: `legend-card-${config.id}`,
    title: () => t(config.titleKey),
    enabledFieldKey: legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled),
    fieldKeys: createLegendFieldKeys(config.paramPrefix),
  })),
  ...SIDE_LEGEND_CONFIGS.map((config) => ({
    id: `legend-card-${config.side}`,
    title: () => t("legendCards.sidewall", { side: getSideLegendLabel(config.side) }),
    enabledFieldKey: legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled),
    fieldKeys: createLegendFieldKeys(config.paramPrefix, { side: config.side }),
  })),
]);
const STEM_CLEARANCE_CARD_DEFINITION = Object.freeze({
  id: "stem-card-clearance",
  title: () => t("stemCards.clearance"),
  fieldKeys: ["stemOuterDelta", "stemCrossMargin", "stemCrossChamfer"],
});
const STEM_CARD_DEFINITIONS = Object.freeze([STEM_CLEARANCE_CARD_DEFINITION]);
const TYPEWRITER_MIN_STEM_HEIGHT = 0.6;
const TYPEWRITER_STEM_MOUNT_OVERLAP = 0.02;
const TOP_SCALE_MIN = 0.02;
const TOP_SCALE_MAX = 1;
const TOP_SCALE_STEP = 0.01;
const TOP_SCALE_MIN_FACE_SIZE = 0.2;
const TOP_THICKNESS_MIN = 0.05;
const THICKNESS_SLIDER_MAX = 3;
const KEY_SIZE_SLIDER_MIN_UNITS = 0.5;
const KEY_SIZE_SLIDER_MAX_UNITS = 4;
const KEY_UNIT_SLIDER_MIN_MM = 10;
const KEY_UNIT_SLIDER_MAX_MM = 24;
const TOP_CENTER_HEIGHT_SLIDER_MAX = 20;
const TOP_SLOPE_ANGLE_SLIDER_MAX_DEG = 15;
const LEGEND_SIZE_SLIDER_MAX = 12;
const LEGEND_DEPTH_SLIDER_MAX = 3;
const LEGEND_HEIGHT_SLIDER_MIN = -LEGEND_DEPTH_SLIDER_MAX;
const TYPEWRITER_RIM_HEIGHT_SLIDER_MAX = 4;
const HOMING_BAR_WIDTH_SLIDER_MAX = 4;
const HOMING_BAR_HEIGHT_SLIDER_MAX = 2;
const HOMING_BAR_CHAMFER_SLIDER_MAX = 1;
const STEM_DELTA_SLIDER_MAX = 0.5;
const STEM_INSET_DELTA_SLIDER_MAX = 1;
const STEM_CHAMFER_SLIDER_MAX = 0.8;
const TOP_HAT_MIN_SIZE = 0.2;
const TOP_HAT_MIN_HEIGHT = 0.05;
const TOP_HAT_MIN_SHOULDER_ANGLE = 5;
const TOP_HAT_MAX_SHOULDER_ANGLE = 85;
const TOP_HAT_MIN_SHOULDER_RADIUS = 0;
const TOP_HAT_EDGE_CLEARANCE = 0.2;
const TOP_HAT_RECESS_CLEARANCE = 0.05;
const LINKED_SIZE_UNIT_FIELDS = Object.freeze({
  keySizeUnits: "keyWidth",
  keyDepthUnits: "keyDepth",
  topHatTopWidthUnits: "topHatTopWidth",
  topHatTopDepthUnits: "topHatTopDepth",
  topHatBottomWidthUnits: "topHatBottomWidth",
  topHatBottomDepthUnits: "topHatBottomDepth",
});
const COLORIS_STYLE_PATH = "vendor/coloris/coloris.min.css";
const COLORIS_SCRIPT_PATH = "vendor/coloris/coloris.min.js";
const DEFAULT_KEYCAP_COLORS = Object.freeze({
  bodyColor: "#f8f9fa",
  topHatColor: "#f8f9fa",
  rimColor: "#d8ccb8",
  legendColor: "#212529",
  topLegendRightTopColor: "#212529",
  topLegendRightBottomColor: "#212529",
  topLegendLeftTopColor: "#212529",
  topLegendLeftBottomColor: "#212529",
  sideLegendFrontColor: "#212529",
  sideLegendBackColor: "#212529",
  sideLegendLeftColor: "#212529",
  sideLegendRightColor: "#212529",
  homingBarColor: "#ff7f00",
});
const COLORIS_SWATCHES = Object.freeze([
  DEFAULT_KEYCAP_COLORS.bodyColor,
  DEFAULT_KEYCAP_COLORS.rimColor,
  DEFAULT_KEYCAP_COLORS.legendColor,
  DEFAULT_KEYCAP_COLORS.homingBarColor,
  "#f7efe2",
  "#d8ccb8",
  "#2d241c",
  "#6f5e4d",
  "#7b9bbf",
  "#5d9270",
  "#b8884c",
]);

const workspaceSections = [
  {
    id: "project",
    labelKey: "navigation.project",
  },
  {
    id: "design",
    labelKey: "navigation.design",
  },
];

function t(key, values = {}, fallback = key) {
  return translate(state.locale, key, values, fallback);
}

function legendParamKey(prefix, suffix) {
  return `${prefix}${suffix}`;
}

function sanitizeKeyUnitMm(value, fallback = DEFAULT_KEY_UNIT_MM) {
  const nextValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedFallback = Number.isFinite(fallbackValue) && fallbackValue >= KEY_UNIT_MIN_MM
    ? fallbackValue
    : DEFAULT_KEY_UNIT_MM;

  return Number.isFinite(nextValue) && nextValue >= KEY_UNIT_MIN_MM
    ? nextValue
    : resolvedFallback;
}

function readKeyUnitMmPreference() {
  try {
    return sanitizeKeyUnitMm(window.localStorage?.getItem(KEY_UNIT_STORAGE_KEY));
  } catch {
    return DEFAULT_KEY_UNIT_MM;
  }
}

function saveKeyUnitMmPreference(value) {
  try {
    window.localStorage?.setItem(KEY_UNIT_STORAGE_KEY, `${sanitizeKeyUnitMm(value)}`);
  } catch {}
}

function normalizeTheme(value) {
  return THEME_OPTIONS.includes(value) ? value : null;
}

function getSystemTheme() {
  return themePreferenceQuery?.matches ? "dark" : "light";
}

function readThemePreference() {
  try {
    return normalizeTheme(window.localStorage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function getInitialTheme() {
  return readThemePreference() ?? getSystemTheme();
}

function setThemePreference(theme) {
  const nextTheme = normalizeTheme(theme) ?? getSystemTheme();
  try {
    window.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {}

  return nextTheme;
}

const DOCUMENT_LOCALE_ATTRIBUTES = Object.freeze({
  ja: { lang: "ja" },
  en: { lang: "en" },
  zh: { lang: "zh-Hans" },
  ko: { lang: "ko" },
});

function applyDocumentLocale(locale) {
  const nextLocale = normalizeLocale(locale);
  const attributes = DOCUMENT_LOCALE_ATTRIBUTES[nextLocale] ?? DOCUMENT_LOCALE_ATTRIBUTES.ja;
  const root = document.documentElement;

  root.lang = attributes.lang;
  root.dataset.locale = nextLocale;

  return nextLocale;
}

function applyThemeImmediately(theme) {
  const nextTheme = normalizeTheme(theme) ?? getSystemTheme();
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  return nextTheme;
}

function setThemeFallbackFadeColors() {
  const root = document.documentElement;
  const rootStyle = root.style;
  const computedStyle = window.getComputedStyle(root);
  const pageStart = computedStyle.getPropertyValue("--page-start").trim();
  const pageEnd = computedStyle.getPropertyValue("--page-end").trim();

  if (pageStart) {
    rootStyle.setProperty("--theme-fade-page-start", pageStart);
  }
  if (pageEnd) {
    rootStyle.setProperty("--theme-fade-page-end", pageEnd);
  }
}

function applyThemeWithFallbackFade(theme) {
  const root = document.documentElement;

  window.clearTimeout(themeFallbackFadeTimer);
  setThemeFallbackFadeColors();
  root.classList.remove(THEME_FALLBACK_FADE_CLASS);
  void root.offsetWidth;
  root.classList.add(THEME_FALLBACK_FADE_CLASS);
  const nextTheme = applyThemeImmediately(theme);

  themeFallbackFadeTimer = window.setTimeout(() => {
    root.classList.remove(THEME_FALLBACK_FADE_CLASS);
  }, THEME_FADE_DURATION_MS + 80);

  return nextTheme;
}

function applyThemeWithViewTransition(theme) {
  const root = document.documentElement;
  const token = themeViewTransitionToken + 1;

  themeViewTransitionToken = token;
  root.classList.add(THEME_VIEW_TRANSITION_CLASS);

  try {
    const transition = document.startViewTransition(() => applyThemeImmediately(theme));
    const cleanup = () => {
      if (token === themeViewTransitionToken) {
        root.classList.remove(THEME_VIEW_TRANSITION_CLASS);
      }
    };

    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    transition.finished.then(cleanup, cleanup);
  } catch {
    root.classList.remove(THEME_VIEW_TRANSITION_CLASS);
    return applyThemeWithFallbackFade(theme);
  }

  return normalizeTheme(theme) ?? getSystemTheme();
}

function applyTheme(theme, { animate = false } = {}) {
  const nextTheme = normalizeTheme(theme) ?? getSystemTheme();
  const currentTheme = normalizeTheme(document.documentElement.dataset.theme);

  if (!animate || reduceMotionQuery?.matches || currentTheme === nextTheme) {
    return applyThemeImmediately(nextTheme);
  }

  if (supportsUiViewTransitions) {
    return applyThemeWithViewTransition(nextTheme);
  }

  return applyThemeWithFallbackFade(nextTheme);
}

function getKeyUnitMm() {
  return sanitizeKeyUnitMm(state?.keyUnitMm);
}

function formatCompactNumber(value, digits = 2) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return "";
  }

  return nextValue.toFixed(digits).replace(/\.?0+$/, "");
}

function formatKeyUnitMmValue(value = getKeyUnitMm()) {
  return formatCompactNumber(value, 2);
}

function formatKeyUnitMmInputValue(value = getKeyUnitMm()) {
  return formatCompactNumber(value, 2);
}

function getKeyUnitCopyValues() {
  return {
    unitBase: formatKeyUnitMmValue(),
  };
}

function getKeySizeSliderMinimum() {
  return Math.max(10, getKeyUnitMm() * KEY_SIZE_SLIDER_MIN_UNITS);
}

function getKeySizeSliderMaximum() {
  return Math.max(getKeySizeSliderMinimum(), getKeyUnitMm() * KEY_SIZE_SLIDER_MAX_UNITS);
}

function getPositiveNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(numericValue, 0) : fallback;
}

function getFieldAxisSliderExtent(params, axis) {
  const size = axis === "y" ? params.keyDepth : params.keyWidth;
  return Math.max(getPositiveNumber(size, DEFAULT_KEY_UNIT_MM) / 2, 1);
}

function getTopEdgeHeightSliderMaximum(params) {
  return Math.max(getPositiveNumber(params.topCenterHeight, 0) * 2, TOP_CENTER_HEIGHT_SLIDER_MAX);
}

function getTypewriterMountHeightSliderMaximum(params) {
  const minimum = getTypewriterMountHeightMinimum(params);
  return Math.max(minimum + 5, 12);
}

function getLegendSizeSliderMaximum(params) {
  const footprintLimit = Math.max(Math.min(
    getPositiveNumber(params.keyWidth, DEFAULT_KEY_UNIT_MM),
    getPositiveNumber(params.keyDepth, DEFAULT_KEY_UNIT_MM),
  ), LEGEND_MIN_SIZE);
  return Math.min(Math.max(footprintLimit, LEGEND_MIN_SIZE), LEGEND_SIZE_SLIDER_MAX);
}

function getLegendOffsetSliderRange(params, axis) {
  const extent = getFieldAxisSliderExtent(params, axis);
  return { min: -extent, max: extent };
}

function getHomingBarChamferSliderMaximum(params) {
  return Math.min(
    getPositiveNumber(params.homingBarWidth, HOMING_BAR_WIDTH_SLIDER_MAX),
    getPositiveNumber(params.homingBarHeight, HOMING_BAR_HEIGHT_SLIDER_MAX),
    HOMING_BAR_CHAMFER_SLIDER_MAX * 2,
  ) / 2;
}

function isLegendFieldWithSuffix(fieldKey, suffix) {
  return [...TOP_LEGEND_CONFIGS, ...SIDE_LEGEND_CONFIGS]
    .some((config) => fieldKey === legendParamKey(config.paramPrefix, suffix));
}

const FIELD_SLIDER_RANGE_RESOLVERS = Object.freeze({
  [KEY_UNIT_FIELD_KEY]: () => ({
    min: KEY_UNIT_SLIDER_MIN_MM,
    max: KEY_UNIT_SLIDER_MAX_MM,
    step: 0.05,
    guide: DEFAULT_KEY_UNIT_MM,
  }),
  keyWidth: () => ({ min: getKeySizeSliderMinimum(), max: getKeySizeSliderMaximum() }),
  keyDepth: () => ({ min: getKeySizeSliderMinimum(), max: getKeySizeSliderMaximum() }),
  jisEnterNotchWidth: (params) => ({ max: Math.max(getPositiveNumber(params.keyWidth, DEFAULT_KEY_UNIT_MM) - 0.2, 0) }),
  jisEnterNotchDepth: (params) => ({ max: Math.max(getPositiveNumber(params.keyDepth, DEFAULT_KEY_UNIT_MM) - 0.2, 0) }),
  typewriterCornerRadius: (params) => ({ max: getTypewriterCornerRadiusMax(params) }),
  topCenterHeight: () => ({ max: TOP_CENTER_HEIGHT_SLIDER_MAX }),
  topOffsetX: (params) => getLegendOffsetSliderRange(params, "x"),
  topOffsetY: (params) => getLegendOffsetSliderRange(params, "y"),
  topHatTopWidth: (params) => ({ max: getTopHatUsableFootprintLimits(params).width }),
  topHatTopDepth: (params) => ({ max: getTopHatUsableFootprintLimits(params).depth }),
  topHatHeight: (params) => ({ max: getTopHatHeightMax(params) }),
  rimWidth: (params) => ({ max: getTypewriterRimMaxWidth(params) }),
  rimHeightUp: () => ({ max: TYPEWRITER_RIM_HEIGHT_SLIDER_MAX }),
  rimHeightDown: () => ({ max: TYPEWRITER_RIM_HEIGHT_SLIDER_MAX }),
  topPitchDeg: () => ({ min: -TOP_SLOPE_ANGLE_SLIDER_MAX_DEG, max: TOP_SLOPE_ANGLE_SLIDER_MAX_DEG }),
  topRollDeg: () => ({ min: -TOP_SLOPE_ANGLE_SLIDER_MAX_DEG, max: TOP_SLOPE_ANGLE_SLIDER_MAX_DEG }),
  topFrontHeight: (params) => ({ min: 0, max: getTopEdgeHeightSliderMaximum(params) }),
  topBackHeight: (params) => ({ min: 0, max: getTopEdgeHeightSliderMaximum(params) }),
  topLeftHeight: (params) => ({ min: 0, max: getTopEdgeHeightSliderMaximum(params) }),
  topRightHeight: (params) => ({ min: 0, max: getTopEdgeHeightSliderMaximum(params) }),
  homingBarLength: (params) => ({ max: getPositiveNumber(params.keyWidth, DEFAULT_KEY_UNIT_MM) }),
  homingBarWidth: () => ({ max: HOMING_BAR_WIDTH_SLIDER_MAX, step: 0.01 }),
  homingBarHeight: () => ({ max: HOMING_BAR_HEIGHT_SLIDER_MAX }),
  homingBarChamfer: (params) => ({ max: getHomingBarChamferSliderMaximum(params) }),
  homingBarOffsetY: (params) => getLegendOffsetSliderRange(params, "y"),
  typewriterMountHeight: (params) => ({
    min: getTypewriterMountHeightMinimum(params),
    max: getTypewriterMountHeightSliderMaximum(params),
  }),
  stemOuterDelta: () => ({ min: -STEM_DELTA_SLIDER_MAX, max: STEM_DELTA_SLIDER_MAX }),
  stemCrossMargin: () => ({ min: -STEM_DELTA_SLIDER_MAX, max: STEM_DELTA_SLIDER_MAX }),
  stemCrossChamfer: () => ({ max: STEM_CHAMFER_SLIDER_MAX }),
  stemInsetDelta: (params) => ({
    min: resolveStemType(params) === "j_stem_lp01" ? 0 : -STEM_INSET_DELTA_SLIDER_MAX,
    max: STEM_INSET_DELTA_SLIDER_MAX,
  }),
});

function resolveFieldSliderRange(fieldKey, params = state.keycapParams) {
  const resolver = FIELD_SLIDER_RANGE_RESOLVERS[fieldKey];
  if (resolver) {
    return resolver(params);
  }

  if (isLegendFieldWithSuffix(fieldKey, LEGEND_FIELD_SUFFIXES.size)) {
    return { max: getLegendSizeSliderMaximum(params) };
  }
  if (isLegendFieldWithSuffix(fieldKey, LEGEND_FIELD_SUFFIXES.height)) {
    return { min: LEGEND_HEIGHT_SLIDER_MIN, max: LEGEND_DEPTH_SLIDER_MAX, guide: 0 };
  }
  if (isLegendFieldWithSuffix(fieldKey, LEGEND_FIELD_SUFFIXES.embed)) {
    return { max: LEGEND_DEPTH_SLIDER_MAX };
  }
  if (isLegendFieldWithSuffix(fieldKey, LEGEND_FIELD_SUFFIXES.offsetX)) {
    return getLegendOffsetSliderRange(params, "x");
  }
  if (isLegendFieldWithSuffix(fieldKey, LEGEND_FIELD_SUFFIXES.offsetY)) {
    return getLegendOffsetSliderRange(params, "y");
  }

  return null;
}

function getWorkspaceSectionLabel(section) {
  return t(section.labelKey, {}, section.id);
}

function getShapeProfileOptions() {
  return keycapEditorProfiles.profiles.map((profile) => ({
    value: profile.key,
    label: t(`shapeProfiles.${profile.key}.label`, {}, profile.label),
  }));
}

function localizeFieldOption(fieldKey, option) {
  return {
    ...option,
    label: option.labelKey
      ? t(option.labelKey, {}, option.label ?? option.value)
      : t(`options.${fieldKey}.${option.value}`, {}, option.label ?? option.value),
  };
}

function isTypewriterShapeProfile(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const geometryType = resolveShapeGeometryType(profileKey);
  return geometryType === "typewriter" || geometryType === "typewriter_jis_enter";
}

function isJisEnterShapeProfile(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const geometryType = resolveShapeGeometryType(profileKey);
  return geometryType === "jis_enter" || geometryType === "typewriter_jis_enter";
}

function isJisEnterTopHatShapeProfile(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  return resolveShapeGeometryType(profileKey) === "jis_enter";
}

function resolveLegendFontConfig(fontKey = DEFAULT_KEYCAP_LEGEND_FONT_KEY) {
  return resolveKeycapLegendFont(fontKey);
}

function getAvailableLegendFonts() {
  return listAvailableKeycapLegendFonts();
}

function normalizeLegendFontPickerSegment(value) {
  return value === LEGEND_FONT_PICKER_SEGMENT_USER
    ? LEGEND_FONT_PICKER_SEGMENT_USER
    : LEGEND_FONT_PICKER_SEGMENT_BUILTIN;
}

function getLegendFontPickerInitialSegment(fieldKey = "legendFontKey") {
  const selectedFont = resolveLegendFontConfig(state.keycapParams[fieldKey]);
  return selectedFont?.isUserFont || selectedFont?.isMissing
    ? LEGEND_FONT_PICKER_SEGMENT_USER
    : LEGEND_FONT_PICKER_SEGMENT_BUILTIN;
}

function getLegendFontPickerSegmentFonts(
  segment = state.legendFontPickerSegment,
  fieldKey = state.legendFontPickerFieldKey || "legendFontKey",
) {
  const normalizedSegment = normalizeLegendFontPickerSegment(segment);
  const availableFonts = getAvailableLegendFonts();
  const fonts = normalizedSegment === LEGEND_FONT_PICKER_SEGMENT_USER
    ? availableFonts.filter((font) => font.isUserFont || font.isMissing)
    : availableFonts.filter((font) => !font.isUserFont && !font.isMissing);

  if (normalizedSegment !== LEGEND_FONT_PICKER_SEGMENT_USER) {
    return fonts;
  }

  const selectedFont = resolveLegendFontConfig(state.keycapParams[fieldKey]);
  if (
    selectedFont?.isMissing
    && !fonts.some((font) => font.key === selectedFont.key)
  ) {
    return [selectedFont, ...fonts];
  }

  return fonts;
}

function getLegendFontPickerSegmentIndex(segment = state.legendFontPickerSegment) {
  const normalizedSegment = normalizeLegendFontPickerSegment(segment);
  return Math.max(LEGEND_FONT_PICKER_SEGMENTS.findIndex((item) => item.key === normalizedSegment), 0);
}

function normalizeLegendFontPickerQuery(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getLegendFontPickerResults(
  query = state.legendFontPickerQuery,
  segment = state.legendFontPickerSegment,
  fieldKey = state.legendFontPickerFieldKey || "legendFontKey",
) {
  const availableFonts = getLegendFontPickerSegmentFonts(segment, fieldKey);
  const normalizedQuery = normalizeLegendFontPickerQuery(query);
  if (!normalizedQuery) {
    return availableFonts;
  }

  return availableFonts.filter((font) => {
    const searchLabel = String(font.searchLabel ?? font.label).toLowerCase();
    const fontName = String(font.fontName ?? "").toLowerCase();
    const fileName = String(font.fileName ?? "").toLowerCase();
    return searchLabel.includes(normalizedQuery)
      || fontName.includes(normalizedQuery)
      || fileName.includes(normalizedQuery);
  });
}

function getLegendFontFieldHint(params, fontFieldKey = "legendFontKey") {
  const selectedFont = resolveLegendFontConfig(params[fontFieldKey]);
  if (selectedFont.isMissing) {
    return t("fields.legendFontKey.missingHint");
  }
  if (selectedFont.isUserFont) {
    return t("fields.legendFontKey.userHint");
  }
  return selectedFont.fontKind === "variable"
    ? t("fields.legendFontKey.variableHint")
    : t("fields.legendFontKey.staticHint");
}

function getLegendFontStyleFieldOptions(params = state.keycapParams, fontFieldKey = "legendFontKey") {
  const nativeStyleOptions = getKeycapLegendFontStyleOptions(params[fontFieldKey]);
  if (nativeStyleOptions.length === 0) {
    return [{ value: LEGEND_FONT_STYLE_FALLBACK_KEY, label: t("font.defaultStyleLabel") }];
  }

  return nativeStyleOptions.map((option) => ({
    value: option.key,
    label: option.label,
  }));
}

function isLegendFontStyleSelectable(params = state.keycapParams, fontFieldKey = "legendFontKey") {
  return getKeycapLegendFontStyleOptions(params[fontFieldKey]).length > 0;
}

function getLegendFontStyleHint(params, fontFieldKey = "legendFontKey") {
  return isLegendFontStyleSelectable(params, fontFieldKey)
    ? t("fields.legendFontStyleKey.selectableHint")
    : t("fields.legendFontStyleKey.defaultHint");
}

function getLegendContentTypeOptions() {
  return [
    { value: LEGEND_CONTENT_TYPE_TEXT, label: t("options.legendContentType.text") },
    { value: LEGEND_CONTENT_TYPE_ICON, label: t("options.legendContentType.icon") },
  ];
}

function getLegendIconSetOptions() {
  return listLegendIconSets().map((iconSet) => ({
    value: iconSet.key,
    label: t(`options.legendIconSet.${iconSet.key}`, {}, iconSet.label),
  }));
}

function isLegendIconContent(params, contentTypeKey) {
  return resolveLegendContentType(params[contentTypeKey]) === LEGEND_CONTENT_TYPE_ICON;
}

function isLegendTextContent(params, contentTypeKey) {
  return !isLegendIconContent(params, contentTypeKey);
}

function getLegendIconFieldHint(params, iconSetFieldKey) {
  const iconSet = resolveLegendIconSet(params[iconSetFieldKey]);
  const iconSetMeta = getLegendIconSetMeta(iconSet);
  const iconCount = listAvailableLegendIcons(iconSet).length;
  return t("fields.legendIconName.hint", {
    count: iconCount,
    set: t(`options.legendIconSet.${iconSet}`, {}, iconSetMeta.label),
  });
}

function clampTypewriterCornerRadius(value, fallback = 0) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return Math.max(Number(fallback) || 0, 0);
  }

  return Math.max(nextValue, 0);
}

function getJisEnterFootprintLimits(params = state.keycapParams) {
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

function getTypewriterCornerRadiusMax(params = state.keycapParams) {
  if (isJisEnterShapeProfile(params.shapeProfile)) {
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

function getTypewriterCornerRadiusHint(params) {
  const maxRadius = getTypewriterCornerRadiusMax(params);
  return t("fields.typewriterCornerRadius.hint", { maxRadius: formatMillimeter(maxRadius) });
}

function clampNonNegativeNumber(value, fallback = 0) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return Math.max(Number(fallback) || 0, 0);
  }

  return Math.max(nextValue, 0);
}

function getTypewriterRimMaxWidth(params = state.keycapParams) {
  if (isJisEnterShapeProfile(params.shapeProfile)) {
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

function clampTypewriterRimWidth(value, params = state.keycapParams, fallback = 0) {
  const maxWidth = getTypewriterRimMaxWidth(params);
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return Math.min(Math.max(Number(fallback) || 0, 0), maxWidth);
  }

  return Math.min(Math.max(nextValue, 0), maxWidth);
}

function getTypewriterRimWidthHint(params) {
  const maxWidth = getTypewriterRimMaxWidth(params);
  return t("fields.rimWidth.hint", { maxWidth: formatMillimeter(maxWidth) });
}

function getTypewriterRimHeightUpHint() {
  return t("fields.rimHeightUp.hint");
}

function getTypewriterRimHeightDownHint() {
  return t("fields.rimHeightDown.hint");
}

function getJisEnterNotchWidthHint(params) {
  const maxWidth = Math.max(Number(params.keyWidth ?? 0) - 0.2, 0);
  return t("fields.jisEnterNotchWidth.hint", { maxWidth: formatMillimeter(maxWidth) });
}

function getJisEnterNotchDepthHint(params) {
  const maxDepth = Math.max(Number(params.keyDepth ?? 0) - 0.2, 0);
  return t("fields.jisEnterNotchDepth.hint", { maxDepth: formatMillimeter(maxDepth) });
}

function getTypewriterMountHeightMinimum(params = state.keycapParams) {
  const topCenterHeight = clampMinimum(params.topCenterHeight, 5.2, 0.1);
  return topCenterHeight + TYPEWRITER_MIN_STEM_HEIGHT - TYPEWRITER_STEM_MOUNT_OVERLAP;
}

function getTypewriterMountHeightHint(params) {
  return t("fields.typewriterMountHeight.hint", {
    minHeight: formatMillimeter(getTypewriterMountHeightMinimum(params)),
  });
}

function clampLegendOutlineDelta(value, fallback = 0) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.min(Math.max(nextValue, LEGEND_OUTLINE_MIN), LEGEND_OUTLINE_MAX);
}

function getLegendOutlineHint() {
  return t("fields.legendOutlineDelta.hint");
}

const STEM_TYPE_OPTIONS = Object.freeze([
  { value: "none", labelKey: "options.stemType.none" },
  { value: "mx", labelKey: "options.stemType.mx" },
  { value: "choc_v1", labelKey: "options.stemType.choc_v1" },
  { value: "choc_v2", labelKey: "options.stemType.choc_v2" },
  { value: "alps", labelKey: "options.stemType.alps" },
  { value: "j_stem_lp01", labelKey: "options.stemType.j_stem_lp01" },
]);
const J_STEM_LP01_PREVIEW_COLOR_OPTIONS = Object.freeze([
  { value: "clear", labelKey: "options.jStemLp01PreviewColor.clear", swatchClass: "clear" },
  { value: "white", labelKey: "options.jStemLp01PreviewColor.white", swatchClass: "white" },
  { value: "orange", labelKey: "options.jStemLp01PreviewColor.orange", swatchClass: "orange" },
]);
const TOP_SURFACE_SHAPE_OPTIONS = Object.freeze([
  { value: "flat", labelKey: "options.topSurfaceShape.flat" },
  { value: "cylindrical", labelKey: "options.topSurfaceShape.cylindrical" },
  { value: "spherical", labelKey: "options.topSurfaceShape.spherical" },
]);
const CROSS_COMPATIBLE_STEM_TYPES = new Set(["mx", "choc_v2"]);
const DESIGN_NAME_FIELD = Object.freeze({
  key: "name",
  label: () => t("fields.name.label"),
  hint: () => t("fields.name.hint"),
  type: "text",
  maxLength: 80,
  placeholder: DEFAULT_EXPORT_BASE_NAME,
});
const GEOMETRY_TYPE_RESET_FIELDS = new Set([
  "topCenterHeight",
  "topScale",
  "keycapShoulderRadius",
  "topSurfaceShape",
  "dishRadius",
  "dishDepth",
  "topHatSurfaceShape",
  "topHatDishDepth",
  "typewriterCornerRadius",
  "typewriterMountHeight",
]);
const FOOTPRINT_RESET_FIELDS = new Set([
  "keyWidth",
  "keyDepth",
  "jisEnterNotchWidth",
  "jisEnterNotchDepth",
]);

function isCrossCompatibleStemType(stemType) {
  return CROSS_COMPATIBLE_STEM_TYPES.has(stemType);
}

function getStemGroupDescription(params) {
  const stemType = resolveStemType(params);

  switch (stemType) {
    case "none":
      return t("stemDescriptions.none");
    case "mx":
      return t("stemDescriptions.mx");
    case "choc_v1":
      return t("stemDescriptions.choc_v1");
    case "alps":
      return t("stemDescriptions.alps");
    case "j_stem_lp01":
      return t("stemDescriptions.j_stem_lp01");
    default:
      return t("stemDescriptions.choc_v2");
  }
}

function getStemOuterHint(params) {
  return resolveStemType(params) === "mx"
    ? t("fields.stemOuterDelta.hint")
    : t("fields.stemOuterDelta.hint");
}

function getStemFitHint(params) {
  switch (resolveStemType(params)) {
    case "mx":
    case "choc_v2":
      return t("fields.stemCrossMargin.mxHint");
    case "choc_v1":
      return t("fields.stemCrossMargin.chocV1Hint");
    case "alps":
      return t("fields.stemCrossMargin.alpsHint");
    case "j_stem_lp01":
      return t("fields.stemCrossMargin.jStemLp01Hint");
    default:
      return t("fields.stemCrossMargin.disabledHint");
  }
}

function getStemChamferHint(params) {
  return isCrossCompatibleStemType(resolveStemType(params))
    ? t("fields.stemCrossChamfer.hint")
    : t("fields.stemCrossChamfer.disabledHint");
}

function getStemInsetHint(params) {
  switch (resolveStemType(params)) {
    case "none":
      return t("fields.stemInsetDelta.disabledHint");
    case "j_stem_lp01":
      return t("fields.stemInsetDelta.jStemLp01Hint");
    default:
      return t("fields.stemInsetDelta.hint");
  }
}

const TOP_SLOPE_INPUT_MODE_OPTIONS = Object.freeze([
  { value: "angle", labelKey: "options.topSlopeInputMode.angle" },
  { value: "edge-height", labelKey: "options.topSlopeInputMode.edge-height" },
]);
const TOP_CORNER_RADIUS_STEP = 0.1;
const TOP_CORNER_RADIUS_INDIVIDUAL_FIELD_KEY = "topCornerRadiusIndividualEnabled";
const TOP_CORNER_RADIUS_FIELD_KEYS = Object.freeze([
  "topCornerRadiusLeftTop",
  "topCornerRadiusRightTop",
  "topCornerRadiusRightBottom",
  "topCornerRadiusLeftBottom",
]);
const TOP_CORNER_RADIUS_CONTROL_ORDER = Object.freeze([
  { key: "topCornerRadiusLeftTop", corner: "left-top" },
  { key: "topCornerRadiusRightTop", corner: "right-top" },
  { key: "topCornerRadiusLeftBottom", corner: "left-bottom" },
  { key: "topCornerRadiusRightBottom", corner: "right-bottom" },
]);
const TOP_HAT_TOP_RADIUS_INDIVIDUAL_FIELD_KEY = "topHatTopRadiusIndividualEnabled";
const TOP_HAT_TOP_RADIUS_FIELD_KEYS = Object.freeze([
  "topHatTopRadiusLeftTop",
  "topHatTopRadiusRightTop",
  "topHatTopRadiusRightBottom",
  "topHatTopRadiusLeftBottom",
]);
const TOP_HAT_TOP_RADIUS_CONTROL_ORDER = Object.freeze([
  { key: "topHatTopRadiusLeftTop", corner: "left-top" },
  { key: "topHatTopRadiusRightTop", corner: "right-top" },
  { key: "topHatTopRadiusLeftBottom", corner: "left-bottom" },
  { key: "topHatTopRadiusRightBottom", corner: "right-bottom" },
]);
const TOP_HAT_BOTTOM_RADIUS_INDIVIDUAL_FIELD_KEY = "topHatBottomRadiusIndividualEnabled";
const TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS = Object.freeze([
  "topHatBottomRadiusLeftTop",
  "topHatBottomRadiusRightTop",
  "topHatBottomRadiusRightBottom",
  "topHatBottomRadiusLeftBottom",
]);
const TOP_HAT_BOTTOM_RADIUS_CONTROL_ORDER = Object.freeze([
  { key: "topHatBottomRadiusLeftTop", corner: "left-top" },
  { key: "topHatBottomRadiusRightTop", corner: "right-top" },
  { key: "topHatBottomRadiusLeftBottom", corner: "left-bottom" },
  { key: "topHatBottomRadiusRightBottom", corner: "right-bottom" },
]);
const CORNER_RADIUS_FIELD_SETS = Object.freeze([
  {
    sharedFieldKey: "topCornerRadius",
    individualFieldKey: TOP_CORNER_RADIUS_INDIVIDUAL_FIELD_KEY,
    fieldKeys: TOP_CORNER_RADIUS_FIELD_KEYS,
    controlOrder: TOP_CORNER_RADIUS_CONTROL_ORDER,
  },
  {
    sharedFieldKey: "topHatTopRadius",
    individualFieldKey: TOP_HAT_TOP_RADIUS_INDIVIDUAL_FIELD_KEY,
    fieldKeys: TOP_HAT_TOP_RADIUS_FIELD_KEYS,
    controlOrder: TOP_HAT_TOP_RADIUS_CONTROL_ORDER,
  },
  {
    sharedFieldKey: "topHatBottomRadius",
    individualFieldKey: TOP_HAT_BOTTOM_RADIUS_INDIVIDUAL_FIELD_KEY,
    fieldKeys: TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS,
    controlOrder: TOP_HAT_BOTTOM_RADIUS_CONTROL_ORDER,
  },
]);
const CORNER_RADIUS_INDIVIDUAL_FIELD_KEYS = new Set(
  CORNER_RADIUS_FIELD_SETS.map((fieldSet) => fieldSet.individualFieldKey),
);

function clampMinimum(value, fallback, minimum) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(nextValue, minimum) : fallback;
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

function resolveTopScaleActiveDishDepth(params = {}) {
  const dishDepth = Number(params.dishDepth ?? 0);
  const topSurfaceShape = params.topSurfaceShape ?? "flat";
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

function resolveTopScaleMinimum(params = {}) {
  const profileKey = params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const defaults = createDefaultKeycapParams(profileKey);
  const geometryDefaults = resolveShapeProfileGeometryDefaults(profileKey);
  const keyWidth = clampMinimum(params.keyWidth, defaults.keyWidth ?? 18, 1);
  const keyDepth = clampMinimum(params.keyDepth, defaults.keyDepth ?? 18, 1);
  const topCenterHeight = clampMinimum(params.topCenterHeight, defaults.topCenterHeight ?? 9.5, 0.1);
  const wall = clampMinimum(params.wallThickness, defaults.wallThickness ?? 1.2, 0);
  const topThickness = resolveTopThickness(params, defaults, geometryDefaults);
  const activeDishDepth = resolveTopScaleActiveDishDepth({ ...defaults, ...params, shapeProfile: profileKey });
  const innerHeight = Math.max(
    topCenterHeight - activeDishDepth - topThickness,
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

  if (isTypewriterShapeProfile(profileKey)) {
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

function resolveTopEdgeHeights(params = {}) {
  const geometry = resolveTopPlaneGeometry(params);
  const topPitchDeg = Number(params.topPitchDeg ?? 0);
  const topRollDeg = Number(params.topRollDeg ?? 0);
  const pitchSlope = degTan(topPitchDeg);
  const rollSlope = degTan(topRollDeg);
  const topSurfaceShape = params.topSurfaceShape ?? "flat";
  const rawDishDepth = Number(params.dishDepth ?? 0);
  const activeDishDepth = topSurfaceShape === "flat" || !Number.isFinite(rawDishDepth) ? 0 : rawDishDepth;

  return {
    topFrontHeight: geometry.topCenterHeight + geometry.topFront * pitchSlope,
    topBackHeight: geometry.topCenterHeight + geometry.topBack * pitchSlope,
    topLeftHeight: geometry.topCenterHeight + geometry.topLeft * rollSlope,
    topRightHeight: geometry.topCenterHeight + geometry.topRight * rollSlope,
    topVisibleCenterHeight: geometry.topCenterHeight - activeDishDepth,
  };
}

function getTopCenterHeightHint(params) {
  if (isTypewriterShapeProfile(params.shapeProfile)) {
    return t("fields.topCenterHeight.typewriterHint");
  }

  return t("fields.topCenterHeight.hint", { height: formatMillimeter(params.topVisibleCenterHeight) });
}

function getTopPitchHint(params) {
  return t("fields.topPitchDeg.hint", {
    front: formatMillimeter(params.topFrontHeight),
    back: formatMillimeter(params.topBackHeight),
  });
}

function getTopRollHint(params) {
  return t("fields.topRollDeg.hint", {
    left: formatMillimeter(params.topLeftHeight),
    right: formatMillimeter(params.topRightHeight),
  });
}

function getTopFrontHeightHint(params) {
  return t("fields.topFrontHeight.hint", { pitch: formatDegree(params.topPitchDeg) });
}

function getTopBackHeightHint(params) {
  return t("fields.topBackHeight.hint", { pitch: formatDegree(params.topPitchDeg) });
}

function getTopLeftHeightHint(params) {
  return t("fields.topLeftHeight.hint", { roll: formatDegree(params.topRollDeg) });
}

function getTopRightHeightHint(params) {
  return t("fields.topRightHeight.hint", { roll: formatDegree(params.topRollDeg) });
}

function getTopSurfaceShapeHint() {
  return t("fields.topSurfaceShape.hint");
}

function getTopHatSurfaceShapeHint() {
  return t("fields.topHatSurfaceShape.hint");
}

function floorToNumericStep(value, step, base = 0) {
  const numericValue = Number(value);
  const numericStep = Number(step);
  const numericBase = Number(base);

  if (!Number.isFinite(numericValue) || !Number.isFinite(numericStep) || numericStep <= 0 || !Number.isFinite(numericBase)) {
    return numericValue;
  }

  const digits = countStepDigits(numericStep);
  const scale = 10 ** Math.min(Math.max(digits, 0), 6);
  const stepCount = Math.floor((((numericValue - numericBase) * scale) + Number.EPSILON) / (numericStep * scale));
  return Math.max(numericBase, Number((numericBase + (stepCount * numericStep)).toFixed(digits)));
}

function getTopCornerRadiusGeometryMax(params = state.keycapParams) {
  const geometry = resolveTopPlaneGeometry(params);
  return Math.max(Math.min(
    geometry.topRight - geometry.topLeft,
    geometry.topBack - geometry.topFront,
  ) / 2, 0);
}

function getTopCornerRadiusMax(params = state.keycapParams) {
  return floorToNumericStep(getTopCornerRadiusGeometryMax(params), TOP_CORNER_RADIUS_STEP, 0);
}

function getTopCornerRadiusHint(params) {
  return t("fields.topCornerRadius.hint", { maxRadius: formatMillimeter(getTopCornerRadiusMax(params)) });
}

function getKeycapShoulderOutset(params = state.keycapParams) {
  if (isTypewriterShapeProfile(params.shapeProfile)) {
    return 0;
  }

  const geometry = resolveTopPlaneGeometry(params);
  const baseLeft = -Number(params.keyWidth ?? 0) / 2;
  const baseRight = Number(params.keyWidth ?? 0) / 2;
  const baseFront = -Number(params.keyDepth ?? 0) / 2;
  const baseBack = Number(params.keyDepth ?? 0) / 2;

  return Math.max(Math.min(
    geometry.topLeft - baseLeft,
    baseRight - geometry.topRight,
    geometry.topFront - baseFront,
    baseBack - geometry.topBack,
  ), 0);
}

function getKeycapShoulderRadiusMax(params = state.keycapParams) {
  const topCenterHeight = Math.max(Number(params.topCenterHeight ?? 0), 0);
  return floorToNumericStep(Math.min(topCenterHeight, getKeycapShoulderOutset(params)), 0.05, 0);
}

function getKeycapEdgeRadiusMax(params = state.keycapParams) {
  return getKeycapShoulderRadiusMax(params);
}

function getKeycapEdgeRadiusHint(params) {
  return t("fields.keycapEdgeRadius.hint", {
    maxRadius: formatMillimeter(getKeycapEdgeRadiusMax(params)),
  });
}

function getKeycapShoulderRadiusMin(params = state.keycapParams) {
  return -getKeycapShoulderRadiusMax(params);
}

function getKeycapShoulderRadiusHint(params) {
  return t("fields.keycapShoulderRadius.hint", {
    minRadius: formatMillimeter(getKeycapShoulderRadiusMin(params)),
    maxRadius: formatMillimeter(getKeycapShoulderRadiusMax(params)),
  });
}

function getDishDepthHint(params) {
  const maximum = getDishDepthMax(params);
  const values = {
    minDepth: formatMillimeter(-maximum),
    maxDepth: formatMillimeter(maximum),
  };
  if (params.topSurfaceShape === "cylindrical") {
    return t("fields.dishDepth.cylindricalHint", values);
  }

  if (params.topSurfaceShape === "spherical") {
    return t("fields.dishDepth.sphericalHint", values);
  }

  return t("fields.dishDepth.flatHint");
}

function getTopHatDishDepthHint(params) {
  const maximum = getTopHatDishDepthMax(params);
  const values = {
    minDepth: formatMillimeter(-maximum),
    maxDepth: formatMillimeter(maximum),
  };
  if (params.topHatSurfaceShape === "cylindrical") {
    return t("fields.topHatDishDepth.cylindricalHint", values);
  }

  if (params.topHatSurfaceShape === "spherical") {
    return t("fields.topHatDishDepth.sphericalHint", values);
  }

  return t("fields.topHatDishDepth.flatHint");
}

function getTopHatFootprintLimits(params = state.keycapParams) {
  const geometry = resolveTopPlaneGeometry(params);
  return {
    width: Math.max(geometry.topRight - geometry.topLeft, TOP_HAT_MIN_SIZE),
    depth: Math.max(geometry.topBack - geometry.topFront, TOP_HAT_MIN_SIZE),
  };
}

function getTopHatUsableFootprintLimits(params = state.keycapParams) {
  const limits = getTopHatFootprintLimits(params);
  return {
    width: Math.max(limits.width - TOP_HAT_EDGE_CLEARANCE * 2, TOP_HAT_MIN_SIZE),
    depth: Math.max(limits.depth - TOP_HAT_EDGE_CLEARANCE * 2, TOP_HAT_MIN_SIZE),
  };
}

function getJisEnterTopHatInsetMax(params = state.keycapParams) {
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

function getTopHatSafeShoulderAngle(params = state.keycapParams) {
  const angle = Number(params.topHatShoulderAngle ?? 45);
  return Math.min(Math.max(Number.isFinite(angle) ? angle : 45, TOP_HAT_MIN_SHOULDER_ANGLE), TOP_HAT_MAX_SHOULDER_ANGLE);
}

function getTopHatSafeInset(params = state.keycapParams) {
  const inset = Number(params.topHatInset ?? 0);
  return Math.min(Math.max(Number.isFinite(inset) ? inset : 0, 0), getJisEnterTopHatInsetMax(params));
}

function getTopHatTopWidthValue(params = state.keycapParams) {
  const limits = getTopHatUsableFootprintLimits(params);
  const width = Number(params.topHatTopWidth ?? TOP_HAT_MIN_SIZE);
  return Math.min(Math.max(Number.isFinite(width) ? width : TOP_HAT_MIN_SIZE, TOP_HAT_MIN_SIZE), limits.width);
}

function getTopHatTopDepthValue(params = state.keycapParams) {
  const limits = getTopHatUsableFootprintLimits(params);
  const depth = Number(params.topHatTopDepth ?? TOP_HAT_MIN_SIZE);
  return Math.min(Math.max(Number.isFinite(depth) ? depth : TOP_HAT_MIN_SIZE, TOP_HAT_MIN_SIZE), limits.depth);
}

function getTopHatBottomWidthMin(params = state.keycapParams) {
  return getTopHatTopWidthValue(params);
}

function getTopHatBottomDepthMin(params = state.keycapParams) {
  return getTopHatTopDepthValue(params);
}

function getTopHatBottomWidthValue(params = state.keycapParams) {
  const limits = getTopHatUsableFootprintLimits(params);
  const width = Number(params.topHatBottomWidth ?? getTopHatBottomWidthMin(params));
  return Math.min(Math.max(Number.isFinite(width) ? width : getTopHatBottomWidthMin(params), getTopHatBottomWidthMin(params)), limits.width);
}

function getTopHatBottomDepthValue(params = state.keycapParams) {
  const limits = getTopHatUsableFootprintLimits(params);
  const depth = Number(params.topHatBottomDepth ?? getTopHatBottomDepthMin(params));
  return Math.min(Math.max(Number.isFinite(depth) ? depth : getTopHatBottomDepthMin(params), getTopHatBottomDepthMin(params)), limits.depth);
}

function getTopHatShoulderOutset(params = state.keycapParams) {
  if (isJisEnterTopHatShapeProfile(params.shapeProfile) && "topHatInset" in params) {
    return getTopHatSafeInset(params);
  }

  const topWidth = getTopHatTopWidthValue(params);
  const topDepth = getTopHatTopDepthValue(params);
  const bottomWidth = getTopHatBottomWidthValue(params);
  const bottomDepth = getTopHatBottomDepthValue(params);
  return Math.min(
    Math.max((bottomWidth - topWidth) / 2, 0),
    Math.max((bottomDepth - topDepth) / 2, 0),
  );
}

function getTopHatActualShoulderOutset(params = state.keycapParams) {
  const shoulderOutset = getTopHatShoulderOutset(params);
  if (!isJisEnterTopHatShapeProfile(params.shapeProfile) || !("topHatInset" in params)) {
    return shoulderOutset;
  }

  const rawHeight = Number(params.topHatHeight ?? TOP_HAT_MIN_HEIGHT);
  const height = Math.abs(Number.isFinite(rawHeight) ? rawHeight : TOP_HAT_MIN_HEIGHT);
  const shoulderAngle = getTopHatSafeShoulderAngle(params);
  return Math.min(shoulderOutset, height / Math.tan((shoulderAngle * Math.PI) / 180));
}

function getTopHatHeightMax(params = state.keycapParams) {
  const availableOutset = getTopHatShoulderOutset(params);
  const maxHeight = availableOutset * Math.tan((getTopHatSafeShoulderAngle(params) * Math.PI) / 180);

  return Math.max(maxHeight, TOP_HAT_MIN_HEIGHT);
}

function getTopHatHeightMin(params = state.keycapParams) {
  const geometry = resolveTopPlaneGeometry(params);
  return -Math.max(Number(geometry.topThickness ?? 0) - TOP_HAT_RECESS_CLEARANCE, 0);
}

function getTopHatTopRadiusMax(params = state.keycapParams) {
  if (isJisEnterTopHatShapeProfile(params.shapeProfile) && "topHatInset" in params) {
    const limits = getTopHatFootprintLimits(params);
    const inset = getTopHatSafeInset(params);
    const width = Math.max(limits.width - inset * 2, TOP_HAT_MIN_SIZE);
    const depth = Math.max(limits.depth - inset * 2, TOP_HAT_MIN_SIZE);
    const notchWidth = Math.min(Math.max(Number(params.jisEnterNotchWidth ?? 0), 0), Math.max(width - TOP_HAT_MIN_SIZE, 0));
    const notchDepth = Math.min(Math.max(Number(params.jisEnterNotchDepth ?? 0), 0), Math.max(depth - TOP_HAT_MIN_SIZE, 0));
    const lowerWidth = Math.max(width - notchWidth, TOP_HAT_MIN_SIZE);
    const upperDepth = Math.max(depth - notchDepth, TOP_HAT_MIN_SIZE);
    return Math.max(Math.min(width, depth, lowerWidth, upperDepth, notchWidth || width, notchDepth || depth) / 2, 0);
  }

  const width = getTopHatTopWidthValue(params);
  const depth = getTopHatTopDepthValue(params);
  return Math.max(Math.min(width, depth) / 2, 0);
}

function getTopHatShoulderRadiusMax(params = state.keycapParams) {
  const rawHeight = Number(params.topHatHeight ?? 0);
  const height = Math.abs(Number.isFinite(rawHeight) ? rawHeight : 0);
  return Math.max(Math.min(height, getTopHatActualShoulderOutset(params)), TOP_HAT_MIN_SHOULDER_RADIUS);
}

function getTopHatShoulderRadiusMin(params = state.keycapParams) {
  return -getTopHatShoulderRadiusMax(params);
}

function getTopHatTopWidthHint(params) {
  const limits = getTopHatUsableFootprintLimits(params);
  return t("fields.topHatTopWidth.hint", { maxWidth: formatMillimeter(limits.width) });
}

function getTopHatTopDepthHint(params) {
  const limits = getTopHatUsableFootprintLimits(params);
  return t("fields.topHatTopDepth.hint", { maxDepth: formatMillimeter(limits.depth) });
}

function getTopHatBottomWidthHint(params) {
  const limits = getTopHatUsableFootprintLimits(params);
  return t("fields.topHatBottomWidth.hint", { maxWidth: formatMillimeter(limits.width) });
}

function getTopHatBottomDepthHint(params) {
  const limits = getTopHatUsableFootprintLimits(params);
  return t("fields.topHatBottomDepth.hint", { maxDepth: formatMillimeter(limits.depth) });
}

function getTopHatInsetHint(params) {
  return t("fields.topHatInset.hint", { maxInset: formatMillimeter(getJisEnterTopHatInsetMax(params)) });
}

function getTopHatTopRadiusHint(params) {
  return t("fields.topHatTopRadius.hint", { maxRadius: formatMillimeter(getTopHatTopRadiusMax(params)) });
}

function getTopHatBottomRadiusMax(params = state.keycapParams) {
  const actualOutset = getTopHatActualShoulderOutset(params);

  if (isJisEnterTopHatShapeProfile(params.shapeProfile) && "topHatInset" in params) {
    const limits = getTopHatFootprintLimits(params);
    const topInset = getTopHatSafeInset(params);
    const baseInset = Math.max(topInset - actualOutset, 0);
    const width = Math.max(limits.width - baseInset * 2, TOP_HAT_MIN_SIZE);
    const depth = Math.max(limits.depth - baseInset * 2, TOP_HAT_MIN_SIZE);
    const notchWidth = Math.min(Math.max(Number(params.jisEnterNotchWidth ?? 0), 0), Math.max(width - TOP_HAT_MIN_SIZE, 0));
    const notchDepth = Math.min(Math.max(Number(params.jisEnterNotchDepth ?? 0), 0), Math.max(depth - TOP_HAT_MIN_SIZE, 0));
    const lowerWidth = Math.max(width - notchWidth, TOP_HAT_MIN_SIZE);
    const upperDepth = Math.max(depth - notchDepth, TOP_HAT_MIN_SIZE);
    return Math.max(Math.min(width, depth, lowerWidth, upperDepth, notchWidth || width, notchDepth || depth) / 2, 0);
  }

  const baseWidth = getTopHatBottomWidthValue(params);
  const baseDepth = getTopHatBottomDepthValue(params);
  return Math.max(Math.min(baseWidth, baseDepth) / 2, 0);
}

function getTopHatBottomRadiusHint(params) {
  return t("fields.topHatBottomRadius.hint", { maxRadius: formatMillimeter(getTopHatBottomRadiusMax(params)) });
}

function getTopHatHeightHint(params) {
  return t("fields.topHatHeight.hint", {
    minHeight: formatMillimeter(getTopHatHeightMin(params), 2),
    maxHeight: formatMillimeter(getTopHatHeightMax(params), 2),
  });
}

function getTopHatShoulderRadiusHint(params) {
  return t("fields.topHatShoulderRadius.hint", {
    minRadius: formatMillimeter(getTopHatShoulderRadiusMin(params)),
    maxRadius: formatMillimeter(getTopHatShoulderRadiusMax(params)),
  });
}

function getSideLegendLabel(side) {
  return t(`sideLabels.${side}`, {}, side);
}

function createLegendControlFields({ paramPrefix, side = null, collapseControlled = false }) {
  const isSideLegend = side != null;
  const sideLabel = () => getSideLegendLabel(side);
  const enabledKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.enabled);
  const colorKey = legendParamKey(paramPrefix, LEGEND_FIELD_SUFFIXES.color);
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
  const visibilityConfig = { visibleWhen: (params) => params[enabledKey] };
  const sideValues = () => ({ side: sideLabel() });
  const fieldKey = (genericKey, topKey) => (isSideLegend ? `fields.sideLegend.${genericKey}` : `fields.${topKey}`);
  const textVisibilityConfig = {
    visibleWhen: (params) => params[enabledKey] && isLegendTextContent(params, contentTypeKey),
  };
  const iconVisibilityConfig = {
    visibleWhen: (params) => params[enabledKey] && isLegendIconContent(params, contentTypeKey),
  };
  const iconFillVisibilityConfig = {
    visibleWhen: (params) => params[enabledKey]
      && isLegendIconContent(params, contentTypeKey)
      && isLegendIconFillAvailable(params[iconNameKey], resolveLegendIconSet(params[iconSetKey])),
  };
  const enabledDependentFieldKeys = collapseControlled ? [] : [
    colorKey,
    contentTypeKey,
    iconSetKey,
    iconNameKey,
    iconFillKey,
    textKey,
    fontKey,
    sizeKey,
    outlineDeltaKey,
    heightKey,
    ...(isSideLegend ? [] : [embedKey]),
    offsetXKey,
    offsetYKey,
  ];

  return [
    {
      key: enabledKey,
      label: () => (isSideLegend ? t("fields.sideLegend.enabled.label", sideValues()) : t("fields.legendEnabled.label")),
      hint: () => (isSideLegend ? t("fields.sideLegend.enabled.hint", sideValues()) : t("fields.legendEnabled.hint")),
      note: collapseControlled ? null : () => t("fields.legendPrintNotice"),
      type: "checkbox",
      dependentFieldKeys: enabledDependentFieldKeys,
    },
    {
      key: colorKey,
      label: () => t(fieldKey("color.label", "legendColor.label"), sideValues()),
      hint: () => t(fieldKey("color.hint", "legendColor.hint"), sideValues()),
      type: "color",
      placeholder: DEFAULT_KEYCAP_COLORS[colorKey] ?? DEFAULT_KEYCAP_COLORS.legendColor,
      ...visibilityConfig,
    },
    {
      key: contentTypeKey,
      label: () => t(fieldKey("contentType.label", "legendContentType.label"), sideValues()),
      hint: () => t(fieldKey("contentType.hint", "legendContentType.hint"), sideValues()),
      type: "select",
      options: () => getLegendContentTypeOptions(),
      dependentFieldKeys: [iconSetKey, iconNameKey, iconFillKey, textKey, fontKey],
      ...visibilityConfig,
    },
    {
      key: iconSetKey,
      label: () => t(fieldKey("iconSet.label", "legendIconSet.label"), sideValues()),
      hint: () => t(fieldKey("iconSet.hint", "legendIconSet.hint"), sideValues()),
      type: "select",
      options: () => getLegendIconSetOptions(),
      dependentFieldKeys: [iconNameKey, iconFillKey],
      ...iconVisibilityConfig,
    },
    {
      key: iconNameKey,
      label: () => t(fieldKey("iconName.label", "legendIconName.label"), sideValues()),
      hint: (params) => getLegendIconFieldHint(params, iconSetKey),
      type: "icon-search",
      ...iconVisibilityConfig,
    },
    {
      key: iconFillKey,
      label: () => t(fieldKey("iconFill.label", "legendIconFill.label"), sideValues()),
      hint: () => t(fieldKey("iconFill.hint", "legendIconFill.hint"), sideValues()),
      type: "checkbox",
      ...iconFillVisibilityConfig,
    },
    {
      key: textKey,
      label: () => t(fieldKey("text.label", "legendText.label"), sideValues()),
      hint: () => t(fieldKey("text.hint", "legendText.hint"), sideValues()),
      type: "text",
      maxLength: 24,
      placeholder: () => t("fields.legendText.placeholder"),
      ...textVisibilityConfig,
    },
    {
      key: fontKey,
      label: () => t(fieldKey("fontKey.label", "legendFontKey.label"), sideValues()),
      hint: (params) => getLegendFontFieldHint(params, fontKey),
      type: "font-search",
      dependentFieldKeys: [fontStyleKey, underlineEnabledKey],
      ...textVisibilityConfig,
    },
    {
      key: fontStyleKey,
      label: () => t(fieldKey("fontStyleKey.label", "legendFontStyleKey.label"), sideValues()),
      hint: (params) => getLegendFontStyleHint(params, fontKey),
      type: "select",
      options: (params) => getLegendFontStyleFieldOptions(params, fontKey),
      disabledWhen: (params) => !isLegendFontStyleSelectable(params, fontKey),
      ...textVisibilityConfig,
    },
    {
      key: underlineEnabledKey,
      label: () => t(fieldKey("underlineEnabled.label", "legendUnderlineEnabled.label"), sideValues()),
      hint: () => t(fieldKey("underlineEnabled.hint", "legendUnderlineEnabled.hint"), sideValues()),
      type: "checkbox",
      ...textVisibilityConfig,
    },
    {
      key: sizeKey,
      label: () => t(fieldKey("size.label", "legendSize.label"), sideValues()),
      hint: () => t(fieldKey("size.hint", "legendSize.hint"), sideValues()),
      unit: "mm",
      step: 0.1,
      min: LEGEND_MIN_SIZE,
      dependentFieldKeys: [outlineDeltaKey],
      ...visibilityConfig,
    },
    {
      key: outlineDeltaKey,
      label: () => t(fieldKey("outlineDelta.label", "legendOutlineDelta.label"), sideValues()),
      hint: () => getLegendOutlineHint(),
      unit: "mm",
      step: 0.02,
      min: LEGEND_OUTLINE_MIN,
      max: LEGEND_OUTLINE_MAX,
      ...textVisibilityConfig,
    },
    {
      key: heightKey,
      label: () => t(fieldKey("height.label", "legendHeight.label"), sideValues()),
      hint: () => t(fieldKey("height.hint", "legendHeight.hint"), sideValues()),
      unit: "mm",
      step: 0.05,
      min: LEGEND_HEIGHT_SLIDER_MIN,
      dependentFieldKeys: isSideLegend ? [] : [embedKey],
      ...visibilityConfig,
    },
    ...(!isSideLegend ? [{
      key: embedKey,
      label: () => t(fieldKey("embed.label", "legendEmbed.label"), sideValues()),
      hint: () => t(fieldKey("embed.hint", "legendEmbed.hint"), sideValues()),
      unit: "mm",
      step: 0.05,
      min: 0,
      ...visibilityConfig,
    }] : []),
    {
      key: offsetXKey,
      label: () => t(fieldKey("offsetX.label", "legendOffsetX.label"), sideValues()),
      hint: () => t(fieldKey("offsetX.hint", "legendOffsetX.hint"), sideValues()),
      unit: "mm",
      step: 0.1,
      dependentFieldKeys: [offsetYKey],
      ...visibilityConfig,
    },
    {
      key: offsetYKey,
      label: () => t(fieldKey("offsetY.label", "legendOffsetY.label"), sideValues()),
      hint: () => t(fieldKey("offsetY.hint", "legendOffsetY.hint"), sideValues()),
      unit: "mm",
      step: 0.1,
      ...visibilityConfig,
    },
  ];
}

const fieldGroupTemplates = [
  {
    id: "shape",
    title: () => t("shapeProfiles.custom-shell.fieldGroups.shape.title"),
    description: (params) => (
      isTypewriterShapeProfile(params.shapeProfile)
        ? t("fieldGroups.shapeDescriptionTypewriter", getKeyUnitCopyValues())
        : t("fieldGroups.shapeDescriptionShell", getKeyUnitCopyValues())
    ),
    fields: [
      {
        key: "shapeProfile",
        label: () => t("fields.shapeProfile.label"),
        hint: () => t("fields.shapeProfile.hint"),
        type: "select",
        options: () => getShapeProfileOptions(),
      },
      {
        key: "keyWidth",
        label: () => t("fields.keyWidth.label"),
        hint: () => t("fields.keyWidth.hint", getKeyUnitCopyValues()),
        type: "linked-size",
        unit: "mm",
        step: 0.1,
        min: 10,
        primaryMiniLabel: () => t("fields.keyWidth.miniLabel"),
        secondaryLabel: () => t("fields.keyWidth.secondaryLabel"),
        secondaryField: "keySizeUnits",
        secondaryUnit: "u",
        secondaryStep: 0.05,
        secondaryMin: 0.5,
      },
      {
        key: "keyDepth",
        label: () => t("fields.keyDepth.label"),
        hint: () => t("fields.keyDepth.hint", getKeyUnitCopyValues()),
        type: "linked-size",
        unit: "mm",
        step: 0.1,
        min: 10,
        slider: {
          min: getKeySizeSliderMinimum,
          max: getKeySizeSliderMaximum,
          step: 0.1,
        },
        primaryMiniLabel: () => t("fields.keyDepth.miniLabel"),
        secondaryLabel: () => t("fields.keyDepth.secondaryLabel"),
        secondaryField: "keyDepthUnits",
        secondaryUnit: "u",
        secondaryStep: 0.05,
        secondaryMin: 0.5,
      },
      {
        key: "jisEnterNotchWidth",
        label: () => t("fields.jisEnterNotchWidth.label"),
        hint: (params) => getJisEnterNotchWidthHint(params),
        unit: "mm",
        step: 0.1,
        min: 0,
      },
      {
        key: "jisEnterNotchDepth",
        label: () => t("fields.jisEnterNotchDepth.label"),
        hint: (params) => getJisEnterNotchDepthHint(params),
        unit: "mm",
        step: 0.1,
        min: 0,
      },
      {
        key: "wallThickness",
        label: () => t("fields.wallThickness.label"),
        hint: () => t("fields.wallThickness.hint"),
        type: "number-pair",
        unit: "mm",
        step: 0.05,
        min: 0.4,
        slider: {
          min: 0.4,
          max: THICKNESS_SLIDER_MAX,
          step: 0.05,
        },
        primaryMiniLabel: () => t("fields.wallThickness.primaryMiniLabel"),
        secondaryLabel: () => t("fields.wallThickness.secondaryLabel"),
        secondaryField: "topThickness",
        secondaryUnit: "mm",
        secondaryStep: 0.05,
        secondaryMin: TOP_THICKNESS_MIN,
      },
      {
        key: "topThickness",
        label: () => t("fields.topThickness.label"),
        hint: () => t("fields.topThickness.hint"),
        unit: "mm",
        step: 0.05,
        min: TOP_THICKNESS_MIN,
        slider: {
          min: TOP_THICKNESS_MIN,
          max: THICKNESS_SLIDER_MAX,
          step: 0.05,
        },
      },
      {
        key: "typewriterCornerRadius",
        label: () => t("fields.typewriterCornerRadius.label"),
        hint: (params) => getTypewriterCornerRadiusHint(params),
        unit: "mm",
        step: 0.1,
        min: 0,
      },
      {
        key: "topScale",
        label: () => t("fields.topScale.label"),
        hint: () => t("fields.topScale.hint"),
        unit: "",
        step: 0.01,
        min: (params) => resolveTopScaleMinimum(params),
        max: 1,
        slider: {
          min: (params) => resolveTopScaleMinimum(params),
          max: TOP_SCALE_MAX,
          step: TOP_SCALE_STEP,
        },
      },
      {
        key: "keycapEdgeRadius",
        label: () => t("fields.keycapEdgeRadius.label"),
        hint: (params) => getKeycapEdgeRadiusHint(params),
        unit: "mm",
        step: 0.05,
        min: 0,
        max: (params) => getKeycapEdgeRadiusMax(params),
      },
      {
        key: "keycapShoulderRadius",
        label: () => t("fields.keycapShoulderRadius.label"),
        hint: (params) => getKeycapShoulderRadiusHint(params),
        unit: "mm",
        step: 0.05,
        min: (params) => getKeycapShoulderRadiusMin(params),
        max: (params) => getKeycapShoulderRadiusMax(params),
      },
      {
        key: "bodyColor",
        label: () => t("fields.bodyColor.label"),
        hint: () => t("fields.bodyColor.hint"),
        type: "color",
        placeholder: DEFAULT_KEYCAP_COLORS.bodyColor,
      },
    ],
  },
  {
    id: "top",
    title: () => t("shapeProfiles.custom-shell.fieldGroups.top.title"),
    description: () => t("fieldGroups.topDescription"),
    fields: [
      {
        key: "topCenterHeight",
        label: (params) => (isTypewriterShapeProfile(params.shapeProfile) ? t("fields.topCenterHeight.typewriterLabel") : t("fields.topCenterHeight.label")),
        hint: (params) => getTopCenterHeightHint(params),
        unit: "mm",
        step: 0.1,
        min: 1,
      },
      {
        key: "topOffsetX",
        label: () => t("fields.topOffset.label"),
        hint: () => t("fields.topOffset.hint"),
        type: "number-pair",
        unit: "mm",
        step: 0.1,
        primaryMiniLabel: () => t("fields.topOffsetX.label"),
        secondaryLabel: () => t("fields.topOffsetY.label"),
        secondaryField: "topOffsetY",
        secondaryUnit: "mm",
        secondaryStep: 0.1,
      },
      {
        key: "topOffsetY",
        label: () => t("fields.topOffsetY.label"),
        hint: () => t("fields.topOffsetY.hint"),
        unit: "mm",
        step: 0.1,
      },
      {
        key: "topSurfaceShape",
        label: () => t("fields.topSurfaceShape.label"),
        hint: () => getTopSurfaceShapeHint(),
        type: "select",
        options: TOP_SURFACE_SHAPE_OPTIONS,
        dependentFieldKeys: ["dishDepth"],
      },
      {
        key: "topCornerRadius",
        label: () => t("fields.topCornerRadius.label"),
        hint: (params) => getTopCornerRadiusHint(params),
        type: "corner-radius",
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopCornerRadiusMax(params),
      },
      {
        key: TOP_CORNER_RADIUS_INDIVIDUAL_FIELD_KEY,
        label: () => t("fields.topCornerRadiusIndividualEnabled.label"),
        hint: () => t("fields.topCornerRadiusIndividualEnabled.hint"),
        type: "checkbox",
      },
      {
        key: "topCornerRadiusLeftTop",
        label: () => t("fields.topCornerRadiusLeftTop.label"),
        hint: (params) => getTopCornerRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopCornerRadiusMax(params),
      },
      {
        key: "topCornerRadiusRightTop",
        label: () => t("fields.topCornerRadiusRightTop.label"),
        hint: (params) => getTopCornerRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopCornerRadiusMax(params),
      },
      {
        key: "topCornerRadiusRightBottom",
        label: () => t("fields.topCornerRadiusRightBottom.label"),
        hint: (params) => getTopCornerRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopCornerRadiusMax(params),
      },
      {
        key: "topCornerRadiusLeftBottom",
        label: () => t("fields.topCornerRadiusLeftBottom.label"),
        hint: (params) => getTopCornerRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopCornerRadiusMax(params),
      },
      {
        key: "dishDepth",
        label: () => t("fields.dishDepth.label"),
        hint: (params) => getDishDepthHint(params),
        unit: "mm",
        step: 0.05,
        min: (params) => -getDishDepthMax(params),
        max: (params) => getDishDepthMax(params),
        visibleWhen: (params) => params.topSurfaceShape !== "flat",
      },
      {
        key: "topHatEnabled",
        label: () => t("fields.topHatEnabled.label"),
        hint: () => t("fields.topHatEnabled.hint"),
        type: "checkbox",
        dependentFieldKeys: [
          "topHatSeparateColorEnabled",
          "topHatSurfaceShape",
          "topHatDishDepth",
          "topHatTopWidth",
          "topHatTopDepth",
          "topHatBottomWidth",
          "topHatBottomDepth",
          "topHatInset",
          "topHatTopRadius",
          "topHatBottomRadius",
          "topHatHeight",
          "topHatShoulderAngle",
          "topHatShoulderRadius",
        ],
      },
      {
        key: "topHatSeparateColorEnabled",
        label: () => t("fields.topHatSeparateColorEnabled.label"),
        hint: () => t("fields.topHatSeparateColorEnabled.hint"),
        type: "checkbox",
        visibleWhen: (params) => params.topHatEnabled && Number(params.topHatHeight ?? 0) > 0,
        dependentFieldKeys: ["topHatColor"],
      },
      {
        key: "topHatColor",
        label: () => t("fields.topHatColor.label"),
        hint: () => t("fields.topHatColor.hint"),
        type: "color",
        placeholder: DEFAULT_KEYCAP_COLORS.topHatColor,
        visibleWhen: (params) => params.topHatEnabled && params.topHatSeparateColorEnabled && Number(params.topHatHeight ?? 0) > 0,
      },
      {
        key: "topHatSurfaceShape",
        label: () => t("fields.topHatSurfaceShape.label"),
        hint: () => getTopHatSurfaceShapeHint(),
        type: "select",
        options: TOP_SURFACE_SHAPE_OPTIONS,
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatDishDepth",
        label: () => t("fields.topHatDishDepth.label"),
        hint: (params) => getTopHatDishDepthHint(params),
        unit: "mm",
        step: 0.05,
        min: (params) => -getTopHatDishDepthMax(params),
        max: (params) => getTopHatDishDepthMax(params),
        visibleWhen: (params) => params.topHatEnabled && params.topHatSurfaceShape !== "flat",
      },
      {
        key: "topHatTopWidth",
        label: () => t("fields.topHatTopWidth.label"),
        hint: (params) => getTopHatTopWidthHint(params),
        type: "linked-size",
        unit: "mm",
        step: 0.1,
        min: TOP_HAT_MIN_SIZE,
        primaryMiniLabel: () => t("fields.topHatTopWidth.miniLabel"),
        secondaryLabel: () => t("fields.topHatTopWidth.secondaryLabel"),
        secondaryField: "topHatTopWidthUnits",
        secondaryUnit: "u",
        secondaryStep: 0.05,
        secondaryMin: () => TOP_HAT_MIN_SIZE / getKeyUnitMm(),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatTopDepth",
        label: () => t("fields.topHatTopDepth.label"),
        hint: (params) => getTopHatTopDepthHint(params),
        type: "linked-size",
        unit: "mm",
        step: 0.1,
        min: TOP_HAT_MIN_SIZE,
        primaryMiniLabel: () => t("fields.topHatTopDepth.miniLabel"),
        secondaryLabel: () => t("fields.topHatTopDepth.secondaryLabel"),
        secondaryField: "topHatTopDepthUnits",
        secondaryUnit: "u",
        secondaryStep: 0.05,
        secondaryMin: () => TOP_HAT_MIN_SIZE / getKeyUnitMm(),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatBottomWidth",
        label: () => t("fields.topHatBottomWidth.label"),
        hint: (params) => getTopHatBottomWidthHint(params),
        type: "linked-size",
        unit: "mm",
        step: 0.1,
        min: (params) => getTopHatBottomWidthMin(params),
        max: (params) => getTopHatUsableFootprintLimits(params).width,
        primaryMiniLabel: () => t("fields.topHatBottomWidth.miniLabel"),
        secondaryLabel: () => t("fields.topHatBottomWidth.secondaryLabel"),
        secondaryField: "topHatBottomWidthUnits",
        secondaryUnit: "u",
        secondaryStep: 0.05,
        secondaryMin: (params) => getTopHatBottomWidthMin(params) / getKeyUnitMm(),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatBottomDepth",
        label: () => t("fields.topHatBottomDepth.label"),
        hint: (params) => getTopHatBottomDepthHint(params),
        type: "linked-size",
        unit: "mm",
        step: 0.1,
        min: (params) => getTopHatBottomDepthMin(params),
        max: (params) => getTopHatUsableFootprintLimits(params).depth,
        primaryMiniLabel: () => t("fields.topHatBottomDepth.miniLabel"),
        secondaryLabel: () => t("fields.topHatBottomDepth.secondaryLabel"),
        secondaryField: "topHatBottomDepthUnits",
        secondaryUnit: "u",
        secondaryStep: 0.05,
        secondaryMin: (params) => getTopHatBottomDepthMin(params) / getKeyUnitMm(),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatInset",
        label: () => t("fields.topHatInset.label"),
        hint: (params) => getTopHatInsetHint(params),
        unit: "mm",
        step: 0.1,
        min: 0,
        max: (params) => getJisEnterTopHatInsetMax(params),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatTopRadius",
        label: () => t("fields.topHatTopRadius.label"),
        hint: (params) => getTopHatTopRadiusHint(params),
        type: "corner-radius",
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatTopRadiusMax(params),
        individualFieldKey: TOP_HAT_TOP_RADIUS_INDIVIDUAL_FIELD_KEY,
        controlOrder: TOP_HAT_TOP_RADIUS_CONTROL_ORDER,
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatBottomRadius",
        label: () => t("fields.topHatBottomRadius.label"),
        hint: (params) => getTopHatBottomRadiusHint(params),
        type: "corner-radius",
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatBottomRadiusMax(params),
        individualFieldKey: TOP_HAT_BOTTOM_RADIUS_INDIVIDUAL_FIELD_KEY,
        controlOrder: TOP_HAT_BOTTOM_RADIUS_CONTROL_ORDER,
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: TOP_HAT_BOTTOM_RADIUS_INDIVIDUAL_FIELD_KEY,
        label: () => t("fields.topHatBottomRadiusIndividualEnabled.label"),
        hint: () => t("fields.topHatBottomRadiusIndividualEnabled.hint"),
        type: "checkbox",
      },
      {
        key: "topHatBottomRadiusLeftTop",
        label: () => t("fields.topHatBottomRadiusLeftTop.label"),
        hint: (params) => getTopHatBottomRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatBottomRadiusMax(params),
      },
      {
        key: "topHatBottomRadiusRightTop",
        label: () => t("fields.topHatBottomRadiusRightTop.label"),
        hint: (params) => getTopHatBottomRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatBottomRadiusMax(params),
      },
      {
        key: "topHatBottomRadiusRightBottom",
        label: () => t("fields.topHatBottomRadiusRightBottom.label"),
        hint: (params) => getTopHatBottomRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatBottomRadiusMax(params),
      },
      {
        key: "topHatBottomRadiusLeftBottom",
        label: () => t("fields.topHatBottomRadiusLeftBottom.label"),
        hint: (params) => getTopHatBottomRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatBottomRadiusMax(params),
      },
      {
        key: TOP_HAT_TOP_RADIUS_INDIVIDUAL_FIELD_KEY,
        label: () => t("fields.topHatTopRadiusIndividualEnabled.label"),
        hint: () => t("fields.topHatTopRadiusIndividualEnabled.hint"),
        type: "checkbox",
      },
      {
        key: "topHatTopRadiusLeftTop",
        label: () => t("fields.topHatTopRadiusLeftTop.label"),
        hint: (params) => getTopHatTopRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatTopRadiusMax(params),
      },
      {
        key: "topHatTopRadiusRightTop",
        label: () => t("fields.topHatTopRadiusRightTop.label"),
        hint: (params) => getTopHatTopRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatTopRadiusMax(params),
      },
      {
        key: "topHatTopRadiusRightBottom",
        label: () => t("fields.topHatTopRadiusRightBottom.label"),
        hint: (params) => getTopHatTopRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatTopRadiusMax(params),
      },
      {
        key: "topHatTopRadiusLeftBottom",
        label: () => t("fields.topHatTopRadiusLeftBottom.label"),
        hint: (params) => getTopHatTopRadiusHint(params),
        unit: "mm",
        step: TOP_CORNER_RADIUS_STEP,
        min: 0,
        max: (params) => getTopHatTopRadiusMax(params),
      },
      {
        key: "topHatHeight",
        label: () => t("fields.topHatHeight.label"),
        hint: (params) => getTopHatHeightHint(params),
        unit: "mm",
        step: 0.05,
        min: (params) => getTopHatHeightMin(params),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatShoulderAngle",
        label: () => t("fields.topHatShoulderAngle.label"),
        hint: () => t("fields.topHatShoulderAngle.hint"),
        unit: "deg",
        step: 0.5,
        min: TOP_HAT_MIN_SHOULDER_ANGLE,
        max: TOP_HAT_MAX_SHOULDER_ANGLE,
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "topHatShoulderRadius",
        label: () => t("fields.topHatShoulderRadius.label"),
        hint: (params) => getTopHatShoulderRadiusHint(params),
        unit: "mm",
        step: 0.05,
        min: (params) => getTopHatShoulderRadiusMin(params),
        max: (params) => getTopHatShoulderRadiusMax(params),
        visibleWhen: (params) => params.topHatEnabled,
      },
      {
        key: "rimEnabled",
        label: () => t("fields.rimEnabled.label"),
        hint: () => t("fields.rimEnabled.hint"),
        type: "checkbox",
      },
      {
        key: "rimWidth",
        label: () => t("fields.rimWidth.label"),
        hint: (params) => getTypewriterRimWidthHint(params),
        unit: "mm",
        step: 0.1,
        min: 0,
        visibleWhen: (params) => params.rimEnabled,
      },
      {
        key: "rimHeightUp",
        label: () => t("fields.rimHeightUp.label"),
        hint: () => getTypewriterRimHeightUpHint(),
        unit: "mm",
        step: 0.05,
        min: 0,
        visibleWhen: (params) => params.rimEnabled,
      },
      {
        key: "rimHeightDown",
        label: () => t("fields.rimHeightDown.label"),
        hint: () => getTypewriterRimHeightDownHint(),
        unit: "mm",
        step: 0.05,
        min: 0,
        visibleWhen: (params) => params.rimEnabled,
      },
      {
        key: "rimColor",
        label: () => t("fields.rimColor.label"),
        hint: () => t("fields.rimColor.hint"),
        type: "color",
        placeholder: DEFAULT_KEYCAP_COLORS.rimColor,
        visibleWhen: (params) => params.rimEnabled,
      },
      {
        key: "topSlopeInputMode",
        label: () => t("fields.topSlopeInputMode.label"),
        hint: () => t("fields.topSlopeInputMode.hint"),
        type: "select",
        options: TOP_SLOPE_INPUT_MODE_OPTIONS,
        dependentFieldKeys: [
          "topPitchDeg",
          "topRollDeg",
          "topFrontHeight",
          "topBackHeight",
          "topLeftHeight",
          "topRightHeight",
        ],
      },
      {
        key: "topPitchDeg",
        label: () => t("fields.topPitchDeg.label"),
        hint: (params) => getTopPitchHint(params),
        unit: "deg",
        step: 0.1,
        visibleWhen: (params) => params.topSlopeInputMode === "angle",
      },
      {
        key: "topRollDeg",
        label: () => t("fields.topRollDeg.label"),
        hint: (params) => getTopRollHint(params),
        unit: "deg",
        step: 0.1,
        visibleWhen: (params) => params.topSlopeInputMode === "angle",
      },
      {
        key: "topFrontHeight",
        label: () => t("fields.topFrontHeight.label"),
        hint: (params) => getTopFrontHeightHint(params),
        unit: "mm",
        step: 0.1,
        visibleWhen: (params) => params.topSlopeInputMode === "edge-height",
      },
      {
        key: "topBackHeight",
        label: () => t("fields.topBackHeight.label"),
        hint: (params) => getTopBackHeightHint(params),
        unit: "mm",
        step: 0.1,
        visibleWhen: (params) => params.topSlopeInputMode === "edge-height",
      },
      {
        key: "topLeftHeight",
        label: () => t("fields.topLeftHeight.label"),
        hint: (params) => getTopLeftHeightHint(params),
        unit: "mm",
        step: 0.1,
        visibleWhen: (params) => params.topSlopeInputMode === "edge-height",
      },
      {
        key: "topRightHeight",
        label: () => t("fields.topRightHeight.label"),
        hint: (params) => getTopRightHeightHint(params),
        unit: "mm",
        step: 0.1,
        visibleWhen: (params) => params.topSlopeInputMode === "edge-height",
      },
    ],
  },
  {
    id: "legend",
    title: () => t("shapeProfiles.custom-shell.fieldGroups.legend.title"),
    description: () => t("shapeProfiles.custom-shell.fieldGroups.legend.description"),
    fields: [
      ...TOP_LEGEND_CONFIGS.flatMap((config) => createLegendControlFields({
        paramPrefix: config.paramPrefix,
        collapseControlled: true,
      })),
      ...SIDE_LEGEND_CONFIGS.flatMap((config) => createLegendControlFields({
        paramPrefix: config.paramPrefix,
        side: config.side,
        collapseControlled: true,
      })),
    ],
  },
  {
    id: "homing",
    title: () => t("shapeProfiles.custom-shell.fieldGroups.homing.title"),
    description: () => t("shapeProfiles.custom-shell.fieldGroups.homing.description"),
    fields: [
      { key: "homingBarEnabled", label: () => t("fields.homingBarEnabled.label"), hint: () => t("fields.homingBarEnabled.hint"), type: "checkbox" },
      {
        key: "homingBarColor",
        label: () => t("fields.homingBarColor.label"),
        hint: () => t("fields.homingBarColor.hint"),
        type: "color",
        placeholder: DEFAULT_KEYCAP_COLORS.homingBarColor,
        visibleWhen: (params) => params.homingBarEnabled,
      },
      {
        key: "homingBarLength",
        label: () => t("fields.homingBarLength.label"),
        hint: () => t("fields.homingBarLength.hint"),
        unit: "mm",
        step: 0.1,
        min: 0.5,
        dependentFieldKeys: ["homingBarWidth", "homingBarChamfer"],
        visibleWhen: (params) => params.homingBarEnabled,
      },
      {
        key: "homingBarWidth",
        label: () => t("fields.homingBarWidth.label"),
        hint: () => t("fields.homingBarWidth.hint"),
        unit: "mm",
        step: 0.05,
        min: 0.1,
        visibleWhen: (params) => params.homingBarEnabled,
      },
      {
        key: "homingBarHeight",
        label: () => t("fields.homingBarHeight.label"),
        hint: () => t("fields.homingBarHeight.hint"),
        unit: "mm",
        step: 0.05,
        min: 0.05,
        dependentFieldKeys: ["homingBarOffsetY"],
        visibleWhen: (params) => params.homingBarEnabled,
      },
      {
        key: "homingBarChamfer",
        label: () => t("fields.homingBarChamfer.label"),
        hint: () => t("fields.homingBarChamfer.hint"),
        unit: "mm",
        step: 0.05,
        min: 0,
        visibleWhen: (params) => params.homingBarEnabled,
      },
      {
        key: "homingBarOffsetY",
        label: () => t("fields.homingBarOffsetY.label"),
        hint: () => t("fields.homingBarOffsetY.hint"),
        unit: "mm",
        step: 0.1,
        visibleWhen: (params) => params.homingBarEnabled,
      },
    ],
  },
  {
    id: "stem",
    title: () => t("shapeProfiles.custom-shell.fieldGroups.stem.title"),
    description: (params) => getStemGroupDescription(params),
    fields: [
      {
        key: "stemType",
        label: () => t("fields.stemType.label"),
        hint: () => t("fields.stemType.hint"),
        type: "select",
        options: STEM_TYPE_OPTIONS,
      },
      {
        key: "jStemLp01PreviewColor",
        label: () => t("fields.jStemLp01PreviewColor.label"),
        hint: () => t("fields.jStemLp01PreviewColor.hint"),
        type: "preview-color-swatch",
        options: J_STEM_LP01_PREVIEW_COLOR_OPTIONS,
        visibleWhen: (params) => resolveStemType(params) === "j_stem_lp01",
      },
      {
        key: "typewriterMountHeight",
        label: () => t("fields.typewriterMountHeight.label"),
        hint: (params) => getTypewriterMountHeightHint(params),
        unit: "mm",
        step: 0.1,
        min: 1,
        visibleWhen: (params) => params.stemEnabled,
      },
      {
        key: "stemOuterDelta",
        label: () => t("fields.stemOuterDelta.label"),
        hint: (params) => getStemOuterHint(params),
        unit: "mm",
        step: 0.02,
        visibleWhen: (params) => params.stemEnabled && isCrossCompatibleStemType(resolveStemType(params)),
      },
      {
        key: "stemCrossMargin",
        label: () => t("fields.stemCrossMargin.label"),
        hint: (params) => getStemFitHint(params),
        unit: "mm",
        step: 0.02,
        visibleWhen: (params) => params.stemEnabled,
      },
      {
        key: "stemCrossChamfer",
        label: () => t("fields.stemCrossChamfer.label"),
        hint: (params) => getStemChamferHint(params),
        unit: "mm",
        step: 0.05,
        min: 0,
        visibleWhen: (params) => params.stemEnabled && isCrossCompatibleStemType(resolveStemType(params)),
      },
      {
        key: "stemInsetDelta",
        label: () => t("fields.stemInsetDelta.label"),
        hint: (params) => getStemInsetHint(params),
        unit: "mm",
        step: 0.05,
        min: (params) => resolveStemType(params) === "j_stem_lp01" ? 0 : -STEM_INSET_DELTA_SLIDER_MAX,
        max: STEM_INSET_DELTA_SLIDER_MAX,
        visibleWhen: (params) => params.stemEnabled,
      },
    ],
  },
];

const fieldConfigByKey = new Map([
  [DESIGN_NAME_FIELD.key, DESIGN_NAME_FIELD],
  ...fieldGroupTemplates.flatMap((group) => group.fields).map((field) => [field.key, field]),
]);
function createFieldGroupCollapseState() {
  const groupIds = keycapEditorProfiles.profiles.flatMap((profile) => (profile.fieldGroups ?? []).map((group) => group.id));
  return {
    ...Object.fromEntries(Array.from(new Set(groupIds)).map((groupId) => [groupId, true])),
    ...Object.fromEntries(LEGEND_CARD_DEFINITIONS.map((card) => [card.id, true])),
    ...Object.fromEntries(STEM_CARD_DEFINITIONS.map((card) => [card.id, true])),
  };
}

const FIELD_GROUP_DESCRIPTION_RESOLVERS = Object.freeze({
  "stem-group": (params) => getStemGroupDescription(params),
});

function getFieldConfig(fieldKey, profileKey = state.keycapParams?.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY) {
  if (fieldKey === KEY_UNIT_FIELD_KEY) {
    return getKeyUnitBasisFieldConfig();
  }

  const baseField = fieldConfigByKey.get(fieldKey);
  if (!baseField) {
    return null;
  }

  const override = getShapeProfileFieldOverride(profileKey, fieldKey) ?? {};
  const fieldConfig = {
    ...baseField,
    ...override,
  };

  if (fieldKey === "topCenterHeight") {
    fieldConfig.label = baseField.label;
    fieldConfig.hint = baseField.hint;
  }

  return fieldConfig;
}

function getActiveFieldGroups(profileKey = state.keycapParams?.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY) {
  const unitCopyValues = getKeyUnitCopyValues();

  return getShapeProfileFieldGroups(profileKey)
    .map((group) => ({
      ...group,
      title: t(`shapeProfiles.${profileKey}.fieldGroups.${group.id}.title`, {}, resolveDynamicCopy(group.title)),
      fields: getGroupFieldConfigs(group, profileKey),
      description: group.descriptionKey != null
        ? (FIELD_GROUP_DESCRIPTION_RESOLVERS[group.descriptionKey] ?? group.description ?? "")
        : t(`shapeProfiles.${profileKey}.fieldGroups.${group.id}.description`, unitCopyValues, resolveDynamicCopy(group.description)),
    }));
}

function getGroupFieldConfigs(group, profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  const fields = (group.fieldKeys ?? [])
    .map((fieldKey) => getFieldConfig(fieldKey, profileKey))
    .filter(Boolean);

  if (group.id !== "shape") {
    return fields;
  }

  const keyWidthIndex = fields.findIndex((field) => field.key === "keyWidth");
  const insertIndex = keyWidthIndex >= 0 ? keyWidthIndex : fields.length;
  fields.splice(insertIndex, 0, getKeyUnitBasisFieldConfig());
  return fields;
}

function getKeyUnitBasisFieldConfig() {
  return {
    key: KEY_UNIT_FIELD_KEY,
    type: "key-unit-basis",
    label: () => t("unitBasis.fieldLabel"),
    hint: () => t("unitBasis.fieldHint"),
    unit: "mm",
    min: KEY_UNIT_MIN_MM,
    step: 0.05,
    slider: {
      min: KEY_UNIT_SLIDER_MIN_MM,
      max: KEY_UNIT_SLIDER_MAX_MM,
      step: 0.05,
      guide: DEFAULT_KEY_UNIT_MM,
    },
  };
}

function getShapeProfileVisibleFieldKeys(profileKey = DEFAULT_SHAPE_PROFILE_KEY) {
  return new Set(
    getShapeProfileFieldGroups(profileKey)
      .flatMap((group) => (group.fieldKeys ?? []).flatMap((fieldKey) => {
        const fieldConfig = getFieldConfig(fieldKey, profileKey);
        return [fieldKey, fieldConfig?.secondaryField];
      }))
      .filter(Boolean),
  );
}

const initialLocale = getInitialLocale();
const initialTheme = getInitialTheme();
const initialKeycapParams = syncDerivedKeycapParams(createInitialKeycapParams());

const state = {
  locale: initialLocale,
  theme: initialTheme,
  isLanguageMenuOpen: false,
  exportsStatus: "idle",
  exportsSummary: translate(initialLocale, "status.notGenerated"),
  exportHistory: [],
  projectStatus: "idle",
  projectSummary: "",
  project: createProjectStateWithActiveKeycap({
    fallbackKeycapParams: initialKeycapParams,
  }),
  keycapExportOverlayKeycapId: "",
  keycapDesignOverlayKeycapId: "",
  editorStatus: "idle",
  editorSummary: translate(initialLocale, "status.notGenerated"),
  editorLogs: [],
  editorError: "",
  previewLayers: [],
  sidebarTab: "design",
  isMobileInspectorHidden: false,
  isImportDragActive: false,
  lastImportBindingReport: null,
  isImportBindingNoticeCollapsed: false,
  legendFontPickerFieldKey: "",
  legendFontPickerQuery: "",
  legendFontPickerSegment: LEGEND_FONT_PICKER_SEGMENT_BUILTIN,
  legendFontSourceEditorFieldKey: "",
  legendFontSourceInputMode: LEGEND_FONT_SOURCE_MODE_GOOGLE,
  legendIconPickerFieldKey: "",
  legendIconPickerQuery: "",
  copiedFontAttributionKey: "",
  copiedIconAttributionKey: "",
  collapsedFieldGroups: createFieldGroupCollapseState(),
  keyUnitMm: readKeyUnitMmPreference(),
  keycapParams: initialKeycapParams,
};

applyDocumentLocale(state.locale);
applyTheme(state.theme);

if (!app) {
  throw new Error(t("errors.appRootMissing"));
}

function formatCssPixelValue(value) {
  return `${Math.max(value, 0).toFixed(2)}px`;
}

function syncVisualViewportMetrics() {
  const viewport = window.visualViewport;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportOffsetTop = viewport?.offsetTop ?? 0;
  const browserUiInsetBottom = viewport
    ? Math.max(window.innerHeight - viewportHeight - viewportOffsetTop, 0)
    : 0;
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty("--visual-viewport-height", formatCssPixelValue(viewportHeight));
  rootStyle.setProperty("--visual-viewport-offset-top", formatCssPixelValue(viewportOffsetTop));
  rootStyle.setProperty("--browser-ui-inset-bottom", formatCssPixelValue(browserUiInsetBottom));
}

function getViewportLayoutMode() {
  if (window.innerWidth <= 760) {
    return "stack";
  }

  const shellPadding = 48;
  const columnGap = 20;
  const sidebarWidth = Math.min(420, Math.max(320, window.innerWidth * 0.34));
  const previewSize = Math.min(window.innerHeight - 48, window.innerWidth - 48);
  const availableWidth = window.innerWidth - shellPadding;

  return availableWidth >= sidebarWidth + columnGap + previewSize ? "centered" : "overlap";
}

function isUiMotionEnabled() {
  return supportsUiViewTransitions && !reduceMotionQuery?.matches;
}

function toKebabCase(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function createViewTransitionName(prefix, value) {
  const normalized = toKebabCase(value);
  return `${prefix}-${normalized || "item"}`;
}

function formatMillimeter(value, digits = 1) {
  return `${Number(value).toFixed(digits)} mm`;
}

function formatDegree(value, digits = 1) {
  return `${Number(value).toFixed(digits)}deg`;
}

function countStepDigits(step) {
  const rawStep = `${step ?? ""}`;
  if (!rawStep.includes(".")) {
    return 0;
  }

  return rawStep.split(".")[1].replace(/0+$/, "").length;
}

function formatNumericFieldValue(fieldKey, value, stepOverride = null) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return "";
  }

  const fieldConfig = getFieldConfig(fieldKey);
  const digits = Math.min(countStepDigits(stepOverride ?? fieldConfig?.step) + 1, 3);
  return `${Number(nextValue.toFixed(digits))}`;
}

function formatUnitInputValue(value = state.keycapParams.keyWidth) {
  return (Number(value) / getKeyUnitMm()).toFixed(2);
}

function resolvePublicAssetUrl(relativePath) {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(relativePath, baseUrl).toString();
}

function getJStemLp01ReferenceMeshPromise() {
  jStemLp01ReferenceMeshPromise ??= loadJStemLp01ReferenceMesh(
    resolvePublicAssetUrl(J_STEM_LP01_REFERENCE_OFF_PATH),
  );
  return jStemLp01ReferenceMeshPromise;
}

async function createJStemLp01ReferencePreviewLayer(params = state.keycapParams) {
  const mesh = await getJStemLp01ReferenceMeshPromise();
  const previewStyle = getJStemLp01PreviewStyle(params.jStemLp01PreviewColor);

  return {
    name: "j-stem-lp01",
    ...previewStyle,
    mesh: transformJStemLp01ReferenceMesh(mesh, params),
  };
}

function getParameterGroupIconPath(groupId) {
  return PARAMETER_GROUP_ICON_PATHS[groupId] ?? PARAMETER_GROUP_ICON_PATHS.shape;
}

function getParameterGroupCaption(groupId) {
  const captionKey = PARAMETER_GROUP_CAPTION_KEYS[groupId];
  return captionKey ? t(captionKey, {}, "") : "";
}

function renderParameterGroupIcon(groupId) {
  const iconUrl = resolvePublicAssetUrl(getParameterGroupIconPath(groupId));
  const iconSymbolClass = groupId === "stem"
    ? "field-group-card__icon-symbol field-group-card__icon-symbol--stem"
    : "field-group-card__icon-symbol";

  return `
    <span class="field-group-card__icon" aria-hidden="true">
      <span
        class="${iconSymbolClass}"
        style="--field-group-icon: url('${escapeHtml(iconUrl)}');"
      ></span>
    </span>
  `;
}

function renderFieldLeadingIcon(iconPath) {
  const iconUrl = resolvePublicAssetUrl(iconPath);

  return `
    <span class="field-leading-icon" aria-hidden="true">
      <span
        class="field-leading-icon__symbol"
        style="--field-leading-icon: url('${escapeHtml(iconUrl)}');"
      ></span>
    </span>
  `;
}

function getLeadingIconFieldClassName(leadingIcon) {
  return leadingIcon ? " field--with-leading-icon" : "";
}

function renderKeyUnitBasisIcon() {
  return renderFieldLeadingIcon(KEY_UNIT_BASIS_ICON_PATH);
}

function renderKeyDepthBasisIcon() {
  return renderFieldLeadingIcon(KEY_DEPTH_BASIS_ICON_PATH);
}

function renderKeyWallThicknessIcon() {
  return renderFieldLeadingIcon(KEY_WALL_THICKNESS_ICON_PATH);
}

function renderKeyTopTaperIcon() {
  return renderFieldLeadingIcon(KEY_TOP_TAPER_ICON_PATH);
}

function renderKeycapEdgeRadiusIcon() {
  return renderFieldLeadingIcon(KEYCAP_EDGE_RADIUS_ICON_PATH);
}

function renderKeycapShoulderRadiusIcon() {
  return renderFieldLeadingIcon(KEYCAP_SHOULDER_RADIUS_ICON_PATH);
}

function renderKeyTopCenterHeightIcon() {
  return renderFieldLeadingIcon(KEY_TOP_CENTER_HEIGHT_ICON_PATH);
}

function renderKeyTopOffsetIcon() {
  return renderFieldLeadingIcon(KEY_TOP_OFFSET_ICON_PATH);
}

function renderKeyTopSurfaceShapeIcon() {
  return renderFieldLeadingIcon(KEY_TOP_SURFACE_SHAPE_ICON_PATH);
}

function renderKeyTopHatIcon() {
  return renderFieldLeadingIcon(KEY_TOP_HAT_ICON_PATH);
}

function renderKeyTopSlopeInputModeIcon() {
  return renderFieldLeadingIcon(KEY_TOP_SLOPE_INPUT_MODE_ICON_PATH);
}

function getColorFieldValue(fieldKey, params = state.keycapParams) {
  return normalizeHexColor(params[fieldKey]) ?? DEFAULT_KEYCAP_COLORS[fieldKey];
}

function getColorFieldNumber(fieldKey, params = state.keycapParams) {
  return hexColorToNumber(getColorFieldValue(fieldKey, params));
}

function getPartLabel(partName) {
  const topLegendConfig = TOP_LEGEND_CONFIGS.find((config) => partName === config.partName);
  if (topLegendConfig) {
    return t("partLabels.topLegend", { position: t(topLegendConfig.titleKey) });
  }

  const sideLegendConfig = SIDE_LEGEND_CONFIGS.find((config) => partName === `legend-${config.side}`);
  if (sideLegendConfig) {
    return t("partLabels.sideLegend", { side: getSideLegendLabel(sideLegendConfig.side) });
  }

  switch (partName) {
    case "rim":
      return t("partLabels.rim");
    case "top-hat":
      return t("partLabels.topHat");
    case "legend":
      return t("partLabels.legend");
    case "homing":
      return t("partLabels.homing");
    case "j-stem-lp01":
      return t("partLabels.jStemLp01");
    default:
      return t("partLabels.body");
  }
}

function describePartLabels(parts) {
  return parts.map((part) => getPartLabel(part)).join(t("format.listSeparator"));
}

function setColorInputValidity(input, isValid) {
  input.setAttribute("aria-invalid", isValid ? "false" : "true");
  input.closest(".field-control")?.classList.toggle("is-invalid", !isValid);
}

function syncColorChip(fieldKey, colorValue = getColorFieldValue(fieldKey)) {
  app
    .querySelector(`[data-color-chip="${fieldKey}"]`)
    ?.style
    .setProperty("--field-color", colorValue);
}

function unwrapColorisFieldWrappers(root = app) {
  root?.querySelectorAll("input[data-coloris]").forEach((input) => {
    const wrapper = input.parentElement;
    if (!(wrapper instanceof HTMLElement) || !wrapper.classList.contains("clr-field")) {
      return;
    }

    wrapper.replaceWith(input);
  });
}

function configureColoris() {
  if (typeof window.Coloris !== "function") {
    return;
  }

  window.Coloris({
    parent: "body",
    alpha: false,
    format: "hex",
    theme: "pill",
    themeMode: state.theme,
    wrap: false,
    margin: 8,
    closeButton: true,
    closeLabel: t("actions.close"),
    swatches: COLORIS_SWATCHES,
  });

  unwrapColorisFieldWrappers();
}

function ensureColorisStylesheet() {
  if (document.querySelector('link[data-coloris-style="true"]')) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = resolvePublicAssetUrl(COLORIS_STYLE_PATH);
  link.dataset.colorisStyle = "true";
  document.head.append(link);
}

function ensureColorisLoaded() {
  ensureColorisStylesheet();

  if (typeof window.Coloris === "function") {
    configureColoris();
    return Promise.resolve(window.Coloris);
  }

  if (colorisLoadPromise) {
    return colorisLoadPromise;
  }

  colorisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = resolvePublicAssetUrl(COLORIS_SCRIPT_PATH);
    script.async = true;
    script.dataset.colorisScript = "true";
    script.addEventListener("load", () => {
      configureColoris();
      resolve(window.Coloris);
    }, { once: true });
    script.addEventListener("error", () => {
      colorisLoadPromise = null;
      reject(new Error(t("errors.colorisLoadFailed")));
    }, { once: true });
    document.head.append(script);
  });

  return colorisLoadPromise;
}

function isLegendTextSet(value = state.keycapParams.legendText) {
  return String(value ?? "").trim().length > 0;
}

function isTopLegendRenderable(config, params = state.keycapParams) {
  const enabledKey = legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled);
  const textKey = legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.text);
  return params[enabledKey] && isLegendTextSet(params[textKey]);
}

function isSideLegendRenderable(config, params = state.keycapParams) {
  const enabledKey = legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled);
  const textKey = legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.text);
  return params[enabledKey] && isLegendTextSet(params[textKey]);
}

function isTypewriterRimRenderable(params = state.keycapParams) {
  return isTypewriterShapeProfile(params.shapeProfile)
    && params.rimEnabled
    && Number(params.rimWidth) > 0;
}

function renderShell() {
  if (app.querySelector(".app-shell")) {
    return;
  }

  app.innerHTML = `
    <main class="app-shell">
      <div class="drop-overlay" data-import-drop-overlay aria-hidden="true" hidden>
        <div class="drop-overlay__card">
          <span class="drop-overlay__icon" aria-hidden="true">${EXPORT_ICON_MARKUP.file}</span>
          <span class="drop-overlay__copy">
            <strong data-i18n="dropOverlay.title"></strong>
            <span data-i18n="dropOverlay.body"></span>
          </span>
          <span class="drop-overlay__chip" data-i18n="dropOverlay.chip" aria-hidden="true"></span>
        </div>
      </div>
      <div data-keycap-export-overlay-root></div>
      <div class="app-top-controls">
        <div class="theme-control" data-theme-control></div>
        <div class="language-control" data-language-control></div>
      </div>
      <section class="editor-screen">
        <aside class="left-column">
          <div class="mobile-inspector-shell">
            <article class="inspector-card">
              <nav
                class="segment-control"
                data-i18n-aria-label="navigation.label"
                data-segment-control
                style="--segment-count: ${workspaceSections.length}; --segment-index: 0;"
              >
                <span class="segment-control__indicator" aria-hidden="true"></span>
                ${workspaceSections
                  .map(
                    (section) => `
                      <button
                        class="segment-link"
                        type="button"
                        data-sidebar-tab="${section.id}"
                        aria-pressed="false"
                      >
                        ${getWorkspaceSectionLabel(section)}
                      </button>
                    `,
                  )
                  .join("")}
              </nav>
              <div class="inspector-content" data-inspector-content></div>
            </article>
            <button
              class="mobile-inspector-toggle"
              type="button"
              data-mobile-inspector-toggle
            >
              <span data-mobile-inspector-toggle-icon aria-hidden="true">↑</span>
            </button>
          </div>
        </aside>

        <section class="right-column">
          <div class="preview-area">
            <div class="preview-stage">
              <div class="preview-stage__canvas" data-preview-stage></div>
            </div>
          </div>
        </section>
      </section>
    </main>
  `;

  app.querySelector("[data-keycap-export-overlay-root]")?.addEventListener("click", handleKeycapExportOverlayClick);
  app.querySelector("[data-segment-control]")?.addEventListener("click", handleSegmentControlClick);
  app.querySelector("[data-theme-control]")?.addEventListener("click", handleThemeControlClick);
  app.querySelector("[data-language-control]")?.addEventListener("click", handleLanguageControlClick);
  app.querySelector("[data-mobile-inspector-toggle]")?.addEventListener("click", handleMobileInspectorToggleClick);
  app.querySelector(".inspector-card")?.addEventListener("click", handleInspectorCardClick);
  app.querySelector(".inspector-card")?.addEventListener("input", handleInspectorCardInput);
  app.querySelector(".inspector-card")?.addEventListener("change", handleInspectorCardChange);
  app.querySelector(".inspector-card")?.addEventListener("wheel", handleInspectorCardWheel, { passive: false });
  app.querySelector(".inspector-card")?.addEventListener("compositionend", handleInspectorCardCompositionEnd);
  app.querySelector(".inspector-card")?.addEventListener("keydown", handleInspectorCardKeydown);
  app.querySelector(".inspector-card")?.addEventListener("dragstart", handleInspectorCardDragStart);
  app.querySelector(".inspector-card")?.addEventListener("dragover", handleInspectorCardDragOver);
  app.querySelector(".inspector-card")?.addEventListener("drop", handleInspectorCardDrop);
  app.querySelector(".inspector-card")?.addEventListener("dragend", handleInspectorCardDragEnd);
  attachEditorDataDropListeners();
  renderPersistentShellCopy();
  renderThemeControl();
  renderLanguageControl();
  syncImportDropOverlay();
  renderPreviewViewer();
}

function renderLayout() {
  const editorScreen = app.querySelector(".editor-screen");
  if (!editorScreen) {
    return;
  }

  editorScreen.className = [
    "editor-screen",
    `editor-screen--${viewportLayoutMode}`,
    state.isMobileInspectorHidden ? "editor-screen--inspector-hidden" : "",
  ].filter(Boolean).join(" ");

  const mobileInspectorToggle = app.querySelector("[data-mobile-inspector-toggle]");
  const mobileInspectorToggleIcon = app.querySelector("[data-mobile-inspector-toggle-icon]");
  if (mobileInspectorToggle) {
    const label = state.isMobileInspectorHidden
      ? t("mobileInspector.show")
      : t("mobileInspector.hide");
    mobileInspectorToggle.setAttribute("aria-label", label);
    mobileInspectorToggle.setAttribute("title", label);
    mobileInspectorToggle.setAttribute("aria-expanded", state.isMobileInspectorHidden ? "false" : "true");
  }
  if (mobileInspectorToggleIcon) {
    mobileInspectorToggleIcon.textContent = state.isMobileInspectorHidden ? "↓" : "↑";
  }
}

function renderPersistentShellCopy() {
  app.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  app.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
}

function renderThemeControl() {
  const container = app.querySelector("[data-theme-control]");
  if (!container) {
    return;
  }

  const activeThemeIndex = Math.max(THEME_OPTIONS.indexOf(state.theme), 0);
  const buttons = THEME_OPTIONS.map((theme) => {
    const isSelected = theme === state.theme;
    const iconMarkup = theme === "light" ? SUN_ICON_MARKUP : MOON_ICON_MARKUP;
    const label = t(`theme.options.${theme}`);

    return `
      <button
        class="theme-switch__button ${isSelected ? "is-selected" : ""}"
        type="button"
        data-theme-option="${theme}"
        aria-label="${escapeHtml(label)}"
        aria-pressed="${isSelected ? "true" : "false"}"
        title="${escapeHtml(label)}"
      >
        <span class="theme-switch__icon" aria-hidden="true">${iconMarkup}</span>
      </button>
    `;
  }).join("");

  container.innerHTML = `
    <div
      class="theme-switch"
      role="group"
      aria-label="${escapeHtml(t("theme.ariaLabel"))}"
      style="--theme-index: ${activeThemeIndex};"
    >
      <span class="theme-switch__indicator" aria-hidden="true"></span>
      ${buttons}
    </div>
  `;
}

function syncThemeControl({ animate = false } = {}) {
  const themeSwitch = app.querySelector(".theme-switch");
  if (!themeSwitch) {
    renderThemeControl();
    return;
  }

  const activeThemeIndex = Math.max(THEME_OPTIONS.indexOf(state.theme), 0);
  themeSwitch.style.setProperty("--theme-index", `${activeThemeIndex}`);
  themeSwitch.setAttribute("aria-label", t("theme.ariaLabel"));

  if (animate && !reduceMotionQuery?.matches) {
    themeSwitch.classList.remove("is-switching");
    void themeSwitch.offsetWidth;
    themeSwitch.classList.add("is-switching");
    window.setTimeout(() => {
      themeSwitch.classList.remove("is-switching");
      themeSwitch
        .querySelectorAll(".theme-switch__button.is-activating")
        .forEach((button) => button.classList.remove("is-activating"));
    }, THEME_SWITCH_ANIMATION_DURATION_MS);
  }

  themeSwitch.querySelectorAll("[data-theme-option]").forEach((button) => {
    const theme = button.dataset.themeOption;
    const isSelected = theme === state.theme;
    const label = t(`theme.options.${theme}`);

    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-activating", animate && isSelected && !reduceMotionQuery?.matches);
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    button.setAttribute("title", label);
  });
}

function renderLanguageControl() {
  const container = app.querySelector("[data-language-control]");
  if (!container) {
    return;
  }

  if (!container.querySelector(".language-combobox")) {
    container.innerHTML = `
      <div class="language-combobox">
      <button
        class="language-combobox__button"
        type="button"
        data-language-toggle
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls="language-options"
      >
        <span class="language-combobox__icon" aria-hidden="true">${GLOBE_ICON_MARKUP}</span>
        <span class="language-combobox__label"></span>
      </button>
      <div class="language-combobox__menu" id="language-options" role="listbox" aria-hidden="true" inert>
          ${LOCALE_OPTIONS.map((option) => {
            const isSelected = option.value === state.locale;
            return `
              <button
                class="language-combobox__option ${isSelected ? "is-selected" : ""}"
                type="button"
                role="option"
                aria-selected="${isSelected ? "true" : "false"}"
                data-language-option="${option.value}"
                tabindex="-1"
              >
                ${escapeHtml(t(option.labelKey))}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  syncLanguageControl();
}

function syncLanguageControl() {
  const combobox = app.querySelector(".language-combobox");
  if (!combobox) {
    return;
  }

  const isOpen = state.isLanguageMenuOpen;
  const toggleButton = combobox.querySelector("[data-language-toggle]");
  const label = combobox.querySelector(".language-combobox__label");
  const menu = combobox.querySelector(".language-combobox__menu");

  combobox.classList.toggle("is-open", isOpen);

  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggleButton.setAttribute("aria-label", t("language.ariaLabel"));
  }

  if (label) {
    label.textContent = t("language.label");
  }

  if (menu) {
    menu.setAttribute("aria-label", t("language.listLabel"));
    menu.setAttribute("aria-hidden", isOpen ? "false" : "true");
    if (isOpen) {
      menu.removeAttribute("inert");
    } else {
      menu.setAttribute("inert", "");
    }
  }

  combobox.querySelectorAll("[data-language-option]").forEach((button) => {
    const locale = button.dataset.languageOption;
    const option = LOCALE_OPTIONS.find((entry) => entry.value === locale);
    const isSelected = locale === state.locale;

    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", isSelected ? "true" : "false");
    button.setAttribute("tabindex", isOpen ? "0" : "-1");
    if (option) {
      button.textContent = t(option.labelKey);
    }
  });
}

function renderSegmentControl() {
  const segmentControl = app.querySelector("[data-segment-control]");
  if (!segmentControl) {
    return;
  }

  const activeIndex = workspaceSections.findIndex((section) => section.id === state.sidebarTab);
  segmentControl.style.setProperty("--segment-index", `${Math.max(activeIndex, 0)}`);

  segmentControl.querySelectorAll("[data-sidebar-tab]").forEach((button) => {
    const isActive = button.dataset.sidebarTab === state.sidebarTab;
    const section = workspaceSections.find((entry) => entry.id === button.dataset.sidebarTab);
    button.textContent = section ? getWorkspaceSectionLabel(section) : button.dataset.sidebarTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderInspectorPanel() {
  const container = app.querySelector("[data-inspector-content]");
  if (!container) {
    return;
  }

  container.innerHTML = renderInspectorContent();
}

function render(options = {}) {
  const { animateInspector = false } = options;
  renderShell();

  const applyUpdate = () => {
    applyDocumentLocale(state.locale);
    applyTheme(state.theme);
    renderLayout();
    renderPersistentShellCopy();
    renderThemeControl();
    renderLanguageControl();
    renderSegmentControl();
    renderInspectorPanel();
    renderKeycapExportOverlay();
    configureColoris();
    syncImportDropOverlay();
    syncLegendFontPickerSegmentIndicator();
    syncLegendFontSourceModeControl();
    focusLegendFontPickerQuery();
    focusLegendFontSourceInput();
    focusLegendIconPickerQuery();
  };

  if (animateInspector && isUiMotionEnabled()) {
    const transition = document.startViewTransition(applyUpdate);
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    transition.finished.catch(() => {});
    return;
  }

  applyUpdate();
}

function renderInspectorContent() {
  if (state.sidebarTab === "project") {
    return renderProjectTab();
  }

  return renderDesignTab();
}

function focusLegendFontPickerQuery() {
  if (!pendingLegendFontPickerFocus) {
    return;
  }

  pendingLegendFontPickerFocus = false;
  const input = app.querySelector("[data-font-picker-query]");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  window.requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function focusLegendFontSourceInput() {
  if (!pendingLegendFontSourceInputFocus) {
    return;
  }

  pendingLegendFontSourceInputFocus = false;
  const input = app.querySelector("[data-user-font-source-input]");
  if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) {
    return;
  }

  window.requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function focusLegendIconPickerQuery() {
  if (!pendingLegendIconPickerFocus) {
    return;
  }

  pendingLegendIconPickerFocus = false;
  const input = app.querySelector("[data-icon-picker-query]");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  window.requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function syncLegendFontPickerSegmentIndicator(root = app) {
  const segments = root.querySelector("[data-font-picker-segments]");
  if (!(segments instanceof HTMLElement)) {
    return;
  }

  const activeSegment = normalizeLegendFontPickerSegment(segments.dataset.fontPickerActiveSegment);
  const indicator = segments.querySelector(".font-picker-segments__indicator");
  if (!(indicator instanceof HTMLElement)) {
    return;
  }

  segments.style.setProperty("--segment-index", `${getLegendFontPickerSegmentIndex(activeSegment)}`);
  indicator.style.width = "";
  indicator.style.left = "";
  indicator.style.right = "";
  indicator.style.marginLeft = "";
}

function syncLegendFontSourceModeControl(root = app) {
  const tabLists = root.querySelectorAll("[data-user-font-source-mode-tabs]");
  tabLists.forEach((tabs) => {
    if (!(tabs instanceof HTMLElement)) {
      return;
    }

    const activeMode = normalizeLegendFontSourceInputMode(tabs.dataset.userFontSourceActiveMode || state.legendFontSourceInputMode);
    const activeIndex = getLegendFontSourceInputModeIndex(activeMode);
    const rowCount = Math.ceil(LEGEND_FONT_SOURCE_INPUT_MODES.length / LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT);
    tabs.dataset.userFontSourceActiveMode = activeMode;
    tabs.style.setProperty("--source-mode-column-count", `${LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT}`);
    tabs.style.setProperty("--source-mode-row-count", `${rowCount}`);
    tabs.style.setProperty("--source-mode-column", `${activeIndex % LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT}`);
    tabs.style.setProperty("--source-mode-row", `${Math.floor(activeIndex / LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT)}`);

    tabs.querySelectorAll("[data-user-font-source-mode]").forEach((modeButton) => {
      const isActive = modeButton.dataset.userFontSourceMode === activeMode;
      modeButton.classList.toggle("is-active", isActive);
      modeButton.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  });
}

function renderImportBindingNotice() {
  const report = state.lastImportBindingReport;
  const unboundParams = report?.unboundParams ?? [];
  if (unboundParams.length === 0) {
    return "";
  }

  const isCollapsed = state.isImportBindingNoticeCollapsed;
  const listId = "import-binding-notice-list";
  const toggleLabel = isCollapsed
    ? t("importReport.expand")
    : t("importReport.collapse");
  const toggleIconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;
  const viewTransitionName = createViewTransitionName("import-binding-notice", "report");

  return `
    <section class="import-binding-notice" role="status" aria-live="polite" style="view-transition-name: ${viewTransitionName};">
      <div class="import-binding-notice__header">
        <span class="import-binding-notice__copy">
          <strong>${escapeHtml(t("importReport.title"))}</strong>
          <span ${isCollapsed ? "hidden" : ""}>${escapeHtml(t("importReport.unboundBody", {
            count: unboundParams.length,
            fileName: report.fileName,
          }))}</span>
        </span>
        <button
          class="field-group-toggle import-binding-notice__toggle"
          type="button"
          data-import-binding-toggle
          aria-expanded="${isCollapsed ? "false" : "true"}"
          aria-controls="${listId}"
          aria-label="${escapeHtml(toggleLabel)}"
          title="${escapeHtml(toggleLabel)}"
        >
          <img class="field-group-toggle__icon" src="${toggleIconUrl}" alt="" aria-hidden="true" />
        </button>
      </div>
      <div class="import-binding-notice__list" id="${listId}" aria-label="${escapeHtml(t("importReport.unboundListLabel"))}" ${isCollapsed ? "hidden" : ""}>
        ${unboundParams.map((entry) => `
          <span class="import-binding-notice__row">
            <code class="import-binding-notice__name">${escapeHtml(entry.path)}</code>
            <code class="import-binding-notice__value">${escapeHtml(formatImportBindingValue(entry.value))}</code>
            <button
              class="import-binding-notice__delete"
              type="button"
              data-import-binding-delete="${escapeHtml(entry.path)}"
              aria-label="${escapeHtml(t("importReport.deleteParam", { path: entry.path }))}"
              title="${escapeHtml(t("importReport.deleteParam", { path: entry.path }))}"
            >
              ${EXPORT_ICON_MARKUP.x}
            </button>
          </span>
        `).join("")}
      </div>
    </section>
  `;
}

function toggleImportBindingNotice() {
  state.isImportBindingNoticeCollapsed = !state.isImportBindingNoticeCollapsed;
  render({ animateInspector: true });
}

function deleteImportBindingParam(path) {
  const entryIndex = state.project.keycaps.findIndex((entry) => entry.id === state.project.activeKeycapId);
  if (entryIndex < 0 || !path) {
    return;
  }

  const currentEntry = state.project.keycaps[entryIndex];
  const {
    payload: nextEditorDataPayload,
    deleted,
  } = deleteEditorDataPayloadPath(getProjectEntryEditorDataPayload(currentEntry), path);
  if (!deleted) {
    return;
  }

  const {
    params,
    bindingReport,
  } = parseEditorDataPayloadWithReport(nextEditorDataPayload);
  state.keycapParams = syncDerivedKeycapParams(cloneJsonValue(params));
  state.project.keycaps[entryIndex] = createProjectKeycapEntry(state.keycapParams, {
    id: currentEntry.id,
    name: state.keycapParams.name,
    jsonPath: currentEntry.jsonPath,
    previewPath: currentEntry.previewPath,
    displayOrder: currentEntry.displayOrder,
    editorDataPayload: nextEditorDataPayload,
    previewImageDataUrl: currentEntry.previewImageDataUrl,
    previewViewState: currentEntry.previewViewState,
  });
  state.project.isDirty = true;
  state.editorStatus = "dirty";
  state.editorSummary = t("status.loadedDirty");
  setImportBindingReport(bindingReport, getProjectEntryReportFileName(state.project.keycaps[entryIndex]));
  setProjectStatus("idle", t("project.edited"));
  render({ animateInspector: true });
}

function formatImportBindingValue(value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderProjectKeycapList() {
  const keycaps = state.project.keycaps;
  if (keycaps.length === 0) {
    return `<p class="project-empty">${escapeHtml(t("project.empty"))}</p>`;
  }

  return keycaps.map((entry, index) => {
    const isActive = entry.id === state.project.activeKeycapId;
    const imageDataUrl = entry.previewImageDataUrl || createProjectPreviewPlaceholderDataUrl(entry.params);
    const previewContent = `<img src="${escapeHtml(imageDataUrl)}" alt="" loading="lazy" />`;
    const orderLabel = projectKeycapDragOrderLabels.get(entry.id) ?? index + 1;
    const cardAttributes = isActive
      ? ""
      : `
          data-project-keycap="${escapeHtml(entry.id)}"
        `;
    const previewMarkup = isActive
      ? `
          <button
            class="project-keycap-item__preview project-keycap-preview-button"
            type="button"
            data-project-keycap-recapture="${escapeHtml(entry.id)}"
            aria-label="${escapeHtml(t("project.recapturePreview", { name: entry.name }))}"
            title="${escapeHtml(t("project.recapturePreview", { name: entry.name }))}"
          >
            ${previewContent}
          </button>
        `
      : `
          <span class="project-keycap-item__preview">
            ${previewContent}
          </span>
        `;
    const summaryContent = `
      ${previewMarkup}
      <span class="project-keycap-item__copy">
        <span class="project-keycap-item__title-row">
          <strong>${escapeHtml(entry.name)}</strong>
          ${isActive ? `<span class="project-keycap-item__status">${escapeHtml(t("project.activeKeycap"))}</span>` : ""}
        </span>
        <span>${escapeHtml(entry.jsonPath)}</span>
      </span>
    `;
    const summaryMarkup = isActive
      ? `<div class="project-keycap-item__summary">${summaryContent}</div>`
      : `
          <button
            class="project-keycap-item__summary project-keycap-item__select-button"
            type="button"
            data-project-keycap-select="${escapeHtml(entry.id)}"
            aria-label="${escapeHtml(t("project.selectKeycap", { name: entry.name }))}"
          >
            ${summaryContent}
          </button>
        `;
    return `
      <div
        class="project-keycap-item ${isActive ? "is-active" : ""} ${entry.id === projectKeycapDragSourceId ? "is-dragging" : ""}"
        data-project-keycap-card
        data-project-keycap-id="${escapeHtml(entry.id)}"
        data-project-keycap-display-order="${index}"
        ${cardAttributes}
      >
        <div class="project-keycap-item__content">
          <button
            class="project-keycap-drag-handle"
            type="button"
            draggable="true"
            data-project-keycap-drag="${escapeHtml(entry.id)}"
            aria-label="${escapeHtml(t("project.reorderKeycap", { name: entry.name }))}"
            title="${escapeHtml(t("project.reorderKeycap", { name: entry.name }))}"
          >
            <span class="project-keycap-drag-handle__order">${escapeHtml(orderLabel)}</span>
            ${EXPORT_ICON_MARKUP.grip}
          </button>
          ${summaryMarkup}
        </div>
        <div class="project-keycap-item__actions">
          <button
            class="project-keycap-action-button project-keycap-export-button"
            type="button"
            data-project-keycap-export="${escapeHtml(entry.id)}"
            aria-label="${escapeHtml(t("project.exportKeycap", { name: entry.name }))}"
            title="${escapeHtml(t("project.exportKeycap", { name: entry.name }))}"
          >
            ${EXPORT_ICON_MARKUP.download}
            <span>${escapeHtml(t("project.exportAction"))}</span>
          </button>
          <button
            class="project-keycap-action-button project-keycap-design-button"
            type="button"
            data-project-keycap-design="${escapeHtml(entry.id)}"
            aria-label="${escapeHtml(t("project.designKeycap", { name: entry.name }))}"
            title="${escapeHtml(t("project.designKeycap", { name: entry.name }))}"
          >
            ${EXPORT_ICON_MARKUP.design}
            <span>${escapeHtml(t("project.designAction"))}</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function getKeycapExportOverlayEntry() {
  return state.project.keycaps.find((entry) => entry.id === state.keycapExportOverlayKeycapId) ?? null;
}

function getKeycapDesignOverlayEntry() {
  return state.project.keycaps.find((entry) => entry.id === state.keycapDesignOverlayKeycapId) ?? null;
}

function syncKeycapExportOverlayScrollLock(isLocked) {
  document.documentElement.classList.toggle("is-keycap-export-overlay-open", isLocked);
  document.body.classList.toggle("is-keycap-export-overlay-open", isLocked);
}

function renderKeycapExportOverlayOption({ format, chip, title, body, action }) {
  return `
    <section class="export-option-action keycap-export-option" aria-labelledby="keycap-export-${format}-title">
      <div class="export-action-card__header">
        <span class="export-action-card__icon" aria-hidden="true">${format === "editor-data" ? EXPORT_ICON_MARKUP.file : EXPORT_ICON_MARKUP.package}</span>
        <span class="export-action-card__title-stack">
          <span class="chip-label">${escapeHtml(chip)}</span>
          <strong id="keycap-export-${format}-title">${escapeHtml(title)}</strong>
        </span>
      </div>
      <p class="export-action-card__text">${escapeHtml(body)}</p>
      <button
        class="export-save-button"
        type="button"
        data-keycap-export-format="${escapeHtml(format)}"
        ${state.exportsStatus === "running" ? "disabled" : ""}
      >
        ${EXPORT_ICON_MARKUP.download}
        <span>${state.exportsStatus === "running" ? t("actions.saving") : escapeHtml(action)}</span>
      </button>
    </section>
  `;
}

function renderKeycapExportOverlay() {
  const overlayRoot = app.querySelector("[data-keycap-export-overlay-root]");
  if (!overlayRoot) {
    syncKeycapExportOverlayScrollLock(false);
    return;
  }

  const entry = getKeycapExportOverlayEntry();
  const designEntry = getKeycapDesignOverlayEntry();
  syncKeycapExportOverlayScrollLock(Boolean(entry || designEntry));

  if (!entry) {
    if (designEntry) {
      renderKeycapDesignOverlay(overlayRoot, designEntry);
      return;
    }

    overlayRoot.replaceChildren();
    return;
  }

  overlayRoot.innerHTML = `
    <div class="keycap-export-overlay" data-keycap-export-overlay role="presentation">
      <section
        class="keycap-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keycap-export-title"
      >
        <div class="keycap-export-dialog__header">
          <span class="keycap-export-dialog__title-stack">
            <span class="chip-label">${escapeHtml(t("project.exportChip"))}</span>
            <h2 id="keycap-export-title">${escapeHtml(t("project.exportTitle", { name: entry.name }))}</h2>
          </span>
          <button
            class="field-group-toggle keycap-export-dialog__close"
            type="button"
            data-keycap-export-close
            aria-label="${escapeHtml(t("actions.close"))}"
            title="${escapeHtml(t("actions.close"))}"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div class="keycap-export-dialog__body">
          ${renderKeycapExportOverlayOption({
            format: "editor-data",
            chip: t("exportPanel.jsonChip"),
            title: t("exportPanel.jsonTitle"),
            body: t("exportPanel.jsonBody"),
            action: t("exportPanel.saveJson"),
          })}
          ${renderKeycapExportOverlayOption({
            format: "3mf",
            chip: t("exportPanel.threeMfChip"),
            title: t("exportPanel.threeMfTitle"),
            body: t("exportPanel.threeMfBody"),
            action: t("exportPanel.saveThreeMf"),
          })}
          ${renderKeycapExportOverlayOption({
            format: "step",
            chip: t("exportPanel.stepChip"),
            title: t("exportPanel.stepTitle"),
            body: t("exportPanel.stepBody"),
            action: t("exportPanel.saveStep"),
          })}
          ${renderKeycapExportOverlayOption({
            format: "stl",
            chip: t("exportPanel.stlChip"),
            title: t("exportPanel.stlTitle"),
            body: t("exportPanel.stlBody"),
            action: t("exportPanel.saveStl"),
          })}
        </div>
        <p class="keycap-export-dialog__status" aria-live="polite">${escapeHtml(state.exportsSummary)}</p>
      </section>
    </div>
  `;
}

function renderKeycapDesignOverlay(overlayRoot, entry) {
  const isOnlyProjectKeycap = state.project.keycaps.length <= 1;
  overlayRoot.innerHTML = `
    <div class="keycap-export-overlay" data-keycap-design-overlay role="presentation">
      <section
        class="keycap-export-dialog project-keycap-design-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keycap-design-title"
      >
        <div class="keycap-export-dialog__header">
          <span class="keycap-export-dialog__title-stack">
            <span class="chip-label">${escapeHtml(t("project.designChip"))}</span>
            <h2 id="keycap-design-title">${escapeHtml(t("project.designTitle", { name: entry.name }))}</h2>
          </span>
          <button
            class="field-group-toggle keycap-export-dialog__close"
            type="button"
            data-keycap-design-close
            aria-label="${escapeHtml(t("actions.close"))}"
            title="${escapeHtml(t("actions.close"))}"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div class="keycap-export-dialog__body">
          <section class="export-option-action keycap-export-option project-keycap-danger-option" aria-labelledby="keycap-design-delete-title">
            <div class="export-action-card__header">
              <span class="export-action-card__icon" aria-hidden="true">${EXPORT_ICON_MARKUP.trash}</span>
              <span class="export-action-card__title-stack">
                <span class="chip-label">${escapeHtml(t("project.deleteChip"))}</span>
                <strong id="keycap-design-delete-title">${escapeHtml(t("project.deleteTitle"))}</strong>
              </span>
            </div>
            <p class="export-action-card__text">${escapeHtml(t(isOnlyProjectKeycap ? "project.deleteLastBody" : "project.deleteBody"))}</p>
            <button
              class="export-save-button project-danger-button"
              type="button"
              data-keycap-delete="${escapeHtml(entry.id)}"
              ${isOnlyProjectKeycap ? "disabled" : ""}
            >
              ${EXPORT_ICON_MARKUP.trash}
              <span>${escapeHtml(t("project.deleteAction"))}</span>
            </button>
          </section>
        </div>
      </section>
    </div>
  `;
}

function renderProjectTab() {
  const projectName = state.project.name || DEFAULT_PROJECT_NAME;
  const isProjectBusy = state.projectStatus === "running";

  return `
    <div class="inspector-panel inspector-panel--project">
      <div class="panel-intro">
        <h1 class="panel-title">${t("panels.project.title")}</h1>
        <p class="panel-text">${t("panels.project.body")}</p>
      </div>

      ${renderImportBindingNotice()}

      <div class="project-panel-grid">
        <section class="field-group-card project-card" aria-labelledby="project-name-title">
          <div class="field-group-header">
            <div class="field-group-card__header field-group-card__header--plain">
              <span class="field-group-card__title-stack">
                <h3 id="project-name-title">${t("project.nameTitle")}</h3>
                <p id="project-name-hint">${t("project.nameHint")}</p>
              </span>
            </div>
          </div>
          <div class="field-group-body">
            <span class="field-control name-field-control">
              <input
                id="project-name-input"
                type="text"
                data-project-name
                value="${escapeHtml(projectName)}"
                maxlength="80"
                spellcheck="false"
                autocomplete="off"
                aria-labelledby="project-name-title"
                aria-describedby="project-name-hint"
              />
            </span>
          </div>
        </section>

        <section class="field-group-card project-card" aria-labelledby="project-keycaps-title">
          <div class="field-group-header">
            <div class="field-group-card__header field-group-card__header--plain">
              <span class="field-group-card__title-stack">
                <h3 id="project-keycaps-title">${t("project.keycapsTitle")}</h3>
                <p>${t("project.keycapsCount", { count: state.project.keycaps.length })}</p>
              </span>
            </div>
          </div>
          <div class="field-group-body project-keycap-body">
            <div class="project-keycap-list">
              ${renderProjectKeycapList()}
            </div>
            <button class="export-save-button project-secondary-button" type="button" data-project-add-current ${isProjectBusy ? "disabled" : ""}>
              ${EXPORT_ICON_MARKUP.plus}
              <span>${t("project.addCurrent")}</span>
            </button>
          </div>
        </section>

        <button class="export-save-button project-save-button" type="button" data-project-save ${isProjectBusy ? "disabled" : ""}>
          ${EXPORT_ICON_MARKUP.download}
          <span>${isProjectBusy ? t("actions.saving") : t("project.save")}</span>
        </button>
        <p class="project-status" aria-live="polite">${escapeHtml(state.projectSummary)}</p>
      </div>
    </div>
  `;
}

function renderDesignTab() {
  const activeFieldGroups = getActiveFieldGroups();

  return `
    <div class="inspector-panel inspector-panel--design">
      <div class="panel-intro">
        <h1 class="panel-title">${t("panels.design.title")}</h1>
        <p class="panel-text">${t("panels.design.body")}</p>
      </div>

      ${renderImportBindingNotice()}

      <div class="parameter-group-list">
        ${renderNameFieldCard()}
        ${activeFieldGroups.map((group, index) => renderFieldGroup(group, index)).join("")}
      </div>
    </div>
  `;
}

function renderFieldGroupToggleButton({
  groupId,
  isCollapsed,
  groupBodyId,
  toggleLabel,
  toggleIconUrl,
}) {
  return `
    <button
      class="field-group-toggle"
      type="button"
      data-field-group-toggle="${escapeHtml(groupId)}"
      aria-expanded="${isCollapsed ? "false" : "true"}"
      aria-controls="${escapeHtml(groupBodyId)}"
      aria-label="${escapeHtml(toggleLabel)}"
    >
      <img class="field-group-toggle__icon" src="${toggleIconUrl}" alt="" aria-hidden="true" />
    </button>
  `;
}

function renderParameterCardHeader({
  groupId,
  title,
  titleId,
  caption = "",
  toggleButton = "",
}) {
  const captionMarkup = caption
    ? `<p class="field-group-card__caption">${escapeHtml(caption)}</p>`
    : "";
  const titleStackClass = captionMarkup
    ? "field-group-card__title-stack"
    : "field-group-card__title-stack field-group-card__title-stack--solo";

  return `
    <div class="field-group-header">
      <div class="field-group-card__header">
        ${renderParameterGroupIcon(groupId)}
        <span class="${titleStackClass}">
          <h3 id="${escapeHtml(titleId)}">${escapeHtml(title)}</h3>
          ${captionMarkup}
        </span>
        ${toggleButton}
      </div>
    </div>
  `;
}

function renderNameFieldCard() {
  const groupViewTransitionName = createViewTransitionName("field-group", DESIGN_NAME_FIELD.key);
  const fieldViewTransitionName = createViewTransitionName("field", DESIGN_NAME_FIELD.key);
  const value = state.keycapParams[DESIGN_NAME_FIELD.key];
  const fieldLabel = resolveDynamicCopy(DESIGN_NAME_FIELD.label);
  const fieldPlaceholder = resolveDynamicCopy(DESIGN_NAME_FIELD.placeholder);
  const titleId = "design-name-card-title";

  return `
    <section class="field-group-card" aria-labelledby="${titleId}" style="view-transition-name: ${groupViewTransitionName};">
      ${renderParameterCardHeader({
        groupId: "name",
        title: t("nameGroup.title"),
        titleId,
        caption: getParameterGroupCaption("name"),
      })}
      <div class="field-group-body">
        <span class="field-control name-field-control" style="view-transition-name: ${fieldViewTransitionName};">
          <input
            id="design-name-input"
            type="text"
            data-field="${DESIGN_NAME_FIELD.key}"
            value="${escapeHtml(value)}"
            aria-label="${escapeHtml(fieldLabel)}"
            ${DESIGN_NAME_FIELD.maxLength != null ? `maxlength="${DESIGN_NAME_FIELD.maxLength}"` : ""}
            ${fieldPlaceholder ? `placeholder="${escapeHtml(fieldPlaceholder)}"` : ""}
            spellcheck="false"
            autocomplete="off"
          />
        </span>
      </div>
    </section>
  `;
}

function renderKeyUnitBasisReadout() {
  return t("unitBasis.readout", {
    widthUnits: formatUnitInputValue(state.keycapParams.keyWidth),
    depthUnits: formatUnitInputValue(state.keycapParams.keyDepth),
  });
}

function renderFieldGridContents(fields, fieldByKey) {
  const dependentFieldKeys = getVisibleDependentFieldKeys(fields, fieldByKey);
  const pairedFieldKeys = getVisiblePairedFieldKeys(fields, fieldByKey);
  const visibleFields = fields.filter((field) => isFieldVisible(field) && !dependentFieldKeys.has(field.key) && !pairedFieldKeys.has(field.key));

  return visibleFields.map((field) => renderFieldWithDependents(field, fieldByKey)).join("");
}

function renderFieldGroup(group, groupIndex) {
  if (group.id === "legend") {
    return renderLegendFieldGroup(group, groupIndex);
  }

  if (group.id === "stem") {
    return renderStemFieldGroup(group, groupIndex);
  }

  const groupId = group.id ?? `group-${groupIndex}`;
  const isCollapsed = state.collapsedFieldGroups[groupId] === true;
  const groupViewTransitionName = createViewTransitionName("field-group", groupId);
  const groupBodyId = `field-group-body-${groupId}`;
  const groupFieldByKey = new Map(group.fields.map((field) => [field.key, field]));
  const toggleLabel = isCollapsed
    ? t("fieldGroup.expand", { title: group.title })
    : t("fieldGroup.collapse", { title: group.title });
  const toggleIconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;
  const titleId = `field-group-title-${toKebabCase(groupId)}`;
  const toggleButton = renderFieldGroupToggleButton({
    groupId,
    isCollapsed,
    groupBodyId,
    toggleLabel,
    toggleIconUrl,
  });
  const bodyContent = isCollapsed
    ? ""
    : `
        <div class="field-grid">
          ${renderFieldGridContents(group.fields, groupFieldByKey)}
        </div>
      `;

  return `
    <section class="field-group-card" aria-labelledby="${titleId}" style="view-transition-name: ${groupViewTransitionName};">
      ${renderParameterCardHeader({
        groupId,
        title: group.title,
        titleId,
        caption: getParameterGroupCaption(groupId),
        toggleButton,
      })}
      <div class="field-group-body" id="${groupBodyId}" ${isCollapsed ? "hidden" : ""}>
        ${bodyContent}
      </div>
    </section>
  `;
}

function renderStemFieldGroup(group, groupIndex) {
  const groupId = group.id ?? `group-${groupIndex}`;
  const isCollapsed = state.collapsedFieldGroups[groupId] === true;
  const groupViewTransitionName = createViewTransitionName("field-group", groupId);
  const groupBodyId = `field-group-body-${groupId}`;
  const groupFieldByKey = new Map(group.fields.map((field) => [field.key, field]));
  const activeClearanceCard = getActiveStemClearanceCard();
  const clearanceFieldKeys = new Set(activeClearanceCard.fieldKeys);
  const mainFields = group.fields.filter((field) => !clearanceFieldKeys.has(field.key));
  const mainFieldByKey = new Map(mainFields.map((field) => [field.key, field]));
  const toggleLabel = isCollapsed
    ? t("fieldGroup.expand", { title: group.title })
    : t("fieldGroup.collapse", { title: group.title });
  const toggleIconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;
  const titleId = `field-group-title-${toKebabCase(groupId)}`;
  const toggleButton = renderFieldGroupToggleButton({
    groupId,
    isCollapsed,
    groupBodyId,
    toggleLabel,
    toggleIconUrl,
  });
  const bodyContent = isCollapsed
    ? ""
    : `
        <div class="field-grid">
          ${renderFieldGridContents(mainFields, mainFieldByKey)}
        </div>
        <div class="parameter-subcard-list">
          ${renderStemSubcard(activeClearanceCard, groupFieldByKey)}
        </div>
      `;

  return `
    <section class="field-group-card" aria-labelledby="${titleId}" style="view-transition-name: ${groupViewTransitionName};">
      ${renderParameterCardHeader({
        groupId,
        title: group.title,
        titleId,
        caption: getParameterGroupCaption(groupId),
        toggleButton,
      })}
      <div class="field-group-body" id="${groupBodyId}" ${isCollapsed ? "hidden" : ""}>
        ${bodyContent}
      </div>
    </section>
  `;
}

function getActiveStemClearanceCard(params = state.keycapParams) {
  if (resolveStemType(params) !== "j_stem_lp01") {
    return STEM_CLEARANCE_CARD_DEFINITION;
  }

  return {
    ...STEM_CLEARANCE_CARD_DEFINITION,
    fieldKeys: STEM_CLEARANCE_CARD_DEFINITION.fieldKeys.filter((fieldKey) => fieldKey !== "stemCrossMargin"),
  };
}

function renderLegendFieldGroup(group, groupIndex) {
  const groupId = group.id ?? `group-${groupIndex}`;
  const isCollapsed = state.collapsedFieldGroups[groupId] === true;
  const groupViewTransitionName = createViewTransitionName("field-group", groupId);
  const groupBodyId = `field-group-body-${groupId}`;
  const groupFieldByKey = new Map(group.fields.map((field) => [field.key, field]));
  const toggleLabel = isCollapsed
    ? t("fieldGroup.expand", { title: group.title })
    : t("fieldGroup.collapse", { title: group.title });
  const toggleIconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;
  const titleId = `field-group-title-${toKebabCase(groupId)}`;
  const toggleButton = renderFieldGroupToggleButton({
    groupId,
    isCollapsed,
    groupBodyId,
    toggleLabel,
    toggleIconUrl,
  });
  const bodyContent = isCollapsed
    ? ""
    : `
        <div class="legend-subcard-list">
          ${LEGEND_CARD_DEFINITIONS.map((card) => renderLegendSubcard(card, groupFieldByKey)).join("")}
        </div>
      `;

  return `
    <section class="field-group-card" aria-labelledby="${titleId}" style="view-transition-name: ${groupViewTransitionName};">
      ${renderParameterCardHeader({
        groupId,
        title: group.title,
        titleId,
        caption: getParameterGroupCaption(groupId),
        toggleButton,
      })}
      <div class="field-group-body" id="${groupBodyId}" ${isCollapsed ? "hidden" : ""}>
        ${bodyContent}
      </div>
    </section>
  `;
}

function renderStemSubcard(card, groupFieldByKey) {
  const cardFields = card.fieldKeys.map((fieldKey) => groupFieldByKey.get(fieldKey)).filter(Boolean);
  const visibleCardFields = cardFields.filter((field) => isFieldVisible(field));
  if (visibleCardFields.length === 0) {
    return "";
  }

  const cardFieldByKey = new Map(cardFields.map((field) => [field.key, field]));
  const cardTitle = resolveDynamicCopy(card.title);
  const cardBodyId = `stem-subcard-body-${card.id}`;
  const isCollapsed = state.collapsedFieldGroups[card.id] === true;
  const toggleLabel = isCollapsed
    ? t("fieldGroup.expand", { title: cardTitle })
    : t("fieldGroup.collapse", { title: cardTitle });
  const toggleIconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;
  const cardViewTransitionName = createViewTransitionName("stem-subcard", card.id);
  const bodyContent = isCollapsed
    ? ""
    : `
        <div class="field-grid">
          ${renderFieldGridContents(cardFields, cardFieldByKey)}
        </div>
      `;

  return `
    <section class="parameter-subcard" style="view-transition-name: ${cardViewTransitionName};">
      <div class="parameter-subcard__header">
        <h4>${escapeHtml(cardTitle)}</h4>
        <button
          class="field-group-toggle"
          type="button"
          data-field-group-toggle="${card.id}"
          aria-expanded="${isCollapsed ? "false" : "true"}"
          aria-controls="${cardBodyId}"
          aria-label="${escapeHtml(toggleLabel)}"
        >
          <img class="field-group-toggle__icon" src="${toggleIconUrl}" alt="" aria-hidden="true" />
        </button>
      </div>
      <div class="parameter-subcard__body" id="${cardBodyId}" ${isCollapsed ? "hidden" : ""}>
        ${bodyContent}
      </div>
    </section>
  `;
}

function renderLegendSubcard(card, groupFieldByKey) {
  const cardFields = card.fieldKeys.map((fieldKey) => groupFieldByKey.get(fieldKey)).filter(Boolean);
  if (cardFields.length === 0) {
    return "";
  }

  const cardFieldByKey = new Map(cardFields.map((field) => [field.key, field]));
  const cardTitle = resolveDynamicCopy(card.title);
  const cardBodyId = `legend-subcard-body-${card.id}`;
  const isCollapsed = state.collapsedFieldGroups[card.id] === true;
  const enabledFieldKey = card.enabledFieldKey;
  const isLegendEnabled = enabledFieldKey ? Boolean(state.keycapParams[enabledFieldKey]) : true;
  const toggleLabel = isCollapsed
    ? t("fieldGroup.expand", { title: cardTitle })
    : t("fieldGroup.collapse", { title: cardTitle });
  const toggleIconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;
  const cardViewTransitionName = createViewTransitionName("legend-subcard", card.id);
  const printNotice = isLegendEnabled
    ? `<p class="field-note">${escapeHtml(t("fields.legendPrintNotice"))}</p>`
    : "";
  const bodyContent = isCollapsed
    ? ""
    : `
        ${printNotice}
        <div class="field-grid">
          ${renderFieldGridContents(cardFields, cardFieldByKey)}
        </div>
      `;

  return `
    <section class="legend-subcard" style="view-transition-name: ${cardViewTransitionName};">
      <div class="legend-subcard__header">
        <h4>${escapeHtml(cardTitle)}</h4>
        <button
          class="field-group-toggle"
          type="button"
          data-field-group-toggle="${card.id}"
          aria-expanded="${isCollapsed ? "false" : "true"}"
          aria-controls="${cardBodyId}"
          aria-label="${escapeHtml(toggleLabel)}"
        >
          <img class="field-group-toggle__icon" src="${toggleIconUrl}" alt="" aria-hidden="true" />
        </button>
      </div>
      <div class="legend-subcard__body" id="${cardBodyId}" ${isCollapsed ? "hidden" : ""}>
        ${bodyContent}
      </div>
    </section>
  `;
}

function getVisibleDependentFieldKeys(fields, fieldByKey) {
  return new Set(
    fields
      .filter((field) => isFieldVisible(field) && canRenderDependentFields(field))
      .flatMap((field) => field.dependentFieldKeys ?? [])
      .filter((fieldKey) => fieldByKey.has(fieldKey)),
  );
}

function getVisiblePairedFieldKeys(fields, fieldByKey) {
  return new Set(
    fields
      .filter((field) => isFieldVisible(field) && field.type === "number-pair")
      .map((field) => field.secondaryField)
      .filter((fieldKey) => fieldKey && fieldByKey.has(fieldKey) && isFieldVisible(fieldByKey.get(fieldKey))),
  );
}

function canRenderDependentFields(field) {
  return field.type == null || field.type === "checkbox" || field.type === "select" || field.type === "font-search";
}

function renderFieldWithDependents(field, fieldByKey) {
  const dependentFieldKeys = field.dependentFieldKeys ?? [];
  if (dependentFieldKeys.length === 0 || !canRenderDependentFields(field)) {
    return renderField(field);
  }

  const dependentFields = dependentFieldKeys
    .map((fieldKey) => fieldByKey.get(fieldKey))
    .filter(Boolean)
    .filter((dependentField) => isFieldVisible(dependentField));

  if (field.type === "select") {
    return renderFieldWithDependentFields(field, dependentFields, fieldByKey);
  }

  return renderField(field, { dependentFields, fieldByKey });
}

function renderDependentFieldList(dependentFields, fieldByKey = null) {
  if (dependentFields.length === 0) {
    return "";
  }

  return `
    <div class="field-dependent-list">
      ${dependentFields.map((dependentField) => {
        const nestedDependentFields = (dependentField.dependentFieldKeys ?? [])
          .map((fieldKey) => fieldByKey?.get(fieldKey))
          .filter(Boolean)
          .filter((nestedField) => isFieldVisible(nestedField));

        return renderField(dependentField, {
          className: "field--dependent",
          dependentFields: nestedDependentFields,
        });
      }).join("")}
    </div>
  `;
}

function renderFieldWithDependentFields(field, dependentFields, fieldByKey = null) {
  const value = state.keycapParams[field.key];
  const fieldViewTransitionName = createViewTransitionName("field", field.key);
  const fieldLabel = resolveDynamicCopy(field.label);
  const fieldHint = resolveDynamicCopy(field.hint);
  const fieldOptions = resolveFieldOptions(field);
  const isDisabled = isFieldDisabled(field);
  const inputId = `field-control-${field.key}`;
  const leadingIcon = field.key === "topSurfaceShape" || field.key === "topHatSurfaceShape"
    ? renderKeyTopSurfaceShapeIcon()
    : field.key === "topSlopeInputMode"
      ? renderKeyTopSlopeInputModeIcon()
      : "";
  const leadingIconClassName = getLeadingIconFieldClassName(leadingIcon);

  return `
    <div class="field field--with-dependents${leadingIconClassName}" style="view-transition-name: ${fieldViewTransitionName};">
      ${leadingIcon}
      <label class="field-copy" for="${inputId}">
        <span class="field-label">${fieldLabel}</span>
        <span class="field-hint">${fieldHint}</span>
      </label>
      <span class="field-control field-control--select">
        <select id="${inputId}" data-field="${field.key}" ${isDisabled ? "disabled" : ""}>
          ${fieldOptions
            .map(
              (option) => `
                <option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `,
            )
            .join("")}
        </select>
      </span>
      ${renderDependentFieldList(dependentFields, fieldByKey)}
    </div>
  `;
}

function isFieldVisible(field) {
  if (typeof field.visibleWhen !== "function") {
    return true;
  }

  return field.visibleWhen(state.keycapParams);
}

function resolveDynamicCopy(value, params = state.keycapParams) {
  return typeof value === "function" ? value(params) : (value ?? "");
}

function resolveFieldAttribute(value, params = state.keycapParams) {
  return typeof value === "function" ? value(params) : value;
}

function normalizeRangeAttribute(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeSliderRangeValue(fieldKey, value, step = null) {
  const numericValue = normalizeRangeAttribute(value);
  if (numericValue == null) {
    return null;
  }

  const roundedValue = Number(formatNumericFieldValue(fieldKey, numericValue, step));
  return Number.isFinite(roundedValue) ? roundedValue : numericValue;
}

function canAutoRenderSliderForField(field) {
  if (!field || field.slider === false) {
    return false;
  }

  return field.type == null
    || field.type === "number-pair"
    || field.type === "linked-size"
    || field.type === "corner-radius"
    || field.type === "key-unit-basis";
}

function resolveDefaultFieldSliderConfig(field, params = state.keycapParams) {
  if (!canAutoRenderSliderForField(field)) {
    return null;
  }

  const sliderRange = resolveFieldSliderRange(field.key, params);
  const sliderMinimum = sliderRange?.min ?? field.min;
  const sliderMaximum = sliderRange?.max ?? field.max;
  if (sliderMinimum == null || sliderMaximum == null) {
    return null;
  }

  return {
    min: sliderMinimum,
    max: sliderMaximum,
    step: sliderRange?.step ?? field.step,
    guide: sliderRange?.guide,
  };
}

function resolveFieldSliderConfig(field, params = state.keycapParams) {
  if (!field || field.slider === false) {
    return null;
  }

  const defaultSlider = resolveDefaultFieldSliderConfig(field, params);
  if (field.slider == null) {
    return defaultSlider;
  }

  return {
    ...(defaultSlider ?? {}),
    ...field.slider,
  };
}

function resolveFieldSliderAttributes(field, params = state.keycapParams) {
  const sliderConfig = resolveFieldSliderConfig(field, params);
  if (!sliderConfig) {
    return null;
  }

  const sliderStep = normalizeRangeAttribute(resolveFieldAttribute(sliderConfig.step, params));
  const sliderMinimum = normalizeSliderRangeValue(field.key, resolveFieldAttribute(sliderConfig.min, params), sliderStep);
  const sliderMaximum = normalizeSliderRangeValue(field.key, resolveFieldAttribute(sliderConfig.max, params), sliderStep);
  const guideValue = normalizeSliderRangeValue(field.key, resolveFieldSliderGuideValue(field, sliderConfig, params), sliderStep);
  const guidePosition = resolveSliderGuidePosition(sliderMinimum, sliderMaximum, guideValue);

  return {
    min: sliderMinimum,
    max: sliderMaximum,
    step: sliderStep,
    guide: guideValue,
    guidePosition,
  };
}

function canRenderFieldSlider(sliderAttributes) {
  return sliderAttributes
    && sliderAttributes.min != null
    && sliderAttributes.max != null
    && sliderAttributes.min <= sliderAttributes.max;
}

function clampSliderValue(value, sliderAttributes) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return sliderAttributes?.max ?? 0;
  }

  return Math.min(Math.max(numericValue, sliderAttributes.min), sliderAttributes.max);
}

function formatSliderFieldValue(fieldKey, value, sliderAttributes) {
  return formatNumericFieldValue(fieldKey, clampSliderValue(value, sliderAttributes), sliderAttributes?.step);
}

function resolveStandardFieldSliderGuideValue(fieldKey, params = state.keycapParams) {
  if (fieldKey === "dishDepth") {
    return getTopSurfaceShapePreset(params.topSurfaceShape ?? "flat").dishDepth;
  }

  if (fieldKey === "topHatDishDepth") {
    return getTopSurfaceShapePreset(params.topHatSurfaceShape ?? "flat").dishDepth;
  }

  if (isTopEdgeHeightField(fieldKey)) {
    return resolveTopEdgeHeights({
      ...params,
      topPitchDeg: 0,
      topRollDeg: 0,
    })[fieldKey];
  }

  const initialParams = createInitialKeycapParams(params.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY);
  return initialParams[fieldKey];
}

function resolveFieldSliderGuideValue(field, sliderConfig, params = state.keycapParams) {
  if (!field || !sliderConfig || sliderConfig.guide === false) {
    return null;
  }

  const guideSource = sliderConfig.guide ?? "initial";
  if (guideSource === "initial") {
    return normalizeRangeAttribute(resolveStandardFieldSliderGuideValue(field.key, params));
  }

  return normalizeRangeAttribute(resolveFieldAttribute(guideSource, params));
}

function resolveSliderGuidePosition(minimum, maximum, guideValue) {
  if (guideValue == null || minimum == null || maximum == null || minimum >= maximum) {
    return null;
  }

  const clampedGuideValue = Math.min(Math.max(guideValue, minimum), maximum);
  return ((clampedGuideValue - minimum) / (maximum - minimum)) * 100;
}

function formatSliderGuidePosition(position) {
  return `${formatCompactNumber(position, 2)}%`;
}

function resolveFieldOptions(field, params = state.keycapParams) {
  const options = typeof field.options === "function" ? field.options(params) : field.options ?? [];
  return options.map((option) => localizeFieldOption(field.key, option));
}

function isFieldDisabled(field, params = state.keycapParams) {
  return typeof field.disabledWhen === "function" ? field.disabledWhen(params) : false;
}

async function ensureLegendFontPreviewLoaded(font) {
  if (!font?.measurementFamily || typeof FontFace === "undefined" || typeof document === "undefined") {
    return null;
  }
  if (font.isMissing) {
    return null;
  }

  const cachedPromise = legendFontPreviewPromises.get(font.key);
  if (cachedPromise) {
    return cachedPromise;
  }

  const descriptors = font.fontKind === "variable"
    ? { style: "normal", weight: "100 900" }
    : { style: "normal", weight: `${font.cssWeight ?? 400}` };
  const previewPromise = new FontFace(
    font.measurementFamily,
    `url(${resolveLegendFontAssetUrl(font)})`,
    descriptors,
  )
    .load()
    .then((loadedFace) => {
      document.fonts.add(loadedFace);
      return loadedFace;
    })
    .catch((error) => {
      legendFontPreviewPromises.delete(font.key);
      console.warn(error);
      return null;
    });

  legendFontPreviewPromises.set(font.key, previewPromise);
  return previewPromise;
}

function warmLegendFontPreviewFonts() {
  getAvailableLegendFonts().forEach((font) => {
    void ensureLegendFontPreviewLoaded(font);
  });
}

function resolveLegendFontAssetUrl(font) {
  if (font?.objectUrl) {
    return font.objectUrl;
  }

  return resolvePublicAssetUrl(font?.assetPath ?? "");
}

function buildLegendFontPreviewStyle(font) {
  if (!font?.measurementFamily) {
    return "";
  }

  return `font-family: "${font.measurementFamily}", "Hiragino Sans", "Yu Gothic UI", sans-serif; font-style: normal; font-weight: ${font.cssWeight ?? 400};`;
}

function getLegendFontMetaLabel(font) {
  if (font?.isMissing) {
    return t("font.missingMeta");
  }
  if (font?.isUserFont) {
    if (font.sourceKind === "remote") {
      return t("font.remoteMeta");
    }
    return t("font.userMeta");
  }
  return font?.fontKind === "variable" ? t("font.variableMeta") : t("font.staticMeta");
}

function formatFileByteLength(byteLength) {
  const bytes = Number(byteLength);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderUserFontFileInput(fieldKey) {
  return `
    <input
      type="file"
      accept="${escapeHtml(USER_LEGEND_FONT_FILE_ACCEPT)}"
      data-user-font-file
      data-user-font-field="${escapeHtml(fieldKey)}"
      multiple
      hidden
    />
  `;
}

function renderUserFontAddButton(fieldKey, { compact = false, label = t("font.addLocalFont") } = {}) {
  return `
    <button
      class="${compact ? "font-picker-local-action" : "font-picker-add-local"}"
      type="button"
      data-user-font-add="${escapeHtml(fieldKey)}"
    >
      <span>${escapeHtml(label)}</span>
      ${compact ? "" : `<span>${escapeHtml(t("font.addLocalFontHint"))}</span>`}
    </button>
  `;
}

function normalizeLegendFontSourceInputMode(value) {
  return LEGEND_FONT_SOURCE_INPUT_MODES.some((mode) => mode.key === value)
    ? value
    : LEGEND_FONT_SOURCE_MODE_GOOGLE;
}

function getLegendFontSourceInputModeConfig(value = state.legendFontSourceInputMode) {
  const mode = normalizeLegendFontSourceInputMode(value);
  return LEGEND_FONT_SOURCE_INPUT_MODES.find((item) => item.key === mode) ?? LEGEND_FONT_SOURCE_INPUT_MODES[0];
}

function getLegendFontSourceInputModeIndex(value = state.legendFontSourceInputMode) {
  const mode = normalizeLegendFontSourceInputMode(value);
  return Math.max(LEGEND_FONT_SOURCE_INPUT_MODES.findIndex((item) => item.key === mode), 0);
}

function renderLegendFontSourceModeControl(fieldKey) {
  const activeMode = normalizeLegendFontSourceInputMode(state.legendFontSourceInputMode);
  const activeIndex = getLegendFontSourceInputModeIndex(activeMode);
  const activeColumn = activeIndex % LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT;
  const activeRow = Math.floor(activeIndex / LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT);

  return `
    <span
      class="font-source-mode-tabs"
      role="tablist"
      aria-label="${escapeHtml(t("font.sourceModeLabel"))}"
      style="--source-mode-column-count: ${LEGEND_FONT_SOURCE_MODE_COLUMN_COUNT}; --source-mode-column: ${activeColumn}; --source-mode-row: ${activeRow};"
      data-user-font-source-mode-tabs
      data-user-font-source-active-mode="${escapeHtml(activeMode)}"
    >
      <span class="font-source-mode-tabs__indicator" aria-hidden="true"></span>
      ${LEGEND_FONT_SOURCE_INPUT_MODES.map((mode) => {
        const isActive = mode.key === activeMode;
        return `
          <button
            class="font-source-mode-tab ${isActive ? "is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${isActive ? "true" : "false"}"
            data-user-font-source-mode="${escapeHtml(mode.key)}"
            data-user-font-source-mode-field="${escapeHtml(fieldKey)}"
          >
            ${escapeHtml(t(mode.labelKey))}
          </button>
        `;
      }).join("")}
    </span>
  `;
}

function renderUserFontSourceInputPanel(fieldKey) {
  const modeConfig = getLegendFontSourceInputModeConfig();
  const inputMarkup = modeConfig.multiline
    ? `
      <textarea
        data-user-font-source-input="${escapeHtml(fieldKey)}"
        placeholder="${escapeHtml(t(modeConfig.placeholderKey))}"
        spellcheck="false"
        autocomplete="off"
        rows="4"
      ></textarea>
    `
    : `
      <input
        type="url"
        data-user-font-source-input="${escapeHtml(fieldKey)}"
        placeholder="${escapeHtml(t(modeConfig.placeholderKey))}"
        spellcheck="false"
        autocomplete="off"
      />
    `;

  return `
    <span
      class="font-picker-source-editor__input-panel"
      data-user-font-source-input-panel
      data-user-font-source-input-panel-mode="${escapeHtml(modeConfig.key)}"
    >
      <label class="font-picker-source-editor__field">
        <span>${escapeHtml(t(modeConfig.labelKey))}</span>
        ${inputMarkup}
      </label>
      <span class="font-picker-source-editor__hint">${escapeHtml(t(modeConfig.hintKey))}</span>
    </span>
  `;
}

function renderUserFontSourceCard(fieldKey) {
  return `
    <span class="font-picker-source-card" data-user-font-source-card>
      <button
        class="font-picker-source-card__summary"
        type="button"
        data-user-font-source-open="${escapeHtml(fieldKey)}"
        aria-expanded="false"
      >
        <span>${escapeHtml(t("font.addCdnFont"))}</span>
        <span>${escapeHtml(t("font.addCdnFontHint"))}</span>
      </button>
    </span>
  `;
}

function renderUserFontSourceEditor(fieldKey) {
  return `
    <span class="font-picker-source-editor" data-user-font-source-editor>
      <span class="font-picker-source-editor__header">
        <button
          class="font-picker-source-editor__back"
          type="button"
          data-user-font-source-close="${escapeHtml(fieldKey)}"
          aria-label="${escapeHtml(t("actions.back"))}"
        >
          ${escapeHtml(t("actions.back"))}
        </button>
        <strong>${escapeHtml(t("font.cdnFontUrlLabel"))}</strong>
      </span>
      ${renderLegendFontSourceModeControl(fieldKey)}
      ${renderUserFontSourceInputPanel(fieldKey)}
      <button
        class="font-picker-local-action"
        type="button"
        data-user-font-source-add="${escapeHtml(fieldKey)}"
      >
        ${escapeHtml(t("font.addCdnFont"))}
      </button>
    </span>
  `;
}

function renderLegendFontLocalInfo(font, fieldKey) {
  if (font?.isMissing) {
    return `
      <span class="note-card font-local-card font-local-card--missing">
        <strong>${escapeHtml(t("font.missingTitle"))}</strong>
        <p>${escapeHtml(t("font.missingBody"))}</p>
        ${renderUserFontAddButton(fieldKey, { compact: true, label: t("font.addMissingLocalFont") })}
      </span>
    `;
  }

  if (!font?.isUserFont) {
    return "";
  }

  const byteLength = formatFileByteLength(font.byteLength);
  const isRemoteFont = font.sourceKind === "remote";
  return `
    <span class="note-card font-local-card">
      <strong>${escapeHtml(isRemoteFont ? t("font.remoteTitle") : t("font.localTitle"))}</strong>
      <p>${escapeHtml(t("font.localBody", {
        fileName: font.fileName || font.label,
        byteLength: byteLength ? ` / ${byteLength}` : "",
      }))}</p>
      ${isRemoteFont ? `<p>${escapeHtml(t("font.remoteBody", {
        source: font.provider || font.sourceLabel || font.sourceUrl || font.fileName || font.label,
      }))}</p>` : ""}
      <span class="font-local-card__actions">
        ${renderUserFontAddButton(fieldKey, { compact: true, label: t("font.addLocalFont") })}
        <button
          class="font-picker-local-action font-picker-local-action--danger"
          type="button"
          data-user-font-delete="${escapeHtml(font.key)}"
        >
          ${escapeHtml(t("font.deleteLocalFont"))}
        </button>
      </span>
    </span>
  `;
}

function getLegendFontAttributionText(font) {
  const localizedLines = t(`font.attributions.${font?.key}`, {}, null);
  if (Array.isArray(localizedLines)) {
    return localizedLines.join("\n");
  }

  const lines = Array.isArray(font?.requiredAttributionLines) ? font.requiredAttributionLines : [];
  return lines.join("\n");
}

function renderLegendFontAttributionCard(font) {
  const attributionText = getLegendFontAttributionText(font);
  if (!attributionText) {
    return "";
  }

  const isCopied = state.copiedFontAttributionKey === font.key;
  return `
      <span class="note-card font-attribution-card">
      <span class="font-attribution-card__header">
        <strong>${t("font.attributionTitle")}</strong>
        <button
          class="font-attribution-card__copy"
          type="button"
          data-copy-font-attribution="${font.key}"
        >
          ${isCopied ? t("actions.copied") : t("actions.copy")}
        </button>
      </span>
      <pre class="font-attribution-card__body">${escapeHtml(attributionText)}</pre>
    </span>
  `;
}

function getLegendIconAttributionText(iconSet) {
  const iconSetMeta = getLegendIconSetMeta(iconSet);
  const localizedLines = t(`icons.attributions.${iconSetMeta.key}`, {}, null);
  if (Array.isArray(localizedLines)) {
    return localizedLines.join("\n");
  }

  const lines = Array.isArray(iconSetMeta.attributionLines) ? iconSetMeta.attributionLines : [];
  return lines.join("\n");
}

function renderLegendIconAttributionCard(iconSet) {
  const iconSetMeta = getLegendIconSetMeta(iconSet);
  const attributionText = getLegendIconAttributionText(iconSetMeta.key);
  if (!attributionText) {
    return "";
  }

  const isCopied = state.copiedIconAttributionKey === iconSetMeta.key;
  return `
    <span class="note-card font-attribution-card icon-attribution-card">
      <span class="font-attribution-card__header">
        <strong>${t("icons.attributionTitle")}</strong>
        <button
          class="font-attribution-card__copy"
          type="button"
          data-copy-icon-attribution="${escapeHtml(iconSetMeta.key)}"
        >
          ${isCopied ? t("actions.copied") : t("actions.copy")}
        </button>
      </span>
      <pre class="font-attribution-card__body">${escapeHtml(attributionText)}</pre>
    </span>
  `;
}

function getLegendFontLandingPageName(font) {
  const explicitName = String(font?.landingPageName ?? "").trim();
  if (explicitName) {
    return explicitName;
  }

  try {
    const landingPageUrl = String(font?.landingPageUrl ?? "").trim();
    const hostname = new URL(landingPageUrl).hostname.replace(/^www\./u, "");
    return hostname || t("font.landingPageLinkLabel");
  } catch {
    return t("font.landingPageLinkLabel");
  }
}

function renderLegendFontLandingPageLink(font) {
  if (!font?.landingPageUrl) {
    return "";
  }

  const pageName = getLegendFontLandingPageName(font);
  const pageIconUrl = String(font.landingPageIconUrl ?? "").trim();
  const pageIcon = pageIconUrl
    ? `
      <img
        class="font-picker-landing-page-link__icon"
        src="${escapeHtml(pageIconUrl)}"
        alt=""
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        aria-hidden="true"
        onerror="this.hidden=true"
      />
    `
    : "";
  const ariaLabel = t("font.landingPageLinkAriaLabel", { font: font.label, page: pageName }, pageName);

  return `
    <a
      class="font-picker-landing-page-link"
      href="${escapeHtml(font.landingPageUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      data-font-landing-page-url="${escapeHtml(font.landingPageUrl)}"
      aria-label="${escapeHtml(ariaLabel)}"
    >
      ${pageIcon}
      <span class="font-picker-landing-page-link__label">${escapeHtml(pageName)}</span>
    </a>
  `;
}

function renderCornerRadiusIcon(corner = "all") {
  const corners = corner === "all"
    ? ["left-top", "right-top", "right-bottom", "left-bottom"]
    : [corner];

  return `
    <span class="corner-radius-icon corner-radius-icon--${escapeHtml(corner)}" aria-hidden="true">
      ${corners.map((cornerName) => `<span class="corner-radius-icon__mark corner-radius-icon__mark--${escapeHtml(cornerName)}"></span>`).join("")}
    </span>
  `;
}

function renderCornerRadiusNumberControl(fieldKey, corner = "all") {
  const fieldConfig = getFieldConfig(fieldKey);
  const value = state.keycapParams[fieldKey];
  const label = resolveDynamicCopy(fieldConfig?.label);
  const fieldMin = resolveFieldAttribute(fieldConfig?.min);
  const fieldMax = resolveFieldAttribute(fieldConfig?.max);
  const fieldStep = resolveFieldAttribute(fieldConfig?.step);
  const sliderMarkup = renderSliderRangeControl(fieldKey, fieldConfig, value, label);

  return `
    <span class="corner-radius-control">
      ${renderCornerRadiusIcon(corner)}
      ${sliderMarkup}
      <span class="field-control corner-radius-control__input">
        <input
          type="number"
          data-field="${fieldKey}"
          value="${formatNumericFieldValue(fieldKey, value)}"
          ${fieldMin != null ? `min="${fieldMin}"` : ""}
          ${fieldMax != null ? `max="${fieldMax}"` : ""}
          ${fieldStep != null ? `step="${fieldStep}"` : ""}
          aria-label="${escapeHtml(label)}"
        />
      </span>
    </span>
  `;
}

function renderCornerRadiusControls(fieldSet, controlOrder, individualEnabled) {
  const controlsClassName = individualEnabled
    ? "corner-radius-grid corner-radius-grid--individual"
    : "corner-radius-grid corner-radius-grid--shared";
  const controlsMarkup = individualEnabled
    ? controlOrder.map(({ key, corner }) => renderCornerRadiusNumberControl(key, corner)).join("")
    : renderCornerRadiusNumberControl(fieldSet.sharedFieldKey, "all");

  return `
    <span class="${controlsClassName}" data-corner-radius-controls="${escapeHtml(fieldSet.individualFieldKey)}">
      ${controlsMarkup}
    </span>
  `;
}

function renderCornerRadiusField(field, fieldClassName = "") {
  const fieldViewTransitionName = createViewTransitionName("field", field.key);
  const fieldLabel = resolveDynamicCopy(field.label);
  const fieldHint = resolveDynamicCopy(field.hint);
  const fieldSet = CORNER_RADIUS_FIELD_SETS.find((item) => item.sharedFieldKey === field.key) ?? CORNER_RADIUS_FIELD_SETS[0];
  const individualFieldKey = field.individualFieldKey ?? fieldSet.individualFieldKey;
  const controlOrder = field.controlOrder ?? fieldSet.controlOrder;
  const individualEnabled = Boolean(state.keycapParams[individualFieldKey]);
  const toggleConfig = getFieldConfig(individualFieldKey);
  const toggleLabel = resolveDynamicCopy(toggleConfig?.label);
  const toggleHint = resolveDynamicCopy(toggleConfig?.hint);
  const controls = renderCornerRadiusControls(fieldSet, controlOrder, individualEnabled);

  return `
    <div class="field field--corner-radius${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
      <span class="field-copy">
        <span class="field-label">${fieldLabel}</span>
        <span class="field-hint">${fieldHint}</span>
      </span>
      <span class="corner-radius-panel" data-corner-radius-panel="${escapeHtml(individualFieldKey)}">
        <label class="checkbox-pill checkbox-toggle corner-radius-toggle" title="${escapeHtml(toggleHint)}">
          <input class="checkbox-toggle__input corner-radius-toggle__input" type="checkbox" data-field="${individualFieldKey}" data-corner-radius-toggle="${escapeHtml(individualFieldKey)}" aria-label="${escapeHtml(toggleLabel)}" ${individualEnabled ? "checked" : ""} />
          <span class="checkbox-toggle__label corner-radius-toggle__label" aria-hidden="true">${toggleLabel}</span>
          <span class="checkbox-toggle__switch corner-radius-toggle__switch" aria-hidden="true"></span>
        </label>
        ${controls}
      </span>
    </div>
  `;
}

function renderLegendFontPickerSegmentControl(fieldKey = state.legendFontPickerFieldKey || "legendFontKey") {
  const activeSegment = normalizeLegendFontPickerSegment(state.legendFontPickerSegment);
  const activeIndex = getLegendFontPickerSegmentIndex(activeSegment);
  const buttons = LEGEND_FONT_PICKER_SEGMENTS.map((segment) => {
    const isActive = segment.key === activeSegment;
    return `
      <button
        class="font-picker-segment ${isActive ? "is-active" : ""}"
        type="button"
        role="tab"
        aria-selected="${isActive ? "true" : "false"}"
        data-font-picker-segment="${escapeHtml(segment.key)}"
        data-font-picker-segment-field="${escapeHtml(fieldKey)}"
      >
        ${escapeHtml(t(segment.labelKey))}
      </button>
    `;
  }).join("");

  return `
    <span
      class="font-picker-segments"
      role="tablist"
      aria-label="${escapeHtml(t("font.segmentControlLabel"))}"
      style="--segment-count: ${LEGEND_FONT_PICKER_SEGMENTS.length}; --segment-index: ${activeIndex};"
      data-font-picker-segments
      data-font-picker-active-segment="${escapeHtml(activeSegment)}"
    >
      <span class="font-picker-segments__indicator" aria-hidden="true"></span>
      ${buttons}
    </span>
  `;
}

function renderSliderRangeControl(fieldKey, fieldConfig, value, label, options = {}) {
  const sliderAttributes = resolveFieldSliderAttributes(fieldConfig);
  if (!canRenderFieldSlider(sliderAttributes)) {
    return "";
  }

  const inputAttributes = options.inputAttributes ?? `data-field="${fieldKey}" data-field-control="slider"`;
  const sliderDisabled = sliderAttributes.min >= sliderAttributes.max;
  const sliderGuidePosition = sliderAttributes.guidePosition;
  const sliderGuideStyle = sliderGuidePosition == null
    ? ""
    : ` style="--field-slider-guide-position: ${formatSliderGuidePosition(sliderGuidePosition)};"`;

  return `
    <span class="field-range-slider" data-field-slider="${fieldKey}">
      <span class="field-slider-row">
        <span class="field-slider-limit" data-field-slider-limit="min">${formatNumericFieldValue(fieldKey, sliderAttributes.min, sliderAttributes.step)}</span>
        <span class="field-slider-track"${sliderGuideStyle}>
          <input
            type="range"
            ${inputAttributes}
            value="${formatSliderFieldValue(fieldKey, value, sliderAttributes)}"
            min="${sliderAttributes.min}"
            max="${sliderAttributes.max}"
            ${sliderAttributes.step != null ? `step="${sliderAttributes.step}"` : ""}
            ${sliderDisabled ? "disabled" : ""}
            aria-label="${escapeHtml(label)}"
          />
          <span class="field-slider-guide-rail" aria-hidden="true">
            <span
              class="field-slider-guide"
              data-field-slider-guide
              ${sliderGuidePosition == null ? "hidden" : ""}
            ></span>
          </span>
        </span>
        <span class="field-slider-limit" data-field-slider-limit="max">${formatNumericFieldValue(fieldKey, sliderAttributes.max, sliderAttributes.step)}</span>
      </span>
    </span>
  `;
}

function renderLegendFontPickerResultItems(fieldKey = state.legendFontPickerFieldKey || "legendFontKey") {
  const activeSegment = normalizeLegendFontPickerSegment(state.legendFontPickerSegment);
  const matchingFonts = getLegendFontPickerResults(
    state.legendFontPickerQuery,
    activeSegment,
    fieldKey,
  );
  const addLocalFontButton = activeSegment === LEGEND_FONT_PICKER_SEGMENT_USER
    ? `${renderUserFontAddButton(fieldKey)}${renderUserFontSourceCard(fieldKey)}`
    : "";
  const resultMarkup = matchingFonts.length === 0
    ? `<div class="font-picker-empty">${t("font.noResults")}</div>`
    : matchingFonts
      .map((font) => {
        const isSelected = font.key === state.keycapParams[fieldKey];
        const previewStyle = buildLegendFontPreviewStyle(font);
        const metaLabel = getLegendFontMetaLabel(font);

        return `
          <button
            class="font-picker-option ${isSelected ? "is-selected" : ""}"
            type="button"
            data-font-picker-option="${font.key}"
            data-font-picker-field="${fieldKey}"
          >
            <span class="font-picker-option__preview" style="${escapeHtml(previewStyle)}">${escapeHtml(font.label)}</span>
            <span class="font-picker-meta-row">
              <span class="font-picker-option__meta">${escapeHtml(metaLabel)}</span>
            </span>
          </button>
        `;
      })
      .join("");

  return `${addLocalFontButton}${resultMarkup}`;
}

function renderLegendFontPickerOptions(fieldKey = state.legendFontPickerFieldKey || "legendFontKey") {
  return `
    ${renderLegendFontPickerSegmentControl(fieldKey)}
    <span class="font-picker-option-list" data-font-picker-option-list>
      ${renderLegendFontPickerResultItems(fieldKey)}
    </span>
  `;
}

function renderLegendFontPickerSearchContent(fieldKey = state.legendFontPickerFieldKey || "legendFontKey") {
  return `
    <label class="field-control font-picker-search-input">
      <span class="font-picker-search-input__icon">${SEARCH_ICON_MARKUP}</span>
      <input
        type="text"
        data-font-picker-query="${fieldKey}"
        value="${escapeHtml(state.legendFontPickerQuery)}"
        placeholder="${escapeHtml(t("font.searchPlaceholder"))}"
        spellcheck="false"
        autocomplete="off"
      />
    </label>
    <span class="font-picker-options" data-font-picker-options>
      ${renderLegendFontPickerOptions(fieldKey)}
    </span>
  `;
}

function renderLegendFontPickerPopoverContent(
  fieldKey = state.legendFontPickerFieldKey || "legendFontKey",
  isSourceEditorOpen = state.legendFontSourceEditorFieldKey === fieldKey,
) {
  return isSourceEditorOpen
    ? renderUserFontSourceEditor(fieldKey)
    : renderLegendFontPickerSearchContent(fieldKey);
}

function findLegendParamPrefixByFieldKey(fieldKey, suffix) {
  return [...TOP_LEGEND_CONFIGS, ...SIDE_LEGEND_CONFIGS]
    .map((config) => config.paramPrefix)
    .find((prefix) => fieldKey === legendParamKey(prefix, suffix));
}

function getLegendIconSetFieldKey(iconNameFieldKey) {
  const prefix = findLegendParamPrefixByFieldKey(iconNameFieldKey, LEGEND_FIELD_SUFFIXES.iconName);
  return prefix ? legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.iconSet) : "legendIconSet";
}

function getLegendIconFillFieldKey(iconNameFieldKey) {
  const prefix = findLegendParamPrefixByFieldKey(iconNameFieldKey, LEGEND_FIELD_SUFFIXES.iconName);
  return prefix ? legendParamKey(prefix, LEGEND_FIELD_SUFFIXES.iconFill) : "legendIconFill";
}

function renderLegendIconSvg(icon, filled = false) {
  return buildLegendIconSvg(icon, { color: "currentColor", filled });
}

function getLegendIconPickerResults(fieldKey = state.legendIconPickerFieldKey || "legendIconName") {
  const iconSetFieldKey = getLegendIconSetFieldKey(fieldKey);
  const iconSet = resolveLegendIconSet(state.keycapParams[iconSetFieldKey]);
  return searchLegendIcons(state.legendIconPickerQuery, iconSet, LEGEND_ICON_PICKER_RESULT_LIMIT);
}

function renderLegendIconPickerResultItems(fieldKey = state.legendIconPickerFieldKey || "legendIconName") {
  const matchingIcons = getLegendIconPickerResults(fieldKey);
  const selectedIconSet = resolveLegendIconSet(state.keycapParams[getLegendIconSetFieldKey(fieldKey)]);
  const selectedIconName = resolveLegendIconName(state.keycapParams[fieldKey], selectedIconSet);
  const selectedIconFill = isLegendIconFillAvailable(selectedIconName, selectedIconSet)
    && Boolean(state.keycapParams[getLegendIconFillFieldKey(fieldKey)]);
  if (matchingIcons.length === 0) {
    return `<div class="icon-picker-empty">${t("icons.noResults")}</div>`;
  }

  return matchingIcons.map((icon) => {
    const isSelected = icon.name === selectedIconName;
    return `
      <button
        class="icon-picker-option ${isSelected ? "is-selected" : ""}"
        type="button"
        data-icon-picker-option="${escapeHtml(icon.name)}"
        data-icon-picker-field="${escapeHtml(fieldKey)}"
        title="${escapeHtml(icon.name)}"
      >
        <span class="icon-picker-option__glyph" aria-hidden="true">${renderLegendIconSvg(icon, selectedIconFill)}</span>
        <span class="icon-picker-option__name">${escapeHtml(icon.name)}</span>
      </button>
    `;
  }).join("");
}

function renderLegendIconPickerContent(fieldKey = state.legendIconPickerFieldKey || "legendIconName") {
  const hasSearchQuery = Boolean(String(state.legendIconPickerQuery ?? "").trim());
  const resultHeading = hasSearchQuery ? t("icons.searchResultsLabel") : t("icons.recommendedLabel");

  return `
    <label class="field-control font-picker-search-input icon-picker-search-input">
      <span class="font-picker-search-input__icon">${SEARCH_ICON_MARKUP}</span>
      <input
        type="text"
        data-icon-picker-query="${escapeHtml(fieldKey)}"
        value="${escapeHtml(state.legendIconPickerQuery)}"
        placeholder="${escapeHtml(t("icons.searchPlaceholder"))}"
        spellcheck="false"
        autocomplete="off"
      />
    </label>
    <span class="icon-picker-result-heading">${escapeHtml(resultHeading)}</span>
    <span class="icon-picker-option-list" data-icon-picker-option-list>
      ${renderLegendIconPickerResultItems(fieldKey)}
    </span>
  `;
}

function getCheckboxStatusLabel(checked) {
  return checked ? t("actions.on") : t("actions.off");
}

function getCheckboxAriaLabel(fieldKey, checked) {
  const fieldLabel = resolveDynamicCopy(getFieldConfig(fieldKey)?.label);
  const statusLabel = getCheckboxStatusLabel(checked);
  return fieldLabel ? `${fieldLabel}: ${statusLabel}` : statusLabel;
}

function syncCheckboxToggleDom(input) {
  const fieldKey = input?.dataset?.field;
  if (!fieldKey || input?.type !== "checkbox") {
    return;
  }

  if (CORNER_RADIUS_INDIVIDUAL_FIELD_KEYS.has(fieldKey)) {
    const toggleLabel = resolveDynamicCopy(getFieldConfig(fieldKey)?.label);
    input.setAttribute("aria-label", toggleLabel);
    input.parentElement?.querySelector(".corner-radius-toggle__label")?.replaceChildren(toggleLabel);
    return;
  }

  input.setAttribute("aria-label", getCheckboxAriaLabel(fieldKey, input.checked));
  input.parentElement?.querySelector(".checkbox-toggle__label")?.replaceChildren(getCheckboxStatusLabel(input.checked));
}

function renderPreviewColorSwatchField(field, fieldClassName, fieldViewTransitionName, fieldLabel, fieldHint, fieldOptions) {
  const selectedValue = resolveJStemLp01PreviewColor(state.keycapParams[field.key]);
  const labelId = `field-label-${field.key}`;
  const hintId = `field-hint-${field.key}`;
  const hintAttribute = fieldHint ? ` aria-describedby="${hintId}"` : "";
  const radioName = `field-${field.key}`;

  return `
    <div class="field field--preview-color${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
      <span class="field-copy">
        <span class="field-label" id="${labelId}">${fieldLabel}</span>
        ${fieldHint ? `<span class="field-hint" id="${hintId}">${fieldHint}</span>` : ""}
      </span>
      <span class="preview-color-options" role="radiogroup" aria-labelledby="${labelId}"${hintAttribute}>
        ${fieldOptions.map((option) => {
          const previewStyle = getJStemLp01PreviewStyle(option.value);
          const swatchClassName = option.swatchClass
            ? ` preview-color-option__swatch--${toKebabCase(option.swatchClass)}`
            : "";
          const inputId = `field-${field.key}-${option.value}`;

          return `
            <label class="preview-color-option" for="${escapeHtml(inputId)}">
              <input
                class="preview-color-option__input"
                id="${escapeHtml(inputId)}"
                type="radio"
                name="${escapeHtml(radioName)}"
                data-field="${field.key}"
                value="${escapeHtml(option.value)}"
                aria-label="${escapeHtml(option.label)}"
                ${option.value === selectedValue ? "checked" : ""}
              />
              <span class="preview-color-option__circle" aria-hidden="true">
                <span
                  class="preview-color-option__swatch${swatchClassName}"
                  style="--preview-color-option-color: ${escapeHtml(previewStyle.colorHex)};"
                ></span>
              </span>
              <span class="preview-color-option__label">${escapeHtml(option.label)}</span>
            </label>
          `;
        }).join("")}
      </span>
    </div>
  `;
}

function renderField(field, options = {}) {
  const value = state.keycapParams[field.key];
  const fieldViewTransitionName = createViewTransitionName("field", field.key);
  const fieldLabel = resolveDynamicCopy(field.label);
  const fieldHint = resolveDynamicCopy(field.hint);
  const fieldNote = resolveDynamicCopy(field.note);
  const primaryMiniLabel = resolveDynamicCopy(field.primaryMiniLabel);
  const secondaryLabel = resolveDynamicCopy(field.secondaryLabel);
  const fieldPlaceholder = resolveDynamicCopy(field.placeholder);
  const fieldOptions = resolveFieldOptions(field);
  const isDisabled = isFieldDisabled(field);
  const fieldMin = resolveFieldAttribute(field.min);
  const fieldMax = resolveFieldAttribute(field.max);
  const fieldStep = resolveFieldAttribute(field.step);
  const sliderAttributes = resolveFieldSliderAttributes(field);
  const secondaryMin = resolveFieldAttribute(field.secondaryMin);
  const secondaryStep = resolveFieldAttribute(field.secondaryStep);
  const fieldClassName = options.className ? ` ${options.className}` : "";
  const dependentFields = options.dependentFields ?? [];
  const dependentFieldByKey = options.fieldByKey ?? null;
  const dependentClassName = dependentFields.length > 0 ? " field--with-dependents" : "";

  if (field.type === "key-unit-basis") {
    const inputId = `field-control-${field.key}`;
    const leadingIcon = renderKeyUnitBasisIcon();
    const leadingIconClassName = getLeadingIconFieldClassName(leadingIcon);
    const keyUnitSliderMarkup = renderSliderRangeControl(field.key, field, getKeyUnitMm(), fieldLabel, {
      inputAttributes: "data-key-unit-mm data-key-unit-slider",
    });

    return `
      <div class="field field--key-unit-basis${leadingIconClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        ${leadingIcon}
        <label class="field-copy" for="${inputId}">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </label>
        ${keyUnitSliderMarkup ? `<span class="field-range-control field-range-control--key-unit">${keyUnitSliderMarkup}</span>` : ""}
        <span class="field-control">
          <input
            id="${inputId}"
            type="number"
            data-key-unit-mm
            value="${formatKeyUnitMmInputValue()}"
            ${fieldMin != null ? `min="${fieldMin}"` : ""}
            ${fieldStep != null ? `step="${fieldStep}"` : ""}
            aria-label="${escapeHtml(fieldLabel)}"
          />
          ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
        </span>
        <span class="key-unit-basis-readout" aria-live="polite" data-key-unit-readout>${renderKeyUnitBasisReadout()}</span>
      </div>
    `;
  }

  if (field.type === "checkbox") {
    const leadingIcon = field.key === "topHatEnabled" ? renderKeyTopHatIcon() : "";
    const checkboxIconClassName = getLeadingIconFieldClassName(leadingIcon);
    const checkboxStatusLabel = getCheckboxStatusLabel(Boolean(value));
    const checkboxAriaLabel = getCheckboxAriaLabel(field.key, Boolean(value));
    const checkboxCopy = `
      <span class="field-copy">
        <span class="field-label">${fieldLabel}</span>
        <span class="field-hint">${fieldHint}</span>
      </span>
    `;
    const checkboxControl = `
      <label class="checkbox-pill checkbox-toggle">
        <input class="checkbox-toggle__input" type="checkbox" data-field="${field.key}" aria-label="${escapeHtml(checkboxAriaLabel)}" ${value ? "checked" : ""} />
        <span class="checkbox-toggle__label" aria-hidden="true">${checkboxStatusLabel}</span>
        <span class="checkbox-toggle__switch" aria-hidden="true"></span>
      </label>
    `;

    if (dependentFields.length > 0) {
      return `
        <div class="field field--checkbox${checkboxIconClassName}${dependentClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
          ${leadingIcon}
          ${checkboxCopy}
          ${checkboxControl}
          ${fieldNote ? `<p class="field-note">${escapeHtml(fieldNote)}</p>` : ""}
          ${renderDependentFieldList(dependentFields, dependentFieldByKey)}
        </div>
      `;
    }

    return `
      <div class="field field--checkbox${checkboxIconClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        ${leadingIcon}
        ${checkboxCopy}
        ${checkboxControl}
      </div>
    `;
  }

  if (field.type === "preview-color-swatch") {
    return renderPreviewColorSwatchField(field, fieldClassName, fieldViewTransitionName, fieldLabel, fieldHint, fieldOptions);
  }

  if (field.type === "font-search") {
    const selectedFont = resolveLegendFontConfig(value);
    const selectedFontLabel = selectedFont.label;
    const selectedPreviewStyle = buildLegendFontPreviewStyle(selectedFont);
    const selectedFontMetaLabel = getLegendFontMetaLabel(selectedFont);
    const selectedFontAttributionCard = renderLegendFontAttributionCard(selectedFont);
    const selectedFontLandingPageLink = renderLegendFontLandingPageLink(selectedFont);
    const selectedFontLocalInfo = renderLegendFontLocalInfo(selectedFont, field.key);
    const pickerId = `font-picker-${field.key}`;
    const isPickerOpen = state.legendFontPickerFieldKey === field.key;
    const isSourceEditorOpen = state.legendFontSourceEditorFieldKey === field.key;

    return `
      <div class="field field--font-search${dependentClassName} ${isPickerOpen ? "is-open" : ""}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        <span class="font-picker" data-font-picker>
          ${renderUserFontFileInput(field.key)}
          <span class="font-picker-trigger-shell">
            <span class="field-control font-picker-trigger">
              <span class="font-picker-selection">
                <span class="font-picker-selection__label" style="${escapeHtml(selectedPreviewStyle)}">${escapeHtml(selectedFontLabel)}</span>
                <span class="font-picker-meta-row">
                  <span class="font-picker-selection__meta">${escapeHtml(selectedFontMetaLabel)}</span>
                </span>
              </span>
              <button
                class="font-picker-search-button"
                type="button"
                data-font-picker-open="${field.key}"
                aria-expanded="${isPickerOpen ? "true" : "false"}"
                aria-controls="${pickerId}"
                aria-label="${escapeHtml(t("font.searchAriaLabel"))}"
              >
                ${SEARCH_ICON_MARKUP}
              </button>
            </span>
            ${isPickerOpen ? `
              <span
                class="font-picker-popover ${isSourceEditorOpen ? "is-source-editor" : ""}"
                id="${pickerId}"
                role="dialog"
                aria-label="${escapeHtml(isSourceEditorOpen ? t("font.cdnFontUrlLabel") : t("font.searchDialogLabel"))}"
              >
                <span class="font-picker-popover__content" data-font-picker-popover-content>
                  ${renderLegendFontPickerPopoverContent(field.key, isSourceEditorOpen)}
                </span>
              </span>
            ` : ""}
          </span>
          ${selectedFontLandingPageLink}
          ${selectedFontLocalInfo}
          ${selectedFontAttributionCard}
        </span>
        ${renderDependentFieldList(dependentFields, dependentFieldByKey)}
      </div>
    `;
  }

  if (field.type === "icon-search") {
    const iconSetFieldKey = getLegendIconSetFieldKey(field.key);
    const selectedIconSet = resolveLegendIconSet(state.keycapParams[iconSetFieldKey]);
    const iconFillFieldKey = getLegendIconFillFieldKey(field.key);
    const selectedIconSetMeta = getLegendIconSetMeta(selectedIconSet);
    const selectedIcon = resolveLegendIcon(value, selectedIconSet);
    const selectedIconName = selectedIcon?.name ?? resolveLegendIconName(value, selectedIconSet);
    const selectedIconFill = isLegendIconFillAvailable(selectedIconName, selectedIconSet)
      && Boolean(state.keycapParams[iconFillFieldKey]);
    const selectedIconSetLabel = t(`options.legendIconSet.${selectedIconSet}`, {}, selectedIconSetMeta.label);
    const selectedIconCatalogUrl = selectedIconSetMeta.catalogUrl || selectedIconSetMeta.sourceUrl;
    const selectedIconFaviconUrl = selectedIconSetMeta.faviconUrl || "";
    const selectedIconAttributionCard = renderLegendIconAttributionCard(selectedIconSet);
    const pickerId = `icon-picker-${field.key}`;
    const isPickerOpen = state.legendIconPickerFieldKey === field.key;

    return `
      <div class="field field--icon-search ${isPickerOpen ? "is-open" : ""}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        <span class="icon-picker" data-icon-picker>
          <span class="icon-picker-trigger-shell">
            <span class="field-control icon-picker-trigger">
              <span class="icon-picker-selection">
                <span class="icon-picker-selection__glyph" aria-hidden="true">${renderLegendIconSvg(selectedIcon, selectedIconFill)}</span>
                <span class="icon-picker-selection__copy">
                  <span class="icon-picker-selection__label">${escapeHtml(selectedIconName)}</span>
                  <span class="icon-picker-selection__meta">${escapeHtml(selectedIconSetLabel)}</span>
                </span>
              </span>
              <button
                class="font-picker-search-button icon-picker-search-button"
                type="button"
                data-icon-picker-open="${field.key}"
                aria-expanded="${isPickerOpen ? "true" : "false"}"
                aria-controls="${pickerId}"
                aria-label="${escapeHtml(t("icons.searchAriaLabel"))}"
              >
                ${SEARCH_ICON_MARKUP}
              </button>
            </span>
            ${selectedIconCatalogUrl ? `<a
              class="font-attribution-link icon-picker-catalog-link"
              href="${escapeHtml(selectedIconCatalogUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${selectedIconFaviconUrl ? `<img
                class="icon-picker-catalog-link__favicon"
                src="${escapeHtml(selectedIconFaviconUrl)}"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
              />` : ""}
              <span class="icon-picker-catalog-link__label">${escapeHtml(t("icons.openCatalog", { set: selectedIconSetLabel }))}</span>
            </a>` : ""}
            ${isPickerOpen ? `
              <span
                class="font-picker-popover icon-picker-popover"
                id="${pickerId}"
                role="dialog"
                aria-label="${escapeHtml(t("icons.searchDialogLabel"))}"
              >
                <span class="font-picker-popover__content icon-picker-popover__content" data-icon-picker-popover-content>
                  ${renderLegendIconPickerContent(field.key)}
                </span>
              </span>
            ` : ""}
          </span>
          ${selectedIconAttributionCard}
        </span>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <label class="field${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        <span class="field-control field-control--select">
          <select data-field="${field.key}" ${isDisabled ? "disabled" : ""}>
            ${fieldOptions
              .map(
                (option) => `
                  <option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>
                `,
              )
              .join("")}
          </select>
        </span>
      </label>
    `;
  }

  if (field.type === "text") {
    return `
      <label class="field${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        <span class="field-control">
          <input
            type="text"
            data-field="${field.key}"
            value="${escapeHtml(value)}"
            ${field.maxLength != null ? `maxlength="${field.maxLength}"` : ""}
            ${fieldPlaceholder ? `placeholder="${escapeHtml(fieldPlaceholder)}"` : ""}
          />
        </span>
      </label>
    `;
  }

  if (field.type === "color") {
    const normalizedValue = getColorFieldValue(field.key);
    const inputId = `field-${field.key}`;

    return `
      <div class="field field--color${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        <label class="field-copy" for="${inputId}">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </label>
        <span class="field-control-cluster field-control-cluster--color">
          <span class="field-control field-control--color">
            <span class="field-color-chip" data-color-chip="${field.key}" style="--field-color: ${escapeHtml(normalizedValue)};"></span>
            <input
              id="${inputId}"
              type="text"
              data-field="${field.key}"
              data-coloris
              inputmode="text"
              spellcheck="false"
              autocomplete="off"
              aria-invalid="false"
              value="${escapeHtml(normalizedValue)}"
              maxlength="7"
              ${fieldPlaceholder ? `placeholder="${escapeHtml(fieldPlaceholder)}"` : ""}
            />
          </span>
          <button class="field-color-button" type="button" data-color-picker-open="${field.key}">
            ${t("actions.choose")}
          </button>
        </span>
      </div>
    `;
  }

  if (field.type === "corner-radius") {
    return renderCornerRadiusField(field, fieldClassName);
  }

  if (field.type === "linked-size") {
    const leadingIcon = field.key === "keyWidth"
      ? renderKeyUnitBasisIcon()
      : field.key === "keyDepth"
        ? renderKeyDepthBasisIcon()
        : "";
    const linkedSizeIconClassName = getLeadingIconFieldClassName(leadingIcon);
    const linkedSizeSliderMarkup = renderSliderRangeControl(field.key, field, value, fieldLabel);

    return `
      <div class="field field--linked-size${linkedSizeIconClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        ${leadingIcon}
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        ${linkedSizeSliderMarkup ? `<span class="field-range-control field-range-control--linked-size">${linkedSizeSliderMarkup}</span>` : ""}
        <span class="field-control-cluster field-control-cluster--linked-size">
          <span class="field-mini-control">
            <span class="field-mini-control__label">${primaryMiniLabel}</span>
            <span class="field-control">
              <input
                type="number"
                data-field="${field.key}"
                value="${formatNumericFieldValue(field.key, value)}"
                ${fieldMin != null ? `min="${fieldMin}"` : ""}
                ${fieldMax != null ? `max="${fieldMax}"` : ""}
                ${fieldStep != null ? `step="${fieldStep}"` : ""}
                aria-label="${escapeHtml(primaryMiniLabel || fieldLabel)}"
              />
              ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
            </span>
          </span>
          <span class="field-mini-control">
            <span class="field-mini-control__label">${secondaryLabel}</span>
            <span class="field-control">
              <input
                type="number"
                data-field="${field.secondaryField}"
                value="${formatUnitInputValue(value)}"
                ${secondaryMin != null ? `min="${secondaryMin}"` : ""}
                ${secondaryStep != null ? `step="${secondaryStep}"` : ""}
                aria-label="${escapeHtml(secondaryLabel || fieldLabel)}"
              />
              ${field.secondaryUnit ? `<span class="field-unit">${field.secondaryUnit}</span>` : ""}
            </span>
          </span>
        </span>
      </div>
    `;
  }

  if (field.type === "number-pair") {
    const secondaryValue = state.keycapParams[field.secondaryField];
    const secondaryFieldConfig = getFieldConfig(field.secondaryField);
    const secondaryMinValue = resolveFieldAttribute(field.secondaryMin ?? secondaryFieldConfig?.min);
    const secondaryMaxValue = resolveFieldAttribute(field.secondaryMax ?? secondaryFieldConfig?.max);
    const secondaryStepValue = resolveFieldAttribute(field.secondaryStep ?? secondaryFieldConfig?.step);
    const leadingIcon = field.key === "topOffsetX"
      ? renderKeyTopOffsetIcon()
      : field.key === "wallThickness"
        ? renderKeyWallThicknessIcon()
        : "";
    const numberPairIconClassName = getLeadingIconFieldClassName(leadingIcon);
    const primarySliderMarkup = renderSliderRangeControl(field.key, field, value, primaryMiniLabel || fieldLabel);
    const secondarySliderMarkup = renderSliderRangeControl(field.secondaryField, secondaryFieldConfig, secondaryValue, secondaryLabel || fieldLabel);
    const numberPairSliderClassName = primarySliderMarkup || secondarySliderMarkup ? " field-control-cluster--slider-pair" : "";

    return `
      <div class="field field--number-pair${numberPairIconClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        ${leadingIcon}
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        <span class="field-control-cluster field-control-cluster--pair${numberPairSliderClassName}">
          <span class="field-mini-control">
            <span class="field-mini-control__label">${primaryMiniLabel}</span>
            ${primarySliderMarkup}
            <span class="field-control">
              <input
                type="number"
                data-field="${field.key}"
                value="${formatNumericFieldValue(field.key, value)}"
                ${fieldMin != null ? `min="${fieldMin}"` : ""}
                ${fieldMax != null ? `max="${fieldMax}"` : ""}
                ${fieldStep != null ? `step="${fieldStep}"` : ""}
                aria-label="${escapeHtml(primaryMiniLabel || fieldLabel)}"
              />
              ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
            </span>
          </span>
          <span class="field-mini-control">
            <span class="field-mini-control__label">${secondaryLabel}</span>
            ${secondarySliderMarkup}
            <span class="field-control">
              <input
                type="number"
                data-field="${field.secondaryField}"
                value="${formatNumericFieldValue(field.secondaryField, secondaryValue)}"
                ${secondaryMinValue != null ? `min="${secondaryMinValue}"` : ""}
                ${secondaryMaxValue != null ? `max="${secondaryMaxValue}"` : ""}
                ${secondaryStepValue != null ? `step="${secondaryStepValue}"` : ""}
                aria-label="${escapeHtml(secondaryLabel || fieldLabel)}"
              />
              ${field.secondaryUnit ? `<span class="field-unit">${field.secondaryUnit}</span>` : ""}
            </span>
          </span>
        </span>
      </div>
    `;
  }

  if (dependentFields.length > 0) {
    const inputId = `field-control-${field.key}`;
    const dependentSliderMarkup = renderSliderRangeControl(field.key, field, value, fieldLabel);

    if (dependentSliderMarkup) {
      return `
        <div class="field field--slider-number${dependentClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
          <span class="field-copy">
            <span class="field-label">${fieldLabel}</span>
            <span class="field-hint">${fieldHint}</span>
          </span>
          <span class="field-range-control" data-field-slider="${field.key}">
            ${dependentSliderMarkup}
            <span class="field-control field-range-control__number">
              <input
                id="${inputId}"
                type="number"
                data-field="${field.key}"
                data-field-control="number"
                value="${formatNumericFieldValue(field.key, value)}"
                ${fieldMin != null ? `min="${fieldMin}"` : ""}
                ${fieldMax != null ? `max="${fieldMax}"` : ""}
                ${fieldStep != null ? `step="${fieldStep}"` : ""}
                aria-label="${escapeHtml(fieldLabel)}"
              />
              ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
            </span>
          </span>
          ${renderDependentFieldList(dependentFields, dependentFieldByKey)}
        </div>
      `;
    }

    return `
      <div class="field${dependentClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        <label class="field-copy" for="${inputId}">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </label>
        <span class="field-control">
          <input
            id="${inputId}"
            type="number"
            data-field="${field.key}"
            value="${formatNumericFieldValue(field.key, value)}"
            ${fieldMin != null ? `min="${fieldMin}"` : ""}
            ${fieldMax != null ? `max="${fieldMax}"` : ""}
            ${fieldStep != null ? `step="${fieldStep}"` : ""}
          />
          ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
        </span>
        ${renderDependentFieldList(dependentFields, dependentFieldByKey)}
      </div>
    `;
  }

  const leadingIcon = field.key === "topCenterHeight"
    ? renderKeyTopCenterHeightIcon()
    : field.key === "wallThickness" || field.key === "topThickness"
      ? renderKeyWallThicknessIcon()
      : field.key === "topScale"
        ? renderKeyTopTaperIcon()
        : field.key === "keycapEdgeRadius"
          ? renderKeycapEdgeRadiusIcon()
          : field.key === "keycapShoulderRadius"
            ? renderKeycapShoulderRadiusIcon()
            : "";
  const numberIconClassName = leadingIcon ? `${getLeadingIconFieldClassName(leadingIcon)} field--single-number` : "";

  if (canRenderFieldSlider(sliderAttributes)) {
    return `
      <div class="field field--slider-number${numberIconClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
        ${leadingIcon}
        <span class="field-copy">
          <span class="field-label">${fieldLabel}</span>
          <span class="field-hint">${fieldHint}</span>
        </span>
        <span class="field-range-control" data-field-slider="${field.key}">
          ${renderSliderRangeControl(field.key, field, value, fieldLabel)}
          <span class="field-control field-range-control__number">
            <input
              type="number"
              data-field="${field.key}"
              data-field-control="number"
              value="${formatNumericFieldValue(field.key, value)}"
              ${fieldMin != null ? `min="${fieldMin}"` : ""}
              ${fieldMax != null ? `max="${fieldMax}"` : ""}
              ${fieldStep != null ? `step="${fieldStep}"` : ""}
              aria-label="${escapeHtml(fieldLabel)}"
            />
            ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
          </span>
        </span>
      </div>
    `;
  }

  return `
    <label class="field${numberIconClassName}${fieldClassName}" style="view-transition-name: ${fieldViewTransitionName};">
      ${leadingIcon}
      <span class="field-copy">
        <span class="field-label">${fieldLabel}</span>
        <span class="field-hint">${fieldHint}</span>
      </span>
      <span class="field-control">
        <input
          type="number"
          data-field="${field.key}"
          value="${formatNumericFieldValue(field.key, value)}"
          ${fieldMin != null ? `min="${fieldMin}"` : ""}
          ${fieldMax != null ? `max="${fieldMax}"` : ""}
          ${fieldStep != null ? `step="${fieldStep}"` : ""}
        />
        ${field.unit ? `<span class="field-unit">${field.unit}</span>` : ""}
      </span>
    </label>
  `;
}

function getClosestFromEventTarget(event, selector) {
  for (const target of event.composedPath?.() ?? []) {
    if (target instanceof Element) {
      const closest = target.closest(selector);
      if (closest) {
        return closest;
      }
    }
  }

  if (event.target instanceof Element) {
    return event.target.closest(selector);
  }

  if (event.target instanceof Node) {
    return event.target.parentElement?.closest(selector) ?? null;
  }

  return null;
}

function handleLanguageControlClick(event) {
  const optionButton = getClosestFromEventTarget(event, "[data-language-option]");
  if (optionButton) {
    const nextLocale = normalizeLocale(optionButton.dataset.languageOption);
    state.isLanguageMenuOpen = false;

    if (nextLocale !== state.locale) {
      state.locale = setLocalePreference(nextLocale);
      render({ animateInspector: true });
    } else {
      render();
    }

    return;
  }

  const toggleButton = getClosestFromEventTarget(event, "[data-language-toggle]");
  if (!toggleButton) {
    return;
  }

  state.isLanguageMenuOpen = !state.isLanguageMenuOpen;
  render();
}

function handleThemeControlClick(event) {
  const optionButton = getClosestFromEventTarget(event, "[data-theme-option]");
  if (!optionButton) {
    return;
  }

  const nextTheme = normalizeTheme(optionButton.dataset.themeOption);
  if (!nextTheme || nextTheme === state.theme) {
    return;
  }

  state.theme = setThemePreference(nextTheme);
  applyTheme(state.theme, { animate: true });
  syncThemeControl({ animate: true });
  configureColoris();
}

function handleSegmentControlClick(event) {
  const button = getClosestFromEventTarget(event, "[data-sidebar-tab]");
  if (!button) {
    return;
  }

  handleSidebarTabChange({ currentTarget: button });
}

function handleMobileInspectorToggleClick() {
  state.isMobileInspectorHidden = !state.isMobileInspectorHidden;
  renderLayout();
}

function getProjectKeycapCardById(entryId) {
  if (!entryId) {
    return null;
  }

  return app.querySelector(`[data-project-keycap-card][data-project-keycap-id="${escapeCssIdentifier(entryId)}"]`);
}

function isProjectKeycapReorderAnimationEnabled() {
  return !reduceMotionQuery?.matches && typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
}

function captureProjectKeycapCardRects() {
  if (!isProjectKeycapReorderAnimationEnabled()) {
    return null;
  }

  const rects = new Map();
  app.querySelectorAll("[data-project-keycap-card]").forEach((card) => {
    const entryId = card.dataset.projectKeycapId;
    if (!entryId) {
      return;
    }

    rects.set(entryId, card.getBoundingClientRect());
  });

  return rects.size > 0 ? rects : null;
}

function animateProjectKeycapCardReorder(previousRects, options = {}) {
  if (!previousRects || !isProjectKeycapReorderAnimationEnabled()) {
    return;
  }

  const { excludeId = "" } = options;
  window.requestAnimationFrame(() => {
    app.querySelectorAll("[data-project-keycap-card]").forEach((card) => {
      const entryId = card.dataset.projectKeycapId;
      if (!entryId || entryId === excludeId) {
        return;
      }

      const previousRect = previousRects.get(entryId);
      if (!previousRect) {
        return;
      }

      const currentRect = card.getBoundingClientRect();
      const deltaX = previousRect.left - currentRect.left;
      const deltaY = previousRect.top - currentRect.top;
      if (
        Math.abs(deltaX) < PROJECT_KEYCAP_REORDER_ANIMATION_MIN_DELTA_PX
        && Math.abs(deltaY) < PROJECT_KEYCAP_REORDER_ANIMATION_MIN_DELTA_PX
      ) {
        return;
      }

      card.getAnimations()
        .filter((animation) => animation.id === PROJECT_KEYCAP_REORDER_ANIMATION_ID)
        .forEach((animation) => animation.cancel());

      const animation = card.animate([
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: "translate(0, 0)" },
      ], {
        duration: PROJECT_KEYCAP_REORDER_ANIMATION_DURATION_MS,
        easing: PROJECT_KEYCAP_REORDER_ANIMATION_EASING,
      });
      animation.id = PROJECT_KEYCAP_REORDER_ANIMATION_ID;
    });
  });
}

function clearProjectKeycapDragVisualState() {
  app.querySelectorAll("[data-project-keycap-card]").forEach((card) => {
    card.classList.remove("is-dragging");
  });
}

function setProjectKeycapDragVisualState() {
  clearProjectKeycapDragVisualState();
  getProjectKeycapCardById(projectKeycapDragSourceId)?.classList.add("is-dragging");
}

function captureProjectKeycapDragOrderLabels() {
  projectKeycapDragOrderLabels = new Map(
    state.project.keycaps.map((entry, index) => [entry.id, index + 1]),
  );
}

function getProjectKeycapDropPlacement(card, event) {
  const rect = card.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function reorderProjectKeycaps(sourceId, targetId, placement = "before", options = {}) {
  const { animateInspector = false, animateMove = true } = options;
  if (!sourceId || !targetId || sourceId === targetId) {
    return false;
  }

  const keycaps = [...state.project.keycaps];
  const previousOrder = keycaps.map((entry) => entry.id).join("\n");
  const sourceIndex = keycaps.findIndex((entry) => entry.id === sourceId);
  if (sourceIndex < 0) {
    return false;
  }

  const [movingEntry] = keycaps.splice(sourceIndex, 1);
  const targetIndex = keycaps.findIndex((entry) => entry.id === targetId);
  if (targetIndex < 0) {
    return false;
  }

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  keycaps.splice(insertIndex, 0, movingEntry);
  const nextOrder = keycaps.map((entry) => entry.id).join("\n");
  if (nextOrder === previousOrder) {
    return false;
  }

  const previousRects = animateMove ? captureProjectKeycapCardRects() : null;
  state.project.keycaps = assignProjectKeycapDisplayOrder(keycaps);
  state.project.isDirty = true;
  setProjectStatus("idle", t("project.reordered"));
  render({ animateInspector });
  animateProjectKeycapCardReorder(previousRects, { excludeId: projectKeycapDragSourceId });
  return true;
}

function moveProjectKeycapByOffset(entryId, offset) {
  const keycaps = [...state.project.keycaps];
  const sourceIndex = keycaps.findIndex((entry) => entry.id === entryId);
  const targetIndex = Math.max(0, Math.min(keycaps.length - 1, sourceIndex + offset));
  if (sourceIndex < 0 || targetIndex === sourceIndex) {
    return false;
  }

  const [movingEntry] = keycaps.splice(sourceIndex, 1);
  keycaps.splice(targetIndex, 0, movingEntry);
  const previousRects = captureProjectKeycapCardRects();
  state.project.keycaps = assignProjectKeycapDisplayOrder(keycaps);
  state.project.isDirty = true;
  setProjectStatus("idle", t("project.reordered"));
  render({ animateInspector: false });
  animateProjectKeycapCardReorder(previousRects);
  window.requestAnimationFrame(() => {
    app.querySelector(`[data-project-keycap-drag="${escapeCssIdentifier(entryId)}"]`)?.focus();
  });
  return true;
}

function resetProjectKeycapDragState() {
  const hadOrderLabels = projectKeycapDragOrderLabels.size > 0;
  projectKeycapDragSourceId = "";
  projectKeycapDragTargetId = "";
  projectKeycapDragPlacement = "before";
  projectKeycapDragDidMove = false;
  projectKeycapDragOrderLabels = new Map();
  clearProjectKeycapDragVisualState();
  return hadOrderLabels;
}

function handleInspectorCardDragStart(event) {
  const dragHandle = getClosestFromEventTarget(event, "[data-project-keycap-drag]");
  if (!dragHandle) {
    return;
  }

  const entryId = dragHandle.dataset.projectKeycapDrag;
  if (!entryId || !state.project.keycaps.some((entry) => entry.id === entryId)) {
    event.preventDefault();
    return;
  }

  projectKeycapDragSourceId = entryId;
  projectKeycapDragTargetId = "";
  projectKeycapDragPlacement = "before";
  projectKeycapDragDidMove = false;
  captureProjectKeycapDragOrderLabels();
  if (event.dataTransfer) {
    const sourceCard = getProjectKeycapCardById(entryId);
    if (sourceCard) {
      const cardRect = sourceCard.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        sourceCard,
        Math.max(0, event.clientX - cardRect.left),
        Math.max(0, event.clientY - cardRect.top),
      );
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-keycap-maker-keycap", entryId);
    event.dataTransfer.setData("text/plain", entryId);
  }
  setProjectKeycapDragVisualState();
}

function handleInspectorCardDragOver(event) {
  if (!projectKeycapDragSourceId) {
    return;
  }

  const targetCard = getClosestFromEventTarget(event, "[data-project-keycap-card]");
  if (!targetCard) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  const targetId = targetCard.dataset.projectKeycapId;
  const placement = getProjectKeycapDropPlacement(targetCard, event);
  if (targetId === projectKeycapDragTargetId && placement === projectKeycapDragPlacement) {
    return;
  }

  projectKeycapDragTargetId = targetId ?? "";
  projectKeycapDragPlacement = placement;
  if (targetId && reorderProjectKeycaps(projectKeycapDragSourceId, targetId, placement, { animateInspector: false })) {
    projectKeycapDragDidMove = true;
  } else {
    setProjectKeycapDragVisualState();
  }
}

function handleInspectorCardDrop(event) {
  if (!projectKeycapDragSourceId) {
    return;
  }

  const targetCard = getClosestFromEventTarget(event, "[data-project-keycap-card]");
  event.preventDefault();
  const targetId = targetCard?.dataset.projectKeycapId ?? projectKeycapDragTargetId;
  const placement = targetCard ? getProjectKeycapDropPlacement(targetCard, event) : projectKeycapDragPlacement;
  const sourceId = projectKeycapDragSourceId;
  const didMoveBeforeDrop = projectKeycapDragDidMove;
  const shouldRefreshOrderLabels = resetProjectKeycapDragState();
  if (!didMoveBeforeDrop) {
    const didReorder = reorderProjectKeycaps(sourceId, targetId, placement);
    if (!didReorder && shouldRefreshOrderLabels) {
      render({ animateInspector: false });
    }
  } else if (shouldRefreshOrderLabels) {
    render({ animateInspector: false });
  }
}

function handleInspectorCardDragEnd() {
  if (resetProjectKeycapDragState()) {
    render({ animateInspector: false });
  }
}

function handleInspectorCardClick(event) {
  const projectKeycapDragHandle = getClosestFromEventTarget(event, "[data-project-keycap-drag]");
  if (projectKeycapDragHandle) {
    return;
  }

  const projectKeycapRecaptureButton = getClosestFromEventTarget(event, "[data-project-keycap-recapture]");
  if (projectKeycapRecaptureButton) {
    recaptureActiveProjectKeycapPreview(projectKeycapRecaptureButton.dataset.projectKeycapRecapture);
    return;
  }

  const projectKeycapDesignButton = getClosestFromEventTarget(event, "[data-project-keycap-design]");
  if (projectKeycapDesignButton) {
    openKeycapDesignOverlay(projectKeycapDesignButton.dataset.projectKeycapDesign);
    return;
  }

  const projectKeycapExportButton = getClosestFromEventTarget(event, "[data-project-keycap-export]");
  if (projectKeycapExportButton) {
    openKeycapExportOverlay(projectKeycapExportButton.dataset.projectKeycapExport);
    return;
  }

  const projectKeycapButton = getClosestFromEventTarget(event, "[data-project-keycap]");
  if (projectKeycapButton) {
    void applyProjectKeycapSelection(projectKeycapButton.dataset.projectKeycap);
    return;
  }

  const projectAddCurrentButton = getClosestFromEventTarget(event, "[data-project-add-current]");
  if (projectAddCurrentButton) {
    void addCurrentKeycapToProject();
    return;
  }

  const projectSaveButton = getClosestFromEventTarget(event, "[data-project-save]");
  if (projectSaveButton) {
    void saveProject();
    return;
  }

  const copyFontAttributionButton = getClosestFromEventTarget(event, "[data-copy-font-attribution]");
  if (copyFontAttributionButton) {
    void handleCopyLegendFontAttribution(copyFontAttributionButton.dataset.copyFontAttribution);
    return;
  }

  const copyIconAttributionButton = getClosestFromEventTarget(event, "[data-copy-icon-attribution]");
  if (copyIconAttributionButton) {
    void handleCopyLegendIconAttribution(copyIconAttributionButton.dataset.copyIconAttribution);
    return;
  }

  const fontLandingPageLink = getClosestFromEventTarget(event, "[data-font-landing-page-url]");
  if (fontLandingPageLink) {
    event.preventDefault();
    const landingPageUrl = fontLandingPageLink.dataset.fontLandingPageUrl;
    if (landingPageUrl) {
      window.open(landingPageUrl, "_blank", "noopener,noreferrer");
    }
    return;
  }

  const fontPickerSegmentButton = getClosestFromEventTarget(event, "[data-font-picker-segment]");
  if (fontPickerSegmentButton) {
    handleLegendFontPickerSegmentClick(fontPickerSegmentButton);
    return;
  }

  const fontPickerOptionButton = getClosestFromEventTarget(event, "[data-font-picker-option]");
  if (fontPickerOptionButton) {
    applyLegendFontSelection(
      resolveLegendFontConfig(fontPickerOptionButton.dataset.fontPickerOption),
      {
        fieldKey: fontPickerOptionButton.dataset.fontPickerField,
        closePicker: true,
      },
    );
    return;
  }

  const iconPickerOptionButton = getClosestFromEventTarget(event, "[data-icon-picker-option]");
  if (iconPickerOptionButton) {
    applyLegendIconSelection(
      iconPickerOptionButton.dataset.iconPickerOption,
      {
        fieldKey: iconPickerOptionButton.dataset.iconPickerField,
        closePicker: true,
      },
    );
    return;
  }

  const userFontAddButton = getClosestFromEventTarget(event, "[data-user-font-add]");
  if (userFontAddButton) {
    openUserLegendFontFilePicker(userFontAddButton.dataset.userFontAdd);
    return;
  }

  const userFontSourceOpenButton = getClosestFromEventTarget(event, "[data-user-font-source-open]");
  if (userFontSourceOpenButton) {
    toggleUserLegendFontSourceEditor(userFontSourceOpenButton.dataset.userFontSourceOpen, userFontSourceOpenButton);
    return;
  }

  const userFontSourceCloseButton = getClosestFromEventTarget(event, "[data-user-font-source-close]");
  if (userFontSourceCloseButton) {
    closeUserLegendFontSourceEditor(userFontSourceCloseButton);
    return;
  }

  const userFontSourceModeButton = getClosestFromEventTarget(event, "[data-user-font-source-mode]");
  if (userFontSourceModeButton) {
    handleUserLegendFontSourceModeClick(userFontSourceModeButton);
    return;
  }

  const userFontSourceAddButton = getClosestFromEventTarget(event, "[data-user-font-source-add]");
  if (userFontSourceAddButton) {
    void handleUserLegendFontSourceInput(userFontSourceAddButton);
    return;
  }

  const userFontDeleteButton = getClosestFromEventTarget(event, "[data-user-font-delete]");
  if (userFontDeleteButton) {
    removeUserLegendFontAndFallback(userFontDeleteButton.dataset.userFontDelete);
    return;
  }

  const fontPickerOpenButton = getClosestFromEventTarget(event, "[data-font-picker-open]");
  if (fontPickerOpenButton) {
    if (state.legendFontPickerFieldKey === fontPickerOpenButton.dataset.fontPickerOpen) {
      closeLegendFontPicker();
    } else {
      openLegendFontPicker(fontPickerOpenButton.dataset.fontPickerOpen);
    }
    return;
  }

  const iconPickerOpenButton = getClosestFromEventTarget(event, "[data-icon-picker-open]");
  if (iconPickerOpenButton) {
    if (state.legendIconPickerFieldKey === iconPickerOpenButton.dataset.iconPickerOpen) {
      closeLegendIconPicker();
    } else {
      openLegendIconPicker(iconPickerOpenButton.dataset.iconPickerOpen);
    }
    return;
  }

  const importBindingToggleButton = getClosestFromEventTarget(event, "[data-import-binding-toggle]");
  if (importBindingToggleButton) {
    toggleImportBindingNotice();
    return;
  }

  const importBindingDeleteButton = getClosestFromEventTarget(event, "[data-import-binding-delete]");
  if (importBindingDeleteButton) {
    deleteImportBindingParam(importBindingDeleteButton.dataset.importBindingDelete);
    return;
  }

  const groupToggleButton = getClosestFromEventTarget(event, "[data-field-group-toggle]");
  if (groupToggleButton) {
    toggleFieldGroup(groupToggleButton.dataset.fieldGroupToggle);
    return;
  }

  const colorPickerButton = getClosestFromEventTarget(event, "[data-color-picker-open]");
  if (colorPickerButton) {
    openColorPicker(colorPickerButton.dataset.colorPickerOpen);
    return;
  }
}

function handleInspectorCardInput(event) {
  const projectNameInput = getClosestFromEventTarget(event, "[data-project-name]");
  if (projectNameInput) {
    handleProjectNameInput(projectNameInput);
    return;
  }

  const fontPickerQueryInput = getClosestFromEventTarget(event, "[data-font-picker-query]");
  if (fontPickerQueryInput) {
    handleLegendFontPickerQueryInput(fontPickerQueryInput);
    return;
  }

  const iconPickerQueryInput = getClosestFromEventTarget(event, "[data-icon-picker-query]");
  if (iconPickerQueryInput) {
    handleLegendIconPickerQueryInput(iconPickerQueryInput);
    return;
  }

  const keyUnitInput = getClosestFromEventTarget(event, "[data-key-unit-mm]");
  if (keyUnitInput) {
    handleKeyUnitBasisInput(keyUnitInput);
    return;
  }

  const input = getClosestFromEventTarget(event, "[data-field]");
  if (!input || input.type === "checkbox" || input.tagName === "SELECT") {
    return;
  }

  const shouldDeferContinuousSync = input.type === "number" || input.type === "range";
  handleFieldChange({
    currentTarget: input,
    deferContinuousSync: shouldDeferContinuousSync,
    deferPreview: typeof InputEvent !== "undefined" && event instanceof InputEvent && event.isComposing,
  });
}

function clearPendingCheckboxFieldChange(fieldKey) {
  const pending = pendingCheckboxFieldChanges.get(fieldKey);
  if (!pending) {
    return;
  }

  window.cancelAnimationFrame(pending.frameId);
  window.clearTimeout(pending.timerId);
  pendingCheckboxFieldChanges.delete(fieldKey);
}

function scheduleCheckboxFieldChange(input) {
  const fieldKey = input?.dataset?.field;
  if (!fieldKey || input?.type !== "checkbox") {
    return;
  }

  clearPendingCheckboxFieldChange(fieldKey);

  const pending = { frameId: 0, timerId: 0 };
  pending.frameId = window.requestAnimationFrame(() => {
    pending.timerId = window.setTimeout(() => {
      pendingCheckboxFieldChanges.delete(fieldKey);
      if (input.isConnected) {
        handleFieldChange({ currentTarget: input });
        return;
      }

      const currentInput = app.querySelector(`[data-field="${escapeCssIdentifier(fieldKey)}"]`);
      if (currentInput instanceof HTMLInputElement && currentInput.type === "checkbox") {
        handleFieldChange({ currentTarget: currentInput });
      }
    }, CHECKBOX_TOGGLE_COMMIT_DELAY_MS);
  });

  pendingCheckboxFieldChanges.set(fieldKey, pending);
}

function getWheelSliderDelta(event) {
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
    return event.deltaX;
  }

  return event.shiftKey ? event.deltaY : 0;
}

function getWheelSliderStep(input, fieldConfig) {
  const inputStep = Number(input.step);
  if (Number.isFinite(inputStep) && inputStep > 0) {
    return inputStep;
  }

  const fieldStep = Number(resolveFieldAttribute(fieldConfig?.step));
  return Number.isFinite(fieldStep) && fieldStep > 0 ? fieldStep : 1;
}

function formatWheelSliderValue(value, step) {
  const digits = Math.min(Math.max(countStepDigits(step) + 1, 0), 6);
  return `${Number(value.toFixed(digits))}`;
}

function handleInspectorCardWheel(event) {
  const input = getClosestFromEventTarget(event, 'input[type="range"][data-field], input[type="range"][data-key-unit-mm]');
  const field = input?.dataset.field ?? (input?.hasAttribute("data-key-unit-mm") ? KEY_UNIT_FIELD_KEY : null);
  const fieldConfig = getFieldConfig(field);
  if (!input || !field || input.disabled) {
    return;
  }

  const delta = getWheelSliderDelta(event);
  if (Math.abs(delta) < 0.01) {
    return;
  }

  const direction = delta > 0 ? 1 : -1;
  const step = getWheelSliderStep(input, fieldConfig);
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const currentValue = Number(input.value);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !Number.isFinite(currentValue)) {
    return;
  }

  const nextValue = Math.min(Math.max(currentValue + (direction * step), minimum), maximum);
  event.preventDefault();
  if (Math.abs(nextValue - currentValue) < 1e-9) {
    return;
  }

  input.value = formatWheelSliderValue(nextValue, step);
  if (input.hasAttribute("data-key-unit-mm")) {
    handleKeyUnitBasisInput(input);
    return;
  }

  handleFieldChange({ currentTarget: input, deferContinuousSync: true });
}

function handleInspectorCardChange(event) {
  const userFontInput = getClosestFromEventTarget(event, "[data-user-font-file]");
  if (userFontInput) {
    void handleUserLegendFontFileInput(userFontInput);
    return;
  }

  const keyUnitInput = getClosestFromEventTarget(event, "[data-key-unit-mm]");
  if (keyUnitInput) {
    handleKeyUnitBasisInput(keyUnitInput, { commit: true });
    return;
  }

  const input = getClosestFromEventTarget(event, "[data-field]");
  if (!input || (input.type !== "checkbox" && input.tagName !== "SELECT")) {
    return;
  }

  if (input.type === "checkbox") {
    syncCheckboxToggleDom(input);
    scheduleCheckboxFieldChange(input);
    return;
  }

  handleFieldChange({ currentTarget: input });
}

function handleInspectorCardCompositionEnd(event) {
  const input = getClosestFromEventTarget(event, "[data-field]");
  if (!input || input.tagName !== "INPUT" || input.type !== "text") {
    return;
  }

  handleFieldChange({ currentTarget: input });
}

function handleInspectorCardKeydown(event) {
  const projectKeycapDragHandle = getClosestFromEventTarget(event, "[data-project-keycap-drag]");
  if (projectKeycapDragHandle && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    moveProjectKeycapByOffset(
      projectKeycapDragHandle.dataset.projectKeycapDrag,
      event.key === "ArrowUp" ? -1 : 1,
    );
    return;
  }

  const projectKeycapSelectButton = getClosestFromEventTarget(event, "[data-project-keycap-select]");
  if (projectKeycapSelectButton && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    void applyProjectKeycapSelection(projectKeycapSelectButton.dataset.projectKeycapSelect);
    return;
  }

  const projectKeycapCard = getClosestFromEventTarget(event, "[data-project-keycap]");
  const interactiveControl = getClosestFromEventTarget(
    event,
    "button, a, input, select, textarea, [contenteditable='true']",
  );
  if (projectKeycapCard && !interactiveControl && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    void applyProjectKeycapSelection(projectKeycapCard.dataset.projectKeycap);
    return;
  }

  const userFontSourceInput = getClosestFromEventTarget(event, "[data-user-font-source-input]");
  if (userFontSourceInput) {
    if (event.key === "Escape") {
      closeUserLegendFontSourceEditor();
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" && (userFontSourceInput.tagName !== "TEXTAREA" || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleUserLegendFontSourceInput(userFontSourceInput);
      return;
    }
  }

  const fontPickerQueryInput = getClosestFromEventTarget(event, "[data-font-picker-query]");
  const iconPickerQueryInput = getClosestFromEventTarget(event, "[data-icon-picker-query]");
  if (!fontPickerQueryInput && !iconPickerQueryInput) {
    return;
  }

  if (event.key === "Escape") {
    if (fontPickerQueryInput) {
      closeLegendFontPicker();
    } else {
      closeLegendIconPicker();
    }
    event.preventDefault();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  if (iconPickerQueryInput) {
    const firstMatchingIcon = getLegendIconPickerResults()[0];
    if (!firstMatchingIcon) {
      return;
    }

    applyLegendIconSelection(firstMatchingIcon, { fieldKey: state.legendIconPickerFieldKey, closePicker: true });
    event.preventDefault();
    return;
  }

  const firstMatchingFont = getLegendFontPickerResults()[0];
  if (!firstMatchingFont) {
    return;
  }

  applyLegendFontSelection(firstMatchingFont, { fieldKey: state.legendFontPickerFieldKey, closePicker: true });
  event.preventDefault();
}

function openKeycapExportOverlay(entryId) {
  const entry = state.project.keycaps.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  if (entry.id === state.project.activeKeycapId) {
    syncActiveProjectKeycapFromCurrent();
  }

  state.keycapExportOverlayKeycapId = entry.id;
  state.keycapDesignOverlayKeycapId = "";
  state.exportsSummary = "";
  render();
}

function closeKeycapExportOverlay() {
  if (!state.keycapExportOverlayKeycapId || state.exportsStatus === "running") {
    return;
  }

  state.keycapExportOverlayKeycapId = "";
  render();
}

function openKeycapDesignOverlay(entryId) {
  const entry = state.project.keycaps.find((item) => item.id === entryId);
  if (!entry || state.exportsStatus === "running") {
    return;
  }

  state.keycapExportOverlayKeycapId = "";
  state.keycapDesignOverlayKeycapId = entry.id;
  render();
}

function closeKeycapDesignOverlay() {
  if (!state.keycapDesignOverlayKeycapId) {
    return;
  }

  state.keycapDesignOverlayKeycapId = "";
  render();
}

function getFieldGroupToggleTitle(groupId) {
  const activeGroup = getActiveFieldGroups().find((group, index) => {
    const resolvedGroupId = group.id ?? `group-${index}`;
    return resolvedGroupId === groupId;
  });
  if (activeGroup) {
    return activeGroup.title;
  }

  const legendCard = LEGEND_CARD_DEFINITIONS.find((card) => card.id === groupId);
  if (legendCard) {
    return resolveDynamicCopy(legendCard.title);
  }

  const stemCard = STEM_CARD_DEFINITIONS.find((card) => card.id === groupId);
  if (stemCard) {
    return resolveDynamicCopy(stemCard.title);
  }

  return "";
}

function findFieldGroupToggleButton(groupId) {
  return Array.from(app.querySelectorAll("[data-field-group-toggle]"))
    .find((button) => button.dataset.fieldGroupToggle === groupId);
}

function syncFieldGroupToggleButton(toggleButton, groupId, isCollapsed) {
  const title = getFieldGroupToggleTitle(groupId);
  const toggleLabel = title
    ? (isCollapsed
        ? t("fieldGroup.expand", { title })
        : t("fieldGroup.collapse", { title }))
    : "";
  const iconUrl = isCollapsed ? CHEVRON_ICON_URLS.collapsed : CHEVRON_ICON_URLS.expanded;

  toggleButton.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  if (toggleLabel) {
    toggleButton.setAttribute("aria-label", toggleLabel);
  }

  const icon = toggleButton.querySelector(".field-group-toggle__icon");
  if (icon instanceof HTMLImageElement) {
    icon.src = iconUrl;
  }
}

function isFieldGroupCollapseAnimationEnabled() {
  return !reduceMotionQuery?.matches && typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
}

function cancelFieldGroupBodyAnimations(body) {
  if (typeof body.getAnimations !== "function") {
    return;
  }

  body.getAnimations()
    .filter((animation) => animation.id === FIELD_GROUP_COLLAPSE_ANIMATION_ID)
    .forEach((animation) => animation.cancel());
}

function cancelFieldGroupContainerAnimations(container) {
  if (!container || typeof container.getAnimations !== "function") {
    return;
  }

  container.getAnimations()
    .filter((animation) => animation.id === FIELD_GROUP_COLLAPSE_GAP_ANIMATION_ID)
    .forEach((animation) => animation.cancel());
}

function resetFieldGroupBodyAnimationStyles(body) {
  body.style.height = "";
  body.style.overflow = "";
  body.style.opacity = "";
}

function resetFieldGroupContainerAnimationStyles(container) {
  if (container) {
    container.style.rowGap = "";
  }
}

function getFieldGroupBodyContainer(body) {
  return body.parentElement instanceof HTMLElement ? body.parentElement : null;
}

function getElementRowGap(element) {
  if (!element) {
    return 0;
  }

  const rowGap = Number.parseFloat(window.getComputedStyle(element).rowGap);
  return Number.isFinite(rowGap) ? rowGap : 0;
}

function getExpandedFieldGroupRowGap(container) {
  if (!container) {
    return 0;
  }

  const storedGap = Number(container.dataset.fieldGroupExpandedRowGap);
  if (Number.isFinite(storedGap)) {
    return storedGap;
  }

  const rowGap = getElementRowGap(container);
  container.dataset.fieldGroupExpandedRowGap = `${rowGap}`;
  return rowGap;
}

function setFieldGroupBodyCollapsed(body, isCollapsed) {
  resetFieldGroupBodyAnimationStyles(body);
  resetFieldGroupContainerAnimationStyles(getFieldGroupBodyContainer(body));
  body.hidden = isCollapsed;
}

function animateFieldGroupContainerGap(container, currentGap, targetGap) {
  if (!container || Math.abs(currentGap - targetGap) < 0.5) {
    resetFieldGroupContainerAnimationStyles(container);
    return null;
  }

  container.style.rowGap = `${currentGap}px`;
  const animation = container.animate([
    { rowGap: `${currentGap}px` },
    { rowGap: `${targetGap}px` },
  ], {
    duration: FIELD_GROUP_COLLAPSE_ANIMATION_DURATION_MS,
    easing: FIELD_GROUP_COLLAPSE_ANIMATION_EASING,
    fill: "both",
  });
  animation.id = FIELD_GROUP_COLLAPSE_GAP_ANIMATION_ID;
  return animation;
}

function scheduleFieldGroupAnimationFinish(animation, finish) {
  let hasFinished = false;
  const complete = () => {
    if (hasFinished) {
      return;
    }

    hasFinished = true;
    finish();
  };

  animation.finished.then(complete).catch(() => {});
  window.setTimeout(complete, FIELD_GROUP_COLLAPSE_ANIMATION_DURATION_MS + 80);
}

function animateFieldGroupBodyCollapse(body, groupId, isCollapsed) {
  if (!isFieldGroupCollapseAnimationEnabled()) {
    setFieldGroupBodyCollapsed(body, isCollapsed);
    return;
  }

  const bodyWasHidden = body.hidden;
  const container = getFieldGroupBodyContainer(body);
  const expandedGap = getExpandedFieldGroupRowGap(container);
  const currentHeight = body.hidden ? 0 : body.getBoundingClientRect().height;
  const currentGap = bodyWasHidden ? 0 : getElementRowGap(container);
  cancelFieldGroupBodyAnimations(body);
  cancelFieldGroupContainerAnimations(container);
  body.hidden = false;
  resetFieldGroupBodyAnimationStyles(body);

  if (isCollapsed) {
    if (currentHeight <= 0) {
      setFieldGroupBodyCollapsed(body, true);
      return;
    }

    body.style.height = `${currentHeight}px`;
    body.style.overflow = "hidden";
    const gapAnimation = animateFieldGroupContainerGap(container, currentGap, 0);
    const animation = body.animate([
      { height: `${currentHeight}px`, opacity: 1 },
      { height: "0px", opacity: 0 },
    ], {
      duration: FIELD_GROUP_COLLAPSE_ANIMATION_DURATION_MS,
      easing: FIELD_GROUP_COLLAPSE_ANIMATION_EASING,
      fill: "both",
    });
    animation.id = FIELD_GROUP_COLLAPSE_ANIMATION_ID;
    scheduleFieldGroupAnimationFinish(animation, () => {
      if (state.collapsedFieldGroups[groupId] !== true) {
        return;
      }

      body.hidden = true;
      animation.cancel();
      gapAnimation?.cancel();
      setFieldGroupBodyCollapsed(body, true);
    });
    gapAnimation?.finished.catch(() => {});
    return;
  }

  const targetHeight = body.scrollHeight;
  if (targetHeight <= 0) {
    setFieldGroupBodyCollapsed(body, false);
    return;
  }

  body.style.height = `${currentHeight}px`;
  body.style.overflow = "hidden";
  const gapAnimation = animateFieldGroupContainerGap(container, currentGap, expandedGap);
  const animation = body.animate([
    { height: `${currentHeight}px`, opacity: currentHeight > 0 ? 1 : 0 },
    { height: `${targetHeight}px`, opacity: 1 },
  ], {
    duration: FIELD_GROUP_COLLAPSE_ANIMATION_DURATION_MS,
    easing: FIELD_GROUP_COLLAPSE_ANIMATION_EASING,
    fill: "both",
  });
  animation.id = FIELD_GROUP_COLLAPSE_ANIMATION_ID;
  scheduleFieldGroupAnimationFinish(animation, () => {
    if (state.collapsedFieldGroups[groupId] === true) {
      return;
    }

    animation.cancel();
    gapAnimation?.cancel();
    setFieldGroupBodyCollapsed(body, false);
  });
  gapAnimation?.finished.catch(() => {});
}

function syncFieldGroupCollapseDom(groupId, options = {}) {
  const { animate = false } = options;
  const toggleButton = findFieldGroupToggleButton(groupId);
  if (!(toggleButton instanceof HTMLButtonElement)) {
    return false;
  }

  const isCollapsed = state.collapsedFieldGroups[groupId] === true;
  const bodyId = toggleButton.getAttribute("aria-controls");
  const body = bodyId ? document.getElementById(bodyId) : null;
  if (body instanceof HTMLElement) {
    if (animate) {
      animateFieldGroupBodyCollapse(body, groupId, isCollapsed);
    } else {
      setFieldGroupBodyCollapsed(body, isCollapsed);
    }
  }
  syncFieldGroupToggleButton(toggleButton, groupId, isCollapsed);
  return true;
}

async function executeKeycapOverlayExport(format) {
  const entry = getKeycapExportOverlayEntry();
  if (!entry) {
    closeKeycapExportOverlay();
    return;
  }

  await executeExport(format, {
    params: entry.params,
    editorDataPayload: entry.editorDataPayload,
    closeOverlayOnSuccess: true,
  });
}

function handleKeycapExportOverlayClick(event) {
  const deleteKeycapButton = getClosestFromEventTarget(event, "[data-keycap-delete]");
  if (deleteKeycapButton) {
    void deleteProjectKeycap(deleteKeycapButton.dataset.keycapDelete);
    return;
  }

  const exportFormatButton = getClosestFromEventTarget(event, "[data-keycap-export-format]");
  if (exportFormatButton) {
    void executeKeycapOverlayExport(exportFormatButton.dataset.keycapExportFormat);
    return;
  }

  const closeButton = getClosestFromEventTarget(event, "[data-keycap-export-close]");
  if (closeButton || (event.target instanceof Element && event.target.matches("[data-keycap-export-overlay]"))) {
    closeKeycapExportOverlay();
    return;
  }

  const designCloseButton = getClosestFromEventTarget(event, "[data-keycap-design-close]");
  if (designCloseButton || (event.target instanceof Element && event.target.matches("[data-keycap-design-overlay]"))) {
    closeKeycapDesignOverlay();
  }
}

function handleSidebarTabChange(event) {
  const nextTab = event.currentTarget.dataset.sidebarTab;
  if (!nextTab || nextTab === state.sidebarTab) {
    return;
  }

  state.sidebarTab = nextTab;
  render({ animateInspector: false });
}

function toggleFieldGroup(groupId) {
  if (!groupId || !(groupId in state.collapsedFieldGroups)) {
    return;
  }

  const isExpanding = state.collapsedFieldGroups[groupId] === true;
  state.collapsedFieldGroups[groupId] = !state.collapsedFieldGroups[groupId];
  if (isExpanding) {
    render({ animateInspector: false });
    return;
  }

  if (!syncFieldGroupCollapseDom(groupId, { animate: true })) {
    render();
  }
}

function handleViewportResize() {
  syncVisualViewportMetrics();

  const nextMode = getViewportLayoutMode();
  if (nextMode !== viewportLayoutMode) {
    viewportLayoutMode = nextMode;
    render();
  }

  if (typeof window.Coloris === "function") {
    try {
      window.Coloris.updatePosition();
    } catch (error) {}
  }
}

function handleSystemThemeChange() {
  if (readThemePreference()) {
    return;
  }

  const nextTheme = getSystemTheme();
  if (nextTheme === state.theme) {
    return;
  }

  state.theme = nextTheme;
  applyTheme(state.theme, { animate: true });
  syncThemeControl({ animate: true });
  configureColoris();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCssIdentifier(value) {
  const identifier = String(value ?? "");
  if (typeof globalThis.CSS?.escape === "function") {
    return globalThis.CSS.escape(identifier);
  }

  return identifier.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function handleCopyLegendFontAttribution(fontKey) {
  const font = resolveLegendFontConfig(fontKey);
  const attributionText = getLegendFontAttributionText(font);
  if (!font || !attributionText) {
    return;
  }

  await copyTextToClipboard(attributionText);
  state.copiedFontAttributionKey = font.key;
  render();

  window.clearTimeout(fontAttributionCopyResetTimer);
  fontAttributionCopyResetTimer = window.setTimeout(() => {
    if (state.copiedFontAttributionKey !== font.key) {
      return;
    }

    state.copiedFontAttributionKey = "";
    render();
  }, 1600);
}

async function handleCopyLegendIconAttribution(iconSet) {
  const iconSetMeta = getLegendIconSetMeta(iconSet);
  const attributionText = getLegendIconAttributionText(iconSetMeta.key);
  if (!attributionText) {
    return;
  }

  await copyTextToClipboard(attributionText);
  state.copiedIconAttributionKey = iconSetMeta.key;
  render();

  window.clearTimeout(iconAttributionCopyResetTimer);
  iconAttributionCopyResetTimer = window.setTimeout(() => {
    if (state.copiedIconAttributionKey !== iconSetMeta.key) {
      return;
    }

    state.copiedIconAttributionKey = "";
    render();
  }, 1600);
}

function isUserLegendFontFile(file) {
  if (!file) {
    return false;
  }

  const fileName = String(file.name ?? "").toLowerCase();
  const extension = Array.from(USER_LEGEND_FONT_FILE_EXTENSIONS).find((item) => fileName.endsWith(item));
  if (extension) {
    return true;
  }

  return [
    "font/ttf",
    "font/otf",
    "application/font-sfnt",
    "application/x-font-ttf",
    "application/x-font-otf",
    "application/vnd.ms-opentype",
  ].includes(String(file.type ?? "").toLowerCase());
}

function getUserLegendFontFileExtension(file) {
  return getUserLegendFontFileExtensionFromName(file?.name);
}

function getUserLegendFontFileExtensionFromName(fileName, fallback = ".ttf") {
  const normalizedFileName = String(fileName ?? "").toLowerCase();
  return Array.from(USER_LEGEND_FONT_FILE_EXTENSIONS).find((item) => normalizedFileName.endsWith(item)) ?? fallback;
}

function getUserLegendFontFileBaseName(fileName) {
  return String(fileName ?? "Local Font")
    .replace(/\.[^.]+$/u, "")
    .trim()
    || "Local Font";
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createUserLegendFontHash(bytes) {
  if (globalThis.crypto?.subtle?.digest) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return bytesToHex(new Uint8Array(digest));
  }

  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  for (const byte of bytes) {
    hashA ^= byte;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB = Math.imul(hashB ^ byte, 0x85ebca6b) >>> 0;
  }

  return `${hashA.toString(16).padStart(8, "0")}${hashB.toString(16).padStart(8, "0")}`;
}

function buildUserLegendFontLabel(file, metadata = {}) {
  const fullName = String(metadata.fullName ?? "").trim();
  if (fullName) {
    return fullName;
  }

  const familyName = String(metadata.familyName ?? "").trim();
  const subfamilyName = String(metadata.subfamilyName ?? "").trim();
  if (familyName && subfamilyName && !["regular", "normal"].includes(subfamilyName.toLowerCase())) {
    return `${familyName} ${subfamilyName}`;
  }
  if (familyName) {
    return familyName;
  }

  return getUserLegendFontFileBaseName(file.name);
}

function buildUserLegendFontQuery(file, metadata = {}) {
  return String(metadata.familyName || metadata.fullName || metadata.postScriptName || getUserLegendFontFileBaseName(file.name)).trim();
}

async function registerUserLegendFontBytes({
  bytes,
  fileName,
  fileType = "",
  sourceKind = "local",
  sourceUrl = "",
  sourceLabel = "",
  provider = "",
  extension = "",
} = {}) {
  const normalizedBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? 0);
  const normalizedFileName = String(fileName || `RemoteFont${extension || ".ttf"}`);
  if (normalizedBytes.byteLength === 0) {
    throw new Error(t("font.emptyLocalFont", { fileName: normalizedFileName }));
  }

  const hash = await createUserLegendFontHash(normalizedBytes);
  const keySuffix = hash.slice(0, 24);
  const key = `${USER_KEYCAP_LEGEND_FONT_KEY_PREFIX}${keySuffix}`;
  const metadata = parseKeycapLegendFontNameMetadata(normalizedBytes);
  const fileDescriptor = { name: normalizedFileName };
  const label = buildUserLegendFontLabel(fileDescriptor, metadata);
  const fontQuery = buildUserLegendFontQuery(fileDescriptor, metadata);
  const resolvedExtension = extension || getUserLegendFontFileExtensionFromName(normalizedFileName);
  const blob = new Blob([normalizedBytes], { type: fileType || (resolvedExtension === ".otf" ? "font/otf" : "font/ttf") });
  const objectUrl = URL.createObjectURL(blob);

  return registerUserKeycapLegendFont({
    key,
    label,
    searchLabel: `${label} ${normalizedFileName} ${metadata.familyName ?? ""} ${metadata.fullName ?? ""} ${metadata.postScriptName ?? ""} ${provider} ${sourceLabel}`,
    fontName: fontQuery,
    fontQuery,
    fileName: normalizedFileName,
    byteLength: normalizedBytes.byteLength,
    bytes: normalizedBytes,
    objectUrl,
    runtimePath: `/fonts/user/${keySuffix}${resolvedExtension}`,
    measurementFamily: `Keycap User Font ${keySuffix}`,
    sourceKind,
    sourceUrl,
    sourceLabel,
    provider,
  });
}

async function registerUserLegendFontFile(file) {
  if (!isUserLegendFontFile(file)) {
    throw new Error(t("font.unsupportedLocalFont", { fileName: file?.name ?? "" }));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return registerUserLegendFontBytes({
    bytes,
    fileName: file.name,
    fileType: file.type,
    sourceKind: "local",
    extension: getUserLegendFontFileExtension(file),
  });
}

async function registerUserLegendFontFiles(files, options = {}) {
  const {
    fieldKey = state.legendFontPickerFieldKey || "legendFontKey",
    selectFirst = false,
  } = options;
  const fontFiles = Array.from(files ?? []).filter(isUserLegendFontFile);
  if (fontFiles.length === 0) {
    throw new Error(t("font.noLocalFontFile"));
  }

  const addedFonts = [];
  for (const file of fontFiles) {
    const font = await registerUserLegendFontFile(file);
    addedFonts.push(font);
    void ensureLegendFontPreviewLoaded(font);
  }

  if (selectFirst && addedFonts[0]) {
    applyLegendFontSelection(addedFonts[0], { fieldKey, closePicker: true });
  }

  const label = addedFonts.length === 1 ? addedFonts[0].label : t("font.localFontMultipleLabel", { count: addedFonts.length });
  setExportStatus(
    "success",
    addedFonts.length === 1
      ? t("font.localFontAdded", { font: label })
      : t("font.localFontsAdded", { count: addedFonts.length }),
    {
      format: "user-font-import",
      label: t("font.localFontLoadLabel"),
      elapsedMs: 0,
      byteLength: addedFonts.reduce((sum, font) => sum + Number(font.byteLength ?? 0), 0),
      notes: t("font.localFontLoadNote", { font: label }),
    },
  );

  render({ animateInspector: true });
  return addedFonts;
}

async function registerUserLegendFontSource(sourceValue, options = {}) {
  const {
    fieldKey = state.legendFontPickerFieldKey || "legendFontKey",
    select = true,
  } = options;
  const resolvedSource = await resolveUserFontSource(sourceValue);
  const extension = resolvedSource.format === "otf" ? ".otf" : ".ttf";
  const font = await registerUserLegendFontBytes({
    bytes: resolvedSource.bytes,
    fileName: resolvedSource.fileName || `RemoteFont${extension}`,
    sourceKind: "remote",
    sourceUrl: resolvedSource.sourceUrl,
    sourceLabel: resolvedSource.sourceLabel,
    provider: resolvedSource.provider,
    extension,
  });

  void ensureLegendFontPreviewLoaded(font);
  if (select) {
    applyLegendFontSelection(font, { fieldKey, closePicker: true });
  }

  setExportStatus(
    "success",
    t("font.remoteFontAdded", { font: font.label }),
    {
      format: "user-font-source-import",
      label: t("font.remoteFontLoadLabel"),
      elapsedMs: 0,
      byteLength: Number(font.byteLength ?? 0),
      notes: t("font.remoteFontLoadNote", {
        font: font.label,
        source: resolvedSource.provider || resolvedSource.sourceLabel || resolvedSource.sourceUrl,
      }),
    },
  );

  render({ animateInspector: true });
  return font;
}

function openUserLegendFontFilePicker(fieldKey = state.legendFontPickerFieldKey || "legendFontKey") {
  const input = Array.from(app.querySelectorAll("[data-user-font-file]"))
    .find((candidate) => candidate.dataset.userFontField === fieldKey);
  if (input instanceof HTMLInputElement) {
    input.click();
  }
}

async function handleUserLegendFontFileInput(input) {
  const files = Array.from(input.files ?? []);
  input.value = "";
  try {
    await registerUserLegendFontFiles(files, {
      fieldKey: input.dataset.userFontField || state.legendFontPickerFieldKey || "legendFontKey",
      selectFirst: true,
    });
  } catch (error) {
    setExportStatus(
      "error",
      t("font.localFontLoadFailed"),
      {
        format: "user-font-import",
        label: t("font.localFontLoadFailedLabel"),
        elapsedMs: 0,
        byteLength: 0,
        notes: `${error}`,
      },
    );
    render();
  }
}

function isLegendFontSourceEditorTransitionEnabled() {
  return !reduceMotionQuery?.matches;
}

function updateLegendFontPickerPopoverChrome(popover, isSourceEditorOpen) {
  popover.classList.toggle("is-source-editor", isSourceEditorOpen);
  popover.setAttribute(
    "aria-label",
    isSourceEditorOpen ? t("font.cdnFontUrlLabel") : t("font.searchDialogLabel"),
  );
}

function replaceLegendFontPickerPopoverContent(popover, fieldKey, isSourceEditorOpen) {
  const content = popover.querySelector("[data-font-picker-popover-content]");
  if (!(content instanceof HTMLElement)) {
    return false;
  }

  updateLegendFontPickerPopoverChrome(popover, isSourceEditorOpen);
  content.innerHTML = renderLegendFontPickerPopoverContent(fieldKey, isSourceEditorOpen);

  const picker = popover.closest("[data-font-picker]");
  if (picker) {
    syncLegendFontPickerSegmentIndicator(picker);
    syncLegendFontSourceModeControl(picker);
  }
  if (isSourceEditorOpen) {
    focusLegendFontSourceInput();
  }

  return true;
}

function transitionLegendFontSourceEditor(fieldKey, isSourceEditorOpen, trigger = null) {
  const popover = trigger?.closest?.("[data-font-picker]")?.querySelector(".font-picker-popover")
    || app.querySelector(".font-picker-popover");
  const content = popover?.querySelector?.("[data-font-picker-popover-content]");
  if (!(popover instanceof HTMLElement) || !(content instanceof HTMLElement)) {
    return false;
  }

  const transitionToken = ++legendFontSourceEditorTransitionToken;
  window.clearTimeout(legendFontSourceEditorTransitionTimer);
  window.clearTimeout(legendFontSourceEditorCleanupTimer);
  window.clearTimeout(legendFontSourceInputPanelFadeTimer);
  content.classList.remove(
    "is-entering-forward",
    "is-entering-back",
    "is-exiting-forward",
    "is-exiting-back",
  );

  if (!isLegendFontSourceEditorTransitionEnabled()) {
    return replaceLegendFontPickerPopoverContent(popover, fieldKey, isSourceEditorOpen);
  }

  const direction = isSourceEditorOpen ? "forward" : "back";
  const startHeight = popover.getBoundingClientRect().height;
  popover.classList.add("is-transitioning");
  content.classList.add(`is-exiting-${direction}`);

  legendFontSourceEditorTransitionTimer = window.setTimeout(() => {
    if (transitionToken !== legendFontSourceEditorTransitionToken) {
      return;
    }
    if (!popover.isConnected || !content.isConnected) {
      return;
    }

    updateLegendFontPickerPopoverChrome(popover, isSourceEditorOpen);
    content.innerHTML = renderLegendFontPickerPopoverContent(fieldKey, isSourceEditorOpen);
    content.classList.remove(`is-exiting-${direction}`);
    content.classList.add(`is-entering-${direction}`);

    const endHeight = popover.getBoundingClientRect().height;
    popover.style.transition = "none";
    popover.style.height = `${startHeight}px`;
    void popover.offsetHeight;
    popover.style.transition = `height ${LEGEND_FONT_SOURCE_EDITOR_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    popover.style.height = `${endHeight}px`;

    const picker = popover.closest("[data-font-picker]");
    if (picker) {
      syncLegendFontPickerSegmentIndicator(picker);
      syncLegendFontSourceModeControl(picker);
    }

    window.requestAnimationFrame(() => {
      if (transitionToken !== legendFontSourceEditorTransitionToken) {
        return;
      }
      content.classList.remove(`is-entering-${direction}`);
    });

    legendFontSourceEditorCleanupTimer = window.setTimeout(() => {
      if (transitionToken !== legendFontSourceEditorTransitionToken) {
        return;
      }
      if (!popover.isConnected) {
        return;
      }

      popover.classList.remove("is-transitioning");
      popover.style.height = "";
      popover.style.transition = "";
      if (isSourceEditorOpen) {
        focusLegendFontSourceInput();
      }
    }, LEGEND_FONT_SOURCE_EDITOR_TRANSITION_MS + 40);
  }, LEGEND_FONT_SOURCE_EDITOR_EXIT_MS);

  return true;
}

function toggleUserLegendFontSourceEditor(fieldKey = state.legendFontPickerFieldKey || "legendFontKey", trigger = null) {
  const resolvedFieldKey = fieldKey || state.legendFontPickerFieldKey || "legendFontKey";
  const isOpening = state.legendFontSourceEditorFieldKey !== resolvedFieldKey;
  state.legendFontSourceEditorFieldKey = isOpening ? resolvedFieldKey : "";
  if (state.legendFontSourceEditorFieldKey) {
    state.legendFontSourceInputMode = normalizeLegendFontSourceInputMode(state.legendFontSourceInputMode);
    pendingLegendFontSourceInputFocus = true;
  }
  if (transitionLegendFontSourceEditor(resolvedFieldKey, isOpening, trigger)) {
    return;
  }
  render({ animateInspector: false });
}

function closeUserLegendFontSourceEditor(trigger = null) {
  if (!state.legendFontSourceEditorFieldKey) {
    return;
  }

  const fieldKey = state.legendFontSourceEditorFieldKey || state.legendFontPickerFieldKey || "legendFontKey";
  state.legendFontSourceEditorFieldKey = "";
  if (transitionLegendFontSourceEditor(fieldKey, false, trigger)) {
    return;
  }
  render({ animateInspector: false });
}

function isLegendFontSourceInputPanelFadeEnabled() {
  return !reduceMotionQuery?.matches;
}

function replaceUserLegendFontSourceInputPanel(editor, fieldKey) {
  const panel = editor?.querySelector?.("[data-user-font-source-input-panel]");
  if (!(editor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
    return false;
  }

  window.clearTimeout(legendFontSourceInputPanelFadeTimer);
  panel.classList.remove("is-entering", "is-exiting");

  const replacePanel = () => {
    if (!panel.isConnected) {
      return;
    }

    panel.outerHTML = renderUserFontSourceInputPanel(fieldKey);
    const nextPanel = editor.querySelector("[data-user-font-source-input-panel]");
    if (nextPanel instanceof HTMLElement && isLegendFontSourceInputPanelFadeEnabled()) {
      nextPanel.classList.add("is-entering");
      window.requestAnimationFrame(() => {
        nextPanel.classList.remove("is-entering");
      });
    }
    focusLegendFontSourceInput();
  };

  if (!isLegendFontSourceInputPanelFadeEnabled()) {
    replacePanel();
    return true;
  }

  panel.classList.add("is-exiting");
  legendFontSourceInputPanelFadeTimer = window.setTimeout(replacePanel, LEGEND_FONT_SOURCE_INPUT_PANEL_FADE_MS);
  return true;
}

function handleUserLegendFontSourceModeClick(button) {
  const nextMode = normalizeLegendFontSourceInputMode(button?.dataset?.userFontSourceMode);
  if (nextMode === state.legendFontSourceInputMode) {
    return;
  }

  const fieldKey = button?.dataset?.userFontSourceModeField
    || state.legendFontSourceEditorFieldKey
    || state.legendFontPickerFieldKey
    || "legendFontKey";
  const editor = button?.closest?.("[data-user-font-source-editor]");
  const modeTabs = button?.closest?.("[data-user-font-source-mode-tabs]");

  state.legendFontSourceInputMode = nextMode;
  state.legendFontSourceEditorFieldKey = fieldKey;
  pendingLegendFontSourceInputFocus = true;

  if (!(editor instanceof HTMLElement) || !(modeTabs instanceof HTMLElement)) {
    render({ animateInspector: false });
    return;
  }

  modeTabs.dataset.userFontSourceActiveMode = nextMode;
  syncLegendFontSourceModeControl(editor);
  if (!replaceUserLegendFontSourceInputPanel(editor, fieldKey)) {
    render({ animateInspector: false });
  }
}

async function handleUserLegendFontSourceInput(inputOrButton) {
  const sourceContainer = inputOrButton?.closest?.("[data-user-font-source-editor]")
    || inputOrButton?.closest?.("[data-user-font-source-card]");
  const input = inputOrButton?.matches?.("[data-user-font-source-input]")
    ? inputOrButton
    : sourceContainer?.querySelector("[data-user-font-source-input]");
  const fieldKey = input?.dataset.userFontSourceInput
    || inputOrButton?.dataset?.userFontSourceAdd
    || state.legendFontPickerFieldKey
    || "legendFontKey";
  const sourceValue = String(input?.value ?? "").trim();

  if (!sourceValue) {
    setExportStatus(
      "error",
      t("font.remoteFontLoadFailed"),
      {
        format: "user-font-source-import",
        label: t("font.remoteFontLoadFailedLabel"),
        elapsedMs: 0,
        byteLength: 0,
        notes: t("font.noFontSourceUrl"),
      },
    );
    render();
    return;
  }

  try {
    await registerUserLegendFontSource(sourceValue, {
      fieldKey,
      select: true,
    });
  } catch (error) {
    setExportStatus(
      "error",
      t("font.remoteFontLoadFailed"),
      {
        format: "user-font-source-import",
        label: t("font.remoteFontLoadFailedLabel"),
        elapsedMs: 0,
        byteLength: 0,
        notes: `${error}`,
      },
    );
    render();
  }
}

function removeUserLegendFontAndFallback(fontKey) {
  const font = resolveLegendFontConfig(fontKey);
  if (!font?.isUserFont || font.isMissing) {
    return;
  }

  const allFontFieldKeys = LEGEND_CARD_DEFINITIONS
    .flatMap((card) => card.fieldKeys)
    .filter((fieldKey) => fieldKey.endsWith(LEGEND_FIELD_SUFFIXES.fontKey));
  const didUseRemovedFont = allFontFieldKeys.some((fieldKey) => state.keycapParams[fieldKey] === font.key);
  if (didUseRemovedFont) {
    allFontFieldKeys.forEach((fieldKey) => {
      if (state.keycapParams[fieldKey] === font.key) {
        state.keycapParams[fieldKey] = DEFAULT_KEYCAP_LEGEND_FONT_KEY;
      }
    });
    syncDerivedKeycapParams(state.keycapParams);
    syncActiveProjectKeycapFromCurrent();
    state.editorStatus = "dirty";
    state.editorSummary = t("status.dirty");
  }

  legendFontPreviewPromises.delete(font.key);
  removeUserKeycapLegendFont(font.key);
  setExportStatus("success", t("font.localFontDeleted", { font: font.label }));
  render({ animateInspector: true });

  if (didUseRemovedFont) {
    schedulePreviewRefresh();
  }
}

function applyLegendFontSelection(font, options = {}) {
  const {
    deferPreview = false,
    closePicker = false,
    fieldKey = state.legendFontPickerFieldKey || "legendFontKey",
  } = options;

  if (closePicker) {
    state.legendFontPickerFieldKey = "";
    state.legendFontPickerQuery = "";
    state.legendFontPickerSegment = LEGEND_FONT_PICKER_SEGMENT_BUILTIN;
    state.legendFontSourceEditorFieldKey = "";
  }

  if (!font || font.key === state.keycapParams[fieldKey]) {
    if (closePicker) {
      render();
    }
    return false;
  }

  state.keycapParams[fieldKey] = font.key;
  syncDerivedKeycapParams(state.keycapParams);
  syncActiveProjectKeycapFromCurrent();
  state.editorStatus = "dirty";
  state.editorSummary = t("status.dirty");
  render({ animateInspector: true });

  if (!deferPreview) {
    schedulePreviewRefresh();
  }

  return true;
}

function applyLegendIconSelection(icon, options = {}) {
  const {
    closePicker = false,
    fieldKey = state.legendIconPickerFieldKey || "legendIconName",
  } = options;
  const iconSetFieldKey = getLegendIconSetFieldKey(fieldKey);
  const iconSet = resolveLegendIconSet(state.keycapParams[iconSetFieldKey]);
  const iconFillFieldKey = getLegendIconFillFieldKey(fieldKey);
  const resolvedIcon = icon?.name ? icon : resolveLegendIcon(icon, iconSet);
  const nextIconName = resolveLegendIconName(resolvedIcon?.name, iconSet);
  const nextIconFill = isLegendIconFillAvailable(nextIconName, iconSet)
    ? Boolean(state.keycapParams[iconFillFieldKey])
    : false;
  const iconFillChanged = Boolean(state.keycapParams[iconFillFieldKey]) !== nextIconFill;

  if (closePicker) {
    state.legendIconPickerFieldKey = "";
    state.legendIconPickerQuery = "";
  }

  if (nextIconName === state.keycapParams[fieldKey] && !iconFillChanged) {
    if (closePicker) {
      render();
    }
    return false;
  }

  state.keycapParams[fieldKey] = nextIconName;
  state.keycapParams[iconFillFieldKey] = nextIconFill;
  syncDerivedKeycapParams(state.keycapParams);
  syncActiveProjectKeycapFromCurrent();
  state.editorStatus = "dirty";
  state.editorSummary = t("status.dirty");
  render({ animateInspector: true });
  schedulePreviewRefresh();
  return true;
}

function openLegendFontPicker(fieldKey = "legendFontKey") {
  state.legendFontPickerFieldKey = fieldKey;
  state.legendFontPickerQuery = "";
  state.legendFontPickerSegment = getLegendFontPickerInitialSegment(fieldKey);
  state.legendFontSourceEditorFieldKey = "";
  pendingLegendFontPickerFocus = true;
  render();
  warmLegendFontPreviewFonts();
}

function openLegendIconPicker(fieldKey = "legendIconName") {
  state.legendIconPickerFieldKey = fieldKey;
  state.legendIconPickerQuery = "";
  pendingLegendIconPickerFocus = true;
  render();
}

function closeLegendIconPicker() {
  if (!state.legendIconPickerFieldKey) {
    return;
  }

  state.legendIconPickerFieldKey = "";
  state.legendIconPickerQuery = "";
  render();
}

function closeLegendFontPicker() {
  if (!state.legendFontPickerFieldKey) {
    return;
  }

  state.legendFontPickerFieldKey = "";
  state.legendFontPickerQuery = "";
  state.legendFontPickerSegment = LEGEND_FONT_PICKER_SEGMENT_BUILTIN;
  state.legendFontSourceEditorFieldKey = "";
  render();
}

function handleLegendIconPickerQueryInput(input) {
  state.legendIconPickerQuery = input.value;
  const fieldKey = input.dataset.iconPickerQuery || state.legendIconPickerFieldKey || "legendIconName";
  const picker = input.closest("[data-icon-picker]");
  const optionList = picker?.querySelector("[data-icon-picker-option-list]");
  const resultHeading = picker?.querySelector(".icon-picker-result-heading");
  if (resultHeading) {
    resultHeading.textContent = String(state.legendIconPickerQuery ?? "").trim()
      ? t("icons.searchResultsLabel")
      : t("icons.recommendedLabel");
  }
  if (optionList) {
    optionList.innerHTML = renderLegendIconPickerResultItems(fieldKey);
  }
}

function handleLegendFontPickerQueryInput(input) {
  state.legendFontPickerQuery = input.value;
  const fieldKey = input.dataset.fontPickerQuery || state.legendFontPickerFieldKey || "legendFontKey";
  const options = input.closest("[data-font-picker]")?.querySelector("[data-font-picker-options]");
  if (options) {
    options.innerHTML = renderLegendFontPickerOptions(fieldKey);
  }
}

function handleLegendFontPickerSegmentClick(button) {
  const nextSegment = normalizeLegendFontPickerSegment(button.dataset.fontPickerSegment);
  if (nextSegment === state.legendFontPickerSegment) {
    return;
  }

  state.legendFontPickerSegment = nextSegment;
  if (nextSegment !== LEGEND_FONT_PICKER_SEGMENT_USER) {
    state.legendFontSourceEditorFieldKey = "";
  }
  const fieldKey = button.dataset.fontPickerSegmentField || state.legendFontPickerFieldKey || "legendFontKey";
  const picker = button.closest("[data-font-picker]");
  const segments = picker?.querySelector("[data-font-picker-segments]");
  const optionList = picker?.querySelector("[data-font-picker-option-list]");
  if (!segments || !optionList) {
    render();
    return;
  }

  segments.style.setProperty("--segment-index", `${getLegendFontPickerSegmentIndex(nextSegment)}`);
  segments.dataset.fontPickerActiveSegment = nextSegment;
  segments.querySelectorAll("[data-font-picker-segment]").forEach((segmentButton) => {
    const isActive = segmentButton.dataset.fontPickerSegment === nextSegment;
    segmentButton.classList.toggle("is-active", isActive);
    segmentButton.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  optionList.innerHTML = renderLegendFontPickerResultItems(fieldKey);
  syncLegendFontPickerSegmentIndicator(picker);
  button.focus();
}

function handleWindowPointerDown(event) {
  let shouldRender = false;

  if (
    state.isLanguageMenuOpen
    && event.target instanceof Element
    && !event.target.closest("[data-language-control]")
  ) {
    state.isLanguageMenuOpen = false;
    shouldRender = true;
  }

  if (
    state.legendFontPickerFieldKey
    && event.target instanceof Element
    && !event.target.closest("[data-font-picker]")
  ) {
    state.legendFontPickerFieldKey = "";
    state.legendFontPickerQuery = "";
    state.legendFontPickerSegment = LEGEND_FONT_PICKER_SEGMENT_BUILTIN;
    state.legendFontSourceEditorFieldKey = "";
    shouldRender = true;
  }

  if (
    state.legendIconPickerFieldKey
    && event.target instanceof Element
    && !event.target.closest("[data-icon-picker]")
  ) {
    state.legendIconPickerFieldKey = "";
    state.legendIconPickerQuery = "";
    shouldRender = true;
  }

  if (shouldRender) {
    render();
  }
}

function handleWindowKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  let shouldRender = false;

  if (state.isLanguageMenuOpen) {
    state.isLanguageMenuOpen = false;
    shouldRender = true;
  }

  if (state.legendFontPickerFieldKey) {
    state.legendFontPickerFieldKey = "";
    state.legendFontPickerQuery = "";
    state.legendFontPickerSegment = LEGEND_FONT_PICKER_SEGMENT_BUILTIN;
    state.legendFontSourceEditorFieldKey = "";
    shouldRender = true;
  }

  if (state.legendIconPickerFieldKey) {
    state.legendIconPickerFieldKey = "";
    state.legendIconPickerQuery = "";
    shouldRender = true;
  }

  if (state.keycapExportOverlayKeycapId && state.exportsStatus !== "running") {
    state.keycapExportOverlayKeycapId = "";
    shouldRender = true;
  }

  if (state.keycapDesignOverlayKeycapId) {
    state.keycapDesignOverlayKeycapId = "";
    shouldRender = true;
  }

  if (shouldRender) {
    render();
  }
}

function buildEditorDataFilename(params = state.keycapParams) {
  return `${sanitizeExportBaseName(params.name)}.json`;
}

function build3mfFilename(params = state.keycapParams) {
  return `${sanitizeExportBaseName(params.name)}.3mf`;
}

function buildStlFilename(params = state.keycapParams) {
  return `${sanitizeExportBaseName(params.name)}.stl`;
}

function buildStepFilename(params = state.keycapParams) {
  return `${sanitizeExportBaseName(params.name)}.step`;
}

function recordExportHistory(entry) {
  state.exportHistory.unshift(entry);
}

function setExportStatus(status, summary, historyEntry) {
  state.exportsStatus = status;
  state.exportsSummary = summary;

  if (historyEntry) {
    recordExportHistory(historyEntry);
  }
}

function setProjectStatus(status, summary) {
  state.projectStatus = status;
  state.projectSummary = summary;
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function clonePreviewViewState(viewState) {
  if (!viewState) {
    return null;
  }

  try {
    return cloneJsonValue(viewState);
  } catch {
    return null;
  }
}

function getProjectEntryEditorDataPayload(entry) {
  return entry?.editorDataPayload ?? createEditorDataPayload(entry?.params ?? state.keycapParams);
}

function getProjectEntryReportFileName(entry) {
  return entry?.jsonPath || entry?.name || DEFAULT_EXPORT_BASE_NAME;
}

function setImportBindingReport(bindingReport, fileName, options = {}) {
  const previousCollapsedState = state.isImportBindingNoticeCollapsed;
  const unboundParams = bindingReport?.unboundParams ?? [];
  state.lastImportBindingReport = unboundParams.length > 0
    ? {
        ...bindingReport,
        fileName,
      }
    : null;
  state.isImportBindingNoticeCollapsed = options.preserveCollapsed
    ? previousCollapsedState
    : false;
}

function parseProjectKeycapEntryEditorData(entry) {
  return parseEditorDataPayloadWithReport(getProjectEntryEditorDataPayload(entry));
}

function activateProjectKeycapEntry(entry) {
  const {
    params,
    bindingReport,
  } = parseProjectKeycapEntryEditorData(entry);

  state.keycapParams = syncDerivedKeycapParams(cloneJsonValue(params));
  state.project.activeKeycapId = entry.id;
  state.editorStatus = "dirty";
  state.editorSummary = t("status.loadedDirty");
  setImportBindingReport(bindingReport, getProjectEntryReportFileName(entry));
  previewViewState = clonePreviewViewState(entry.previewViewState) ?? previewViewState;
  return params;
}

function getPathExtension(path) {
  return String(path ?? "")
    .split(".")
    .pop()
    ?.toLowerCase() ?? "";
}

function isPreviewPathCompatibleWithDataUrl(path, previewImageDataUrl) {
  const pathExtension = getPathExtension(path);
  return pathExtension && pathExtension === getProjectPreviewImageExtension(previewImageDataUrl);
}

function handleProjectNameInput(input) {
  state.project.name = input.value;
  state.project.isDirty = true;
  setProjectStatus("idle", t("project.edited"));
}

function createProjectEntryFromCurrentKeycap(options = {}) {
  return createProjectKeycapEntry(state.keycapParams, options);
}

function clearPendingActiveProjectKeycapSync() {
  window.clearTimeout(pendingActiveProjectSyncTimer);
  pendingActiveProjectSyncTimer = 0;
}

function scheduleActiveProjectKeycapSync() {
  if (!state.project.activeKeycapId) {
    return;
  }

  window.clearTimeout(pendingActiveProjectSyncTimer);
  pendingActiveProjectSyncTimer = window.setTimeout(() => {
    pendingActiveProjectSyncTimer = 0;
    syncActiveProjectKeycapFromCurrent();
  }, ACTIVE_PROJECT_SYNC_DELAY_MS);
}

function flushPendingActiveProjectKeycapSync() {
  if (!pendingActiveProjectSyncTimer) {
    return;
  }

  clearPendingActiveProjectKeycapSync();
  syncActiveProjectKeycapFromCurrent();
}

function captureCurrentPreviewViewState() {
  return clonePreviewViewState(disposePreviewScene?.captureViewState?.() ?? previewViewState);
}

function capturePreviewImageDataUrlForViewState(viewState) {
  const previewScene = disposePreviewScene;
  const normalizedViewState = clonePreviewViewState(viewState);
  if (!previewScene || !normalizedViewState || typeof previewScene.applyViewState !== "function") {
    return createCurrentPreviewImageDataUrl();
  }

  const currentViewState = captureCurrentPreviewViewState();
  previewScene.applyViewState(normalizedViewState);
  const imageDataUrl = createCurrentPreviewImageDataUrl();

  if (currentViewState) {
    previewScene.applyViewState(currentViewState);
    previewViewState = currentViewState;
  }

  return imageDataUrl;
}

function captureCurrentProjectPreview(options = {}) {
  const previewViewState = clonePreviewViewState(options.previewViewState) ?? captureCurrentPreviewViewState();
  return {
    previewImageDataUrl: capturePreviewImageDataUrlForViewState(previewViewState),
    previewViewState,
  };
}

function syncActiveProjectKeycapFromCurrent(options = {}) {
  clearPendingActiveProjectKeycapSync();

  if (!state.project.activeKeycapId) {
    return;
  }

  const entryIndex = state.project.keycaps.findIndex((entry) => entry.id === state.project.activeKeycapId);
  if (entryIndex < 0) {
    state.project.activeKeycapId = "";
    return;
  }

  const currentEntry = state.project.keycaps[entryIndex];
  const currentName = sanitizeExportBaseName(currentEntry.name, DEFAULT_EXPORT_BASE_NAME);
  const nextName = sanitizeExportBaseName(state.keycapParams.name, DEFAULT_EXPORT_BASE_NAME);
  const didNameChange = currentName !== nextName;
  const nextPreviewImageDataUrl = options.previewImageDataUrl ?? currentEntry.previewImageDataUrl;
  const nextPreviewViewState = options.previewViewState === undefined
    ? currentEntry.previewViewState
    : clonePreviewViewState(options.previewViewState);
  const nextJsonPath = didNameChange ? undefined : currentEntry.jsonPath;
  const nextPreviewPath = didNameChange
    ? undefined
    : options.previewPath ?? (
        options.previewImageDataUrl && !isPreviewPathCompatibleWithDataUrl(currentEntry.previewPath, nextPreviewImageDataUrl)
          ? undefined
          : currentEntry.previewPath
      );
  const nextThreeMfPath = didNameChange ? undefined : currentEntry.threeMfPath;
  const nextEditorDataPayload = options.editorDataPayload
    ?? mergeEditorDataPayloadParams(currentEntry.editorDataPayload, state.keycapParams);
  state.project.keycaps[entryIndex] = createProjectEntryFromCurrentKeycap({
    id: currentEntry.id,
    name: state.keycapParams.name,
    jsonPath: nextJsonPath,
    previewPath: nextPreviewPath,
    threeMfPath: nextThreeMfPath,
    displayOrder: currentEntry.displayOrder,
    editorDataPayload: nextEditorDataPayload,
    previewImageDataUrl: nextPreviewImageDataUrl,
    previewViewState: nextPreviewViewState,
  });
  const { bindingReport } = parseProjectKeycapEntryEditorData(state.project.keycaps[entryIndex]);
  setImportBindingReport(bindingReport, getProjectEntryReportFileName(state.project.keycaps[entryIndex]), {
    preserveCollapsed: true,
  });
  state.project.isDirty = true;
}

function refreshActiveProjectKeycapPreviewFromCurrent() {
  if (!state.project.activeKeycapId) {
    return;
  }

  const activeEntry = state.project.keycaps.find((entry) => entry.id === state.project.activeKeycapId);
  if (!activeEntry) {
    return;
  }

  const previewViewState = clonePreviewViewState(activeEntry.previewViewState) ?? captureCurrentPreviewViewState();
  const capturedPreview = captureCurrentProjectPreview({ previewViewState });
  syncActiveProjectKeycapFromCurrent(capturedPreview);

  const refreshedEntry = state.project.keycaps.find((entry) => entry.id === activeEntry.id) ?? activeEntry;
  syncVisibleProjectKeycapPreviewImage(refreshedEntry);
  return refreshedEntry;
}

function syncVisibleProjectKeycapPreviewImage(entry) {
  const image = getProjectKeycapCardById(entry?.id)?.querySelector(".project-keycap-item__preview img");
  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  const nextImageDataUrl = entry.previewImageDataUrl || createProjectPreviewPlaceholderDataUrl(entry.params);
  if (image.getAttribute("src") !== nextImageDataUrl) {
    image.setAttribute("src", nextImageDataUrl);
  }
}

function drawFallbackPreviewThumbnail(context, canvas, thumbnailSize) {
  const scale = Math.min(thumbnailSize / canvas.width, thumbnailSize / canvas.height);
  const width = Math.max(canvas.width * scale, 1);
  const height = Math.max(canvas.height * scale, 1);
  const left = (thumbnailSize - width) / 2;
  const top = (thumbnailSize - height) / 2;
  context.drawImage(canvas, left, top, width, height);
}

function captureCurrentPreviewImageDataUrl() {
  const canvas = app.querySelector("[data-preview-stage] canvas");
  if (!(canvas instanceof HTMLCanvasElement) || canvas.width <= 0 || canvas.height <= 0) {
    return "";
  }

  try {
    const thumbnailCanvas = document.createElement("canvas");
    const thumbnailSize = 384;
    thumbnailCanvas.width = thumbnailSize;
    thumbnailCanvas.height = thumbnailSize;
    const context = thumbnailCanvas.getContext("2d");
    if (!context) {
      return "";
    }

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = canvas.width;
    sourceCanvas.height = canvas.height;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) {
      drawFallbackPreviewThumbnail(context, canvas, thumbnailSize);
      return thumbnailCanvas.toDataURL("image/png");
    }

    sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceContext.drawImage(canvas, 0, 0);
    const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const objectBounds = findOpaquePixelBounds(imageData, sourceCanvas.width, sourceCanvas.height);

    if (!objectBounds) {
      drawFallbackPreviewThumbnail(context, canvas, thumbnailSize);
      return thumbnailCanvas.toDataURL("image/png");
    }

    const sourcePadding = Math.ceil(Math.max(objectBounds.width, objectBounds.height) * 0.04);
    const paddedBounds = expandPixelBounds(objectBounds, sourceCanvas.width, sourceCanvas.height, sourcePadding);
    const drawPlan = createSquareThumbnailDrawPlan(paddedBounds, thumbnailSize);
    if (!drawPlan) {
      drawFallbackPreviewThumbnail(context, canvas, thumbnailSize);
      return thumbnailCanvas.toDataURL("image/png");
    }

    context.drawImage(
      sourceCanvas,
      drawPlan.sourceX,
      drawPlan.sourceY,
      drawPlan.sourceWidth,
      drawPlan.sourceHeight,
      drawPlan.destinationX,
      drawPlan.destinationY,
      drawPlan.destinationWidth,
      drawPlan.destinationHeight,
    );
    return thumbnailCanvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

function createCurrentPreviewImageDataUrl() {
  return captureCurrentPreviewImageDataUrl() || createProjectPreviewPlaceholderDataUrl(state.keycapParams);
}

function recaptureActiveProjectKeycapPreview(entryId) {
  if (!entryId || entryId !== state.project.activeKeycapId) {
    return;
  }

  syncActiveProjectKeycapFromCurrent(captureCurrentProjectPreview());
  setProjectStatus("success", t("project.previewRecaptured"));
  render({ animateInspector: true });
}

async function addCurrentKeycapToProject() {
  const entry = createProjectEntryFromCurrentKeycap({
    ...captureCurrentProjectPreview(),
    displayOrder: state.project.keycaps.length,
  });
  state.project.keycaps = [...state.project.keycaps, entry];
  state.project.activeKeycapId = entry.id;
  state.project.isDirty = true;
  setProjectStatus("success", t("project.added", { name: entry.name }));
  render({ animateInspector: true });
}

async function applyProjectKeycapSelection(entryId) {
  flushPendingActiveProjectKeycapSync();

  const entry = state.project.keycaps.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  activateProjectKeycapEntry(entry);
  setProjectStatus("success", t("project.loadedKeycap", { name: entry.name }));

  render({ animateInspector: true });
  await executeKeycapPreview({ silent: true });
}

async function deleteProjectKeycap(entryId) {
  if (state.project.keycaps.length <= 1) {
    return;
  }

  const entryIndex = state.project.keycaps.findIndex((item) => item.id === entryId);
  if (entryIndex === -1) {
    closeKeycapDesignOverlay();
    return;
  }

  const removedEntry = state.project.keycaps[entryIndex];
  const nextKeycaps = assignProjectKeycapDisplayOrder(state.project.keycaps.filter((item) => item.id !== entryId));
  const wasActive = removedEntry.id === state.project.activeKeycapId;
  const nextActiveEntry = wasActive
    ? nextKeycaps[entryIndex] ?? nextKeycaps[entryIndex - 1] ?? null
    : nextKeycaps.find((item) => item.id === state.project.activeKeycapId) ?? null;

  state.project.keycaps = nextKeycaps;
  state.project.activeKeycapId = nextActiveEntry?.id ?? "";
  state.project.isDirty = true;
  state.keycapDesignOverlayKeycapId = "";
  state.keycapExportOverlayKeycapId = "";
  setProjectStatus("success", t("project.deleted", { name: removedEntry.name }));

  if (wasActive && nextActiveEntry) {
    activateProjectKeycapEntry(nextActiveEntry);
  } else if (wasActive) {
    state.lastImportBindingReport = null;
    state.isImportBindingNoticeCollapsed = false;
  }

  render({ animateInspector: true });

  if (wasActive && nextActiveEntry) {
    await executeKeycapPreview({ silent: true });
  }
}

function getProjectPathParts(relativePath) {
  return String(relativePath ?? "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
}

async function getProjectFileHandle(directoryHandle, relativePath, options = {}) {
  const pathParts = getProjectPathParts(relativePath);
  const fileName = pathParts.pop();
  if (!fileName) {
    throw new Error(t("project.invalidPath", { path: relativePath }));
  }

  let currentDirectory = directoryHandle;
  for (const directoryName of pathParts) {
    currentDirectory = await currentDirectory.getDirectoryHandle(directoryName, options);
  }

  return currentDirectory.getFileHandle(fileName, options);
}

async function readProjectFile(directoryHandle, relativePath) {
  const fileHandle = await getProjectFileHandle(directoryHandle, relativePath);
  return fileHandle.getFile();
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(t("project.previewDecodeFailed"));
  }

  return response.blob();
}

async function dataUrlToUint8Array(dataUrl) {
  const blob = await dataUrlToBlob(dataUrl);
  return new Uint8Array(await blob.arrayBuffer());
}

async function blobToUint8Array(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function create3mfExportBlob(params = state.keycapParams) {
  const offResults = await runKeycapOffJobs(createKeycapOffJobs("3mf", params), params);
  const blob = create3mfBlob(
    offResults.map((entry) => ({
      name: `keycap-${entry.name}`,
      colorHex: entry.colorHex,
      ...entry.mesh,
    })),
    {
      assemblyName: sanitizeExportBaseName(params.name),
    },
  );

  return {
    blob,
    offResults,
  };
}

async function createStepExportBlob(params = state.keycapParams) {
  const result = await runOpenScad({
    files: await createKeycapFiles({
      params,
      exportTarget: "single_material_shape",
    }),
    args: buildKeycapArgs({
      outputPath: keycapStepSourceOffPath,
      outputFormat: "off",
    }),
    outputPaths: [keycapStepSourceOffPath],
  });
  const [output] = result.outputs;
  const mesh = parseOff(textDecoder.decode(output.bytes));
  const blob = createStepBlob(mesh, {
    name: sanitizeExportBaseName(params.name),
  });

  return {
    blob,
    result,
    mesh,
  };
}

function prepareProjectForSave() {
  flushPendingActiveProjectKeycapSync();

  if (state.project.activeKeycapId) {
    refreshActiveProjectKeycapPreviewFromCurrent();
  }

  state.project.name = normalizeProjectName(state.project.name, DEFAULT_PROJECT_NAME);
  state.project.keycaps = createProjectKeycapEntriesForSave(state.project.keycaps);
  return state.project;
}

async function downloadProjectZip(project) {
  const projectDirectoryName = normalizeProjectName(project.name, DEFAULT_PROJECT_NAME);
  const manifest = createProjectManifest(project);
  const files = {
    [`${projectDirectoryName}/${PROJECT_MANIFEST_FILENAME}`]: strToU8(JSON.stringify(manifest, null, 2)),
  };

  for (const entry of project.keycaps) {
    files[`${projectDirectoryName}/${entry.jsonPath}`] = strToU8(JSON.stringify(entry.editorDataPayload, null, 2));
    files[`${projectDirectoryName}/${entry.previewPath}`] = await dataUrlToUint8Array(
      entry.previewImageDataUrl || createProjectPreviewPlaceholderDataUrl(entry.params),
    );
    const { blob } = await create3mfExportBlob(entry.params);
    files[`${projectDirectoryName}/${entry.threeMfPath}`] = await blobToUint8Array(blob);
  }

  const zipBytes = zipSync(files, { level: 6 });
  downloadBlob(new Blob([zipBytes], { type: "application/zip" }), `${projectDirectoryName}.zip`);
}

async function saveProject() {
  setProjectStatus("running", t("project.saving"));
  render();

  try {
    const project = prepareProjectForSave();
    await downloadProjectZip(project);
    state.project.isDirty = false;
    setProjectStatus("success", t("project.saved"));
  } catch (error) {
    setProjectStatus("error", t("project.saveFailed", { message: `${error}` }));
  }

  render({ animateInspector: true });
}

function applyShapeProfileParams(profileKey) {
  const defaults = createDefaultKeycapParams(profileKey);
  const defaultParams = createInitialKeycapParams(profileKey);
  const previousProfileKey = state.keycapParams.shapeProfile ?? DEFAULT_SHAPE_PROFILE_KEY;
  const previousGeometryType = resolveShapeGeometryType(previousProfileKey);
  const nextGeometryType = resolveShapeGeometryType(profileKey);
  const previousVisibleFieldKeys = getShapeProfileVisibleFieldKeys(previousProfileKey);
  const nextVisibleFieldKeys = getShapeProfileVisibleFieldKeys(profileKey);
  const geometryTypeChanged = previousGeometryType !== nextGeometryType;
  const footprintTypeChanged = isJisEnterShapeProfile(previousProfileKey) || isJisEnterShapeProfile(profileKey);
  const nextParams = {};

  for (const key of listEditableParamKeys(profileKey)) {
    const shouldResetToProfileDefault = geometryTypeChanged && GEOMETRY_TYPE_RESET_FIELDS.has(key)
      || footprintTypeChanged && FOOTPRINT_RESET_FIELDS.has(key)
      || !previousVisibleFieldKeys.has(key)
      || !nextVisibleFieldKeys.has(key);
    const sourceValue = shouldResetToProfileDefault ? defaultParams[key] : state.keycapParams[key];
    nextParams[key] = sanitizeEditorParamValue(key, sourceValue, defaults[key], {
      ...state.keycapParams,
      ...nextParams,
      shapeProfile: profileKey,
    });
  }

  nextParams.name = state.keycapParams.name ?? defaultParams.name ?? defaults.name;
  nextParams.shapeProfile = profileKey;
  state.keycapParams = syncDerivedKeycapParams(nextParams);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function syncImportDropOverlay() {
  const overlay = app.querySelector("[data-import-drop-overlay]");
  if (!overlay) {
    return;
  }

  overlay.hidden = !state.isImportDragActive;
  overlay.classList.toggle("is-active", state.isImportDragActive);
  overlay.setAttribute("aria-hidden", state.isImportDragActive ? "false" : "true");
}

function setImportDragActive(isActive) {
  if (state.isImportDragActive === isActive) {
    return;
  }

  state.isImportDragActive = isActive;
  syncImportDropOverlay();
}

function isFileTransfer(dataTransfer) {
  return Array.from(dataTransfer?.types ?? []).includes("Files");
}

function resetEditorDataDropState() {
  editorDataDragDepth = 0;
  setImportDragActive(false);
}

function attachEditorDataDropListeners() {
  if (hasAttachedEditorDataDropListeners) {
    return;
  }

  hasAttachedEditorDataDropListeners = true;
  window.addEventListener("dragenter", handleWindowDragEnter);
  window.addEventListener("dragover", handleWindowDragOver);
  window.addEventListener("dragleave", handleWindowDragLeave);
  window.addEventListener("drop", handleWindowDrop);
  window.addEventListener("dragend", resetEditorDataDropState);
}

async function importEditorDataFile(file) {
  const startedAt = performance.now();
  const text = await file.text();
  state.lastImportBindingReport = null;
  const payload = JSON.parse(text);
  const {
    params: nextParams,
    bindingReport,
  } = parseEditorDataPayloadWithReport(payload);
  const unboundParamCount = bindingReport.unboundParams.length;

  state.keycapParams = nextParams;
  state.editorStatus = "dirty";
  state.editorSummary = t("status.loadedDirty");
  setImportBindingReport(bindingReport, file.name);
  state.sidebarTab = "project";
  setExportStatus(
    "success",
    t("importExport.loaded", { fileName: file.name }),
    {
      format: "editor-data-import",
      label: t("importExport.loadLabel"),
      elapsedMs: Math.round(performance.now() - startedAt),
      byteLength: file.size,
      notes: unboundParamCount > 0
        ? t("importExport.loadNoteWithUnbound", { fileName: file.name, count: unboundParamCount })
        : t("importExport.loadNote", { fileName: file.name }),
    },
  );

  await executeKeycapPreview({ silent: true });
  const entry = createProjectEntryFromCurrentKeycap({
    ...captureCurrentProjectPreview(),
    displayOrder: state.project.keycaps.length,
    editorDataPayload: payload,
  });
  state.project.keycaps = [...state.project.keycaps, entry];
  state.project.activeKeycapId = entry.id;
  state.project.isDirty = true;
  setProjectStatus("success", t("project.added", { name: entry.name }));
  render({ animateInspector: true });
}

function getWebkitFile(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

function getWebkitDirectoryChild(directoryEntry, name, kind) {
  return new Promise((resolve, reject) => {
    const handleEntry = (entry) => {
      if ((kind === "file" && entry?.isFile) || (kind === "directory" && entry?.isDirectory)) {
        resolve(entry);
      } else {
        reject(new Error(t("project.invalidPath", { path: name })));
      }
    };

    if (kind === "file") {
      directoryEntry.getFile(name, {}, handleEntry, reject);
    } else {
      directoryEntry.getDirectory(name, {}, handleEntry, reject);
    }
  });
}

function createWebkitDirectoryHandle(directoryEntry) {
  return {
    kind: "directory",
    name: directoryEntry.name,
    async getFileHandle(name, options = {}) {
      if (options.create) {
        throw new Error(t("project.directoryNotWritable"));
      }

      const fileEntry = await getWebkitDirectoryChild(directoryEntry, name, "file");
      return {
        kind: "file",
        name: fileEntry.name,
        getFile: () => getWebkitFile(fileEntry),
      };
    },
    async getDirectoryHandle(name, options = {}) {
      if (options.create) {
        throw new Error(t("project.directoryNotWritable"));
      }

      const childDirectoryEntry = await getWebkitDirectoryChild(directoryEntry, name, "directory");
      return createWebkitDirectoryHandle(childDirectoryEntry);
    },
  };
}

function createDroppedTransferSnapshot(dataTransfer) {
  const items = Array.from(dataTransfer?.items ?? []);
  const dataTransferFiles = Array.from(dataTransfer?.files ?? []);
  const itemFiles = [];
  const fileSystemHandlePromises = [];
  const webkitDirectoryHandles = [];

  for (const item of items) {
    if (item.kind !== "file") {
      continue;
    }

    if (typeof item.getAsFile === "function") {
      try {
        const file = item.getAsFile();
        if (file) {
          itemFiles.push(file);
        }
      } catch {}
    }

    if (typeof item.getAsFileSystemHandle === "function") {
      fileSystemHandlePromises.push(item.getAsFileSystemHandle().catch(() => null));
    }

    const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
    if (entry?.isDirectory) {
      webkitDirectoryHandles.push(createWebkitDirectoryHandle(entry));
    }
  }

  return {
    files: dataTransferFiles.length > 0 ? dataTransferFiles : itemFiles,
    fileSystemHandlePromises,
    webkitDirectoryHandles,
  };
}

async function getDroppedDirectoryHandle(dropSnapshot) {
  for (const handlePromise of dropSnapshot.fileSystemHandlePromises) {
    const handle = await handlePromise;
    if (handle?.kind === "directory") {
      return handle;
    }
  }

  return dropSnapshot.webkitDirectoryHandles[0] ?? null;
}

async function getDroppedFiles(dropSnapshot) {
  if (dropSnapshot.files.length > 0) {
    return dropSnapshot.files;
  }

  const handleFiles = [];
  for (const handlePromise of dropSnapshot.fileSystemHandlePromises) {
    const handle = await handlePromise;
    if (handle?.kind !== "file") {
      continue;
    }

    try {
      handleFiles.push(await handle.getFile());
    } catch {}
  }

  return handleFiles;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")), { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(blob);
  });
}

function readBytesAsText(bytes) {
  return textDecoder.decode(bytes);
}

async function readBytesAsDataUrl(bytes, path) {
  return readBlobAsDataUrl(new Blob([bytes], { type: getProjectAssetMimeType(path) }));
}

function normalizeArchiveEntryPath(path) {
  return String(path ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
}

function createNormalizedArchiveEntries(rawEntries) {
  const entries = new Map();

  for (const [path, bytes] of Object.entries(rawEntries ?? {})) {
    const normalizedPath = normalizeArchiveEntryPath(path);
    if (!normalizedPath || normalizedPath.endsWith("/") || normalizedPath.startsWith("__MACOSX/")) {
      continue;
    }

    entries.set(normalizedPath, bytes);
  }

  return entries;
}

function getProjectRootPrefixFromPath(path) {
  const normalizedPath = normalizeArchiveEntryPath(path);
  if (!normalizedPath.endsWith(PROJECT_MANIFEST_FILENAME)) {
    return "";
  }

  return normalizedPath.slice(0, -PROJECT_MANIFEST_FILENAME.length);
}

function findProjectArchiveEntryPath(entries, rootPrefix, projectPath) {
  const normalizedProjectPath = normalizeArchiveEntryPath(projectPath);
  const expectedPath = `${rootPrefix}${normalizedProjectPath}`;
  if (entries.has(expectedPath)) {
    return expectedPath;
  }

  return Array.from(entries.keys()).find((path) => path.endsWith(`/${normalizedProjectPath}`)) ?? "";
}

async function readProjectPreviewImageDataUrl(directoryHandle, previewPath, params) {
  if (!previewPath) {
    return createProjectPreviewPlaceholderDataUrl(params);
  }

  try {
    const previewFile = await readProjectFile(directoryHandle, previewPath);
    return await readBlobAsDataUrl(previewFile);
  } catch {
    return createProjectPreviewPlaceholderDataUrl(params);
  }
}

async function importProjectDirectory(directoryHandle) {
  const manifestFile = await readProjectFile(directoryHandle, PROJECT_MANIFEST_FILENAME);
  const manifestPayload = JSON.parse(await manifestFile.text());
  const manifest = parseProjectManifest(manifestPayload, directoryHandle.name);
  const keycaps = [];

  for (const manifestEntry of manifest.keycaps) {
    const editorDataFile = await readProjectFile(directoryHandle, manifestEntry.jsonPath);
    const editorDataPayload = JSON.parse(await editorDataFile.text());
    const entryWithoutPreview = createProjectKeycapEntry({}, {
      manifestEntry,
      editorDataPayload,
    });
    const previewImageDataUrl = await readProjectPreviewImageDataUrl(
      directoryHandle,
      manifestEntry.previewPath,
      entryWithoutPreview.params,
    );

    keycaps.push(createProjectKeycapEntry(entryWithoutPreview.params, {
      manifestEntry,
      editorDataPayload,
      previewImageDataUrl,
    }));
  }

  const didCreateFallbackKeycap = keycaps.length === 0;
  state.project = createProjectStateWithActiveKeycap({
    name: manifest.name,
    keycaps,
    activeKeycapId: manifest.activeKeycapId,
    directoryHandle,
    isDirty: didCreateFallbackKeycap,
    fallbackKeycapParams: state.keycapParams,
  });
  const activeEntry = state.project.keycaps.find((entry) => entry.id === state.project.activeKeycapId);
  activateProjectKeycapEntry(activeEntry);

  state.sidebarTab = "project";
  state.editorStatus = "dirty";
  state.editorSummary = t("status.loadedDirty");
  setProjectStatus("success", t("project.loaded", { name: state.project.name, count: state.project.keycaps.length }));
  render({ animateInspector: true });

  await executeKeycapPreview({ silent: true, refreshActiveProjectPreview: didCreateFallbackKeycap });
}

function getDroppedFilePath(file) {
  return String(file.webkitRelativePath || file.name || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
}

function findDroppedProjectManifestFile(files) {
  return files.find((file) => {
    const filePath = getDroppedFilePath(file);
    return file.name === PROJECT_MANIFEST_FILENAME || filePath.endsWith(`/${PROJECT_MANIFEST_FILENAME}`);
  }) ?? null;
}

function getDroppedProjectRootPrefix(manifestFile) {
  return getProjectRootPrefixFromPath(getDroppedFilePath(manifestFile));
}

function getDroppedProjectFallbackName(rootPrefix) {
  return rootPrefix
    .replace(/\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .pop() || DEFAULT_PROJECT_NAME;
}

function findDroppedProjectFile(files, rootPrefix, projectPath) {
  const normalizedProjectPath = String(projectPath ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
  const expectedPath = `${rootPrefix}${normalizedProjectPath}`;
  return files.find((file) => {
    const filePath = getDroppedFilePath(file);
    return filePath === expectedPath || filePath.endsWith(`/${normalizedProjectPath}`);
  }) ?? null;
}

async function importProjectFiles(files, manifestFile) {
  const rootPrefix = getDroppedProjectRootPrefix(manifestFile);
  const manifestPayload = JSON.parse(await manifestFile.text());
  const manifest = parseProjectManifest(manifestPayload, getDroppedProjectFallbackName(rootPrefix));
  const keycaps = [];

  for (const manifestEntry of manifest.keycaps) {
    const editorDataFile = findDroppedProjectFile(files, rootPrefix, manifestEntry.jsonPath);
    if (!editorDataFile) {
      throw new Error(t("project.missingProjectFile", { path: manifestEntry.jsonPath }));
    }

    const editorDataPayload = JSON.parse(await editorDataFile.text());
    const entryWithoutPreview = createProjectKeycapEntry({}, {
      manifestEntry,
      editorDataPayload,
    });
    const previewFile = manifestEntry.previewPath
      ? findDroppedProjectFile(files, rootPrefix, manifestEntry.previewPath)
      : null;
    const previewImageDataUrl = previewFile
      ? await readBlobAsDataUrl(previewFile)
      : createProjectPreviewPlaceholderDataUrl(entryWithoutPreview.params);

    keycaps.push(createProjectKeycapEntry(entryWithoutPreview.params, {
      manifestEntry,
      editorDataPayload,
      previewImageDataUrl,
    }));
  }

  const didCreateFallbackKeycap = keycaps.length === 0;
  state.project = createProjectStateWithActiveKeycap({
    name: manifest.name,
    keycaps,
    activeKeycapId: manifest.activeKeycapId,
    directoryHandle: null,
    isDirty: didCreateFallbackKeycap,
    fallbackKeycapParams: state.keycapParams,
  });
  const activeEntry = state.project.keycaps.find((entry) => entry.id === state.project.activeKeycapId);
  activateProjectKeycapEntry(activeEntry);

  state.sidebarTab = "project";
  state.editorStatus = "dirty";
  state.editorSummary = t("status.loadedDirty");
  setProjectStatus("success", t("project.loaded", { name: state.project.name, count: state.project.keycaps.length }));
  render({ animateInspector: true });

  await executeKeycapPreview({ silent: true, refreshActiveProjectPreview: didCreateFallbackKeycap });
}

async function importProjectArchiveFile(file) {
  const archiveBytes = new Uint8Array(await file.arrayBuffer());
  const archiveEntries = createNormalizedArchiveEntries(unzipSync(archiveBytes));
  const manifestPath = findProjectManifestPath(archiveEntries.keys());
  if (!manifestPath) {
    throw new Error(t("project.missingProjectFile", { path: PROJECT_MANIFEST_FILENAME }));
  }

  const rootPrefix = getProjectRootPrefixFromPath(manifestPath);
  const manifestBytes = archiveEntries.get(manifestPath);
  const manifestPayload = JSON.parse(readBytesAsText(manifestBytes));
  const manifest = parseProjectManifest(manifestPayload, getDroppedProjectFallbackName(rootPrefix));
  const keycaps = [];

  for (const manifestEntry of manifest.keycaps) {
    const editorDataPath = findProjectArchiveEntryPath(archiveEntries, rootPrefix, manifestEntry.jsonPath);
    if (!editorDataPath) {
      throw new Error(t("project.missingProjectFile", { path: manifestEntry.jsonPath }));
    }

    const editorDataPayload = JSON.parse(readBytesAsText(archiveEntries.get(editorDataPath)));
    const entryWithoutPreview = createProjectKeycapEntry({}, {
      manifestEntry,
      editorDataPayload,
    });
    const previewEntryPath = manifestEntry.previewPath
      ? findProjectArchiveEntryPath(archiveEntries, rootPrefix, manifestEntry.previewPath)
      : "";
    const previewImageDataUrl = previewEntryPath
      ? await readBytesAsDataUrl(archiveEntries.get(previewEntryPath), previewEntryPath)
      : createProjectPreviewPlaceholderDataUrl(entryWithoutPreview.params);

    keycaps.push(createProjectKeycapEntry(entryWithoutPreview.params, {
      manifestEntry,
      editorDataPayload,
      previewImageDataUrl,
    }));
  }

  const didCreateFallbackKeycap = keycaps.length === 0;
  state.project = createProjectStateWithActiveKeycap({
    name: manifest.name,
    keycaps,
    activeKeycapId: manifest.activeKeycapId,
    directoryHandle: null,
    isDirty: didCreateFallbackKeycap,
    fallbackKeycapParams: state.keycapParams,
  });
  const activeEntry = state.project.keycaps.find((entry) => entry.id === state.project.activeKeycapId);
  activateProjectKeycapEntry(activeEntry);

  state.sidebarTab = "project";
  state.editorStatus = "dirty";
  state.editorSummary = t("status.loadedDirty");
  setProjectStatus("success", t("project.loaded", { name: state.project.name, count: state.project.keycaps.length }));
  render({ animateInspector: true });

  await executeKeycapPreview({ silent: true, refreshActiveProjectPreview: didCreateFallbackKeycap });
}

async function importEditorDataFromDrop(files) {
  const jsonFile = files.find((file) => file.name.toLowerCase().endsWith(".json"));
  if (!jsonFile) {
    throw new Error(t("importExport.noJsonFile"));
  }

  await importEditorDataFile(jsonFile);
}

async function importFileTransferFromDrop(dataTransfer) {
  const dropSnapshot = createDroppedTransferSnapshot(dataTransfer);
  const directoryHandle = await getDroppedDirectoryHandle(dropSnapshot);
  if (directoryHandle) {
    await importProjectDirectory(directoryHandle);
    return;
  }

  const files = await getDroppedFiles(dropSnapshot);
  const fontFiles = files.filter(isUserLegendFontFile);
  if (fontFiles.length > 0) {
    await registerUserLegendFontFiles(fontFiles, {
      fieldKey: state.legendFontPickerFieldKey || "legendFontKey",
      selectFirst: Boolean(state.legendFontPickerFieldKey),
    });
    return;
  }

  const projectManifestFile = findDroppedProjectManifestFile(files);
  if (projectManifestFile) {
    await importProjectFiles(files, projectManifestFile);
    return;
  }

  const projectArchiveFile = files.find((file) => isProjectArchiveFileName(file.name));
  if (projectArchiveFile) {
    await importProjectArchiveFile(projectArchiveFile);
    return;
  }

  await importEditorDataFromDrop(files);
}

function handleWindowDragEnter(event) {
  if (!isFileTransfer(event.dataTransfer)) {
    return;
  }

  event.preventDefault();
  editorDataDragDepth += 1;
  setImportDragActive(true);
}

function handleWindowDragOver(event) {
  if (!isFileTransfer(event.dataTransfer)) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }

  setImportDragActive(true);
}

function handleWindowDragLeave(event) {
  if (!isFileTransfer(event.dataTransfer)) {
    return;
  }

  event.preventDefault();
  editorDataDragDepth = Math.max(editorDataDragDepth - 1, 0);
  if (editorDataDragDepth === 0) {
    setImportDragActive(false);
  }
}

async function handleWindowDrop(event) {
  if (!isFileTransfer(event.dataTransfer)) {
    return;
  }

  event.preventDefault();
  resetEditorDataDropState();

  try {
    await importFileTransferFromDrop(event.dataTransfer);
  } catch (error) {
    setExportStatus(
      "error",
      t("importExport.loadFailed"),
      {
        format: "editor-data-import",
        label: t("importExport.loadFailedLabel"),
        elapsedMs: 0,
        byteLength: 0,
        notes: `${error}`,
      },
    );
    render();
  }
}

const TOP_LIVE_FIELD_KEYS = new Set([
  "topCenterHeight",
  "wallThickness",
  "topThickness",
  "topScale",
  "topPitchDeg",
  "topRollDeg",
  "topFrontHeight",
  "topBackHeight",
  "topLeftHeight",
  "topRightHeight",
  "dishDepth",
  "topCornerRadius",
  ...TOP_CORNER_RADIUS_FIELD_KEYS,
  "keycapEdgeRadius",
  "keycapShoulderRadius",
  "typewriterMountHeight",
  "topHatDishDepth",
  "topHatTopWidth",
  "topHatTopDepth",
  "topHatBottomWidth",
  "topHatBottomDepth",
  "topHatInset",
  "topHatTopRadius",
  ...TOP_HAT_TOP_RADIUS_FIELD_KEYS,
  "topHatBottomRadius",
  ...TOP_HAT_BOTTOM_RADIUS_FIELD_KEYS,
  "topHatHeight",
  "topHatShoulderAngle",
  "topHatShoulderRadius",
]);

function syncFieldHint(fieldKey, options = {}) {
  const input = app.querySelector(`[data-field="${fieldKey}"]`);
  const fieldConfig = getFieldConfig(fieldKey);
  const hint = input?.closest(".field")?.querySelector(".field-hint");

  if (hint && fieldConfig) {
    hint.textContent = resolveDynamicCopy(fieldConfig.hint);
  }

  if (options.syncInputs !== false) {
    syncFieldInputs(fieldKey);
  }
}

function schedulePendingFieldUiSync() {
  window.clearTimeout(pendingFieldUiSyncTimer);
  pendingFieldUiSyncTimer = window.setTimeout(flushPendingFieldUiSync, FIELD_UI_SYNC_DELAY_MS);
}

function queueFieldHintSync(fieldKey, options = {}) {
  const currentOptions = pendingFieldHintSyncs.get(fieldKey);
  const shouldSyncInputs = (currentOptions?.syncInputs !== false) || (options.syncInputs !== false);
  pendingFieldHintSyncs.set(fieldKey, { syncInputs: shouldSyncInputs });
  schedulePendingFieldUiSync();
}

function queueFieldInputSync(fieldKey, activeField = null) {
  const currentActiveField = pendingFieldInputSyncs.get(fieldKey);
  pendingFieldInputSyncs.set(
    fieldKey,
    currentActiveField === undefined || currentActiveField === activeField ? activeField : null,
  );
  schedulePendingFieldUiSync();
}

function queueLinkedSizeInputSync(fieldKey) {
  pendingLinkedSizeInputSyncs.add(fieldKey);
  schedulePendingFieldUiSync();
}

function queueVisibleTopFieldStateSync(activeField = null) {
  hasPendingVisibleTopFieldSync = true;
  pendingVisibleTopFieldActiveField = pendingVisibleTopFieldActiveField === null
    ? activeField
    : pendingVisibleTopFieldActiveField;
  schedulePendingFieldUiSync();
}

function flushPendingFieldUiSync() {
  window.clearTimeout(pendingFieldUiSyncTimer);
  pendingFieldUiSyncTimer = 0;

  const shouldSyncVisibleTopFields = hasPendingVisibleTopFieldSync;
  const visibleTopFieldActiveField = pendingVisibleTopFieldActiveField;
  const linkedSizeFieldKeys = [...pendingLinkedSizeInputSyncs];
  const fieldInputSyncs = [...pendingFieldInputSyncs.entries()];
  const fieldHintSyncs = [...pendingFieldHintSyncs.entries()];

  hasPendingVisibleTopFieldSync = false;
  pendingVisibleTopFieldActiveField = null;
  pendingLinkedSizeInputSyncs.clear();
  pendingFieldInputSyncs.clear();
  pendingFieldHintSyncs.clear();

  if (shouldSyncVisibleTopFields) {
    syncVisibleTopFieldState(visibleTopFieldActiveField);
  }

  linkedSizeFieldKeys.forEach((fieldKey) => {
    syncLinkedSizeInputs(fieldKey);
  });

  fieldInputSyncs.forEach(([fieldKey, activeField]) => {
    syncFieldInputs(fieldKey, activeField);
  });

  fieldHintSyncs.forEach(([fieldKey, options]) => {
    syncFieldHint(fieldKey, options);
  });
}

function syncOrQueueFieldHint(fieldKey, options = {}, defer = false) {
  if (defer) {
    queueFieldHintSync(fieldKey, options);
    return;
  }

  syncFieldHint(fieldKey, options);
}

function syncLegendFieldHintsBySuffix(suffix) {
  [...TOP_LEGEND_CONFIGS, ...SIDE_LEGEND_CONFIGS].forEach((config) => {
    syncFieldHint(legendParamKey(config.paramPrefix, suffix));
  });
}

function syncOrQueueLegendFieldHintsBySuffix(suffix, defer = false) {
  if (defer) {
    [...TOP_LEGEND_CONFIGS, ...SIDE_LEGEND_CONFIGS].forEach((config) => {
      queueFieldHintSync(legendParamKey(config.paramPrefix, suffix));
    });
    return;
  }

  syncLegendFieldHintsBySuffix(suffix);
}

function syncFieldConstraintAttribute(input, attributeName, value) {
  if (value == null) {
    input.removeAttribute(attributeName);
    return;
  }

  input.setAttribute(attributeName, `${value}`);
}

function syncNumericFieldConstraints(input, fieldConfig) {
  syncFieldConstraintAttribute(input, "min", resolveFieldAttribute(fieldConfig?.min));
  syncFieldConstraintAttribute(input, "max", resolveFieldAttribute(fieldConfig?.max));
  syncFieldConstraintAttribute(input, "step", resolveFieldAttribute(fieldConfig?.step));
}

function syncFieldInputConstraints(input, fieldConfig) {
  if (input.type !== "range") {
    syncNumericFieldConstraints(input, fieldConfig);
    return;
  }

  const sliderAttributes = resolveFieldSliderAttributes(fieldConfig);
  syncFieldConstraintAttribute(input, "min", sliderAttributes?.min);
  syncFieldConstraintAttribute(input, "max", sliderAttributes?.max);
  syncFieldConstraintAttribute(input, "step", sliderAttributes?.step);
  input.disabled = Boolean(sliderAttributes && sliderAttributes.min >= sliderAttributes.max);
}

function formatFieldInputValue(input, fieldKey, value, fieldConfig) {
  if (input.type !== "range") {
    return formatNumericFieldValue(fieldKey, value);
  }

  const sliderAttributes = resolveFieldSliderAttributes(fieldConfig);
  return canRenderFieldSlider(sliderAttributes)
    ? formatSliderFieldValue(fieldKey, value, sliderAttributes)
    : formatNumericFieldValue(fieldKey, value);
}

function syncFieldSliderVisualState(input, fieldKey, fieldConfig, sliderAttributes = resolveFieldSliderAttributes(fieldConfig)) {
  if (input.type !== "range") {
    return;
  }

  const sliderContainer = input.closest("[data-field-slider]");
  if (!sliderContainer) {
    return;
  }

  const minLabel = sliderContainer.querySelector('[data-field-slider-limit="min"]');
  const maxLabel = sliderContainer.querySelector('[data-field-slider-limit="max"]');
  if (minLabel && sliderAttributes?.min != null) {
    minLabel.textContent = formatNumericFieldValue(fieldKey, sliderAttributes.min, sliderAttributes.step);
  }
  if (maxLabel && sliderAttributes?.max != null) {
    maxLabel.textContent = formatNumericFieldValue(fieldKey, sliderAttributes.max, sliderAttributes.step);
  }

  const track = sliderContainer.querySelector(".field-slider-track");
  const guide = sliderContainer.querySelector("[data-field-slider-guide]");
  if (!track || !guide) {
    return;
  }

  const guidePosition = sliderAttributes?.guidePosition;
  guide.hidden = guidePosition == null;
  if (guidePosition == null) {
    track.style.removeProperty("--field-slider-guide-position");
    return;
  }

  track.style.setProperty("--field-slider-guide-position", formatSliderGuidePosition(guidePosition));
}

function isInputNumericallySynced(input, value) {
  const inputValue = String(input.value ?? "").trim();
  const inputNumber = Number(inputValue);
  const stateNumber = Number(value);
  return inputValue.length > 0
    && Number.isFinite(inputNumber)
    && Number.isFinite(stateNumber)
    && Math.abs(inputNumber - stateNumber) < 1e-9;
}

function syncFieldInputs(fieldKey, activeField = null) {
  const inputs = app.querySelectorAll(`[data-field="${fieldKey}"]`);
  const fieldConfig = getFieldConfig(fieldKey);
  if (inputs.length === 0 || !fieldConfig) {
    return;
  }

  const activeInput = document.activeElement;
  inputs.forEach((input) => {
    const sliderAttributes = input.type === "range" ? resolveFieldSliderAttributes(fieldConfig) : null;
    const nextInputValue = formatFieldInputValue(input, fieldKey, state.keycapParams[fieldKey], fieldConfig);

    syncFieldInputConstraints(input, fieldConfig);
    syncFieldSliderVisualState(input, fieldKey, fieldConfig, sliderAttributes);

    if (
      fieldKey !== activeField
      || input !== activeInput
      || !isInputNumericallySynced(input, nextInputValue)
    ) {
      input.value = nextInputValue;
    }
  });
}

function syncVisibleTopFieldState(activeField = null) {
  TOP_LIVE_FIELD_KEYS.forEach((fieldKey) => {
    syncFieldInputs(fieldKey, activeField);
    syncFieldHint(fieldKey, { syncInputs: false });
    if (Object.values(LINKED_SIZE_UNIT_FIELDS).includes(fieldKey)) {
      syncLinkedSizeInputs(fieldKey);
    }
  });
}

function getNumericFieldMinimum(fieldKey, fieldConfig, input = null) {
  if (input?.type === "range") {
    const rangeMinimum = Number(input.min);
    if (Number.isFinite(rangeMinimum)) {
      return rangeMinimum;
    }
  }

  if (fieldKey === "keySizeUnits" || fieldKey === "keyDepthUnits") {
    return 0.5;
  }

  if (fieldKey === "topHatTopWidthUnits" || fieldKey === "topHatTopDepthUnits") {
    return TOP_HAT_MIN_SIZE / getKeyUnitMm();
  }

  if (fieldKey === "topHatBottomWidthUnits") {
    return getTopHatBottomWidthMin() / getKeyUnitMm();
  }

  if (fieldKey === "topHatBottomDepthUnits") {
    return getTopHatBottomDepthMin() / getKeyUnitMm();
  }

  const minimum = Number(resolveFieldAttribute(fieldConfig?.min));
  return Number.isFinite(minimum) ? minimum : null;
}

function parseNumericInputValue(input, fieldKey, fieldConfig) {
  const rawValue = String(input.value ?? "").trim();
  if (rawValue.length === 0) {
    return null;
  }

  const nextValue = Number(rawValue);
  if (!Number.isFinite(nextValue)) {
    return null;
  }

  const minimum = getNumericFieldMinimum(fieldKey, fieldConfig, input);
  if (minimum != null && nextValue < minimum) {
    return null;
  }

  return nextValue;
}

function setKeyUnitBasisInputValidity(input, isValid) {
  input.setAttribute("aria-invalid", isValid ? "false" : "true");
  input.closest(".field-control")?.classList.toggle("is-invalid", !isValid);
}

function parseKeyUnitBasisInput(input) {
  const rawValue = String(input.value ?? "").trim();
  if (rawValue.length === 0) {
    return null;
  }

  const nextValue = Number(rawValue);
  return Number.isFinite(nextValue) && nextValue >= KEY_UNIT_MIN_MM ? nextValue : null;
}

function syncKeyUnitBasisCopy() {
  const description = app.querySelector("[data-key-unit-description]");
  if (description) {
    description.textContent = t("unitBasis.description", getKeyUnitCopyValues());
  }

  const readout = app.querySelector("[data-key-unit-readout]");
  if (readout) {
    readout.textContent = renderKeyUnitBasisReadout();
  }
}

function syncKeyUnitBasisInputs(activeInput = null) {
  const fieldConfig = getKeyUnitBasisFieldConfig();
  const inputs = app.querySelectorAll("[data-key-unit-mm]");
  inputs.forEach((input) => {
    if (input.type === "range") {
      const sliderAttributes = resolveFieldSliderAttributes(fieldConfig);
      const nextInputValue = formatFieldInputValue(input, KEY_UNIT_FIELD_KEY, getKeyUnitMm(), fieldConfig);
      syncFieldInputConstraints(input, fieldConfig);
      syncFieldSliderVisualState(input, KEY_UNIT_FIELD_KEY, fieldConfig, sliderAttributes);
      if (input !== activeInput || !isInputNumericallySynced(input, nextInputValue)) {
        input.value = nextInputValue;
      }
      return;
    }

    syncNumericFieldConstraints(input, fieldConfig);
    const nextInputValue = formatKeyUnitMmInputValue();
    if (input !== activeInput || !isInputNumericallySynced(input, nextInputValue)) {
      input.value = nextInputValue;
    }
  });
}

function syncUnitLinkedFieldHints() {
  syncFieldHint("keyWidth");
  syncFieldHint("keyDepth");
}

function queueUnitLinkedFieldHints() {
  queueFieldHintSync("keyWidth");
  queueFieldHintSync("keyDepth");
}

function syncAllLinkedSizeInputs() {
  Object.values(LINKED_SIZE_UNIT_FIELDS).forEach((primaryField) => {
    syncLinkedSizeInputs(primaryField);
  });
}

function queueAllLinkedSizeInputs() {
  Object.values(LINKED_SIZE_UNIT_FIELDS).forEach((primaryField) => {
    queueLinkedSizeInputSync(primaryField);
  });
}

function handleKeyUnitBasisInput(input, options = {}) {
  const { commit = false } = options;
  const nextValue = parseKeyUnitBasisInput(input);
  if (nextValue == null) {
    setKeyUnitBasisInputValidity(input, false);
    if (commit) {
      input.value = formatKeyUnitMmInputValue();
      setKeyUnitBasisInputValidity(input, true);
    }
    return;
  }

  state.keyUnitMm = sanitizeKeyUnitMm(nextValue);
  saveKeyUnitMmPreference(state.keyUnitMm);
  setKeyUnitBasisInputValidity(input, true);
  if (commit) {
    input.value = formatKeyUnitMmInputValue();
  }

  syncKeyUnitBasisInputs(input);
  syncKeyUnitBasisCopy();
  if (commit) {
    flushPendingFieldUiSync();
    syncUnitLinkedFieldHints();
    syncAllLinkedSizeInputs();
    return;
  }

  queueUnitLinkedFieldHints();
  queueAllLinkedSizeInputs();
}

function isTopEdgeHeightField(field) {
  return field === "topFrontHeight"
    || field === "topBackHeight"
    || field === "topLeftHeight"
    || field === "topRightHeight";
}

function applyTopEdgeHeightChange(field, value) {
  const geometry = resolveTopPlaneGeometry(state.keycapParams);
  const centerHeight = geometry.topCenterHeight;

  if (field === "topFrontHeight" && Math.abs(geometry.topFront) > 1e-6) {
    state.keycapParams.topPitchDeg = atanDeg((value - centerHeight) / geometry.topFront);
    return;
  }

  if (field === "topBackHeight" && Math.abs(geometry.topBack) > 1e-6) {
    state.keycapParams.topPitchDeg = atanDeg((value - centerHeight) / geometry.topBack);
    return;
  }

  if (field === "topLeftHeight" && Math.abs(geometry.topLeft) > 1e-6) {
    state.keycapParams.topRollDeg = atanDeg((value - centerHeight) / geometry.topLeft);
    return;
  }

  if (field === "topRightHeight" && Math.abs(geometry.topRight) > 1e-6) {
    state.keycapParams.topRollDeg = atanDeg((value - centerHeight) / geometry.topRight);
  }
}

function applyTopSurfaceShapePreset(surfaceShape) {
  const preset = getTopSurfaceShapePreset(surfaceShape);
  state.keycapParams.dishDepth = preset.dishDepth;
}

function applyTopHatSurfaceShapePreset(surfaceShape) {
  const preset = getTopSurfaceShapePreset(surfaceShape);
  state.keycapParams.topHatDishDepth = preset.dishDepth;
}

function findCornerRadiusFieldSetByIndividualField(fieldKey) {
  return CORNER_RADIUS_FIELD_SETS.find((fieldSet) => fieldSet.individualFieldKey === fieldKey);
}

function findCornerRadiusFieldSetBySharedField(fieldKey) {
  return CORNER_RADIUS_FIELD_SETS.find((fieldSet) => fieldSet.sharedFieldKey === fieldKey);
}

function getCornerRadiusRenderContextByIndividualField(fieldKey) {
  const fieldSet = findCornerRadiusFieldSetByIndividualField(fieldKey);
  if (!fieldSet) {
    return null;
  }

  const sharedFieldConfig = getFieldConfig(fieldSet.sharedFieldKey);
  return {
    fieldSet,
    controlOrder: sharedFieldConfig?.controlOrder ?? fieldSet.controlOrder,
    individualEnabled: Boolean(state.keycapParams[fieldSet.individualFieldKey]),
    toggleLabel: resolveDynamicCopy(getFieldConfig(fieldSet.individualFieldKey)?.label),
  };
}

function syncCornerRadiusFieldDom(fieldKey) {
  const context = getCornerRadiusRenderContextByIndividualField(fieldKey);
  if (!context) {
    return false;
  }

  const panel = app.querySelector(`[data-corner-radius-panel="${escapeCssIdentifier(context.fieldSet.individualFieldKey)}"]`);
  const controls = panel?.querySelector(`[data-corner-radius-controls="${escapeCssIdentifier(context.fieldSet.individualFieldKey)}"]`);
  const input = panel?.querySelector(`[data-field="${escapeCssIdentifier(context.fieldSet.individualFieldKey)}"]`);
  if (!(panel instanceof HTMLElement) || !(controls instanceof HTMLElement) || !(input instanceof HTMLInputElement)) {
    return false;
  }

  controls.outerHTML = renderCornerRadiusControls(
    context.fieldSet,
    context.controlOrder,
    context.individualEnabled,
  );
  input.checked = context.individualEnabled;
  input.setAttribute("aria-label", context.toggleLabel);
  input.parentElement?.querySelector(".corner-radius-toggle__label")?.replaceChildren(context.toggleLabel);
  return true;
}

function syncCornerRadiusFieldsToSharedValue(fieldSet) {
  const sharedRadius = Number(state.keycapParams[fieldSet.sharedFieldKey] ?? 0);
  fieldSet.fieldKeys.forEach((fieldKey) => {
    state.keycapParams[fieldKey] = sharedRadius;
  });
}

function handleFieldChange(event) {
  const field = event.currentTarget.dataset.field;
  const input = event.currentTarget;
  const deferPreview = event.deferPreview === true;
  const deferContinuousSync = event.deferContinuousSync === true && (input.type === "number" || input.type === "range");
  const fieldConfig = getFieldConfig(field);
  const previousStemType = resolveStemType(state.keycapParams);
  if (!field || !input) {
    return;
  }

  if (field in LINKED_SIZE_UNIT_FIELDS) {
    const nextValue = parseNumericInputValue(input, field, fieldConfig);
    if (nextValue == null) {
      return;
    }

    state.keycapParams[LINKED_SIZE_UNIT_FIELDS[field]] = nextValue * getKeyUnitMm();
    if (deferContinuousSync) {
      queueLinkedSizeInputSync(field);
    } else {
      syncLinkedSizeInputs(field);
    }
  } else if (input.type === "checkbox") {
    state.keycapParams[field] = input.checked;
    if (
      field === "topHatSeparateColorEnabled"
      && input.checked
      && getColorFieldValue("topHatColor") === DEFAULT_KEYCAP_COLORS.topHatColor
    ) {
      state.keycapParams.topHatColor = getColorFieldValue("bodyColor");
    }
    const cornerRadiusFieldSet = findCornerRadiusFieldSetByIndividualField(field);
    if (cornerRadiusFieldSet) {
      syncCornerRadiusFieldsToSharedValue(cornerRadiusFieldSet);
    }
  } else if (input.tagName === "SELECT") {
    if (field === "shapeProfile") {
      applyShapeProfileParams(input.value);
    } else {
      state.keycapParams[field] = input.value;
      if (field === "stemType") {
        state.keycapParams.stemCrossMargin = resolveStemCrossMarginAfterStemTypeChange(
          input.value,
          state.keycapParams.stemCrossMargin,
          previousStemType,
        );
      }
      if (field === "topSurfaceShape") {
        applyTopSurfaceShapePreset(input.value);
      } else if (field === "topHatSurfaceShape") {
        applyTopHatSurfaceShapePreset(input.value);
      }
      if (isLegendFieldWithSuffix(field, LEGEND_FIELD_SUFFIXES.contentType)) {
        state.legendFontPickerFieldKey = "";
        state.legendFontPickerQuery = "";
        state.legendIconPickerFieldKey = "";
        state.legendIconPickerQuery = "";
      } else if (isLegendFieldWithSuffix(field, LEGEND_FIELD_SUFFIXES.iconSet)) {
        const legendPrefix = findLegendParamPrefixByFieldKey(field, LEGEND_FIELD_SUFFIXES.iconSet);
        const iconNameKey = legendPrefix ? legendParamKey(legendPrefix, LEGEND_FIELD_SUFFIXES.iconName) : "legendIconName";
        const iconFillKey = legendPrefix ? legendParamKey(legendPrefix, LEGEND_FIELD_SUFFIXES.iconFill) : "legendIconFill";
        state.keycapParams[field] = resolveLegendIconSet(input.value);
        state.keycapParams[iconNameKey] = resolveLegendIconName(state.keycapParams[iconNameKey], state.keycapParams[field]);
        state.keycapParams[iconFillKey] = isLegendIconFillAvailable(state.keycapParams[iconNameKey], state.keycapParams[field])
          ? Boolean(state.keycapParams[iconFillKey])
          : false;
        state.legendIconPickerQuery = "";
      }
    }
  } else if (input.type === "radio") {
    if (!input.checked) {
      return;
    }
    state.keycapParams[field] = input.value;
  } else if (fieldConfig?.type === "color") {
    const normalizedColor = normalizeHexColor(input.value);
    if (!normalizedColor) {
      setColorInputValidity(input, false);
      return;
    }

    state.keycapParams[field] = normalizedColor;
    input.value = normalizedColor;
    setColorInputValidity(input, true);
    syncColorChip(field, normalizedColor);
  } else if (input.type === "text") {
    state.keycapParams[field] = input.value;
  } else {
    const nextValue = parseNumericInputValue(input, field, fieldConfig);
    if (nextValue == null) {
      return;
    }

    if (isTopEdgeHeightField(field)) {
      applyTopEdgeHeightChange(field, nextValue);
    } else {
      state.keycapParams[field] = nextValue;
      const cornerRadiusFieldSet = findCornerRadiusFieldSetBySharedField(field);
      if (cornerRadiusFieldSet && !state.keycapParams[cornerRadiusFieldSet.individualFieldKey]) {
        syncCornerRadiusFieldsToSharedValue(cornerRadiusFieldSet);
      }
    }

    if (Object.values(LINKED_SIZE_UNIT_FIELDS).includes(field)) {
      if (deferContinuousSync) {
        queueLinkedSizeInputSync(field);
      } else {
        syncLinkedSizeInputs(field);
      }
    }
  }

  syncDerivedKeycapParams(state.keycapParams);
  if (deferContinuousSync) {
    scheduleActiveProjectKeycapSync();
  } else {
    syncActiveProjectKeycapFromCurrent();
  }
  const changedPrimaryField = LINKED_SIZE_UNIT_FIELDS[field] ?? field;
  if (field in LINKED_SIZE_UNIT_FIELDS || Object.values(LINKED_SIZE_UNIT_FIELDS).includes(field)) {
    if (deferContinuousSync) {
      queueLinkedSizeInputSync(field);
    } else {
      syncLinkedSizeInputs(field);
    }
  } else if (input.type === "number" || input.type === "range") {
    if (deferContinuousSync) {
      queueFieldInputSync(field, field);
    } else {
      syncFieldInputs(field, field);
    }
  }

  if (
    TOP_LIVE_FIELD_KEYS.has(field)
    || TOP_LIVE_FIELD_KEYS.has(changedPrimaryField)
    || changedPrimaryField === "topScale"
    || changedPrimaryField === "keyWidth"
    || changedPrimaryField === "keyDepth"
    || changedPrimaryField === "jisEnterNotchWidth"
    || changedPrimaryField === "jisEnterNotchDepth"
  ) {
    if (deferContinuousSync) {
      queueVisibleTopFieldStateSync(field);
    } else {
      syncVisibleTopFieldState(field);
    }
  }

  if (input.type === "checkbox" && !CORNER_RADIUS_INDIVIDUAL_FIELD_KEYS.has(field)) {
    syncCheckboxToggleDom(input);
  }

  state.editorStatus = "dirty";
  state.editorSummary = t("status.dirty");

  const shouldRenderInspector = TOP_LEGEND_CONFIGS.some((config) => field === legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled))
    || SIDE_LEGEND_CONFIGS.some((config) => field === legendParamKey(config.paramPrefix, LEGEND_FIELD_SUFFIXES.enabled))
    || isLegendFieldWithSuffix(field, LEGEND_FIELD_SUFFIXES.contentType)
    || isLegendFieldWithSuffix(field, LEGEND_FIELD_SUFFIXES.iconSet)
    || isLegendFieldWithSuffix(field, LEGEND_FIELD_SUFFIXES.iconFill)
    || field === "homingBarEnabled"
    || field === "rimEnabled"
    || field === "topHatEnabled"
    || field === "topHatSeparateColorEnabled"
    || field === "topHatHeight"
    || field === "topSurfaceShape"
    || field === "topHatSurfaceShape"
    || field === "topSlopeInputMode"
    || EDITOR_SELECTOR_KEYS.includes(field);

  if (CORNER_RADIUS_INDIVIDUAL_FIELD_KEYS.has(field)) {
    if (!syncCornerRadiusFieldDom(field)) {
      render({ animateInspector: input.type !== "checkbox" });
    }
  } else if (shouldRenderInspector) {
    render({ animateInspector: input.type !== "checkbox" });
  }

  if (field === "dishDepth") {
    syncOrQueueFieldHint("topCenterHeight", {}, deferContinuousSync);
  }

  if (changedPrimaryField === "keyWidth") {
    syncOrQueueFieldHint("jisEnterNotchWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("typewriterCornerRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topCornerRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("keycapEdgeRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("keycapShoulderRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topOffsetX", {}, deferContinuousSync);
    syncOrQueueFieldHint("rimWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatInset", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatDishDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatShoulderRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("homingBarLength", {}, deferContinuousSync);
    syncOrQueueLegendFieldHintsBySuffix(LEGEND_FIELD_SUFFIXES.size, deferContinuousSync);
    syncOrQueueLegendFieldHintsBySuffix(LEGEND_FIELD_SUFFIXES.offsetX, deferContinuousSync);
  }

  if (changedPrimaryField === "keyDepth") {
    syncOrQueueFieldHint("jisEnterNotchDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("typewriterCornerRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topCornerRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("keycapEdgeRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("keycapShoulderRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topOffsetY", {}, deferContinuousSync);
    syncOrQueueFieldHint("rimWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatInset", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatDishDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatShoulderRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("homingBarOffsetY", {}, deferContinuousSync);
    syncOrQueueLegendFieldHintsBySuffix(LEGEND_FIELD_SUFFIXES.size, deferContinuousSync);
    syncOrQueueLegendFieldHintsBySuffix(LEGEND_FIELD_SUFFIXES.offsetY, deferContinuousSync);
  }

  if (field === "homingBarWidth" || field === "homingBarHeight") {
    syncOrQueueFieldHint("homingBarChamfer", {}, deferContinuousSync);
  }

  if (changedPrimaryField === "jisEnterNotchWidth" || changedPrimaryField === "jisEnterNotchDepth") {
    syncOrQueueFieldHint("typewriterCornerRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("rimWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatInset", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatDishDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatHeight", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatShoulderRadius", {}, deferContinuousSync);
  }

  if (
    changedPrimaryField === "topScale"
    || changedPrimaryField === "topHatTopWidth"
    || changedPrimaryField === "topHatTopDepth"
    || changedPrimaryField === "topHatBottomWidth"
    || changedPrimaryField === "topHatBottomDepth"
    || changedPrimaryField === "topHatInset"
    || changedPrimaryField === "topHatShoulderAngle"
  ) {
    syncOrQueueFieldHint("topCornerRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("keycapEdgeRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("keycapShoulderRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomWidth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatInset", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatDishDepth", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatTopRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatBottomRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatHeight", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatShoulderRadius", {}, deferContinuousSync);
  }

  if (field === "topHatHeight") {
    syncOrQueueFieldHint("topHatBottomRadius", {}, deferContinuousSync);
    syncOrQueueFieldHint("topHatShoulderRadius", {}, deferContinuousSync);
  }

  if (field === "topHatSurfaceShape") {
    syncOrQueueFieldHint("topHatDishDepth", {}, deferContinuousSync);
  }

  if (!deferPreview && field !== "topSlopeInputMode") {
    schedulePreviewRefresh();
  }
}

async function openColorPicker(fieldKey) {
  const input = app.querySelector(`[data-field="${fieldKey}"]`);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const normalizedColor = normalizeHexColor(input.value) ?? getColorFieldValue(fieldKey);
  input.value = normalizedColor;
  setColorInputValidity(input, true);
  syncColorChip(fieldKey, normalizedColor);

  try {
    await ensureColorisLoaded();
  } catch (error) {
    console.warn(error);
  }

  input.focus();
  input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

function syncLinkedSizeInputs(changedField) {
  const changedPrimaryField = LINKED_SIZE_UNIT_FIELDS[changedField] ?? changedField;
  const changedUnitField = Object.entries(LINKED_SIZE_UNIT_FIELDS)
    .find(([, primaryField]) => primaryField === changedPrimaryField)?.[0];
  const primaryFieldConfig = getFieldConfig(changedPrimaryField);
  const primaryInputs = app.querySelectorAll(`[data-field="${changedPrimaryField}"]`);
  const unitInput = changedUnitField ? app.querySelector(`[data-field="${changedUnitField}"]`) : null;
  const activeInput = document.activeElement;

  primaryInputs.forEach((primaryInput) => {
    const sliderAttributes = primaryInput.type === "range" ? resolveFieldSliderAttributes(primaryFieldConfig) : null;
    const syncedPrimaryValue = formatFieldInputValue(
      primaryInput,
      changedPrimaryField,
      state.keycapParams[changedPrimaryField],
      primaryFieldConfig,
    );

    syncFieldInputConstraints(primaryInput, primaryFieldConfig);
    syncFieldSliderVisualState(primaryInput, changedPrimaryField, primaryFieldConfig, sliderAttributes);

    if (
      changedField !== changedPrimaryField
      || primaryInput !== activeInput
      || !isInputNumericallySynced(primaryInput, syncedPrimaryValue)
    ) {
      primaryInput.value = syncedPrimaryValue;
    }
  });

  if (!unitInput) {
    syncKeyUnitBasisCopy();
    return;
  }

  syncFieldConstraintAttribute(unitInput, "min", resolveFieldAttribute(primaryFieldConfig?.secondaryMin));
  syncFieldConstraintAttribute(unitInput, "step", resolveFieldAttribute(primaryFieldConfig?.secondaryStep));

  const syncedUnitValue = formatUnitInputValue(state.keycapParams[changedPrimaryField]);
  if (changedField === changedPrimaryField || !isInputNumericallySynced(unitInput, syncedUnitValue)) {
    unitInput.value = syncedUnitValue;
  }

  syncKeyUnitBasisCopy();
}

function schedulePreviewRefresh(options = {}) {
  const { refreshActiveProjectPreview = true } = options;
  window.clearTimeout(previewDebounceTimer);
  previewDebounceTimer = window.setTimeout(() => {
    executeKeycapPreview({ silent: true, refreshActiveProjectPreview });
  }, 450);
}

async function renderPreviewViewer() {
  if (disposePreviewScene) {
    previewViewState = disposePreviewScene.captureViewState();
    disposePreviewScene.dispose();
    disposePreviewScene = null;
  }

  const container = app.querySelector("[data-preview-stage]");
  if (!container) {
    return;
  }

  if (state.previewLayers.length === 0) {
    container.innerHTML = `
      <div class="preview-placeholder">
        ${t("preview.placeholder")}
      </div>
    `;
    return;
  }

  previewSceneModulePromise ??= import("./lib/preview-scene.js");
  const { mountPreviewScene } = await previewSceneModulePromise;
  if (!container.isConnected || state.previewLayers.length === 0) {
    return;
  }

  disposePreviewScene = mountPreviewScene(container, state.previewLayers, {
    initialViewState: previewViewState,
  });
}

function createColorLayerJob({ name, exportTarget, outputPath, colorFieldKey, params = state.keycapParams }) {
  return {
    name,
    exportTarget,
    outputPath,
    colorHex: getColorFieldValue(colorFieldKey, params),
    color: getColorFieldNumber(colorFieldKey, params),
  };
}

function isTopHatSeparateRenderable(params = state.keycapParams) {
  return Boolean(params.topHatEnabled)
    && Boolean(params.topHatSeparateColorEnabled)
    && Number(params.topHatHeight ?? 0) > 0;
}

function createKeycapOffJobs(purpose, params = state.keycapParams) {
  if (purpose === "preview" || purpose === "3mf") {
    const colorLayerJobs = [
      createColorLayerJob({
        name: "body",
        exportTarget: "body_core",
        outputPath: keycapBodyPreviewPath,
        colorFieldKey: "bodyColor",
        params,
      }),
      ...(isTopHatSeparateRenderable(params)
        ? [
            createColorLayerJob({
              name: "top-hat",
              exportTarget: "top_hat",
              outputPath: keycapTopHatPreviewPath,
              colorFieldKey: "topHatColor",
              params,
            }),
          ]
        : []),
      ...(isTypewriterRimRenderable(params)
        ? [
            createColorLayerJob({
              name: "rim",
              exportTarget: "rim",
              outputPath: keycapRimPreviewPath,
              colorFieldKey: "rimColor",
              params,
            }),
          ]
        : []),
      ...(params.homingBarEnabled
        ? [
            createColorLayerJob({
              name: "homing",
              exportTarget: "homing",
              outputPath: keycapHomingPreviewPath,
              colorFieldKey: "homingBarColor",
              params,
            }),
          ]
        : []),
      ...TOP_LEGEND_CONFIGS
        .filter((config) => isTopLegendRenderable(config, params))
        .map((config) => createColorLayerJob({
          name: config.partName,
          exportTarget: config.exportTarget,
          outputPath: config.outputPath,
          colorFieldKey: config.colorFieldKey,
          params,
        })),
      ...SIDE_LEGEND_CONFIGS
        .filter((config) => isSideLegendRenderable(config, params))
        .map((config) => createColorLayerJob({
          name: `legend-${config.side}`,
          exportTarget: config.exportTarget,
          outputPath: config.outputPath,
          colorFieldKey: config.colorFieldKey,
          params,
        })),
    ];

    return colorLayerJobs;
  }

  throw new Error(t("errors.unsupportedOffPurpose", { purpose }));
}

async function runKeycapOffJobs(jobs, params = state.keycapParams) {
  const outputs = [];

  for (const job of jobs) {
    const result = await runOpenScad({
      files: await createKeycapFiles({
        params,
        exportTarget: job.exportTarget,
      }),
      args: buildKeycapArgs({
        outputPath: job.outputPath,
        outputFormat: "off",
      }),
      outputPaths: [job.outputPath],
    });

    const [output] = result.outputs;
    outputs.push({
      ...job,
      result,
      mesh: parseOff(textDecoder.decode(output.bytes)),
    });
  }

  return outputs;
}

async function executeKeycapPreview(options = {}) {
  const { silent = false, refreshActiveProjectPreview = false } = options;
  const requestId = ++latestPreviewRequestId;
  const previewParams = { ...state.keycapParams };
  let didGeneratePreview = false;

  state.editorStatus = "running";
  state.editorSummary = t("preview.running");
  if (!silent) {
    state.editorLogs = [];
    state.editorError = "";
  }

  try {
    const previewResults = await runKeycapOffJobs(createKeycapOffJobs("preview", previewParams), previewParams);
    const referenceLayer = resolveStemType(previewParams) === "j_stem_lp01"
      ? await createJStemLp01ReferencePreviewLayer(previewParams)
      : null;
    if (requestId !== latestPreviewRequestId) {
      return;
    }

    const previewEntries = referenceLayer
      ? [...previewResults, referenceLayer]
      : previewResults;
    const totalElapsedMs = previewResults.reduce((sum, entry) => sum + entry.result.elapsedMs, 0);
    const totalVertices = previewEntries.reduce((sum, entry) => sum + entry.mesh.vertices.length, 0);
    const totalFaces = previewEntries.reduce((sum, entry) => sum + entry.mesh.faces.length, 0);
    const visiblePartLabels = describePartLabels(previewEntries.map((entry) => entry.name));
    state.editorStatus = "success";
    state.editorSummary = t("preview.summary", {
      elapsedMs: Math.round(totalElapsedMs),
      objectCount: previewEntries.length,
      vertexCount: totalVertices,
      faceCount: totalFaces,
    });
    state.editorLogs = previewResults.flatMap((entry) =>
      entry.result.logs.map((log) => `[${entry.name}/${log.stream}] ${log.text}`),
    );
    state.editorError = previewEntries.length > 1
      ? t("preview.successMultiple", { parts: visiblePartLabels })
      : t("preview.successSingle", { parts: visiblePartLabels });
    state.previewLayers = previewEntries.map((entry) => ({
      name: entry.name,
      color: entry.color,
      opacity: entry.opacity,
      mesh: entry.mesh,
    }));
    didGeneratePreview = true;
  } catch (error) {
    if (requestId !== latestPreviewRequestId) {
      return;
    }

    state.editorStatus = "error";
    state.editorSummary = t("preview.failed");
    state.editorLogs = [];
    state.editorError = `${error}`;
    state.previewLayers = [];
  }

  await renderPreviewViewer();
  if (didGeneratePreview && refreshActiveProjectPreview) {
    refreshActiveProjectKeycapPreviewFromCurrent();
  }
}

async function executeExport(format, options = {}) {
  const {
    params = state.keycapParams,
    editorDataPayload = null,
    closeOverlayOnSuccess = false,
  } = options;
  state.exportsStatus = "running";
  state.exportsSummary = t("importExport.preparing");
  render();

  let didSucceed = false;
  try {
    if (format === "editor-data") {
      const startedAt = performance.now();
      const payload = editorDataPayload ?? createEditorDataPayload(params);
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      downloadBlob(blob, buildEditorDataFilename(payload.params));
      setExportStatus(
        "success",
        t("importExport.savedEditorData", { byteLength: blob.size }),
        {
          format,
          label: t("importExport.editorDataLabel"),
          elapsedMs: Math.round(performance.now() - startedAt),
          byteLength: blob.size,
          notes: t("importExport.editorDataNote"),
        },
      );
    } else if (format === "3mf") {
      const { blob, offResults } = await create3mfExportBlob(params);
      const savedPartLabels = describePartLabels(offResults.map((entry) => entry.name));
      downloadBlob(blob, build3mfFilename(params));

      setExportStatus(
        "success",
        t("importExport.savedThreeMf", { byteLength: blob.size, partCount: offResults.length }),
        {
          format,
          label: t("importExport.threeMfLabel"),
          elapsedMs: Math.round(offResults.reduce((sum, entry) => sum + entry.result.elapsedMs, 0)),
          byteLength: blob.size,
          notes: t("importExport.threeMfNote", { parts: savedPartLabels }),
        },
      );
    } else if (format === "step") {
      const { blob, result, mesh } = await createStepExportBlob(params);
      downloadBlob(blob, buildStepFilename(params));

      setExportStatus(
        "success",
        t("importExport.savedStep", { byteLength: blob.size }),
        {
          format,
          label: t("importExport.stepLabel"),
          elapsedMs: Math.round(result.elapsedMs),
          byteLength: blob.size,
          notes: t("importExport.stepNote", { faceCount: mesh.faces.length }),
        },
      );
    } else if (format === "stl") {
      const result = await runOpenScad({
        files: await createKeycapFiles({
          params,
          exportTarget: "single_material_shape",
        }),
        args: buildKeycapArgs({
          outputPath: keycapStlExportPath,
          outputFormat: "stl",
        }),
        outputPaths: [keycapStlExportPath],
      });
      const [output] = result.outputs;
      const blob = new Blob([output.bytes], { type: "model/stl" });
      downloadBlob(blob, buildStlFilename(params));

      setExportStatus(
        "success",
        t("importExport.savedStl", { byteLength: blob.size }),
        {
          format,
          label: t("importExport.stlLabel"),
          elapsedMs: Math.round(result.elapsedMs),
          byteLength: blob.size,
          notes: t("importExport.stlNote"),
        },
      );
    } else {
      throw new Error(t("importExport.unsupportedExport", { format }));
    }

    didSucceed = true;
  } catch (error) {
    setExportStatus(
      "error",
      t("importExport.saveFailed"),
      {
        format,
        label: t("importExport.saveFailedLabel"),
        elapsedMs: 0,
        byteLength: 0,
        notes: `${error}`,
      },
    );
  }

  if (didSucceed && closeOverlayOnSuccess) {
    state.keycapExportOverlayKeycapId = "";
  }

  render();
}

syncVisualViewportMetrics();
render();

initializeLegendIconProvidersFromCdn()
  .then((result) => {
    if (result?.status === "loaded" && result.isCdnActive) {
      render();
      executeKeycapPreview({ silent: true, refreshActiveProjectPreview: true });
    } else if (result?.error) {
      console.warn(result.error);
    }
  })
  .catch((error) => {
    console.warn(error);
  });

window.addEventListener("resize", handleViewportResize);
window.visualViewport?.addEventListener("resize", handleViewportResize);
window.visualViewport?.addEventListener("scroll", handleViewportResize, { passive: true });
window.addEventListener("pointerdown", handleWindowPointerDown, true);
window.addEventListener("keydown", handleWindowKeydown);

if (typeof themePreferenceQuery?.addEventListener === "function") {
  themePreferenceQuery.addEventListener("change", handleSystemThemeChange);
} else if (typeof themePreferenceQuery?.addListener === "function") {
  themePreferenceQuery.addListener(handleSystemThemeChange);
}

executeKeycapPreview({ silent: true, refreshActiveProjectPreview: true });

ensureColorisLoaded().catch((error) => {
  console.warn(error);
});
