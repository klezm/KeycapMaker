import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

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

function readScadDefinition(scadText, name) {
  const match = scadText.match(new RegExp(`^${name} = ([^;]+);`, "m"));
  assert.ok(match, `${name} definition should exist`);
  return Number(match[1]);
}

function readRawScadDefinition(scadText, name) {
  const match = scadText.match(new RegExp(`^${name} = ([^;]+);`, "m"));
  assert.ok(match, `${name} definition should exist`);
  return match[1];
}

test("print work area includes the measured outline of multiple characters", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 240,
    actualBoundingBoxLeft: 122,
    actualBoundingBoxRight: 118,
    actualBoundingBoxAscent: 72,
    actualBoundingBoxDescent: 58,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendText: "薔薇",
        legendFontKey: "kurobara-cinderella-regular",
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    const textSize = readScadDefinition(jobScad, "user_legend_text_size");

    assert.equal(textSize, 5);
    assert.ok(readScadDefinition(jobScad, "user_legend_width") > textSize);
    assert.ok(readScadDefinition(jobScad, "user_legend_depth") > textSize);
    assert.equal(readScadDefinition(jobScad, "user_stem_cross_chamfer"), 0);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes user-added fonts to the runtime asset and SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const fontKey = "user-font:test-runtime-font";
    const fontBytes = new Uint8Array([10, 20, 30, 40]);
    bundle.registerUserKeycapLegendFont({
      key: fontKey,
      label: "Local Test Regular",
      fontName: "Local Test",
      fontQuery: "Local Test",
      fileName: "LocalTest-Regular.ttf",
      bytes: fontBytes,
      runtimePath: "/fonts/user/test-runtime-font.ttf",
    });

    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendText: "A",
        legendFontKey: fontKey,
      },
    });
    const fontAsset = files.find((file) => file.path === "/fonts/user/test-runtime-font.ttf");
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(fontAsset, "user font runtime asset should be included");
    assert.deepEqual(Array.from(fontAsset.content), Array.from(fontBytes));
    assert.equal(readRawScadDefinition(jobScad, "user_legend_font_name"), "\"Local Test\"");
    bundle.removeUserKeycapLegendFont(fontKey);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes Lucide icon prints to the runtime asset and SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendEnabled: true,
        legendText: "",
        legendContentType: "icon",
        legendIconSet: "lucide",
        legendIconName: "circle-power",
        legendOutlineDelta: 0.5,
      },
    });
    const iconAsset = files.find((file) => file.path === "/icons/lucide/circle-power.svg");
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(iconAsset, "lucide icon runtime asset should be included");
    assert.match(iconAsset.content, /<svg[^>]+viewBox="0 0 24 24"/);
    assert.match(iconAsset.content, /<svg[^>]+fill="#000000"[^>]+stroke="none"/);
    assert.ok((iconAsset.content.match(/M/g) ?? []).length > 1);
    assert.doesNotMatch(iconAsset.content, /stroke-width=/);
    assert.doesNotMatch(iconAsset.content, /<circle/);
    assert.equal(readRawScadDefinition(jobScad, "user_legend_content_type"), "\"icon\"");
    assert.equal(readRawScadDefinition(jobScad, "user_legend_icon_path"), "\"/icons/lucide/circle-power.svg\"");
    assert.equal(readScadDefinition(jobScad, "user_legend_outline_delta"), 0);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes non-Lucide icon sets to the runtime asset and SCAD wrapper as well", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendEnabled: true,
        legendText: "",
        legendContentType: "icon",
        legendIconSet: "font-awesome",
        legendIconName: "volume-up",
      },
    });
    const iconAsset = files.find((file) => file.path === "/icons/font-awesome/volume-high.svg");
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(iconAsset, "font awesome icon runtime asset should be included");
    assert.match(iconAsset.content, /<svg[^>]+viewBox="0 0 640 512"/);
    assert.equal(readRawScadDefinition(jobScad, "user_legend_icon_path"), "\"/icons/font-awesome/volume-high.svg\"");
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("icon fill setting is reflected as a bool in the runtime asset and SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const materialFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendEnabled: true,
        legendContentType: "icon",
        legendIconSet: "material-symbols",
        legendIconName: "circle",
        legendIconFill: false,
        topLegendLeftTopEnabled: true,
        topLegendLeftTopContentType: "icon",
        topLegendLeftTopIconSet: "material-symbols",
        topLegendLeftTopIconName: "circle",
        topLegendLeftTopIconFill: true,
      },
    });
    const materialOutlineAsset = materialFiles.find((file) => file.path === "/icons/material-symbols/circle.svg");
    const materialFilledAsset = materialFiles.find((file) => file.path === "/icons/material-symbols/circle-fill.svg");
    const materialJobScad = materialFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(materialOutlineAsset, "material outlined icon runtime asset should be included");
    assert.ok(materialFilledAsset, "material filled icon runtime asset should be included");
    assert.notEqual(materialOutlineAsset.content, materialFilledAsset.content);
    assert.equal(readRawScadDefinition(materialJobScad, "user_legend_icon_path"), "\"/icons/material-symbols/circle.svg\"");
    assert.equal(
      readRawScadDefinition(materialJobScad, "user_top_legend_left_top_icon_path"),
      "\"/icons/material-symbols/circle-fill.svg\"",
    );

    const materialWithoutFillVariantFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendEnabled: true,
        legendContentType: "icon",
        legendIconSet: "material-symbols",
        legendIconName: "arrow-forward",
        legendIconFill: true,
      },
    });
    const materialWithoutFillVariantAsset = materialWithoutFillVariantFiles.find((file) => file.path === "/icons/material-symbols/arrow-forward.svg");
    const materialUnexpectedFillAsset = materialWithoutFillVariantFiles.find((file) => file.path === "/icons/material-symbols/arrow-forward-fill.svg");
    const materialWithoutFillVariantJobScad = materialWithoutFillVariantFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(materialWithoutFillVariantAsset, "material icon without a distinct filled variant should use the base runtime asset");
    assert.equal(materialUnexpectedFillAsset, undefined);
    assert.equal(
      readRawScadDefinition(materialWithoutFillVariantJobScad, "user_legend_icon_path"),
      "\"/icons/material-symbols/arrow-forward.svg\"",
    );

    const remixFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendEnabled: true,
        legendContentType: "icon",
        legendIconSet: "remix-icon",
        legendIconName: "circle-line",
        legendIconFill: true,
      },
    });
    const remixFilledAsset = remixFiles.find((file) => file.path === "/icons/remix-icon/circle-fill.svg");
    const remixJobScad = remixFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(remixFilledAsset, "remix filled icon runtime asset should be included");
    assert.match(remixFilledAsset.content, /viewBox="0 0 24 24"/);
    assert.equal(readRawScadDefinition(remixJobScad, "user_legend_icon_path"), "\"/icons/remix-icon/circle-fill.svg\"");
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes the stem entrance chamfer amount to the SCAD wrapper", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        stemCrossChamfer: 0.25,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_stem_cross_chamfer"), 0.25);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("preserves negative stem start position offsets in the SCAD wrapper and base", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        stemInsetDelta: -0.6,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const baseScad = files.find((file) => file.path === bundle.KEYCAP_ENTRY_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.ok(baseScad, "keycap base SCAD should be included");
    assert.equal(readScadDefinition(jobScad, "user_stem_inset_delta"), -0.6);
    assert.match(baseScad, /stem_nominal_inset_for_type\(stem_type\) \+ stem_inset_delta/);
    assert.match(baseScad, /stem_clip_bottom_extension = max\(1, stem_clip_overlap - stem_inset \+ 0\.02\);/);
    assert.match(baseScad, /bottom_extension = stem_clip_bottom_extension/);
    assert.doesNotMatch(baseScad, /max\(stem_nominal_inset_for_type\(stem_type\) \+ stem_inset_delta,\s*0\)/);
    assert.doesNotMatch(baseScad, /max\(user_stem_inset,\s*0\)/);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("bundles the J-STEM-LP01 socket SCAD and passes stemType to the wrapper", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "body",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        stemType: "j_stem_lp01",
        stemCrossMargin: 0.08,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const baseScad = files.find((file) => file.path === bundle.KEYCAP_ENTRY_PATH)?.content;
    const receiverScad = files.find((file) => file.path === "/scad/modules/stem_j_stem_lp01.scad")?.content;
    const nominalsScad = files.find((file) => file.path === "/scad/presets/stem-nominals.scad")?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.ok(baseScad, "keycap base SCAD should be included");
    assert.ok(receiverScad, "J-STEM-LP01 receiver module should be bundled");
    assert.ok(nominalsScad, "J-STEM-LP01 nominal dimensions should be bundled");
    assert.equal(readRawScadDefinition(jobScad, "user_stem_type"), "\"j_stem_lp01\"");
    assert.equal(readScadDefinition(jobScad, "user_stem_cross_margin"), 0.08);
    assert.match(baseScad, /clearance = stem_j_stem_lp01_nominal_recess_clearance \+ stem_cross_margin \+ stem_outer_delta/);
    assert.match(baseScad, /receiver_recess_stem_type\(stem_type\)/);
    assert.match(baseScad, /module keycap_trim_stem_receiver_recess/);
    assert.match(baseScad, /keycap_top_legends_volume\(quality = "export"\)\s*\{\s*keycap_trim_stem_receiver_recess\(quality\)/);
    assert.match(baseScad, /module keycap_legend\(quality = "export"\)\s*\{\s*keycap_trim_stem_receiver_recess\(quality\)/);
    assert.match(baseScad, /stem_receiver_mount_z = keycap_inner_height\(top_center_height, dish_depth, top_thickness\);/);
    assert.match(baseScad, /keycap_top_plane_transform\(stem_receiver_mount_z, top_pitch_deg, top_roll_deg, top_offset_x, top_offset_y\)/);
    assert.match(baseScad, /j_stem_lp01_receiver_recess/);
    assert.match(baseScad, /hole_pitch_y = stem_j_stem_lp01_nominal_hole_pitch_y/);
    assert.match(baseScad, /hole_diameter = stem_j_stem_lp01_nominal_hole_diameter/);
    assert.match(baseScad, /resolved_export_target == "j_stem_lp01_reference"/);
    assert.match(baseScad, /resolved_export_target == "top_hat"/);
    assert.match(baseScad, /module keycap_top_hat\(quality = "export"\)/);
    assert.match(baseScad, /keycap_body_shell_mount_cut\(quality, include_separate_top_hat = true\)/);
    assert.match(receiverScad, /module j_stem_lp01_model/);
    assert.match(receiverScad, /module j_stem_lp01_receiver_recess[\s\S]*include_holes = true/);
    assert.match(receiverScad, /hole_pitch_x = 8\.11/);
    assert.match(receiverScad, /translate\(\[0, 0, -post_height\]\)/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_top_view_height = 12\.20;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_nominal_plate_width = 12\.21;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_hole_pitch_x = 8\.11;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_hole_pitch_y = 8\.11;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_cross_width_horizontal = 1\.20;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_cross_width_vertical = 1\.20;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_plate_thickness = 0\.80;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_nominal_recess_clearance = 0;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_post_diameter = 5\.40;/);
    assert.match(nominalsScad, /stem_j_stem_lp01_drawing_post_height = 3\.78;/);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("negative dishDepth values are passed to SCAD as a cylindrical / spherical bulge", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const cylindricalFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topSurfaceShape: "cylindrical",
        dishDepth: -1.2,
      },
    });
    const sphericalFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topSurfaceShape: "spherical",
        dishDepth: -1.2,
      },
    });
    const cylindricalJobScad = cylindricalFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const sphericalJobScad = sphericalFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const baseScad = sphericalFiles.find((file) => file.path === bundle.KEYCAP_ENTRY_PATH)?.content;
    const shellScad = sphericalFiles.find((file) => file.path === "/scad/modules/keycap_shell.scad")?.content;
    const jisEnterScad = sphericalFiles.find((file) => file.path === "/scad/modules/keycap_jis_enter.scad")?.content;

    assert.ok(cylindricalJobScad, "cylindrical keycap job SCAD should be generated");
    assert.ok(sphericalJobScad, "spherical keycap job SCAD should be generated");
    assert.ok(baseScad, "keycap base SCAD should be included");
    assert.ok(shellScad, "keycap shell module should be included");
    assert.ok(jisEnterScad, "JIS Enter module should be included");
    assert.equal(readRawScadDefinition(cylindricalJobScad, "user_top_shape_type"), "\"cylindrical\"");
    assert.equal(readScadDefinition(cylindricalJobScad, "user_dish_depth"), -1.2);
    assert.equal(readRawScadDefinition(sphericalJobScad, "user_top_shape_type"), "\"spherical\"");
    assert.equal(readScadDefinition(sphericalJobScad, "user_dish_depth"), -1.2);
    assert.match(baseScad, /keycap_clamp_dish_depth\(/);
    assert.match(baseScad, /abs\(requested_dish_depth\) > 0\.001 \? "spherical" : "flat"/);
    assert.match(shellScad, /min\(max\(dish_depth, -depth_limit\), depth_limit\)/);
    assert.match(shellScad, /dish_type == "flat"[\s\S]*\? 0[\s\S]*: 1\.5;/);
    assert.match(shellScad, /top_center_height - max\(dish_depth, 0\) - top_thickness/);
    assert.match(shellScad, /base_z = surface_z_shift/);
    assert.match(shellScad, /module keycap_top_tapered_prism\(/);
    assert.match(shellScad, /bump_clip_height = abs\(dish_depth\) \+ 0\.05;/);
    assert.match(shellScad, /bump_front_slope = tan\(front_angle\)/);
    assert.match(jisEnterScad, /dish_start_left = top_left[\s\S]*dish_start_back = top_back/);
    assert.match(jisEnterScad, /module keycap_jis_enter_top_tapered_prism\(/);
    assert.match(jisEnterScad, /bump_front_slope = tan\(front_angle\)/);
    assert.match(jisEnterScad, /base_z = surface_z_shift/);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("excessive dishDepth is clamped to a range of plus or minus 1.5mm in the SCAD wrapper", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const cylindricalFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topSurfaceShape: "cylindrical",
        dishDepth: 2,
      },
    });
    const sphericalFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topSurfaceShape: "spherical",
        dishDepth: 2,
      },
    });
    const cylindricalJobScad = cylindricalFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const sphericalJobScad = sphericalFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(cylindricalJobScad, "cylindrical keycap job SCAD should be generated");
    assert.ok(sphericalJobScad, "spherical keycap job SCAD should be generated");
    assert.equal(readScadDefinition(cylindricalJobScad, "user_dish_depth"), 1.5);
    assert.equal(readScadDefinition(sphericalJobScad, "user_dish_depth"), 1.5);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("ensures the keytop print's curve-following area is preserved even with a deep dish", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "legend",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topSurfaceShape: "spherical",
        dishDepth: 1.45,
      },
    });
    const baseScad = files.find((file) => file.path === bundle.KEYCAP_ENTRY_PATH)?.content;
    const shellScad = files.find((file) => file.path === "/scad/modules/keycap_shell.scad")?.content;

    assert.ok(baseScad, "keycap base SCAD should be included");
    assert.ok(shellScad, "keycap shell module should be included");
    assert.match(shellScad, /function keycap_dish_start_radial_sq/);
    assert.match(shellScad, /dish_z_scale = max\(abs\(dish_depth\), 0\.001\) \/ start_sag;/);
    assert.match(shellScad, /dish_start_left = resolved_dish_start_left/);
    assert.match(shellScad, /function keycap_dish_max_drop\(dish_type, dish_depth\)/);
    assert.match(shellScad, /function keycap_dish_max_rise\(dish_type, dish_depth\)/);
    assert.match(shellScad, /module keycap_top_surface_band/);
    assert.match(baseScad, /surface_fit_drop = keycap_dish_max_drop\(active_top_shape_type, active_dish_depth\) \+ 0\.05;/);
    assert.match(baseScad, /surface_fit_rise = keycap_dish_max_rise\(active_top_shape_type, active_dish_depth\);/);
    assert.match(baseScad, /height = effective_total_height \+ surface_fit_drop \+ surface_fit_rise/);
    assert.match(baseScad, /below_surface = below_surface \+ surface_fit_drop/);
    assert.match(baseScad, /keycap_top_surface_band\(/);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes sidewall print parameters to the SCAD wrapper", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 160,
    actualBoundingBoxLeft: 80,
    actualBoundingBoxRight: 80,
    actualBoundingBoxAscent: 65,
    actualBoundingBoxDescent: 35,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "side_legend_front",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        sideLegendFrontEnabled: true,
        sideLegendFrontText: "FRONT",
        sideLegendFrontFontKey: "orbitron-regular",
        sideLegendFrontSize: 3.2,
        sideLegendFrontHeight: 0.15,
        sideLegendFrontOffsetX: 1.25,
        sideLegendFrontOffsetY: -0.5,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.ok(files.some((file) => file.path === "/scad/modules/sidewall_legend.scad"));
    assert.equal(readRawScadDefinition(jobScad, "export_target"), "\"side_legend_front\"");
    assert.equal(readRawScadDefinition(jobScad, "user_side_legend_front_enabled"), "true");
    assert.equal(readRawScadDefinition(jobScad, "user_side_legend_front_text"), "\"FRONT\"");
    assert.equal(readScadDefinition(jobScad, "user_side_legend_front_text_size"), 3.2);
    assert.equal(readScadDefinition(jobScad, "user_side_legend_front_height"), 0.15);
    assert.doesNotMatch(jobScad, /^user_side_legend_front_embed = /m);
    assert.equal(readScadDefinition(jobScad, "user_side_legend_front_offset_x"), 1.25);
    assert.equal(readScadDefinition(jobScad, "user_side_legend_front_offset_y"), -0.5);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes keytop corner print parameters to the SCAD wrapper", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 140,
    actualBoundingBoxLeft: 70,
    actualBoundingBoxRight: 70,
    actualBoundingBoxAscent: 55,
    actualBoundingBoxDescent: 25,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "top_legend_right_top",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topLegendRightTopEnabled: true,
        topLegendRightTopText: "2",
        topLegendRightTopFontKey: "orbitron-regular",
        topLegendRightTopSize: 3.2,
        topLegendRightTopHeight: 0.2,
        topLegendRightTopEmbed: 0.4,
        topLegendRightTopOffsetX: 0.75,
        topLegendRightTopOffsetY: -0.25,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const baseScad = files.find((file) => file.path === bundle.KEYCAP_ENTRY_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.ok(baseScad, "keycap base SCAD should be included");
    assert.equal(readRawScadDefinition(jobScad, "export_target"), "\"top_legend_right_top\"");
    assert.equal(readRawScadDefinition(jobScad, "user_top_legend_right_top_enabled"), "true");
    assert.equal(readRawScadDefinition(jobScad, "user_top_legend_right_top_text"), "\"2\"");
    assert.equal(readScadDefinition(jobScad, "user_top_legend_right_top_text_size"), 3.2);
    assert.equal(readScadDefinition(jobScad, "user_top_legend_right_top_height"), 0.2);
    assert.equal(readScadDefinition(jobScad, "user_top_legend_right_top_embed"), 0.4);
    assert.equal(readScadDefinition(jobScad, "user_top_legend_right_top_offset_x"), 0.75);
    assert.equal(readScadDefinition(jobScad, "user_top_legend_right_top_offset_y"), -0.25);
    assert.match(baseScad, /module keycap_top_legend_right_top/);
    assert.match(baseScad, /resolved_export_target == "top_legend_right_top"/);
    assert.match(baseScad, /top_legend_anchor_offset_ratio = 0\.25;/);
    assert.match(baseScad, /keycap_top_legends_visible_volume\(quality\);/);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes negative print height to the SCAD wrapper and recessed legend processing", async () => {
  const restoreBrowserMocks = installBrowserMocks({
    width: 120,
    actualBoundingBoxLeft: 60,
    actualBoundingBoxRight: 60,
    actualBoundingBoxAscent: 50,
    actualBoundingBoxDescent: 20,
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        legendHeight: -0.4,
        topLegendRightTopHeight: -0.25,
        sideLegendFrontHeight: -0.3,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const baseScad = files.find((file) => file.path === bundle.KEYCAP_ENTRY_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.ok(baseScad, "keycap base SCAD should be included");
    assert.equal(readScadDefinition(jobScad, "user_legend_height"), -0.4);
    assert.equal(readScadDefinition(jobScad, "user_top_legend_right_top_height"), -0.25);
    assert.equal(readScadDefinition(jobScad, "user_side_legend_front_height"), -0.3);
    assert.match(baseScad, /legend_height = required_param\(user_legend_height, "user_legend_height"\);/);
    assert.match(baseScad, /effective_surface_height = top_overlap > 0 && surface_height < 0/);
    assert.match(baseScad, /surface_height < 0 \? -surface_height \+ side_legend_floor_thickness : 0/);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("sidewall print body stops at the inner surface", async () => {
  const baseScad = await readFile(new URL("../scad/base/keycap.scad", import.meta.url), "utf8");

  assert.match(baseScad, /function keycap_sidewall_wall_depth\(side, axis_z\)/);
  assert.match(baseScad, /below_surface = max\(/);
  assert.match(baseScad, /keycap_sidewall_wall_depth\(side, axis_z\) \+ max\(inner_overlap, 0\)/);
  assert.doesNotMatch(baseScad, /side_legend_through_wall_embed\s*=\s*wall_thickness\s*\+/);
});

test("print work area is not capped by the key's footprint", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        keyWidth: 36,
        keyDepth: 18,
        legendSize: 10,
        legendText: "デジタル",
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_legend_text_size"), 10);
    assert.ok(readScadDefinition(jobScad, "user_legend_width") > 36);
    assert.ok(readScadDefinition(jobScad, "user_legend_depth") > 18);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("topScale for a square key shrinks the top surface while keeping it square", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const keyWidth = 18;
    const keyDepth = 18;
    const topCenterHeight = 9.5;
    const topScale = 0.5;
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        keyWidth,
        keyDepth,
        topCenterHeight,
        topScale,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    const frontAngle = readScadDefinition(jobScad, "user_profile_front_angle");
    const leftAngle = readScadDefinition(jobScad, "user_profile_left_angle");
    const topWidth = keyWidth - topCenterHeight * Math.tan(leftAngle * Math.PI / 180) * 2;
    const topDepth = keyDepth - topCenterHeight * Math.tan(frontAngle * Math.PI / 180) * 2;

    assert.ok(Math.abs(frontAngle - leftAngle) < 1e-9);
    assert.ok(Math.abs(topWidth - keyWidth * topScale) < 1e-9);
    assert.ok(Math.abs(topDepth - keyDepth * topScale) < 1e-9);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes sidewall wall thickness and keytop wall thickness as separate SCAD parameters", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        wallThickness: 1.1,
        topThickness: 2.4,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_wall_thickness"), 1.1);
    assert.equal(readScadDefinition(jobScad, "user_top_thickness"), 2.4);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("topScale converts low values for pointed top surfaces into a SCAD angle", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const keyWidth = 18;
    const keyDepth = 18;
    const topCenterHeight = 9.5;
    const topScale = 0.02;
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        keyWidth,
        keyDepth,
        topCenterHeight,
        topScale,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    const frontAngle = readScadDefinition(jobScad, "user_profile_front_angle");
    const leftAngle = readScadDefinition(jobScad, "user_profile_left_angle");
    const topWidth = keyWidth - topCenterHeight * Math.tan(leftAngle * Math.PI / 180) * 2;
    const topDepth = keyDepth - topCenterHeight * Math.tan(frontAngle * Math.PI / 180) * 2;

    assert.ok(Math.abs(frontAngle - leftAngle) < 1e-9);
    assert.ok(Math.abs(topWidth - keyWidth * topScale) < 1e-9);
    assert.ok(Math.abs(topDepth - keyDepth * topScale) < 1e-9);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes the custom shell's top radius to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topCornerRadius: 2.5,
        topCornerRadiusIndividualEnabled: true,
        topCornerRadiusLeftTop: 1,
        topCornerRadiusRightTop: 2,
        topCornerRadiusRightBottom: 3,
        topCornerRadiusLeftBottom: 4,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_top_corner_radius"), 2.5);
    assert.equal(readRawScadDefinition(jobScad, "user_top_corner_individual_enabled"), "true");
    assert.equal(readRawScadDefinition(jobScad, "user_top_corner_radii"), "[1, 2, 3, 4]");
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes the keycap body's shoulder radius to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        keyWidth: 18,
        keyDepth: 18,
        topCenterHeight: 9.5,
        topScale: 0.75,
        keycapShoulderRadius: -99,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_keycap_shoulder_radius"), -2.25);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes the keytop top edge radius to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        keyWidth: 18,
        keyDepth: 18,
        topCenterHeight: 9.5,
        topScale: 0.75,
        keycapEdgeRadius: 99,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_keycap_edge_radius"), 2.25);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes typewriter's top reference height to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("typewriter"),
        typewriterMountHeight: 14.2,
        topOffsetX: 1.5,
        topOffsetY: -2.25,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.equal(readScadDefinition(jobScad, "user_typewriter_mount_height"), 14.2);
    assert.equal(readScadDefinition(jobScad, "user_top_offset_x"), 1.5);
    assert.equal(readScadDefinition(jobScad, "user_top_offset_y"), -2.25);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes JIS enter's geometry and notch dimensions to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("jis-enter"),
        jisEnterNotchWidth: 4.5,
        jisEnterNotchDepth: 18,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.match(jobScad, /^user_shape_geometry_type = "jis_enter";/m);
    assert.equal(readScadDefinition(jobScad, "user_jis_enter_notch_width"), 4.5);
    assert.equal(readScadDefinition(jobScad, "user_jis_enter_notch_depth"), 18);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes top-hat parameters for supported shapes to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const customFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topHatEnabled: true,
        topHatSeparateColorEnabled: true,
        topHatTopWidth: 11.2,
        topHatTopDepth: 9.4,
        topHatBottomWidth: 12.6,
        topHatBottomDepth: 10.8,
        topHatTopRadius: 1.3,
        topHatTopRadiusIndividualEnabled: true,
        topHatTopRadiusLeftTop: 0.7,
        topHatTopRadiusRightTop: 1.1,
        topHatTopRadiusRightBottom: 1.9,
        topHatTopRadiusLeftBottom: 1.5,
        topHatBottomRadius: 2.6,
        topHatBottomRadiusIndividualEnabled: true,
        topHatBottomRadiusLeftTop: 0.4,
        topHatBottomRadiusRightTop: 0.8,
        topHatBottomRadiusRightBottom: 1.2,
        topHatBottomRadiusLeftBottom: 1.6,
        topHatHeight: 1.1,
        topHatShoulderAngle: 50,
        topHatShoulderRadius: 0.7,
        topHatSurfaceShape: "cylindrical",
        topHatDishDepth: 0.5,
      },
    });
    const recessedFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topHatEnabled: true,
        topHatHeight: -0.8,
        topHatShoulderRadius: -0.4,
      },
    });
    const raisedTopHatFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topHatEnabled: true,
        topHatSurfaceShape: "spherical",
        topHatDishDepth: -4,
      },
    });
    const jisFiles = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("jis-enter"),
        topHatEnabled: true,
        topHatInset: 2.2,
        topHatTopRadius: 1.4,
        topHatBottomRadius: 2.8,
        topHatHeight: 1.2,
        topHatShoulderAngle: 55,
        topHatShoulderRadius: 0.5,
        topHatSurfaceShape: "spherical",
        topHatDishDepth: 0.8,
      },
    });
    const topHatTargetFiles = await bundle.createKeycapFiles({
      exportTarget: "top_hat",
      params: {
        ...registry.createDefaultKeycapParams("custom-shell"),
        topHatEnabled: true,
        topHatSeparateColorEnabled: true,
      },
    });
    const customJobScad = customFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const recessedJobScad = recessedFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const raisedTopHatJobScad = raisedTopHatFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const jisJobScad = jisFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;
    const topHatTargetJobScad = topHatTargetFiles.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(customJobScad, "custom shell job SCAD should be generated");
    assert.ok(recessedJobScad, "custom shell recessed top-hat job SCAD should be generated");
    assert.ok(raisedTopHatJobScad, "custom shell raised top-hat job SCAD should be generated");
    assert.ok(jisJobScad, "JIS Enter job SCAD should be generated");
    assert.ok(topHatTargetJobScad, "top-hat target job SCAD should be generated");
    assert.equal(readRawScadDefinition(topHatTargetJobScad, "export_target"), "\"top_hat\"");
    assert.match(customJobScad, /^user_shape_geometry_type = "shell";/m);
    assert.match(customJobScad, /^user_top_hat_enabled = true;/m);
    assert.match(customJobScad, /^user_top_hat_separate_enabled = true;/m);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_top_width"), 11.2);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_top_depth"), 9.4);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_bottom_width"), 12.6);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_bottom_depth"), 10.8);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_top_radius"), 1.3);
    assert.equal(readRawScadDefinition(customJobScad, "user_top_hat_top_radius_individual_enabled"), "true");
    assert.equal(readRawScadDefinition(customJobScad, "user_top_hat_top_radii"), "[0.7, 1.1, 1.9, 1.5]");
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_bottom_radius"), 2.6);
    assert.equal(readRawScadDefinition(customJobScad, "user_top_hat_bottom_radius_individual_enabled"), "true");
    assert.equal(readRawScadDefinition(customJobScad, "user_top_hat_bottom_radii"), "[0.4, 0.8, 1.2, 1.6]");
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_height"), 1.1);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_shoulder_angle"), 50);
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_shoulder_radius"), 0.7);
    assert.equal(readRawScadDefinition(customJobScad, "user_top_hat_shape_type"), "\"cylindrical\"");
    assert.equal(readScadDefinition(customJobScad, "user_top_hat_dish_depth"), 0.5);
    assert.equal(readScadDefinition(recessedJobScad, "user_top_hat_height"), -0.8);
    assert.match(recessedJobScad, /^user_top_hat_separate_enabled = false;/m);
    assert.equal(readScadDefinition(recessedJobScad, "user_top_hat_shoulder_radius"), -0.4);
    assert.equal(readRawScadDefinition(recessedJobScad, "user_top_hat_shape_type"), "\"flat\"");
    assert.equal(readScadDefinition(recessedJobScad, "user_top_hat_dish_depth"), 0);
    assert.equal(readRawScadDefinition(raisedTopHatJobScad, "user_top_hat_shape_type"), "\"spherical\"");
    assert.equal(readScadDefinition(raisedTopHatJobScad, "user_top_hat_dish_depth"), -1.5);
    assert.match(jisJobScad, /^user_shape_geometry_type = "jis_enter";/m);
    assert.match(jisJobScad, /^user_top_hat_enabled = true;/m);
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_inset"), 2.2);
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_top_radius"), 1.4);
    assert.equal(readRawScadDefinition(jisJobScad, "user_top_hat_top_radius_individual_enabled"), "false");
    assert.equal(readRawScadDefinition(jisJobScad, "user_top_hat_top_radii"), "[1.4, 1.4, 1.4, 1.4]");
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_bottom_radius"), 2.8);
    assert.equal(readRawScadDefinition(jisJobScad, "user_top_hat_bottom_radius_individual_enabled"), "false");
    assert.equal(readRawScadDefinition(jisJobScad, "user_top_hat_bottom_radii"), "[2.8, 2.8, 2.8, 2.8]");
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_height"), 1.2);
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_shoulder_angle"), 55);
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_shoulder_radius"), 0.5);
    assert.equal(readRawScadDefinition(jisJobScad, "user_top_hat_shape_type"), "\"spherical\"");
    assert.equal(readScadDefinition(jisJobScad, "user_top_hat_dish_depth"), 0.8);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});

test("passes typewriter JIS enter's geometry and mount / notch dimensions to the SCAD wrapper", async () => {
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
    const [bundle, registry] = await Promise.all([
      server.ssrLoadModule("/src/lib/keycap-scad-bundle.js"),
      server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
    ]);
    const files = await bundle.createKeycapFiles({
      exportTarget: "preview",
      params: {
        ...registry.createDefaultKeycapParams("typewriter-jis-enter"),
        typewriterMountHeight: 14.2,
        jisEnterNotchWidth: 4.5,
        jisEnterNotchDepth: 18,
      },
    });
    const jobScad = files.find((file) => file.path === bundle.KEYCAP_JOB_PATH)?.content;

    assert.ok(jobScad, "keycap job SCAD should be generated");
    assert.match(jobScad, /^user_shape_geometry_type = "typewriter_jis_enter";/m);
    assert.equal(readScadDefinition(jobScad, "user_typewriter_mount_height"), 14.2);
    assert.equal(readScadDefinition(jobScad, "user_jis_enter_notch_width"), 4.5);
    assert.equal(readScadDefinition(jobScad, "user_jis_enter_notch_depth"), 18);
  } finally {
    await server.close();
    restoreBrowserMocks();
  }
});
