# NOSMO Nexus — Phase 23 BIM / IFC Change Event Review

Status: DRAFT CONTROLLED SLICE  
Base: PR #101 / `codex/bim-ifc-revision-comparison-slice-c`  
Branch: `codex/bim-ifc-change-event-review-slice-d`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Reconcile the historical BIM Change Control concept into the current #90 Project Memory foundation without creating a second Change Event store or applying operational mutations.

## Canonical event decision

Historical PR #39 used a BIM-local `NexusChangeEvent` plus browser-local persistence.

This slice does not port that persistence model.

Instead:

```text
eligible IFC revision comparison
-> nexus-ifc-change-review/v1 projection
-> existing NexusEventRecord draft
-> human review
-> later WorkSuite Action Engine explicit Apply
```

The `NexusEventRecord.id` is the canonical event identity that must later be reused by persistence, audit and Timeline projection.

## Eligibility

`NO_CHANGE` structural comparison does not create a Change Event by default.

`HUMAN_REVIEW_REQUIRED` creates an eligible canonical event draft.

`COMPARISON_BLOCKED` can create a source-review event, but prohibited shortcuts remain prohibited.

## Primary human review decisions

Canonical review vocabulary is preserved:

- `NO_IMPACT`;
- `RE_PLAN_TASK`;
- `HOLD_WORK`;
- `RAISE_RFI`;
- `UPDATE_PROCUREMENT`;
- `NEW_EVIDENCE_REQUIRED`;
- `RE_INSPECTION_REQUIRED`;
- `ACCEPT_AS_BUILT_DIFFERENCE`.

`RELEASE_HOLD` is not a primary review decision. It remains a later compensating action against an exact applied `HOLD_WORK` event.

## Current execution truth

This slice is review-only.

The six historical Action Engine donor decisions that were executable in PR #43 are labelled:

`REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED`

They are not executed by this branch.

`UPDATE_PROCUREMENT` remains:

`BLOCKED_PENDING_AUTHORISED_PROCUREMENT_CONTRACT`

`ACCEPT_AS_BUILT_DIFFERENCE` remains:

`BLOCKED_PENDING_HIGH_AUTHORITY_SIGNOFF`

The latter is not enabled merely because the structural comparison is valid.

## Comparison-blocked rule

When source comparison is `COMPARISON_BLOCKED`:

- `NO_IMPACT` is unavailable;
- `ACCEPT_AS_BUILT_DIFFERENCE` is unavailable;
- source/lineage review remains mandatory;
- operationally conservative choices such as hold/RFI may be reviewed later through the canonical authority path, but no action is applied in this slice.

## Authority boundary

The Change Event draft does not prove actor authority.

Future decision/application must resolve:

```text
Person Card
-> active Project Participation
-> project function
-> trade/work-package scope
-> explicit denies
-> identity assurance
-> WorkSuite Action Engine permission
-> explicit Apply
```

Profession/qualification alone remains insufficient.

## Canonical event fields

The event draft uses existing `NexusEventRecord` and carries bounded context only:

- canonical Nexus Object ID;
- project/world scope from the explicit mapping where available;
- previous/current revision labels;
- source file references;
- revision comparison state;
- human-review requirement;
- correlation key.

It does not carry raw IFC, meshes, geometry arrays or full Psets.

## Next slice

The next controlled slice is the authority-safe WorkSuite decision/apply bridge for one narrow executable path, preferably:

```text
HUMAN_REVIEW_REQUIRED
-> canonical Change Event
-> authorised human chooses HOLD_WORK or RAISE_RFI
-> Project Participation permission result
-> optimistic concurrency
-> explicit Apply
-> audit
```

Do not port the entire browser-local #43 stack wholesale. Reconcile only the permission/concurrency/idempotency/compensation semantics needed against #90 access and Project Memory contracts.

## Validation performed

- isolated TypeScript compilation of `ifcChangeEventReview.ts`: PASS;
- no repository-wide CI PASS claimed;
- no real IFC or real two-revision execution evidence claimed;
- no WorkSuite action execution claimed.

## Protected boundaries

No changes to PR #91, Relationship Tree gesture/layout, Work Wallet, Nexus Cloud, Android Work Mode, DoorFlow, Electrical Commissioning, Person Card UI, web-ifc packaging or FabStation capability claims.

Draft only. No automatic merge.
