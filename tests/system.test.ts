import { describe, expect, test } from "bun:test";
import { buildSystemMetrics } from "../src/metrics/system";

const fixedDate = new Date("2026-09-15T12:34:56.000Z");

const baseInput = {
  hostname: "workstation",
  distro: "Ubuntu",
  platform: "linux",
  kernel: "6.8.0-generic",
  arch: "x64",
  uptimeSeconds: 123456,
  time: fixedDate,
  timezone: "UTC",
};

describe("buildSystemMetrics", () => {
  test("maps raw values into the public shape", () => {
    const result = buildSystemMetrics(baseInput);

    expect(result.hostname).toBe("workstation");
    expect(result.distro).toBe("Ubuntu");
    expect(result.platform).toBe("linux");
    expect(result.kernel).toBe("6.8.0-generic");
    expect(result.arch).toBe("x64");
    expect(result.timezone).toBe("UTC");
  });

  test("serialises the date as an ISO string", () => {
    expect(buildSystemMetrics(baseInput).time).toBe("2026-09-15T12:34:56.000Z");
  });

  test("passes through uptime seconds", () => {
    expect(buildSystemMetrics(baseInput).uptimeSeconds).toBe(123456);
  });
});
