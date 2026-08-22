# NOSMO Nexus — Phase 25 WorkSuite RELEASE_HOLD Compensation

Status: DRAFT CONTROLLED SLICE  
Base: PR #104 / `codex/worksuite-hold-work-slice-e`  
Branch: `codex/worksuite-release-hold-slice-f`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Add the first audited compensating action on top of the #90-native WorkSuite HOLD_WORK slice.

Canonical rule:

```text
HOLD_WORK is never erased or edited.
RELEASE_HOLD is a later canonical event that references the exact source HOLD_WORK.
```

## Canonical action

Action key:

`worksuite:RELEASE_HOLD`

Canonical event type:

`WORKSUITE_ACTION_RELEASE_HOLD_APPLIED`

The release event records:

- exact project/world/object scope;
- human release actor;
- non-empty release reason;
- source HOLD_WORK event ID;
- `supersedesEventId = exact source HOLD_WORK ID`;
- correlation back to the original Change Event chain where available.

The original HOLD_WORK event remains immutable.

## Authority

This slice reuses existing `NexusAccessDecisionRecord` and requires:

- `result = allowed`;
- exact release actor person;
- Project Participation reference;
- exact project/world scope;
- exact action key `worksuite:RELEASE_HOLD`;
- exact canonical object scope;
- authority evaluation no later than Apply.

A release actor may be different from the original hold actor, but must independently pass the canonical access resolver.

## Effective hold state

Compensated projection resolves:

- no HOLD_WORK -> `NONE`;
- latest HOLD_WORK without matching release -> `HELD`;
- latest HOLD_WORK with matching exact RELEASE_HOLD -> `RELEASED`.

Only the latest hold on the object controls effective state.

Example:

```text
HOLD-1
-> RELEASE-1
-> HOLD-2
```

Effective state is:

`HELD by HOLD-2`

A later attempt to release `HOLD-1` cannot release `HOLD-2`.

## Old-hold / newer-hold protection

Before release, Nexus resolves the current effective hold and requires:

```text
effective state = HELD
AND effective sourceHoldEvent.id = requested sourceHoldEventId
```

Otherwise:

`SOURCE_HOLD_NOT_ACTIVE`

The operation fails closed.

## Idempotency

Exact retry:

```text
same source HOLD_WORK
+ same RELEASE_HOLD applicationEventId
-> ALREADY_APPLIED
```

This exact retry is recognized before optimistic revision conflict.

A second release ID for an already compensated source hold fails closed with `APPLICATION_ID_CONFLICT`.

## Optimistic concurrency

`RELEASE_HOLD` participates in the same WorkSuite action revision as `HOLD_WORK`.

Caller supplies `expectedRevision`.

A stale different operation fails with:

`STORE_REVISION_CONFLICT`

## Human decision/audit

Successful compensation produces:

1. `NexusHumanDecisionRecord`
   - `decisionType = WORKSUITE_COMPENSATION:RELEASE_HOLD`;
   - exact source hold reference;
   - release actor and reason.

2. `NexusEventRecord`
   - event type `WORKSUITE_ACTION_RELEASE_HOLD_APPLIED`;
   - exact source hold via `supersedesEventId`;
   - actor, scope, audit and correlation context.

These records are returned for atomic Project Memory persistence. No browser-local compensation store is introduced.

## Runtime contract smoke

Isolated TypeScript runtime smoke covered:

- `HOLD_WORK -> APPLIED`;
- `RELEASE_HOLD -> APPLIED`;
- effective state -> `RELEASED`;
- exact release retry -> `ALREADY_APPLIED`;
- later new HOLD_WORK -> effective state `HELD` by new hold;
- release attempt against old hold -> fail closed with `SOURCE_HOLD_NOT_ACTIVE`.

Result: PASS.

This remains isolated contract evidence. It is not repository-wide CI, durable server persistence, authenticated production identity, real IFC E2E or partner validation.

## Next product work

The next controlled step is atomic Project Memory commit of:

```text
canonical Change Event
+ NexusHumanDecisionRecord
+ WorkSuite action event
```

followed by Timeline/audit projection using the same event IDs.

Do not create a separate BIM/action datastore.

## Protected boundaries

No changes to PR #91, Relationship Tree gesture/layout, Work Wallet, Nexus Cloud, Android Work Mode, DoorFlow, Electrical Commissioning, Person Card UI, web-ifc packaging or FabStation capability claims.

Draft only. No automatic merge.
