/**
 * Disk / filesystem metrics collection.
 *
 * @module metrics/disk
 */

import si from "systeminformation";
import { percent } from "../format";

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
 *
 * @param entry - Raw `si.fsSize()` entry.
 * @returns A normalised {@link FilesystemMetrics}.
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
 *
 * @param entries - Raw `si.fsSize()` result.
 * @returns A normalised {@link DiskMetrics} object.
 */
export const buildDiskMetrics = (entries: FsInput[]): DiskMetrics => ({
  filesystems: entries.map(buildFilesystem),
});

/**
 * Gather live disk metrics from the workstation.
 *
 * @returns A promise resolving to the current {@link DiskMetrics}.
 */
export const getDiskMetrics = async (): Promise<DiskMetrics> => buildDiskMetrics(await si.fsSize());
