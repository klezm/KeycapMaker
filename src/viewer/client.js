import { mat4, createRenderer } from "./client-gl.js";

const data = JSON.parse(document.getElementById("keycap-data").textContent);
const { catalogue, mode, baked } = data;

const canvas = document.getElementById("canvas");
const messageBox = document.getElementById("message");

const profileById = new Map(catalogue.profiles.map((entry) => [entry.id, entry]));
const stemById = new Map(catalogue.stems.map((entry) => [entry.id, entry]));

/** In a standalone page, the caps that were actually baked in. */
const bakedPicks =
  mode === "baked"
    ? Object.keys(baked.models).map((key) => {
        const [profile, row, units, stem, stabilizers, homing] = key.split("|");
        return { profile, row: Number(row), units: Number(units), stem, stabilizers, homing };
      })
    : null;

const keyOf = (pick) =>
  [pick.profile, pick.row, pick.units, pick.stem, pick.stabilizers, pick.homing].join("|");

// Open on something the page actually carries.
const opening =
  bakedPicks && !baked.models[keyOf(catalogue.defaults)] ? bakedPicks[0] : null;

const state = {
  profile: catalogue.defaults.profile,
  row: catalogue.defaults.row,
  units: catalogue.defaults.units,
  stem: catalogue.defaults.stem,
  stabilizers: catalogue.defaults.stabilizers,
  homing: catalogue.defaults.homing,
  ortho: false,
  spin: false,
  grid: true,
};

if (opening) Object.assign(state, opening);

const camera = { theta: -0.62, phi: 0.42, radius: 60, target: [0, 0, 5] };
let current = null;
let pinned = null;
let pinnedLabel = "";
let pinnedStats = null;
let renderer = null;
let loadToken = 0;

/* ---------------------------------------------------------------- data --- */

function decodeMesh(buffer) {
  const view = new DataView(buffer);
  if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== "KCM1") {
    throw new Error("The model data is not in the expected format.");
  }
  const vertexCount = view.getUint32(4, true);
  const triangleCount = view.getUint32(8, true);
  const indexBits = view.getUint32(12, true);
  const indexStart = 16 + vertexCount * 12;
  return {
    positions: new Float32Array(buffer, 16, vertexCount * 3),
    indices:
      indexBits === 16
        ? new Uint16Array(buffer, indexStart, triangleCount * 3)
        : new Uint32Array(buffer, indexStart, triangleCount * 3),
    triangleCount,
  };
}

