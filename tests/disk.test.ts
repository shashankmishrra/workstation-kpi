import { describe, expect, test } from "bun:test";
import { buildDiskMetrics, buildFilesystem } from "../src/metrics/disk";

const entry = {
  fs: "/dev/sda1",
  mount: "/",
  type: "ext4",
  size: 500_000,
  used: 200_000,
  available: 300_000,
  use: 40,
};

describe("buildFilesystem", () => {
  test("maps a filesystem entry", () => {
    expect(buildFilesystem(entry)).toEqual({
      fs: "/dev/sda1",
      mount: "/",
      type: "ext4",
      size: 500_000,
      used: 200_000,
      available: 300_000,
      usedPercent: 40,
    });
  });

  test("computes usedPercent when use is not finite", () => {
    const result = buildFilesystem({ ...entry, use: Number.NaN });

    expect(result.usedPercent).toBe(40);
  });
});

describe("buildDiskMetrics", () => {
  test("maps every filesystem", () => {
    const result = buildDiskMetrics([entry, { ...entry, mount: "/data", use: 80 }]);

    expect(result.filesystems).toHaveLength(2);
    expect(result.filesystems[1]?.mount).toBe("/data");
    expect(result.filesystems[1]?.usedPercent).toBe(80);
  });

  test("returns an empty list when there are no mounts", () => {
    expect(buildDiskMetrics([]).filesystems).toEqual([]);
  });
});
