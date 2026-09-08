#!/usr/bin/env node
/**
 * keycap-bake command line interface.
 */
import { parseArgs } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join, dirname } from "node:path";

import { generateKeycap, DEFAULT_CAP } from "../src/cap/generate.js";
import { loadCapMesh } from "../src/cap/import-mesh.js";
import { parseSvg } from "../src/svg/parse-svg.js";
import { regionsToCrossSection, placeGraphic } from "../src/graphic.js";
import { bake } from "../src/bake.js";
import { writeBinaryStl, stlToManifold } from "../src/io/stl.js";
import { create3mf } from "../src/io/threemf.js";
import { createCutPlanSvg } from "../src/io/cutplan-svg.js";
import { buildPreviewHtml } from "../src/preview/build-preview.js";

const USAGE = `keycap-bake — cut 2D vector graphics clean through a keycap

  keycap-bake bake --svg <file> [options]
  keycap-bake cap [cap options]
  keycap-bake inspect <mesh.stl>

Graphic
  --svg <file>          SVG to cut with (required for "bake")
  --size <mm>           target size; "10" or "10x6". Omitted: fit the top face
  --fit <mode>          contain (default) | cover | exact
  --margin <mm>         inset from the top face edge when --size is omitted (default 2)
  --rotate <deg>        rotate counter-clockwise
  --offset-x <mm>       move right      --offset-y <mm>   move up
  --mirror              mirror left-to-right
  --flatness <mm>       curve flattening tolerance (default 0.02)

Cut
  --clearance <mm>      gap between body and insert (default 0.15)
  --cut-from-z <mm>     override the probed roof underside
  --islands <policy>    keep (default) | bridge | error
  --bridge-width <mm>   tie-bar width when bridging (default 0.8)
  --bridge-count <n>    tie-bars per island (default 1)

Keycap (ignored when --cap is given)
  --cap <file.stl>      bake into an existing keycap mesh
  --units <n>           key width in U (default 1)
  --height <mm>         cap height (default 9)
  --wall <mm>           side wall thickness (default 1.4)
  --top-thickness <mm>  roof thickness (default 1.5)
  --dish <mode>         cyl (default) | sph | flat
  --dish-depth <mm>     dish depth (default 1)
  --stem <mode>         mx (default) | none

Output
  --out <dir>           output directory (default "out")
  --name <base>         base filename (default: the SVG's name)
  --format <list>       3mf,stl (default) — comma separated
  --body-color <hex>    body colour in the 3MF (default #303030)
  --insert-color <hex>  insert colour, alpha allowed (default #FFFFFF59)
  --preview             also write a self-contained 3D preview page
  --cut-plan            also write a top-down cut plan SVG
  --quiet               only print written paths
`;

const OPTIONS = {
  svg: { type: "string" },
  cap: { type: "string" },
  size: { type: "string" },
  fit: { type: "string", default: "contain" },
  margin: { type: "string", default: "2" },
  rotate: { type: "string", default: "0" },
  "offset-x": { type: "string", default: "0" },
  "offset-y": { type: "string", default: "0" },
  mirror: { type: "boolean", default: false },
  flatness: { type: "string", default: "0.02" },
  clearance: { type: "string", default: "0.15" },
  "cut-from-z": { type: "string" },
  islands: { type: "string", default: "keep" },
  "bridge-width": { type: "string", default: "0.8" },
  "bridge-count": { type: "string", default: "1" },
  units: { type: "string" },
  height: { type: "string" },
  wall: { type: "string" },
  "top-thickness": { type: "string" },
  dish: { type: "string" },
  "dish-depth": { type: "string" },
  stem: { type: "string" },
  out: { type: "string", default: "out" },
  name: { type: "string" },
  format: { type: "string", default: "3mf,stl" },
  "body-color": { type: "string", default: "#303030" },
  "insert-color": { type: "string", default: "#FFFFFF59" },
  preview: { type: "boolean", default: false },
  "cut-plan": { type: "boolean", default: false },
  quiet: { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
};

function fail(message) {
  process.stderr.write(`keycap-bake: ${message}\n`);
  process.exit(1);
}

function num(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(`${flag} expects a number, got "${value}"`);
  return parsed;
}

/** Only pass through generator flags the user actually set. */
function capParamsFrom(values) {
  const mapping = {
    units: "units",
    height: "height",
    wall: "wall",
    "top-thickness": "topThickness",
    dish: "dish",
    "dish-depth": "dishDepth",
    stem: "stem",
  };
  const params = {};
  for (const [flag, key] of Object.entries(mapping)) {
    if (values[flag] === undefined) continue;
    params[key] = key === "dish" || key === "stem" ? values[flag] : num(values[flag], `--${flag}`);
  }
  if (params.dish && !["cyl", "sph", "flat"].includes(params.dish)) fail(`--dish expects cyl, sph or flat`);
  if (params.stem && !["mx", "none"].includes(params.stem)) fail(`--stem expects mx or none`);
  return params;
}

function parseSize(value) {
  if (value === undefined) return null;
  const parts = String(value).toLowerCase().split(/[x,]/).map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part <= 0)) fail(`--size expects "10" or "10x6", got "${value}"`);
  return parts.length === 1 ? parts[0] : [parts[0], parts[1]];
}

