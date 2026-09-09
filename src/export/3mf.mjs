import { createZip } from "./zip.mjs";
import { meshOf } from "./stl.mjs";

const CORE_NAMESPACE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

const RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

/** Trim float noise so the XML stays small and diffs stay readable. */
function num(value) {
  return String(Number(value.toFixed(5)));
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The 3D/3dmodel.model part: mesh geometry plus descriptive metadata. */
export function toModelXml(solid, metadata = {}) {
  const { vertices, triangles, stride } = meshOf(solid);

  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NAMESPACE}">`,
  ];
  for (const [name, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;
    parts.push(`  <metadata name="${escapeXml(name)}">${escapeXml(value)}</metadata>`);
  }
  parts.push("  <resources>", '    <object id="1" type="model">', "      <mesh>", "        <vertices>");

  for (let v = 0; v < vertices.length; v += stride) {
    parts.push(
      `          <vertex x="${num(vertices[v])}" y="${num(vertices[v + 1])}" z="${num(vertices[v + 2])}"/>`,
    );
  }
  parts.push("        </vertices>", "        <triangles>");
  for (let t = 0; t < triangles.length; t += 3) {
    parts.push(
      `          <triangle v1="${triangles[t]}" v2="${triangles[t + 1]}" v3="${triangles[t + 2]}"/>`,
    );
  }
  parts.push(
    "        </triangles>",
    "      </mesh>",
    "    </object>",
    "  </resources>",
    "  <build>",
    '    <item objectid="1"/>',
    "  </build>",
    "</model>",
    "",
  );
  return parts.join("\n");
}

/**
 * Package a solid as a 3MF file: a ZIP holding the OPC content types, the
 * package relationships and the model part.
 *
 * @param {object} solid a Manifold solid
 * @param {object} [metadata] free-form `<metadata>` entries, e.g. Title
 * @returns {Buffer}
 */
export function to3mf(solid, metadata = {}) {
  return createZip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: RELATIONSHIPS },
    { name: "3D/3dmodel.model", data: toModelXml(solid, metadata) },
  ]);
}
