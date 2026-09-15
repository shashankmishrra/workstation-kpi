/**
 * Workstation KPI dashboard client.
 *
 * The code follows a functional style: pure helpers for formatting,
 * classification and chart geometry, plus small DOM effects. Every pure
 * function is exported so it can be unit tested with `bun test`. The polling
 * loop only starts when a `document` is present, so importing this module in a
 * test runner is safe.
 *
 * @module app
 */

/**
 * @typedef {import("../src/metrics/cpu").CpuMetrics} CpuMetrics
 * @typedef {import("../src/metrics/memory").MemoryMetrics} MemoryMetrics
 * @typedef {import("../src/metrics/disk").DiskMetrics} DiskMetrics
 * @typedef {import("../src/metrics/disk").FilesystemMetrics} FilesystemMetrics
 * @typedef {import("../src/metrics/network").NetworkMetrics} NetworkMetrics
 * @typedef {import("../src/metrics/system").SystemMetrics} SystemMetrics
 * @typedef {import("../src/api").MetricsPayload} MetricsPayload
 */

/** A fetch-compatible function used for polling the metrics endpoint. */
/** @typedef {(input: RequestInfo | URL) => Promise<Response>} Fetcher */

/** How often to poll the API, in milliseconds. */
export const POLL_INTERVAL_MS = 3000;

/** Endpoint that returns the combined metrics payload. */
export const METRICS_ENDPOINT = "/api/metrics";

/** How many samples to keep: five minutes at a three second cadence. */
export const MAX_SAMPLES = 100;

/** Per-resource severity thresholds: `[elevated, warning, critical]`. */
export const THRESHOLDS = {
  cpu: /** @type {[number, number, number]} */ ([60, 80, 90]),
  memory: /** @type {[number, number, number]} */ ([70, 85, 95]),
  disk: /** @type {[number, number, number]} */ ([70, 85, 95]),
};

const KB = 1024;
const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];
const SVG_NS = "http://www.w3.org/2000/svg";

/* --------------------------------------------------------------------------
 * Pure formatting helpers
 * ------------------------------------------------------------------------ */

/**
 * Format a byte count into a compact human readable string.
 *
 * @param {number} bytes - Raw size in bytes.
 * @param {number} [decimals=1] - Decimal places to keep.
 * @returns {string} e.g. `"16.0 GB"`.
 */
