# Workstation KPIs - Design Specification

## 1. Design Direction

Build a **dark-mode-only, minimal, modern workstation monitoring dashboard**.

The interface should feel like a premium developer/DevOps product: calm, technical, highly readable, information-dense without feeling crowded, and visually polished.

### Core principles

- Dark mode only
- Minimal visual noise
- Clear information hierarchy
- Fast scanning at a glance
- Strong typography
- Subtle borders and depth instead of heavy shadows
- Bright accent colors only for semantic meaning
- Consistent spacing and alignment
- Responsive layout
- Live monitoring should feel obvious but not distracting

---

## 2. Visual Identity

### Background

Use a very dark navy/blue-black base rather than pure black.

Suggested:
- App background: `#080F1C`
- Sidebar background: `#0A1220`
- Card background: `#101A2A`
- Elevated card: `#121E30`
- Border: `#1D2A3D`
- Primary text: `#F4F7FB`
- Secondary text: `#8FA1B8`
- Muted text: `#61738B`

Avoid large gradients. Use extremely subtle background depth where useful.

### Accent Colors

Use accents semantically:

- CPU: Blue
- Memory: Pink / Red
- Disk: Green
- Network: Purple
- Live / Connected: Green
- Warning: Amber
- Critical: Red

Suggested accent values:
- Blue: `#2F8CFF`
- Pink: `#FF4F73`
- Green: `#20D890`
- Purple: `#9B6CFF`
- Amber: `#FFB547`
- Red: `#FF5C5C`

Do not overuse accent colors. They should guide attention, not decorate every element.

---

## 3. Application Shell

### Sidebar

Fixed left sidebar on desktop.

Approximate width:
- 216px

Structure:

1. Product logo/icon
2. Product name: `Workstation`
3. Subtitle: `KPI Monitor`
4. Navigation
5. Connection status at bottom

Navigation items:

- Dashboard
- System
- Processes
- Disk
- Network
- Logs

Active item:
- Subtle blue-tinted background
- Blue icon
- White/bright text
- Rounded 8-10px corners

Inactive items:
- Muted icon
- Secondary text
- Transparent background

### Connection status

Bottom-left compact status card:

- Green status dot
- `Connected`
- Hostname below

Example:

`Connected`
`ip-172-26-8-115`

The green dot should have a very subtle glow.

---

## 4. Main Header

Top area should be clean and spacious.

Left:

### Page title

`Workstation KPIs`

Below:

`ip-172-26-8-115  •  Ubuntu  •  Live Monitoring`

Right:

- Search metrics input
- Keyboard shortcut hint
- Live status pill
- Current server time
- Date

### Live indicator

Use a green pill:

`● Live`

It should communicate that metrics are actively updating.

Avoid aggressive blinking. A very subtle pulse is acceptable.

---

## 5. KPI Layout

The primary dashboard should show four key resource areas:

1. CPU
2. Memory
3. Disk
4. Network

Desktop layout:

- CPU: large card
- Memory: large card
- Disk: large card
- Network: compact card in right-side column
- System: compact card below Network

The layout should maximize information density while maintaining generous whitespace.

---

# 6. CPU Card

### Header

Icon +:

`CPU`

Subtitle:

`Xeon® Platinum 8175M`

### Main metric

Large:

`72%`

Include a horizontal usage bar.

Below the bar show:

| Metric | Value |
|---|---|
| Cores | 1 / 2 |
| Clock | 2.50 GHz |
| Load (1m) | 2.50 / 2.74 / 1.93 |

### Trend

Small CPU line/area chart.

Chart should communicate recent movement without requiring interaction.

CPU uses blue.

Optional comparison indicator:

`↓ 12%`
`vs last 5m`

---

# 7. Memory Card

### Header

Icon +:

`Memory`

Subtitle:

`3.6 GB of 3.7 GB`

### Main metric

`97%`

Usage bar should visually communicate high utilization.

Below:

| Metric | Value |
|---|---|
| Total | 3.7 GB |
| Used | 3.6 GB |
| Free | 116.1 MB |
| Swap | None |

Trend chart uses pink/red.

Optional comparison:

`↑ 3%`
`vs last 5m`

Because memory is at 97%, this card should feel like the primary warning state without making the whole UI alarming.

---

# 8. Disk Card

### Header

Icon +:

`Disk`

Subtitle:

`4 filesystems`

### Main metric

`9%`

Show overall usage bar.

Then show each filesystem:

### `/`
`7.2 GB / 76.4 GB`
`9%`

### `/sys/firmware/efi/efivars`
`4.0 KB / 128.0 KB`
`3%`

### `/boot`
`182.1 MB / 880.4 MB`
`22%`

### `/boot/efi`
`6.1 MB / 104.3 MB`
`6%`

Each filesystem gets:

- Label
- Usage numbers
- Percentage
- Thin progress bar

Disk uses green.

---

# 9. Network Card

Compact card.

Header:

`Network`

Subtitle:

`1 interface`

Interface:

`ens5`

Status pill:

`UP`

Show two metrics:

### Download

`↓ 23.5 KB/s`

### Upload

`↑ 66.4 KB/s`

Use:

- Blue for download
- Purple for upload

