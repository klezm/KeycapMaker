#!/usr/bin/env node
// Render a full keycap set and pack it into one 3MF.
//
//   node scripts/build-keyset.mjs [--out <path>] [--no-shine-through]
//                                           [--only <code,code,...>] [--jobs <n>]
//                                           [--arrange board|grid] [--bed <mm>]
//                                           [--layout <id>] [--primary <lang>]
//                                           [--secondary <lang>|none]
//
// Defaults to the ISO-105 German + Hebrew set. Layouts and languages come from
// src/data/keysets/; --only takes xkb key codes such as AC01,RTRN,SPCE.
//
// --arrange board (default) places every cap at its true position on the
// keyboard, which is ~410mm wide and so wider than a common print bed. Use
// --arrange grid to pack the caps into a bed-sized grid instead.
//
// Output goes to out/ rather than dist/, because `npm run build` empties dist/.
//
// The app itself runs OpenSCAD in a browser Web Worker. Here the same bundle is
// loaded through Vite's SSR module runner so the `?raw` SCAD imports resolve,
// and the same OpenSCAD WASM build is driven directly from Node. That keeps the
// geometry identical to what the app produces - there is no second code path.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { posix as pathPosix } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import OpenSCAD from "../public/vendor/openscad/openscad.js";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PUBLIC_ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const OPENSCAD_WASM_PATH = fileURLToPath(new URL("../public/vendor/openscad/openscad.wasm", import.meta.url));

