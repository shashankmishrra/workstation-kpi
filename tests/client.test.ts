import { describe, expect, test } from "bun:test";
import {
  MAX_SAMPLES,
  THRESHOLDS,
  aggregateDiskPercent,
  chartCeiling,
  clamp,
  classify,
  describeFilesystem,
  fetchMetrics,
  formatBytes,
  formatClock,
  formatPercent,
  formatRate,
  formatUptime,
  greetingFor,
  pushSample,
  severity,
  toAreaPath,
  toPolyline,
  trend,
} from "../public/app.js";

describe("client formatBytes", () => {
  test("formats gigabytes", () => {
    expect(formatBytes(16 * 1024 ** 3, 1)).toBe("16.0 GB");
  });

  test("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("client formatPercent", () => {
  test("clamps above 100", () => {
    expect(formatPercent(150)).toBe("100%");
  });

  test("keeps decimals", () => {
    expect(formatPercent(33.333, 1)).toBe("33.3%");
  });
});

describe("client formatRate", () => {
  test("appends per second", () => {
    expect(formatRate(1024)).toBe("1.0 KB/s");
  });

  test("formats zero", () => {
    expect(formatRate(0)).toBe("0 B/s");
  });
});

describe("client formatUptime", () => {
  test("formats days and seconds", () => {
    expect(formatUptime(86400 + 6)).toBe("1d 6s");
  });
});

describe("severity", () => {
  test("is ok below 70", () => {
    expect(severity(0)).toBe("ok");
    expect(severity(69.9)).toBe("ok");
  });

  test("is warn from 70", () => {
    expect(severity(70)).toBe("warn");
    expect(severity(89.9)).toBe("warn");
  });

  test("is danger from 90", () => {
    expect(severity(90)).toBe("danger");
    expect(severity(100)).toBe("danger");
  });
});

describe("describeFilesystem", () => {
  test("describes type and mount", () => {
    expect(describeFilesystem({ mount: "/", type: "ext4" })).toBe("ext4 at /");
  });
});

describe("formatClock", () => {
  test("returns an em dash for invalid dates", () => {
    expect(formatClock("not-a-date")).toBe("\u2014");
  });

  test("formats a valid ISO date", () => {
    expect(formatClock("2026-09-15T12:00:00.000Z")).not.toBe("\u2014");
  });
});

describe("fetchMetrics", () => {
  test("parses a successful response", async () => {
    const fakeFetch = async () => new Response(JSON.stringify({ cpu: { cores: 4 } }));

    await expect(fetchMetrics(fakeFetch)).resolves.toMatchObject({ cpu: { cores: 4 } });
  });

  test("throws on a failed response", async () => {
    const fakeFetch = async () => new Response("nope", { status: 500 });

    await expect(fetchMetrics(fakeFetch)).rejects.toThrow("status 500");
  });
});

describe("clamp", () => {
  test("clamps into range", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});

describe("classify", () => {
  test("uses cpu thresholds", () => {
    expect(classify(30, THRESHOLDS.cpu)).toBe("normal");
    expect(classify(65, THRESHOLDS.cpu)).toBe("elevated");
    expect(classify(85, THRESHOLDS.cpu)).toBe("warning");
    expect(classify(95, THRESHOLDS.cpu)).toBe("critical");
  });

  test("uses memory thresholds", () => {
    expect(classify(72, THRESHOLDS.memory)).toBe("elevated");
    expect(classify(90, THRESHOLDS.memory)).toBe("warning");
    expect(classify(97, THRESHOLDS.memory)).toBe("critical");
  });
});

describe("greetingFor", () => {
  test("changes across the day", () => {
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(14)).toBe("Good afternoon");
    expect(greetingFor(21)).toBe("Good evening");
  });
});

describe("pushSample", () => {
  test("appends without mutating", () => {
    const input = [1, 2];
    const output = pushSample(input, 3);
    expect(output).toEqual([1, 2, 3]);
    expect(input).toEqual([1, 2]);
  });

  test("caps the buffer length", () => {
    const full = Array.from({ length: MAX_SAMPLES }, (_, index) => index);
    const output = pushSample(full, 999);
    expect(output).toHaveLength(MAX_SAMPLES);
    expect(output[output.length - 1]).toBe(999);
    expect(output[0]).toBe(1);
  });
});

describe("trend", () => {
  test("returns zero for short histories", () => {
    expect(trend([])).toBe(0);
    expect(trend([5])).toBe(0);
  });

  test("returns the signed change", () => {
    expect(trend([10, 20, 22])).toBe(12);
    expect(trend([50, 40])).toBe(-10);
  });
});

describe("chart geometry", () => {
  test("maps values into a polyline", () => {
    expect(toPolyline([0, 100], 100, 100)).toBe("0.00,100.00 100.00,0.00");
  });

  test("closes an area path back to the baseline", () => {
    expect(toAreaPath([100], 100, 100)).toBe("M0.00,0.00 L100,100 L0.00,100 Z");
  });

  test("handles empty series", () => {
    expect(toAreaPath([], 100, 100)).toBe("");
    expect(toPolyline([], 100, 100)).toBe("");
  });
});

describe("aggregateDiskPercent", () => {
  const filesystem = (size: number, used: number) => ({
    fs: "/dev/root",
    mount: "/",
    type: "ext4",
    size,
    used,
    available: size - used,
    usedPercent: (used / size) * 100,
  });

  test("weights usage by size", () => {
    expect(aggregateDiskPercent([filesystem(100, 20), filesystem(300, 90)])).toBeCloseTo(27.5, 5);
  });

  test("is zero for no filesystems", () => {
    expect(aggregateDiskPercent([])).toBe(0);
  });
});

describe("chartCeiling", () => {
  test("adds headroom above the peak", () => {
    expect(chartCeiling([10, 200, 50])).toBeCloseTo(230, 5);
  });

  test("never returns zero", () => {
    expect(chartCeiling([])).toBeGreaterThanOrEqual(1);
    expect(chartCeiling([0])).toBeGreaterThanOrEqual(1);
  });
});
