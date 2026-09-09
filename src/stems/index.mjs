import * as mx from "./mx.mjs";
import * as box from "./box.mjs";
import * as alps from "./alps.mjs";
import * as chocV1 from "./choc-v1.mjs";
import * as chocV2 from "./choc-v2.mjs";
import * as none from "./none.mjs";

export const STEMS = [mx, box, alps, chocV1, chocV2, none];

const BY_ID = new Map(STEMS.map((stem) => [stem.spec.id, stem]));

export function stemIds() {
  return STEMS.map((stem) => stem.spec.id);
}

export function getStem(id) {
  const stem = BY_ID.get(id);
  if (!stem) {
    throw new Error(`Unknown stem "${id}". Expected one of: ${stemIds().join(", ")}`);
  }
  return stem;
}

/**
 * Whether a stem physically belongs on a profile. MX-mount caps take MX-family
 * stems, low-profile caps take Choc stems, and "none" fits anything.
 */
export function stemFitsMount(stemId, mount) {
  return getStem(stemId).spec.mounts.includes(mount);
}