function base64ToBuffer(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Would this choice lead anywhere? A chip is offered when at least one
 * buildable cap keeps it, so a standalone page greys out what it does not
 * carry instead of letting someone pick a dead end.
 */
function offers(change) {
  const trial = { ...state, ...change };
  if (bakedPicks) {
    // Anchor on the current profile, so a Choc stem does not look available
    // while an MX cap is selected just because some Choc cap was baked in.
    const fields = new Set(Object.keys(change));
    if (!fields.has("profile")) fields.add("profile");
    return bakedPicks.some((pick) => [...fields].every((field) => pick[field] === trial[field]));
  }
  const profile = profileById.get(trial.profile);
  if (change.row !== undefined) return profile.rows.includes(trial.row);
  if (change.profile !== undefined) return true;
  return !conflictFor({ ...trial, row: profile.rows.includes(trial.row) ? trial.row : profile.homeRow });
}

/** Is this combination something the generator can actually build? */
function conflictFor(pick) {
  const profile = profileById.get(pick.profile);
  const stem = stemById.get(pick.stem);
  if (!stem.mounts.includes(profile.mount)) {
    return stem.name + " does not mount on a " + profile.mount + " cap";
  }
  if (!profile.rows.includes(pick.row)) return "R" + pick.row + " does not exist on " + profile.name;
  const list = catalogue.conflicts[pick.stabilizers] || [];
  const hit = list.find(
    (entry) =>
      entry.profile === pick.profile && entry.units === pick.units && entry.stem === pick.stem,
  );
  if (hit) return hit.reason;
  if (mode === "baked" && !baked.models[keyOf(pick)]) {
    return "not included in this standalone page";
  }
  return null;
}

async function fetchModel(pick) {
  if (mode === "baked") {
    const entry = baked.models[keyOf(pick)];
    if (!entry) throw new Error("That combination is not included in this page.");
    return { mesh: decodeMesh(base64ToBuffer(entry.mesh)), stats: entry.stats };
  }
  const query = new URLSearchParams({
    profile: pick.profile,
    row: String(pick.row),
    units: String(pick.units),
    stem: pick.stem,
    stabilizers: String(pick.stabilizers),
    homing: pick.homing,
  });
  const response = await fetch("api/model?" + query.toString());
  if (!response.ok) throw new Error((await response.text()) || "The model could not be built.");
  const stats = JSON.parse(response.headers.get("X-Keycap-Stats") || "{}");
  return { mesh: decodeMesh(await response.arrayBuffer()), stats };
}

/* ------------------------------------------------------------- camera --- */

/**
 * Fit the camera to everything on screen. With a ghost pinned that means both
 * caps, so switching from a 7.6 mm DSA to a 16.7 mm SA widens the frame
 * instead of running the taller one off the top.
 */
function frame(...stats) {
  const boxes = stats.filter(Boolean).map((entry) => entry.boundingBox);
  if (boxes.length === 0) return;
  const min = [0, 1, 2].map((axis) => Math.min(...boxes.map((box) => box.min[axis])));
  const max = [0, 1, 2].map((axis) => Math.max(...boxes.map((box) => box.max[axis])));
  camera.target = [0, 1, 2].map((axis) => (min[axis] + max[axis]) / 2);
  camera.radius = Math.max(...[0, 1, 2].map((axis) => max[axis] - min[axis])) * 2.4 + 22;
}

function eyePosition() {
  const { theta, phi, radius, target } = camera;
  return [
    target[0] + radius * Math.cos(phi) * Math.sin(theta),
    target[1] - radius * Math.cos(phi) * Math.cos(theta),
    target[2] + radius * Math.sin(phi),
  ];
}

function viewProjection(aspect) {
  const eye = eyePosition();
  const view = mat4.lookAt(eye, camera.target, [0, 0, 1]);
  const projection = state.ortho
    ? mat4.orthographic(camera.radius * 0.26, aspect, 0.1, 4000)
    : mat4.perspective((32 * Math.PI) / 180, aspect, 0.5, 4000);
  return mat4.multiply(projection, view);
}

const VIEWS = {
  iso: { theta: -0.62, phi: 0.42, ortho: false },
  front: { theta: 0, phi: 0, ortho: true },
  side: { theta: -Math.PI / 2, phi: 0, ortho: true },
  top: { theta: 0, phi: Math.PI / 2 - 0.001, ortho: true },
  // Looking up at the open underside, which is where the stems are.
  under: { theta: 0, phi: -0.75, ortho: false },
};

/* ----------------------------------------------------------- rendering --- */

function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const dark = style.getPropertyValue("--ink").trim().toLowerCase().startsWith("#e");
  return {
    sky: dark ? [0.3, 0.31, 0.36] : [0.46, 0.47, 0.5],
    ground: dark ? [0.07, 0.07, 0.09] : [0.2, 0.19, 0.18],
    grid: dark ? [0.39, 0.45, 0.48] : [0.5, 0.54, 0.56],
    cap: dark ? [0.78, 0.78, 0.77] : [0.90, 0.90, 0.89],
    // Amber, deliberately away from the accent: a pinned ghost is a second cap
    // to read against, not a selected control.
    ghost: dark ? [0.96, 0.68, 0.28] : [0.85, 0.52, 0.12],
  };
}

let palette = readPalette();

