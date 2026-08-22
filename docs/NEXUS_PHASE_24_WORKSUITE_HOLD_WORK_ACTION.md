# NOSMO Nexus — Phase 24 WorkSuite HOLD_WORK Action

Status: DRAFT CONTROLLED SLICE  
Base: PR #103 / `codex/bim-ifc-change-event-review-slice-d`  
Branch: `codex/worksuite-hold-work-slice-e`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Port one narrow executable WorkSuite Action Engine path into the current #90 Project Memory contracts without bulk-porting historical PR #43.

The selected first action is:

`HOLD_WORK`

because it exercises the required authority, explicit Apply, optimistic concurrency, idempotency and later compensation semantics while remaining Nexus-local.

## Canonical path

```text
persisted canonical IFC Change Event
-> human review
-> existing NexusAccessDecisionRecord = allowed
-> exact project/world/object/action scope
-> explicit Apply
-> optimistic action revision check
-> NexusHumanDecisionRecord
-> canonical NexusEventRecord for HOLD_WORK application
-> effective hold state
```

No BIM/model mutation occurs.

## Authority reuse

This slice does not create another role resolver.

It consumes the existing #90 `NexusAccessDecisionRecord` and requires:

- `result = allowed`;
- exact `personId` matching the human reviewer;
- `participationId` present;
- exact project/world match;
- exact action key `worksuite:HOLD_WORK`;
- exact canonical object scope;
- authority evaluation timestamp not later than Apply.

The canonical access resolver remains responsible for Project Participation / grant / deny evaluation.

Profession/qualification is not read by this Action Engine slice and cannot grant authority.

## Explicit Apply

`explicitApply=true` is mandatory.

Creating/persisting the Change Event review record is not an action application.

A non-empty human reason is required.

## Optimistic concurrency

The WorkSuite action revision is derived from canonical applied `WORKSUITE_ACTION_*` events for the exact project/world.

Caller supplies `expectedRevision`.

Mismatch fails with:

`STORE_REVISION_CONFLICT`

## Idempotency

Exact retry behavior:

```text
same Change Event
+ same HOLD_WORK action
+ same applicationEventId
-> ALREADY_APPLIED
```

The exact retry is recognized before the optimistic revision conflict is evaluated, so a network/retry path can remain idempotent.

Conflict behavior:

```text
same Change Event/HOLD_WORK
+ different applicationEventId
-> APPLICATION_ID_CONFLICT
```

Reusing an application event ID for another canonical event also fails closed.

## Canonical records

Successful Apply produces:

1. `NexusHumanDecisionRecord`
   - `decisionType = IFC_OPERATIONAL_CHANGE:HOLD_WORK`;
   - human reviewer and reason;
   - proposal reference to canonical Change Event.

2. `NexusEventRecord`
   - `eventType = WORKSUITE_ACTION_HOLD_WORK_APPLIED`;
   - canonical project/world/object scope;
   - actor is the human reviewer;
   - source/correlation reference is the canonical Change Event ID;
   - `eventState = APPLIED`.

These are returned for atomic Project Memory persistence. This slice does not introduce a browser-local action store.

## Effective state

Current projection:

- no applied HOLD_WORK event -> `NONE`;
- latest applied HOLD_WORK event -> `HELD`.

`RELEASE_HOLD` is intentionally not implemented in this slice. It is the next compensating-action slice.

## Runtime contract smoke

An isolated TypeScript runtime smoke was executed for the action contract and covered:

- valid first Apply -> `APPLIED`;
- exact retry with stale expected revision -> `ALREADY_APPLIED`;
- a different action against stale revision -> `CONFLICT`;
- denied authority -> `DENIED`;
- effective state after Apply -> `HELD`.

Result: PASS.

This is isolated contract/runtime evidence only. It is not repository-wide CI, real IFC, authenticated production identity or server persistence PASS.

## Still open

- atomic durable Project Memory persistence of human decision + action event;
- authenticated server-side identity;
- live tenant/project membership;
- `RELEASE_HOLD` compensation;
- Timeline projection;
- real-browser interaction;
- real IFC E2E;
- Android/Fold smoke;
- FabStation hand-off.

## Protected boundaries

No changes to PR #91, Relationship Tree gesture/layout, Work Wallet, Nexus Cloud, Android Work Mode, DoorFlow, Electrical Commissioning, Person Card UI, web-ifc packaging or FabStation capability claims.

Draft only. No automatic merge.
