/**
 * Disk / filesystem metrics collection.
 *
 * @module metrics/disk
 */

import { execFile } from "node:child_process";
import { readFileSync, statfsSync } from "node:fs";
import { promisify } from "node:util";

import si from "systeminformation";
import { percent } from "../format";
import { HOST_ROOT, PSEUDO_FS, hostPath, parseMountInfo } from "../hostfs";

const execFileAsync = promisify(execFile);

/** A single mounted filesystem and its usage. */
export interface FilesystemMetrics {
  /** Filesystem device or source. */
  fs: string;
  /** Mount point. */
  mount: string;
  /** Filesystem type, e.g. `"ext4"`. */
  type: string;
  /** Total size in bytes. */
  size: number;
  /** Used space in bytes. */
  used: number;
  /** Available space in bytes. */
  available: number;
  /** Used space as a 0-100 percentage. */
  usedPercent: number;
}

/** Disk KPIs exposed to the dashboard. */
export interface DiskMetrics {
  /** All mounted filesystems reported by the OS. */
  filesystems: FilesystemMetrics[];
}

/** Raw shape of one `si.fsSize()` entry. */
export interface FsInput {
  fs: string;
  mount: string;
  type: string;
  size: number;
  used: number;
  available: number;
  use: number;
}

/**
 * Pure transform for a single filesystem entry.
 */
export const buildFilesystem = (entry: FsInput): FilesystemMetrics => ({
  fs: entry.fs,
  mount: entry.mount,
  type: entry.type,
  size: entry.size,
  used: entry.used,
  available: entry.available,
  usedPercent: Number.isFinite(entry.use) ? entry.use : percent(entry.used, entry.size),
});

/**
 * Pure transform over all filesystem entries.
 */
export const buildDiskMetrics = (entries: FsInput[]): DiskMetrics => ({
  filesystems: entries.map(buildFilesystem),
});

/**
 * Gather live disk metrics from the workstation.
 */
export const getDiskMetrics = async (): Promise<DiskMetrics> => {
  // Normal machine: keep the existing systeminformation behavior.
  if (!HOST_ROOT) {
    return buildDiskMetrics(await si.fsSize());
  }

  // Docker: read the host's mount table.
  try {
    const mountInfo = readFileSync(hostPath("/proc/1/mountinfo"), "utf8");

    const mounts = parseMountInfo(mountInfo).filter((mount) => !PSEUDO_FS.has(mount.fstype));

    const entries: FsInput[] = [];

    for (const mount of mounts) {
      try {
        const stats = statfsSync(hostPath(mount.mountpoint));

        const size = stats.blocks * stats.bsize;
        const available = stats.bavail * stats.bsize;
        const used = size - stats.bfree * stats.bsize;

        entries.push({
          fs: mount.source,
          mount: mount.mountpoint,
          type: mount.fstype,
          size,
          used,
          available,
          use: percent(used, size),
        });
      } catch {
        // Ignore mounts that cannot be accessed.
      }
    }

    return buildDiskMetrics(entries);
  } catch {
    // Fallback if host mount information cannot be read.
    const { stdout } = await execFileAsync("df", ["-kP"]);

    const lines = stdout.trim().split("\n").slice(1);

    const entries: FsInput[] = lines.flatMap((line) => {
      const parts = line.split(/\s+/);

      if (parts.length < 6) {
        return [];
      }

      const fs = parts[0];
      const blocks = parts[1];
      const used = parts[2];
      const available = parts[3];
      const use = parts[4];
      const mount = parts.slice(5).join(" ");

      if (!fs || !blocks || !used || !available || !use || !mount) {
        return [];
      }
      const size = Number(blocks) * 1024;
      const usedBytes = Number(used) * 1024;
      const availableBytes = Number(available) * 1024;

      return [
        {
          fs,
          mount,
          type: "unknown",
          size,
          used: usedBytes,
          available: availableBytes,
          use: Number.parseFloat(use.replace("%", "")),
        },
      ];
    });

    return buildDiskMetrics(entries);
  }
};
