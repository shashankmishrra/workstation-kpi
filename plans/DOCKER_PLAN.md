# Workstation KPI — Docker Deployment Plan

**Goal:** package `workstation-kpi` as a Docker image that reports **host**
metrics, not container metrics, so it can be installed and run on any Linux
machine with a single command.

## Why containers show container resources

`systeminformation` reads `/proc`, `/sys`, `/etc` and the network/mount
namespaces. Docker isolates all of those, so inside a container the dashboard
reports the container's overlay disk, its virtual network interface, its
container hostname, and the base-image OS instead of the host's.

## The approach

Run the container with the host network namespace and a read-only bind-mount of
the host root (`/` at `/host`), then add a small `HOST_ROOT`-aware shim to the
two collectors that still read container-local data.

Free wins (already host-accurate inside a container — `/proc/stat`,
`/proc/meminfo`, `/proc/net/dev` are shared with the host):

| Metric | Why it's already host-accurate |
|---|---|
| CPU | `si.cpu()`, `si.currentLoad()` read `/proc/cpuinfo` + `/proc/stat` (host) |
| Memory | `si.mem()` reads `/proc/meminfo` (host) |
| Load average / uptime / kernel | `/proc/loadavg`, `/proc/uptime`, `uname` (host) |
| Network | `--network=host` exposes the host's real interfaces |

Needs a shim (`HOST_ROOT` set):

| Metric | Source of truth when `HOST_ROOT` is set |
|---|---|
| Disk | `${HOST_ROOT}/proc/1/mountinfo` (host PID 1 mount table) + `statfsSync` on `${HOST_ROOT}/<mount>` |
| Hostname | `${HOST_ROOT}/etc/hostname` |
| Distro | `${HOST_ROOT}/etc/os-release` (`PRETTY_NAME`) |
| Kernel | `${HOST_ROOT}/proc/sys/kernel/osrelease` |

## Files to create / modify

### 1. `Dockerfile` (new)

- `FROM oven/bun:1` — official Bun image (Debian-based, ships `df`, `stat`).
- `WORKDIR /app`, copy `package.json` + `bun.lock`, `bun install --frozen-lockfile --production`.
- Copy `src/`, `public/`, `server.ts`.
- `ENV NODE_ENV=production`, `EXPOSE 3000`.
- Non-root `USER bun`, `CMD ["bun", "server.ts"]`.

### 2. `.dockerignore` (new)

Exclude `node_modules`, `.git`, `tests`, `artefacts` for a small build context.

### 3. `src/hostfs.ts` (new helper)

- `HOST_ROOT` from env (empty on bare metal), `hostPath(p)` prefix helper.
- Pure parsers (unit-testable): `parseOsRelease(text)`, `parseMountInfo(text)`
  (mountpoint + fstype + source per `/proc/*/mountinfo`), and a `PSEUDO_FS`
  filter set (proc, sysfs, tmpfs, devpts, devtmpfs, cgroup, overlay, rootfs, ...).

### 4. `src/metrics/disk.ts` — host-aware path

When `HOST_ROOT` is set: read `${HOST_ROOT}/proc/1/mountinfo`, filter pseudo-FS,
then `statfsSync(`${HOST_ROOT}${mount}`)` per real mount → feed the existing
pure `buildDiskMetrics`. Fallback to spawning `df -kP` if `statfsSync` is
unavailable. `buildFilesystem` / `buildDiskMetrics` stay unchanged.

### 5. `src/metrics/system.ts` — host-aware path

When `HOST_ROOT` is set: hostname from `${HOST_ROOT}/etc/hostname`, distro from
`${HOST_ROOT}/etc/os-release`, kernel from `${HOST_ROOT}/proc/sys/kernel/osrelease`.
Uptime / arch / timezone unchanged. Pure `buildSystemMetrics` unchanged.

### 6. `cpu.ts`, `memory.ts`, `network.ts` — no changes

Host `/proc/stat`, `/proc/meminfo`, `/proc/net/dev` are visible by default;
`network_mode: host` guarantees the real NICs.

### 7. `docker-compose.yml` (new) — the "install and run" entry point

```yaml
services:
  workstation-kpi:
    build: .
    image: workstation-kpi:latest
    restart: unless-stopped
    network_mode: host            # real network interfaces
    environment:
      - HOST_ROOT=/host
      - PORT=3000
    volumes:
      - /:/host:ro,rslave         # read-only host root for disk + OS identity
```

No `pid: host`, no `privileged` — only a read-only bind mount, so it stays
low-privilege. SELinux hosts may need `:ro,rslave,z` (note in README).

### 8. `tests/hostfs.test.ts` (new)

Fixture-based tests for `parseOsRelease` and `parseMountInfo` parsing +
filtering, matching the project's "pure transform / impure I/O" convention.
Existing suites must stay green (`bun test`, `bun run typecheck`,
`bun run lint`).

### 9. `README.md` — add a "Run with Docker" section

`docker compose up -d --build`, then `http://localhost:3000`. Explain what's
host-accurate and the read-only mount caveat.

## Verification

- `bun run typecheck`, `bun run lint`, `bun test`.
- `docker build . && docker compose up -d`, then `curl localhost:3000/api/metrics`
  and confirm disk mount names + distro match the host (not `/host/...` overlay
  paths or the container image).

## Out of scope / notes

- `--network=host` means no port mapping is needed; the server binds directly on
  the host at `PORT` (default `3000`).
- This machine currently has no `bun` binary installed (only the install cache),
  so verification may need `mise` or a Bun runtime available first.