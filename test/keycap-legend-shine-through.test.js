import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { posix as pathPosix } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import OpenSCAD from "../public/vendor/openscad/openscad.js";
import { parseOff } from "../src/lib/off-parser.js";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PUBLIC_ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const OPENSCAD_WASM_PATH = fileURLToPath(
  new URL("../public/vendor/openscad/openscad.wasm", import.meta.url),
);

// Real glyph outlines require real font bytes on the OpenSCAD virtual filesystem,
// so (unlike geometry-only tests) this fetch mock reads the actual bundled assets.
function installBrowserMocks(textMetrics) {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const previousFontFace = globalThis.FontFace;
  const previousWindow = globalThis.window;

  globalThis.document = {
    createElement(tagName) {
      if (tagName !== "canvas") {
        return {};
      }

      return {
        getContext() {
          return {
            font: "",
            measureText() {
              return textMetrics;
            },
          };
        },
      };
    },
    fonts: {
      add() {},
    },
  };
  globalThis.fetch = async (url) => {
    const relativePath = new URL(url).pathname.replace(/^\//, "");
    try {
      const bytes = await readFile(pathPosix.join(PUBLIC_ROOT, relativePath));
      return {
        ok: true,
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      };
    } catch {
      return {
        ok: false,
        async arrayBuffer() {
          return new ArrayBuffer(0);
        },
      };
    }
  };
  globalThis.FontFace = class {
    async load() {
      return this;
    }
  };
  globalThis.window = {
    location: {
      origin: "http://localhost",
    },
  };

  return () => {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
    globalThis.FontFace = previousFontFace;
    globalThis.window = previousWindow;
  };
}

function makeDirRecursive(fs, absolutePath) {
  const segments = absolutePath.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current += `/${segment}`;
    if (!fs.analyzePath(current).exists) {
      fs.mkdir(current);
    }
  }
}

function readScadNumber(scadText, name) {
  const match = scadText.match(new RegExp(`^${name} = ([^;]+);`, "m"));
  assert.ok(match, `${name} definition should exist`);
  const value = Number(match[1]);
  assert.ok(Number.isFinite(value), `${name} should be a finite number`);
  return value;
}

