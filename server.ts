/**
 * Bun HTTP entry point.
 *
 * Serves the single-page dashboard from `public/` and delegates `/api/*`
 * requests to {@link handleApi}. No framework and no build step: the browser
 * loads the ES module in `public/app.js` directly.
 *
 * @module server
 */

import { join, normalize } from "node:path";
import { handleApi } from "./src/api";

/** Directory holding the static client assets. */
const PUBLIC_DIR = join(import.meta.dir, "public");

/** Port to bind, overridable through the `PORT` env var. */
const PORT = Number(process.env.PORT ?? 3000);

/**
 * Resolve a request pathname to a safe absolute file path inside `PUBLIC_DIR`.
 * Rejects path traversal by refusing anything that escapes the public root.
 *
 * @param pathname - The URL pathname, e.g. `"/styles.css"`.
 * @returns An absolute path, or `null` when the path is unsafe.
 */
export const resolveAssetPath = (pathname: string): string | null => {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = normalize(join(PUBLIC_DIR, relative));

  return target.startsWith(PUBLIC_DIR) ? target : null;
};

/**
 * Select the MIME type for a static asset based on its extension.
 *
 * @param path - The asset file path.
 * @returns A MIME type string.
 */
export const contentTypeFor = (path: string): string => {
  const extension = path.slice(path.lastIndexOf("."));
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  return types[extension] ?? "application/octet-stream";
};

/**
 * Serve a static asset from `public/`.
 *
 * @param pathname - The request pathname.
 * @returns A `Response` with the file, a 404, or a 403 for unsafe paths.
 */
const serveStatic = async (pathname: string): Promise<Response> => {
  const path = resolveAssetPath(pathname);

  if (!path) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = Bun.file(path);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(file, {
    headers: { "content-type": contentTypeFor(path) },
  });
};

if (import.meta.main) {
  const server = Bun.serve({
    port: PORT,
    /**
     * Route every request: API first, then static files.
     */
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const apiResponse = await handleApi(request, pathname);

      return apiResponse ?? (await serveStatic(pathname));
    },
  });

  console.log(`Workstation KPI dashboard running at ${server.url}`);
}