export const formatBytes = (bytes, decimals = 1) => {
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
 * @param {number} value - The percentage.
 * @param {number} [decimals=0] - Decimal places to keep.
 * @returns {string} e.g. `"42%"`.
 */
export const formatPercent = (value, decimals = 0) => {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  const clamped = clamp(value, 0, 100);
  return `${clamped.toFixed(decimals)}%`;
};

/**
 * Format a bytes-per-second rate.
 *
 * @param {number} bytesPerSecond - Rate in bytes per second.
 * @returns {string} e.g. `"1.2 MB/s"`.
 */
export const formatRate = (bytesPerSecond) => `${formatBytes(bytesPerSecond)}/s`;

/**
 * Format an uptime duration into `"Nd Nh Nm Ns"` segments.
 *
 * @param {number} seconds - Duration in seconds.
 * @returns {string} e.g. `"3d 4h 5m 6s"`.
 */
export const formatUptime = (seconds) => {
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
 * Format an ISO timestamp as a locale time string.
 *
 * @param {string} iso - An ISO-8601 timestamp.
 * @returns {string} A localised time string, or an em dash on failure.
 */
export const formatClock = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "\u2014" : date.toLocaleTimeString();
};

/**
 * Format an ISO timestamp as a short `"h:mm"` label for chart axes.
 *
 * @param {string} iso - An ISO-8601 timestamp.
 * @returns {string} A short localised time, or an empty string on failure.
 */
export const formatClockShort = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

/**
 * Classify a percentage into a severity bucket used for meter colours.
 * Kept for compatibility; see {@link classify} for per-resource thresholds.
 *
 * @param {number} value - The percentage value.
 * @returns {"ok" | "warn" | "danger"} Severity bucket.
 */
export const severity = (value) => {
  if (value >= 90) {
    return "danger";
  }
  if (value >= 70) {
    return "warn";
  }
  return "ok";
};

/**
 * Classify a value against a resource's thresholds.
 *
 * @param {number} value - The percentage value.
 * @param {[number, number, number]} thresholds - `[elevated, warning, critical]`.
 * @returns {"normal" | "elevated" | "warning" | "critical"} Severity level.
 */
export const classify = (value, thresholds) => {
  const [elevated, warning, critical] = thresholds;
  if (value >= critical) {
    return "critical";
  }
  if (value >= warning) {
    return "warning";
  }
  if (value >= elevated) {
    return "elevated";
  }
  return "normal";
};

/**
 * Describe a filesystem mount compactly.
 *
 * @param {{ mount: string; type: string }} fs - A filesystem entry.
 * @returns {string} e.g. `"ext4 at /"`.
 */
export const describeFilesystem = (fs) => `${fs.type} at ${fs.mount}`;

/**
 * Pick a time-of-day greeting for an hour.
 *
 * @param {number} hour - Hour of day, 0-23.
 * @returns {string} e.g. `"Good afternoon"`.
 */
export const greetingFor = (hour) => {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

/* --------------------------------------------------------------------------
 * Pure numeric + chart geometry helpers
 * ------------------------------------------------------------------------ */

/**
 * Clamp a number into an inclusive range.
 *
 * @param {number} value - The value to clamp.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} The clamped value.
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Append a sample to a fixed-length history buffer, without mutating the input.
 *
 * @template T
 * @param {T[]} samples - Existing samples.
 * @param {T} value - The new sample.
 * @param {number} [max] - Maximum buffer length.
 * @returns {T[]} A new array with the sample appended.
 */
export const pushSample = (samples, value, max = MAX_SAMPLES) => {
  const trimmed = samples.length >= max ? samples.slice(samples.length - max + 1) : samples;
  return [...trimmed, value];
};

/**
 * Signed change between the oldest and newest sample.
 *
 * @param {number[]} samples - Sample history.
 * @returns {number} The delta, or `0` when there are fewer than two samples.
 */
export const trend = (samples) => {
  if (samples.length < 2) {
    return 0;
  }
  const first = samples[0] ?? 0;
  const last = samples[samples.length - 1] ?? 0;
  return last - first;
};

/**
 * Project values into SVG coordinates.
 *
 * @param {number[]} values - The series values.
 * @param {number} width - Plot width in user units.
 * @param {number} height - Plot height in user units.
 * @param {number} [max=100] - Value mapped to the top of the plot.
 * @returns {Array<[number, number]>} Coordinates, oldest first.
 */
export const toPoints = (values, width, height, max = 100) => {
  const count = values.length;
  if (count === 0) {
    return [];
  }
  const step = count > 1 ? width / (count - 1) : 0;
  return values.map((value, index) => [
    index * step,
    height - (clamp(value, 0, max) / max) * height,
  ]);
};

/**
 * Build an SVG `points` string for a polyline.
 *
 * @param {number[]} values - The series values.
 * @param {number} width - Plot width in user units.
 * @param {number} height - Plot height in user units.
 * @param {number} [max=100] - Value mapped to the top of the plot.
 * @returns {string} A space separated `"x,y"` list.
 */
export const toPolyline = (values, width, height, max = 100) =>
  toPoints(values, width, height, max)
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

/**
 * Build an SVG path `d` describing the area under a series.
 *
 * @param {number[]} values - The series values.
 * @param {number} width - Plot width in user units.
 * @param {number} height - Plot height in user units.
 * @param {number} [max=100] - Value mapped to the top of the plot.
 * @returns {string} A path definition, or an empty string for no data.
 */
export const toAreaPath = (values, width, height, max = 100) => {
  const points = toPoints(values, width, height, max);
  if (points.length === 0) {
    return "";
  }
  const [firstX] = points[0] ?? [0, 0];
  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  return `${line} L${width},${height} L${firstX.toFixed(2)},${height} Z`;
};

/**
 * Compute the size-weighted disk usage across all filesystems.
 *
 * @param {FilesystemMetrics[]} filesystems - Filesystem usage entries.
 * @returns {number} Used space as a 0-100 percentage.
 */
export const aggregateDiskPercent = (filesystems) => {
  const total = filesystems.reduce((sum, fs) => sum + fs.size, 0);
  const used = filesystems.reduce((sum, fs) => sum + fs.used, 0);
  return total > 0 ? clamp((used / total) * 100, 0, 100) : 0;
};

/**
 * Scale ceiling for rate-based charts, with headroom above the peak.
 *
 * @param {number[]} values - The series values.
 * @returns {number} A positive maximum, at least `1`.
 */
export const chartCeiling = (values) => Math.max(1, ...values) * 1.15;

/* --------------------------------------------------------------------------
 * Module state
 * ------------------------------------------------------------------------ */

const history = {
  cpu: /** @type {number[]} */ ([]),
  memory: /** @type {number[]} */ ([]),
  disk: /** @type {number[]} */ ([]),
  network: /** @type {number[]} */ ([]),
  times: /** @type {string[]} */ ([]),
};

/** Difference between server time and local time, in milliseconds. */
let clockOffsetMs = 0;

/* --------------------------------------------------------------------------
 * DOM helpers
 * ------------------------------------------------------------------------ */

/**
 * Look up an element by id.
 *
 * @param {string} id - Element id.
 * @returns {HTMLElement | null} The element, if present.
 */
const byId = (id) => document.getElementById(id);

/**
 * Look up an SVG element by CSS selector.
 *
 * @param {string} selector - CSS selector.
 * @returns {SVGElement | null} The element, if present.
 */
const svgQuery = (selector) => {
  const el = document.querySelector(selector);
  return el instanceof SVGElement ? el : null;
};

/**
 * Create an SVG element and apply attributes.
 *
 * @param {string} name - SVG tag name.
 * @param {Record<string, string | number>} [attributes] - Attributes to set.
 * @returns {SVGElement} The created element.
 */
const svgEl = (name, attributes = {}) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, String(value));
  }
  return el;
};

