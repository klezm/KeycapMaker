import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const CLI = fileURLToPath(new URL("../bin/keycap-bake.js", import.meta.url));
const EXAMPLE = fileURLToPath(new URL("../examples/letter-a.svg", import.meta.url));

async function inTempDir(body) {
  const directory = await mkdtemp(join(tmpdir(), "keycap-bake-"));
  try {
    return await body(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("bake writes an STL pair, a 3MF, a cut plan and a preview", async () => {
  await inTempDir(async (out) => {
    const { stdout } = await run("node", [
      CLI, "bake", "--svg", EXAMPLE, "--out", out,
      "--stem", "none", "--size", "9", "--preview", "--cut-plan",
    ]);
    const files = (await readdir(out)).sort();
    assert.deepEqual(files, [
      "letter-a-body.stl",
      "letter-a-cut-plan.svg",
      "letter-a-insert.stl",
      "letter-a-preview.html",
      "letter-a.3mf",
    ]);
    assert.match(stdout, /cut\s+from z=/);
    assert.match(stdout, /volumes\s+cap/);

    const preview = await readFile(join(out, "letter-a-preview.html"), "utf8");
    assert.match(preview, /<canvas id="view">/);
    assert.ok(preview.length > 10000, "the preview embeds its mesh data");

    const plan = await readFile(join(out, "letter-a-cut-plan.svg"), "utf8");
    assert.match(plan, /<svg[^>]+viewBox=/);
  });
});

test("--format limits what is written", async () => {
  await inTempDir(async (out) => {
    await run("node", [CLI, "bake", "--svg", EXAMPLE, "--out", out, "--format", "stl", "--quiet"]);
    assert.deepEqual((await readdir(out)).sort(), ["letter-a-body.stl", "letter-a-insert.stl"]);
  });
});

test("--name overrides the output base name", async () => {
  await inTempDir(async (out) => {
    await run("node", [CLI, "bake", "--svg", EXAMPLE, "--out", out, "--format", "3mf", "--name", "esc", "--quiet"]);
    assert.deepEqual(await readdir(out), ["esc.3mf"]);
  });
});

test("reports detached counters on the letter A", async () => {
  await inTempDir(async (out) => {
    const { stdout } = await run("node", [CLI, "bake", "--svg", EXAMPLE, "--out", out, "--stem", "none", "--format", "stl"]);
    assert.match(stdout, /detached island/);
  });
});

test("--islands bridge removes the note about detached counters", async () => {
  await inTempDir(async (out) => {
    const { stdout } = await run("node", [
      CLI, "bake", "--svg", EXAMPLE, "--out", out, "--stem", "none", "--format", "stl", "--islands", "bridge",
    ]);
    assert.doesNotMatch(stdout, /detached island/);
    assert.match(stdout, /bridges\s+\d+ tie-bar/);
  });
});

test("cap writes a bare keycap and inspect reads it back", async () => {
  await inTempDir(async (out) => {
    await run("node", [CLI, "cap", "--out", out, "--name", "blank", "--units", "2", "--quiet"]);
    const { stdout } = await run("node", [CLI, "inspect", join(out, "blank.stl")]);
    assert.match(stdout, /1 component\(s\), genus 0, status NoError/);
    // A 2u cap is 18 + 19.05 mm wide.
    assert.match(stdout, /size\s+37\.05/);
  });
});

test("--diffuser reports the layer it added", async () => {
  await inTempDir(async (out) => {
    const { stdout } = await run("node", [
      CLI, "bake", "--svg", EXAMPLE, "--out", out,
      "--stem", "none", "--format", "stl", "--diffuser", "0.6",
    ]);
    assert.match(stdout, /diffuser\s+0\.6 mm under the roof, [\d.]+ mm3 of the insert/);
  });
});

test("--diffuser warns when it leaves too little opaque skin", async () => {
  await inTempDir(async (out) => {
    const { stdout } = await run("node", [
      CLI, "bake", "--svg", EXAMPLE, "--out", out,
      "--stem", "none", "--format", "stl", "--diffuser", "0.9",
    ]);
    assert.match(stdout, /comes within 0\.8 mm of the top surface/);
    assert.match(stdout, /Thin opaque skin glows/);
  });
});

test("--diffuser refuses a depth that breaks through the top", async () => {
  await inTempDir(async (out) => {
    const failure = await run("node", [
      CLI, "bake", "--svg", EXAMPLE, "--out", out, "--format", "stl", "--diffuser", "3",
    ]).catch((e) => e);
    assert.match(failure.stderr, /breaks through the top surface/);
  });
});

test("no diffuser note appears when the flag is not used", async () => {
  await inTempDir(async (out) => {
    const { stdout } = await run("node", [CLI, "bake", "--svg", EXAMPLE, "--out", out, "--format", "stl"]);
    assert.doesNotMatch(stdout, /diffuser/);
  });
});

test("--help succeeds and a bare invocation does not", async () => {
  const { stdout } = await run("node", [CLI, "bake", "--help"]);
  assert.match(stdout, /keycap-bake — cut 2D vector graphics/);
  await assert.rejects(() => run("node", [CLI]));
});

test("rejects bad flag values with a readable message", async () => {
  await inTempDir(async (out) => {
    const failure = await run("node", [CLI, "bake", "--svg", EXAMPLE, "--out", out, "--islands", "nope"]).catch((e) => e);
    assert.match(failure.stderr, /--islands expects keep, bridge or error/);
  });
});

test("explains a stroke-only SVG instead of writing an empty part", async () => {
  await inTempDir(async (out) => {
    const stroked = join(out, "stroked.svg");
    await (await import("node:fs/promises")).writeFile(
      stroked,
      `<svg viewBox="0 0 10 10"><path fill="none" stroke="#000" d="M1 1 H9"/></svg>`,
    );
    const failure = await run("node", [CLI, "bake", "--svg", stroked, "--out", out]).catch((e) => e);
    assert.match(failure.stderr, /stroke-only shape/);
    assert.match(failure.stderr, /Stroke to Path/);
  });
});