function parseArgs(argv) {
  const options = {
    outPath: fileURLToPath(new URL("../out/iso-105-de-he-keyset.3mf", import.meta.url)),
    shineThrough: true,
    only: null,
    jobs: Math.max(1, Math.min(availableParallelism?.() ?? 4, 8)),
    arrange: "board",
    bedMm: 250,
    layout: "iso-105",
    primary: "de",
    secondary: "il",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      options.outPath = argv[index += 1];
    } else if (arg === "--no-shine-through") {
      options.shineThrough = false;
    } else if (arg === "--only") {
      options.only = new Set(argv[index += 1].split(",").map((value) => value.trim()).filter(Boolean));
    } else if (arg === "--jobs") {
      options.jobs = Math.max(1, Number(argv[index += 1]) || 1);
    } else if (arg === "--arrange") {
      options.arrange = argv[index += 1];
      if (options.arrange !== "board" && options.arrange !== "grid") {
        throw new Error(`--arrange must be "board" or "grid", got: ${options.arrange}`);
      }
    } else if (arg === "--bed") {
      options.bedMm = Math.max(50, Number(argv[index += 1]) || 250);
    } else if (arg === "--layout") {
      options.layout = argv[index += 1];
    } else if (arg === "--primary") {
      options.primary = argv[index += 1];
    } else if (arg === "--secondary") {
      const value = argv[index += 1];
      options.secondary = value === "none" ? null : value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

// The bundle expects a browser. Only these four APIs are actually touched:
// canvas text measurement (legend plan sizing), fetch (runtime assets), FontFace
// (measurement font registration) and window.location (asset URL resolution).
function installBrowserMocks() {
  globalThis.document = {
    createElement(tagName) {
      if (tagName !== "canvas") {
        return {};
      }
      return {
        getContext() {
          return {
            font: "",
            measureText(text) {
              // Rough advance-width model. The SCAD side sizes glyphs from the
              // font itself; this only feeds the legend's working-area box, which
              // is deliberately generous, so an estimate is enough.
              const width = [...String(text)].length * 0.6 * 100;
              return {
                width,
                actualBoundingBoxLeft: width / 2,
                actualBoundingBoxRight: width / 2,
                actualBoundingBoxAscent: 72,
                actualBoundingBoxDescent: 20,
              };
            },
          };
        },
      };
    },
    fonts: { add() {} },
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
    } catch (error) {
      return {
        ok: false,
        status: 404,
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
  globalThis.window = { location: { origin: "http://localhost" } };
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

/** Run one export target through OpenSCAD and return its parsed OFF mesh. */
async function renderTarget({ bundle, parseOff, wasmBinary, params, exportTarget }) {
  const files = await bundle.createKeycapFiles({ exportTarget, params });
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

  const outputPath = `/outputs/${exportTarget}.off`;
  for (const file of files) {
    makeDirRecursive(instance.FS, pathPosix.dirname(file.path));
    instance.FS.writeFile(file.path, file.content);
  }
  makeDirRecursive(instance.FS, pathPosix.dirname(outputPath));

  instance.callMain(bundle.buildKeycapArgs({ outputPath, outputFormat: "off" }));
  const logs = logEntries.join("\n");

  if (!instance.FS.analyzePath(outputPath).exists) {
    throw new Error(`OpenSCAD produced no output for ${exportTarget}:\n${logs}`);
  }
  const mesh = parseOff(new TextDecoder().decode(instance.FS.readFile(outputPath)));
  if (mesh.vertices.length === 0) {
    throw new Error(`OpenSCAD produced an empty mesh for ${exportTarget}:\n${logs}`);
  }
  if (/^ERROR:/m.test(logs)) {
    throw new Error(`OpenSCAD reported an error for ${exportTarget}:\n${logs}`);
  }

  return mesh;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  installBrowserMocks();

  const server = await createServer({
    root: PROJECT_ROOT,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const [bundle, registry, exporter, offParser, keyset, wasmBinary] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
      server.ssrLoadModule("/src/lib/export-3mf.js"),
      server.ssrLoadModule("/src/lib/off-parser.js"),
      server.ssrLoadModule("/src/data/keysets/index.js"),
      readFile(OPENSCAD_WASM_PATH),
    ]);
    const keysetLayout = await server.ssrLoadModule("/src/lib/keyset-layout.js");

    const built = keyset.buildKeyset({
      layoutId: options.layout,
      primaryLanguageId: options.primary,
      secondaryLanguageId: options.secondary,
      shineThrough: options.shineThrough,
      createDefaults: (profileKey) => registry.createDefaultKeycapParams(profileKey),
    });
    const keys = built.keys.filter((key) => !options.only || options.only.has(key.code));
    if (keys.length === 0) {
      throw new Error("No keys selected.");
    }

    const secondaryLabel = built.secondaryLanguage ? built.secondaryLanguage.label : "none";
    console.log(
      `Rendering ${keys.length} keycap${keys.length === 1 ? "" : "s"}`
      + ` - ${built.layout.label}, ${built.primaryLanguage?.label ?? "no primary"} + ${secondaryLabel}`
      + ` (shine-through ${options.shineThrough ? "on" : "off"}, ${options.jobs} in parallel)...`,
    );

    const startedAt = Date.now();
    let completed = 0;

    async function buildKeycap(key) {
      const { params } = key;

      // Only render the targets this key actually uses: an empty legend slot
      // yields an empty mesh, which is an error rather than something to pack.
      const targets = [{ target: "body", name: "keycap-body", colorHex: params.bodyColor }];
      if (params.legendEnabled) {
        targets.push({ target: "legend", name: "keycap-legend", colorHex: params.legendColor });
      }
      if (params.topLegendRightBottomEnabled) {
        targets.push({
          target: "top_legend_right_bottom",
          name: "keycap-legend-right-bottom",
          colorHex: params.topLegendRightBottomColor,
        });
      }

      const meshes = [];
      for (const { target, name, colorHex } of targets) {
        const mesh = await renderTarget({
          bundle,
          parseOff: offParser.parseOff,
          wasmBinary,
          params,
          exportTarget: target,
        });
        meshes.push({ name, colorHex, vertices: mesh.vertices, faces: mesh.faces });
      }

      completed += 1;
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(`  [${String(completed).padStart(3)}/${keys.length}] ${key.code} (${meshes.length} parts, ${elapsed}s elapsed)`);

      return { name: key.code, position: { x: key.position.x, y: key.position.y, z: 0 }, meshes };
    }

    // Bounded worker pool: each OpenSCAD instance is its own WASM heap, so
    // running the whole board at once would be needlessly memory hungry.
    const results = new Array(keys.length);
    let nextIndex = 0;
    async function worker() {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= keys.length) {
          return;
        }
        results[index] = await buildKeycap(keys[index]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(options.jobs, keys.length) }, () => worker()));

    let arranged = results;
    if (options.arrange === "grid") {
      const { placed, depthMm } = keysetLayout.arrangeIntoGrid(results, options.bedMm);
      arranged = placed;
      console.log(`\nPacked into a ${options.bedMm}mm-wide grid, ${depthMm.toFixed(0)}mm deep.`);
      if (depthMm > options.bedMm) {
        console.log(`  Note: that is deeper than the ${options.bedMm}mm bed, so this still needs splitting across plates.`);
      }
    }

    const blob = exporter.create3mfKeysetBlob(arranged);
    const bytes = Buffer.from(await blob.arrayBuffer());
    await mkdir(pathPosix.dirname(options.outPath.split("\\").join("/")), { recursive: true });
    await writeFile(options.outPath, bytes);

    const totalParts = arranged.reduce((total, keycap) => total + keycap.meshes.length, 0);
    const totalTriangles = arranged.reduce(
      (total, keycap) => total + keycap.meshes.reduce((sum, mesh) => sum + mesh.faces.length, 0),
      0,
    );
    console.log(
      `\nWrote ${options.outPath}\n`
      + `  ${arranged.length} keycaps, ${totalParts} parts, ${totalTriangles.toLocaleString("en-US")} triangles, `
      + `${(bytes.length / (1024 * 1024)).toFixed(1)} MB\n`
      + `  total time ${((Date.now() - startedAt) / 1000).toFixed(0)}s`,
    );
  } finally {
    await server.close();
  }
}

await main();
