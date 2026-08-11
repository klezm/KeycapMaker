// Render a whole keycap set in the browser.
//
// A full-size board is 104-105 caps and roughly 236 parts. Two things keep that
// tractable, though neither is a silver bullet:
//
//   - A worker pool, so several jobs run at once instead of one at a time. This
//     is where nearly all of the speed comes from.
//   - Deduplication by geometry signature. This saves less than it first looks
//     like it should: a legend is *cut into* the body (a shine-through legend
//     punches through it, a flush one recesses into it), so a cap's body is not
//     reusable across caps with different legends. Only genuinely identical
//     caps collapse - repeated labels like "Strg" on both sides, or the digits
//     that appear on both the number row and the numpad. In practice an ISO-105
//     German+Hebrew board goes from 236 parts to about 213 jobs.
//
// Results are memoised by signature across runs, so re-rendering after a change
// only pays for what actually differs. Note that changing either language
// invalidates the bodies too, for the same reason: the legend is part of the
// body's geometry.
//
// Preview and export share these meshes. The SCAD bridge never passes a quality
// override, so there is exactly one geometry, and exporting after a preview
// needs no re-render.

import { buildKeycapArgs, createKeycapFiles } from "./keycap-scad-bundle.js";
import { createOpenScadPool } from "./openscad-client.js";
import { parseOff } from "./off-parser.js";

const OUTPUT_PATH = "/outputs/keyset-part.off";
const textDecoder = new TextDecoder();

// Keyed by job signature. Meshes are immutable once rendered, so they are safe
// to hand to several keycaps at once - which is also what lets the preview
// share one GPU geometry across every 1u body.
const meshCache = new Map();

export function clearKeysetMeshCache() {
  meshCache.clear();
}

export function getKeysetMeshCacheSize() {
  return meshCache.size;
}

/**
 * Params that change a body's geometry.
 *
 * The legend params belong here: `keycap_body_shell` subtracts the legend
 * volume from the shell, so two caps that differ only in their legend still
 * have different bodies.
 */
function createBodySignature(params) {
  return [
    "body",
    params.shapeProfile,
    params.keyWidth,
    params.keyDepth,
    params.topCenterHeight,
    params.topThickness,
    params.topScale,
    params.topSurfaceShape,
    params.dishDepth,
    params.stemType,
    params.stemEnabled,
    params.homingBarEnabled,
    params.jisEnterNotchWidth ?? 0,
    params.jisEnterNotchDepth ?? 0,
    params.legendEnabled ? [
      params.legendText,
      params.legendFontKey,
      params.legendFontStyleKey,
      params.legendSize,
      params.legendOffsetX,
      params.legendOffsetY,
      params.legendShineThroughEnabled,
      params.legendEmbed,
      params.legendHeight,
    ].join("~") : "",
    params.topLegendRightBottomEnabled ? [
      params.topLegendRightBottomText,
      params.topLegendRightBottomFontKey,
      params.topLegendRightBottomFontStyleKey,
      params.topLegendRightBottomSize,
      params.topLegendRightBottomOffsetX,
      params.topLegendRightBottomOffsetY,
      params.topLegendRightBottomShineThroughEnabled,
      params.topLegendRightBottomEmbed,
      params.topLegendRightBottomHeight,
    ].join("~") : "",
  ].join("|");
}

/** Params that change one legend's geometry, including the surface it sits on. */
function createLegendSignature(params, slot) {
  const prefix = slot === "legend" ? "legend" : "topLegendRightBottom";
  const surface = [
    params.shapeProfile,
    params.keyWidth,
    params.keyDepth,
    params.topCenterHeight,
    params.topThickness,
    params.topScale,
    params.topSurfaceShape,
    params.dishDepth,
  ].join("~");

  return [
    slot,
    surface,
    params[`${prefix}Text`],
    params[`${prefix}FontKey`],
    params[`${prefix}FontStyleKey`],
    params[`${prefix}Size`],
    params[`${prefix}OffsetX`],
    params[`${prefix}OffsetY`],
    params[`${prefix}Height`],
    params[`${prefix}Embed`],
    params[`${prefix}ShineThroughEnabled`],
  ].join("|");
}

/**
 * The parts one keycap needs. An empty legend slot yields an empty mesh, which
 * OpenSCAD treats as an error, so only enabled slots are requested.
 */
function planKeycapParts(params) {
  const parts = [{
    name: "keycap-body",
    exportTarget: "body",
    colorHex: params.bodyColor,
    signature: createBodySignature(params),
  }];

  if (params.legendEnabled) {
    parts.push({
      name: "keycap-legend",
      exportTarget: "legend",
      colorHex: params.legendColor,
      signature: createLegendSignature(params, "legend"),
    });
  }

  if (params.topLegendRightBottomEnabled) {
    parts.push({
      name: "keycap-legend-right-bottom",
      exportTarget: "top_legend_right_bottom",
      colorHex: params.topLegendRightBottomColor,
      signature: createLegendSignature(params, "top_legend_right_bottom"),
    });
  }

  return parts;
}