/**
 * Set the text content of an element when it exists.
 *
 * @param {string} id - Element id.
 * @param {string} text - Text to display.
 * @returns {void}
 */
const setText = (id, text) => {
  const el = byId(id);
  if (el) {
    el.textContent = text;
  }
};

/* --------------------------------------------------------------------------
 * DOM effects
 * ------------------------------------------------------------------------ */

const BADGE_TEXT = {
  normal: "Normal",
  elevated: "Elevated",
  warning: "Warning",
  critical: "Critical",
};

/**
 * Update a meter element, its ARIA value and severity modifier.
 *
 * @param {string} barId - Meter wrapper id.
 * @param {string} fillId - Meter fill id.
 * @param {number} value - Percentage value 0-100.
 * @param {"normal" | "elevated" | "warning" | "critical"} level - Severity level.
 * @returns {void}
 */
const setBar = (barId, fillId, value, level) => {
  const bar = byId(barId);
  const fill = byId(fillId);
  if (bar) {
    bar.setAttribute("aria-valuenow", String(Math.round(value)));
  }
  if (fill) {
    fill.style.width = `${clamp(value, 0, 100)}%`;
    fill.className = level === "normal" ? "bar__fill" : `bar__fill bar__fill--${level}`;
  }
};

/**
 * Update a status badge with its severity text and modifier.
 *
 * @param {string} id - Badge element id.
 * @param {"normal" | "elevated" | "warning" | "critical"} level - Severity level.
 * @returns {void}
 */