function renderFrame() {
  const aspect = renderer.resize();
  if (state.spin) camera.theta += 0.006;
  renderer.draw({
    viewProjection: viewProjection(aspect),
    palette,
    showGrid: state.grid,
    gridFade: Math.max(34, camera.radius * 0.95),
    models: [
      { model: current, color: palette.cap, alpha: 1 },
      { model: pinned, color: palette.ghost, alpha: 0.32 },
    ],
  });
  requestAnimationFrame(renderFrame);
}

/* ------------------------------------------------------------- controls --- */

function chip(label, pressed, disabled, onClick, title) {
  const button = document.createElement("button");
  button.className = "chip";
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-pressed", String(pressed));
  button.disabled = disabled;
  if (title) button.title = title;
  button.addEventListener("click", onClick);
  return button;
}

function buildProfileList() {
  const host = document.getElementById("profile-list");
  host.replaceChildren();
  for (const profile of catalogue.profiles) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile";
    button.setAttribute("aria-pressed", String(profile.id === state.profile));
    const name = document.createElement("span");
    name.className = "pname";
    name.textContent = profile.name;
    const meta = document.createElement("span");
    meta.className = "pmeta";
    meta.textContent = profile.homeHeight.toFixed(1) + " mm";
    button.append(name, meta);
    button.title = profile.notes;
    button.disabled = !offers({ profile: profile.id });
    button.addEventListener("click", () => select({ profile: profile.id }));
    host.append(button);
  }
}

function buildRowChips() {
  const host = document.getElementById("row-chips");
  const profile = profileById.get(state.profile);
  host.replaceChildren();
  if (!profile.sculpted) {
    const note = document.createElement("span");
    note.className = "pmeta";
    note.textContent = "uniform - every row is the same shape";
    host.append(note);
    return;
  }
  for (const row of [1, 2, 3, 4, 5]) {
    host.append(
      chip(
        "R" + row,
        row === state.row,
        !profile.rows.includes(row) || !offers({ row }),
        () => select({ row }),
      ),
    );
  }
}

function buildSizeChips() {
  const host = document.getElementById("size-chips");
  host.replaceChildren();
  for (const size of catalogue.sizes) {
    const stabilised = size.stabilizerSpanUnits > 0;
    host.append(
      chip(
        size.units + "u",
        size.units === state.units,
        !offers({ units: size.units }),
        () => select({ units: size.units }),
        stabilised ? "3 stems, " + size.stabilizerSpanUnits + "u apart" : "single stem",
      ),
    );
  }
}

function buildStemChips() {
  const host = document.getElementById("stem-chips");
  const profile = profileById.get(state.profile);
  host.replaceChildren();
  for (const stem of catalogue.stems) {
    const problem = offers({ stem: stem.id }) ? null : conflictFor({ ...state, stem: stem.id });
    host.append(
      chip(
        stem.name,
        stem.id === state.stem,
        Boolean(problem),
        () => select({ stem: stem.id }),
        problem || stem.description,
      ),
    );
  }
  void profile;
}

function buildStabilizerChips() {
  const host = document.getElementById("stab-chips");
  host.replaceChildren();
  for (const [value, label] of [
    ["auto", "Auto"],
    ["none", "Single stem"],
  ]) {
    host.append(
      chip(
        label,
        state.stabilizers === value,
        !offers({ stabilizers: value }),
        () => select({ stabilizers: value }),
      ),
    );
  }
}

function buildHomingChips() {
  const host = document.getElementById("homing-chips");
  host.replaceChildren();
  for (const marker of catalogue.homing) {
    host.append(
      chip(
        marker.name,
        marker.id === state.homing,
        !offers({ homing: marker.id }),
        () => select({ homing: marker.id }),
        marker.description,
      ),
    );
  }
}

