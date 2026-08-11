import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const OVERLAY_LAYER_NAMES = new Set([
  "legend",
  "legend-left-top",
  "legend-right-top",
  "legend-left-bottom",
  "legend-right-bottom",
  "legend-front",
  "legend-back",
  "legend-left",
  "legend-right",
  "homing",
]);
const REFERENCE_LAYER_NAMES = new Set([
  "j-stem-lp01",
]);
const SMOOTH_PREVIEW_CREASE_ANGLE = Math.PI / 12;
const MIN_NORMAL_LENGTH_SQ = 1e-12;
const DEFAULT_CAMERA_OFFSET = new THREE.Vector3(1.42, 1.18, 1.32);
const COMPACT_CAMERA_DISTANCE_SCALE = 4.2;

function createFaceNormalData(mesh, face) {
  const a = mesh.vertices[face[0]];
  const b = mesh.vertices[face[1]];
  const c = mesh.vertices[face[2]];
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abZ = b.z - a.z;
  const acX = c.x - a.x;
  const acY = c.y - a.y;
  const acZ = c.z - a.z;
  const raw = new THREE.Vector3(
    abY * acZ - abZ * acY,
    abZ * acX - abX * acZ,
    abX * acY - abY * acX,
  );
  const unit = raw.lengthSq() > MIN_NORMAL_LENGTH_SQ
    ? raw.clone().normalize()
    : new THREE.Vector3(0, 0, 1);
  return { raw, unit };
}

function createEdgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function addSmoothNeighbor(vertexFaceNeighbors, vertexIndex, faceIndex, adjacentFaceIndex) {
  if (!vertexFaceNeighbors[vertexIndex].has(faceIndex)) {
    vertexFaceNeighbors[vertexIndex].set(faceIndex, new Set());
  }
  vertexFaceNeighbors[vertexIndex].get(faceIndex).add(adjacentFaceIndex);
}

function createVertexFaceNeighbors(mesh, faceNormals, creaseDot) {
  const edgeFaces = new Map();

  mesh.faces.forEach((face, faceIndex) => {
    for (let edgeIndex = 0; edgeIndex < face.length; edgeIndex += 1) {
      const a = face[edgeIndex];
      const b = face[(edgeIndex + 1) % face.length];
      const edgeKey = createEdgeKey(a, b);
      if (!edgeFaces.has(edgeKey)) {
        edgeFaces.set(edgeKey, { vertices: [a, b], faces: [] });
      }
      edgeFaces.get(edgeKey).faces.push(faceIndex);
    }
  });

  const vertexFaceNeighbors = mesh.vertices.map(() => new Map());

  edgeFaces.forEach(({ vertices, faces }) => {
    if (faces.length !== 2) {
      return;
    }

    const [firstFaceIndex, secondFaceIndex] = faces;
    const firstNormal = faceNormals[firstFaceIndex].unit;
    const secondNormal = faceNormals[secondFaceIndex].unit;
    if (firstNormal.dot(secondNormal) < creaseDot) {
      return;
    }

    vertices.forEach((vertexIndex) => {
      addSmoothNeighbor(vertexFaceNeighbors, vertexIndex, firstFaceIndex, secondFaceIndex);
      addSmoothNeighbor(vertexFaceNeighbors, vertexIndex, secondFaceIndex, firstFaceIndex);
    });
  });

  return vertexFaceNeighbors;
}

function collectSmoothFaceGroup(vertexFaceNeighbors, vertexIndex, faceIndex) {
  const neighborsByFace = vertexFaceNeighbors[vertexIndex];
  const visited = new Set([faceIndex]);
  const pending = [faceIndex];

  while (pending.length > 0) {
    const currentFaceIndex = pending.pop();
    const neighbors = neighborsByFace.get(currentFaceIndex);
    if (!neighbors) {
      continue;
    }

    neighbors.forEach((neighborFaceIndex) => {
      if (!visited.has(neighborFaceIndex)) {
        visited.add(neighborFaceIndex);
        pending.push(neighborFaceIndex);
      }
    });
  }

  return visited;
}