const setBadge = (id, level) => {
  const el = byId(id);
  if (!el) {
    return;
  }
  el.textContent = BADGE_TEXT[level];
  el.className = `badge badge--${level}`;
};

/**
 * Update a trend indicator's direction, icon and value.
 *
 * @param {string} containerId - Trend container id.
 * @param {string} iconId - `<use>` element id.
 * @param {string} valueId - Trend value element id.
 * @param {number} delta - Signed change over the window.
 * @returns {void}
 */
const setTrend = (containerId, iconId, valueId, delta) => {
  const direction = delta <= -0.5 ? "down" : delta >= 0.5 ? "up" : "flat";
  const container = byId(containerId);
  if (container) {
    container.dataset.direction = direction;
  }
  const icon = document.getElementById(iconId);
  if (icon) {
    icon.setAttribute("href", direction === "up" ? "#icon-trend-up" : "#icon-trend-down");
  }
  setText(valueId, `${Math.abs(delta).toFixed(0)}%`);
};

/**
 * Render a sparkline (gradient area + line) into an existing SVG element.
 *
 * @param {string} id - Target SVG element id.
 * @param {number[]} values - The series values.
 * @param {string} color - Line colour.
 * @param {string} gradientId - Unique gradient id.
 * @param {number} [max=100] - Value mapped to the top of the chart.
 * @returns {void}
 */
const renderSparkline = (id, values, color, gradientId, max = 100) => {
  const svg = svgQuery(`#${id}`);
  if (!svg) {
    return;
  }
  svg.replaceChildren();
  if (values.length < 2) {
    return;
  }
  const size = 100;
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  const gradient = svgEl("linearGradient", { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 });
  gradient.append(
    svgEl("stop", { offset: "0%", "stop-color": color, "stop-opacity": 0.28 }),
    svgEl("stop", { offset: "100%", "stop-color": color, "stop-opacity": 0 }),
  );
  const defs = svgEl("defs");
  defs.append(gradient);
  svg.append(defs);

  if (values.length >= 4) {
    svg.append(
      svgEl("path", {
        class: "chart__area",
        d: toAreaPath(values, size, size, max),
        fill: `url(#${gradientId})`,
      }),
    );
  }

  svg.append(
    svgEl("polyline", {
      class: "chart__line",
      points: toPolyline(values, size, size, max),
      stroke: color,
      "vector-effect": "non-scaling-stroke",
    }),
  );
};

/**
 * Render the multi-series resource usage chart.
 *
 * @param {Array<{ values: number[]; color: string; fill: string }>} series - Series to draw.
 * @param {string[]} times - X-axis time labels, oldest first.
 * @returns {void}
 */
const renderResourceChart = (series, times) => {
  const svg = svgQuery("#resource-chart");
  if (!svg) {
    return;
  }
  svg.replaceChildren();

  const width = 960;
  const height = 260;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 30;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const group = svgEl("g", { transform: `translate(${padLeft} ${padTop})` });

  for (const value of [0, 25, 50, 75, 100]) {
    const y = plotHeight - (value / 100) * plotHeight;
    group.append(svgEl("line", { class: "chart__grid", x1: 0, y1: y, x2: plotWidth, y2: y }));
    const label = svgEl("text", {
      class: "chart__axis",
      x: -12,
      y: y + 4,
      "text-anchor": "end",
    });
    label.textContent = `${value}%`;
    group.append(label);
  }

  for (const item of series) {
    if (item.values.length < 2) {
      continue;
    }
    group.append(
      svgEl("path", {
        class: "chart__area",
        d: toAreaPath(item.values, plotWidth, plotHeight),
        fill: item.fill,
      }),
      svgEl("polyline", {
        class: "chart__line",
        points: toPolyline(item.values, plotWidth, plotHeight),
        stroke: item.color,
      }),
    );
  }

  const labelCount = Math.min(times.length, 6);
  if (labelCount > 0) {
    const positions = Array.from({ length: labelCount }, (_, index) => {
      const ratio = labelCount === 1 ? 0 : index / (labelCount - 1);
      return { ratio, label: times[Math.round(ratio * (times.length - 1))] ?? "" };
    });
    const candidates = positions.filter(
      (item, index) =>
        item.label !== "" && (index === 0 || item.label !== positions[index - 1]?.label),
    );

    for (const [index, item] of candidates.entries()) {
      const anchor = index === 0 ? "start" : index === candidates.length - 1 ? "end" : "middle";
      const label = svgEl("text", {
        class: "chart__axis",
        x: item.ratio * plotWidth,
        y: plotHeight + 18,
        "text-anchor": anchor,
      });
      label.textContent = item.label;
      group.append(label);
    }
  }

  svg.append(group);
};