function buildViewButtons() {
  const host = document.getElementById("views");
  host.replaceChildren();
  for (const [name, label] of [
    ["iso", "Iso"],
    ["front", "Front"],
    ["side", "Side"],
    ["top", "Top"],
    ["under", "Under"],
  ]) {
    host.append(
      chip(label, false, false, () => {
        Object.assign(camera, { theta: VIEWS[name].theta, phi: VIEWS[name].phi });
        state.ortho = VIEWS[name].ortho;
        state.spin = false;
        refreshControls();
      }),
    );
  }
  host.append(
    document.createElement("span"),
    chip("Ortho", state.ortho, false, () => {
      state.ortho = !state.ortho;
      refreshControls();
    }, "Orthographic projection, for comparing profile silhouettes"),
    chip("Spin", state.spin, false, () => {
      state.spin = !state.spin;
      refreshControls();
    }),
    chip("Grid", state.grid, false, () => {
      state.grid = !state.grid;
      refreshControls();
    }, "A 19.05 mm switch grid on the floor"),
  );
}

function buildCompareButtons() {
  const host = document.getElementById("compare-chips");
  host.replaceChildren();
  host.append(
    chip(pinned ? "Re-pin this cap" : "Pin as ghost", false, !current, () => {
      if (pinned) renderer.dispose(pinned);
      pinned = current ? renderer.upload(lastMesh) : null;
      pinnedLabel = describe(state);
      pinnedStats = lastStats;
      refreshControls();
    }, "Keep the current cap on screen, translucent, to compare others against"),
  );
  if (pinned) {
    host.append(
      chip("Clear", false, false, () => {
        renderer.dispose(pinned);
        pinned = null;
        pinnedLabel = "";
        pinnedStats = null;
        frame(lastStats);
        refreshControls();
      }),
    );
    const note = document.createElement("span");
    note.className = "pmeta";
    note.textContent = "ghost: " + pinnedLabel;
    host.append(note);
  }
}

function refreshControls() {
  buildProfileList();
  buildRowChips();
  buildSizeChips();
  buildStemChips();
  buildStabilizerChips();
  buildHomingChips();
  buildViewButtons();
  buildCompareButtons();
  const links = document.getElementById("downloads");
  if (links) {
    const query = new URLSearchParams({
      profile: state.profile,
      row: String(state.row),
      units: String(state.units),
      stem: state.stem,
      stabilizers: String(state.stabilizers),
      homing: state.homing,
    }).toString();
    for (const anchor of links.querySelectorAll("a")) {
      anchor.href = "api/model." + anchor.dataset.format + "?" + query;
    }
  }
}

function describe(pick) {
  const profile = profileById.get(pick.profile);
  const row = profile.sculpted ? " R" + pick.row : "";
  const homing = pick.homing === "none" ? "" : " + " + pick.homing;
  return profile.name + row + " " + pick.units + "u " + stemById.get(pick.stem).name + homing;
}

/**
 * Apply a change, then repair anything it invalidated: switching to a Choc
 * profile has to move off an MX stem, and switching to SA has to move off R5.
 */
function select(change) {
  Object.assign(state, change);
  const profile = profileById.get(state.profile);
  if (!profile.rows.includes(state.row)) state.row = profile.homeRow;

  if (conflictFor(state)) {
    const fallback = catalogue.stems.find((stem) => !conflictFor({ ...state, stem: stem.id }));
    if (fallback) state.stem = fallback.id;
  }
  // A standalone page carries a subset, so keep what was just clicked and move
  // the other fields to the nearest cap it does have.
  if (bakedPicks && conflictFor(state)) {
    const keep = Object.keys(change);
    const best = bakedPicks
      .filter((pick) => keep.every((field) => pick[field] === state[field]))
      .sort(
        (a, b) =>
          matchScore(b, state) - matchScore(a, state) ||
          Math.abs(a.units - state.units) - Math.abs(b.units - state.units),
      )[0];
    if (best) Object.assign(state, best);
  }
  refreshControls();
  load();
}

