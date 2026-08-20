# NOSMO Nexus — Phase 10 PKG-005 Readiness Contract Preparation

Status: CONTRACT_PREPARED / CODE_GATED  
Branch: `codex/nexus-mvp-modular-foundation`  
PR: `#90`

## Authority

This Phase 10 preparation is derived from:

- `mateuszfurmanski-droid/nosmo-nexus/PROJECT_CONTROL.md`;
- `docs/NEXUS_BUILD_CONTROL/packages/PKG_005_READINESS_CONFIDENCE_AND_HUMAN_DECISION_CONTRACT.md`;
- PKG-001 canonical object contract;
- PKG-002 timeline/provenance/audit contract;
- the Phase 8 and Phase 9 Project Memory foundation in PR #90.

PKG-005 is currently `SPEC_READY / CODE_BLOCKED_BY_SPARK_CHECKPOINT`.

Therefore this Phase 10 file prepares the exact product contract and acceptance boundary, but does not add readiness runtime, UI, Spark integration, backend authorization, RFI sending, procurement automation or DoorFlow/BIM processing.

## Product purpose

Nexus needs one reusable readiness model that can answer:

- Is this project, area, task, work package or installation object ready?
- Which requirements are satisfied, missing, uncertain or unavailable?
- What evidence and source-of-record references support the result?
- Is a failure blocking, warning-only, informational or safety-critical?
- How confident and fresh is the result?
- Did an authorised human accept, reject, defer or override it?
- Was work continued under Reality Mode despite known uncertainty?

A percentage alone is never sufficient. A high numerical score cannot hide a safety-critical failure.

## Future data contract to add after the gate

### ReadinessAssessment

Required fields:

- `id`
- `subjectObjectId`
- `projectId`
- `worldId`
- `assessmentType`: `PROJECT | WORK_PACKAGE | AREA | TASK | INSTALLATION_OBJECT | PROCESS`
- `templateId`
- `status`: `NOT_ASSESSED | ASSESSING | READY | READY_WITH_WARNING | BLOCKED | UNKNOWN | REALITY_MODE`
- `overallScore?`: `0..100`
- `overallConfidence?`: `0..100`
- `sourceFreshness`
- `assessedAt`
- `assessedBy`
- `supersedesAssessmentId?`
- normal Nexus audit/provenance fields

### ReadinessRequirement

Required fields:

- `id`
- `assessmentId`
- `requirementType`
- `name`
- `mandatory`
- `safetyCritical`
- `sourcePreference`
- `expectedState`
- `currentState`
- `result`: `PASS | WARNING | FAIL | NOT_APPLICABLE | UNKNOWN | SOURCE_UNAVAILABLE`
- `scoreWeight`
- `confidence`
- `sourceReference?`
- `evidenceObjectIds[]`
- `responsibleObjectId?`
- `dueAt?`
- `blockingRule`

Requirement categories may include documents, revisions, materials, tools, hired equipment, labour, competence, induction, RAMS, permits, access, preceding work, logistics, approvals and inspections.

### ReadinessFinding

Required fields:

- `id`
- `assessmentId`
- `requirementId?`
- `findingType`
- `severity`: `INFO | WARNING | BLOCKING | SAFETY_CRITICAL`
- `description`
- `affectedObjectIds[]`
- `sourceReference?`
- `confidence`
- `proposedAction`
- `clarificationRequired`
- `rfiCandidate`
- `createdAt`
- `resolvedAt?`
- `resolutionEventId?`

### RealityModeDecision

Required fields:

- `id`
- `assessmentId`
- `affectedRequirementIds[]`
- `decision`: `CONTINUE | HOLD | REQUEST_CLARIFICATION | GENERATE_RFI_DRAFT | MARK_FOR_REVIEW | IGNORE_AS_NOT_APPLICABLE`
- `reason`
- `authorisedByPersonId`
- `authorisedAt`
- `expiresAt?`
- `evidenceObjectIds[]`
- `acceptedRiskSummary`

Reality Mode never edits or overwrites an external source-of-record status. It creates a Nexus human-decision record with provenance and audit history.

## Policy rules

1. `UNKNOWN` is never treated as `PASS`.
2. `SOURCE_UNAVAILABLE` is never silently converted to `PASS`.
3. A safety-critical missing or unverifiable requirement fails closed unless an explicitly authorised human decision records a permitted Reality Mode continuation.
4. Non-critical uncertainty may become `READY_WITH_WARNING` only when project policy allows it.
5. AI may analyse, compare, score, highlight, propose actions and generate drafts.
6. AI may not make contractual approvals or send an RFI without explicit human authority.
7. A Reality Mode continuation must preserve the uncertainty, responsible person, reason, accepted risk and evidence.
8. An override never mutates the external authoritative record.
9. New evidence creates a new assessment that supersedes the old assessment; it does not erase previous decisions.
10. Safety-critical failures remain independently visible even if an overall weighted score is high.

