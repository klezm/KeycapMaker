/**
 * keycap-bake — cut 2D vector graphics clean through a keycap.
 *
 * Typical use:
 *
 *   const { solid: cap } = await generateKeycap({ units: 1 });
 *   const svg = parseSvg(await readFile("logo.svg", "utf8"));
 *   const { profile } = placeGraphic(await regionsToCrossSection(svg.regions), { size: 9 });
 *   const { body, insert, report } = await bake({ cap, profile });
 */
export { getEngine } from "./engine.js";
export { generateKeycap, DEFAULT_CAP } from "./cap/generate.js";
export { loadCapMesh } from "./cap/import-mesh.js";
export { parseSvg } from "./svg/parse-svg.js";
export { flattenPathData } from "./svg/flatten-path.js";
export { regionsToCrossSection, placeGraphic } from "./graphic.js";
export { bake, probeRoofUnderside } from "./bake.js";
export { findIslands, bridgeProfile } from "./islands.js";
export { readStl, writeBinaryStl, writeAsciiStl, stlToManifold } from "./io/stl.js";
export { create3mf } from "./io/threemf.js";
export { createCutPlanSvg } from "./io/cutplan-svg.js";
export { buildPreviewHtml } from "./preview/build-preview.js";
