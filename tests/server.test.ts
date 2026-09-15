import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { contentTypeFor, resolveAssetPath } from "../server";

const publicDir = join(import.meta.dir, "..", "public");

describe("resolveAssetPath", () => {
  test("maps the root to index.html", () => {
    expect(resolveAssetPath("/")).toBe(join(publicDir, "index.html"));
  });

  test("maps a static file", () => {
    expect(resolveAssetPath("/styles.css")).toBe(join(publicDir, "styles.css"));
  });

  test("rejects path traversal", () => {
    expect(resolveAssetPath("/../server.ts")).toBeNull();
    expect(resolveAssetPath("/../../etc/passwd")).toBeNull();
  });
});

describe("contentTypeFor", () => {
  test("returns the html type", () => {
    expect(contentTypeFor("/index.html")).toBe("text/html; charset=utf-8");
  });

  test("returns the css type", () => {
    expect(contentTypeFor("/styles.css")).toBe("text/css; charset=utf-8");
  });

  test("returns the javascript type", () => {
    expect(contentTypeFor("/app.js")).toBe("text/javascript; charset=utf-8");
  });

  test("falls back to octet-stream", () => {
    expect(contentTypeFor("/file.unknown")).toBe("application/octet-stream");
  });
});
