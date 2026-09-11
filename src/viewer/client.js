import { mat4, createRenderer } from "./client-gl.js";
import { arrangeSlots, pitchFor, swingRadius } from "./layout.js";

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
  // Lay the catalogue out on an axis instead of showing one cap.
  arrange: { profiles: "off", rows: "off" },
  ortho: false,
  spin: false,
  grid: true,
};

if (opening) Object.assign(state, opening);

// theta and phi no longer move the camera: they turn every cap about its own
// origin, so an arrangement's slots stay put on screen while the caps rotate.
// The camera only zooms and pans.
const camera = { theta: -0.62, phi: 0.42, zoom: 1, target: [0, 0, 0], span: { x: 30, y: 30 } };

/** Uploaded caps, keyed as `keyOf` keys them. */
const loaded = new Map();
/** What is on screen: each loaded cap paired with the slot it sits in. */
let placed = [];
let pinned = null;
let pinnedLabel = "";
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

/** Margin kept around the arrangement, in millimetres. */
const FRAME_MARGIN = 8;

/** How far each cap's patch of ground reaches from its own origin. */
const GROUND_RADIUS = 26;

/** Kept inside half a slot so neighbouring patches do not run into each other. */
let groundRadius = GROUND_RADIUS;

/** The fixed direction the camera looks from: along +Y, with Z up. */
const CAMERA_DIRECTION = [0, -1, 0];

/**
 * Size the view to hold every slot plus the circle each cap sweeps as it turns.
 *
 * Caps rotate about their own base, so a tall one reaches further from its slot
 * than its footprint suggests; framing to the swept radius is what stops an SA
 * clipping halfway through a drag.
 */
function frame() {
  if (placed.length === 0) return;
  const swing = Math.max(...placed.map((entry) => swingRadius(entry.stats.boundingBox)));
  const extent = (axis) => {
    const values = placed.map((entry) => entry.offset[axis]);
    return { min: Math.min(...values), max: Math.max(...values) };
  };
  // Slots spread across screen X and up screen Z; the camera looks along Y.
  const across = extent(0);
  const up = extent(2);

  // Caps turn about their base, so the circle they sweep is centred on the
  // slot and half of it is empty while they sit upright. Lifting the view by
  // half a cap's height puts the caps themselves in the middle of the frame at
  // rest. It is a fixed lift, not a measurement of the rotated shape, so
  // nothing drifts as they turn.
  const lift = placed.reduce((total, entry) => total + entry.stats.height, 0) / placed.length / 2;

  camera.target = [(across.min + across.max) / 2, 0, (up.min + up.max) / 2 + lift];
  camera.span = {
    x: across.max - across.min + 2 * swing,
    y: up.max - up.min + 2 * (swing + lift),
  };
  camera.depthSpan = 2 * swing;
}

/** Half the visible height in millimetres, at the current zoom and aspect. */
function halfHeight(aspect) {
  const needed = Math.max(camera.span.x / Math.max(aspect, 0.2), camera.span.y) / 2;
  return (needed + FRAME_MARGIN) * camera.zoom;
}

function eyeDistance(aspect) {
  return halfHeight(aspect) / Math.tan((32 * Math.PI) / 180 / 2) + (camera.depthSpan ?? 0);
}

function viewProjection(aspect) {
  const distance = eyeDistance(aspect);
  const eye = [
    camera.target[0] + CAMERA_DIRECTION[0] * distance,
    camera.target[1] + CAMERA_DIRECTION[1] * distance,
    camera.target[2] + CAMERA_DIRECTION[2] * distance,
  ];
  const view = mat4.lookAt(eye, camera.target, [0, 0, 1]);
  const projection = state.ortho
    ? mat4.orthographic(halfHeight(aspect), aspect, 0.1, 8000)
    : mat4.perspective((32 * Math.PI) / 180, aspect, 0.5, 8000);
  return mat4.multiply(projection, view);
}

/**
 * The rotation applied to every cap about its own origin.
 *
 * Derived from the camera basis the old orbiting view would have had, so theta
 * and phi keep their meaning and the view presets still point where they say.
 * Turning the caps rather than the camera is what keeps an arrangement's slots
 * fixed on screen.
 */