export function createPreviewGeometry(mesh) {
  const positions = [];
  const normals = [];
  const creaseDot = Math.cos(SMOOTH_PREVIEW_CREASE_ANGLE);
  const faceNormals = mesh.faces.map((face) => createFaceNormalData(mesh, face));
  const vertexFaceNeighbors = createVertexFaceNeighbors(mesh, faceNormals, creaseDot);

  mesh.faces.forEach((face, faceIndex) => {
    const currentFaceNormal = faceNormals[faceIndex];

    face.forEach((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      const smoothedNormal = new THREE.Vector3();
      const smoothFaceGroup = collectSmoothFaceGroup(vertexFaceNeighbors, vertexIndex, faceIndex);

      smoothFaceGroup.forEach((smoothFaceIndex) => {
        smoothedNormal.add(faceNormals[smoothFaceIndex].raw);
      });

      if (smoothedNormal.lengthSq() <= MIN_NORMAL_LENGTH_SQ) {
        smoothedNormal.copy(currentFaceNormal.unit);
      } else {
        smoothedNormal.normalize();
      }

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(smoothedNormal.x, smoothedNormal.y, smoothedNormal.z);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

export function getPreviewLayerMaterialSide(layerName, opacity = 1) {
  const isOverlayLayer = OVERLAY_LAYER_NAMES.has(layerName);
  const isReferenceLayer = REFERENCE_LAYER_NAMES.has(layerName);
  const isTransparentLayer = Number.isFinite(opacity) && opacity < 1;

  return isOverlayLayer || isReferenceLayer || isTransparentLayer
    ? THREE.DoubleSide
    : THREE.FrontSide;
}

function normalizeLayers(layers) {
  if (Array.isArray(layers)) {
    return layers;
  }

  return [{ mesh: layers, color: 0x4d8fd8, name: "preview" }];
}

function updatePointerVector(pointer, domElement, clientX, clientY) {
  const rect = domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  const normalizedX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const normalizedY = -((clientY - rect.top) / rect.height) * 2 + 1;

  if (normalizedX < -1 || normalizedX > 1 || normalizedY < -1 || normalizedY > 1) {
    return false;
  }

  pointer.set(normalizedX, normalizedY);
  return true;
}

function isCompactPreviewViewport() {
  return window.innerWidth <= 760;
}

function getMinimumCameraDistanceScale() {
  return isCompactPreviewViewport() ? COMPACT_CAMERA_DISTANCE_SCALE : 0.001;
}

function getDefaultCameraOffset(sceneScale) {
  const offset = DEFAULT_CAMERA_OFFSET.clone();

  if (isCompactPreviewViewport()) {
    offset.setLength(Math.max(offset.length(), COMPACT_CAMERA_DISTANCE_SCALE));
  }

  return offset.multiplyScalar(sceneScale);
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function isValidVector3Array(values) {
  return Array.isArray(values)
    && values.length === 3
    && values.every((value) => isFiniteNumber(value));
}

function isValidVector2Array(values) {
  return Array.isArray(values)
    && values.length === 2
    && values.every((value) => isFiniteNumber(value));
}

function projectToViewport(camera, point, viewportWidth, viewportHeight) {
  camera.updateMatrixWorld();
  const projected = point.clone().project(camera);
  return new THREE.Vector2(
    ((projected.x + 1) / 2) * viewportWidth,
    ((-projected.y + 1) / 2) * viewportHeight,
  );
}

function captureViewState({ camera, controls, sceneScale, viewOffsetRatio }) {
  const target = controls.target.clone();
  const offset = camera.position.clone().sub(target);
  const distance = Math.max(offset.length(), 0.001);

  return {
    direction: offset.normalize().toArray(),
    distanceScale: distance / sceneScale,
    targetScale: target.divideScalar(sceneScale).toArray(),
    viewOffsetRatio: viewOffsetRatio.toArray(),
  };
}

function restoreViewState({ camera, controls, sceneScale, viewState }) {
  if (
    !viewState
    || !isFiniteNumber(viewState.distanceScale)
    || viewState.distanceScale <= 0
    || !isValidVector3Array(viewState.direction)
  ) {
    camera.position.copy(getDefaultCameraOffset(sceneScale));
    controls.target.set(0, 0, 0);
    controls.update();
    return;
  }

  const direction = new THREE.Vector3().fromArray(viewState.direction);
  if (direction.lengthSq() === 0) {
    camera.position.copy(getDefaultCameraOffset(sceneScale));
    controls.target.set(0, 0, 0);
    controls.update();
    return;
  }

  direction.normalize();
  const target = new THREE.Vector3(0, 0, 0);
  const distance = Math.max(viewState.distanceScale * sceneScale, getMinimumCameraDistanceScale() * sceneScale);
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  controls.update();
}

function getViewOffsetRatio(viewState) {
  if (isCompactPreviewViewport()) {
    return new THREE.Vector2();
  }

  if (viewState && isValidVector2Array(viewState.viewOffsetRatio)) {
    return new THREE.Vector2().fromArray(viewState.viewOffsetRatio);
  }

  return new THREE.Vector2();
}

export function mountPreviewScene(container, layers, options = {}) {
  const { initialViewState = null } = options;
  const anchorElement = container.parentElement ?? container;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.cursorStyle = "grab";
  controls.enabled = false;

  scene.add(new THREE.AmbientLight(0xffffff, 1.4));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(24, 32, 18);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xc9e4ff, 0.75);
  rimLight.position.set(-18, -16, 22);
  scene.add(rimLight);

  // A keycap set reuses one mesh object across every cap that shares it, so
  // build the GPU geometry once per distinct mesh rather than once per layer.
  const geometryByMesh = new Map();
  const buildGeometry = (mesh) => {
    const cached = geometryByMesh.get(mesh);
    if (cached) {
      return cached;
    }
    const geometry = createPreviewGeometry(mesh);
    geometry.computeBoundingBox();
    geometryByMesh.set(mesh, geometry);
    return geometry;
  };

  const layerEntries = normalizeLayers(layers).map((layer) => {
    const geometry = buildGeometry(layer.mesh);
    const isOverlayLayer = OVERLAY_LAYER_NAMES.has(layer.name);
    const opacity = Number.isFinite(layer.opacity) ? Math.min(Math.max(layer.opacity, 0), 1) : 1;
    const isTransparentLayer = opacity < 1;
    const material = new THREE.MeshStandardMaterial({
      color: layer.color ?? 0x4d8fd8,
      metalness: 0.08,
      roughness: 0.55,
      transparent: isTransparentLayer,
      opacity: isTransparentLayer ? opacity : 1,
      depthWrite: !isTransparentLayer,
      side: getPreviewLayerMaterialSide(layer.name, opacity),
      polygonOffset: isOverlayLayer,
      polygonOffsetFactor: isOverlayLayer ? -1 : 0,
      polygonOffsetUnits: isOverlayLayer ? -2 : 0,
    });
    const previewMesh = new THREE.Mesh(geometry, material);
    previewMesh.renderOrder = REFERENCE_LAYER_NAMES.has(layer.name) ? 2 : (isOverlayLayer ? 1 : 0);
    scene.add(previewMesh);
    // Layers may carry a placement offset - that is how a keycap set puts each
    // cap on the board without duplicating the mesh per position.
    const offset = new THREE.Vector3(
      layer.offset?.x ?? 0,
      layer.offset?.y ?? 0,
      layer.offset?.z ?? 0,
    );
    return { geometry, material, previewMesh, offset };
  });

  const boundingBox = layerEntries.reduce(
    (box, entry) => box.union(entry.geometry.boundingBox.clone().translate(entry.offset)),
    new THREE.Box3(),
  );
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  layerEntries.forEach((entry) => {
    entry.previewMesh.position.copy(entry.offset).sub(center);
  });

  const sceneScale = Math.max(size.x, size.y, size.z, 1);
  restoreViewState({ camera, controls, sceneScale, viewState: initialViewState });
  const viewOffsetRatio = getViewOffsetRatio(initialViewState);
  const orbitTarget = new THREE.Vector3(0, 0, 0);
  const targetDelta = new THREE.Vector3();
  const TARGET_EPSILON_SQ = 1e-18;

  const interactiveMeshes = layerEntries.map((entry) => entry.previewMesh);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = renderer.domElement;
  let isHoveringMesh = false;
  let isInteracting = false;

  const syncControlsState = (enabled) => {
    controls.enabled = enabled;
    if (!isInteracting) {
      canvas.style.cursor = enabled ? "grab" : "default";
    }
  };

  const syncCanvasTouchAction = () => {
    canvas.style.touchAction = "none";
  };

  const applyViewOffset = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const offsetX = viewOffsetRatio.x * width;
    const offsetY = viewOffsetRatio.y * height;

    if (Math.abs(offsetX) < 0.001 && Math.abs(offsetY) < 0.001) {
      camera.clearViewOffset();
    } else {
      camera.setViewOffset(width, height, offsetX, offsetY, width, height);
    }
    camera.updateProjectionMatrix();
  };

  const syncOrbitTargetToObjectCenter = () => {
    targetDelta.copy(controls.target).sub(orbitTarget);
    if (targetDelta.lengthSq() <= TARGET_EPSILON_SQ) {
      return;
    }

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const desiredCenter = projectToViewport(camera, orbitTarget, width, height);

    controls.target.copy(orbitTarget);
    camera.position.sub(targetDelta);

    const resetCenter = projectToViewport(camera, orbitTarget, width, height);
    const screenDelta = desiredCenter.sub(resetCenter);
    viewOffsetRatio.x -= screenDelta.x / width;
    viewOffsetRatio.y -= screenDelta.y / height;
    applyViewOffset();
  };

  const renderScene = () => {
    controls.update();
    syncOrbitTargetToObjectCenter();
    renderer.render(scene, camera);
  };

  const applyViewState = (viewState) => {
    restoreViewState({ camera, controls, sceneScale, viewState });
    viewOffsetRatio.copy(getViewOffsetRatio(viewState));
    enforceCompactCameraFraming();
    applyViewOffset();
    renderScene();
  };

  const updateHoverState = (clientX, clientY) => {
    if (!updatePointerVector(pointer, canvas, clientX, clientY)) {
      isHoveringMesh = false;
      if (!isInteracting) {
        syncControlsState(false);
      }
      return false;
    }

    raycaster.setFromCamera(pointer, camera);
    isHoveringMesh = raycaster.intersectObjects(interactiveMeshes, false).length > 0;

    if (!isInteracting) {
      syncControlsState(isHoveringMesh);
    }

    return isHoveringMesh;
  };

  const handlePointerMove = (event) => {
    if (isInteracting) {
      return;
    }

    updateHoverState(event.clientX, event.clientY);
  };

  const handlePointerLeave = () => {
    if (isInteracting) {
      return;
    }

    isHoveringMesh = false;
    syncControlsState(false);
  };

  const handlePointerDownCapture = (event) => {
    const isOverMesh = updateHoverState(event.clientX, event.clientY);
    syncControlsState(isOverMesh);
  };

  const handleWheelCapture = (event) => {
    updateHoverState(event.clientX, event.clientY);
  };

  const handleControlStart = () => {
    if (!controls.enabled) {
      return;
    }

    isInteracting = true;
    canvas.style.cursor = "grabbing";
  };

  const handleControlEnd = () => {
    isInteracting = false;
    isHoveringMesh = false;
    syncControlsState(false);
  };

  const enforceCompactCameraFraming = () => {
    if (!isCompactPreviewViewport()) {
      return;
    }

    const offset = camera.position.clone().sub(controls.target);
    const distance = offset.length();
    const direction = distance > 0
      ? offset.divideScalar(distance)
      : getDefaultCameraOffset(1).normalize();
    const fallbackDistance = getMinimumCameraDistanceScale() * sceneScale;
    const nextDistance = distance > 0 ? distance : fallbackDistance;

    controls.target.copy(orbitTarget);
    camera.position.copy(orbitTarget).addScaledVector(direction, nextDistance);
    viewOffsetRatio.set(0, 0);
    controls.update();
  };

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("pointerdown", handlePointerDownCapture, { capture: true });
  canvas.addEventListener("wheel", handleWheelCapture, { capture: true, passive: true });
  syncCanvasTouchAction();
  syncControlsState(false);

  controls.addEventListener("start", handleControlStart);
  controls.addEventListener("end", handleControlEnd);
  controls.addEventListener("change", syncOrbitTargetToObjectCenter);

  const syncViewportCanvasBounds = () => {
    const rect = anchorElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const halfWidth = Math.max(centerX, viewportWidth - centerX, 1);
    const halfHeight = Math.max(centerY, viewportHeight - centerY, 1);
    const left = centerX - halfWidth - rect.left;
    const top = centerY - halfHeight - rect.top;

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    container.style.width = `${halfWidth * 2}px`;
    container.style.height = `${halfHeight * 2}px`;
  };

  const handleResize = () => {
    syncCanvasTouchAction();
    syncViewportCanvasBounds();
    controls.enablePan = true;
    enforceCompactCameraFraming();
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    applyViewOffset();
    renderer.setSize(width, height, false);
  };

  handleResize();

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(anchorElement);
  window.addEventListener("resize", handleResize);
  window.addEventListener("scroll", handleResize, { passive: true });
  window.visualViewport?.addEventListener("resize", handleResize);
  window.visualViewport?.addEventListener("scroll", handleResize, { passive: true });

  let frameId = 0;
  const renderFrame = () => {
    renderScene();
    frameId = requestAnimationFrame(renderFrame);
  };
  renderFrame();

  const dispose = () => {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("scroll", handleResize);
    window.visualViewport?.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("scroll", handleResize);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerleave", handlePointerLeave);
    canvas.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true });
    canvas.removeEventListener("wheel", handleWheelCapture, { capture: true });
    controls.removeEventListener("start", handleControlStart);
    controls.removeEventListener("end", handleControlEnd);
    controls.removeEventListener("change", syncOrbitTargetToObjectCenter);
    controls.dispose();
    // Geometries are shared between layers, so dispose each one once.
    layerEntries.forEach((entry) => {
      entry.material.dispose();
    });
    geometryByMesh.forEach((geometry) => {
      geometry.dispose();
    });
    renderer.dispose();
    container.replaceChildren();
  };

  return {
    applyViewState,
    captureViewState: () => captureViewState({ camera, controls, sceneScale, viewOffsetRatio }),
    dispose,
  };
}
