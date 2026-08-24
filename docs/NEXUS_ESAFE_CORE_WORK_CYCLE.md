# e-SAFE Core Work Cycle

This branch adds the first canonical non-BIM Nexus work cycle on top of PR #90 Project Memory.

## Scope

`Task -> Evidence -> Human Approval -> Timeline / Project Memory`

The implementation reuses the existing canonical Task, Evidence, Approval, Timeline, Person, Project Participation, PermissionGrant and AccessDecision records. It does not add a second workflow engine, Project Memory store, Person model, Object model or UI renderer.

## e-SAFE fixture

Project: `project-esafe-catania`

World: `world-esafe-catania`

Task: `task-esafe-demo-review-survey`

Actor: `person-esafe-demo-manager`

The operational task and authority records are explicitly `SYNTHETIC_DEMO`; the underlying source-backed CORDIS / Zenodo project records retain their existing provenance.

## Authority

Every mutation requires:

1. active canonical Person;
2. exactly one active Project Participation in the task project/world;
3. exact allowed `AccessDecision` for module `worksuite` and the requested action;
4. matching explicit allow `PermissionGrant` referenced by that Participation;
5. no matching explicit deny grant.

An explicit deny wins. Role/trade labels are not treated as mutation authority.

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

## Idempotency and fail-closed behavior

Caller-supplied Evidence / Approval / Timeline IDs are checked before mutation. Exact retries return `ALREADY_APPLIED`. Reused IDs with different semantics return `CONFLICT`. Invalid access, project/world scope or task state returns `BLOCKED` with the original Project Memory unchanged.

## Validation

`pnpm run typecheck:esafe-core`

`pnpm run smoke:esafe-core`

The smoke exercises the complete e-SAFE task cycle, exact retries, explicit-deny precedence and wrong-world fail-closed behavior.

## Deliberately not claimed yet

- durable PostgreSQL transaction;
- public WorkSuite UI;
- current Relationship Tree -> WorkSuite API wiring;
- live Google Drive evidence upload;
- BIM / IFC dependency;
- production user identity / permissions.

The next integration slice should persist these canonical mutations through the existing Nexus runtime / development Postgres boundary and then expose them to the accepted current Relationship Tree without redesigning the tree.