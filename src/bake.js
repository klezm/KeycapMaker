/**
 * The core operation: cut a 2D profile clean through a keycap's roof, and hand
 * back both halves of the result.
 *
 * Both outputs are derived from the same solid:
 *
 *   body   = cap - grownProfile     (the cap, with a window in it)
 *   insert = cap ^ shrunkProfile    (the plug that exactly fills that window)
 *
 * Because the insert is an intersection with the untouched cap, it inherits the
 * dished top surface and the roof underside for free — no surface fitting, and
 * body + insert reassemble the original cap minus the clearance gap.
 */
import { getEngine } from "./engine.js";
import { findIslands, bridgeProfile } from "./islands.js";

const EPSILON = 0.01;

/**
 * Work out how deep the cut has to go to break clean through the roof.
 *
 * The target is the lowest point of the cap's interior cavity ceiling inside the
 * graphic's footprint: cut from there upwards and every part of the graphic that
 * has cavity beneath it becomes a real window.
 *
 * Fast path: intersecting a full-height prism with the cap and decomposing it
 * separates the roof slab from the stem outright, and the roof's bounding box
 * gives the answer exactly.
 *
 * Otherwise (stem fused to the roof, as on a real MX cap) the cavity itself is
 * isolated and sliced downwards until its area stops growing — that plateau is
 * where the ceiling bottoms out.
 *
 * @param {import("manifold-3d").Manifold} cap
 * @param {import("manifold-3d").CrossSection} profile
 * @param {object} [options]
 * @param {number} [options.scanDepth] how far below the cavity's high point to look, mm
 * @param {number} [options.step] slice spacing, mm
 * @returns {Promise<{z: number, source: "decompose"|"cavity", pieces: number}>}
 */
