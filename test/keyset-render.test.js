import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

// keyset-render.js pulls in the SCAD bundle, whose `?raw` imports only resolve
// through Vite, so the module is loaded the same way the other bridge tests do.
async function loadModules() {
  const server = await createServer({
    root: PROJECT_ROOT,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  const [renderer, keysets, registry] = await Promise.all([
    server.ssrLoadModule("/src/lib/keyset-render.js"),
    server.ssrLoadModule("/src/data/keysets/index.js"),
    server.ssrLoadModule("/src/data/keycap-shape-registry.js"),
  ]);

  return { server, renderer, keysets, registry };
}

function buildPlan({ renderer, keysets, registry }, options) {
  const keyset = keysets.buildKeyset({
    createDefaults: (profileKey) => registry.createDefaultKeycapParams(profileKey),
    ...options,
  });
  return { keyset, plan: renderer.planKeysetJobs(keyset) };
}

test("the keyset render planner", async (t) => {
  const modules = await loadModules();
  const { server, renderer } = modules;

  try {
    await t.test("requests only the parts each keycap actually has", () => {
      const { plan } = buildPlan(modules, {
        layoutId: "iso-105",
        primaryLanguageId: "de",
        secondaryLanguageId: "il",
      });
      const byCode = new Map(plan.keycaps.map((keycap) => [keycap.code, keycap]));

      // An empty legend slot renders an empty mesh, which OpenSCAD treats as an
      // error, so unused slots must not be requested at all.
      assert.deepEqual(
        byCode.get("AC01").parts.map((part) => part.exportTarget),
        ["body", "legend", "top_legend_right_bottom"],
        "a bilingual key needs body plus both legends",
      );
      assert.deepEqual(
        byCode.get("ESC").parts.map((part) => part.exportTarget),
        ["body", "legend"],
        "a key with no secondary needs no corner legend",
      );
      assert.deepEqual(
        byCode.get("SPCE").parts.map((part) => part.exportTarget),
        ["body"],
        "the blank spacebar needs only a body",
      );

      assert.equal(plan.keycaps.length, 105);
      assert.equal(plan.totalParts, 236);
    });

    await t.test("deduplicates identical geometry but not legend-bearing bodies", () => {
      const { plan } = buildPlan(modules, {
        layoutId: "iso-105",
        primaryLanguageId: "de",
        secondaryLanguageId: "il",
      });

      assert.ok(plan.uniqueJobs < plan.totalParts, "dedup should remove some work");
      // A legend is cut into the body, so caps with different legends have
      // genuinely different bodies and cannot share one. Only identical caps
      // collapse - which is why this saves ~10%, not ~60%.
      assert.ok(
        plan.uniqueJobs > plan.totalParts * 0.8,
        `expected only modest dedup, got ${plan.uniqueJobs} of ${plan.totalParts}`,
      );

      const bodyJobs = plan.jobs.filter((job) => job.exportTarget === "body").length;
      assert.ok(bodyJobs > 50, "bodies differ per legend, so most are unique");
      assert.ok(bodyJobs < 105, "the repeated modifier caps should still collapse");
    });

    await t.test("collapses keys that are genuinely identical", () => {
      // Both shift keys carry the same word on the same 1u-tall body, and both
      // control keys likewise, so each pair should share one set of jobs.
      const { plan } = buildPlan(modules, {
        layoutId: "iso-105",
        primaryLanguageId: "de",
        secondaryLanguageId: null,
      });
      const byCode = new Map(plan.keycaps.map((keycap) => [keycap.code, keycap]));

      const leftCtrl = byCode.get("LCTL").parts.map((part) => part.signature);
      const rightCtrl = byCode.get("RCTL").parts.map((part) => part.signature);
      assert.deepEqual(leftCtrl, rightCtrl, "the two Strg keys are the same cap");

      // The two shifts share a label but not a width, so they stay distinct.
      const leftShift = byCode.get("LFSH").parts[0].signature;
      const rightShift = byCode.get("RTSH").parts[0].signature;
      assert.notEqual(leftShift, rightShift, "1.25u and 2.75u shifts are different caps");
    });

    await t.test("shine-through changes the body, not just the legend", () => {
      const shine = buildPlan(modules, { primaryLanguageId: "de", shineThrough: true });
      const solid = buildPlan(modules, { primaryLanguageId: "de", shineThrough: false });

      const shineBody = shine.plan.keycaps.find((keycap) => keycap.code === "AC01").parts[0];
      const solidBody = solid.plan.keycaps.find((keycap) => keycap.code === "AC01").parts[0];

      assert.equal(shineBody.exportTarget, "body");
      assert.notEqual(
        shineBody.signature,
        solidBody.signature,
        "a legend cut through the shell gives a different body",
      );
    });

    await t.test("preview layers carry each keycap's board position", () => {
      const mesh = { vertices: [{ x: 0, y: 0, z: 0 }], faces: [[0, 0, 0]] };
      const layers = renderer.createKeysetPreviewLayers([
        {
          name: "AC01",
          position: { x: 42, y: -76, z: 0 },
          meshes: [
            { name: "keycap-body", colorHex: "#ffffff", ...mesh },
            { name: "keycap-legend", colorHex: "#000000", ...mesh },
          ],
        },
      ]);

      assert.equal(layers.length, 2);
      // The `keycap-` prefix is dropped so the names match the preview scene's
      // overlay-layer table, which is what gives legends their polygon offset.
      assert.deepEqual(layers.map((layer) => layer.name), ["body", "legend"]);
      for (const layer of layers) {
        assert.deepEqual(layer.offset, { x: 42, y: -76, z: 0 });
      }
    });

    await t.test("ANSI plans one fewer keycap than ISO", () => {
      const iso = buildPlan(modules, { layoutId: "iso-105", primaryLanguageId: "us" });
      const ansi = buildPlan(modules, { layoutId: "ansi-104", primaryLanguageId: "us" });

      assert.equal(iso.plan.keycaps.length, 105);
      assert.equal(ansi.plan.keycaps.length, 104);
      assert.ok(!ansi.plan.keycaps.some((keycap) => keycap.code === "LSGT"));
    });
  } finally {
    await server.close();
  }
});
