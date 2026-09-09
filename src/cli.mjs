import path from "node:path";
import { parseArgs } from "node:util";
import os from "node:os";

import { PROFILES, getProfile, profileIds, resolveSpec } from "./profiles/index.mjs";
import { STEMS, stemIds } from "./stems/index.mjs";
import { SIZES, formatSize } from "./sizes.mjs";
import { QUALITY_PRESETS } from "./engine.mjs";
import { DEFAULTS } from "./keycap.mjs";
import { FORMATS, expandMatrix, runBatch } from "./batch.mjs";

const USAGE = `keycap-forge -- blank keycap models for every profile and stem

Usage:
  keycapgen list                       Show profiles, rows, sizes and stems
  keycapgen generate [options]         Build models
  keycapgen help

Selection (comma separated, or "all"):
  --profile <ids>        default: all          e.g. dsa,cherry,sa
  --row <rows>           default: all          e.g. 3  or  1-5  or  1,3,5
  --size <units>         default: 1            e.g. 1,1.25,6.25
  --stem <ids>           default: mx           e.g. mx,box,choc-v1
  --all                  every profile, row, size and stem

Output:
  --out <dir>            default: ./out
  --format <list>        default: stl          stl,3mf
  --dry-run              list what would be built, build nothing

Geometry:
  --quality <name>       default: ${DEFAULTS.quality}     ${Object.keys(QUALITY_PRESETS).join(", ")}
  --stem-slop <mm>       default: ${DEFAULTS.stemSlop}      widen the stem slot per face
  --wall <mm>            default: ${DEFAULTS.wall}       sidewall thickness
  --top-thickness <mm>   default: ${DEFAULTS.topThickness}       roof thickness under the dish
  --jobs <n>             default: CPU count    worker threads

Rows run R1 (bottom row) to R5 (number row); R3 is the home row. Profiles with
uniform rows ignore the row and emit a single model per size and stem.`;

const OPTION_SPEC = {
  profile: { type: "string" },
  row: { type: "string" },
  size: { type: "string" },
  stem: { type: "string" },
  all: { type: "boolean" },
  format: { type: "string" },
  out: { type: "string" },
  quality: { type: "string" },
  "stem-slop": { type: "string" },
  wall: { type: "string" },
  "top-thickness": { type: "string" },
  jobs: { type: "string" },
  "dry-run": { type: "boolean" },
  help: { type: "boolean", short: "h" },
};

/** Split "a,b" into a validated list, expanding "all" to every known value. */
export function parseList(value, allowed, label) {
  if (value === undefined || value === "all") return [...allowed];
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0) throw new Error(`--${label} needs at least one value`);
  for (const item of items) {
    if (!allowed.includes(item)) {
      throw new Error(`Unknown ${label} "${item}". Expected one of: ${allowed.join(", ")}`);
    }
  }
  return [...new Set(items)];
}

/** Rows accept single values, comma lists and inclusive ranges like "1-4". */
export function parseRows(value, allowed) {
  if (value === undefined || value === "all") return [...allowed];
  const rows = new Set();
  for (const part of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (from > to) throw new Error(`Row range "${part}" runs backwards`);
      for (let row = from; row <= to; row += 1) rows.add(row);
    } else {
      const row = Number(part);
      if (!Number.isInteger(row)) throw new Error(`Row "${part}" is not a whole number`);
      rows.add(row);
    }
  }
  const unknown = [...rows].filter((row) => !allowed.includes(row));
  if (unknown.length) {
    throw new Error(`No profile has row ${unknown.join(", ")}. Rows are ${allowed.join(", ")}`);
  }
  return [...rows].sort((a, b) => a - b);
}

export function parseSizes(value) {
  if (value === undefined || value === "all") return [...SIZES];
  const sizes = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const units = Number(item);
      if (!(units > 0)) throw new Error(`Key size "${item}" must be a positive number`);
      return units;
    });
  if (sizes.length === 0) throw new Error("--size needs at least one value");
  return [...new Set(sizes)];
}

