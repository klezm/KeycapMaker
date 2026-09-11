import { buildKeycap, DEFAULTS } from "../keycap.mjs";
import { encodeMesh } from "./mesh-format.mjs";
import { buildCatalogue } from "./catalogue.mjs";
import { renderViewer, renderDocument } from "./page.mjs";

/** The key the viewer looks a cap up by. Must match the client's `keyOf`. */
export function bakeKey(pick) {
  return [pick.profile, pick.row, pick.units, pick.stem, pick.stabilizers, pick.homing].join("|");
}

async function bakeModels(jobs, options, onProgress) {
  const models = {};
  let meshBytes = 0;

  for (const [index, job] of jobs.entries()) {
    const pick = {
      profile: job.profile,
      row: job.row,
      units: job.units,
      stem: job.stem,
      stabilizers: job.stabilizers ?? options.stabilizers ?? DEFAULTS.stabilizers,
      homing: job.homing ?? options.homing ?? DEFAULTS.homing,
    };
    const { solid, stats } = await buildKeycap({
      ...pick,
      wall: options.wall,
      topThickness: options.topThickness,
      stemSlop: options.stemSlop,
      quality: options.quality,
    });
    const mesh = encodeMesh(solid);
    solid.delete();
    meshBytes += mesh.length;
    models[bakeKey(pick)] = { mesh: mesh.toString("base64"), stats };
    onProgress(index + 1, jobs.length, job);
  }
  return { models, meshBytes };
}

/**
 * Build a set of caps and fold them into a single self-contained page.
 *
 * The result needs no server and no network: every model travels inside the
 * HTML, so it can be opened from a file, mailed to someone, or published.
 * Only the combinations baked in are selectable; the viewer greys out the rest.
 */
export async function bakeViewer(jobs, options = {}, onProgress = () => {}) {
  const { models, meshBytes } = await bakeModels(jobs, options, onProgress);
  const content = renderViewer({ catalogue: buildCatalogue(), mode: "baked", baked: { models } });
  return { html: renderDocument(content), count: jobs.length, meshBytes };
}

/** The same page without a document wrapper, for embedding elsewhere. */
export async function bakeViewerContent(jobs, options = {}, onProgress = () => {}) {
  const { models } = await bakeModels(jobs, options, onProgress);
  return renderViewer({ catalogue: buildCatalogue(), mode: "baked", baked: { models } });
}
