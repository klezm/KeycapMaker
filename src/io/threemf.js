/**
 * 3MF writer.
 *
 * This is the format that actually carries the point of the tool into a slicer:
 * body and insert arrive as two separate objects with their own materials, so
 * the insert can be assigned a transparent filament and the legend lights up.
 * A pair of STLs loses that pairing; a single mesh loses it entirely.
 */
import { zipSync, strToU8 } from "fflate";

const MODEL_NAMESPACE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => {
    switch (character) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return "&apos;";
    }
  });
}

/** 3MF wants #RRGGBBAA; accept #RGB, #RRGGBB or #RRGGBBAA. */
function normaliseColor(color, fallback = "#CCCCCCFF") {
  if (typeof color !== "string") return fallback;
  let hex = color.trim().replace(/^#/, "").toUpperCase();
  if (/^[0-9A-F]{3}$/.test(hex)) hex = [...hex].map((c) => c + c).join("");
  if (/^[0-9A-F]{6}$/.test(hex)) hex += "FF";
  return /^[0-9A-F]{8}$/.test(hex) ? `#${hex}` : fallback;
}

function meshToXml(mesh, precision) {
  const { numProp, vertProperties, triVerts } = mesh;
  const vertexCount = vertProperties.length / numProp;
  const round = (value) => Number(value.toFixed(precision));

  const lines = ["      <vertices>"];
  for (let vert = 0; vert < vertexCount; vert += 1) {
    const base = vert * numProp;
    lines.push(
      `        <vertex x="${round(vertProperties[base])}" y="${round(vertProperties[base + 1])}" z="${round(vertProperties[base + 2])}"/>`,
    );
  }
  lines.push("      </vertices>", "      <triangles>");
  for (let tri = 0; tri < triVerts.length; tri += 3) {
    lines.push(`        <triangle v1="${triVerts[tri]}" v2="${triVerts[tri + 1]}" v3="${triVerts[tri + 2]}"/>`);
  }
  lines.push("      </triangles>");
  return lines.join("\n");
}

/**
 * Build a 3MF package from one or more named parts.
 *
 * @param {Array<{name: string, color?: string, mesh: {numProp: number, vertProperties: Float32Array, triVerts: Uint32Array}}>} parts
 * @param {object} [options]
 * @param {number} [options.precision] decimal places for coordinates
 * @returns {Uint8Array}
 */
export function create3mf(parts, options = {}) {
  const { precision = 5 } = options;
  if (parts.length === 0) throw new Error("A 3MF package needs at least one part.");

  const materials = parts
    .map((part, index) => `      <base name="${escapeXml(part.name)}" displaycolor="${normaliseColor(part.color, index === 0 ? "#303030FF" : "#FFFFFF59")}"/>`)
    .join("\n");

  const objects = parts
    .map((part, index) => {
      const objectId = index + 2; // id 1 is the base materials group
      return [
        `    <object id="${objectId}" type="model" pid="1" pindex="${index}" name="${escapeXml(part.name)}">`,
        "      <mesh>",
        meshToXml(part.mesh, precision),
        "      </mesh>",
        "    </object>",
      ].join("\n");
    })
    .join("\n");

  const items = parts.map((_part, index) => `    <item objectid="${index + 2}"/>`).join("\n");

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="${MODEL_NAMESPACE}">
  <metadata name="Application">keycap-bake</metadata>
  <resources>
    <basematerials id="1">
${materials}
    </basematerials>
${objects}
  </resources>
  <build>
${items}
  </build>
</model>
`;

  return zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES),
      "_rels/.rels": strToU8(ROOT_RELS),
      "3D/3dmodel.model": strToU8(model),
    },
    { level: 6 },
  );
}
