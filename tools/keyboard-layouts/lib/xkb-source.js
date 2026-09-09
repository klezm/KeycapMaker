import fs from "node:fs";
import path from "node:path";

const XKB_ROOT_CANDIDATES = Object.freeze([
  "/usr/share/X11/xkb",
  "/usr/local/share/X11/xkb",
  "/opt/X11/share/X11/xkb",
  "/usr/share/xkb",
]);

const KEYSYM_HEADER_CANDIDATES = Object.freeze([
  "/usr/include/X11/keysymdef.h",
  "/usr/local/include/X11/keysymdef.h",
  "/opt/X11/include/X11/keysymdef.h",
]);

const REQUIRED_SUBDIRECTORIES = Object.freeze(["rules", "symbols", "types", "keycodes"]);

function isXkbRoot(candidate) {
  return REQUIRED_SUBDIRECTORIES.every((name) => fs.existsSync(path.join(candidate, name)));
}

export function resolveXkbRoot(explicitPath) {
  const searched = [];

  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (isXkbRoot(resolved)) {
      return resolved;
    }
    searched.push(resolved);
  }

  if (process.env.XKB_CONFIG_ROOT) {
    const fromEnvironment = path.resolve(process.env.XKB_CONFIG_ROOT);
    if (isXkbRoot(fromEnvironment)) {
      return fromEnvironment;
    }
    searched.push(fromEnvironment);
  }

  for (const candidate of XKB_ROOT_CANDIDATES) {
    if (isXkbRoot(candidate)) {
      return candidate;
    }
    searched.push(candidate);
  }

  throw new Error(
    `no xkeyboard-config data found. searched:\n- ${searched.join("\n- ")}\n` +
      "install xkeyboard-config, or pass --xkb-root <path>",
  );
}

export function resolveKeysymHeaderPath(explicitPath) {
  const searched = [];

  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    searched.push(resolved);
  }

  for (const candidate of KEYSYM_HEADER_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    searched.push(candidate);
  }

  throw new Error(
    `no keysymdef.h found. searched:\n- ${searched.join("\n- ")}\n` +
      "install x11proto-dev / xorgproto, or pass --keysym-header <path>",
  );
}

export function readXkbFile(xkbRoot, relativePath) {
  return fs.readFileSync(path.join(xkbRoot, relativePath), "utf8");
}

export function listXkbFiles(xkbRoot, subdirectory) {
  const directory = path.join(xkbRoot, subdirectory);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

export function resolveXkbVersion(xkbRoot) {
  const metadataPath = path.join(xkbRoot, "rules", "base.xml");
  if (!fs.existsSync(metadataPath)) {
    return null;
  }
  const stats = fs.statSync(metadataPath);
  return { rulesModified: stats.mtime.toISOString().slice(0, 10) };
}