## Scoring contract

Every score must expose:

- included categories;
- requirement weights;
- failed requirements;
- unknown requirements;
- source-unavailable requirements;
- freshness state;
- confidence method;
- whether the score is informational or work-controlling.

The future resolver must be able to explain the score from requirement records. No opaque single-number readiness score is allowed.

## Project Memory integration after checkpoint

When code integration is released, the intended additions are:

- `src/data/schemas/readiness.schema.ts`;
- readiness arrays in `NexusProjectMemorySnapshot`;
- Project Memory invariant checks for PKG-005;
- e-SAFE-only readiness fixtures;
- resolver functions that combine readiness, provenance, access and human decisions;
- audit events when assessments are created or superseded;
- explicit human-decision records for Reality Mode actions.

The first implementation must remain data-first. It must not create a readiness dashboard or alter the Relationship Tree shell during the same step.

## e-SAFE Catania fixture plan

After the gate, use only e-SAFE Catania fixture material in this PR.

Permitted test examples:

1. `REAL` source-backed D5.1 survey document exists and is verified.
2. A `DERIVED` drawing reference may have lower confidence than the authentic D5.1 source.
3. A synthetic operational review task can be assessed without pretending it was a real e-SAFE contractor task.
4. An `UNKNOWN` source placeholder must produce `UNKNOWN` or `SOURCE_UNAVAILABLE`, never `PASS`.
5. A new verified source can supersede an earlier assessment while preserving the old assessment and human decisions.

Riverside and Halifax are not Phase 10 fixture sources.

## Acceptance scenarios to implement after checkpoint

### Scenario A — missing drawing revision

Expected:

- document/revision requirement = `FAIL` or `UNKNOWN` according to source state;
- blocking finding remains visible;
- overall status cannot be `READY` when the requirement blocks reliable processing.

### Scenario B — materials missing, documents complete

Expected:

- document requirements may pass;
- material requirement fails;
- readiness status reflects the blocking rule rather than document completeness alone.

### Scenario C — safety source unavailable

Expected:

- requirement = `SOURCE_UNAVAILABLE`;
- safety-critical severity remains visible;
- automatic `READY` is forbidden;
- any continuation requires authorised Reality Mode decision.

### Scenario D — low-confidence object match

Expected:

- low confidence is exposed;
- requirement is not silently promoted to pass;
- finding proposes review or clarification.

### Scenario E — authorised Reality Mode continuation

Expected:

- human identity is required;
- reason and accepted risk are required;
- evidence is linked where available;
- external source record is unchanged;
- audit history records the decision.

### Scenario F — new evidence resolves uncertainty

Expected:

- a new assessment is created;
- `supersedesAssessmentId` points to the earlier assessment;
- prior findings and decisions remain queryable;
- current readiness is recalculated from the new evidence.

### Scenario G — RFI draft

Expected:

- Nexus may create a draft proposal;
- no communication is marked as sent;
- sending requires a separately authorised PKG-003 communication route.

## Existing code that will be reused

The current PR #90 already provides useful dependencies:

- canonical object IDs and relationships;
- provenance classes `REAL | DERIVED | SYNTHETIC_DEMO | UNKNOWN`;
- verification state and source freshness;
- external references and source-of-record metadata;
- human-decision audit records;
- fail-closed access decisions;
- temporal `AS_OF` state and supersession concepts;
- Project Memory invariant infrastructure.

PKG-005 should extend these contracts, not create a parallel truth model.

## Explicit non-goals

Phase 10 does not:

- replace Joanna's Task Readiness / Supply Check proof;
- edit `/spark`;
- alter the public Relationship Tree;
- change Person Card;
- change DoorFlow or Fire Door Register runtime;
- implement procurement or hire automation;
- send RFIs;
- claim live Work Wallet readiness integration;
- process BIM models;
- add a readiness UI.

## Release gate

Before product-code integration of PKG-005 into `nosmo-nexus-mvp`:

1. verify Joanna's Spark Smoke Test / boundary state against current GitHub;
2. record an explicit founder checkpoint releasing PKG-005 integration;
3. re-check the current PR #90 head for concurrent changes;
4. implement only the data contract and tests first;
5. keep UI work as a later, separate step.

Until that release gate is satisfied, this document is the Phase 10 deliverable and the implementation state remains `CONTRACT_PREPARED / CODE_GATED`.