async function write(path, contents, written) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  written.push(path);
}

async function commandBake(values) {
  if (!values.svg) fail("--svg is required. Run `keycap-bake --help` for usage.");
  if (!["keep", "bridge", "error"].includes(values.islands)) fail("--islands expects keep, bridge or error");
  if (!["contain", "cover", "exact"].includes(values.fit)) fail("--fit expects contain, cover or exact");

  const formats = values.format.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  for (const format of formats) {
    if (!["3mf", "stl"].includes(format)) fail(`--format expects 3mf and/or stl, got "${format}"`);
  }

  const source = await readFile(values.svg, "utf8").catch(() => fail(`cannot read ${values.svg}`));
  const parsed = parseSvg(source, { flatness: num(values.flatness, "--flatness") });
  if (parsed.regions.length === 0) {
    const hint = parsed.strokeOnlyCount > 0
      ? ` It has ${parsed.strokeOnlyCount} stroke-only shape(s) — convert strokes to outlines first (Inkscape: Path > Stroke to Path).`
      : "";
    fail(`${basename(values.svg)} has no filled shapes to cut with.${hint}`);
  }

  const generated = values.cap ? null : await generateKeycap(capParamsFrom(values));
  const cap = values.cap ? await loadCapMesh(values.cap).catch((error) => fail(error.message)) : generated.solid;

  // With no --size, fit inside the cap's top face less a margin.
  const capBox = cap.boundingBox();
  const margin = num(values.margin, "--margin");
  const topBounds = generated
    ? generated.topOutline.bounds()
    : cap.slice(capBox.max[2] - (capBox.max[2] - capBox.min[2]) * 0.1).bounds();
  const fitBox = [
    Math.max(0.1, topBounds.max[0] - topBounds.min[0] - 2 * margin),
    Math.max(0.1, topBounds.max[1] - topBounds.min[1] - 2 * margin),
  ];

  let placed;
  try {
    placed = placeGraphic(await regionsToCrossSection(parsed.regions), {
      size: parseSize(values.size),
      fitBox,
      fit: values.fit,
      rotate: num(values.rotate, "--rotate"),
      offset: [num(values["offset-x"], "--offset-x"), num(values["offset-y"], "--offset-y")],
      mirror: values.mirror,
    });
  } catch (error) {
    fail(error.message);
  }

  let result;
  try {
    result = await bake({
      cap,
      profile: placed.profile,
      cutFromZ: values["cut-from-z"] === undefined ? null : num(values["cut-from-z"], "--cut-from-z"),
      clearance: num(values.clearance, "--clearance"),
      islands: values.islands,
      bridge: {
        width: num(values["bridge-width"], "--bridge-width"),
        count: num(values["bridge-count"], "--bridge-count"),
      },
    });
  } catch (error) {
    fail(error.message);
  }

  const { body, insert, profile, report } = result;
  const name = values.name || basename(values.svg, extname(values.svg));
  const written = [];

  if (formats.includes("stl")) {
    await write(join(values.out, `${name}-body.stl`), writeBinaryStl(body.getMesh(), `${name} body`), written);
    await write(join(values.out, `${name}-insert.stl`), writeBinaryStl(insert.getMesh(), `${name} insert`), written);
  }
  if (formats.includes("3mf")) {
    const bytes = create3mf([
      { name: "body", color: values["body-color"], mesh: body.getMesh() },
      { name: "insert", color: values["insert-color"], mesh: insert.getMesh() },
    ]);
    await write(join(values.out, `${name}.3mf`), bytes, written);
  }
  if (values["cut-plan"]) {
    await write(join(values.out, `${name}-cut-plan.svg`), await createCutPlanSvg({ cap, body, profile, report }), written);
  }
  if (values.preview) {
    const notes = [
      `cut from z=${report.cutFromZ.toFixed(2)} mm (${report.cutFromZSource}), clearance ${report.clearance} mm`,
      `${report.islandsRemaining} detached island(s), ${(report.blockedFraction * 100).toFixed(0)}% of the graphic over solid material`,
    ];
    const html = buildPreviewHtml(
      [
        { name: "body", color: "#3a3f47", opacity: 1, mesh: body.getMesh() },
        { name: "insert", color: "#eaf2ff", opacity: 0.42, mesh: insert.getMesh() },
      ],
      { title: `${name} — keycap-bake`, notes },
    );
    await write(join(values.out, `${name}-preview.html`), html, written);
  }

  if (!values.quiet) {
    const lines = [
      `graphic   ${basename(values.svg)} -> ${placed.bounds.width.toFixed(2)} x ${placed.bounds.height.toFixed(2)} mm`,
      `cut       from z=${report.cutFromZ.toFixed(3)} mm (${report.cutFromZSource}), ${report.cutHeight.toFixed(2)} mm tall, clearance ${report.clearance} mm`,
      `volumes   cap ${report.capVolume.toFixed(1)} = body ${report.bodyVolume.toFixed(1)} + insert ${report.insertVolume.toFixed(1)} + kerf ${report.volumeGap.toFixed(2)} mm3`,
      `parts     body ${report.bodyParts}, insert ${report.insertParts}`,
    ];
    if (report.bridgesAdded > 0) lines.push(`bridges   ${report.bridgesAdded} tie-bar(s) added`);
    process.stdout.write(lines.join("\n") + "\n");

    if (report.islandsRemaining > 0) {
      process.stdout.write(
        `\nnote      ${report.islandsRemaining} detached island(s) — the enclosed middles of letters like O or A.\n` +
          `          They are in the body file but only stay put once the insert is printed with them.\n` +
          `          Use --islands bridge for a single-material open window.\n`,
      );
    }
    if (report.blockedFraction > 0.005) {
      process.stdout.write(
        `\nnote      ${(report.blockedFraction * 100).toFixed(0)}% of the graphic sits over solid material (usually the stem),\n` +
          `          so that part will not be see-through. Move it with --offset-x/--offset-y.\n`,
      );
    }
  }
  process.stdout.write(written.map((path) => `wrote     ${path}`).join("\n") + "\n");
}

