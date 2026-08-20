# NOSMO Nexus — Next Chat Handoff

Status: active handoff for continuing PR #90 without relying on chat memory.

## Repository and PR

- Product source repository: `mateuszfurmanski-droid/nosmo-nexus-mvp`
- Active branch: `codex/nexus-mvp-modular-foundation`
- Active draft PR: https://github.com/mateuszfurmanski-droid/nosmo-nexus-mvp/pull/90
- Public preview repository remains untouched: `mateuszfurmanski-droid/NOSMO-website`
- Live Relationship Tree remains the prototype/demo and must not be rewritten during this foundation work.

## Mandatory reading order in a new chat

1. Check current GitHub state of PR #90 first.
2. Read `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md` in PR #90.
3. Read `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
4. Read `docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` before any readiness implementation.
5. Read `docs/NEXUS_PHASE_11_PKG004_CONNECTOR_RECONCILIATION.md` before any connector/runtime integration.
6. In architecture repo `mateuszfurmanski-droid/nosmo-nexus`, read `PROJECT_CONTROL.md`, `docs/DOCUMENTATION_INDEX.md`, `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md`, and relevant PKG files before adding code.
7. Do not rely on old chat assumptions if the repo contradicts them.

## Current PR #90 phases

- Phase 0: modular structure, migration plan, file inventory.
- Phase 1: registries.
- Phase 2: module contracts.
- Phase 3: connector contracts.
- Phase 4: core skeleton.
- Phase 5: project memory schemas.
- Phase 6: architecture reconciliation map.
- Phase 7: gap-close schemas and project memory action contracts.
- Phase 7A: demo scope correction — e-SAFE Catania only.
- Phase 8: e-SAFE-backed fixtures + schema consistency against PKG-001, PKG-002, PKG-004, ADDON_056 and ADDON_057.
- Phase 9: Project Memory integrity checks + action-policy consistency.
- Phase 10: PKG-005 readiness/confidence/human-decision contract preparation — code gated pending Spark Smoke Test + explicit founder checkpoint.
- Phase 11: PKG-004 connector/source-of-record reconciliation — contract findings recorded, product runtime/invariant implementation gated pending founder checkpoint.

## Phase 9 completed state

Phase 9 adds:

- `src/data/projectMemoryInvariants.ts` with referential-integrity checks for Project Memory;
- duplicate base-record ID detection;
- project/world isolation validation;
- graph node/edge reference and world checks;
- canonical object / relationship / external-reference checks;
- provenance rules for `REAL`, `SYNTHETIC_DEMO` and `UNKNOWN` records;
- ADDON_056 fail-closed checks requiring resolved identity, active participation and an explicit matching grant before an `allowed` decision is accepted;
- explicit-deny conflict detection so a matching deny invalidates an allowed decision;
- manager trade context scope validation without treating manager context as a permission grant;
- ADDON_057 `AS_OF` checks for missing objects, conflicting state buckets, active revisions and future-event leakage;
- `PROJECT_MEMORY_ACTION_POLICY` so action access/audit/blocked-by-default semantics have one canonical source;
- e-SAFE-only fixture restrictions that reject Riverside/Halifax demo worlds;
- `src/data/demo/esafeCataniaPhase9Fixtures.ts` to close two Phase 8 fixture gaps: the previously dangling canonical person reference and missing temporal state for canonical D5.1 evidence;
- automatic e-SAFE memory assertion when `createEsafeCataniaMemory()` builds the fixture snapshot.

No UI or React shell work was started.

## Phase 10 prepared state

Phase 10 authority is `PKG_005_READINESS_CONFIDENCE_AND_HUMAN_DECISION_CONTRACT.md` in the architecture repo.

Important gate:

- PKG-005 is `SPEC_READY / CODE_BLOCKED_BY_SPARK_CHECKPOINT`;
- `PROJECT_CONTROL.md` states that PKG-001 to PKG-005 product-code integration into `nosmo-nexus-mvp` waits for Joanna's Spark Smoke Test and founder checkpoint;
- do not interpret ordinary continuation approval as automatically satisfying that release gate.

`docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` defines the exact post-gate contract for:

- ReadinessAssessment;
- ReadinessRequirement;
- ReadinessFinding;
- RealityModeDecision;
- explainable scoring;
- UNKNOWN / SOURCE_UNAVAILABLE fail-closed rules;
- safety-critical blocking;
- human override and Reality Mode history;
- RFI draft-only boundary;
- superseding reassessment rather than history deletion;
- e-SAFE-only future readiness fixtures;
- acceptance scenarios to implement after the gate.

No readiness runtime or readiness UI was changed.

## Phase 11 prepared state

`docs/NEXUS_PHASE_11_PKG004_CONNECTOR_RECONCILIATION.md` records the current PKG-004 gap analysis.

Key findings:

- lightweight `connectorRegistry.ts` catalogue status is not sufficient capability truth;
- PKG-004 integration level `0..7` must gate actual actions;
- lifecycle, connection state and freshness must remain separate;
- source-of-record ownership must be explicit per domain;
- e-SAFE Project Memory currently has no connector definition/account/mapping fixtures despite the Project World declaring connector IDs;
- `storageConnectorId: 'external-reference'` on the e-SAFE D5.1 file is not a registered connector and must not be silently treated as Google Drive or another real provider;
- the Phase 9 invariant suite does not yet validate connector topology/capability/freshness/source-of-record rules;
- connector mappings do not grant Person identity, Project Participation or permissions;
- credential/secret fields are references only; no secret value may enter repository/client/demo records;
- existing parallel Work Wallet connector/runtime PRs must be reused/reconciled, not duplicated by PR #90.

No connector runtime, connector fixture, registry type or connector invariant code was changed in Phase 11 because PKG-004 implementation is still founder-gated.

## Parallel connector/runtime work discovered

Current repository search shows separate draft Work Wallet / runtime slices already exist, including PKG-015/016/017 work. They contain connector context, server identity/Project Participation and runtime/auth boundaries while explicitly avoiding a live/vendor-approved Work Wallet API claim.

Do not create a second Work Wallet gateway, second auth/session implementation or second connector-context authority model in PR #90.

PR #90 remains the common Project Memory / contract foundation and later runtime stacks must reconcile into it after the appropriate checkpoint.

## e-SAFE fixture authority

The e-SAFE fixture factory is `src/data/demo/esafeCataniaMemory.ts`.

Its source-backed baseline remains in `src/data/demo/esafeCataniaFixtures.ts`; Phase 9 integrity additions are in `src/data/demo/esafeCataniaPhase9Fixtures.ts`.

The only active demo/test Project World for PR #90 foundation fixtures is:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Riverside and Halifax are not current PR #90 fixture sources.

Important distinction:

- Nexus must support unlimited future projects dynamically.
- The current foundation fixture set uses e-SAFE only.
- The old public Relationship Tree may still visibly contain legacy project choices; that does not make them current Project Memory fixtures.

## Current technical boundary

Do not touch:

- `NOSMO-website` live Relationship Tree.
- Person Card stable page.
- Android/APK / Work Mode runtime.
- BIM runtime.
- DoorFlow runtime or Fire Door Register runtime.
- Joanna-protected Spark surfaces.
- Any top workbench/second top bar experiment.
- Existing Work Wallet/auth/runtime branches unless working explicitly in their package/branch.

## Known cleanup item

A stray branch exists and is harmless:

`__do_not_create__`

It should be removed later in a repo cleanup pack. Do not spend product-build time on it now.

## Correct next build sequence

1. Verify the current Joanna Spark Smoke Test / founder-checkpoint state from GitHub and Build Control rather than assuming it from chat.
2. If PKG-004 is explicitly released, implement only the narrow connector foundation slice described in Phase 11: registry capability truth, minimal honest connector fixtures, connector invariants, and correct `storageConnectorId` semantics.
3. If PKG-005 is explicitly released, implement readiness schemas + Project Memory arrays + invariants + e-SAFE-only fixtures, still without readiness UI.
4. Re-run focused type/invariant validation.
5. Reconcile PR #90 contracts with existing PKG-015/016/017 runtime branches instead of duplicating them.
6. Founder checkpoint for the first real Nexus shell if not already covered by the same explicit decision.
7. Only then start the first real Nexus shell components.
8. Then create registry-driven dock/panels.
9. Then migrate the live Relationship Tree prototype into the real app source.

## Core rule

Nexus is not a set of hardcoded demo projects. It is a continuously updated Project Memory and Relationship Graph:

- new projects;
- new worlds;
- new people and companies;
- new files and drawings;
- new evidence;
- new tasks;
- new approvals;
- new timeline events;
- new graph nodes and edges.

For the current MVP foundation/testing track, active fixture data is based on e-SAFE Catania. Other projects remain a dynamic product capability, not hardcoded fixture scope.
