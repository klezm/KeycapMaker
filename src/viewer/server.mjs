import http from "node:http";

import { buildKeycap, DEFAULTS } from "../keycap.mjs";
import { toBinaryStl } from "../export/stl.mjs";
import { to3mf } from "../export/3mf.mjs";
import { encodeMesh } from "./mesh-format.mjs";
import { buildCatalogue } from "./catalogue.mjs";
import { renderViewer, renderDocument } from "./page.mjs";

const CACHE_LIMIT = 48;

/** Turn query parameters into builder options, rejecting anything malformed. */
function readRequest(params, options) {
  const units = Number(params.get("units"));
  const row = Number(params.get("row"));
  if (!Number.isFinite(units) || units <= 0) throw new Error("units must be a positive number");
  if (!Number.isInteger(row)) throw new Error("row must be a whole number");

  const stabilizers = params.get("stabilizers") ?? DEFAULTS.stabilizers;
  const span = Number(stabilizers);
  return {
    profile: params.get("profile") ?? "",
    row,
    units,
    stem: params.get("stem") ?? "mx",
    stabilizers: Number.isFinite(span) && stabilizers !== "" ? span : stabilizers,
    wall: options.wall,
    topThickness: options.topThickness,
    stemSlop: options.stemSlop,
    quality: options.quality,
  };
}

/**
 * A viewer server that builds each cap on request. Generating one takes tens of
 * milliseconds, so there is nothing to pre-render: every combination in the
 * catalogue is reachable straight away, and a small cache makes flicking back
 * and forth instant.
 */
export function createViewerServer(options = {}) {
  const catalogue = buildCatalogue();
  const cache = new Map();

  // Rendered per request rather than once at startup: it costs a few
  // milliseconds and it means editing the client files and reloading the tab
  // is all it takes to see a change.
  const page = () => renderDocument(renderViewer({ catalogue, mode: "live" }));

  async function modelFor(request) {
    const key = JSON.stringify(request);
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const { solid, stats } = await buildKeycap(request);
    const entry = {
      mesh: encodeMesh(solid),
      stl: toBinaryStl(solid, "keycap-forge " + request.profile),
      model3mf: to3mf(solid, { Title: request.profile, Application: "keycap-forge" }),
      stats,
    };
    solid.delete();
    cache.set(key, entry);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    return entry;
  }

  return http.createServer(async (incoming, response) => {
    const url = new URL(incoming.url, "http://localhost");
    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(page());
        return;
      }
      if (url.pathname === "/api/catalogue") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(catalogue));
        return;
      }
      if (url.pathname.startsWith("/api/model")) {
        const request = readRequest(url.searchParams, { ...DEFAULTS, ...options });
        const entry = await modelFor(request);
        const name = [request.profile, "r" + request.row, request.units + "u", request.stem].join("_");

        if (url.pathname === "/api/model.stl") {
          response.writeHead(200, {
            "content-type": "model/stl",
            "content-disposition": `attachment; filename="${name}.stl"`,
          });
          response.end(entry.stl);
          return;
        }
        if (url.pathname === "/api/model.3mf") {
          response.writeHead(200, {
            "content-type": "model/3mf",
            "content-disposition": `attachment; filename="${name}.3mf"`,
          });
          response.end(entry.model3mf);
          return;
        }
        response.writeHead(200, {
          "content-type": "application/octet-stream",
          "x-keycap-stats": JSON.stringify(entry.stats),
        });
        response.end(entry.mesh);
        return;
      }
      if (url.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
    } catch (error) {
      response.writeHead(400, { "content-type": "text/plain" });
      response.end(error.message);
    }
  });
}

export function startViewer(options = {}) {
  const server = createViewerServer(options);
  return new Promise((resolve) => {
    server.listen(options.port ?? 8080, options.host ?? "127.0.0.1", () => resolve(server));
  });
}
