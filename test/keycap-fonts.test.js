import test from "node:test";
import assert from "node:assert/strict";
import {
  clearUserKeycapLegendFonts,
  getUserKeycapLegendFontBytes,
  KEYCAP_LEGEND_FONTS,
  listAvailableKeycapLegendFonts,
  parseKeycapLegendFontNameMetadata,
  registerUserKeycapLegendFont,
  removeUserKeycapLegendFont,
  resolveKeycapLegendFont,
  USER_KEYCAP_LEGEND_FONT_KEY_PREFIX,
} from "../src/lib/keycap-fonts.js";

const EXPECTED_LANDING_PAGE_URLS = Object.freeze({
  "mplus1-variable": "https://fonts.google.com/specimen/M%2BPLUS%2B1",
  "mplus1p-regular": "https://fonts.google.com/specimen/M%2BPLUS%2B1p",
  "noto-sans-variable": "https://fonts.google.com/noto/specimen/Noto%2BSans",
  "noto-sans-jp-variable": "https://fonts.google.com/noto/specimen/Noto%2BSans%2BJP",
  "mplusrounded1c-regular": "https://fonts.google.com/specimen/M%2BPLUS%2BRounded%2B1c",
  "dotgothic16-regular": "https://fonts.google.com/specimen/DotGothic16",
  "kurobara-cinderella-regular": "https://modi.jpn.org/font_kurobara-cinderella.php",
  "bangers-regular": "https://fonts.google.com/specimen/Bangers",
  "creepster-regular": "https://fonts.google.com/specimen/Creepster",
  "rye-regular": "https://fonts.google.com/specimen/Rye",
  "orbitron-regular": "https://fonts.google.com/specimen/Orbitron",
  "grenzegotisch-regular": "https://fonts.google.com/specimen/Grenze%2BGotisch",
  "medievalsharp-regular": "https://fonts.google.com/specimen/MedievalSharp",
});

const GOOGLE_FONTS_FAVICON_URL = "https://www.gstatic.com/images/icons/material/apps/fonts/1x/catalog/v5/favicon.svg";
const MODI_FAVICON_URL = "https://modi.jpn.org/favicon.ico";

const EXPECTED_LANDING_PAGE_NAMES = Object.freeze({
  "mplus1-variable": "M PLUS 1 - Google Fonts",
  "mplus1p-regular": "M PLUS 1p - Google Fonts",
  "noto-sans-variable": "Noto Sans - Google Fonts",
  "noto-sans-jp-variable": "Noto Sans JP - Google Fonts",
  "mplusrounded1c-regular": "M PLUS Rounded 1c - Google Fonts",
  "dotgothic16-regular": "DotGothic16 - Google Fonts",
  "kurobara-cinderella-regular": "黒薔薇シンデレラ - MODI工場",
  "bangers-regular": "Bangers - Google Fonts",
  "creepster-regular": "Creepster - Google Fonts",
  "rye-regular": "Rye - Google Fonts",
  "orbitron-regular": "Orbitron - Google Fonts",
  "grenzegotisch-regular": "Grenze Gotisch - Google Fonts",
  "medievalsharp-regular": "MedievalSharp - Google Fonts",
});

const EXPECTED_LANDING_PAGE_ICON_URLS = Object.freeze({
  ...Object.fromEntries(Object.keys(EXPECTED_LANDING_PAGE_URLS).map((key) => [key, GOOGLE_FONTS_FAVICON_URL])),
  "kurobara-cinderella-regular": MODI_FAVICON_URL,
});

test("print fonts have user-facing legend-plate display information", () => {
  assert.equal(KEYCAP_LEGEND_FONTS.length, Object.keys(EXPECTED_LANDING_PAGE_URLS).length);

  for (const font of KEYCAP_LEGEND_FONTS) {
    assert.equal(font.landingPageUrl, EXPECTED_LANDING_PAGE_URLS[font.key], `${font.key} landing page URL`);
    assert.equal(font.landingPageName, EXPECTED_LANDING_PAGE_NAMES[font.key], `${font.key} landing page name`);
    assert.equal(font.landingPageIconUrl, EXPECTED_LANDING_PAGE_ICON_URLS[font.key], `${font.key} landing page icon URL`);
    assert.equal(new URL(font.landingPageUrl).protocol, "https:");
    assert.equal(new URL(font.landingPageIconUrl).protocol, "https:");
  }
});

test("user-added fonts are added to the registry separately from the built-in fonts", () => {
  clearUserKeycapLegendFonts();
  const key = `${USER_KEYCAP_LEGEND_FONT_KEY_PREFIX}0123456789abcdef`;
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const font = registerUserKeycapLegendFont({
    key,
    label: "Local Test Regular",
    fontName: "Local Test",
    fontQuery: "Local Test",
    fileName: "LocalTest-Regular.ttf",
    bytes,
    runtimePath: "/fonts/user/0123456789abcdef.ttf",
  });

  assert.equal(font.key, key);
  assert.equal(font.isUserFont, true);
  assert.equal(resolveKeycapLegendFont(key), font);
  assert.equal(getUserKeycapLegendFontBytes(key), bytes);
  assert.equal(listAvailableKeycapLegendFonts()[0], font);
  assert.equal(KEYCAP_LEGEND_FONTS.length, Object.keys(EXPECTED_LANDING_PAGE_URLS).length);

  assert.equal(removeUserKeycapLegendFont(key), true);
  assert.equal(resolveKeycapLegendFont(key).isMissing, true);
  clearUserKeycapLegendFonts();
});

test("an unknown user-font key resolves as an unloaded font", () => {
  clearUserKeycapLegendFonts();
  const missing = resolveKeycapLegendFont(`${USER_KEYCAP_LEGEND_FONT_KEY_PREFIX}missing`);

  assert.equal(missing.isUserFont, true);
  assert.equal(missing.isMissing, true);
  assert.equal(missing.key, `${USER_KEYCAP_LEGEND_FONT_KEY_PREFIX}missing`);
});

test("returns empty name metadata for invalid font bytes", () => {
  assert.deepEqual(parseKeycapLegendFontNameMetadata(new Uint8Array([0, 1, 2])), {});
});