function parseNumber(value, fallback, label) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--${label} must be a non-negative number, received "${value}"`);
  }
  return parsed;
}

/** Turn parsed flags into the settings the batch runner and builder consume. */
export function resolveOptions(values) {
  const wantAll = values.all === true;
  const allRows = [...new Set(PROFILES.flatMap((profile) => profile.rows))].sort((a, b) => a - b);

  const quality = values.quality ?? DEFAULTS.quality;
  if (!QUALITY_PRESETS[quality]) {
    throw new Error(
      `Unknown quality "${quality}". Expected one of: ${Object.keys(QUALITY_PRESETS).join(", ")}`,
    );
  }

  return {
    profiles: parseList(values.profile ?? "all", profileIds(), "profile"),
    rows: parseRows(values.row ?? "all", allRows),
    sizes: parseSizes(values.size ?? (wantAll ? "all" : "1")),
    stems: parseList(values.stem ?? (wantAll ? "all" : "mx"), stemIds(), "stem"),
    formats: parseList(values.format ?? "stl", FORMATS, "format"),
    out: path.resolve(values.out ?? "out"),
    quality,
    wall: parseNumber(values.wall, DEFAULTS.wall, "wall"),
    topThickness: parseNumber(values["top-thickness"], DEFAULTS.topThickness, "top-thickness"),
    stemSlop: parseNumber(values["stem-slop"], DEFAULTS.stemSlop, "stem-slop"),
    jobs: Math.max(1, Math.round(parseNumber(values.jobs, os.availableParallelism(), "jobs"))),
    dryRun: values["dry-run"] === true,
  };
}

function table(headers, rows) {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => String(row[column] ?? "").length)),
  );
  const line = (cells) =>
    cells.map((cell, column) => String(cell ?? "").padEnd(widths[column])).join("  ").trimEnd();
  return [line(headers), line(widths.map((width) => "-".repeat(width))), ...rows.map(line)].join("\n");
}

function listCommand() {
  const profileRows = PROFILES.map((profile) => {
    const home = resolveSpec(profile.id, profile.rows.includes(3) ? 3 : profile.rows[0], 1);
    return [
      profile.id,
      profile.name,
      profile.mount,
      profile.sculpted ? profile.rows.join(",") : "uniform",
      `${home.height.toFixed(1)} mm`,
      profile.dish.type,
    ];
  });
  const stemRows = STEMS.map((stem) => [
    stem.spec.id,
    stem.spec.name,
    stem.spec.mounts.join(","),
    stem.spec.height ? `${stem.spec.height.toFixed(1)} mm` : "-",
    stem.spec.description,
  ]);

  console.log("Profiles\n");
  console.log(table(["id", "name", "mount", "rows", "home height", "dish"], profileRows));
  console.log("\nStems\n");
  console.log(table(["id", "name", "mounts", "height", "notes"], stemRows));
  console.log(`\nSizes (units): ${SIZES.join(", ")}`);
  console.log(`Formats: ${FORMATS.join(", ")}`);
  console.log(`Quality: ${Object.keys(QUALITY_PRESETS).join(", ")}`);
  console.log(
    "\nRow numbering: R1 is the bottom row, R3 the home row, R5 the number row.\n" +
      "Profile shapes are community approximations, not manufacturer CAD.",
  );
}

async function generateCommand(options) {
  const { jobs, skipped } = expandMatrix(options);
  if (jobs.length === 0) {
    throw new Error("Nothing to build: every requested combination was filtered out");
  }

  if (options.dryRun) {
    console.log(`${jobs.length} model(s) would be written to ${options.out}:`);
    for (const job of jobs) {
      console.log(`  ${path.join(job.profile, job.name)}.{${options.formats.join(",")}}`);
    }
    reportSkipped(skipped);
    return;
  }

  const started = Date.now();
  const showProgress = process.stderr.isTTY === true;
  const results = await runBatch(jobs, options, (done, total, item) => {
    if (!showProgress) return;
    process.stderr.write(`\r[${String(done).padStart(String(total).length)}/${total}] ${(item.name ?? "").padEnd(32)}`);
  });
  if (showProgress) process.stderr.write("\n");

  results.sort((a, b) => a.name.localeCompare(b.name));
  console.log(
    table(
      ["model", "profile", "row", "size", "stem", "w x d x h (mm)", "volume mm3", "tris"],
      results.map((result) => [
        result.name,
        result.profile,
        getProfile(result.profile).sculpted ? `R${result.row}` : "-",
        formatSize(result.units),
        result.stem,
        `${result.stats.width.toFixed(2)} x ${result.stats.depth.toFixed(2)} x ${result.stats.height.toFixed(2)}`,
        result.stats.volume.toFixed(0),
        result.stats.triangles,
      ]),
    ),
  );

  const files = results.reduce((total, result) => total + result.files.length, 0);
  console.log(
    `\n${results.length} model(s), ${files} file(s) in ${options.out} ` +
      `(${((Date.now() - started) / 1000).toFixed(1)}s, ${options.jobs} worker(s), ${options.quality} quality)`,
  );
  reportSkipped(skipped);
}

function reportSkipped(skipped) {
  if (skipped.length === 0) return;
  const unique = [...new Set(skipped)];
  console.log(`\nSkipped ${skipped.length} impossible combination(s):`);
  for (const reason of unique.slice(0, 8)) console.log(`  ${reason}`);
  if (unique.length > 8) console.log(`  ...and ${unique.length - 8} more`);
}

export async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: OPTION_SPEC,
    allowPositionals: true,
  });
  const command = positionals[0] ?? "generate";

  if (values.help || command === "help") {
    console.log(USAGE);
    return 0;
  }
  if (command === "list") {
    listCommand();
    return 0;
  }
  if (command !== "generate") {
    throw new Error(`Unknown command "${command}". Try: list, generate, help`);
  }
  await generateCommand(resolveOptions(values));
  return 0;
}
