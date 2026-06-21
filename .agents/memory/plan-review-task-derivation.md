---
name: Plan-review task types are keyword-derived
description: How the plan-review "task filter / work-from-plan" workflow decides which doors belong to which task — and the constraint that keeps it working.
---

The `/plan-review` page lets a user pick a *task type* (e.g. "Fire door keep shut", "Install / adjust closer", "Locked / access control") and then works only the matching doors directly on the plan (highlight matches, fade the rest, popover per door with Mark done → green / Report issue → red / Add photo, then "next nearest" same-task door by squared-Euclidean distance on pin x/y).

**Key decision:** there is NO "task" field on a door in the DB or OpenAPI. Task membership is derived **client-side** from the door's free text (`type + status + materials`) via a static keyword-matcher catalog (`TASK_CATALOG`) in `plan-review.tsx`.

**Why:** the user explicitly wanted no schema/OpenAPI change for this investor demo, and the seeded door vocabulary (FD30/FD60, "fire", "intumescent", "closer", "access control", "vision panel", "push bar", "brass ironmongery") supports deterministic keyword matching. Deterministic catalog, not AI inference.

**How to apply:**
- Adding / renaming / removing a task type is a **frontend-only** edit to `TASK_CATALOG`. Do not reach for a backend field.
- Matchers must stay aligned with the actual seeded door text. If a chip shows 0 doors it is filtered out of the toolbar, so a mismatched regex makes a task silently disappear — check the seed vocabulary, not the UI.
- A door can match multiple tasks (intended). Multi-door tasks are what make the "next nearest" suggestion meaningful.
- The "next nearest / all complete" suggestion is gated behind an action on the current door (tracked by `actedDoorId`), and "all complete" means *every* active-task door is green — not merely "no other non-green door remains" (otherwise reporting an issue on the last door wrongly reads as complete).
- Doors themselves remain the one genuinely API-backed flow in this demo (`/api/demo-files/...` + persisted `reviewStatus`/photo); status/photo writes survive refresh.

## Tool-based optimisation layer

The page also carries a tool/route optimisation layer. **Model: a task IS a tool setup** — every door matching a task needs the same `tools` (a field on `TaskDef`, frontend-only like the rest), so a task group is "one run, no tool switching." There is intentionally no cross-task tool-merging; identical toolsets on different tasks stay separate because the required *action* is task-specific.

**Route ordering:** `routeOrder` is a greedy nearest-neighbour walk over the active task's door pin positions, started from the top-left-most door, with a deterministic id tie-break. It is **position-only**, so the numbered order stays stable as statuses change (completing a door doesn't renumber the route). Matching pins show the route number instead of the door code, and an SVG `<polyline>` (viewBox 0..100, `preserveAspectRatio="none"`) draws the path — this maps correctly only because the plan image uses `object-fill` (stretched to the container), so normalised x/y map straight to container %.

**Next suggestion is route-based, not nearest-from-click:** `nextOnRoute(fromId)` advances to the next non-green door *after* the current one in route order, wrapping to the earliest remaining non-green. **Why:** the UI tells the worker to follow the numbered route, so "next on route" is more coherent than recomputing nearest-from-an-arbitrary-clicked-door (and avoids backtracking). If product ever wants literal "nearest from wherever you are," that's a deliberate behaviour change, not a bug.
