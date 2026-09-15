import { describe, expect, test } from "bun:test";
import { buildCpuMetrics } from "../src/metrics/cpu";

const baseInput = {
  brand: "Apple M2",
  cores: 8,
  physicalCores: 8,
  speedGhz: 3.456,
  usagePercent: 12.345,
  loadAverage: [1.234, 2.345, 3.456],
  arch: "arm64",
};

describe("buildCpuMetrics", () => {
  test("maps raw values into the public shape", () => {
    const result = buildCpuMetrics(baseInput);

    expect(result.model).toBe("Apple M2");
    expect(result.cores).toBe(8);
    expect(result.physicalCores).toBe(8);
    expect(result.arch).toBe("arm64");
  });

  test("rounds speed to two decimals and usage to one", () => {
    const result = buildCpuMetrics(baseInput);

    expect(result.speedGhz).toBe(3.46);
    expect(result.usagePercent).toBe(12.3);
  });

  test("maps the three load averages", () => {
    const result = buildCpuMetrics(baseInput);

    expect(result.loadAverage).toEqual({ one: 1.23, five: 2.35, fifteen: 3.46 });
  });

  test("falls back to Unknown CPU when brand is missing", () => {
    expect(buildCpuMetrics({ ...baseInput, brand: "" }).model).toBe("Unknown CPU");
  });

  test("tolerates a short loadAverage array", () => {
    const result = buildCpuMetrics({ ...baseInput, loadAverage: [] });

    expect(result.loadAverage).toEqual({ one: 0, five: 0, fifteen: 0 });
  });
});
