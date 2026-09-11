import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseList, parseRows, parseSizes, parseStabilizers, resolveOptions, main } from "../src/cli.mjs";
import { expandMatrix, outputName, runBatch, FORMATS } from "../src/batch.mjs";
import { profileIds } from "../src/profiles/index.mjs";
import { stemIds } from "../src/stems/index.mjs";
import { SIZES, formatSize } from "../src/sizes.mjs";
import { readZip } from "../src/export/zip.mjs";
import { buildCatalogue } from "../src/viewer/catalogue.mjs";
import { inspectBinaryStl } from "../src/export/stl.mjs";

async function workspace() {
  return mkdtemp(path.join(tmpdir(), "keycap-forge-"));
}

/** Run the CLI with stdout captured, so tests assert on what a user sees. */
async function run(args) {
  const lines = [];
  const original = console.log;
  console.log = (...parts) => lines.push(parts.join(" "));
  try {
    const code = await main(args);
    return { code, output: lines.join("\n") };
  } finally {
    console.log = original;
  }
}

test("comma lists are validated against what exists", () => {
  assert.deepEqual(parseList("dsa,sa", profileIds(), "profile"), ["dsa", "sa"]);
  assert.deepEqual(parseList("all", profileIds(), "profile"), profileIds());
  assert.deepEqual(parseList("mx,mx", stemIds(), "stem"), ["mx"], "duplicates collapse");
  assert.throws(() => parseList("nope", profileIds(), "profile"), /Unknown profile "nope"/);
  assert.throws(() => parseList(",", stemIds(), "stem"), /needs at least one value/);
});

test("rows accept single values, lists and ranges", () => {
  const allowed = [1, 2, 3, 4, 5];
  assert.deepEqual(parseRows("3", allowed), [3]);
  assert.deepEqual(parseRows("1,3,5", allowed), [1, 3, 5]);
  assert.deepEqual(parseRows("2-4", allowed), [2, 3, 4]);
  assert.deepEqual(parseRows("1,4-5", allowed), [1, 4, 5]);
  assert.deepEqual(parseRows("all", allowed), allowed);
  assert.throws(() => parseRows("9", allowed), /No profile has row 9/);
  assert.throws(() => parseRows("4-2", allowed), /runs backwards/);
  assert.throws(() => parseRows("1.5", allowed), /not a whole number/);
});

test("sizes accept the catalogue or any positive number", () => {
  assert.deepEqual(parseSizes("1,1.25"), [1, 1.25]);
  assert.deepEqual(parseSizes("all"), SIZES);
  assert.deepEqual(parseSizes("1.375"), [1.375], "unlisted sizes are still allowed");
  assert.throws(() => parseSizes("0"), /must be a positive number/);
  assert.throws(() => parseSizes("wide"), /must be a positive number/);
});

test("defaults build a 1u MX sampler, and --all opens it up", () => {
  const defaults = resolveOptions({});
  assert.deepEqual(defaults.profiles, profileIds());
  assert.deepEqual(defaults.sizes, [1]);
  assert.deepEqual(defaults.stems, ["mx"]);
  assert.deepEqual(defaults.formats, ["stl"]);

  const everything = resolveOptions({ all: true });
  assert.deepEqual(everything.sizes, SIZES);
  assert.deepEqual(everything.stems, stemIds());

  // An explicit flag still wins over --all.
  assert.deepEqual(resolveOptions({ all: true, stem: "box" }).stems, ["box"]);
});

test("geometry flags are parsed as numbers and validated", () => {
  const options = resolveOptions({ wall: "2", "top-thickness": "1.8", "stem-slop": "0.35", jobs: "3" });
  assert.equal(options.wall, 2);
  assert.equal(options.topThickness, 1.8);
  assert.equal(options.stemSlop, 0.35);
  assert.equal(options.jobs, 3);
  assert.throws(() => resolveOptions({ wall: "-1" }), /must be a non-negative number/);
  assert.throws(() => resolveOptions({ wall: "thick" }), /must be a non-negative number/);
  assert.throws(() => resolveOptions({ quality: "ultra" }), /Unknown quality "ultra"/);
  assert.throws(() => resolveOptions({ format: "obj" }), /Unknown format "obj"/);
});

test("the stabiliser flag accepts auto, none and an explicit span", () => {
  assert.equal(parseStabilizers(undefined), "auto");
  assert.equal(parseStabilizers("auto"), "auto");
  assert.equal(parseStabilizers("none"), "none");
  assert.equal(parseStabilizers("5.25"), 5.25);
  assert.equal(parseStabilizers("0"), 0);
  assert.throws(() => parseStabilizers("wide"), /must be "auto", "none" or a span/);
  assert.throws(() => parseStabilizers("-2"), /must be "auto", "none" or a span/);
  assert.equal(resolveOptions({}).stabilizers, "auto", "auto is the default");
  assert.equal(resolveOptions({ stabilizers: "none" }).stabilizers, "none");
});

