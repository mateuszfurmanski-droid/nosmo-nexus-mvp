# NOSMO Nexus — Phase 22 BIM / IFC Revision Comparison

Status: DRAFT CONTROLLED SLICE  
Base: PR #100 / `codex/bim-ifc-local-source-intake-slice-b`  
Branch: `codex/bim-ifc-revision-comparison-slice-c`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Add the smallest cross-revision operational-change intelligence contract on top of the canonical IFC identity and bounded source intake slices.

This is not a clash engine, geometry diff engine, survey validator or operational mutation engine.

## Canonical comparison path

```text
explicit Nexus Object ID <-> IFC GlobalId mapping
+ revision A bounded intake
+ revision B bounded intake
+ same IFCPROJECT lineage
-> compare the same IFC GlobalId
-> NO_CHANGE / HUMAN_REVIEW_REQUIRED / COMPARISON_BLOCKED
```

## Result schema

`nexus-ifc-revision-comparison/v1`

Source:

`src/data/ifcRevisionComparison.ts`

## Fail-closed lineage rules

Comparison is blocked when:

- revision A intake is blocked;
- revision B intake is blocked;
- IFCPROJECT GlobalId is unresolved;
- IFCPROJECT GlobalId differs between the two sources;
- the explicitly mapped GlobalId is missing from the previous/baseline source;
- the explicit mapping belongs to another IFCPROJECT lineage;
- revision labels are missing.

`COMPARISON_BLOCKED` cannot be interpreted as `NO_IMPACT` or accepted as-built state.

## Structural review signals

The current slice can surface bounded changes in:

- IFC schema/source basis;
- entity type;
- name;
- description;
- tag;
- object removal from the current revision.

These signals create `HUMAN_REVIEW_REQUIRED` only.

They do not mutate:

- task state;
- readiness;
- procurement;
- evidence;
- inspection;
- approval/sign-off;
- verified as-built state.

## Diagnostic-only changes

STEP/express ID changes are recorded separately as diagnostic deltas.

```text
same IFC GlobalId
+ changed STEP/express ID
!= identity change
```

Different source SHA-256 values prove different source bytes only. A fingerprint difference alone is not proof of an object-level design change.

Reusing the same revision label with different source fingerprints is surfaced for human review.

## Object removal

When the explicitly mapped GlobalId exists in revision A but is absent from revision B under the same resolved IFCPROJECT lineage:

```text
OBJECT_REMOVED_FROM_CURRENT_REVISION
-> HUMAN_REVIEW_REQUIRED
```

Nexus must not search for the most similar replacement and remap automatically.

## Still out of scope

- geometry/bounding box comparison;
- coordinate matrices and model frames;
- Pset/type/material deep comparison;
- clash detection;
- fabrication tolerance;
- survey validation;
- physical movement claims;
- Change Event persistence;
- WorkSuite Action Engine application;
- SpatialConnector/FabStation hand-off.

## Next slice

The next controlled product slice may translate only a `HUMAN_REVIEW_REQUIRED` comparison result into a bounded Change Event draft/review envelope.

Rules for that slice:

- human review remains mandatory;
- `COMPARISON_BLOCKED` cannot produce `NO_IMPACT` or as-built acceptance;
- no decision is applied merely by creating the Change Event;
- WorkSuite Action Engine remains a separate explicit Apply step;
- one persisted Change Event ID must later be reused by audit/Timeline rather than creating duplicate event identities.

## Validation performed

- isolated TypeScript compilation of `ifcRevisionComparison.ts`: PASS;
- no full repository CI PASS is claimed;
- no real two-revision IFC pair has been supplied, therefore `REAL IFC PASS` and real revision comparison remain `NOT_VALIDATED`.

## Protected boundaries

No changes to PR #91, Relationship Tree gesture/layout, Work Wallet, Nexus Cloud, Android Work Mode, DoorFlow, Electrical Commissioning, Person Card UI, web-ifc packaging or FabStation capability claims.

Draft only. No automatic merge.
