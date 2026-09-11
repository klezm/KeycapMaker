import { buildKeycap } from "../keycap.mjs";
import { encodeMesh } from "./mesh-format.mjs";
import { buildCatalogue } from "./catalogue.mjs";
import { renderViewer, renderDocument } from "./page.mjs";

/**
 * Build a set of caps and fold them into a single self-contained page.
 *
 * The result needs no server and no network: every model travels inside the
 * HTML, so it can be opened from a file, mailed to someone, or published.
 * Only the combinations baked in are selectable; the viewer greys out the rest.
 */
export async function bakeViewer(jobs, options = {}, onProgress = () => {}) {
  const models = {};
  let bytes = 0;

  for (const [index, job] of jobs.entries()) {
    const { solid, stats } = await buildKeycap({
      profile: job.profile,
      row: job.row,
      units: job.units,
      stem: job.stem,
      stabilizers: job.stabilizers ?? options.stabilizers,
      wall: options.wall,
      topThickness: options.topThickness,
      stemSlop: options.stemSlop,
      quality: options.quality,
    });
    const mesh = encodeMesh(solid);
    solid.delete();
    bytes += mesh.length;

    models[
      [job.profile, job.row, job.units, job.stem, job.stabilizers ?? options.stabilizers].join("|")
    ] = { mesh: mesh.toString("base64"), stats };
    onProgress(index + 1, jobs.length, job);
  }

  const html = renderDocument(
    renderViewer({ catalogue: buildCatalogue(), mode: "baked", baked: { models } }),
  );
  return { html, count: jobs.length, meshBytes: bytes };
}

/** The same page without a document wrapper, for embedding elsewhere. */
export async function bakeViewerContent(jobs, options = {}, onProgress = () => {}) {
  const models = {};
  for (const [index, job] of jobs.entries()) {
    const { solid, stats } = await buildKeycap({
      profile: job.profile,
      row: job.row,
      units: job.units,
      stem: job.stem,
      stabilizers: job.stabilizers ?? options.stabilizers,
      wall: options.wall,
      topThickness: options.topThickness,
      stemSlop: options.stemSlop,
      quality: options.quality,
    });
    models[
      [job.profile, job.row, job.units, job.stem, job.stabilizers ?? options.stabilizers].join("|")
    ] = { mesh: encodeMesh(solid).toString("base64"), stats };
    solid.delete();
    onProgress(index + 1, jobs.length, job);
  }
  return renderViewer({ catalogue: buildCatalogue(), mode: "baked", baked: { models } });
}
