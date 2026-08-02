import assert from "node:assert/strict";
import test from "node:test";
import { resolveUserFontSource } from "../src/lib/font-source-resolver.js";

function makeMockResponse(body, { status = 200 } = {}) {
  const bytes = body instanceof Uint8Array ? body : new TextEncoder().encode(String(body));
  return {
    ok: status >= 200 && status < 300,
    status,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    async text() {
      return new TextDecoder().decode(bytes);
    },
  };
}

test("TTF / OTF direct links are resolved after verifying the actual font signature", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => makeMockResponse(new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00]));

  const result = await resolveUserFontSource("https://example.com/fonts/Demo-Regular.ttf");

  assert.equal(result.format, "ttf");
  assert.equal(result.fileName, "Demo-Regular.ttf");
  assert.equal(result.sourceUrl, "https://example.com/fonts/Demo-Regular.ttf");
});

test("TTF / OTF direct links are rejected when the response is not actually a font", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => makeMockResponse("<!doctype html><title>not a font</title>");

  await assert.rejects(
    () => resolveUserFontSource("https://example.com/fonts/Demo-Regular.ttf"),
    /Unsupported font source format: unknown/u,
  );
});

test("@font-face CSS resolves the TTF / OTF src", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => makeMockResponse(new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0x00]));

  const result = await resolveUserFontSource(`
    @font-face {
      font-family: "Demo";
      src: url("https://cdn.example.com/Demo.otf") format("opentype");
    }
  `);

  assert.equal(result.format, "otf");
  assert.equal(result.familyName, "Demo");
  assert.equal(result.sourceUrl, "https://cdn.example.com/Demo.otf");
});
