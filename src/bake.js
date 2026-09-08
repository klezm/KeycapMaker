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
import { findIslands, bridgeProfile, countSolidParts, SLIVER_VOLUME } from "./islands.js";

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
 * Build the transparent layer that lines the underside of the roof.
 *
 * `cap - cap.translate(+depth)` keeps every point of the cap that has no cap
 * material `depth` below it — the bottom `depth` of every downward-facing
 * surface. That is the roof underside, but also the bottom rim and, because a
 * keycap's inner wall is tapered rather than vertical, the whole inside of the
 * wall. Clipping to the roof's own height is what keeps the lining off the walls.
 *
 * The layer follows the dished underside instead of sitting flat, and replaces
 * material that is already there, so the keycap gets no thicker.
 *
 * @param {typeof import("manifold-3d").Manifold} Manifold
 * @param {import("manifold-3d").Manifold} cap
 * @param {number} depth vertical thickness, mm
 * @param {number} roofZ the roof underside; everything below it is discarded
 * @param {number} inset pull the layer back from the walls, mm
 * @returns {import("manifold-3d").Manifold}
 */
function buildDiffuserLayer(Manifold, cap, depth, roofZ, inset) {
  const capBox = cap.boundingBox();
  const span = capBox.max[2] - capBox.min[2] + 2;

  const above = Manifold.cube(
    [capBox.max[0] - capBox.min[0] + 2, capBox.max[1] - capBox.min[1] + 2, span],
    true,
  ).translate([(capBox.min[0] + capBox.max[0]) / 2, (capBox.min[1] + capBox.max[1]) / 2, roofZ + span / 2]);

  const layer = cap.subtract(cap.translate([0, 0, depth])).intersect(above);
  if (layer.isEmpty()) {
    throw new Error(
      `A diffuser depth of ${depth} mm finds no roof to line. ` +
        "The cap may be solid, or --cut-from-z may be set below the roof.",
    );
  }
  if (inset <= 0) return layer;

  // Only needed for hand assembly: a full-width layer is a press fit inside the cap.
  const pulled = layer.project().offset(-inset, "Round", 2, 32);
  if (pulled.isEmpty()) {
    throw new Error(`A diffuser inset of ${inset} mm leaves no layer at all — lower --diffuser-inset.`);
  }
  const layerBox = layer.boundingBox();
  return layer.intersect(
    pulled.extrude(layerBox.max[2] - layerBox.min[2] + 2).translate([0, 0, layerBox.min[2] - 1]),
  );
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
 * @param {{depth?: number, inset?: number, minSkin?: number}} [options.diffuser]
 * @returns {Promise<{body: import("manifold-3d").Manifold, insert: import("manifold-3d").Manifold, profile: import("manifold-3d").CrossSection, report: object}>}
 */
export async function bake(options) {
  const { CrossSection, Manifold } = await getEngine();
  const {
    cap,
    profile: requestedProfile,
    cutFromZ = null,
    clearance = 0.15,
    islands: islandPolicy = "keep",
    bridge = {},
    diffuser: diffuserOptions = {},
  } = options;
  const { depth: diffuserDepth = 0, inset: diffuserInset = 0, minSkin: diffuserMinSkin = 0.8 } = diffuserOptions;

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

  // The layer does not depend on the graphic, so build it once even though the
  // bridging loop may recut the plug several times.
  const diffuserLayer = diffuserDepth > 0 ? buildDiffuserLayer(Manifold, cap, diffuserDepth, probe.z - EPSILON, diffuserInset) : null;

  if (diffuserLayer) {
    // How close the layer comes to the outer surface. `cap - cap.translate(-t)`
    // is the material within `t` of the top, so intersecting says whether the
    // opaque skin above the layer has thinned past the point of usefulness.
    const skinWithin = (t) => diffuserLayer.intersect(cap.subtract(cap.translate([0, 0, -t]))).volume();
    if (skinWithin(EPSILON) > EPSILON) {
      throw new Error(
        `A diffuser depth of ${diffuserDepth} mm breaks through the top surface — there would be no opaque skin ` +
          "left over it. Lower --diffuser, or build a thicker roof with --top-thickness.",
      );
    }
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
    const plug = cap.intersect(shrink.extrude(height).translate([0, 0, zFrom]));
    const body = cap.subtract(grow.extrude(height).translate([0, 0, zFrom]));
    if (!diffuserLayer) return { body, insert: plug, plugVolume: plug.volume() };

    // The insert is the transparent path from the cavity to the legend, so keep
    // only what actually reaches the plug. Layer stranded behind the stem cannot
    // deliver light to the window; leaving it in would ship a stray body and
    // hollow out the cap for nothing.
    const reachable = plug
      .add(diffuserLayer)
      .decompose()
      .filter((part) => part.volume() > SLIVER_VOLUME && !part.intersect(plug).isEmpty());
    const insert = reachable.reduce((accumulated, part) => accumulated.add(part), plug);

    // No clearance against the layer: its edge is the cap's own inner wall, a
    // free surface, and its one mating face is the horizontal join with the skin
    // above, which must stay coincident for a two-material print.
    return { body: body.subtract(insert), insert, plugVolume: plug.volume() };
  };

  let profile = requestedProfile;
  let { body, insert, plugVolume } = cutWith(profile);
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
      ({ body, insert, plugVolume } = cutWith(profile));
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

  // Volume of layer sitting closer to the top surface than the caller wants.
  const thinSkinVolume = diffuserLayer
    ? diffuserLayer.intersect(cap.subtract(cap.translate([0, 0, -diffuserMinSkin]))).volume()
    : 0;

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
      diffuserDepth,
      diffuserInset,
      diffuserMinSkin,
      // What the layer actually contributes, after anything the stem stranded
      // has been dropped.
      diffuserVolume: insert.volume() - plugVolume,
      thinSkinVolume,
      islandPolicy,
      islandsDetected: detectedIslands,
      islandsRemaining: found.islands.length,
      bridgesAdded: bars,
      bodyParts: countSolidParts(body),
      insertParts: countSolidParts(insert),
      bodyStatus: body.status(),
      insertStatus: insert.status(),
    },
  };
}
