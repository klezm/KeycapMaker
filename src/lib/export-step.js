const DEFAULT_STEP_OBJECT_NAME = "keycap";
const STEP_EPSILON = 1e-9;

function formatObjectName(name) {
  return String(name ?? "").trim() || DEFAULT_STEP_OBJECT_NAME;
}

function formatStepNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) < STEP_EPSILON) {
    return "0.";
  }

  const formatted = number.toFixed(9).replace(/\.?0+$/, "");
  return formatted.includes(".") ? formatted : `${formatted}.`;
}

function encodeStepString(value) {
  const input = String(value ?? "");
  let output = "";
  let unicodeBuffer = "";

  const flushUnicode = () => {
    if (!unicodeBuffer) {
      return;
    }
    output += `\\X2\\${unicodeBuffer}\\X0\\`;
    unicodeBuffer = "";
  };

  for (let index = 0; index < input.length; index += 1) {
    const codeUnit = input.charCodeAt(index);

    if (codeUnit >= 32 && codeUnit <= 126) {
      flushUnicode();
      if (input[index] === "'") {
        output += "''";
      } else if (input[index] === "\\") {
        output += "\\\\";
      } else {
        output += input[index];
      }
      continue;
    }

    if (codeUnit === 9 || codeUnit === 10 || codeUnit === 13) {
      flushUnicode();
      output += " ";
      continue;
    }

    unicodeBuffer += codeUnit.toString(16).toUpperCase().padStart(4, "0");
  }

  flushUnicode();
  return `'${output}'`;
}

function createEntityWriter() {
  const lines = [];
  let nextId = 1;

  return {
    add(definition) {
      const id = nextId;
      nextId += 1;
      lines.push(`#${id}=${definition};`);
      return `#${id}`;
    },
    getLines() {
      return lines;
    },
  };
}

function formatVectorTuple(values) {
  return `(${values.map(formatStepNumber).join(",")})`;
}

