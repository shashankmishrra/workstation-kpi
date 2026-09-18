import { readFileSync } from "node:fs";
import path from "node:path";

export const HOST_ROOT = process.env.HOST_ROOT ?? "";

export function hostPath(filePath: string): string {
  if (!HOST_ROOT) return filePath;
  return path.join(HOST_ROOT, filePath);
}

export function parseOsRelease(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key, valueParts.join("=").replace(/^"|"$/g, "")];
      }),
  );
}

export interface MountInfo {
  mountpoint: string;
  fstype: string;
  source: string;
}

export function parseMountInfo(text: string): MountInfo[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(" - ");
      if (separator === -1) return null;

      const left = line.slice(0, separator).split(" ");
      const right = line.slice(separator + 3).split(" ");

      return {
        mountpoint: left[4],
        fstype: right[0],
        source: right[1],
      };
    })
    .filter((mount): mount is MountInfo => mount !== null);
}

export const PSEUDO_FS = new Set([
  "proc",
  "sysfs",
  "tmpfs",
  "devpts",
  "devtmpfs",
  "cgroup",
  "cgroup2",
  "overlay",
  "rootfs",
  "squashfs",
]);
