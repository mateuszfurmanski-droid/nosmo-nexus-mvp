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