async function commandCap(values) {
  const { solid } = await generateKeycap(capParamsFrom(values));
  const name = values.name || "cap";
  const written = [];
  await write(join(values.out, `${name}.stl`), writeBinaryStl(solid.getMesh(), name), written);
  if (!values.quiet) {
    const box = solid.boundingBox();
    process.stdout.write(
      `cap       ${(box.max[0] - box.min[0]).toFixed(2)} x ${(box.max[1] - box.min[1]).toFixed(2)} x ${(box.max[2] - box.min[2]).toFixed(2)} mm, ${solid.volume().toFixed(1)} mm3\n`,
    );
  }
  process.stdout.write(written.map((path) => `wrote     ${path}`).join("\n") + "\n");
}

async function commandInspect(path) {
  if (!path) fail("inspect needs a mesh path");
  const bytes = await readFile(path).catch(() => fail(`cannot read ${path}`));
  let solid;
  try {
    solid = await stlToManifold(new Uint8Array(bytes));
  } catch (error) {
    fail(error.message);
  }
  const box = solid.boundingBox();
  const mesh = solid.getMesh();
  process.stdout.write(
    [
      `file      ${basename(path)}`,
      `size      ${(box.max[0] - box.min[0]).toFixed(3)} x ${(box.max[1] - box.min[1]).toFixed(3)} x ${(box.max[2] - box.min[2]).toFixed(3)} mm`,
      `z range   ${box.min[2].toFixed(3)} .. ${box.max[2].toFixed(3)}`,
      `volume    ${solid.volume().toFixed(3)} mm3`,
      `mesh      ${mesh.numVert} vertices, ${mesh.numTri} triangles`,
      `topology  ${solid.decompose().length} component(s), genus ${solid.genus()}, status ${solid.status()}`,
      "",
    ].join("\n"),
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] && !argv[0].startsWith("-") ? argv[0] : null;
  const rest = command ? argv.slice(1) : argv;

  let parsedArgs;
  try {
    parsedArgs = parseArgs({ args: rest, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    fail(error.message);
  }
  const { values, positionals } = parsedArgs;

  if (values.help || !command) {
    process.stdout.write(USAGE);
    process.exit(command ? 0 : 1);
  }

  switch (command) {
    case "bake":
      return commandBake(values);
    case "cap":
      return commandCap(values);
    case "inspect":
      return commandInspect(positionals[0]);
    default:
      fail(`unknown command "${command}". Expected bake, cap or inspect.`);
  }
}

main().catch((error) => fail(error.stack || error.message));
