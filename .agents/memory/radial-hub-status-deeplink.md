---
name: Radial hub status deep-link contract
description: The RadialHub Projects ring and the Projects page share a status query-param contract that must stay in sync.
---

The RadialHub's Projects status ring deep-links to `/projects?status=<Status>` and the Projects page reads that param.

**Rule:** the status values emitted by the hub's project status nodes must exactly match the status category names the Projects page allowlists (it validates `?status=` against its CATEGORIES list and falls back to the default group on a miss). Use URL-encoded values for multi-word statuses (e.g. `On%20Hold`).

**Why:** these live in two different files (the hub component and the projects page). Renaming or adding a status group in one place silently breaks the hub deep-link — the bubble just won't select and it falls back to the default group, with no error.

**How to apply:** when changing project status names/groups, update both the hub's project status node list and the Projects page CATEGORIES together, and keep the encoding consistent.
