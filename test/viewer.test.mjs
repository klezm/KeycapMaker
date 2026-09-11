import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildKeycap } from "../src/keycap.mjs";
import { encodeMesh, decodeMesh } from "../src/viewer/mesh-format.mjs";
import { buildCatalogue } from "../src/viewer/catalogue.mjs";
import { renderViewer, renderDocument } from "../src/viewer/page.mjs";
import { bakeViewer, bakeKey } from "../src/viewer/bake.mjs";
import { createViewerServer } from "../src/viewer/server.mjs";
import { expandMatrix } from "../src/batch.mjs";
import { profileIds } from "../src/profiles/index.mjs";
import { stemIds } from "../src/stems/index.mjs";
import { inspectBinaryStl } from "../src/export/stl.mjs";
import { readZip } from "../src/export/zip.mjs";
import { main } from "../src/cli.mjs";

async function sample() {
  return buildKeycap({ profile: "cherry", row: 3, units: 1, stem: "mx", quality: "draft" });
}

/** Start the server on an ephemeral port and hand back a fetch bound to it. */
async function withServer(run) {
  const server = createViewerServer({ quality: "draft" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run((suffix) => fetch(base + suffix));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("the mesh format round-trips exactly", async () => {
  const { solid, stats } = await sample();
  const decoded = decodeMesh(encodeMesh(solid));

  assert.equal(decoded.triangleCount, stats.triangles);
  assert.equal(decoded.indices.length, stats.triangles * 3);
  assert.equal(decoded.positions.length, decoded.vertexCount * 3);
  assert.ok(
    decoded.indices.every((index) => index < decoded.vertexCount),
    "every index must point at a real vertex",
  );

  const mesh = solid.getMesh();
  for (let i = 0; i < decoded.positions.length; i += 1) {
    assert.equal(decoded.positions[i], mesh.vertProperties[i], `vertex float ${i} drifted`);
  }
  solid.delete();
});

test("the mesh format is smaller than the STL it replaces", async () => {
  const { solid, stats } = await sample();
  const encoded = encodeMesh(solid);
  assert.ok(
    encoded.length < 84 + stats.triangles * 50,
    "an indexed mesh should beat three-vertices-per-facet",
  );
  // A small cap indexes into 16 bits; the header says which width was used.
  assert.equal(encoded.readUInt32LE(12), 16);
  assert.equal(encoded.toString("ascii", 0, 4), "KCM1");
  solid.delete();
});

test("a corrupt mesh is rejected rather than half-read", async () => {
  const { solid } = await sample();
  const encoded = encodeMesh(solid);
  encoded.write("XXXX", 0, "ascii");
  assert.throws(() => decodeMesh(encoded), /Not a keycap mesh/);
  solid.delete();
});

test("the catalogue describes everything the controls offer", () => {
  const catalogue = buildCatalogue();
  assert.deepEqual(
    catalogue.profiles.map((entry) => entry.id),
    profileIds(),
  );
  assert.deepEqual(
    catalogue.stems.map((entry) => entry.id),
    stemIds(),
  );
  for (const profile of catalogue.profiles) {
    assert.ok(profile.rows.includes(profile.homeRow), `${profile.id} home row is not one of its rows`);
    assert.ok(profile.homeHeight > 0);
    assert.ok(profile.notes, `${profile.id} note is missing`);
  }
  // The combination the viewer opens on has to be buildable.
  const defaults = catalogue.defaults;
  assert.ok(profileIds().includes(defaults.profile));
  assert.ok(stemIds().includes(defaults.stem));

  // Conflicts mirror what the generator would refuse.
  assert.ok(
    catalogue.conflicts.auto.some(
      (entry) => entry.profile === "choc" && entry.units === 2 && entry.stem === "choc-v1",
    ),
    "the known Choc v1 conflict should be listed",
  );
  assert.equal(catalogue.conflicts.none.length, 0, "a single stem always fits");
});

test("the page carries its own styles, markup and code", () => {
  const html = renderViewer({ catalogue: buildCatalogue(), mode: "live" });
  assert.match(html, /<title>Keycap Forge Viewer<\/title>/);
  assert.match(html, /id="canvas"/);
  assert.match(html, /<script type="module">/);
  assert.match(html, /createRenderer/, "the renderer should be inlined");
  assert.match(html, /prefers-color-scheme: dark/, "the page should follow the viewer's theme");
  assert.ok(!/<script[^>]+src=/.test(html), "the page must not load anything externally");
  assert.ok(!/https?:\/\//.test(html.replace(/schemas\.[a-z.]+/g, "")), "no external URLs");

  // Live mode offers downloads; a standalone page cannot serve them.
  assert.match(html, /id="downloads"/);
});

test("embedded data cannot break out of its script element", () => {
  const catalogue = buildCatalogue();
  catalogue.profiles[0].notes = 'sneaky </script><script>alert(1)</script> "quote"';
  const html = renderViewer({ catalogue, mode: "live" });
  const payload = html.slice(html.indexOf('id="keycap-data"'));
  assert.ok(!payload.slice(0, payload.indexOf("</script>")).includes("<script"), "markup leaked");
  assert.match(html, /\\u003c\/script/);
});

test("the document wrapper is a complete HTML file", () => {
  const html = renderDocument(renderViewer({ catalogue: buildCatalogue(), mode: "live" }));
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<\/html>\s*$/);
});

test("the server answers the page, the catalogue and a model", async () => {
  await withServer(async (get) => {
    const page = await get("/");
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /text\/html/);
    assert.match(await page.text(), /id="canvas"/);

    const catalogue = await (await get("/api/catalogue")).json();
    assert.equal(catalogue.profiles.length, profileIds().length);

    const model = await get("/api/model?profile=dsa&row=3&units=1&stem=mx&stabilizers=auto");
    assert.equal(model.status, 200);
    const stats = JSON.parse(model.headers.get("x-keycap-stats"));
    assert.equal(stats.stems, 1);
    assert.ok(Math.abs(stats.height - 7.6) < 0.05, "a DSA cap should be 7.6 mm tall");
    const decoded = decodeMesh(Buffer.from(await model.arrayBuffer()));
    assert.equal(decoded.triangleCount, stats.triangles);
  });
});

test("the server serves printable files for the cap on screen", async () => {
  await withServer(async (get) => {
    const query = "?profile=cherry&row=3&units=6.25&stem=mx&stabilizers=auto";

    const stl = await get("/api/model.stl" + query);
    assert.match(stl.headers.get("content-disposition"), /cherry_r3_6\.25u_mx\.stl/);
    const parsed = inspectBinaryStl(Buffer.from(await stl.arrayBuffer()));
    assert.ok(parsed.count > 0);
    assert.ok(parsed.max[0] - parsed.min[0] > 118, "a 6.25u cap is 118 mm wide");

    const threeMf = await get("/api/model.3mf" + query);
    const entries = readZip(Buffer.from(await threeMf.arrayBuffer()));
    assert.match(entries["3D/3dmodel.model"].toString(), /unit="millimeter"/);
  });
});

test("the server reports bad requests instead of crashing", async () => {
  await withServer(async (get) => {
    assert.equal((await get("/nope")).status, 404);
    assert.equal((await get("/favicon.ico")).status, 204);

    for (const query of [
      "?profile=nope&row=3&units=1&stem=mx",
      "?profile=dsa&row=x&units=1&stem=mx",
      "?profile=dsa&row=3&units=-1&stem=mx",
      "?profile=dsa&row=3&units=1&stem=choc-v1",
      "?profile=sa&row=5&units=1&stem=mx",
    ]) {
      const response = await get("/api/model" + query);
      assert.equal(response.status, 400, query);
      assert.ok((await response.text()).length > 0, `${query} should explain itself`);
    }
  });
});

test("repeated requests for one cap are served from cache", async () => {
  await withServer(async (get) => {
    const query = "/api/model?profile=oem&row=1&units=1&stem=box&stabilizers=auto";
    const first = Buffer.from(await (await get(query)).arrayBuffer());
    const second = Buffer.from(await (await get(query)).arrayBuffer());
    assert.ok(first.equals(second), "the same request must give the same geometry");
  });
});

test("a baked page carries its caps and needs nothing else", async () => {
  const { jobs } = expandMatrix({
    profiles: ["dsa", "choc"],
    rows: [3],
    sizes: [1, 6.25],
    stems: ["mx", "choc-v2"],
  });
  const { html, count, meshBytes } = await bakeViewer(jobs, { quality: "draft" });

  assert.equal(count, jobs.length);
  assert.ok(meshBytes > 0);
  assert.ok(!/<script[^>]+src=/.test(html), "a standalone page must not fetch code");
  assert.ok(!html.includes('id="downloads"'), "a standalone page cannot serve downloads");
  assert.match(html, /"mode":"baked"/);

  // Every job asked for must be present under the key the viewer looks up.
  const payload = JSON.parse(
    html.slice(html.indexOf('id="keycap-data">') + 'id="keycap-data">'.length).split("</script>")[0],
  );
  for (const job of jobs) {
    const entry = payload.baked.models[bakeKey(job)];
    assert.ok(entry, `${job.name} is missing from the page`);
    assert.ok(entry.stats.triangles > 0);
  }
});

test("the view command bakes a file the CLI reports honestly", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "keycap-viewer-"));
  const target = path.join(directory, "preview.html");
  const lines = [];
  const original = console.log;
  console.log = (...parts) => lines.push(parts.join(" "));
  try {
    assert.equal(
      await main(["view", "--bake", target, "--profile", "dsa", "--row", "3", "--quality", "draft"]),
      0,
    );
  } finally {
    console.log = original;
  }

  const html = await readFile(target, "utf8");
  assert.match(html, /^<!doctype html>/);
  assert.match(lines.join("\n"), /1 cap\(s\) baked into/);
  assert.match(lines.join("\n"), /needs no server/);
});
