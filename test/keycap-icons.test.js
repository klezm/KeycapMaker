import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as fontAwesomeIcons from "@fortawesome/free-solid-svg-icons";

import {
  KEYCAP_RECOMMENDED_LEGEND_ICON_NAMES,
  buildLegendIconSvg,
  getLegendIconRuntimePath,
  isLegendIconFillAvailable,
  inferLegendIconFillFromName,
  isLegendIconFillSupported,
  listLegendIconSets,
  listAvailableLegendIcons,
  listRecommendedLegendIcons,
  resolveLegendIcon,
  resolveLegendIconFill,
  resolveLegendIconName,
  sanitizeLucideSvgNodes,
  searchLegendIcons,
} from "../src/lib/keycap-icons.js";
import fontAwesomeSolidIconSet from "../src/data/icon-sets/font-awesome-solid-icons.js";
import materialSymbolsIconSet from "../src/data/icon-sets/material-symbols-base.js";
import remixIconPathSet from "../src/data/icon-sets/remix-icon-paths.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function collectFiles(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath, predicate));
    } else if (predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function extractSvgPathData(svg) {
  return [...svg.matchAll(/<path\b[^>]*\sd=(["'])(.*?)\1[^>]*>/g)].map((match) => match[2]);
}

function parsePolygonPoints(pathData) {
  return [...String(pathData ?? "").matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function cross(a, b, c) {
  return ((b.x - a.x) * (c.y - a.y)) - ((b.y - a.y) * (c.x - a.x));
}

function isSamePoint(a, b) {
  return Math.abs(a.x - b.x) < 0.00001 && Math.abs(a.y - b.y) < 0.00001;
}

function isPointOnSegment(a, b, p) {
  return Math.abs(cross(a, b, p)) < 0.00001
    && p.x >= Math.min(a.x, b.x) - 0.00001
    && p.x <= Math.max(a.x, b.x) + 0.00001
    && p.y >= Math.min(a.y, b.y) - 0.00001
    && p.y <= Math.max(a.y, b.y) + 0.00001;
}

function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);

  if (abC * abD < -0.00001 && cdA * cdB < -0.00001) {
    return true;
  }

  return isPointOnSegment(a, b, c)
    || isPointOnSegment(a, b, d)
    || isPointOnSegment(c, d, a)
    || isPointOnSegment(c, d, b);
}

function hasSelfIntersection(points) {
  const segments = points.map((point, index) => [point, points[(index + 1) % points.length]]);
  for (let index = 0; index < segments.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < segments.length; otherIndex += 1) {
      const [a, b] = segments[index];
      const [c, d] = segments[otherIndex];
      const adjacent = Math.abs(index - otherIndex) === 1 || (index === 0 && otherIndex === segments.length - 1);
      if (adjacent || isSamePoint(a, c) || isSamePoint(a, d) || isSamePoint(b, c) || isSamePoint(b, d)) {
        continue;
      }
      if (segmentsIntersect(a, b, c, d)) {
        return true;
      }
    }
  }
  return false;
}

test("Icon picker initial list displays keycap candidates", () => {
  const recommendedIcons = listRecommendedLegendIcons();

  assert.equal(recommendedIcons[0]?.name, "arrow-up");
  assert.equal(recommendedIcons[1]?.name, "arrow-down");
  assert.equal(recommendedIcons.at(-1)?.name, "ampersand");
  assert.equal(recommendedIcons.length, KEYCAP_RECOMMENDED_LEGEND_ICON_NAMES.length);
  assert.equal(new Set(recommendedIcons.map((icon) => icon.name)).size, recommendedIcons.length);
});

test("During search, Lucide icons not in initial candidates are also shown as options", () => {
  const defaultResults = searchLegendIcons("", "lucide", 96).map((icon) => icon.name);
  const searchResults = searchLegendIcons("file-volume", "lucide", 96).map((icon) => icon.name);

  assert.equal(defaultResults.includes("file-volume"), false);
  assert.ok(searchResults.includes("file-volume"));
});

test("Lucide icon generates SVG for model from sanitized nodes", () => {
  const lucideIcons = listAvailableLegendIcons("lucide");

  assert.ok(lucideIcons.length >= 1700);
  assert.equal(lucideIcons.filter((icon) => !Array.isArray(icon.node) || icon.node.length === 0).length, 0);

  const powerSvg = buildLegendIconSvg(resolveLegendIcon("power", "lucide"));
  assert.match(powerSvg, /^<svg\b/);
  assert.match(powerSvg, /<path\b/);
  assert.doesNotMatch(powerSvg, /stroke-width=|<circle|\skey=|onload=|<script/);
  assert.doesNotMatch(powerSvg, /c-0\.14794|0,0 0,0|c0,0/);
});

test("Each icon set generates SVG for model in common body format", () => {
  listLegendIconSets().forEach((iconSet) => {
    const icons = listAvailableLegendIcons(iconSet.key);
    assert.ok(icons.length > 0, `${iconSet.key} should have icons`);
    if (iconSet.key === "lucide") {
      assert.equal(icons.filter((icon) => !Array.isArray(icon.node) || icon.node.length === 0).length, 0, `${iconSet.key} should have SVG nodes`);
    } else {
      assert.equal(icons.filter((icon) => !icon.body).length, 0, `${iconSet.key} should have SVG bodies`);
    }
    assert.equal(icons.filter((icon) => "paths" in icon || "svgPathData" in icon).length, 0, `${iconSet.key} should not expose set-specific path fields`);
  });
});

test("Lucide SVG node drops dangerous elements and attributes via sanitizer", () => {
  const sanitizedNodes = sanitizeLucideSvgNodes([
    ["script", { href: "https://example.invalid/icon.js" }],
    ["path", {
      d: "M2 2h20",
      key: "unsafe-key",
      onload: "alert(1)",
      style: "stroke:red",
      "stroke-width": "2",
    }],
  ]);

  assert.deepEqual(sanitizedNodes, [
    ["path", {
      d: "M2 2h20",
      "stroke-width": "2",
    }],
  ]);

  const svg = buildLegendIconSvg({
    iconSet: "lucide",
    name: "unsafe-test",
    size: 24,
    node: sanitizedNodes,
  });
  assert.match(svg, /<path\b/);
  assert.doesNotMatch(svg, /script|onload|style=|\skey=|stroke-width=/);
});

test("Lucide stroke-to-fill prevents self-intersection of round cap paths", () => {
  const svg = buildLegendIconSvg(resolveLegendIcon("corner-down-right", "lucide"));
  const pathDataList = extractSvgPathData(svg);
  const selfIntersectingPaths = pathDataList.filter((pathData) => hasSelfIntersection(parsePolygonPoints(pathData)));

  assert.equal(selfIntersectingPaths.length, 0);
});

test("Material Symbols model body uses original Iconify data Outlined FILL=0 shape", async () => {
  const original = JSON.parse(await readFile(
    path.join(PROJECT_ROOT, "node_modules/@iconify-json/material-symbols/icons.json"),
    "utf8",
  ));
  const mismatches = [];

  Object.entries(materialSymbolsIconSet.icons ?? {}).forEach(([name, definition]) => {
    const originalDefinition = original.icons?.[name];
    if (!originalDefinition) {
      mismatches.push(`${name}: missing`);
      return;
    }

    const shapeDefinition = original.icons?.[`${name}-outline`] ?? originalDefinition;
    const generatedWidth = definition.width ?? materialSymbolsIconSet.width;
    const generatedHeight = definition.height ?? materialSymbolsIconSet.height;
    const originalWidth = shapeDefinition.width ?? original.width;
    const originalHeight = shapeDefinition.height ?? original.height;
    if (
      definition.body !== shapeDefinition.body
      || generatedWidth !== originalWidth
      || generatedHeight !== originalHeight
    ) {
      mismatches.push(`${name}: mismatch`);
    }
  });

  assert.equal(materialSymbolsIconSet.icons.circle.body, original.icons["circle-outline"].body);
  assert.equal(materialSymbolsIconSet.icons.circle.filledBody, original.icons.circle.body);
  assert.deepEqual(mismatches, []);
});

test("Supported icon sets resolve provider-specific entity name and SVG shape from common fill bool", () => {
  assert.equal(isLegendIconFillSupported("lucide"), false);
  assert.equal(isLegendIconFillSupported("font-awesome"), false);
  assert.equal(isLegendIconFillSupported("material-symbols"), true);
  assert.equal(isLegendIconFillSupported("remix-icon"), true);
  assert.equal(isLegendIconFillAvailable("circle", "material-symbols"), true);
  assert.equal(isLegendIconFillAvailable("arrow-forward", "material-symbols"), false);
  assert.equal(isLegendIconFillAvailable("circle-line", "remix-icon"), true);
  assert.equal(resolveLegendIconFill("1"), true);
  assert.equal(resolveLegendIconFill("false"), false);

  const materialCircle = resolveLegendIcon("circle", "material-symbols");
  const materialOutlineSvg = buildLegendIconSvg(materialCircle);
  const materialFilledSvg = buildLegendIconSvg(materialCircle, { filled: true });

  assert.notDeepEqual(extractSvgPathData(materialOutlineSvg), extractSvgPathData(materialFilledSvg));
  assert.equal(materialOutlineSvg.includes("fill-rule=\"nonzero\""), true);
  assert.equal(materialFilledSvg.includes("fill-rule=\"nonzero\""), true);
  assert.equal(getLegendIconRuntimePath("circle", "material-symbols"), "/icons/material-symbols/circle.svg");
  assert.equal(getLegendIconRuntimePath("circle", "material-symbols", { filled: true }), "/icons/material-symbols/circle-fill.svg");
  assert.equal(resolveLegendIconName("circle-outline", "material-symbols"), "circle");
  assert.equal(resolveLegendIconName("circle-fill", "material-symbols"), "circle");
  assert.equal(inferLegendIconFillFromName("circle-outline", "material-symbols"), false);
  assert.equal(inferLegendIconFillFromName("circle-fill", "material-symbols"), true);

  const materialArrow = resolveLegendIcon("arrow-forward", "material-symbols");
  const materialArrowSvg = buildLegendIconSvg(materialArrow);
  assert.equal(buildLegendIconSvg(materialArrow, { filled: true }), materialArrowSvg);
  assert.equal(getLegendIconRuntimePath("arrow-forward", "material-symbols", { filled: true }), "/icons/material-symbols/arrow-forward.svg");

  const remixCircle = resolveLegendIcon("circle-line", "remix-icon");
  const remixOutlineSvg = buildLegendIconSvg(remixCircle);
  const remixFilledSvg = buildLegendIconSvg(remixCircle, { filled: true });

  assert.notDeepEqual(extractSvgPathData(remixOutlineSvg), extractSvgPathData(remixFilledSvg));
  assert.equal(remixOutlineSvg.includes("fill-rule=\"nonzero\""), true);
  assert.equal(remixFilledSvg.includes("fill-rule=\"nonzero\""), true);
  assert.equal(listAvailableLegendIcons("remix-icon").some((icon) => icon.name === "circle-fill"), false);
  assert.equal(resolveLegendIconName("circle-fill", "remix-icon"), "circle-line");
  assert.equal(inferLegendIconFillFromName("circle-fill", "remix-icon"), true);
  assert.equal(getLegendIconRuntimePath("circle-line", "remix-icon"), "/icons/remix-icon/circle-line.svg");
  assert.equal(getLegendIconRuntimePath("circle-line", "remix-icon", { filled: true }), "/icons/remix-icon/circle-fill.svg");
});

test("Model SVG specifies compound path fill rule as nonzero", () => {
  const materialPowerSvg = buildLegendIconSvg(resolveLegendIcon("power", "material-symbols"));
  const materialPowerParent = materialSymbolsIconSet.icons["power-plug"];
  const materialPowerPath = extractSvgPathData(materialPowerSvg)[0];
  const materialPowerRawPath = extractSvgPathData(materialPowerParent.body)[0];

  assert.equal(resolveLegendIconName("power", "material-symbols"), "power");
  assert.notEqual(materialPowerPath, materialPowerRawPath);
  assert.match(materialPowerPath, /v-4h2v4h4v-4h2v4c/);
  assert.doesNotMatch(materialPowerPath, /L8[,\s]+8/);
  assert.match(materialPowerSvg, /<svg[^>]+fill-rule="nonzero"[^>]+clip-rule="nonzero"/);
  assert.match(materialPowerSvg, /<path[^>]+fill-rule="nonzero"[^>]+clip-rule="nonzero"/);
  assert.equal(materialPowerParent.body.includes("fill-rule"), false);
});

test("Model SVGs of all icon sets can generate normal and filled shapes", () => {
  let generatedCount = 0;

  listLegendIconSets().forEach((iconSet) => {
    listAvailableLegendIcons(iconSet.key).forEach((icon) => {
      assert.match(buildLegendIconSvg(icon), /^<svg\b/);
      generatedCount += 1;
      if (isLegendIconFillAvailable(icon.name, iconSet.key)) {
        assert.match(buildLegendIconSvg(icon, { filled: true }), /^<svg\b/);
        generatedCount += 1;
      }
    });
  });

  assert.ok(generatedCount > 10000);
});

test("Font Awesome model path does not change from original package definition", () => {
  const originalByName = new Map();
  Object.values(fontAwesomeIcons).forEach((value) => {
    if (
      value
      && typeof value === "object"
      && value.prefix === "fas"
      && typeof value.iconName === "string"
      && Array.isArray(value.icon)
      && !originalByName.has(value.iconName)
    ) {
      originalByName.set(value.iconName, value.icon);
    }
  });

  const mismatches = [];
  Object.entries(fontAwesomeSolidIconSet).forEach(([name, definition]) => {
    const original = originalByName.get(name);
    if (!original) {
      mismatches.push(`${name}: missing`);
      return;
    }
    const [width, height, , unicode, svgPathData] = original;
    if (
      definition.width !== width
      || definition.height !== height
      || definition.unicode !== unicode
      || JSON.stringify(definition.svgPathData) !== JSON.stringify(svgPathData)
    ) {
      mismatches.push(`${name}: mismatch`);
    }
  });

  assert.equal(Object.keys(fontAwesomeSolidIconSet).length, originalByName.size);
  assert.deepEqual(mismatches, []);
});

test("Remix Icon model path uses original SVG path d as is", async () => {
  const svgFiles = await collectFiles(
    path.join(PROJECT_ROOT, "node_modules/remixicon/icons"),
    (entryPath) => entryPath.endsWith(".svg"),
  );
  const originalByName = new Map();

  await Promise.all(svgFiles.map(async (entryPath) => {
    const svg = await readFile(entryPath, "utf8");
    originalByName.set(path.basename(entryPath, ".svg"), extractSvgPathData(svg));
  }));

  const mismatches = [];
  Object.entries(remixIconPathSet).forEach(([name, paths]) => {
    const original = originalByName.get(name);
    if (!original) {
      mismatches.push(`${name}: missing`);
      return;
    }
    if (JSON.stringify(paths) !== JSON.stringify(original)) {
      mismatches.push(`${name}: mismatch`);
    }
  });

  assert.equal(Object.keys(remixIconPathSet).length, originalByName.size);
  assert.deepEqual(mismatches, []);
});

test("Multiple icon sets can be searched with common API", () => {
  const iconSetKeys = listLegendIconSets().map((iconSet) => iconSet.key);

  assert.deepEqual(iconSetKeys, ["lucide", "material-symbols", "font-awesome", "remix-icon"]);
  assert.ok(listLegendIconSets().every((iconSet) => iconSet.faviconUrl));
  assert.ok(listAvailableLegendIcons("material-symbols").length > 4000);
  assert.ok(searchLegendIcons("keyboard_command_key", "material-symbols", 8).some((icon) => icon.name === "keyboard-command-key"));
  assert.ok(searchLegendIcons("volume-up", "font-awesome", 8).some((icon) => icon.name === "volume-high"));
  assert.ok(searchLegendIcons("command", "remix-icon", 8).some((icon) => icon.name === "command-line"));
});

test("Icon name normalization and SVG generation use defaults per icon set", () => {
  assert.equal(resolveLegendIconName("keyboard_command_key", "material-symbols"), "keyboard-command-key");
  assert.equal(resolveLegendIconName("volume-up", "font-awesome"), "volume-high");
  assert.equal(resolveLegendIconName("circle", "remix-icon"), "circle-line");

  const fontAwesomeSvg = buildLegendIconSvg(searchLegendIcons("volume-up", "font-awesome", 1)[0]);
  const remixSvg = buildLegendIconSvg(searchLegendIcons("command", "remix-icon", 1)[0]);
  const lucideCircleSvg = buildLegendIconSvg(searchLegendIcons("circle", "lucide", 1)[0]);
  const lucideStrokeSvg = buildLegendIconSvg(searchLegendIcons("circle-power", "lucide", 1)[0]);
  const lucideDeleteSvg = buildLegendIconSvg(searchLegendIcons("delete", "lucide", 1)[0]);
  const lucideCommandSvg = buildLegendIconSvg(searchLegendIcons("command", "lucide", 1)[0]);

  assert.match(fontAwesomeSvg, /width="24mm"/);
  assert.match(fontAwesomeSvg, /viewBox="0 0 640 512"/);
  assert.match(remixSvg, /viewBox="0 0 24 24"/);
  assert.match(lucideCircleSvg, /<svg[^>]+fill="#000000"[^>]+stroke="none"/);
  assert.match(lucideStrokeSvg, /<svg[^>]+fill="#000000"[^>]+stroke="none"/);
  assert.match(lucideDeleteSvg, /<svg[^>]+fill="#000000"[^>]+stroke="none"/);
  assert.equal((lucideCircleSvg.match(/<path/g) ?? []).length, 1);
  assert.equal((lucideCircleSvg.match(/M/g) ?? []).length, 2);
  assert.ok((lucideStrokeSvg.match(/M/g) ?? []).length > 1);
  assert.ok((lucideDeleteSvg.match(/M/g) ?? []).length > 1);
  assert.ok((lucideCommandSvg.match(/<path/g) ?? []).length > 1);
  assert.ok((lucideCommandSvg.match(/M/g) ?? []).length > 1);
  assert.doesNotMatch(lucideStrokeSvg, /stroke-width=/);
  assert.doesNotMatch(lucideDeleteSvg, /stroke-width=/);
  assert.doesNotMatch(lucideStrokeSvg, /<circle/);
  assert.doesNotMatch(lucideStrokeSvg, /\skey="/);
});
