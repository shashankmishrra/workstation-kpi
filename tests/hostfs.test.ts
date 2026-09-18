import { describe, expect, test } from "bun:test";
import { PSEUDO_FS, parseMountInfo, parseOsRelease } from "../src/hostfs";

describe("parseOsRelease", () => {
  test("parses os-release values", () => {
    const text = `
NAME="Ubuntu"
VERSION="24.04 LTS"
PRETTY_NAME="Ubuntu 24.04 LTS"
ID=ubuntu
`;

    const result = parseOsRelease(text);

    expect(result.NAME).toBe("Ubuntu");
    expect(result.PRETTY_NAME).toBe("Ubuntu 24.04 LTS");
    expect(result.ID).toBe("ubuntu");
  });
});

describe("parseMountInfo", () => {
  test("parses mount information", () => {
    const text = "36 29 8:1 / / rw,relatime - ext4 /dev/sda1 rw";

    const result = parseMountInfo(text);

    expect(result).toEqual([
      {
        mountpoint: "/",
        fstype: "ext4",
        source: "/dev/sda1",
      },
    ]);
  });
});

describe("PSEUDO_FS", () => {
  test("identifies pseudo filesystems", () => {
    expect(PSEUDO_FS.has("proc")).toBe(true);
    expect(PSEUDO_FS.has("sysfs")).toBe(true);
    expect(PSEUDO_FS.has("tmpfs")).toBe(true);
    expect(PSEUDO_FS.has("ext4")).toBe(false);
  });
});
