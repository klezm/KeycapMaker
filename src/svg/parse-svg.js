/**
 * A small SVG reader: enough of the spec to turn real-world icon/lettering files
 * into filled 2D regions, and explicit about what it will not do.
 *
 * Deliberately not a DOM implementation — we only need geometry, transforms and
 * fill rules, so a tag scanner keeps the dependency list at zero.
 */
import { flattenPathData } from "./flatten-path.js";

const SHAPE_TAGS = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline"]);

const IDENTITY = [1, 0, 0, 1, 0, 0];

/** Compose two 2D affine matrices, `outer` applied after `inner`. */
function multiply(outer, inner) {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function parseTransform(value) {
  if (!value) return IDENTITY;
  let matrix = IDENTITY;
  const pattern = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(value)) !== null) {
    const name = match[1];
    const args = match[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let step = IDENTITY;
    switch (name) {
      case "matrix":
        if (args.length === 6) step = args;
        break;
      case "translate":
        step = [1, 0, 0, 1, args[0] || 0, args[1] || 0];
        break;
      case "scale": {
        const sx = args[0] ?? 1;
        step = [sx, 0, 0, args[1] ?? sx, 0, 0];
        break;
      }
      case "rotate": {
        const radians = ((args[0] || 0) * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const rotation = [cos, sin, -sin, cos, 0, 0];
        if (args.length >= 3) {
          step = multiply(multiply([1, 0, 0, 1, args[1], args[2]], rotation), [1, 0, 0, 1, -args[1], -args[2]]);
        } else {
          step = rotation;
        }
        break;
      }
      case "skewX":
        step = [1, 0, Math.tan(((args[0] || 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case "skewY":
        step = [1, Math.tan(((args[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
      default:
        break;
    }
    matrix = multiply(matrix, step);
  }
  return matrix;
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([:\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    attributes[match[1]] = match[3] !== undefined ? match[3] : match[4];
  }
  // `style="fill-rule:evenodd"` is as common as the presentation attribute.
  if (attributes.style) {
    for (const declaration of attributes.style.split(";")) {
      const [property, value] = declaration.split(":");
      if (property && value) attributes[property.trim()] = value.trim();
    }
  }
  return attributes;
}

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pointsToContour(value) {
  const numbers = String(value).split(/[\s,]+/).filter(Boolean).map(Number);
  const contour = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) contour.push([numbers[i], numbers[i + 1]]);
  return contour;
}

/** Every shape is expressed as path data, so there is one flattening code path. */
function shapeToPathData(tag, attributes) {
  switch (tag) {
    case "path":
      return attributes.d || "";
    case "rect": {
      const x = number(attributes.x);
      const y = number(attributes.y);
      const width = number(attributes.width);
      const height = number(attributes.height);
      if (width <= 0 || height <= 0) return "";
      const rx = Math.min(number(attributes.rx, number(attributes.ry)), width / 2);
      const ry = Math.min(number(attributes.ry, number(attributes.rx)), height / 2);
      if (rx > 0 && ry > 0) {
        return [
          `M${x + rx} ${y}`,
          `H${x + width - rx}`,
          `A${rx} ${ry} 0 0 1 ${x + width} ${y + ry}`,
          `V${y + height - ry}`,
          `A${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height}`,
          `H${x + rx}`,
          `A${rx} ${ry} 0 0 1 ${x} ${y + height - ry}`,
          `V${y + ry}`,
          `A${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
          "Z",
        ].join(" ");
      }
      return `M${x} ${y} H${x + width} V${y + height} H${x} Z`;
    }
    case "circle": {
      const r = number(attributes.r);
      if (r <= 0) return "";
      const cx = number(attributes.cx);
      const cy = number(attributes.cy);
      return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }
    case "ellipse": {
      const rx = number(attributes.rx);
      const ry = number(attributes.ry);
      if (rx <= 0 || ry <= 0) return "";
      const cx = number(attributes.cx);
      const cy = number(attributes.cy);
      return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    case "polygon":
    case "polyline": {
      const contour = pointsToContour(attributes.points);
      if (contour.length < 3) return "";
      return `M${contour.map(([x, y]) => `${x} ${y}`).join(" L")} Z`;
    }
    default:
      return "";
  }
}

/**
 * Parse an SVG document into filled regions.
 *
 * @param {string} source raw SVG text
 * @param {object} [options]
 * @param {number} [options.flatness] curve flattening tolerance in user units
 * @returns {{
 *   regions: Array<{contours: number[][][], fillRule: "NonZero"|"EvenOdd"}>,
 *   viewBox: {x: number, y: number, width: number, height: number} | null,
 *   strokeOnlyCount: number,
 * }}
 */
export function parseSvg(source, options = {}) {
  const { flatness = 0.02 } = options;

  const rootMatch = source.match(/<svg\b([^>]*)>/i);
  const rootAttributes = rootMatch ? parseAttributes(rootMatch[1]) : {};
  let viewBox = null;
  if (rootAttributes.viewBox) {
    const parts = rootAttributes.viewBox.split(/[\s,]+/).filter(Boolean).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }

  const regions = [];
  let strokeOnlyCount = 0;
  // Inherited state; `svg` and `g` push, their close tags pop.
  const stack = [{ matrix: IDENTITY, fillRule: "NonZero", fill: null }];

  const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
  let match;
  while ((match = tagPattern.exec(source)) !== null) {
    const [, closing, rawTag, rawAttributes, selfClosing] = match;
    const tag = rawTag.toLowerCase().replace(/^svg:/, "");

    if (closing) {
      if ((tag === "g" || tag === "svg") && stack.length > 1) stack.pop();
      continue;
    }

    const attributes = parseAttributes(rawAttributes);
    const inherited = stack[stack.length - 1];
    const matrix = multiply(inherited.matrix, parseTransform(attributes.transform));
    const fillRule =
      (attributes["fill-rule"] || attributes["clip-rule"] || "").toLowerCase() === "evenodd"
        ? "EvenOdd"
        : attributes["fill-rule"] || attributes["clip-rule"]
          ? "NonZero"
          : inherited.fillRule;
    const fill = attributes.fill ?? inherited.fill;

    if (tag === "g" || tag === "svg") {
      if (!selfClosing) stack.push({ matrix, fillRule, fill });
      continue;
    }

    if (!SHAPE_TAGS.has(tag)) continue;

    // A shape with fill:none contributes no area; it is outline art that has to
    // be converted to outlines upstream. Count it so the caller can explain why.
    if (String(fill).toLowerCase() === "none") {
      strokeOnlyCount += 1;
      continue;
    }

    const pathData = shapeToPathData(tag, attributes);
    if (!pathData) continue;

    const contours = flattenPathData(pathData, { matrix, flatness });
    if (contours.length > 0) regions.push({ contours, fillRule });
  }

  return { regions, viewBox, strokeOnlyCount };
}
