/**
 * Memory (RAM + swap) metrics collection.
 *
 * @module metrics/memory
 */

import si from "systeminformation";
import { percent } from "../format";

/** Memory KPIs exposed to the dashboard. All byte values are raw bytes. */
export interface MemoryMetrics {
  /** Total physical memory in bytes. */
  total: number;
  /** Used physical memory in bytes. */
  used: number;
  /** Free physical memory in bytes. */
  free: number;
  /** Used memory as a 0-100 percentage. */
  usedPercent: number;
  /** Total swap space in bytes. */
  swapTotal: number;
  /** Used swap space in bytes. */
  swapUsed: number;
  /** Used swap as a 0-100 percentage. */
  swapUsedPercent: number;
}

/**
 * Pure transform from `systeminformation` memory data.
 *
 * @param mem - Raw `si.mem()` result.
 * @returns A normalised {@link MemoryMetrics} object.
 */
export const buildMemoryMetrics = (mem: {
  total: number;
  used: number;
  free: number;
  swaptotal: number;
  swapused: number;
}): MemoryMetrics => ({
  total: mem.total,
  used: mem.used,
  free: mem.free,
  usedPercent: percent(mem.used, mem.total),
  swapTotal: mem.swaptotal,
  swapUsed: mem.swapused,
  swapUsedPercent: percent(mem.swapused, mem.swaptotal),
});

/**
 * Gather live memory metrics from the workstation.
 *
 * @returns A promise resolving to the current {@link MemoryMetrics}.
 */
export const getMemoryMetrics = async (): Promise<MemoryMetrics> =>
  buildMemoryMetrics(await si.mem());
