# Workstation KPI Dashboard — Implementation Plan

A super simple, no-framework website (HTML/CSS/JS) served by Bun that shows
live workstation KPIs (CPU, memory, disk, network, system).

## Goals

- Minimal, clear, highly testable code.
- Minimal project structure (simple, yet scalable).
- Proper JS documentation (JSDoc on every exported function).
- Semantic + accessible HTML.
- BEM CSS architecture.
- Functional-programming JS (pure functions, no classes, no mutation).
- Tests use Bun's built-in test runner.
- Biome for linting and formatting.
- Validated with `agent-browser`.

## Project Structure

```
workstation-kpi/
├── package.json
├── biome.json              # Linter + formatter config
├── server.ts               # Bun HTTP server (API + static file serving)
├── src/
│   ├── metrics/
│   │   ├── cpu.ts          # CPU usage, cores, load avg
│   │   ├── memory.ts       # RAM, swap
│   │   ├── disk.ts         # Filesystem usage
│   │   ├── network.ts      # Interfaces, bytes/sec
│   │   └── system.ts       # OS info, hostname, uptime
│   ├── format.ts           # Pure formatting helpers (bytes, uptime, percent)
│   └── api.ts              # Route handler, composes all metrics
├── public/
│   ├── index.html          # Semantic HTML, ARIA labels
│   ├── styles.css          # BEM architecture
│   └── app.js              # Functional JS (pure functions, polling)
└── tests/
    ├── format.test.ts
    ├── cpu.test.ts
    ├── memory.test.ts
    ├── disk.test.ts
    ├── network.test.ts
    └── system.test.ts
```

## KPIs to Display

| Category | Metrics |
|---|---|
| **CPU** | Usage % (aggregate), Core count, Load avg (1/5/15m), Architecture |
| **Memory** | Total, Used, Free, Usage %, Swap usage |
| **Disk** | Per-mount: size, used, available, usage % |
| **Network** | Per-interface: rx/tx bytes/sec, operstate |
| **System** | Hostname, OS/platform, Kernel, Uptime, Current time |

## Technical Decisions

- **Backend:** Bun HTTP server, single `/api/metrics` endpoint via `Bun.serve`.
- **Metrics library:** `systeminformation` (Bun-compatible, zero deps) for real-time
  CPU %, disk I/O, and network rates that `node:os` cannot provide directly.
- **Frontend:** Plain ES module JS. `fetch` polls `/api/metrics` every 3 seconds.
- **CSS:** BEM naming (`dashboard__card`, `metric__value--warning`), custom properties.
- **JS:** Pure functions only: `fetchMetrics()`, `renderCpu(data)`,
  `formatBytes(n)`, `formatUptime(s)`.
- **Tests:** `bun test` — unit tests for pure transformation/formatting function
  plus metric shape validation.
- **Lint/format:** Biome.

## Config Choices

- Port: **3000**
- Poll interval: **3 seconds**
- No build step; server serves `public/` directly.

## Scripts

- `bun run dev` — start server with watch
- `bun test` — run tests
- `bun run lint` — Biome check
- `bun run format` — Biome format --write
