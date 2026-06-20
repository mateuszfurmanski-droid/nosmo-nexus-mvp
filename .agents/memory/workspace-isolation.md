---
name: workspace isolation
description: How per-user data isolation is enforced in the NOSMO Nexus API (workspaces, requireWorkspace, IDOR rules).
---

# Per-user workspace isolation

Every domain row (projects, tasks, plans, notes, activity, conversations) carries a NOT NULL `workspaceId`. One workspace per user, enforced by a unique constraint on `workspaces.owner_id`.

**Rule:** every data route must filter by `req.workspaceId`, and any handler reaching a child record via a parent ID (e.g. task→project, comment→task, chat_message→conversation) must verify the *parent* belongs to the workspace before acting. Skipping the parent check is an IDOR leak even when the child table has no `workspaceId`.

**Why:** child tables like `comments` and `chat_messages` have no `workspaceId` of their own — they inherit scope through their parent. The only thing stopping cross-workspace access on those is the explicit parent-ownership lookup in the route.

**How to apply:**
- `requireWorkspace` middleware is mounted in `routes/index.ts` AFTER public health+auth routers and BEFORE all data routers. It 401s unauthenticated requests and sets `req.workspaceId`. Never mount a data router above it.
- `ensureWorkspace(userId)` (find-or-create, seeds starter project) is called inside `upsertUser` in `auth.ts`, so both web callback and mobile token-exchange paths get a workspace on first login. Uses read → insert `onConflictDoNothing(owner_id)` → re-read to survive concurrent first-login races.
- New data tables/routes: add `workspaceId` NOT NULL FK, filter every query by it, and validate parent ownership on any nested write.

# DB push with new NOT NULL columns

Adding NOT NULL `workspaceId` to existing tables requires the tables to be empty first. Truncate orphan domain data (`TRUNCATE chat_messages, conversations, comments, activity, plans, notes, tasks, projects RESTART IDENTITY CASCADE`) BEFORE `pnpm --filter @workspace/db run push`, or the push fails on existing rows.
