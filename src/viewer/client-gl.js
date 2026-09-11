// Minimal WebGL2 renderer for keycap meshes. No libraries: the viewer ships
// inside a single HTML file and has to work offline, so everything it draws is
// here.

export const mat4 = {
  identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),

  multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col += 1) {
      for (let row = 0; row < 4; row += 1) {
        let sum = 0;
        for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[col * 4 + k];
        out[col * 4 + row] = sum;
      }
    }
    return out;
  },

  perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },

  orthographic(halfHeight, aspect, near, far) {
    const halfWidth = halfHeight * aspect;
    const out = new Float32Array(16);
    out[0] = 1 / halfWidth;
    out[5] = 1 / halfHeight;
    out[10] = -2 / (far - near);
    out[14] = -(far + near) / (far - near);
    out[15] = 1;
    return out;
  },

  translation(offset) {
    const out = mat4.identity();
    out[12] = offset[0];
    out[13] = offset[1];
    out[14] = offset[2];
    return out;
  },

  rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },

  rotationZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  /** The matrix's rotation with its translation dropped. */
  rotationOf(m) {
    const out = new Float32Array(m);
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    return out;
  },

  /** Transpose of the upper 3x3, which inverts it when it is a rotation. */
  transposeRotation(m) {
    const out = mat4.identity();
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) out[col * 4 + row] = m[row * 4 + col];
    }
    return out;
  },

  lookAt(eye, target, up) {
    const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
    ]);
  },
};

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

const MESH_VERTEX = `#version 300 es
in vec3 position;
uniform mat4 viewProjection;
uniform mat4 model;
out vec3 localPosition;
void main() {
  localPosition = position;
  gl_Position = viewProjection * model * vec4(position, 1.0);
}`;

// Normals come from screen-space derivatives rather than vertex data: the mesh
// is exactly what a slicer would receive, so shading it per facet shows the
// real geometry instead of a smoothed impression of it.
//
// The derivative is taken of the cap's own untransformed position, not of where
// it ended up in the world. The lights below are fixed vectors, so working in
// each cap's own frame keeps every cap in an arrangement lit exactly as it is
// when viewed alone -- which is the whole point of lining them up. Taking the
// normal in world space would instead pin the lighting to the viewer, and a
// cap's shading would slide around as it turned.
const MESH_FRAGMENT = `#version 300 es
precision highp float;
in vec3 localPosition;
uniform vec3 baseColor;
uniform vec3 skyColor;
uniform vec3 groundColor;
uniform float alpha;
out vec4 fragColor;

void main() {
  vec3 normal = normalize(cross(dFdx(localPosition), dFdy(localPosition)));
  vec3 key = normalize(vec3(-0.55, -0.7, 0.85));
  vec3 fill = normalize(vec3(0.75, 0.25, 0.35));

  float keyLight = max(dot(normal, key), 0.0);
  float fillLight = max(dot(normal, fill), 0.0);
  float hemisphere = normal.z * 0.5 + 0.5;
  vec3 ambient = mix(groundColor, skyColor, hemisphere);

  // Weighted so an unlit face still reads as plastic rather than going black,
  // while the top and the two visible sides stay clearly separated.
  vec3 colour = baseColor * (ambient * 0.55 + keyLight * 0.55 + fillLight * 0.18);

  fragColor = vec4(pow(clamp(colour, 0.0, 1.0), vec3(1.0 / 2.2)), alpha);
}`;

const LINE_VERTEX = `#version 300 es
in vec3 position;
uniform mat4 viewProjection;
uniform mat4 model;
out vec2 groundPosition;
void main() {
  groundPosition = position.xy;
  gl_Position = viewProjection * model * vec4(position, 1.0);
}`;

// The fade has to be computed per fragment. Done per vertex it would be
// interpolated between the two ends of a line, and since every grid line runs
// from one edge of the grid to the other, both of its ends sit outside the
// fade radius -- so the whole line would come out at zero.
const LINE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 groundPosition;
uniform vec3 lineColor;
uniform float fadeRadius;
out vec4 fragColor;
void main() {
  float fade = 1.0 - clamp(length(groundPosition) / fadeRadius, 0.0, 1.0);
  if (fade <= 0.01) discard;
  fragColor = vec4(lineColor, fade * 0.55);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader failed to compile");
  }
  return shader;
}

function link(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  // Both programs feed from attribute 0, so pin it rather than trusting the
  // driver to assign the same slot to each.
  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "program failed to link");
  }
  return program;
}

