import { describe, expect, test } from "bun:test";
import { collectMetrics, handleApi } from "../src/api";

describe("handleApi", () => {
  test("responds to the health check", async () => {
    const response = await handleApi(new Request("http://localhost/api/health"), "/api/health");

    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ status: "ok" });
  });

  test("rejects non-GET methods on the metrics route", async () => {
    const response = await handleApi(
      new Request("http://localhost/api/metrics", { method: "POST" }),
      "/api/metrics",
    );

    expect(response?.status).toBe(405);
  });

  test("returns null for unknown routes so static serving can run", async () => {
    const response = await handleApi(new Request("http://localhost/"), "/");

    expect(response).toBeNull();
  });
});

describe("collectMetrics (integration)", () => {
  test("returns every metric group with the expected shape", async () => {
    const metrics = await collectMetrics();

    expect(typeof metrics.timestamp).toBe("string");
    expect(metrics.cpu.cores).toBeGreaterThan(0);
    expect(metrics.cpu.usagePercent).toBeGreaterThanOrEqual(0);
    expect(metrics.memory.total).toBeGreaterThan(0);
    expect(Array.isArray(metrics.disk.filesystems)).toBe(true);
    expect(Array.isArray(metrics.network.interfaces)).toBe(true);
    expect(metrics.system.hostname.length).toBeGreaterThan(0);
  }, 15_000);
});