test("output names carry the row only where the row changes the shape", () => {
  assert.equal(outputName({ profile: "cherry", row: 3, units: 1, stem: "mx" }), "cherry_r3_1u_mx");
  assert.equal(outputName({ profile: "dsa", row: 3, units: 1, stem: "mx" }), "dsa_1u_mx");
  assert.equal(outputName({ profile: "oem", row: 1, units: 6.25, stem: "box" }), "oem_r1_6.25u_box");
});

test("output names mark a stabiliser setting only when it deviates", () => {
  const wide = { profile: "oem", row: 1, units: 6.25, stem: "mx" };
  assert.equal(outputName(wide), "oem_r1_6.25u_mx");
  assert.equal(outputName({ ...wide, stabilizers: "auto" }), "oem_r1_6.25u_mx");
  assert.equal(outputName({ ...wide, stabilizers: "none" }), "oem_r1_6.25u_mx_nostab");
  assert.equal(outputName({ ...wide, stabilizers: 2 }), "oem_r1_6.25u_mx_stab2u");
  // A 1u key has no stabilisers either way, so nothing to mark.
  assert.equal(outputName({ ...wide, units: 1, stabilizers: "none" }), "oem_r1_1u_mx");
});

test("combinations whose stems will not fit are skipped, not failed", () => {
  const { jobs, skipped } = expandMatrix({
    profiles: ["choc"],
    rows: [3],
    sizes: [1, 2, 6.25],
    stems: ["choc-v1", "choc-v2"],
  });
  const names = jobs.map((job) => job.name);
  assert.ok(!names.includes("choc_2u_choc-v1"), "a Choc v1 stem does not fit a 2u Choc cap");
  assert.ok(names.includes("choc_2u_choc-v2"), "the narrower v2 stem does fit");
  assert.ok(names.includes("choc_6.25u_choc-v1"), "a wide Choc cap has room for v1");
  assert.ok(skipped.some((reason) => /would breach the sidewall/.test(reason)));

  // Turning stabilisers off makes the same combination buildable.
  const relaxed = expandMatrix({
    profiles: ["choc"],
    rows: [3],
    sizes: [2],
    stems: ["choc-v1"],
    stabilizers: "none",
  });
  assert.equal(relaxed.jobs.length, 1);
  assert.equal(relaxed.jobs[0].name, "choc_2u_choc-v1_nostab");
});

test("the matrix drops impossible combinations and says why", () => {
  const { jobs, skipped } = expandMatrix({
    profiles: ["dsa", "sa", "choc"],
    rows: [1, 2, 3, 4, 5],
    sizes: [1],
    stems: ["mx", "choc-v1"],
  });
  const names = jobs.map((job) => job.name);
  assert.ok(names.includes("dsa_1u_mx"));
  assert.ok(names.includes("choc_1u_choc-v1"));
  assert.ok(!names.some((name) => name.startsWith("sa_r5")), "SA has no row 5");
  assert.ok(!names.includes("choc_1u_mx"), "an MX stem cannot go on a Choc cap");
  assert.equal(names.length, new Set(names).size, "names must be unique");
  assert.ok(skipped.some((reason) => /sa R5/.test(reason)));
  assert.ok(skipped.some((reason) => /does not fit a choc mount/.test(reason)));
});

test("uniform profiles collapse their rows to one model, filed at the home row", () => {
  const { jobs } = expandMatrix({
    profiles: ["dsa"],
    rows: [1, 2, 3, 4, 5],
    sizes: [1],
    stems: ["mx"],
  });
  assert.equal(jobs.length, 1, "five rows of a uniform profile is one shape");

  // Which row it is filed under matters even though the shape does not depend
  // on it: a standalone page stores caps by row and the viewer looks them up by
  // the profile's home row. Filing it under whichever row came first hid every
  // uniform profile from a baked arrangement.
  assert.equal(jobs[0].row, 3, "a uniform profile is recorded at its home row");
  assert.equal(
    jobs[0].row,
    buildCatalogue().profiles.find((profile) => profile.id === "dsa").homeRow,
    "the job and the viewer's catalogue must agree on the row",
  );

  // Asking for a single row that is not the home row files it there anyway.
  const single = expandMatrix({ profiles: ["dsa"], rows: [1], sizes: [1], stems: ["mx"] });
  assert.equal(single.jobs[0].row, 3);

  // Sculpted profiles keep the row asked for.
  const sculpted = expandMatrix({ profiles: ["cherry"], rows: [1], sizes: [1], stems: ["mx"] });
  assert.equal(sculpted.jobs[0].row, 1);
});

