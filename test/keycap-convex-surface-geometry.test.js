import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { posix as pathPosix } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import OpenSCAD from "../public/vendor/openscad/openscad.js";
import { parseOff } from "../src/lib/off-parser.js";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const OPENSCAD_WASM_PATH = fileURLToPath(
  new URL("../public/vendor/openscad/openscad.wasm", import.meta.url),
);
const HEIGHT_TOLERANCE_MM = 0.06;
// At the 1.5mm maximum, the 13-degree side continuation reaches about 0.36mm inward.
const BOUNDARY_INSET_MM = 0.4;

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
  globalThis.fetch = async () => ({
    ok: true,
    async arrayBuffer() {
      return new ArrayBuffer(0);
    },
  });
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

function assertClose(actual, expected, tolerance, message) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, received ${actual}`,
  );
}

function resolveGeometry(jobScad) {
  const keyWidth = readScadNumber(jobScad, "user_key_width");
  const keyDepth = readScadNumber(jobScad, "user_key_depth");
  const topCenterHeight = readScadNumber(jobScad, "user_top_center_height");
  const frontAngle = readScadNumber(jobScad, "user_profile_front_angle");
  const backAngle = readScadNumber(jobScad, "user_profile_back_angle");
  const leftAngle = readScadNumber(jobScad, "user_profile_left_angle");
  const rightAngle = readScadNumber(jobScad, "user_profile_right_angle");
  const degTan = (value) => Math.tan((value * Math.PI) / 180);

  return {
    keyWidth,
    keyDepth,
    topCenterHeight,
    dishRadius: readScadNumber(jobScad, "user_dish_radius"),
    dishDepth: readScadNumber(jobScad, "user_dish_depth"),
    topLeft: (-keyWidth / 2) + (topCenterHeight * degTan(leftAngle)),
    topRight: (keyWidth / 2) - (topCenterHeight * degTan(rightAngle)),
    topFront: (-keyDepth / 2) + (topCenterHeight * degTan(frontAngle)),
    topBack: (keyDepth / 2) - (topCenterHeight * degTan(backAngle)),
  };
}

function dishSagFromRadialSq(radialSq, dishRadius) {
  const safeRadius = Math.max(dishRadius, 0.1);
  const safeRadialSq = Math.min(Math.max(radialSq, 0), safeRadius * safeRadius);
  return safeRadius - Math.sqrt(Math.max((safeRadius * safeRadius) - safeRadialSq, 0));
}

function expectedConvexOffset({ geometry, surfaceShape, x, y }) {
  const xScale = Math.max(geometry.keyWidth / 18, 0.001);
  const yScale = Math.max(geometry.keyDepth / 18, 0.001);
  const xRadius = Math.max(Math.abs(geometry.topLeft), Math.abs(geometry.topRight)) / xScale;
  const yRadius = Math.max(Math.abs(geometry.topFront), Math.abs(geometry.topBack)) / yScale;
  const radialSq = surfaceShape === "cylindrical"
    ? (x / xScale) ** 2
    : ((x / xScale) ** 2) + ((y / yScale) ** 2);
  const startRadialSq = surfaceShape === "cylindrical"
    ? xRadius ** 2
    : (xRadius ** 2) + (yRadius ** 2);
  const currentSag = dishSagFromRadialSq(radialSq, geometry.dishRadius);
  const startSag = Math.max(dishSagFromRadialSq(startRadialSq, geometry.dishRadius), 0.001);

  return Math.max(Math.abs(geometry.dishDepth) * (1 - (currentSag / startSag)), 0);
}

function assertHealthyBody(rendered, label) {
  const { mesh, bounds, logs, exitCode } = rendered;
  assert.equal(exitCode, 0, `${label} should exit successfully`);
  assert.ok(mesh.vertices.length > 100, `${label} should contain body vertices`);
  assert.ok(mesh.faces.length > 100, `${label} should contain body faces`);
  assert.equal(
    mesh.vertices.find((vertex) => ![vertex.x, vertex.y, vertex.z].every(Number.isFinite)),
    undefined,
    `${label} should not contain non-finite vertices`,
  );
  assert.ok(bounds.maxX > bounds.minX, `${label} should have X extent`);
  assert.ok(bounds.maxY > bounds.minY, `${label} should have Y extent`);
  assert.ok(bounds.maxZ > bounds.minZ, `${label} should have Z extent`);
  assert.doesNotMatch(logs, /ERROR:|Current top level object is empty/i, `${label} should not log geometry errors`);
  assert.match(logs, /Top level object is a 3D object \(manifold\)/, `${label} should be manifold`);
  assert.match(logs, /Status:\s+NoError/, `${label} manifold status should be NoError`);
}

function createBodyParams(defaults, overrides = {}) {
  return {
    ...defaults,
    topPitchDeg: 0,
    topRollDeg: 0,
    topOffsetX: 0,
    topOffsetY: 0,
    keycapEdgeRadius: 0,
    topHatEnabled: false,
    rimEnabled: false,
    legendEnabled: false,
    topLegendRightTopEnabled: false,
    topLegendRightBottomEnabled: false,
    topLegendLeftTopEnabled: false,
    topLegendLeftBottomEnabled: false,
    sideLegendFrontEnabled: false,
    sideLegendBackEnabled: false,
    sideLegendLeftEnabled: false,
    sideLegendRightEnabled: false,
    homingBarEnabled: false,
    stemEnabled: false,
    ...overrides,
  };
}

async function renderBody({ bundle, wasmBinary, params, exportTarget = "body" }) {
  const files = await bundle.createKeycapFiles({
    exportTarget,
    params,
  });
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
  assert.ok(
    instance.FS.analyzePath(outputPath).exists,
    `${exportTarget} output should exist:\n${logEntries.join("\n")}`,
  );
  const output = new TextDecoder().decode(instance.FS.readFile(outputPath));
  const mesh = parseOff(output);

  return {
    exitCode,
    jobScad,
    geometry: resolveGeometry(jobScad),
    mesh,
    bounds: createBounds(mesh.vertices),
    logs: logEntries.join("\n"),
  };
}

test("OpenSCAD full body maintains curve contract with positive/negative dishDepth and representative footprint", async (t) => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 70,
    actualBoundingBoxDescent: 30,
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

    await t.test("1u cylindrical / spherical bulges with negative value, indents traditionally with positive value", async () => {
      const defaults = registry.createDefaultKeycapParams("custom-shell");
      const flat = await renderBody({
        bundle,
        wasmBinary,
        params: createBodyParams(defaults, {
          topSurfaceShape: "flat",
          dishDepth: 0,
        }),
      });
      assertHealthyBody(flat, "1u flat body");
      const flatCenterZ = sampleTopZ(flat.mesh, 0, 0);
      assert.ok(Number.isFinite(flatCenterZ), "flat center surface should be sampleable");

      for (const surfaceShape of ["cylindrical", "spherical"]) {
        const negative = await renderBody({
          bundle,
          wasmBinary,
          params: createBodyParams(defaults, {
            topSurfaceShape: surfaceShape,
            dishDepth: -99,
          }),
        });
        const positive = await renderBody({
          bundle,
          wasmBinary,
          params: createBodyParams(defaults, {
            topSurfaceShape: surfaceShape,
            dishDepth: 99,
          }),
        });
        assertHealthyBody(negative, `1u ${surfaceShape} convex body`);
        assertHealthyBody(positive, `1u ${surfaceShape} concave body`);
        assert.ok(negative.geometry.dishDepth < 0, `${surfaceShape} negative depth should reach SCAD`);
        assert.ok(positive.geometry.dishDepth > 0, `${surfaceShape} positive depth should reach SCAD`);
        assertClose(
          Math.abs(negative.geometry.dishDepth),
          positive.geometry.dishDepth,
          1e-9,
          `${surfaceShape} positive and negative clamp limits should be symmetric`,
        );

        const negativeCenterZ = sampleTopZ(negative.mesh, 0, 0);
        const positiveCenterZ = sampleTopZ(positive.mesh, 0, 0);
        const expectedMagnitude = Math.abs(negative.geometry.dishDepth);
        assertClose(
          expectedMagnitude,
          1.5,
          1e-9,
          `${surfaceShape} clamp limit should be 1.5mm`,
        );
        assertClose(
          negativeCenterZ - flatCenterZ,
          expectedMagnitude,
          HEIGHT_TOLERANCE_MM,
          `${surfaceShape} negative depth should raise the center`,
        );
        assertClose(
          flatCenterZ - positiveCenterZ,
          expectedMagnitude,
          HEIGHT_TOLERANCE_MM,
          `${surfaceShape} positive depth should lower the center`,
        );
        assertClose(
          negative.bounds.maxZ - flat.bounds.maxZ,
          expectedMagnitude,
          HEIGHT_TOLERANCE_MM,
          `${surfaceShape} convex maximum should be flat maximum plus the clamped magnitude`,
        );
        assert.ok(
          positive.bounds.maxZ <= flat.bounds.maxZ + 0.02,
          `${surfaceShape} concave body should not exceed the flat maximum height`,
        );

        for (const boundName of ["minX", "maxX", "minY", "maxY"]) {
          assertClose(
            negative.bounds[boundName],
            flat.bounds[boundName],
            0.01,
            `${surfaceShape} convex body should not add ${boundName} extent`,
          );
        }

        const { geometry } = negative;
        const joinPoints = [
          { name: "left join", x: geometry.topLeft, y: 0 },
          { name: "right join", x: geometry.topRight, y: 0 },
          { name: "front join", x: 0, y: geometry.topFront },
          { name: "back join", x: 0, y: geometry.topBack },
        ];
        for (const point of joinPoints) {
          const flatJoinZ = sampleTopZ(flat.mesh, point.x, point.y);
          const convexJoinZ = sampleTopZ(negative.mesh, point.x, point.y);
          assertClose(
            convexJoinZ - flatJoinZ,
            0,
            HEIGHT_TOLERANCE_MM,
            `${surfaceShape} ${point.name} should meet the existing side without a raised lip`,
          );
        }

        const boundaryPoints = [
          { name: "left", x: geometry.topLeft + BOUNDARY_INSET_MM, y: 0 },
          { name: "right", x: geometry.topRight - BOUNDARY_INSET_MM, y: 0 },
          { name: "front", x: 0, y: geometry.topFront + BOUNDARY_INSET_MM },
          { name: "back", x: 0, y: geometry.topBack - BOUNDARY_INSET_MM },
        ];
        for (const point of boundaryPoints) {
          const flatBoundaryZ = sampleTopZ(flat.mesh, point.x, point.y);
          const convexBoundaryZ = sampleTopZ(negative.mesh, point.x, point.y);
          const expectedOffset = expectedConvexOffset({
            geometry,
            surfaceShape,
            x: point.x,
            y: point.y,
          });
          assertClose(
            convexBoundaryZ - flatBoundaryZ,
            expectedOffset,
            HEIGHT_TOLERANCE_MM,
            `${surfaceShape} ${point.name} side/top boundary should have no extra height`,
          );
        }
      }
    });

    await t.test("wide / rounded-edge / JIS convex body does not result in empty/broken mesh", async () => {
      const coverageCases = [
        {
          label: "wide cylindrical convex body",
          profile: "custom-shell",
          overrides: {
            keyWidth: 36,
            keyDepth: 18,
            topSurfaceShape: "cylindrical",
            dishDepth: -99,
          },
        },
        {
          label: "rounded-edge spherical convex body",
          profile: "custom-shell",
          overrides: {
            keycapEdgeRadius: 1,
            topSurfaceShape: "spherical",
            dishDepth: -99,
          },
        },
        {
          label: "JIS spherical convex body",
          profile: "jis-enter",
          overrides: {
            topSurfaceShape: "spherical",
            dishDepth: -99,
          },
        },
        {
          label: "typewriter spherical convex body",
          profile: "typewriter",
          overrides: {
            topSurfaceShape: "spherical",
            dishDepth: -99,
          },
        },
        {
          label: "typewriter JIS spherical convex body",
          profile: "typewriter-jis-enter",
          overrides: {
            topSurfaceShape: "spherical",
            dishDepth: -99,
          },
        },
      ];

      for (const coverageCase of coverageCases) {
        const rendered = await renderBody({
          bundle,
          wasmBinary,
          params: createBodyParams(
            registry.createDefaultKeycapParams(coverageCase.profile),
            coverageCase.overrides,
          ),
        });
        assertHealthyBody(rendered, coverageCase.label);
        assert.ok(rendered.geometry.dishDepth < 0, `${coverageCase.label} should retain negative depth`);
        assert.ok(
          rendered.bounds.maxZ
            > rendered.geometry.topCenterHeight + (Math.abs(rendered.geometry.dishDepth) * 0.8),
          `${coverageCase.label} should contain a visible convex peak`,
        );
        assert.ok(
          rendered.bounds.maxZ
            <= rendered.geometry.topCenterHeight + Math.abs(rendered.geometry.dishDepth) + HEIGHT_TOLERANCE_MM,
          `${coverageCase.label} should not contain excess peak height`,
        );
        assertClose(
          rendered.bounds.maxX - rendered.bounds.minX,
          rendered.geometry.keyWidth,
          0.02,
          `${coverageCase.label} should preserve key width`,
        );
        assertClose(
          rendered.bounds.maxY - rendered.bounds.minY,
          rendered.geometry.keyDepth,
          0.02,
          `${coverageCase.label} should preserve key depth`,
        );
      }
    });

    await t.test("JIS / typewriter also retains positive depth up to 1.5mm", async () => {
      for (const profile of ["jis-enter", "typewriter", "typewriter-jis-enter"]) {
        const rendered = await renderBody({
          bundle,
          wasmBinary,
          params: createBodyParams(registry.createDefaultKeycapParams(profile), {
            topSurfaceShape: "spherical",
            dishDepth: 99,
          }),
        });

        assertHealthyBody(rendered, `${profile} spherical concave body`);
        assertClose(rendered.geometry.dishDepth, 1.5, 1e-9, `${profile} should retain +1.5mm depth`);
        assert.ok(
          rendered.bounds.maxZ <= rendered.geometry.topCenterHeight + HEIGHT_TOLERANCE_MM,
          `${profile} concave body should not add excess height`,
        );
      }
    });

    await t.test("custom / JIS top-hat can also generate +/- 1.5mm curved surfaces", async () => {
      for (const profile of ["custom-shell", "jis-enter"]) {
        const convex = await renderBody({
          bundle,
          wasmBinary,
          params: createBodyParams(registry.createDefaultKeycapParams(profile), {
            topSurfaceShape: "flat",
            dishDepth: 0,
            topHatEnabled: true,
            topHatSurfaceShape: "spherical",
            topHatDishDepth: -99,
          }),
        });
        const concave = await renderBody({
          bundle,
          wasmBinary,
          params: createBodyParams(registry.createDefaultKeycapParams(profile), {
            topSurfaceShape: "flat",
            dishDepth: 0,
            topHatEnabled: true,
            topHatSurfaceShape: "spherical",
            topHatDishDepth: 99,
          }),
        });
        const convexDepth = readScadNumber(convex.jobScad, "user_top_hat_dish_depth");
        const concaveDepth = readScadNumber(concave.jobScad, "user_top_hat_dish_depth");

        assertHealthyBody(convex, `${profile} spherical convex top-hat body`);
        assertHealthyBody(concave, `${profile} spherical concave top-hat body`);
        assertClose(convexDepth, -1.5, 1e-9, `${profile} top-hat should clamp to -1.5mm`);
        assertClose(concaveDepth, 1.5, 1e-9, `${profile} top-hat should clamp to +1.5mm`);
        assertClose(
          convex.bounds.maxX - convex.bounds.minX,
          convex.geometry.keyWidth,
          0.02,
          `${profile} top-hat should preserve key width`,
        );
        assertClose(
          convex.bounds.maxY - convex.bounds.minY,
          convex.geometry.keyDepth,
          0.02,
          `${profile} top-hat should preserve key depth`,
        );
      }
    });

    await t.test("Even with negative spherical, flush legend curve tracking volume does not become empty", async () => {
      const rendered = await renderBody({
        bundle,
        wasmBinary,
        exportTarget: "legend",
        params: createBodyParams(registry.createDefaultKeycapParams("custom-shell"), {
          topSurfaceShape: "spherical",
          dishDepth: -99,
          legendEnabled: true,
          legendContentType: "icon",
          legendIconSet: "lucide",
          legendIconName: "circle",
          legendHeight: 0,
        }),
      });

      assertHealthyBody(rendered, "spherical convex flush legend");
      assert.ok(
        rendered.bounds.maxZ > rendered.geometry.topCenterHeight + (Math.abs(rendered.geometry.dishDepth) * 0.8),
        "flush legend should reach the convex surface",
      );
    });
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});
