import { strToU8, zipSync } from "fflate";
import { format3mfColor } from "./color-utils.js";

const MATERIALS_NAMESPACE = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02";
const COLOR_GROUP_RESOURCE_ID = 1000;
const DEFAULT_ASSEMBLY_OBJECT_NAME = "keycap";

function escapeXmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatPartName(meshName, index) {
  const name = String(meshName ?? "").trim();
  return name.replace(/^keycap[-_]/i, "") || `part-${index + 1}`;
}

function formatAssemblyObjectName(name) {
  return String(name ?? "").trim() || DEFAULT_ASSEMBLY_OBJECT_NAME;
}

function resolveCreate3mfOptions(options = {}) {
  if (typeof options === "string") {
    return {
      assemblyName: formatAssemblyObjectName(options),
    };
  }

  return {
    assemblyName: formatAssemblyObjectName(options.assemblyName),
  };
}

function createBambuModelSettingsXml(meshes, assemblyName) {
  const assemblyObjectId = meshes.length + 1;
  const parts = meshes
    .map((mesh, index) => {
      const objectId = index + 1;
      const name = escapeXmlAttribute(formatPartName(mesh.name, index));

      return [
        `    <part id="${objectId}" subtype="normal_part">`,
        `      <metadata key="name" value="${name}"/>`,
        "    </part>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<config>",
    `  <object id="${assemblyObjectId}">`,
    `    <metadata key="name" value="${escapeXmlAttribute(assemblyName)}"/>`,
    parts,
    "  </object>",
    "</config>",
  ].join("\n");
}

function createSlic3rPeModelSettingsXml(meshes) {
  const objects = meshes
    .map((mesh, index) => {
      const objectId = index + 1;
      const name = escapeXmlAttribute(formatPartName(mesh.name, index));
      const lastTriangleId = Math.max(mesh.faces.length - 1, 0);

      return [
        ` <object id="${objectId}" instances_count="1">`,
        `  <metadata type="object" key="name" value="${name}"/>`,
        `  <volume firstid="0" lastid="${lastTriangleId}">`,
        `   <metadata type="volume" key="name" value="${name}"/>`,
        '   <metadata type="volume" key="volume_type" value="ModelPart"/>',
        '   <mesh edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>',
        "  </volume>",
        " </object>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<config>",
    objects,
    "</config>",
  ].join("\n");
}

function createModelXml(meshes, assemblyName) {
  if (meshes.length === 0) {
    throw new Error("There are no meshes to include in the 3MF.");
  }

  const colorResources = meshes
    .map((mesh) => format3mfColor(mesh.colorHex))
    .map((colorHex) => `<m:color color="${colorHex}" />`)
    .join("");

  const partResources = meshes
    .map((mesh, index) => {
      const objectId = index + 1;
      const meshName = escapeXmlAttribute(mesh.name);
      const partName = escapeXmlAttribute(formatPartName(mesh.name, index));
      const vertices = mesh.vertices
        .map((vertex) => `<vertex x="${vertex.x}" y="${vertex.y}" z="${vertex.z}" />`)
        .join("");
      const triangles = mesh.faces
        .map(
          (face) =>
            `<triangle v1="${face[0]}" v2="${face[1]}" v3="${face[2]}" />`,
        )
        .join("");

      return [
        `<object id="${objectId}" name="${meshName}" partnumber="${partName}" type="model" pid="${COLOR_GROUP_RESOURCE_ID}" pindex="${index}">`,
        "<mesh>",
        `<vertices>${vertices}</vertices>`,
        `<triangles>${triangles}</triangles>`,
        "</mesh>",
        "</object>",
      ].join("");
    })
    .join("");

  const assemblyObjectId = meshes.length + 1;
  const components = meshes
    .map((_, index) => `<component objectid="${index + 1}" />`)
    .join("");
  const assemblyResource = [
    `<object id="${assemblyObjectId}" name="${escapeXmlAttribute(assemblyName)}" type="model">`,
    `<components>${components}</components>`,
    "</object>",
  ].join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="ja-JP" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="${MATERIALS_NAMESPACE}">`,
    `<resources><m:colorgroup id="${COLOR_GROUP_RESOURCE_ID}">${colorResources}</m:colorgroup>${partResources}${assemblyResource}</resources>`,
    `<build><item objectid="${assemblyObjectId}" /></build>`,
    "</model>",
  ].join("");
}

function createKeysetModelXml(keycaps) {
  if (keycaps.length === 0) {
    throw new Error("There are no keycaps to include in the 3MF.");
  }

  const allMeshes = keycaps.flatMap((keycap) => keycap.meshes);
  if (allMeshes.length === 0) {
    throw new Error("There are no meshes to include in the 3MF.");
  }

  const colorResources = allMeshes
    .map((mesh) => format3mfColor(mesh.colorHex))
    .map((colorHex) => `<m:color color="${colorHex}" />`)
    .join("");

  // Ids are handed out per keycap - that cap's part objects, then its assembly -
  // so each keycap's objects stay contiguous and ids never collide across the
  // plate. The slicer config writers below walk the keycaps in the same order.
  let nextObjectId = 1;
  let nextColorIndex = 0;
  const partResources = [];
  const assemblyResources = [];
  const buildItems = [];

  for (const keycap of keycaps) {
    const componentIds = [];

    for (const mesh of keycap.meshes) {
      const objectId = nextObjectId;
      nextObjectId += 1;
      const colorIndex = nextColorIndex;
      nextColorIndex += 1;
      componentIds.push(objectId);

      const meshName = escapeXmlAttribute(mesh.name);
      const partName = escapeXmlAttribute(formatPartName(mesh.name, colorIndex));
      const vertices = mesh.vertices
        .map((vertex) => `<vertex x="${vertex.x}" y="${vertex.y}" z="${vertex.z}" />`)
        .join("");
      const triangles = mesh.faces
        .map((face) => `<triangle v1="${face[0]}" v2="${face[1]}" v3="${face[2]}" />`)
        .join("");

      partResources.push([
        `<object id="${objectId}" name="${meshName}" partnumber="${partName}" type="model" pid="${COLOR_GROUP_RESOURCE_ID}" pindex="${colorIndex}">`,
        "<mesh>",
        `<vertices>${vertices}</vertices>`,
        `<triangles>${triangles}</triangles>`,
        "</mesh>",
        "</object>",
      ].join(""));
    }

    const assemblyObjectId = nextObjectId;
    nextObjectId += 1;
    const components = componentIds
      .map((objectId) => `<component objectid="${objectId}" />`)
      .join("");

    assemblyResources.push([
      `<object id="${assemblyObjectId}" name="${escapeXmlAttribute(formatAssemblyObjectName(keycap.name))}" type="model">`,
      `<components>${components}</components>`,
      "</object>",
    ].join(""));

    // Each keycap keeps its modelled coordinates and is placed on the plate by
    // its build transform, so the meshes themselves stay reusable and comparable.
    const { x = 0, y = 0, z = 0 } = keycap.position ?? {};
    buildItems.push(
      `<item objectid="${assemblyObjectId}" transform="1 0 0 0 1 0 0 0 1 ${x} ${y} ${z}" />`,
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="${MATERIALS_NAMESPACE}">`,
    `<resources><m:colorgroup id="${COLOR_GROUP_RESOURCE_ID}">${colorResources}</m:colorgroup>${partResources.join("")}${assemblyResources.join("")}</resources>`,
    `<build>${buildItems.join("")}</build>`,
    "</model>",
  ].join("");
}

function createKeysetBambuModelSettingsXml(keycaps) {
  let nextObjectId = 1;
  const objects = [];

  for (const keycap of keycaps) {
    const partIds = keycap.meshes.map(() => {
      const id = nextObjectId;
      nextObjectId += 1;
      return id;
    });
    const assemblyObjectId = nextObjectId;
    nextObjectId += 1;

    const parts = keycap.meshes
      .map((mesh, index) => [
        `    <part id="${partIds[index]}" subtype="normal_part">`,
        `      <metadata key="name" value="${escapeXmlAttribute(formatPartName(mesh.name, index))}"/>`,
        "    </part>",
      ].join("\n"))
      .join("\n");

    objects.push([
      `  <object id="${assemblyObjectId}">`,
      `    <metadata key="name" value="${escapeXmlAttribute(formatAssemblyObjectName(keycap.name))}"/>`,
      parts,
      "  </object>",
    ].join("\n"));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<config>",
    objects.join("\n"),
    "</config>",
  ].join("\n");
}

function createKeysetSlic3rPeModelSettingsXml(keycaps) {
  let nextObjectId = 1;
  const objects = [];

  for (const keycap of keycaps) {
    const keycapName = formatAssemblyObjectName(keycap.name);
    for (const mesh of keycap.meshes) {
      const objectId = nextObjectId;
      nextObjectId += 1;
      // Part names are prefixed with the keycap so a 105-key plate stays readable.
      const partName = escapeXmlAttribute(`${keycapName}-${formatPartName(mesh.name, objectId - 1)}`);
      const lastTriangleId = Math.max(mesh.faces.length - 1, 0);

      objects.push([
        ` <object id="${objectId}" instances_count="1">`,
        `  <metadata type="object" key="name" value="${partName}"/>`,
        `  <volume firstid="0" lastid="${lastTriangleId}">`,
        `   <metadata type="volume" key="name" value="${partName}"/>`,
        '   <metadata type="volume" key="volume_type" value="ModelPart"/>',
        '   <mesh edges_fixed="0" degenerate_facets="0" facets_removed="0" backwards_edges="0"/>',
        "  </volume>",
        " </object>",
      ].join("\n"));
    }
    // Skip the id the assembly object consumes in 3dmodel.model.
    nextObjectId += 1;
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<config>",
    objects.join("\n"),
    "</config>",
  ].join("\n");
}

/**
 * Build one 3MF holding a whole keycap set.
 *
 * Each entry of `keycaps` is `{ name, meshes, position }`. Unlike
 * create3mfBlob(), which emits a single build item, this places one build item
 * per keycap so every cap stays independently selectable in a slicer.
 */
export function create3mfKeysetBlob(keycaps) {
  const archive = {
    "3D/3dmodel.model": strToU8(createKeysetModelXml(keycaps)),
    "Metadata/model_settings.config": strToU8(createKeysetBambuModelSettingsXml(keycaps)),
    "Metadata/Slic3r_PE_model.config": strToU8(createKeysetSlic3rPeModelSettingsXml(keycaps)),
    "[Content_Types].xml": strToU8(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>',
        "</Types>",
      ].join(""),
    ),
    "_rels/.rels": strToU8(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>',
        "</Relationships>",
      ].join(""),
    ),
  };

  return new Blob([zipSync(archive, { level: 0 })], { type: "model/3mf" });
}

export function create3mfBlob(meshes, options = {}) {
  const { assemblyName } = resolveCreate3mfOptions(options);
  const archive = {
    "3D/3dmodel.model": strToU8(createModelXml(meshes, assemblyName)),
    "Metadata/model_settings.config": strToU8(createBambuModelSettingsXml(meshes, assemblyName)),
    "Metadata/Slic3r_PE_model.config": strToU8(createSlic3rPeModelSettingsXml(meshes)),
    "[Content_Types].xml": strToU8(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>',
        "</Types>",
      ].join(""),
    ),
    "_rels/.rels": strToU8(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>',
        "</Relationships>",
      ].join(""),
    ),
  };

  return new Blob([zipSync(archive, { level: 0 })], { type: "model/3mf" });
}