Include a small network activity line chart.

---

# 10. System Card

Compact information card.

Header:

`System`

Subtitle:

`Ubuntu`

Show a two-column information grid:

| Property | Value |
|---|---|
| Hostname | ip-172-26-8-115 |
| Kernel | 7.0.0-1012-aws |
| Uptime | 17h 50m 35s |
| Platform | linux |
| Server Time | 3:01:14 PM |
| Timezone | UTC |

Use monospace styling for technical values where appropriate.

---

# 11. Resource Usage Chart

Large card below the primary KPI area.

Title:

`Resource Usage`

Subtitle:

`Live resource usage (last 5 minutes)`

Legend:

- CPU
- Memory
- Disk

Chart requirements:

- Dark chart background matching card
- Very subtle grid
- Percentage Y axis
- Time-based X axis
- Smooth but not overly stylized lines
- Optional translucent area fill
- Real-time updates

Chart should immediately communicate:

- Memory is consistently high
- CPU fluctuates
- Disk remains low/stable

Do not use excessive animation.

---

# 12. Quick Info Card

Right of the resource chart on desktop.

Title:

`Quick Info`

Subtitle:

`Key metrics at a glance`

Four compact tiles:

1. Uptime
2. Platform
3. Server Time
4. Timezone

Each tile includes:

- Small icon
- Label
- Strong value

Use a 2 × 2 grid.

---

# 13. Footer

Bottom-left:

`Sampling every 3s • Built with Bun`

Bottom-right:

`Keep building 🚀`

Use muted text.

The footer should remain visually quiet.

---

# 14. Typography

Recommended font:

- Inter
- Geist
- SF Pro style fallback

Technical values may use:

- JetBrains Mono
- Geist Mono

Typography hierarchy:

### H1
- 30-36px
- 700 weight

### Card title
- 16-18px
- 600 weight

### Primary KPI
- 42-56px
- 700 weight

### Secondary values
- 13-15px

### Labels
- 11-13px
- Medium
- Muted

Avoid excessive uppercase text.

---

# 15. Cards

Cards should use:

- 12-16px border radius
- 1px subtle border
- Minimal shadow
- Consistent padding
- Clear internal hierarchy

Suggested:

`border: 1px solid #1D2A3D`

Avoid overly rounded "mobile app" cards.

The dashboard should feel like a serious engineering tool.

---

# 16. Spacing

Use a consistent spacing system based on 4px:

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px

Primary dashboard padding:

- Desktop: 24-32px
- Tablet: 20px
- Mobile: 16px

Card gaps:

- 12-16px

---

# 17. Responsive Behavior

### Desktop

Sidebar remains visible.

Use the full dashboard composition.

Recommended minimum desktop width:
`1200px`

### Tablet

Sidebar may collapse into an icon rail.

KPI cards should become:

- 2 columns
- Then single column if needed

### Mobile

Use a top navigation or collapsible navigation.

Cards become one column.

Prioritize:

1. CPU
2. Memory
3. Disk
4. Network
5. System
6. Resource chart
7. Quick info

The most important metric should remain visible without excessive scrolling.

---

# 18. Status Semantics

Resource thresholds should drive semantic presentation.

### CPU

- 0-60%: Normal
- 60-80%: Elevated
- 80-90%: Warning
- 90%+: Critical

### Memory

- 0-70%: Normal
- 70-85%: Elevated
- 85-95%: Warning
- 95%+: Critical

### Disk

- 0-70%: Normal
- 70-85%: Elevated
- 85-95%: Warning
- 95%+: Critical

Do not change the entire card background based on state. Prefer subtle indicators, accent changes, or badges.

---

# 19. Interaction Design

The dashboard is primarily an observation interface.

Interactions should be lightweight:

- Hover cards for additional context
- Hover chart points for exact values
- Click KPI card to open detailed resource view
- Search metrics with keyboard shortcut
- Navigation between monitoring sections
- Copy hostname / IP / technical values where useful

Avoid modal-heavy workflows.

---

# 20. Motion

Motion should be subtle and purposeful.

Use:

- 150-250ms transitions
- Smooth progress-bar changes
- Very subtle live indicator pulse
- Chart updates without full redraw flicker
- Navigation hover transitions

Avoid:

- Large entrance animations
- Bouncing cards
- Excessive glowing effects
- Constant chart animation

The product should feel fast.

---

# 21. Accessibility

Requirements:

- WCAG-conscious contrast
- Never rely on color alone to communicate status
- Keyboard navigation
- Visible focus states
- Semantic HTML
- Accessible chart labels
- Minimum 44px interactive touch targets on mobile
---

# 23. Final Design Goal

The final result should look like a **premium developer infrastructure dashboard**, not a generic admin panel.

The visual hierarchy should answer these questions within 2-3 seconds:

1. Is the machine healthy?
2. What resource is under pressure?
3. How much CPU is being used?
4. How much memory is available?
5. Is disk usage safe?
6. Is the network connected?
7. How long has the machine been running?

The most important current observation from the reference state is that **memory usage is critically high at 97%**, while CPU is elevated at 72% and disk usage is low at 9%.

Keep the interface minimal, technical, elegant, and dark.