/**
 * Detached-island handling.
 *
 * Cutting a letter clean through leaves its counters (the enclosed middles of
 * O, A, e, 8, R) floating free. `Manifold.decompose()` finds them exactly: the
 * body splits into more than one connected component.
 *
 * With a transparent insert the islands are held in place by the insert itself,
 * which is the multi-material case. For a single-material open window they have
 * to be tied back to the mainland with bridges.
 */

// Booleans between surfaces that graze each other can leave components with no
// volume at all — seen where a diffuser layer meets the stem/roof junction.
// A real counter is mm³-scale, so anything this small is numerical noise.
export const SLIVER_VOLUME = 1e-6;

/**
 * Count the connected components a solid would actually print as, ignoring
 * zero-volume slivers left behind by grazing booleans.
 *
 * @param {import("manifold-3d").Manifold} solid
 * @returns {number}
 */
export function countSolidParts(solid) {
  return solid.decompose().filter((part) => part.volume() > SLIVER_VOLUME).length;
}

/**
 * Split a body into its largest component and everything that floated free.
 *
 * @param {import("manifold-3d").Manifold} body
 * @returns {{main: import("manifold-3d").Manifold, islands: import("manifold-3d").Manifold[]}}
 */
export function findIslands(body) {
  const parts = body.decompose();
  if (parts.length <= 1) return { main: body, islands: [] };
  const sorted = [...parts].sort((a, b) => b.volume() - a.volume());
  return { main: sorted[0], islands: sorted.slice(1).filter((part) => part.volume() > SLIVER_VOLUME) };
}

/**
 * Subtract tie-bars from the cut profile so each island stays attached.
 *
 * For every island we try a fan of directions and keep the one whose bar crosses
 * the least cut material — that is the shortest way back to the mainland, so the
 * bridge is as unobtrusive as it can be.
 *
 * @param {typeof import("manifold-3d").CrossSection} CrossSection
 * @param {import("manifold-3d").CrossSection} profile the cut region
 * @param {import("manifold-3d").CrossSection[]} islandOutlines projected islands
 * @param {object} [options]
 * @param {number} [options.width] bar width in mm
 * @param {number} [options.count] bars per island
 * @param {number} [options.directions] candidate directions to test
 * @returns {{profile: import("manifold-3d").CrossSection, bars: number}}
 */
export function bridgeProfile(CrossSection, profile, islandOutlines, options = {}) {
  const { width = 0.8, count = 1, directions = 24 } = options;
  const { min, max } = profile.bounds();
  const reach = Math.hypot(max[0] - min[0], max[1] - min[1]) + 1;

  let result = profile;
  let bars = 0;

  for (const island of islandOutlines) {
    const islandBounds = island.bounds();
    const centre = [
      (islandBounds.min[0] + islandBounds.max[0]) / 2,
      (islandBounds.min[1] + islandBounds.max[1]) / 2,
    ];

    const candidates = [];
    for (let i = 0; i < directions; i += 1) {
      const angle = (360 / directions) * i;
      // A bar reaching from the island centre outwards past the profile bounds.
      const bar = CrossSection.square([reach, width], true)
        .translate([reach / 2, 0])
        .rotate(angle)
        .translate(centre);
      candidates.push({ angle, bar, cost: bar.intersect(result).area() });
    }
    candidates.sort((a, b) => a.cost - b.cost);

    // Spread multiple bars apart rather than picking near-identical directions.
    const chosen = [];
    for (const candidate of candidates) {
      if (chosen.length >= count) break;
      const tooClose = chosen.some((other) => {
        const delta = Math.abs(((candidate.angle - other.angle + 540) % 360) - 180);
        return delta > 120;
      });
      if (!tooClose) chosen.push(candidate);
    }

    for (const candidate of chosen) {
      result = result.subtract(candidate.bar);
      bars += 1;
    }
  }

  return { profile: result, bars };
}