function capRotation() {
  const direction = [
    Math.cos(camera.phi) * Math.sin(camera.theta),
    -Math.cos(camera.phi) * Math.cos(camera.theta),
    Math.sin(camera.phi),
  ];
  const orbited = mat4.rotationOf(mat4.lookAt(direction, [0, 0, 0], [0, 0, 1]));
  const fixed = mat4.rotationOf(mat4.lookAt(CAMERA_DIRECTION, [0, 0, 0], [0, 0, 1]));
  return mat4.multiply(mat4.transposeRotation(fixed), orbited);
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

  const rotation = capRotation();
  const transforms = placed.map((entry) => mat4.multiply(mat4.translation(entry.offset), rotation));
  const models = placed.map((entry, index) => ({
    model: entry.model,
    color: palette.cap,
    alpha: 1,
    // Slot first, rotation second: the cap turns about its own origin and is
    // then carried to its slot, so the slot never moves.
    transform: transforms[index],
  }));
  if (pinned) models.push({ model: pinned, color: palette.ghost, alpha: 0.32, transform: rotation });

  renderer.draw({
    viewProjection: viewProjection(aspect),
    palette,
    grounds: state.grid ? transforms : [],
    gridFade: groundRadius,
    models,
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

function buildArrangeChips() {
  for (const [field, id] of [
    ["profiles", "arrange-profiles"],
    ["rows", "arrange-rows"],
  ]) {
    const host = document.getElementById(id);
    host.replaceChildren();
    for (const [value, label] of [
      ["off", "Off"],
      ["x", "X axis"],
      ["y", "Y axis"],
    ]) {
      host.append(
        chip(label, state.arrange[field] === value, false, () => {
          state.arrange = { ...state.arrange, [field]: value };
          refreshControls();
          load();
        }),
      );
    }
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
  if (arranging()) {
    const note = document.createElement("span");
    note.className = "pmeta";
    note.textContent = "the arrangement is the comparison";
    host.append(note);
    return;
  }
  host.append(
    chip(pinned ? "Re-pin this cap" : "Pin as ghost", false, !lastMesh, () => {
      if (pinned) renderer.dispose(pinned);
      pinned = lastMesh ? renderer.upload(lastMesh) : null;
      pinnedLabel = describe(state);
      refreshControls();
    }, "Keep the current cap on screen, translucent, to compare others against"),
  );
  if (pinned) {
    host.append(
      chip("Clear", false, false, () => {
        renderer.dispose(pinned);
        pinned = null;
        pinnedLabel = "";
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
  buildArrangeChips();
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

const arranging = () => state.arrange.profiles !== "off" || state.arrange.rows !== "off";

/**
 * The caps to put on screen.
 *
 * With no arrangement that is the one selection. Otherwise it is every profile,
 * and every row each profile actually has -- a profile with no R5 contributes
 * nothing there, and a uniform profile contributes the single shape it has.
 * A profile that cannot take the selected stem falls back to one it can, so
 * lining up profiles never silently drops the low-profile one.
 */
function picksFor() {
  const shared = {
    units: state.units,
    stem: state.stem,
    stabilizers: state.stabilizers,
    homing: state.homing,
  };
  if (!arranging()) return [{ ...shared, profile: state.profile, row: state.row }];

  const profiles =
    state.arrange.profiles === "off" ? [profileById.get(state.profile)] : catalogue.profiles;
  const picks = [];

  for (const profile of profiles) {
    const candidate = { ...shared, profile: profile.id, row: profile.homeRow };
    if (conflictFor(candidate)) {
      const usable = catalogue.stems.find(
        (stem) => !conflictFor({ ...candidate, stem: stem.id }),
      );
      if (!usable) continue;
      candidate.stem = usable.id;
    }
    const rows =
      state.arrange.rows === "off"
        ? [profile.rows.includes(state.row) ? state.row : profile.homeRow]
        : profile.sculpted
          ? profile.rows
          : [profile.homeRow];
    for (const row of rows) {
      const pick = { ...candidate, row };
      if (!conflictFor(pick)) picks.push(pick);
    }
  }
  return picks;
}

/** Give every loaded cap its slot, then fit the view around them. */
function placeAll() {
  const entries = picksFor()
    .map((pick) => ({ pick, held: loaded.get(keyOf(pick)) }))
    .filter((entry) => entry.held);

  const pitch = pitchFor(entries.map((entry) => entry.held.stats));
  groundRadius = Math.min(GROUND_RADIUS, Math.min(pitch.x, pitch.y) / 2);

  const slots = arrangeSlots({
    picks: entries.map((entry) => entry.pick),
    profileOrder: catalogue.profiles.map((profile) => profile.id),
    rowOrder: [1, 2, 3, 4, 5],
    profileAxis: state.arrange.profiles,
    rowAxis: state.arrange.rows,
    pitch,
  });

  placed = slots.map((slot, index) => ({
    pick: entries[index].pick,
    model: entries[index].held.model,
    stats: entries[index].held.stats,
    offset: slot.offset,
  }));
  frame();
}

let lastMesh = null;
let lastStats = null;

async function load() {
  const token = (loadToken += 1);
  const picks = picksFor();
  if (picks.length === 0) {
    showMessage(conflictFor(state) || "Nothing to show for this combination.", true);
    return;
  }

  // Drop anything the new selection no longer wants before fetching, so
  // switching size or stem does not hold two arrangements on the GPU at once.
  const wanted = new Set(picks.map(keyOf));
  for (const [key, entry] of loaded) {
    if (wanted.has(key)) continue;
    renderer.dispose(entry.model);
    loaded.delete(key);
  }

  for (const [index, pick] of picks.entries()) {
    if (loaded.has(keyOf(pick))) continue;
    showMessage(
      picks.length > 1
        ? "Building " + (index + 1) + " of " + picks.length + "..."
        : "Building " + describe(pick) + "...",
      false,
    );
    try {
      const { mesh, stats } = await fetchModel(pick);
      if (token !== loadToken) return;
      loaded.set(keyOf(pick), { model: renderer.upload(mesh), stats, mesh });
    } catch (error) {
      if (token === loadToken) showMessage(error.message, true);
      return;
    }
  }
  if (token !== loadToken) return;

  const single = loaded.get(keyOf(picks[0]));
  lastMesh = single.mesh;
  lastStats = single.stats;
  placeAll();
  showStats();
  showMessage(null);
  refreshControls();
}

function showMessage(text, isError) {
  messageBox.hidden = !text;
  messageBox.textContent = text || "";
  messageBox.classList.toggle("error", Boolean(isError));
}

function showStats() {
  const title = document.getElementById("title-name");
  const note = document.getElementById("title-note");
  const host = document.getElementById("stats");
  host.replaceChildren();

  const rows = [];
  if (arranging()) {
    const axes = [];
    if (state.arrange.profiles !== "off") axes.push("profiles on " + state.arrange.profiles.toUpperCase());
    if (state.arrange.rows !== "off") axes.push("rows on " + state.arrange.rows.toUpperCase());
    title.textContent = "Arranged: " + axes.join(", ");
    note.textContent =
      "Every cap turns about its own zero point, so each shows the angle it would show alone.";
    const tallest = placed.reduce((best, entry) => (entry.stats.height > best.stats.height ? entry : best), placed[0]);
    rows.push(
      ["caps", String(placed.length)],
      ["size", state.units + "u"],
      ["tallest", tallest ? tallest.pick.profile + " at " + tallest.stats.height.toFixed(2) + " mm" : "-"],
      ["triangles", String(placed.reduce((total, entry) => total + entry.stats.triangles, 0))],
    );
  } else {
    const stats = lastStats;
    if (!stats) return;
    title.textContent = describe(state);
    note.textContent = profileById.get(state.profile).notes;
    rows.push(
      ["size", stats.width.toFixed(2) + " x " + stats.depth.toFixed(2) + " x " + stats.height.toFixed(2) + " mm"],
      ["volume", Math.round(stats.volume) + " mm3"],
      ["stems", stats.stems + (stats.stemSpan > 0 ? " at " + stats.stemSpan.toFixed(1) + " mm" : "")],
      ["homing", stats.homing === "none" ? "none" : stats.homing],
      ["triangles", String(stats.triangles)],
    );
  }

  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    host.append(dt, dd);
  }
}

/* --------------------------------------------------------- interaction --- */

/** Scene millimetres covered by one screen pixel, for panning. */
function millimetresPerPixel() {
  const height = Math.max(canvas.clientHeight, 1);
  return (2 * halfHeight(canvas.clientWidth / height)) / height;
}

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
      // The camera looks along +Y with Z up, so screen right is +X and screen
      // up is +Z -- panning needs no orbit maths at all.
      const scale = millimetresPerPixel();
      camera.target[0] -= dx * scale;
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
      camera.zoom = Math.max(0.12, Math.min(8, camera.zoom * Math.exp(event.deltaY * 0.0012)));
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
