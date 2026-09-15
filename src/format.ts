/**
 * Pure formatting helpers shared by the API and the browser client.
 *
 * Every function here is a pure function: given the same input it returns the
 * same output and never mutates its arguments. This makes them trivial to unit
 * test with `bun test`.
 *
 * @module format
 */

/** Kilobyte, in bytes (binary convention used by `systeminformation`). */
const KB = 1024;
/** Human readable byte units, largest last. */
const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/**
 * Format a byte count into a compact human readable string.
 *
 * @param bytes - Raw size in bytes.
 * @param decimals - Number of decimal places to keep (default `1`).
 * @returns A string such as `"16.0 GB"`.
 * @example
 * formatBytes(1536, 0); // "1 KB"
 */
export const formatBytes = (bytes: number, decimals = 1): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(KB)), BYTE_UNITS.length - 1);
  const value = bytes / KB ** exponent;
  const fixed = exponent === 0 ? String(Math.round(value)) : value.toFixed(decimals);

  return `${fixed} ${BYTE_UNITS[exponent]}`;
};

/**
 * Format a 0-100 percentage value.
 *
 * @param value - The percentage (may be fractional).
 * @param decimals - Number of decimal places to keep (default `0`).
 * @returns A string such as `"42%"`.
 */
export const formatPercent = (value: number, decimals = 0): string => {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  const clamped = Math.min(Math.max(value, 0), 100);
  return `${clamped.toFixed(decimals)}%`;
};

/**
 * Format an uptime duration into `"Nd Nh Nm Ns"` segments.
 *
 * @param seconds - Duration in seconds.
 * @returns A compact human readable duration, e.g. `"3d 4h 5m 6s"`.
 */
export const formatUptime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }

  const whole = Math.floor(seconds);
  const days = Math.floor(whole / 86400);
  const hours = Math.floor((whole % 86400) / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;

  return [
    days > 0 ? `${days}d` : "",
    hours > 0 ? `${hours}h` : "",
    minutes > 0 ? `${minutes}m` : "",
    `${secs}s`,
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * Compute a percentage from a part and a total, guarding against division by zero.
 *
 * @param part - The portion of the total.
 * @param total - The total amount.
 * @returns A number between `0` and `100` (or `0` when total is not positive).
 */
export const percent = (part: number, total: number): number => {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.min(Math.max((part / total) * 100, 0), 100);
};
