/**
 * A single-file 3D preview.
 *
 * The output is one HTML file you can double-click: mesh data is embedded and
 * the renderer is a few hundred lines of plain WebGL, so there is nothing to
 * fetch and no dev server to run. The insert is drawn translucent, which is the
 * whole point — you see the transparent-legend effect before you slice.
 */

function toBase64(typedArray) {
  return Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength).toString("base64");
}

function encodePart(part) {
  const { numProp, vertProperties, triVerts } = part.mesh;
  // Strip any extra vertex properties down to positions.
  let positions;
  if (numProp === 3) {
    positions = Float32Array.from(vertProperties);
  } else {
    const count = vertProperties.length / numProp;
    positions = new Float32Array(count * 3);
    for (let vert = 0; vert < count; vert += 1) {
      positions[vert * 3] = vertProperties[vert * numProp];
      positions[vert * 3 + 1] = vertProperties[vert * numProp + 1];
      positions[vert * 3 + 2] = vertProperties[vert * numProp + 2];
    }
  }
  return {
    name: part.name,
    color: part.color,
    opacity: part.opacity ?? 1,
    positions: toBase64(positions),
    indices: toBase64(Uint32Array.from(triVerts)),
  };
}

const VIEWER_SCRIPT = String.raw`
const decode = (text) => {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// Flat shading reads best on a keycap: expand to non-indexed and give every
// triangle its own face normal.
function buildGeometry(part) {
  const positions = new Float32Array(decode(part.positions));
  const indices = new Uint32Array(decode(part.indices));
  const out = new Float32Array(indices.length * 6);
  for (let tri = 0; tri < indices.length; tri += 3) {
    const a = indices[tri] * 3, b = indices[tri + 1] * 3, c = indices[tri + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b+1] - positions[a+1], uz = positions[b+2] - positions[a+2];
    const vx = positions[c] - positions[a], vy = positions[c+1] - positions[a+1], vz = positions[c+2] - positions[a+2];
    let nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    for (let corner = 0; corner < 3; corner += 1) {
      const src = indices[tri + corner] * 3;
      const dst = (tri + corner) * 6;
      out[dst] = positions[src]; out[dst+1] = positions[src+1]; out[dst+2] = positions[src+2];
      out[dst+3] = nx; out[dst+4] = ny; out[dst+5] = nz;
    }
  }
  return { data: out, count: indices.length };
}

const canvas = document.getElementById("view");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
if (!gl) document.getElementById("hint").textContent = "WebGL is unavailable in this browser.";

const program = (() => {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, [
    "attribute vec3 aPosition; attribute vec3 aNormal;",
    "uniform mat4 uProjection; uniform mat4 uView;",
    "varying vec3 vNormal; varying vec3 vView;",
    "void main() {",
    "  vNormal = aNormal;",
    "  vec4 eye = uView * vec4(aPosition, 1.0);",
    "  vView = -eye.xyz;",
    "  gl_Position = uProjection * eye;",
    "}",
  ].join("\n"));
  const fragment = compile(gl.FRAGMENT_SHADER, [
    "precision mediump float;",
    "uniform vec3 uColor; uniform float uOpacity;",
    "varying vec3 vNormal; varying vec3 vView;",
    "void main() {",
    "  vec3 n = normalize(vNormal);",
    "  vec3 key = normalize(vec3(0.4, 0.5, 1.0));",
    "  vec3 fill = normalize(vec3(-0.6, -0.3, 0.4));",
    "  float light = 0.30 + 0.62 * max(dot(n, key), 0.0) + 0.22 * max(dot(n, fill), 0.0);",
    "  float rim = pow(1.0 - abs(dot(n, normalize(vView))), 3.0);",
    "  gl_FragColor = vec4(uColor * light + rim * 0.10, uOpacity);",
    "}",
  ].join("\n"));
  const created = gl.createProgram();
  gl.attachShader(created, vertex);
  gl.attachShader(created, fragment);
  gl.linkProgram(created);
  if (!gl.getProgramParameter(created, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(created));
  return created;
})();

gl.useProgram(program);
const attributes = { position: gl.getAttribLocation(program, "aPosition"), normal: gl.getAttribLocation(program, "aNormal") };
const uniforms = {
  projection: gl.getUniformLocation(program, "uProjection"),
  view: gl.getUniformLocation(program, "uView"),
  color: gl.getUniformLocation(program, "uColor"),
  opacity: gl.getUniformLocation(program, "uOpacity"),
};

const parts = PARTS.map((part) => {
  const geometry = buildGeometry(part);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, geometry.data, gl.STATIC_DRAW);
  const hex = part.color.replace("#", "");
  return {
    name: part.name,
    buffer,
    count: geometry.count,
    opacity: part.opacity,
    visible: true,
    rgb: [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
    data: geometry.data,
  };
});

// Frame the model.
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const part of parts) {
  for (let i = 0; i < part.data.length; i += 6) {
    for (let axis = 0; axis < 3; axis += 1) {
      bounds.min[axis] = Math.min(bounds.min[axis], part.data[i + axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], part.data[i + axis]);
    }
  }
}
const centre = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2);
const radius = Math.max(...bounds.max.map((value, axis) => value - bounds.min[axis])) || 1;

const HOME = { yaw: -0.6, pitch: 0.95, distance: radius * 2.6 };
const camera = { ...HOME };

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
}

function lookAt(eye, target, up) {
  const z = [eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]];
  let length = Math.hypot(...z) || 1;
  z[0] /= length; z[1] /= length; z[2] /= length;
  const x = [up[1]*z[2] - up[2]*z[1], up[2]*z[0] - up[0]*z[2], up[0]*z[1] - up[1]*z[0]];
  length = Math.hypot(...x) || 1;
  x[0] /= length; x[1] /= length; x[2] /= length;
  const y = [z[1]*x[2] - z[2]*x[1], z[2]*x[0] - z[0]*x[2], z[0]*x[1] - z[1]*x[0]];
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0]*eye[0] + x[1]*eye[1] + x[2]*eye[2]),
    -(y[0]*eye[0] + y[1]*eye[1] + y[2]*eye[2]),
    -(z[0]*eye[0] + z[1]*eye[1] + z[2]*eye[2]),
    1,
  ];
}

function draw() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(canvas.clientWidth * ratio);
  const height = Math.floor(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.10, 0.11, 0.13, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const eye = [
    centre[0] + camera.distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
    centre[1] + camera.distance * Math.cos(camera.pitch) * Math.cos(camera.yaw),
    centre[2] + camera.distance * Math.sin(camera.pitch),
  ];
  gl.uniformMatrix4fv(uniforms.projection, false, perspective(0.9, canvas.width / canvas.height, radius * 0.05, radius * 40));
  gl.uniformMatrix4fv(uniforms.view, false, lookAt(eye, centre, [0, 0, 1]));

  // Opaque first, then translucent with depth writes off, so the insert reads
  // as glass rather than punching a hole in the body.
  const order = [...parts].sort((a, b) => b.opacity - a.opacity);
  for (const part of order) {
    if (!part.visible) continue;
    const translucent = part.opacity < 1;
    gl.depthMask(!translucent);
    if (translucent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.disable(gl.BLEND);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, part.buffer);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.uniform3fv(uniforms.color, part.rgb);
    gl.uniform1f(uniforms.opacity, part.opacity);
    gl.drawArrays(gl.TRIANGLES, 0, part.count);
  }
  gl.depthMask(true);
}

let dragging = null;
canvas.addEventListener("pointerdown", (event) => {
  dragging = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup", (event) => {
  dragging = null;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  camera.yaw -= (event.clientX - dragging.x) * 0.01;
  camera.pitch = Math.max(-1.5, Math.min(1.5, camera.pitch + (event.clientY - dragging.y) * 0.01));
  dragging = { x: event.clientX, y: event.clientY };
  draw();
});
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  camera.distance = Math.max(radius * 0.4, Math.min(radius * 12, camera.distance * (1 + Math.sign(event.deltaY) * 0.12)));
  draw();
}, { passive: false });
window.addEventListener("resize", draw);

const controls = document.getElementById("controls");
for (const part of parts) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.addEventListener("change", () => { part.visible = input.checked; draw(); });
  label.append(input, document.createTextNode(" " + part.name));
  controls.append(label);
}
const reset = document.createElement("button");
reset.textContent = "Reset view";
reset.addEventListener("click", () => { Object.assign(camera, HOME); draw(); });
controls.append(reset);

draw();
`;

