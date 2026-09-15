/**
 * System / OS identity metrics collection.
 *
 * @module metrics/system
 */

import os from "node:os";
import si from "systeminformation";

/** System information KPIs exposed to the dashboard. */
export interface SystemMetrics {
  /** Machine hostname. */
  hostname: string;
  /** Distribution / OS name, e.g. `"Ubuntu"`. */
  distro: string;
  /** Platform identifier, e.g. `"linux"`. */
  platform: string;
  /** Kernel version string. */
  kernel: string;
  /** CPU architecture, e.g. `"x64"`. */
  arch: string;
  /** System uptime in seconds. */
  uptimeSeconds: number;
  /** Server time as an ISO-8601 timestamp. */
  time: string;
  /** IANA timezone name. */
  timezone: string;
}

/** Raw inputs required to build {@link SystemMetrics}. */
export interface SystemInput {
  hostname: string;
  distro: string;
  platform: string;
  kernel: string;
  arch: string;
  uptimeSeconds: number;
  time: Date;
  timezone: string;
}

/**
 * Pure transform from raw OS values into the public system shape.
 *
 * @param input - Raw values gathered from the OS / `systeminformation`.
 * @returns A normalised {@link SystemMetrics} object.
 */
export const buildSystemMetrics = (input: SystemInput): SystemMetrics => ({
  hostname: input.hostname,
  distro: input.distro,
  platform: input.platform,
  kernel: input.kernel,
  arch: input.arch,
  uptimeSeconds: input.uptimeSeconds,
  time: input.time.toISOString(),
  timezone: input.timezone,
});

/**
 * Gather live system metrics from the workstation.
 *
 * @returns A promise resolving to the current {@link SystemMetrics}.
 */
export const getSystemMetrics = async (): Promise<SystemMetrics> => {
  const info = await si.osInfo();
  const now = new Date();

  return buildSystemMetrics({
    hostname: info.hostname || os.hostname(),
    distro: info.distro || info.platform,
    platform: info.platform,
    kernel: info.kernel,
    arch: info.arch || os.arch(),
    uptimeSeconds: os.uptime(),
    time: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};
