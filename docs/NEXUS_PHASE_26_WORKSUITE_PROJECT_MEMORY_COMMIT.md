# NOSMO Nexus — Phase 26 WorkSuite Project Memory Commit

Status: DRAFT CONTROLLED SLICE  
Base: PR #105 / `codex/worksuite-release-hold-slice-f`  
Branch: `codex/worksuite-project-memory-commit-slice-g`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Commit one already-authorised WorkSuite action result into the existing #90 Project Memory model without introducing a separate BIM/Action datastore.

This slice joins the records produced by the previous Action Engine slices into one semantic Project Memory update:

```text
source canonical event
+ NexusHumanDecisionRecord
+ canonical WorkSuite NexusEventRecord
+ Timeline projection
-> one Project Memory snapshot result
```

## Canonical identity rule

The WorkSuite action event remains the canonical action-event identity.

The Timeline record has its own Project Memory record ID, but it references:

- `canonicalActionEventId`;
- exact `sourceEventId`;
- human decision ID;
- action event ID.

Timeline therefore projects the existing event rather than creating a second action identity.

## New Timeline type

`NexusTimelineEventType` gains:

`worksuite-action`

This is a data-contract extension only. Relationship Tree gesture/layout code is unchanged.

## Commit contract

Schema:

`nexus-worksuite-project-memory-commit/v1`

Source:

`src/data/workSuiteProjectMemoryCommit.ts`

The commit accepts only an already-applied Nexus-authored WorkSuite action event with a human actor.

It requires:

- source canonical event already present in `memory.nexusEvents`;
- exact source link from action event and human decision;
- exact project/world/object scope match;
- accepted human decision with non-empty reason;
- distinct action/decision/Timeline IDs;
- no cross-collection ID collision.

## Semantic atomicity boundary

The pure function returns either:

- all three new records appended to one new Project Memory snapshot; or
- no mutation to the supplied snapshot.

It never returns a partially updated snapshot.

This is **semantic in-memory atomicity**, not durable database transaction atomicity.

A later server persistence adapter must transactionally persist the same records or fail the transaction.

## Exact retry

When the exact action event, human decision and Timeline projection already exist with the same semantic links:

`ALREADY_COMMITTED`

No duplicate records are created.

## Partial commit rule

If only a subset exists, for example:

```text
action event exists
human decision missing
Timeline missing
```

result:

`PARTIAL_COMMIT_CONFLICT`

Nexus fails closed rather than silently inventing/repairing missing audit history.

## ID conflict rule

The commit rejects:

- action, decision or Timeline IDs equal to each other;
- reuse of source event ID;
- collision with another Project Memory record category;
- cross-collision between audit/Timeline collections;
- existing same IDs with different semantic content.

## Runtime contract smoke

Isolated TypeScript compile/runtime smoke covered:

- first semantic commit -> `COMMITTED`;
- exact retry -> `ALREADY_COMMITTED`;
- partial prior state -> `CONFLICT` with `PARTIAL_COMMIT_CONFLICT`;
- mismatched source references -> `BLOCKED` with `SOURCE_LINK_MISMATCH`.

Result: PASS.

This is isolated contract evidence only. It is not repository-wide CI, persistent DB transaction, authenticated server identity, real IFC, trusted viewer, device or FabStation evidence.

## Current E2E achieved at contract level

The new #90-native product stack can now express:

```text
IFC source intake
-> explicit IFC GlobalId / Nexus Object mapping
-> revision comparison
-> canonical Change Event review
-> authorised HOLD_WORK Apply
-> RELEASE_HOLD compensation
-> human decision + canonical action event
-> Project Memory semantic commit
-> Timeline projection from the same canonical event IDs
```

The remaining real-world gates are external/runtime evidence, not a need for another parallel Object/Change/Action architecture.

## Still open

- representative permitted real IFC file;
- real GlobalId mapping on that file;
- two real IFC revisions;
- trusted viewer comparison;
- real-browser IFC runtime;
- durable transactional server persistence for this WorkSuite commit;
- authenticated production identity/tenant membership;
- Object Card UI wiring to current Project Memory IFC projection;
- SpatialConnector production-safe handoff on the new stack;
- partner-confirmed FabStation capability/PoC;
- Android/Fold IFC smoke;
- web-ifc same-origin production packaging reconciliation.

## Protected boundaries

No changes to PR #91, Spark Object Card design, Relationship Tree gesture/layout engine, Work Wallet, Nexus Cloud/Google Drive, Android Work Mode, DoorFlow, Electrical Commissioning, Person Card UI or FabStation capability claims.

Draft only. No automatic merge.