/* --------------------------------------------------------------------------
 * Renderers
 * ------------------------------------------------------------------------ */

/**
 * Render the CPU card.
 *
 * @param {CpuMetrics} cpu - CPU metrics.
 * @returns {void}
 */
export const renderCpu = (cpu) => {
  history.cpu = pushSample(history.cpu, cpu.usagePercent);
  const level = classify(cpu.usagePercent, THRESHOLDS.cpu);

  setText("cpu-model", cpu.model);
  setText("cpu-usage", formatPercent(cpu.usagePercent));
  setText("cpu-cores", `${cpu.physicalCores} / ${cpu.cores}`);
  setText("cpu-clock", `${cpu.speedGhz.toFixed(2)} GHz`);
  setText(
    "cpu-load",
    `${cpu.loadAverage.one.toFixed(2)} / ${cpu.loadAverage.five.toFixed(2)} / ${cpu.loadAverage.fifteen.toFixed(2)}`,
  );
  setBar("cpu-bar", "cpu-bar-fill", cpu.usagePercent, level);
  setBadge("cpu-status", level);
  setTrend("cpu-trend", "cpu-trend-icon", "cpu-trend-value", trend(history.cpu));
  renderSparkline("cpu-spark", history.cpu, "#2f8cff", "spark-cpu");
};

/**
 * Render the memory card.
 *
 * @param {MemoryMetrics} memory - Memory metrics.
 * @returns {void}
 */
export const renderMemory = (memory) => {
  history.memory = pushSample(history.memory, memory.usedPercent);
  const level = classify(memory.usedPercent, THRESHOLDS.memory);

  setText("memory-summary", `${formatBytes(memory.used)} of ${formatBytes(memory.total)}`);
  setText("memory-usage", formatPercent(memory.usedPercent));
  setText("memory-total", formatBytes(memory.total));
  setText("memory-used", formatBytes(memory.used));
  setText("memory-free", formatBytes(memory.free));
  setText(
    "memory-swap",
    memory.swapTotal > 0
      ? `${formatBytes(memory.swapUsed)} / ${formatBytes(memory.swapTotal)}`
      : "None",
  );
  setBar("memory-bar", "memory-bar-fill", memory.usedPercent, level);
  setBadge("memory-status", level);
  setTrend("memory-trend", "memory-trend-icon", "memory-trend-value", trend(history.memory));
  renderSparkline("memory-spark", history.memory, "#ff4f73", "spark-memory");
};

/**
 * Build a list item visualising one filesystem.
 *
 * @param {FilesystemMetrics} fs - Filesystem metrics entry.
 * @returns {HTMLLIElement} The rendered list item.
 */
const diskItem = (fs) => {
  const level = classify(fs.usedPercent, THRESHOLDS.disk);
  const item = document.createElement("li");
  item.className = "disk__item";

  const head = document.createElement("div");
  head.className = "disk__head";

  const mount = document.createElement("span");
  mount.className = "disk__mount";
  mount.textContent = fs.mount;

  const amount = document.createElement("span");
  amount.className = "disk__amount";
  amount.textContent = `${formatBytes(fs.used)} / ${formatBytes(fs.size)}`;

  const percent = document.createElement("span");
  percent.className = "disk__percent";
  percent.textContent = formatPercent(fs.usedPercent);

  head.append(mount, amount, percent);

  const bar = document.createElement("div");
  bar.className = "bar bar--thin";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", `Disk usage for ${fs.mount}`);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", String(Math.round(fs.usedPercent)));

  const fill = document.createElement("span");
  fill.className = level === "normal" ? "bar__fill" : `bar__fill bar__fill--${level}`;
  fill.style.width = `${clamp(fs.usedPercent, 0, 100)}%`;
  bar.append(fill);

  item.append(head, bar);
  return item;
};