/**
 * Build the preview page.
 *
 * @param {Array<{name: string, color: string, opacity?: number, mesh: object}>} parts
 * @param {object} [options]
 * @param {string} [options.title]
 * @param {string[]} [options.notes] lines shown under the title
 * @returns {string} HTML source
 */
export function buildPreviewHtml(parts, options = {}) {
  const { title = "keycap-bake preview", notes = [] } = options;
  const payload = JSON.stringify(parts.map(encodePart));
  const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; height: 100vh; display: flex; flex-direction: column;
         background: #1a1c20; color: #e8e8e6;
         font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
  header { padding: 10px 14px; border-bottom: 1px solid #303338; }
  h1 { margin: 0 0 2px; font-size: 14px; font-weight: 600; }
  .notes { color: #9aa0a8; font-size: 12px; font-family: ui-monospace, monospace; }
  .notes div { white-space: pre-wrap; }
  #view { flex: 1; width: 100%; display: block; touch-action: none; cursor: grab; }
  #view:active { cursor: grabbing; }
  #controls { display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
              padding: 9px 14px; border-top: 1px solid #303338; }
  label { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
  button { font: inherit; padding: 3px 10px; border-radius: 5px;
           border: 1px solid #3d4148; background: #24272c; color: inherit; cursor: pointer; }
  button:hover { background: #2d3137; }
  #hint { margin-left: auto; color: #7d838b; }
</style>
</head>
<body>
<header>
  <h1>${escape(title)}</h1>
  <div class="notes">${notes.map((note) => `<div>${escape(note)}</div>`).join("")}</div>
</header>
<canvas id="view"></canvas>
<div id="controls"><span id="hint">drag to orbit &middot; scroll to zoom</span></div>
<script>
const PARTS = ${payload};
${VIEWER_SCRIPT}
</script>
</body>
</html>
`;
}