function subtractVector(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function crossVector(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vectorLength(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalizeVector(vector) {
  const length = vectorLength(vector);
  if (length < STEP_EPSILON) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function resolveFaceFrame(vertices, face) {
  const origin = vertices[face[0]];

  for (let edgeIndex = 1; edgeIndex < face.length - 1; edgeIndex += 1) {
    const edgeA = subtractVector(vertices[face[edgeIndex]], origin);
    const edgeB = subtractVector(vertices[face[edgeIndex + 1]], origin);
    const normal = normalizeVector(crossVector(edgeA, edgeB));
    const reference = normalizeVector(edgeA);

    if (normal && reference) {
      return { normal, reference };
    }
  }

  return null;
}

function isFiniteVertex(vertex) {
  return Number.isFinite(vertex?.x) && Number.isFinite(vertex?.y) && Number.isFinite(vertex?.z);
}

function normalizeMesh(mesh = {}) {
  const vertices = Array.isArray(mesh.vertices) ? mesh.vertices : [];
  const faces = Array.isArray(mesh.faces) ? mesh.faces : [];

  if (vertices.length === 0 || faces.length === 0) {
    throw new Error("No meshes to include in STEP.");
  }

  const normalizedVertices = vertices.map((vertex) => {
    if (!isFiniteVertex(vertex)) {
      throw new Error("Vertex coordinates to include in STEP are invalid.");
    }

    return {
      x: vertex.x,
      y: vertex.y,
      z: vertex.z,
    };
  });

  const normalizedFaces = faces
    .map((face) => (Array.isArray(face) ? face.map((index) => Number(index)) : []))
    .filter((face) => {
      if (face.length < 3 || new Set(face).size < 3) {
        return false;
      }

      if (face.some((index) => !Number.isInteger(index) || index < 0 || index >= normalizedVertices.length)) {
        throw new Error("Face vertex references to include in STEP are invalid.");
      }

      return Boolean(resolveFaceFrame(normalizedVertices, face));
    });

  if (normalizedFaces.length === 0) {
    throw new Error("No valid faces to include in STEP.");
  }

  return {
    vertices: normalizedVertices,
    faces: normalizedFaces,
  };
}

function createStepHeader({ name, createdAt }) {
  const objectName = formatObjectName(name);
  const timestamp = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt ?? Date.now()).toISOString();

  return [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('KeycapMaker faceted STEP export'),'2;1');",
    `FILE_NAME(${encodeStepString(`${objectName}.step`)},${encodeStepString(timestamp)},(${encodeStepString("KeycapMaker")}),(${encodeStepString("KeycapMaker")}),${encodeStepString("KeycapMaker")},${encodeStepString("KeycapMaker")},'');`,
    "FILE_SCHEMA(('AUTOMOTIVE_DESIGN_CC2 { 1 2 10303 214 2 1 1 }'));",
    "ENDSEC;",
    "DATA;",
  ];
}

export function createStepText(mesh, options = {}) {
  const { vertices, faces } = normalizeMesh(mesh);
  const objectName = formatObjectName(options.name);
  const writer = createEntityWriter();

  const applicationContextId = writer.add("APPLICATION_CONTEXT('automotive_design')");
  writer.add(`APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,${applicationContextId})`);
  const productContextId = writer.add(`PRODUCT_CONTEXT('',${applicationContextId},'mechanical')`);
  const productId = writer.add(`PRODUCT(${encodeStepString(objectName)},${encodeStepString(objectName)},'',(${productContextId}))`);
  const productFormationId = writer.add(`PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',${productId},.NOT_KNOWN.)`);
  const productDefinitionContextId = writer.add(`PRODUCT_DEFINITION_CONTEXT('part definition',${applicationContextId},'design')`);
  const productDefinitionId = writer.add(`PRODUCT_DEFINITION('design','',${productFormationId},${productDefinitionContextId})`);
  const productDefinitionShapeId = writer.add(`PRODUCT_DEFINITION_SHAPE('','',${productDefinitionId})`);

  const originPointId = writer.add("CARTESIAN_POINT('',(0.,0.,0.))");
  const zDirectionId = writer.add("DIRECTION('',(0.,0.,1.))");
  const xDirectionId = writer.add("DIRECTION('',(1.,0.,0.))");
  const originAxisId = writer.add(`AXIS2_PLACEMENT_3D('',${originPointId},${zDirectionId},${xDirectionId})`);
  const lengthUnitId = writer.add("(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.))");
  const angleUnitId = writer.add("(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.))");
  const solidAngleUnitId = writer.add("(NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT())");
  const uncertaintyId = writer.add(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.001),${lengthUnitId},'distance_accuracy_value','')`);
  const contextId = writer.add(`(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${uncertaintyId})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${lengthUnitId},${angleUnitId},${solidAngleUnitId})) REPRESENTATION_CONTEXT('KeycapMaker',''))`);

  const pointIds = vertices.map((vertex) =>
    writer.add(`CARTESIAN_POINT('',${formatVectorTuple([vertex.x, vertex.y, vertex.z])})`),
  );

  const faceIds = faces.map((face) => {
    const frame = resolveFaceFrame(vertices, face);
    const loopPointIds = face.map((vertexIndex) => pointIds[vertexIndex]).join(",");
    const polyLoopId = writer.add(`POLY_LOOP('',(${loopPointIds}))`);
    const faceOuterBoundId = writer.add(`FACE_OUTER_BOUND('',${polyLoopId},.T.)`);
    const normalDirectionId = writer.add(`DIRECTION('',${formatVectorTuple([frame.normal.x, frame.normal.y, frame.normal.z])})`);
    const referenceDirectionId = writer.add(`DIRECTION('',${formatVectorTuple([frame.reference.x, frame.reference.y, frame.reference.z])})`);
    const axisPlacementId = writer.add(`AXIS2_PLACEMENT_3D('',${pointIds[face[0]]},${normalDirectionId},${referenceDirectionId})`);
    const planeId = writer.add(`PLANE('',${axisPlacementId})`);
    return writer.add(`FACE_SURFACE('',(${faceOuterBoundId}),${planeId},.T.)`);
  });

  const closedShellId = writer.add(`CLOSED_SHELL('',(${faceIds.join(",")}))`);
  const brepId = writer.add(`FACETED_BREP(${encodeStepString(objectName)},${closedShellId})`);
  const shapeRepresentationId = writer.add(`FACETED_BREP_SHAPE_REPRESENTATION(${encodeStepString(objectName)},(${originAxisId},${brepId}),${contextId})`);
  writer.add(`SHAPE_DEFINITION_REPRESENTATION(${productDefinitionShapeId},${shapeRepresentationId})`);

  return [
    ...createStepHeader({
      name: objectName,
      createdAt: options.createdAt,
    }),
    ...writer.getLines(),
    "ENDSEC;",
    "END-ISO-10303-21;",
    "",
  ].join("\n");
}

export function createStepBlob(mesh, options = {}) {
  return new Blob([createStepText(mesh, options)], { type: "model/step;charset=utf-8" });
}
