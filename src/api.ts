/**
 * API composition layer.
 *
 * Collects every metric group in parallel and produces the single JSON payload
 * consumed by the browser. Route handling is kept as a pure function of the
 * request so it can be exercised without a live server.
 *
 * @module api
 */

import type { CpuMetrics } from "./metrics/cpu";
import { getCpuMetrics } from "./metrics/cpu";
import type { DiskMetrics } from "./metrics/disk";
import { getDiskMetrics } from "./metrics/disk";
import type { MemoryMetrics } from "./metrics/memory";
import { getMemoryMetrics } from "./metrics/memory";
import type { NetworkMetrics } from "./metrics/network";
import { getNetworkMetrics } from "./metrics/network";
import type { SystemMetrics } from "./metrics/system";
import { getSystemMetrics } from "./metrics/system";

/** The complete KPI payload returned by `GET /api/metrics`. */
export interface MetricsPayload {
  /** ISO-8601 timestamp for when the sample was taken. */
  timestamp: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  system: SystemMetrics;
}

/**
 * Collect every metric group concurrently.
 *
 * @returns A promise resolving to the full {@link MetricsPayload}.
 */
export const collectMetrics = async (): Promise<MetricsPayload> => {
  const [cpu, memory, disk, network, system] = await Promise.all([
    getCpuMetrics(),
    getMemoryMetrics(),
    getDiskMetrics(),
    getNetworkMetrics(),
    getSystemMetrics(),
  ]);

  return { timestamp: new Date().toISOString(), cpu, memory, disk, network, system };
};

/**
 * Build a JSON {@link Response} with a fixed status code.
 *
 * @param body - Value to serialise as the response body.
 * @param status - HTTP status code (default `200`).
 * @returns A `Response` carrying JSON.
 */
export const json = (body: unknown, status = 200): Response => Response.json(body, { status });

/**
 * Handle an API request. Returns `null` when the path is not an API route so
 * the caller can fall through to static file serving.
 *
 * @param request - The incoming request.
 * @param pathname - Pre-parsed URL pathname.
 * @returns A `Response` for API routes, otherwise `null`.
 */
export const handleApi = async (request: Request, pathname: string): Promise<Response | null> => {
  if (pathname === "/api/metrics") {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }
    try {
      return json(await collectMetrics());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json({ error: "Failed to collect metrics", detail: message }, 500);
    }
  }

  if (pathname === "/api/health") {
    return json({ status: "ok" });
  }

  return null;
};
