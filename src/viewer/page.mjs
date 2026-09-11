import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (name) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

/**
 * The viewer ships as one page with no external requests, so its two client
 * modules are concatenated into a single inline module here. `client.js`
 * imports only from `client-gl.js`, so dropping the import and the export
 * keywords is all the bundling this needs.
 */
function clientScript() {
  const gl = read("./client-gl.js").replace(/^export /gm, "");
  const app = read("./client.js")
    .replace(/^import .*?;$/gm, "")
    .replace(/^export /gm, "");
  return gl + "\n" + app;
}

/** JSON safe to drop inside a <script> element. */
function embed(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");
}

export const VIEWER_TITLE = "Keycap Forge Viewer";

/**
 * The viewer's page content, without a document skeleton, so it can be served
 * as a file or published as an artifact.
 *
 * @param {object} options
 * @param {object} options.catalogue what the controls offer
 * @param {"live"|"baked"} options.mode live fetches models, baked carries them
 * @param {object} [options.baked] embedded models, for the standalone page
 */
/**
 * The viewer's page content, without a document skeleton, so it can be served
 * over HTTP or published as an artifact.
 *
 * Markup, styles and client code all live in their own files and are read on
 * each call, so editing any of them and reloading the tab is enough to see the
 * change while working on the viewer.
 *
 * @param {object} options
 * @param {object} options.catalogue what the controls offer
 * @param {"live"|"baked"} options.mode live fetches models, baked carries them
 * @param {object} [options.baked] embedded models, for the standalone page
 */
export function renderViewer({ catalogue, mode, baked = null }) {
  const subtitle =
    mode === "baked"
      ? String(Object.keys(baked.models).length) + " caps built in"
      : "live from the generator";

  const downloads =
    mode === "live"
      ? `    <div class="group" id="downloads">
      <h2>Download</h2>
      <div class="chips">
        <a class="chip" data-format="stl" href="#" download>STL</a>
        <a class="chip" data-format="3mf" href="#" download>3MF</a>
      </div>
    </div>`
      : "";

  const markup = read("./client.html")
    .replace("{{subtitle}}", subtitle)
    .replace("{{downloads}}", downloads);

  return `<title>${VIEWER_TITLE}</title>
<style>
${read("./client.css")}
</style>
${markup}
<script type="application/json" id="keycap-data">${embed({ catalogue, mode, baked })}</script>
<script type="module">
${clientScript()}
</script>
`;
}

/** Wrap page content in a document, for serving over HTTP or writing to disk. */
export function renderDocument(content) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${content}
</body>
</html>
`;
}