/** A 1u grid on the floor, so cap sizes read at a glance. */
function gridVertices(pitch, halfCount) {
  const reach = pitch * halfCount;
  const lines = [];
  for (let i = -halfCount; i <= halfCount; i += 1) {
    const at = i * pitch;
    lines.push(-reach, at, 0, reach, at, 0);
    lines.push(at, -reach, 0, at, reach, 0);
  }
  return new Float32Array(lines);
}

export function createRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error("This browser does not support WebGL2, which the viewer needs.");

  const meshProgram = link(gl, MESH_VERTEX, MESH_FRAGMENT);
  const lineProgram = link(gl, LINE_VERTEX, LINE_FRAGMENT);

  const meshUniforms = {
    viewProjection: gl.getUniformLocation(meshProgram, "viewProjection"),
    model: gl.getUniformLocation(meshProgram, "model"),
    baseColor: gl.getUniformLocation(meshProgram, "baseColor"),
    skyColor: gl.getUniformLocation(meshProgram, "skyColor"),
    groundColor: gl.getUniformLocation(meshProgram, "groundColor"),
    alpha: gl.getUniformLocation(meshProgram, "alpha"),
  };
  const lineUniforms = {
    viewProjection: gl.getUniformLocation(lineProgram, "viewProjection"),
    lineColor: gl.getUniformLocation(lineProgram, "lineColor"),
    fadeRadius: gl.getUniformLocation(lineProgram, "fadeRadius"),
    model: gl.getUniformLocation(lineProgram, "model"),
  };

  const gridBuffer = gl.createBuffer();
  const gridData = gridVertices(19.05, 5);
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, gridData, gl.STATIC_DRAW);
  const gridVao = gl.createVertexArray();
  gl.bindVertexArray(gridVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  /** Upload a decoded mesh and return a handle the renderer can draw. */
  function upload(mesh) {
    const vao = gl.createVertexArray();
    const positions = gl.createBuffer();
    const indices = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return {
      vao,
      buffers: [positions, indices],
      count: mesh.indices.length,
      type: mesh.indices.BYTES_PER_ELEMENT === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT,
    };
  }

  function dispose(model) {
    if (!model) return;
    gl.deleteVertexArray(model.vao);
    for (const buffer of model.buffers) gl.deleteBuffer(buffer);
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return canvas.clientWidth / Math.max(canvas.clientHeight, 1);
  }

  function draw({ viewProjection, models, palette, grounds = [], gridFade = 95 }) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // One patch of ground per cap, carried by the same transform the cap has.
    // A single shared floor cannot work once the caps are spread out: rotating
    // one plane about the world origin tips it away from every slot but the
    // middle, leaving the outer caps floating above it or sunk into it.
    if (grounds.length > 0) {
      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineUniforms.viewProjection, false, viewProjection);
      gl.uniform3fv(lineUniforms.lineColor, palette.grid);
      gl.uniform1f(lineUniforms.fadeRadius, gridFade);
      gl.bindVertexArray(gridVao);
      for (const transform of grounds) {
        gl.uniformMatrix4fv(lineUniforms.model, false, transform);
        gl.drawArrays(gl.LINES, 0, gridData.length / 3);
      }
    }

    gl.useProgram(meshProgram);
    gl.uniformMatrix4fv(meshUniforms.viewProjection, false, viewProjection);
    gl.uniform3fv(meshUniforms.skyColor, palette.sky);
    gl.uniform3fv(meshUniforms.groundColor, palette.ground);

    // The solid cap first. A pinned ghost then draws with depth testing off
    // so it reads through whatever is in front of it -- the point of pinning
    // one profile is to see it against another, and a shorter profile would
    // otherwise be completely hidden inside a taller one.
    const identity = mat4.identity();
    for (const entry of models) {
      if (!entry.model) continue;
      const solid = entry.alpha >= 1;
      gl.depthMask(solid);
      if (solid) gl.enable(gl.DEPTH_TEST);
      else gl.disable(gl.DEPTH_TEST);
      gl.uniformMatrix4fv(meshUniforms.model, false, entry.transform ?? identity);
      gl.uniform3fv(meshUniforms.baseColor, entry.color);
      gl.uniform1f(meshUniforms.alpha, entry.alpha);
      gl.bindVertexArray(entry.model.vao);
      gl.drawElements(gl.TRIANGLES, entry.model.count, entry.model.type, 0);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  return { gl, upload, dispose, resize, draw };
}