function matchScore(pick, target) {
  return ["profile", "row", "units", "stem", "stabilizers", "homing"].reduce(
    (score, field) => score + (pick[field] === target[field] ? 1 : 0),
    0,
  );
}

/* ---------------------------------------------------------------- load --- */

let lastMesh = null;
let lastStats = null;

async function load() {
  const token = (loadToken += 1);
  const problem = conflictFor(state);
  if (problem) {
    showMessage(problem, true);
    return;
  }
  showMessage("Building " + describe(state) + "...", false);
  try {
    const { mesh, stats } = await fetchModel(state);
    if (token !== loadToken) return;
    renderer.dispose(current);
    lastMesh = mesh;
    lastStats = stats;
    current = renderer.upload(mesh);
    frame(stats, pinnedStats);
    showStats(stats);
    showMessage(null);
    refreshControls();
  } catch (error) {
    if (token === loadToken) showMessage(error.message, true);
  }
}

function showMessage(text, isError) {
  messageBox.hidden = !text;
  messageBox.textContent = text || "";
  messageBox.classList.toggle("error", Boolean(isError));
}

function showStats(stats) {
  const profile = profileById.get(state.profile);
  document.getElementById("title-name").textContent = describe(state);
  document.getElementById("title-note").textContent = profile.notes;

  const rows = [
    ["size", stats.width.toFixed(2) + " x " + stats.depth.toFixed(2) + " x " + stats.height.toFixed(2) + " mm"],
    ["volume", Math.round(stats.volume) + " mm3"],
    ["stems", stats.stems + (stats.stemSpan > 0 ? " at " + stats.stemSpan.toFixed(1) + " mm" : "")],
    ["homing", stats.homing === "none" ? "none" : stats.homing],
    ["triangles", String(stats.triangles)],
  ];
  const host = document.getElementById("stats");
  host.replaceChildren();
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    host.append(dt, dd);
  }
}

/* --------------------------------------------------------- interaction --- */

function attachControls() {
  let dragging = null;
  canvas.addEventListener("pointerdown", (event) => {
    dragging = { x: event.clientX, y: event.clientY, pan: event.shiftKey || event.button === 1 };
    canvas.setPointerCapture(event.pointerId);
    state.spin = false;
    refreshControls();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    if (dragging.pan) {
      const scale = camera.radius * 0.0016;
      camera.target[0] -= dx * scale * Math.cos(camera.theta);
      camera.target[1] -= dx * scale * Math.sin(camera.theta);
      camera.target[2] += dy * scale;
    } else {
      camera.theta += dx * 0.008;
      camera.phi = Math.max(-1.45, Math.min(1.45, camera.phi + dy * 0.008));
    }
  });
  const stop = (event) => {
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      camera.radius = Math.max(12, Math.min(600, camera.radius * Math.exp(event.deltaY * 0.0012)));
    },
    { passive: false },
  );

  window.addEventListener("keydown", (event) => {
    const profiles = catalogue.profiles;
    const index = profiles.findIndex((entry) => entry.id === state.profile);
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const step = event.key === "ArrowRight" ? 1 : -1;
      select({ profile: profiles[(index + step + profiles.length) % profiles.length].id });
      event.preventDefault();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const rows = profileById.get(state.profile).rows;
      const at = rows.indexOf(state.row);
      const step = event.key === "ArrowUp" ? 1 : -1;
      select({ row: rows[Math.max(0, Math.min(rows.length - 1, at + step))] });
      event.preventDefault();
    } else if (event.key === " ") {
      state.spin = !state.spin;
      refreshControls();
      event.preventDefault();
    }
  });

  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  themeQuery.addEventListener("change", () => {
    palette = readPalette();
  });
}

/* ---------------------------------------------------------------- boot --- */

try {
  renderer = createRenderer(canvas);
  attachControls();
  refreshControls();
  load();
  requestAnimationFrame(renderFrame);
} catch (error) {
  showMessage(error.message, true);
}
