# e-SAFE Core Work Cycle

This branch adds the first canonical non-BIM Nexus work cycle on top of PR #90 Project Memory.

## Scope

`Task -> Evidence -> Human Approval -> Timeline / Project Memory`

The implementation reuses the existing canonical Task, Evidence, Approval, Timeline, Person, Project Participation, PermissionGrant and AccessDecision records. It does not add a second workflow engine, Project Memory store, Person model, Object model, Work Package store or UI renderer.

## e-SAFE fixture

Project: `project-esafe-catania`

World: `world-esafe-catania`

Task: `task-esafe-demo-review-survey`

Actor: `person-esafe-demo-manager`

The operational task and authority records are explicitly `SYNTHETIC_DEMO`; the underlying source-backed CORDIS / Zenodo project records retain their existing provenance.

## Authority

Every durable mutation re-checks at commit time:

1. active canonical Person;
2. exactly one active Project Participation in the exact workspace/project/world scope;
3. the current exact `AccessDecision` for module `worksuite`, action and optional object scope;
4. a matching active explicit allow `PermissionGrant` referenced by that Participation;
5. no matching active explicit deny grant.

An explicit deny wins. An ambiguous active Participation or same-time latest AccessDecision fails closed. Role/trade labels are not treated as mutation authority.

## Actions

- `worksuite.task.start`
- `worksuite.evidence.add`
- `worksuite.approval.request`
- `worksuite.approval.decide`

## State path

Happy path:

`todo -> in-progress -> ready-for-review -> done`

Evidence becomes `captured`, then `reviewed` after approval.

A rejected approval moves the task to `blocked` and the reviewed evidence set to `rejected`.

Each operation creates a canonical Timeline event using existing event types.

## Durable idempotency and transaction boundary

`persistNexusCoreWorkCommit(...)` writes Task/Evidence/Approval/Timeline effects in one PostgreSQL transaction.

The caller-supplied Timeline event ID remains the durable idempotency key. The Timeline persistence row now also stores a SHA-256 `commit_fingerprint` covering the full canonical commit input (scope, actor, Participation, AccessDecision, action, Task, Evidence, Approval and Timeline semantics). `persistedAtIso` is execution metadata and is deliberately excluded from the fingerprint.

Therefore:

- an exact retry returns `ALREADY_COMMITTED` and does not duplicate rows;
- reuse of the same Timeline ID with different commit semantics fails with `NEXUS_CORE_WORK_DB_IDEMPOTENCY_CONFLICT`;
- a failed transaction creates no partial Task/Evidence/Approval/Timeline state;
- legacy pre-versioned Timeline rows, if encountered, are preserved but receive a `legacy:` marker and fail closed for exact-retry claims because their original complete commit input cannot be reconstructed safely.

Task, Evidence and Approval updates support expected-state compare-and-set predicates so concurrent state changes cannot silently overwrite a newer canonical state when the caller supplies the expected state.

## Repository migration truth

The canonical repository migration set is ordered and committed under `lib/db/migrations/`:

1. `0000_pr90_parent_baseline` — known PR #90 database baseline;
2. `0001_core_identity_access` — shared canonical Person/identity/access persistence;
3. `0002_core_work_cycle` — Task/Evidence/Approval/Timeline persistence plus durable commit fingerprint;
4. `0003_core_identity_claims` — ordered migration for the already-existing non-production one-time identity-claim contract used by the real-device staging child line.

`pnpm run db:migrate` applies migrations serially under a PostgreSQL advisory lock and records SHA-256 checksums in `nexus_schema_migrations`. A checksum mismatch fails closed. Re-running an already-applied migration set performs no schema mutation.

Remote database migration is refused unless `NEXUS_DEV_MIGRATION_APPROVAL` equals the exact approval phrase required by orchestration. Production environment signals are always rejected. The normal core path no longer exposes a `push-force` package script.

No migration in this branch performs a destructive reset.

## Database validation truth

The repository defines a dedicated `NEXUS Core Database E2E` workflow using disposable PostgreSQL 16. It is distinct from the pure in-memory e-SAFE smoke and from web/typecheck validation.

The database workflow is required to prove:

- clean migration from an empty database;
- idempotent migration replay/checksum ledger;
- upgrade from the committed PR #90 parent baseline while preserving a legacy sentinel row;
- actual Drizzle/PostgreSQL Task -> Evidence -> Approval -> Timeline writes;
- approved and rejected cycles;
- snapshot readback;
- exact retry and conflicting retry;
- wrong-world fail-closed behavior;
- ambiguous Participation fail-closed behavior;
- latest-decision deny and explicit-deny precedence;
- FK enforcement;
- rollback after a deliberately late FK failure;
- no partial rows after failure;
- remote migration safety gate.

The presence of this workflow is not itself a `DATABASE TEST PASS`; only a successful run on the exact tested head is evidence for that claim.

## CI claim separation

- `pnpm run smoke:esafe-core` is a synthetic/in-memory domain smoke, not a database E2E.
- `Validate and Build` Actions success is not automatically a database pass.
- Vercel/provider status is reported separately from GitHub Actions.
- A temporary Neon branch test is not parent DEV verification.
- Parent DEV is not treated as migrated until the approved migration is actually applied and independently verified.

## Current remote database truth

The known non-production Neon project is `nosmo-nexus-mvp-dev`, but this branch does not apply its new repository migrations to the parent DEV database.

No production database mutation is authorised or performed by this workstream.

## Protected surfaces

Unchanged by this core/database work:

- PR #91;
- accepted Relationship Tree renderer/gestures/layout;
- accepted Object Card UI;
- Person Card UI;
- Android UI / Work Mode UI;
- Work Wallet UI/runtime;
- DoorFlow;
- Electrical;
- BIM/FabStation;
- production infrastructure and production database.

## Deliberately not claimed by repository source alone

- `DATABASE TEST PASS` until the disposable PostgreSQL workflow succeeds on the exact head;
- parent DEV migration applied or parent DEV verified;
- deployed production persistence;
- public WorkSuite UI;
- current Relationship Tree -> WorkSuite API wiring on this PR;
- live Drive evidence upload;
- physical-device execution.
