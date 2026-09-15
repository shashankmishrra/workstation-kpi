import { describe, expect, test } from "bun:test";
import { buildMemoryMetrics } from "../src/metrics/memory";

describe("buildMemoryMetrics", () => {
  test("computes used percentage", () => {
    const result = buildMemoryMetrics({
      total: 1000,
      used: 250,
      free: 750,
      swaptotal: 0,
      swapused: 0,
    });

    expect(result.usedPercent).toBe(25);
  });

  test("computes swap percentage", () => {
    const result = buildMemoryMetrics({
      total: 1000,
      used: 250,
      free: 750,
      swaptotal: 400,
      swapused: 100,
    });

    expect(result.swapUsedPercent).toBe(25);
  });

  test("guards against zero totals", () => {
    const result = buildMemoryMetrics({
      total: 0,
      used: 0,
      free: 0,
      swaptotal: 0,
      swapused: 0,
    });

    expect(result.usedPercent).toBe(0);
    expect(result.swapUsedPercent).toBe(0);
  });

  test("passes through raw byte values", () => {
    const result = buildMemoryMetrics({
      total: 17179869184,
      used: 8589934592,
      free: 8589934592,
      swaptotal: 2147483648,
      swapused: 0,
    });

    expect(result.total).toBe(17179869184);
    expect(result.used).toBe(8589934592);
    expect(result.free).toBe(8589934592);
  });
});
