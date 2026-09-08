/**
 * A top-down "cut plan" drawing.
 *
 * Slicing at the cut plane and drawing what is about to be removed catches
 * scale, rotation and mirroring mistakes in one glance, without loading a 3D
 * viewer — and it is the clearest way to show which counters float free.
 */
import { getEngine } from "../engine.js";
import { findIslands } from "../islands.js";

const PADDING = 2;

function polygonsToPath(polygons) {
  return polygons
    .map((contour) => `M${contour.map(([x, y]) => `${x.toFixed(3)} ${(-y).toFixed(3)}`).join("L")}Z`)
    .join(" ");
}

/**
 * @param {object} options
 * @param {import("manifold-3d").Manifold} options.cap the untouched keycap
 * @param {import("manifold-3d").Manifold} options.body the cut result
 * @param {import("manifold-3d").CrossSection} options.profile the cut profile actually used
 * @param {object} options.report the bake report
 * @returns {Promise<string>} SVG source
 */
export async function createCutPlanSvg({ cap, body, profile, report }) {
  await getEngine();

  const footprint = cap.project();
  // Just above the cut plane: the roof material the graphic passes through.
  const roof = cap.slice(report.cutFromZ + 0.05);
  const { islands } = findIslands(body);
  const islandOutlines = islands.map((island) => island.project());

  const box = footprint.bounds();
  const drawMinX = box.min[0] - PADDING;
  const drawWidth = box.max[0] - box.min[0] + 2 * PADDING;
  const drawHeight = box.max[1] - box.min[1] + 2 * PADDING;

  const islandPath = islandOutlines.length
    ? polygonsToPath(islandOutlines.reduce((a, b) => a.add(b)).toPolygons())
    : "";

  const notes = [`cut from z=${report.cutFromZ.toFixed(2)} mm (${report.cutFromZSource}), clearance ${report.clearance} mm`];
  if (report.islandsRemaining > 0) {
    notes.push(`${report.islandsRemaining} detached island(s), in red — only the insert holds them`);
  }
  if (report.bridgesAdded > 0) notes.push(`${report.bridgesAdded} bridge(s) added`);
  if (report.blockedFraction > 0.005) {
    notes.push(`${(report.blockedFraction * 100).toFixed(0)}% sits over solid material, so it is not see-through`);
  }

  // Size the caption band to the text rather than clipping it.
  const longest = notes.reduce((most, note) => Math.max(most, note.length), 0);
  const fontSize = Math.min(0.8, (drawWidth - 1.0) / (longest * 0.62));
  const lineHeight = fontSize * 1.45;
  const captionHeight = notes.length * lineHeight + 0.8;
  const totalHeight = drawHeight + captionHeight;
  const drawMinY = -box.max[1] - PADDING;

  const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${drawMinX.toFixed(3)} ${drawMinY.toFixed(3)} ${drawWidth.toFixed(3)} ${totalHeight.toFixed(3)}" width="${(drawWidth * 20).toFixed(0)}" height="${(totalHeight * 20).toFixed(0)}">
  <title>keycap-bake cut plan</title>
  <rect x="${drawMinX.toFixed(3)}" y="${drawMinY.toFixed(3)}" width="${drawWidth.toFixed(3)}" height="${totalHeight.toFixed(3)}" fill="#f6f6f4"/>
  <path d="${polygonsToPath(footprint.toPolygons())}" fill="#ffffff" stroke="#c8c8c2" stroke-width="0.12"/>
  <path d="${polygonsToPath(roof.toPolygons())}" fill="#e9e9e4" stroke="#b4b4ae" stroke-width="0.1"/>
  <path d="${polygonsToPath(profile.toPolygons())}" fill="#2f6fdb" fill-opacity="0.8" fill-rule="evenodd"/>
  ${islandPath ? `<path d="${islandPath}" fill="#d63b2f" fill-rule="evenodd"/>` : ""}
${notes
  .map(
    (note, index) =>
      `  <text x="${(drawMinX + 0.4).toFixed(3)}" y="${(drawMinY + drawHeight + 0.4 + (index + 1) * lineHeight).toFixed(3)}" font-family="ui-monospace,monospace" font-size="${fontSize.toFixed(3)}" fill="${index === 0 ? "#555" : "#a03028"}">${escape(note)}</text>`,
  )
  .join("\n")}
</svg>
`;
}