test("the full matrix covers every profile and stem", () => {
  const { jobs } = expandMatrix({
    profiles: profileIds(),
    rows: [1, 2, 3, 4, 5],
    sizes: SIZES,
    stems: stemIds(),
  });
  assert.ok(jobs.length > 1000, `expected a large matrix, got ${jobs.length}`);
  for (const profile of profileIds()) {
    assert.ok(jobs.some((job) => job.profile === profile), `${profile} is missing`);
  }
  for (const stem of stemIds()) {
    assert.ok(jobs.some((job) => job.stem === stem), `${stem} is missing`);
  }
  for (const units of SIZES) {
    assert.ok(jobs.some((job) => job.units === units), `${formatSize(units)} is missing`);
  }
});

test("a dry run reports without writing anything", async () => {
  const out = await workspace();
  const { output } = await run(["generate", "--profile", "dsa", "--dry-run", "--out", out]);
  assert.match(output, /1 model\(s\) would be written/);
  assert.match(output, /dsa_1u_mx/);
  assert.deepEqual(await readdir(out), [], "a dry run must not write files");
});

test("generate writes the formats it is asked for and reports them", async () => {
  const out = await workspace();
  const { code, output } = await run([
    "generate",
    "--profile",
    "cherry",
    "--row",
    "1,3",
    "--stem",
    "mx",
    "--format",
    "stl,3mf",
    "--out",
    out,
    "--quality",
    "draft",
    "--jobs",
    "1",
  ]);
  assert.equal(code, 0);

  const written = (await readdir(path.join(out, "cherry"))).sort();
  assert.deepEqual(written, [
    "cherry_r1_1u_mx.3mf",
    "cherry_r1_1u_mx.stl",
    "cherry_r3_1u_mx.3mf",
    "cherry_r3_1u_mx.stl",
  ]);
  assert.match(output, /2 model\(s\), 4 file\(s\)/);

  const stl = await readFile(path.join(out, "cherry", "cherry_r3_1u_mx.stl"));
  assert.ok(inspectBinaryStl(stl).count > 0, "the STL has no facets");
  const model = readZip(await readFile(path.join(out, "cherry", "cherry_r3_1u_mx.3mf")));
  assert.match(model["3D/3dmodel.model"].toString(), /Cherry R3 1u mx/);
});

test("worker threads produce the same models as a single thread", async () => {
  const jobs = expandMatrix({
    profiles: ["dsa", "cherry"],
    rows: [3],
    sizes: [1],
    stems: ["mx", "none"],
  }).jobs;
  const base = { formats: [], quality: "draft", wall: 1.5, topThickness: 1.2, stemSlop: 0.15 };

  const serial = await runBatch(jobs, { ...base, out: await workspace(), jobs: 1 });
  const parallel = await runBatch(jobs, { ...base, out: await workspace(), jobs: 4 });

  const byName = (results) =>
    Object.fromEntries(results.map((result) => [result.name, result.stats.volume.toFixed(6)]));
  assert.deepEqual(byName(parallel), byName(serial), "thread count changed the geometry");
  assert.equal(parallel.length, jobs.length);
});

test("a failure surfaces from both the serial and the threaded path", async () => {
  const impossible = { profile: "dsa", row: 3, units: 1, stem: "choc-v1", name: "impossible" };
  const options = {
    formats: [],
    quality: "draft",
    out: "/tmp",
    wall: 1.5,
    topThickness: 1.2,
    stemSlop: 0.15,
  };

  // One job runs inline, so the builder's own error comes straight through.
  await assert.rejects(
    () => runBatch([impossible], { ...options, jobs: 4 }),
    /Stem "choc-v1" does not fit/,
  );
  // Two jobs go to workers, where the failure is tagged with the model name.
  await assert.rejects(
    () => runBatch([impossible, { ...impossible, name: "impossible2" }], { ...options, jobs: 2 }),
    /impossible2?: Stem "choc-v1" does not fit/,
  );
});

test("the CLI surface answers for itself", async () => {
  assert.equal((await run(["--help"])).code, 0);
  assert.match((await run(["help"])).output, /keycapgen generate/);

  const listed = await run(["list"]);
  assert.match(listed.output, /Stabiliser stems/);
  assert.match(listed.output, /114\.30 mm/, "the 7u Cherry span should be listed");
  for (const profile of profileIds()) assert.match(listed.output, new RegExp(`\\b${profile}\\b`));
  for (const stem of stemIds()) assert.match(listed.output, new RegExp(stem.replace("-", "\\-")));
  for (const format of FORMATS) assert.match(listed.output, new RegExp(format));

  await assert.rejects(() => main(["frobnicate"]), /Unknown command "frobnicate"/);
  await assert.rejects(
    () => main(["generate", "--profile", "choc", "--stem", "mx"]),
    /Nothing to build/,
  );
});
