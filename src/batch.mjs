import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

import { buildKeycap, stemFitProblem, DEFAULTS } from "./keycap.mjs";
import { getProfile, resolveSpec, homeRowOf } from "./profiles/index.mjs";
import { stemFitsMount, getStem } from "./stems/index.mjs";
import { formatSize } from "./sizes.mjs";
import { stemLayout, stabilizerToken, AUTO } from "./stabilizers.mjs";
import { getHoming } from "./homing.mjs";
import { toBinaryStl } from "./export/stl.mjs";
import { to3mf } from "./export/3mf.mjs";

export const FORMATS = ["stl", "3mf"];

/**
 * Where a job's files land. Uniform profiles collapse to one file per size and
 * stem, because their rows are the same shape -- writing five identical
 * models under five names would only waste disk and confuse the comparison.
 */
export function outputName({ profile, row, units, stem, stabilizers = AUTO, homing = "none" }) {
  const rowToken = getProfile(profile).sculpted ? `_r${row}` : "";
  const homingToken = homing === "none" ? "" : `_homing-${homing}`;
  return `${profile}${rowToken}_${formatSize(units)}_${stem}${stabilizerToken(units, stabilizers)}${homingToken}`;
}

/**
 * Expand filter selections into the concrete list of caps to build.
 *
 * Combinations that cannot exist are dropped rather than failing the run: a
 * row a profile does not have, or a stem that does not fit its mount. The
 * reasons come back in `skipped` so the CLI can report them.
 */
export function expandMatrix({
  profiles,
  rows,
  sizes,
  stems,
  stabilizers = AUTO,
  homing = DEFAULTS.homing,
  wall = DEFAULTS.wall,
}) {
  getHoming(homing);
  const jobs = [];
  const skipped = [];
  const seen = new Set();

  for (const profileId of profiles) {
    const profile = getProfile(profileId);
    for (const stem of stems) {
      if (!stemFitsMount(stem, profile.mount)) {
        skipped.push(`${profileId} + ${stem}: stem does not fit a ${profile.mount} mount`);
        continue;
      }
      for (const row of rows) {
        if (!profile.rows.includes(row)) {
          skipped.push(`${profileId} R${row}: profile has rows ${profile.rows.join(", ")}`);
          continue;
        }
        for (const units of sizes) {
          // A uniform profile has one shape whatever row is asked for, so it is
          // recorded at its home row. Leaving it on whichever row happened to
          // come first would file it under a row nothing else looks it up by.
          const filedRow = profile.sculpted ? row : homeRowOf(profile);
          const job = { profile: profileId, row: filedRow, units, stem, stabilizers, homing };
          const spec = resolveSpec(profileId, filedRow, units, { wall });
          const problem = stemFitProblem({
            spec,
            stemSpec: getStem(stem).spec,
            layout: stemLayout(units, profile.mount, stabilizers),
            wall,
          });
          if (problem) {
            skipped.push(`${profileId} ${formatSize(units)} + ${stem}: ${problem}`);
            continue;
          }
          const name = outputName(job);
          if (seen.has(name)) continue;
          seen.add(name);
          jobs.push({ ...job, name });
        }
      }
    }
  }
  return { jobs, skipped };
}

/** Build one cap and write every requested format. Shared by both run paths. */
export async function renderJob(job, options) {
  const { solid, spec, stats } = await buildKeycap({
    profile: job.profile,
    row: job.row,
    units: job.units,
    stem: job.stem,
    wall: options.wall,
    topThickness: options.topThickness,
    stemSlop: options.stemSlop,
    quality: options.quality,
    stabilizers: job.stabilizers ?? options.stabilizers,
    homing: job.homing ?? options.homing,
  });

  const homingLabel = stats.homing === "none" ? "" : ` ${stats.homing} homing`;
  const label = `${spec.profileName} ${spec.sculpted === false ? "" : `R${job.row} `}${formatSize(job.units)} ${job.stem}${homingLabel}`;
  const directory = path.join(options.out, job.profile);
  const files = [];

  if (options.formats.includes("stl") || options.formats.includes("3mf")) {
    await mkdir(directory, { recursive: true });
  }
  if (options.formats.includes("stl")) {
    const file = path.join(directory, `${job.name}.stl`);
    await writeFile(file, toBinaryStl(solid, `keycap-forge ${label}`));
    files.push(file);
  }
  if (options.formats.includes("3mf")) {
    const file = path.join(directory, `${job.name}.3mf`);
    await writeFile(
      file,
      to3mf(solid, {
        Title: label.trim(),
        Application: "keycap-forge",
        Description: `Blank keycap. Profile ${spec.profileName}, row ${job.row}, ${formatSize(job.units)}, ${getStem(job.stem).spec.name} stem.`,
        LicenseTerms: spec.notes,
      }),
    );
    files.push(file);
  }

  solid.delete();
  return { name: job.name, ...job, stats, files };
}

/**
 * Run every job, spreading them over worker threads when there is enough work
 * to pay back the cost of booting a WASM kernel per worker.
 */
export async function runBatch(jobs, options, onProgress = () => {}) {
  const concurrency = Math.max(1, Math.min(options.jobs ?? 1, jobs.length));
  if (concurrency === 1) {
    const results = [];
    for (const job of jobs) {
      results.push(await renderJob(job, options));
      onProgress(results.length, jobs.length, job);
    }
    return results;
  }

  const workerPath = fileURLToPath(new URL("./worker.mjs", import.meta.url));
  const queue = [...jobs];
  const results = [];
  let done = 0;

  await Promise.all(
    Array.from({ length: concurrency }, () => {
      const worker = new Worker(workerPath, { workerData: options });
      return new Promise((resolve, reject) => {
        const next = () => {
          const job = queue.shift();
          if (!job) {
            worker.postMessage({ type: "stop" });
            return;
          }
          worker.postMessage({ type: "job", job });
        };
        worker.on("message", (message) => {
          if (message.type === "ready") {
            next();
            return;
          }
          if (message.type === "error") {
            reject(new Error(message.error));
            worker.terminate();
            return;
          }
          results.push(message.result);
          done += 1;
          onProgress(done, jobs.length, message.result);
          next();
        });
        worker.on("error", reject);
        worker.on("exit", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Worker stopped with exit code ${code}`));
        });
      });
    }),
  );

  return results;
}
