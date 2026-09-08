/**
 * SVG path data -> closed polygon contours.
 *
 * `svgpath` normalises the hard parts (arcs -> cubics, shorthand -> explicit,
 * relative -> absolute), leaving only M/L/H/V/C/Q/Z to flatten here.
 */
import svgpath from "svgpath";

/** Recursive adaptive subdivision keeps segment count low on flat curves. */
function flattenCubic(out, x0, y0, x1, y1, x2, y2, x3, y3, tolerance, depth) {
  if (depth > 18) {
    out.push([x3, y3]);
    return;
  }
  // Distance of the two control points from the chord approximates the error.
  const dx = x3 - x0;
  const dy = y3 - y0;
  const d1 = Math.abs((x1 - x3) * dy - (y1 - y3) * dx);
  const d2 = Math.abs((x2 - x3) * dy - (y2 - y3) * dx);
  const sum = d1 + d2;
  if (sum * sum <= tolerance * (dx * dx + dy * dy)) {
    out.push([x3, y3]);
    return;
  }
  const x01 = (x0 + x1) / 2;
  const y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2;
  const y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2;
  const y23 = (y2 + y3) / 2;
  const x012 = (x01 + x12) / 2;
  const y012 = (y01 + y12) / 2;
  const x123 = (x12 + x23) / 2;
  const y123 = (y12 + y23) / 2;
  const xm = (x012 + x123) / 2;
  const ym = (y012 + y123) / 2;
  flattenCubic(out, x0, y0, x01, y01, x012, y012, xm, ym, tolerance, depth + 1);
  flattenCubic(out, xm, ym, x123, y123, x23, y23, x3, y3, tolerance, depth + 1);
}

/**
 * @param {string} pathData an SVG `d` attribute
 * @param {object} [options]
 * @param {number[]} [options.matrix] 2D affine [a,b,c,d,e,f] applied before flattening
 * @param {number} [options.flatness] max chord deviation, in the same units as the path
 * @returns {number[][][]} closed contours, each an array of [x, y]; first point is not repeated
 */
export function flattenPathData(pathData, options = {}) {
  const { matrix, flatness = 0.02 } = options;

  let path = svgpath(pathData);
  if (matrix) path = path.matrix(matrix);
  path = path.abs().unarc().unshort();

  const tolerance = Math.max(flatness, 1e-9) ** 2;
  const contours = [];
  let current = null;
  let startX = 0;
  let startY = 0;

  const closeCurrent = () => {
    if (current && current.length >= 3) contours.push(current);
    current = null;
  };

  path.iterate((segment, _index, x, y) => {
    const command = segment[0];
    switch (command) {
      case "M": {
        closeCurrent();
        startX = segment[1];
        startY = segment[2];
        current = [[startX, startY]];
        break;
      }
      case "L":
        if (current) current.push([segment[1], segment[2]]);
        break;
      case "H":
        if (current) current.push([segment[1], y]);
        break;
      case "V":
        if (current) current.push([x, segment[1]]);
        break;
      case "C":
        if (current) {
          flattenCubic(current, x, y, segment[1], segment[2], segment[3], segment[4], segment[5], segment[6], tolerance, 0);
        }
        break;
      case "Q":
        if (current) {
          // Elevate the quadratic to a cubic and reuse the same subdivision.
          const c1x = x + (2 / 3) * (segment[1] - x);
          const c1y = y + (2 / 3) * (segment[2] - y);
          const c2x = segment[3] + (2 / 3) * (segment[1] - segment[3]);
          const c2y = segment[4] + (2 / 3) * (segment[2] - segment[4]);
          flattenCubic(current, x, y, c1x, c1y, c2x, c2y, segment[3], segment[4], tolerance, 0);
        }
        break;
      case "Z":
      case "z":
        closeCurrent();
        break;
      default:
        break;
    }
  });

  // An unclosed subpath still bounds a region once we treat it as filled.
  closeCurrent();

  return contours.map(dropRepeatedTail);
}

function dropRepeatedTail(contour) {
  const [firstX, firstY] = contour[0];
  let end = contour.length;
  while (end > 1) {
    const [x, y] = contour[end - 1];
    if (Math.abs(x - firstX) > 1e-9 || Math.abs(y - firstY) > 1e-9) break;
    end -= 1;
  }
  return end === contour.length ? contour : contour.slice(0, end);
}