/**
 * Work out what actually has to be rendered for a keyset.
 *
 * Returns the per-keycap part list plus the deduplicated job list, so callers
 * (and tests) can see how much the dedup saved before committing to a run.
 */
export function planKeysetJobs(keyset) {
  const keycaps = keyset.keys.map((key) => ({
    code: key.code,
    position: key.position,
    params: key.params,
    parts: planKeycapParts(key.params),
  }));

  const jobsBySignature = new Map();
  for (const keycap of keycaps) {
    for (const part of keycap.parts) {
      if (!jobsBySignature.has(part.signature)) {
        jobsBySignature.set(part.signature, {
          signature: part.signature,
          exportTarget: part.exportTarget,
          params: keycap.params,
        });
      }
    }
  }

  const jobs = [...jobsBySignature.values()];
  const totalParts = keycaps.reduce((total, keycap) => total + keycap.parts.length, 0);

  return {
    keycaps,
    jobs,
    totalParts,
    uniqueJobs: jobs.length,
    cachedJobs: jobs.filter((job) => meshCache.has(job.signature)).length,
  };
}

async function renderJob(pool, job) {
  const files = await createKeycapFiles({ params: job.params, exportTarget: job.exportTarget });
  const result = await pool.run({
    files,
    args: buildKeycapArgs({ outputPath: OUTPUT_PATH, outputFormat: "off" }),
    outputPaths: [OUTPUT_PATH],
  });

  const [output] = result.outputs;
  if (!output) {
    throw new Error(`OpenSCAD produced no output for ${job.exportTarget}`);
  }

  const mesh = parseOff(textDecoder.decode(output.bytes));
  if (mesh.vertices.length === 0) {
    const logs = result.logs.map((entry) => entry.text).join("\n");
    throw new Error(`OpenSCAD produced an empty mesh for ${job.exportTarget}:\n${logs}`);
  }

  return mesh;
}

/**
 * Render every part of a keyset.
 *
 * `onProgress({ done, total })` fires as jobs complete and `onKeycap(keycap)`
 * as each cap becomes complete, so the board can fill in while it builds.
 * Pass an AbortSignal to stop early; in-flight OpenSCAD work cannot be killed
 * mid-run, so cancellation takes effect at the next job boundary.
 */
export async function renderKeyset(keyset, {
  onProgress = null,
  onKeycap = null,
  signal = null,
  poolSize,
} = {}) {
  const plan = planKeysetJobs(keyset);
  const pending = plan.jobs.filter((job) => !meshCache.has(job.signature));
  const total = pending.length;

  const pool = createOpenScadPool(poolSize ? { size: poolSize } : {});
  let done = 0;

  const throwIfAborted = () => {
    if (signal?.aborted) {
      const error = new Error("The keyset render was cancelled.");
      error.name = "AbortError";
      throw error;
    }
  };

  try {
    onProgress?.({ done: 0, total });

    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        throwIfAborted();
        const index = nextIndex;
        nextIndex += 1;
        if (index >= pending.length) {
          return;
        }

        const job = pending[index];
        const mesh = await renderJob(pool, job);
        meshCache.set(job.signature, mesh);
        done += 1;
        onProgress?.({ done, total });
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(pool.size, Math.max(pending.length, 1)) }, () => worker()),
    );
    throwIfAborted();
  } finally {
    pool.dispose();
  }

  // Assemble once everything is rendered: a keycap's parts may come from cache,
  // from this run, or a mix.
  const keycaps = plan.keycaps.map((keycap) => {
    const assembled = {
      name: keycap.code,
      position: { x: keycap.position.x, y: keycap.position.y, z: 0 },
      meshes: keycap.parts.map((part) => {
        const mesh = meshCache.get(part.signature);
        return {
          name: part.name,
          colorHex: part.colorHex,
          vertices: mesh.vertices,
          faces: mesh.faces,
        };
      }),
    };
    onKeycap?.(assembled);
    return assembled;
  });

  return { keycaps, stats: { totalParts: plan.totalParts, uniqueJobs: plan.uniqueJobs, rendered: total } };
}

/**
 * Flatten rendered keycaps into preview layers.
 *
 * Repeated bodies share one mesh object, which lets the preview build a single
 * GPU geometry for all of them instead of one per keycap.
 */
export function createKeysetPreviewLayers(keycaps) {
  return keycaps.flatMap((keycap) => keycap.meshes.map((mesh) => ({
    name: mesh.name.replace(/^keycap-/, ""),
    color: mesh.colorHex,
    mesh,
    offset: keycap.position,
  })));
}
