// Plate arrangement for a rendered keycap set.
//
// A keyset can be placed two ways: at true keyboard positions, which reads as a
// keyboard but is ~410mm wide and so wider than a common print bed, or packed
// into bed-sized rows for printing. Both the browser app and the CLI use these,
// so the two never drift apart.

const GRID_MARGIN_MM = 2;

/** Axis-aligned bounds of every vertex across a keycap's parts. */
export function measureKeycapBounds(keycap) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const mesh of keycap.meshes) {
    for (const vertex of mesh.vertices) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }
  }

  return { minX, maxX, minY, maxY, width: maxX - minX, depth: maxY - minY };
}

/**
 * Place each keycap at its true position on the keyboard.
 * `positions` maps a keycap name to its board-space center in mm.
 */
export function arrangeAsBoard(keycaps, positions) {
  return keycaps.map((keycap) => {
    const position = positions.get(keycap.name) ?? { x: 0, y: 0 };
    return { ...keycap, position: { x: position.x, y: position.y, z: 0 } };
  });
}

/**
 * Repack keycaps into bed-sized rows instead of their keyboard positions.
 * Each cap is measured from its own meshes, so tall keys and the 6.25u
 * spacebar get the room they actually need.
 */
export function arrangeIntoGrid(keycaps, bedMm, { margin = GRID_MARGIN_MM } = {}) {
  const measured = keycaps.map((keycap) => ({ keycap, ...measureKeycapBounds(keycap) }));

  // Tallest-first keeps rows tidy; caps are all similar in height so a simple
  // shelf pack is enough here.
  measured.sort((left, right) => right.depth - left.depth || right.width - left.width);

  const placed = [];
  let cursorX = margin;
  let cursorY = margin;
  let rowDepth = 0;
  let widthMm = 0;

  for (const entry of measured) {
    if (cursorX + entry.width + margin > bedMm && cursorX > margin) {
      cursorX = margin;
      cursorY += rowDepth + margin;
      rowDepth = 0;
    }
    placed.push({
      ...entry.keycap,
      // Shift the cap's own bounding box to the cursor.
      position: { x: cursorX - entry.minX, y: cursorY - entry.minY, z: 0 },
    });
    cursorX += entry.width + margin;
    widthMm = Math.max(widthMm, cursorX);
    rowDepth = Math.max(rowDepth, entry.depth);
  }

  return { placed, widthMm: widthMm + margin, depthMm: cursorY + rowDepth + margin };
}
