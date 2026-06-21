---
name: Task execution gate state machine
description: How the NOSMO task lifecycle (stage/status/tier) stays consistent and bypass-free in the node workspace
---

# Task execution gate

The interactive workspace gates every task through a single lifecycle: `unassigned → assigned (supply check) → ordering (draft Screwfix order) → ready → active → done`. The authoritative state is `stage`; task `status` (todo/in-progress/done) and `tier` (now/next/later) are derived/kept in lockstep by the transition helpers.

**Rule:** there must be exactly ONE path that advances a task — the gate ActionCard on the task center. Any other surface that could mutate task status (e.g. the two-person collaboration "Update" button) must refocus to the task and let the gate drive it, NOT flip status directly.

**Why:** an earlier version let the collab "Update" button move todo→in-progress→done directly, bypassing the supply-check gate; and `completeTask` only set status=done without updating stage/tier, so a finished task still rendered an ACTIVE chip and stayed NOW/primary-focus. Both were caught in architect review.

**How to apply:**
- Every transition helper that changes status must also set `stage` and `tier` together (e.g. setting active ⇒ in-progress + tier now + demote other now tasks; completing ⇒ done stage + status done + tier later).
- `setTaskActive` early-returns unless `stage === "ready"` — keep that guard; only the "ready" branch renders the "Set active" button.
- `seedStage` derives the initial stage from assignment + status (done→done, in-progress→active, assigned→assigned, no people→unassigned); explicit `taskStage`/`taskTier` overrides win.
- Reporter/assignee for live-assigned tasks must come from `peopleForTask(taskId)` (honours session `taskAssignee`), not static `TASK_LINKS`/`taskWorker`, or freshly-assigned workers show as the manager.
