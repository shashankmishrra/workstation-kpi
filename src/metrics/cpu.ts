/**
 * CPU metrics collection.
 *
 * The module separates the pure reshaping logic (`buildCpuMetrics`) from the
 * impure data gathering (`getCpuMetrics`) so the transform can be unit tested
 * without touching real hardware.
 *
 * @module metrics/cpu
 */

import os from "node:os";
import si from "systeminformation";

/** CPU KPIs exposed to the dashboard. */
export interface CpuMetrics {
  /** Human readable processor model. */
  model: string;
  /** Logical core count (includes hyper-threading). */
  cores: number;
  /** Physical core count. */
  physicalCores: number;
  /** Current average clock speed in GHz. */
  speedGhz: number;
  /** Aggregate utilisation across all cores, 0-100. */
  usagePercent: number;
  /** Rolling load average over 1, 5 and 15 minutes. */
  loadAverage: { one: number; five: number; fifteen: number };
  /** CPU architecture, e.g. `"x64"`. */
  arch: string;
}

/** Raw inputs required to build {@link CpuMetrics}. */
export interface CpuInput {
  brand: string;
  cores: number;
  physicalCores: number;
  speedGhz: number;
  usagePercent: number;
  loadAverage: number[];
  arch: string;
}

/**
 * Round a number to a fixed number of decimals.
 *
 * @param value - The number to round.
 * @param decimals - Decimal places to keep (default `2`).
 * @returns The rounded number, or `0` when the input is not finite.
 */
const round = (value: number, decimals = 2): number =>
  Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

/**
 * Pure transform from raw system values into the public CPU shape.
 *
 * @param input - Raw values gathered from the OS / `systeminformation`.
 * @returns A normalised {@link CpuMetrics} object.
 */
export const buildCpuMetrics = (input: CpuInput): CpuMetrics => ({
  model: input.brand || "Unknown CPU",
  cores: input.cores,
  physicalCores: input.physicalCores,
  speedGhz: round(input.speedGhz),
  usagePercent: round(input.usagePercent, 1),
  loadAverage: {
    one: round(input.loadAverage[0] ?? 0),
    five: round(input.loadAverage[1] ?? 0),
    fifteen: round(input.loadAverage[2] ?? 0),
  },
  arch: input.arch,
});

/**
 * Gather live CPU metrics from the workstation.
 *
 * @returns A promise resolving to the current {@link CpuMetrics}.
 */
export const getCpuMetrics = async (): Promise<CpuMetrics> => {
  const [cpu, load] = await Promise.all([si.cpu(), si.currentLoad()]);

  return buildCpuMetrics({
    brand: cpu.brand,
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    speedGhz: cpu.speed,
    usagePercent: load.currentLoad,
    loadAverage: os.loadavg(),
    arch: os.arch(),
  });
};
