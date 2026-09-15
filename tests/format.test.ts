import { describe, expect, test } from "bun:test";
import { formatBytes, formatPercent, formatUptime, percent } from "../src/format";

describe("formatBytes", () => {
  test("formats whole kilobytes", () => {
    expect(formatBytes(1024, 0)).toBe("1 KB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(16 * 1024 ** 3, 1)).toBe("16.0 GB");
  });

  test("returns 0 B for zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("guards against invalid values", () => {
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
  });

  test("keeps bytes unscaled", () => {
    expect(formatBytes(512)).toBe("512 B");
  });
});

describe("formatPercent", () => {
  test("rounds to whole numbers by default", () => {
    expect(formatPercent(42.4)).toBe("42%");
  });

  test("keeps requested decimals", () => {
    expect(formatPercent(42.44, 1)).toBe("42.4%");
  });

  test("clamps out-of-range values", () => {
    expect(formatPercent(150)).toBe("100%");
    expect(formatPercent(-10)).toBe("0%");
  });

  test("handles invalid input", () => {
    expect(formatPercent(Number.NaN)).toBe("0%");
  });
});

describe("formatUptime", () => {
  test("formats only seconds under a minute", () => {
    expect(formatUptime(45)).toBe("45s");
  });

  test("formats minutes and seconds", () => {
    expect(formatUptime(125)).toBe("2m 5s");
  });

  test("formats days, hours, minutes and seconds", () => {
    expect(formatUptime(3 * 86400 + 4 * 3600 + 5 * 60 + 6)).toBe("3d 4h 5m 6s");
  });

  test("returns 0s for non-positive values", () => {
    expect(formatUptime(0)).toBe("0s");
    expect(formatUptime(-1)).toBe("0s");
  });
});

describe("percent", () => {
  test("computes a percentage", () => {
    expect(percent(25, 100)).toBe(25);
  });

  test("returns 0 when total is zero", () => {
    expect(percent(25, 0)).toBe(0);
  });

  test("clamps above 100", () => {
    expect(percent(200, 100)).toBe(100);
  });
});
