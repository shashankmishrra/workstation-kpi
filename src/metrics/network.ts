/**
 * Network interface metrics collection.
 *
 * `systeminformation` reports transfer rates by comparing consecutive samples,
 * so callers should let {@link getNetworkMetrics} run continuously (the poller
 * does this) for accurate bytes-per-second values.
 *
 * @module metrics/network
 */

import si from "systeminformation";

/** Per-interface network KPIs. */
export interface InterfaceMetrics {
  /** Interface name, e.g. `"eth0"`. */
  iface: string;
  /** Operational state, e.g. `"up"` or `"down"`. */
  operstate: string;
  /** Bytes received per second. */
  rxSec: number;
  /** Bytes transmitted per second. */
  txSec: number;
  /** Total bytes received since boot. */
  rxTotal: number;
  /** Total bytes transmitted since boot. */
  txTotal: number;
  /** Receive errors since boot. */
  rxErrors: number;
  /** Transmit errors since boot. */
  txErrors: number;
}

/** Network KPIs exposed to the dashboard. */
export interface NetworkMetrics {
  /** All network interfaces with traffic counters. */
  interfaces: InterfaceMetrics[];
}

/** Raw shape of one `si.networkStats()` entry. */
export interface NetworkInput {
  iface: string;
  operstate: string;
  rx_sec: number | null;
  tx_sec: number | null;
  rx_bytes: number;
  tx_bytes: number;
  rx_errors: number;
  tx_errors: number;
}

/**
 * Pure transform for a single interface entry.
 *
 * @param entry - Raw `si.networkStats()` entry.
 * @returns A normalised {@link InterfaceMetrics}.
 */
export const buildInterface = (entry: NetworkInput): InterfaceMetrics => ({
  iface: entry.iface,
  operstate: entry.operstate || "unknown",
  rxSec: entry.rx_sec ?? 0,
  txSec: entry.tx_sec ?? 0,
  rxTotal: entry.rx_bytes ?? 0,
  txTotal: entry.tx_bytes ?? 0,
  rxErrors: entry.rx_errors ?? 0,
  txErrors: entry.tx_errors ?? 0,
});

/**
 * Pure transform over all network interface entries.
 *
 * @param entries - Raw `si.networkStats()` result.
 * @returns A normalised {@link NetworkMetrics} object.
 */
export const buildNetworkMetrics = (entries: NetworkInput[]): NetworkMetrics => ({
  interfaces: entries.map(buildInterface),
});

/**
 * Gather live network metrics from the workstation.
 *
 * @returns A promise resolving to the current {@link NetworkMetrics}.
 */
export const getNetworkMetrics = async (): Promise<NetworkMetrics> =>
  buildNetworkMetrics(await si.networkStats());