export async function probeRoofUnderside(cap, profile, options = {}) {
  const { Manifold } = await getEngine();
  const { scanDepth = 3.0, step = 0.05 } = options;
  const box = cap.boundingBox();
  const zTop = box.max[2];
  const zBottom = box.min[2];

  const prism = profile.extrude(zTop - zBottom + 2 * EPSILON).translate([0, 0, zBottom - EPSILON]);
  const overlap = cap.intersect(prism);
  if (overlap.isEmpty()) {
    throw new Error("The graphic does not overlap the keycap — check --size, --offset-x/--offset-y and --rotate.");
  }

  const pieces = overlap.decompose();
  if (pieces.length > 1) {
    const roof = pieces.reduce((best, piece) => (piece.boundingBox().max[2] > best.boundingBox().max[2] ? piece : best));
    return { z: roof.boundingBox().min[2], source: "decompose", pieces: pieces.length };
  }

  // Everything inside the footprint is one lump, so find the cavity instead.
  const margin = 1;
  const block = Manifold.cube(
    [box.max[0] - box.min[0] + 2 * margin, box.max[1] - box.min[1] + 2 * margin, zTop - zBottom + 2 * margin],
    true,
  ).translate([(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (zBottom + zTop) / 2]);

  const enclosed = block
    .subtract(cap)
    .intersect(prism)
    .decompose()
    // Drop the air above the cap; only the sealed interior counts.
    .filter((part) => part.boundingBox().max[2] < zTop - EPSILON);

  if (enclosed.length === 0) {
    throw new Error(
      "There is no cavity under the graphic — it sits entirely over solid material, so it cannot be cut through. " +
        "Move it with --offset-x/--offset-y, or set --cut-from-z to cut to a fixed depth anyway.",
    );
  }

  const cavity = enclosed.reduce((accumulated, part) => accumulated.add(part));
  const cavityTop = cavity.boundingBox().max[2];

  // Sample downwards, then take the highest slice that is already fully open.
  const samples = [];
  for (let z = cavityTop - step; z > Math.max(zBottom, cavityTop - scanDepth); z -= step) {
    samples.push({ z, area: cavity.slice(z).area() });
  }
  if (samples.length === 0) return { z: cavityTop, source: "cavity", pieces: 1 };

  const maxArea = samples.reduce((best, sample) => Math.max(best, sample.area), 0);
  const opened = samples.find((sample) => sample.area >= 0.99 * maxArea);
  return { z: opened ? opened.z : cavityTop, source: "cavity", pieces: 1 };
}

/**
 * Bake a profile through a keycap.
 *
 * @param {object} options
 * @param {import("manifold-3d").Manifold} options.cap
 * @param {import("manifold-3d").CrossSection} options.profile placed cut profile
 * @param {number} [options.cutFromZ] override the probed roof underside
 * @param {number} [options.clearance] total gap between body and insert, mm
 * @param {"keep"|"bridge"|"error"} [options.islands]
 * @param {{width?: number, count?: number}} [options.bridge]
 * @returns {Promise<{body: import("manifold-3d").Manifold, insert: import("manifold-3d").Manifold, profile: import("manifold-3d").CrossSection, report: object}>}
 */
export async function bake(options) {
  const { CrossSection } = await getEngine();
  const {
    cap,
    profile: requestedProfile,
    cutFromZ = null,
    clearance = 0.15,
    islands: islandPolicy = "keep",
    bridge = {},
  } = options;

  const probe =
    cutFromZ === null
      ? await probeRoofUnderside(cap, requestedProfile)
      : { z: cutFromZ, source: "manual", pieces: 0 };
  const zTop = cap.boundingBox().max[2];
  const zFrom = probe.z - EPSILON;
  const height = zTop - zFrom + EPSILON;
  if (height <= 0) {
    throw new Error(`--cut-from-z (${probe.z}) is at or above the top of the keycap (${zTop}).`);
  }

  const cutWith = (profile) => {
    const grow = profile.offset(clearance / 2, "Round", 2, 32);
    const shrink = clearance > 0 ? profile.offset(-clearance / 2, "Round", 2, 32) : profile;
    if (shrink.isEmpty()) {
      throw new Error(
        `A clearance of ${clearance} mm erases the graphic — its thinnest feature is narrower than the gap. ` +
          "Lower --clearance or scale the graphic up with --size.",
      );
    }
    return {
      body: cap.subtract(grow.extrude(height).translate([0, 0, zFrom])),
      insert: cap.intersect(shrink.extrude(height).translate([0, 0, zFrom])),
    };
  };

  let profile = requestedProfile;
  let { body, insert } = cutWith(profile);
  let found = findIslands(body);
  const detectedIslands = found.islands.length;
  let bars = 0;

  if (detectedIslands > 0 && islandPolicy === "error") {
    throw new Error(
      `Cutting this graphic detaches ${detectedIslands} island(s) — the enclosed middles of letters like O or A. ` +
        "Use --islands bridge to tie them back on, or --islands keep if a transparent insert will hold them.",
    );
  }

  if (detectedIslands > 0 && islandPolicy === "bridge") {
    // Bridging can expose further islands, so repeat until stable.
    for (let attempt = 0; attempt < 4 && found.islands.length > 0; attempt += 1) {
      const outlines = found.islands.map((island) => island.project());
      const bridged = bridgeProfile(CrossSection, profile, outlines, bridge);
      if (bridged.bars === 0) break;
      profile = bridged.profile;
      bars += bridged.bars;
      ({ body, insert } = cutWith(profile));
      found = findIslands(body);
    }
  }

  // Any footprint area that still has material directly beneath the cut will not
  // be see-through — almost always the stem sitting under a centred legend.
  const blocked = cap.slice(probe.z - 2 * EPSILON).intersect(profile);
  const blockedFraction = blocked.area() / profile.area();

  const capVolume = cap.volume();
  const bodyVolume = body.volume();
  const insertVolume = insert.volume();

  return {
    body,
    insert,
    profile,
    report: {
      cutFromZ: probe.z,
      cutFromZSource: probe.source,
      probePieces: probe.pieces,
      cutHeight: height,
      clearance,
      capVolume,
      bodyVolume,
      insertVolume,
      // The shortfall is the clearance gap; anything larger means something is wrong.
      volumeGap: capVolume - bodyVolume - insertVolume,
      blockedFraction,
      islandPolicy,
      islandsDetected: detectedIslands,
      islandsRemaining: found.islands.length,
      bridgesAdded: bars,
      bodyParts: body.decompose().length,
      insertParts: insert.decompose().length,
      bodyStatus: body.status(),
      insertStatus: insert.status(),
    },
  };
}
