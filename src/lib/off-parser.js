export function parseOff(content) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("OFF is empty.");
  }

  let lineIndex = 0;
  let countsLine = lines[lineIndex];

  if (countsLine === "OFF") {
    lineIndex += 1;
    countsLine = lines[lineIndex];
  } else if (countsLine.startsWith("OFF")) {
    countsLine = countsLine.slice(3).trim();
  } else {
    throw new Error("OFF header not found.");
  }

  const [vertexCount, faceCount] = countsLine.split(/\s+/).map(Number);
  if (!Number.isFinite(vertexCount) || !Number.isFinite(faceCount)) {
    throw new Error("OFF vertex count or face count is invalid.");
  }

  lineIndex += 1;
  const vertices = [];
  for (let index = 0; index < vertexCount; index += 1, lineIndex += 1) {
    const [x, y, z] = lines[lineIndex].split(/\s+/).map(Number);
    vertices.push({ x, y, z });
  }

  const faces = [];
  for (let index = 0; index < faceCount; index += 1, lineIndex += 1) {
    const values = lines[lineIndex].split(/\s+/).map(Number);
    const polygonSize = values[0];
    const polygonVertices = values.slice(1, polygonSize + 1);

    for (let triangleIndex = 1; triangleIndex < polygonVertices.length - 1; triangleIndex += 1) {
      faces.push([
        polygonVertices[0],
        polygonVertices[triangleIndex],
        polygonVertices[triangleIndex + 1],
      ]);
    }
  }

  return { vertices, faces };
}