/**
 * Render the disk card and its filesystem list.
 *
 * @param {DiskMetrics} disk - Disk metrics.
 * @returns {void}
 */
export const renderDisk = (disk) => {
  const filesystems = disk.filesystems;
  const percent = aggregateDiskPercent(filesystems);
  const level = classify(percent, THRESHOLDS.disk);

  history.disk = pushSample(history.disk, percent);

  setText("disk-summary", `${filesystems.length} filesystem${filesystems.length === 1 ? "" : "s"}`);
  setText("disk-usage", formatPercent(percent));
  setBar("disk-bar", "disk-bar-fill", percent, level);
  setBadge("disk-status", level);

  const list = byId("disk-list");
  if (list) {
    list.replaceChildren(...filesystems.map(diskItem));
  }
};

/**
 * Render the network card and its throughput sparkline.
 *
 * @param {NetworkMetrics} network - Network metrics.
 * @returns {void}
 */
export const renderNetwork = (network) => {
  const interfaces = network.interfaces;
  const active = interfaces.find((entry) => entry.operstate === "up") ?? interfaces[0];
  const throughput = interfaces.reduce((sum, entry) => sum + entry.rxSec + entry.txSec, 0);

  history.network = pushSample(history.network, throughput);

  setText("network-summary", `${interfaces.length} interface${interfaces.length === 1 ? "" : "s"}`);

  if (active) {
    setText("network-iface", active.iface);
    setText("network-rx", formatRate(active.rxSec));
    setText("network-tx", formatRate(active.txSec));
    const isUp = active.operstate === "up";
    const state = byId("network-state");
    if (state) {
      state.textContent = isUp ? "UP" : "DOWN";
      state.dataset.state = isUp ? "up" : "down";
    }
  }

  renderSparkline(
    "network-spark",
    history.network,
    "#9b6cff",
    "spark-network",
    chartCeiling(history.network),
  );
};

/**
 * Render the system card, quick info tiles and header identity.
 *
 * @param {SystemMetrics} system - System metrics.
 * @returns {void}
 */
export const renderSystem = (system) => {
  setText("meta-host", system.hostname);
  setText("meta-os", system.distro);
  setText("status-host", system.hostname);
  setText("system-summary", system.distro);
  setText("system-hostname", system.hostname);
  setText("system-kernel", system.kernel);
  setText("system-platform", system.platform);
  setText("system-uptime", formatUptime(system.uptimeSeconds));
  setText("system-time", formatClock(system.time));
  setText("system-timezone", system.timezone);

  setText("quick-uptime", formatUptime(system.uptimeSeconds));
  setText("quick-platform", system.platform);
  setText("quick-time", formatClock(system.time));
  setText("quick-timezone", system.timezone);

  const serverTime = new Date(system.time).getTime();
  if (Number.isFinite(serverTime)) {
    clockOffsetMs = serverTime - Date.now();
  }
};

/**
 * Render the resource usage chart from the accumulated history.
 *
 * @returns {void}
 */
export const renderResource = () =>
  renderResourceChart(
    [
      { values: history.cpu, color: "#2f8cff", fill: "rgba(47, 140, 255, 0.14)" },
      { values: history.memory, color: "#ff4f73", fill: "rgba(255, 79, 115, 0.14)" },
      { values: history.disk, color: "#20d890", fill: "rgba(32, 216, 144, 0.12)" },
    ],
    history.times,
  );