function createBounds(vertices) {
  return vertices.reduce((bounds, vertex) => ({
    minX: Math.min(bounds.minX, vertex.x),
    maxX: Math.max(bounds.maxX, vertex.x),
    minY: Math.min(bounds.minY, vertex.y),
    maxY: Math.max(bounds.maxY, vertex.y),
    minZ: Math.min(bounds.minZ, vertex.z),
    maxZ: Math.max(bounds.maxZ, vertex.z),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function sampleTopZ(mesh, x, y) {
  let topZ = -Infinity;

  for (const face of mesh.faces) {
    const [a, b, c] = face.map((vertexIndex) => mesh.vertices[vertexIndex]);
    const denominator = ((b.y - c.y) * (a.x - c.x)) + ((c.x - b.x) * (a.y - c.y));
    if (Math.abs(denominator) <= 1e-12) {
      continue;
    }

    const aWeight = (
      ((b.y - c.y) * (x - c.x)) + ((c.x - b.x) * (y - c.y))
    ) / denominator;
    const bWeight = (
      ((c.y - a.y) * (x - c.x)) + ((a.x - c.x) * (y - c.y))
    ) / denominator;
    const cWeight = 1 - aWeight - bWeight;
    if (aWeight < -1e-7 || bWeight < -1e-7 || cWeight < -1e-7) {
      continue;
    }

    topZ = Math.max(
      topZ,
      (aWeight * a.z) + (bWeight * b.z) + (cWeight * c.z),
    );
  }

  return topZ;
}

function assertHealthyMesh(rendered, label) {
  const { mesh, logs, exitCode } = rendered;
  assert.equal(exitCode, 0, `${label} should exit successfully:\n${logs}`);
  assert.ok(mesh.vertices.length > 0, `${label} should contain vertices`);
  assert.ok(mesh.faces.length > 0, `${label} should contain faces`);
  // Anchored to line start: a bare case-insensitive /ERROR:/ also matches the benign
  // "Fontconfig error: Cannot load default config file" warning that real text() emits.
  assert.doesNotMatch(logs, /^ERROR:|Current top level object is empty/m, `${label} should not log geometry errors`);
  assert.match(logs, /Top level object is a 3D object \(manifold\)/, `${label} should be manifold`);
  assert.match(logs, /Status:\s+NoError/, `${label} manifold status should be NoError`);
}

async function renderMesh({ bundle, wasmBinary, params, exportTarget }) {
  const files = await bundle.createKeycapFiles({ exportTarget, params });
  const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
  assert.ok(jobScad, "keycap job SCAD should be generated");

  const logEntries = [];
  const instance = await OpenSCAD({
    noInitialRun: true,
    wasmBinary,
    print(value) {
      logEntries.push(`${value}`);
    },
    printErr(value) {
      logEntries.push(`${value}`);
    },
  });
  const outputPath = `/outputs/keycap-${exportTarget}.off`;

  for (const file of files) {
    makeDirRecursive(instance.FS, pathPosix.dirname(file.path));
    instance.FS.writeFile(file.path, file.content);
  }
  makeDirRecursive(instance.FS, pathPosix.dirname(outputPath));

  const exitCode = instance.callMain(bundle.buildKeycapArgs({
    outputPath,
    outputFormat: "off",
  }));
  const logs = logEntries.join("\n");
  const exists = instance.FS.analyzePath(outputPath).exists;
  const mesh = exists
    ? parseOff(new TextDecoder().decode(instance.FS.readFile(outputPath)))
    : { vertices: [], faces: [] };

  return {
    exitCode,
    jobScad,
    mesh,
    bounds: createBounds(mesh.vertices),
    logs,
  };
}

test("shine-through legend cuts a full-depth hole and produces a matching insert", async (t) => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 60,
    actualBoundingBoxLeft: 30,
    actualBoundingBoxRight: 30,
    actualBoundingBoxAscent: 35,
    actualBoundingBoxDescent: 15,
  });
  const server = await createServer({
    root: PROJECT_ROOT,
    appType: "custom",
    logLevel: "silent",
    server: {
      middlewareMode: true,
    },
  });

  try {
    const [bundle, registry, wasmBinary] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
      readFile(OPENSCAD_WASM_PATH),
    ]);

    await t.test("center legend: insert height equals top thickness and the body gets a real hole", async () => {
      const baseParams = {
        ...registry.createDefaultKeycapParams("custom-shell"),
        // Disabled so the centered stem post can't be mistaken for top-surface material
        // when probing straight down through the legend.
        stemEnabled: false,
        legendEnabled: true,
        legendContentType: "icon",
        legendIconSet: "lucide",
        legendIconName: "circle",
        legendSize: 6,
        legendHeight: 0,
        legendEmbed: 0,
      };
      // "circle" is a ring outline, so its centre (0,0) is bare keycap either way.
      // Probe on the stroke itself, where the two modes must actually differ.
      const strokeX = -2.5;
      const strokeY = 0;

      const insert = await renderMesh({
        bundle,
        wasmBinary,
        exportTarget: "legend",
        params: { ...baseParams, legendShineThroughEnabled: true },
      });
      assertHealthyMesh(insert, "shine-through legend insert");
      const topThickness = readScadNumber(insert.jobScad, "user_top_thickness");
      const insertHeight = insert.bounds.maxZ - insert.bounds.minZ;
      assert.ok(
        Math.abs(insertHeight - topThickness) < 0.05,
        `insert height (${insertHeight}) should equal top thickness (${topThickness})`,
      );

      const throughBody = await renderMesh({
        bundle,
        wasmBinary,
        exportTarget: "body",
        params: { ...baseParams, legendShineThroughEnabled: true },
      });
      const flushBody = await renderMesh({
        bundle,
        wasmBinary,
        exportTarget: "body",
        params: { ...baseParams, legendShineThroughEnabled: false },
      });
      assertHealthyMesh(throughBody, "shine-through body");
      assertHealthyMesh(flushBody, "flush body");

      const flushTopZ = sampleTopZ(flushBody.mesh, strokeX, strokeY);
      const throughTopZ = sampleTopZ(throughBody.mesh, strokeX, strokeY);
      const plainTopZ = sampleTopZ(flushBody.mesh, 6, 6);
      assert.ok(
        Number.isFinite(flushTopZ) && flushTopZ < plainTopZ - 0.1,
        `flush legend should leave a recessed floor under the glyph (got ${flushTopZ}, plain top ${plainTopZ})`,
      );
      assert.ok(
        !Number.isFinite(throughTopZ),
        "shine-through body should have no material under the glyph stroke (a real hole)",
      );
    });

    await t.test("corner legend slot (used for the Hebrew secondary legend) also supports shine-through", async () => {
      const params = {
        ...registry.createDefaultKeycapParams("custom-shell"),
        stemEnabled: true,
        topLegendLeftTopEnabled: true,
        topLegendLeftTopContentType: "icon",
        topLegendLeftTopIconSet: "lucide",
        topLegendLeftTopIconName: "circle",
        topLegendLeftTopHeight: 0,
        topLegendLeftTopEmbed: 0,
        topLegendLeftTopShineThroughEnabled: true,
      };

      const insert = await renderMesh({ bundle, wasmBinary, exportTarget: "top_legend_left_top", params });
      assertHealthyMesh(insert, "shine-through corner legend insert");
      const topThickness = readScadNumber(insert.jobScad, "user_top_thickness");
      const insertHeight = insert.bounds.maxZ - insert.bounds.minZ;
      assert.ok(
        Math.abs(insertHeight - topThickness) < 0.05,
        `corner insert height (${insertHeight}) should equal top thickness (${topThickness})`,
      );
    });

    await t.test("shine-through also works with real text glyphs (German + Hebrew fonts)", async () => {
      const rendered = await renderMesh({
        bundle,
        wasmBinary,
        exportTarget: "legend",
        params: {
          ...registry.createDefaultKeycapParams("custom-shell"),
          stemEnabled: true,
          legendEnabled: true,
          legendContentType: "text",
          legendText: "Q",
          legendHeight: 0,
          legendEmbed: 0,
          legendShineThroughEnabled: true,
        },
      });
      assertHealthyMesh(rendered, "shine-through text legend insert");
    });
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});
