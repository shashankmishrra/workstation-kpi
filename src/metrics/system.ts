/**
 * System / OS identity metrics collection.
 *
 * @module metrics/system
 */

import { readFileSync } from "node:fs";
import os from "node:os";
import si from "systeminformation";
import { HOST_ROOT, hostPath, parseOsRelease } from "../hostfs";

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
 */
export const getSystemMetrics = async (): Promise<SystemMetrics> => {
  const info = await si.osInfo();
  const now = new Date();

  let hostname = info.hostname || os.hostname();
  let distro = info.distro || info.platform;
  let kernel = info.kernel;

  if (HOST_ROOT) {
    try {
      hostname = readFileSync(hostPath("/etc/hostname"), "utf8").trim() || hostname;
    } catch {
      // Keep the systeminformation value.
    }

    try {
      const osRelease = readFileSync(hostPath("/etc/os-release"), "utf8");

      const parsed = parseOsRelease(osRelease);
      distro = parsed.PRETTY_NAME || distro;
    } catch {
      // Keep the systeminformation value.
    }

    try {
      kernel = readFileSync(hostPath("/proc/sys/kernel/osrelease"), "utf8").trim() || kernel;
    } catch {
      // Keep the systeminformation value.
    }
  }

  return buildSystemMetrics({
    hostname,
    distro,
    platform: info.platform,
    kernel,
    arch: info.arch || os.arch(),
    uptimeSeconds: os.uptime(),
    time: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};