/**
 * Render the whole dashboard from a metrics payload.
 *
 * @param {MetricsPayload} metrics - The combined metrics payload.
 * @returns {void}
 */
export const render = (metrics) => {
  history.times = pushSample(history.times, formatClockShort(metrics.timestamp));
  renderSystem(metrics.system);
  renderCpu(metrics.cpu);
  renderMemory(metrics.memory);
  renderDisk(metrics.disk);
  renderNetwork(metrics.network);
  renderResource();
  updateClock();
};

/**
 * Update the connection status card and the live pill.
 *
 * @param {"loading" | "ok" | "error"} state - Status state.
 * @param {string} message - Human readable status text for screen readers.
 * @returns {void}
 */
export const setStatus = (state, message) => {
  const connection = byId("connection");
  if (connection) {
    connection.dataset.state = state;
  }
  setText(
    "status-label",
    state === "ok" ? "Connected" : state === "loading" ? "Connecting" : "Disconnected",
  );
  const live = byId("live-label");
  if (live) {
    live.textContent = state === "ok" ? "Live" : "Offline";
  }
  const announcer = byId("announcer");
  if (announcer) {
    announcer.textContent = message;
  }
};

/**
 * Update the header clock using the measured server time offset.
 *
 * @returns {void}
 */
export const updateClock = () => {
  const now = new Date(Date.now() + clockOffsetMs);
  const timeEl = byId("clock-time");
  const dateEl = byId("clock-date");
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    timeEl.setAttribute("datetime", now.toISOString());
  }
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    dateEl.setAttribute("datetime", now.toISOString().slice(0, 10));
  }
};

/**
 * Show only the cards whose text matches the query.
 *
 * @param {string} query - The search term.
 * @returns {void}
 */
export const filterCards = (query) => {
  const term = query.trim().toLowerCase();
  for (const card of document.querySelectorAll(".card")) {
    if (!(card instanceof HTMLElement)) {
      continue;
    }
    card.hidden = term.length > 0 && !(card.textContent ?? "").toLowerCase().includes(term);
  }
};

/**
 * Wire the metric search input and its keyboard shortcut.
 *
 * @returns {void}
 */
const wireSearch = () => {
  const input = byId("metric-search");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  input.addEventListener("input", () => filterCards(input.value));
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      input.focus();
    }
  });
};

/**
 * Fetch the combined metrics payload.
 *
 * @param {Fetcher} [fetcher=fetch] - Injectable fetch implementation.
 * @returns {Promise<MetricsPayload>} The parsed metrics payload.
 */
export const fetchMetrics = async (fetcher = fetch) => {
  const response = await fetcher(METRICS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
};

/**
 * Perform one poll: fetch, render, and update status.
 *
 * @param {Fetcher} [fetcher=fetch] - Injectable fetch implementation.
 * @returns {Promise<void>}
 */
export const poll = async (fetcher = fetch) => {
  try {
    const metrics = await fetchMetrics(fetcher);
    render(metrics);
    setStatus("ok", `Connected. Metrics updated at ${formatClock(metrics.timestamp)}.`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    setStatus("error", `Disconnected. ${detail}`);
  }
};

/**
 * Start the polling loop and the header clock.
 *
 * @param {number} [interval=POLL_INTERVAL_MS] - Poll interval in milliseconds.
 * @returns {() => void} A function that stops both timers.
 */
export const start = (interval = POLL_INTERVAL_MS) => {
  const main = byId("main");
  if (main) {
    main.removeAttribute("aria-busy");
  }
  const greeting = byId("greeting");
  if (greeting) {
    greeting.textContent = greetingFor(new Date().getHours());
  }
  wireSearch();
  updateClock();

  const pollTimer = setInterval(poll, interval);
  const clockTimer = setInterval(updateClock, 1000);
  poll();

  return () => {
    clearInterval(pollTimer);
    clearInterval(clockTimer);
  };
};

if (typeof document !== "undefined") {
  start();
}
