# Syspeek — Rebrand Plan

**Goal:** rename the project from `workstation-kpi` to **`syspeek`** across the
entire repo — user-facing branding, package metadata, docs, and code comments —
so the product is consistently identified as **syspeek**.

This is a plan/reference only. Implementation happens separately.

## Naming target

| Context | Today | After |
|---|---|---|
| npm package name (`package.json`) | `workstation-kpi` | `syspeek` |
| Brand / title (UI, README, docs) | `Workstation KPIs` | `Syspeek` |
| Docker image / service name | `workstation-kpi` | `syspeek` |
| Repo name (GitHub origin) | `workstation-kpi` | `syspeek` |
| Local directory | `workstation-kpi/` | `syspeek/` (optional) |

## Files to update

### Package metadata

- `package.json`
  - `name`: `workstation-kpi` → `syspeek`
  - `description`: replace "workstation KPI dashboard" wording
- `bun.lock`
  - Regenerate rather than hand-edit: after changing `package.json`, run
    `bun install --frozen-lockfile` (or `bun install`) so the lockfile entry
    (`"name": "workstation-kpi"`) is rewritten consistently.

### Docs

- `README.md`
  - Title `# Workstation KPIs` → `# Syspeek`
  - Tagline "workstation monitoring dashboard" → syspeek wording
  - `git clone <your-repo-url> workstation-kpi` / `cd workstation-kpi` →
    `syspeek`
  - Project structure tree root `workstation-kpi/` → `syspeek/`
- `DESIGN.md`
  - Title line 1
  - Line 78 product name `Workstation` → `Syspeek`
  - Line 128 page title `Workstation KPIs` → `Syspeek`
- `PLAN.md`
  - Title + body "workstation KPIs" wording
  - Project structure root
- `DOCKER_PLAN.md`
  - Title, goal line, compose service name, `image: workstation-kpi:latest`
    → `syspeek:latest`

### UI / client

- `public/index.html`
  - `<meta name="description" content="Live workstation KPIs: ..." />`
  - `<title>Workstation KPIs</title>`
  - Sidebar product name `<span class="sidebar__name">Workstation</span>`
  - Header `<h1 class="topbar__title">Workstation KPIs</h1>`
- `public/app.js` — file header comment "Workstation KPI dashboard client."
- `public/styles.css` — file header comment "Workstation KPI dashboard styles."

### Server / code comments

- `server.ts:91` — `console.log(\`Workstation KPI dashboard running at ...\`)`
- `src/metrics/{cpu,memory,disk,network,system}.ts` — JSDoc module lines
  "Gather live ... metrics from the workstation." → "from the host." or syspeek
  wording. (These are generic descriptions; decide whether to reword "workstation"
  or leave as-is — see open decisions.)

### Tests

- `tests/system.test.ts:7,21` — `hostname: "workstation"` is a **test fixture**,
  not branding. Recommend leaving unchanged unless the fixture should reflect a
  hostname. (Open decision.)

### Non-file items

- GitHub repository rename (`origin` URL changes to
  `git@github.com:shashankmishrra/syspeek.git`; git updates the remote
  automatically, and the local checkout dir can be renamed).
- Local directory rename `workstation-kpi/` → `syspeek/` (optional; git tracks
  content, so this is purely cosmetic).

## Steps (when implemented)

1. Edit `package.json` (name + description).
2. Regenerate `bun.lock` with `bun install`.
3. Apply text changes to all files listed above.
4. Rename repo on GitHub (and optionally the local directory).
5. Verify: `bun test`, `bun run typecheck`, `bun run lint`.
6. Commit and push.

## Open decisions

- **Directory name**: keep `workstation-kpi/` locally or rename to `syspeek/`?
- **Test fixture** `hostname: "workstation"` in `tests/system.test.ts`: leave as
  a plain fixture or align with branding?
- **JSDoc "workstation" wording** in `src/metrics/*.ts`: reword generically
  ("the host") or keep? These are not user-facing.
- **Repo rename timing**: rename GitHub repo before or after merging the
  current branch?