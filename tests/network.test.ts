import { describe, expect, test } from "bun:test";
import { buildInterface, buildNetworkMetrics } from "../src/metrics/network";

const entry = {
  iface: "eth0",
  operstate: "up",
  rx_sec: 1024,
  tx_sec: 2048,
  rx_bytes: 10_000,
  tx_bytes: 20_000,
  rx_errors: 0,
  tx_errors: 1,
};

describe("buildInterface", () => {
  test("maps an interface entry", () => {
    expect(buildInterface(entry)).toEqual({
      iface: "eth0",
      operstate: "up",
      rxSec: 1024,
      txSec: 2048,
      rxTotal: 10_000,
      txTotal: 20_000,
      rxErrors: 0,
      txErrors: 1,
    });
  });

  test("defaults null rates to zero", () => {
    const result = buildInterface({ ...entry, rx_sec: null, tx_sec: null });

    expect(result.rxSec).toBe(0);
    expect(result.txSec).toBe(0);
  });

  test("defaults a missing operstate", () => {
    const result = buildInterface({ ...entry, operstate: "" });

    expect(result.operstate).toBe("unknown");
  });
});

describe("buildNetworkMetrics", () => {
  test("maps every interface", () => {
    const result = buildNetworkMetrics([entry, { ...entry, iface: "wlan0" }]);

    expect(result.interfaces).toHaveLength(2);
    expect(result.interfaces[1]?.iface).toBe("wlan0");
  });

  test("returns an empty list when there are no interfaces", () => {
    expect(buildNetworkMetrics([]).interfaces).toEqual([]);
  });
});
