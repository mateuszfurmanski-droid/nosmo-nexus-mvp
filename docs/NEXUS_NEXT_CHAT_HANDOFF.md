# NOSMO Nexus — Next Chat Handoff

Status: active handoff for continuing PR #90 without relying on chat memory.

## Repository and PR

- Product source repository: `mateuszfurmanski-droid/nosmo-nexus-mvp`
- Active foundation branch: `codex/nexus-mvp-modular-foundation`
- Active foundation draft PR: https://github.com/mateuszfurmanski-droid/nosmo-nexus-mvp/pull/90
- Current stacked Spark demonstrator: PR #91, branch `codex/spark-skanska-demo-core`
- Public preview repository: `mateuszfurmanski-droid/NOSMO-website`
- Live Relationship Tree remains a prototype/demo and must not be rewritten during foundation work.

## Mandatory reading order in a new chat

1. Check current GitHub state of PR #90 first.
2. Check whether PR #91 or other stacked branches moved since this handoff.
3. Read `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before choosing any historical PR as an integration base.
4. Read `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md`.
5. Read `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
6. Read `docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` before readiness implementation.
7. Read `docs/NEXUS_PHASE_11_PKG004_CONNECTOR_RECONCILIATION.md` before connector/runtime integration.
8. In architecture repo `mateuszfurmanski-droid/nosmo-nexus`, read `PROJECT_CONTROL.md`, `docs/DOCUMENTATION_INDEX.md`, `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md`, relevant PKG files, and current ADDON_038/Object Card work.
9. Do not rely on old chat assumptions if current GitHub contradicts them.

## Current PR #90 phases

- Phase 0: modular structure, migration plan, file inventory.
- Phase 1: registries.
- Phase 2: module contracts.
- Phase 3: connector contracts.
- Phase 4: core skeleton.
- Phase 5: Project Memory schemas.
- Phase 6: architecture reconciliation map.
- Phase 7: gap-close schemas and Project Memory action contracts.
- Phase 7A: demo scope correction — e-SAFE Catania only.
- Phase 8: e-SAFE-backed fixtures + schema consistency against PKG-001, PKG-002, PKG-004, ADDON_056 and ADDON_057.
- Phase 9: Project Memory integrity checks + action-policy consistency.
- Phase 10: PKG-005 readiness/confidence/human-decision contract preparation — product code gated.
- Phase 11: PKG-004 connector/source-of-record reconciliation — product runtime/invariant implementation gated.
- Phase 12: full PR integration audit — canonical trunk vs donor/freeze/blocked tracks defined; no historical stack merged.

## Phase 9 completed state

Phase 9 added:

- `src/data/projectMemoryInvariants.ts` with referential-integrity checks;
- project/world isolation validation;
- graph and canonical reference validation;
- provenance rules for `REAL`, `DERIVED`, `SYNTHETIC_DEMO`, `UNKNOWN`;
- ADDON_056 fail-closed access checks;
- explicit deny precedence;
- manager trade context scope checks;
- ADDON_057 `AS_OF` temporal checks;
- central `PROJECT_MEMORY_ACTION_POLICY`;
- e-SAFE-only fixture restrictions;
- Phase 9 e-SAFE canonical person + temporal evidence fixes;
- automatic e-SAFE memory assertion.

No real shell migration was started in Phase 9.

## Phase 10 prepared state

Authority: `PKG_005_READINESS_CONFIDENCE_AND_HUMAN_DECISION_CONTRACT.md`.

`docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` defines the post-gate contract for:

- ReadinessAssessment;
- ReadinessRequirement;
- ReadinessFinding;
- RealityModeDecision;
- explainable scoring;
- UNKNOWN / SOURCE_UNAVAILABLE fail-closed rules;
- safety-critical blocking;
- human override/history;
- RFI draft-only boundary;
- superseding reassessment;
- e-SAFE future acceptance fixtures.

No PKG-005 runtime/readiness UI was added in PR #90.

## Phase 11 prepared state

`docs/NEXUS_PHASE_11_PKG004_CONNECTOR_RECONCILIATION.md` records:

- connector catalogue status is not capability authority;
- integration level `0..7` must gate actions;
- lifecycle, connection and freshness are separate;
- source-of-record ownership must be explicit;
- e-SAFE memory currently lacks connector definition/account/mapping fixtures;
- `storageConnectorId: 'external-reference'` is not a registered provider;
- Phase 9 invariants do not yet cover connector topology/capability/freshness/source ownership;
- connector mappings do not grant identity or project access;
- credential fields are references only;
- existing Work Wallet/auth/runtime PRs must be reconciled rather than duplicated.

No connector runtime or PKG-004 invariant code was added in Phase 11.

## Phase 12 integration audit

Authority inside this branch: `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md`.

### Current canonical line

`PR #90 -> PR #91`

- #90 = `CANONICAL_FOUNDATION`.
- #91 = `CURRENT_STACKED_DEMO`, not a replacement Nexus trunk.

PR #91 currently provides a narrow Spark SKANSKA Circular Asset & Material demonstrator and is stacked directly on #90. It introduces a Spark-specific branch that did not exist during the earlier checkpoint observation.

Related current architecture work: `mateuszfurmanski-droid/nosmo-nexus` PR #21 formalises shared `Nexus Object Card v1` under ADDON_038. Treat it as important current architecture authority before creating another Object Card model.

### Relationship Tree donors

Primary donor line:

`#15 -> #35 -> #42 -> #45`

Additional donors/recovery:

- #86 one-chrome/mobile recovery;
- #49 manager/trade shell behavior;
- #24 partial external-launch-context donor;
- #26/#40 BIM/change-event graph projection donors;
- #46 experimental freeze.

Do not merge this historical Tree stack wholesale into #90. Port selected behavior into #90 Project Memory/access/temporal architecture later.

### Work Wallet / identity / runtime donors

Client/extension line:

`#18 -> #52 -> #63`

Server/runtime line:

`#54 -> #55 -> #56 -> #57 -> #58 -> #59 -> #60 -> #61`

Do not build a second auth/session implementation, Person binding, Work Wallet gateway, connector context or context-ticket path in #90.

### Nexus Cloud donors

Preferred narrow contract line:

`#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`

Use #73 as a donor for strict client/server `projectId + worldId` routing behavior.

Do not make broad cumulative PR #50 the new trunk. It mixes Cloud, old shell assumptions, Work Mode AI and WorkSuite draft surfaces.

#80/#82 remain blocked/reference-only until usable CI/runtime evidence exists.

Historical Cloud branches include e-SAFE + Riverside. Port their generic project/world routing behavior, not their hardcoded fixture set, into #90.

### BIM / IFC / WorkSuite donor stack

Historical specialist line:

`#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87`

Issue #89 tracks next web-ifc delivery work.

Keep as specialist donor work. Future extraction must converge with shared ADDON_038/Object Card v1 and #90 Project Memory rather than making BIM its own product trunk.

### Android track

#41, #44/#85 and #27 remain separate native lines. Do not integrate Android source into #90 foundation. A separate native-line audit must choose the canonical Android lineage before consolidation.

## Spark / checkpoint correction

An earlier Phase 11 observation said there was no Spark branch. That statement is now stale: PR #91 exists and is stacked on #90.

However, PR #91's existence is not automatically equivalent to proof that the historical Joanna Thin Spark Core Smoke Test / founder checkpoint described by old Project Control was formally completed.

Before releasing PKG-004 or PKG-005 product code solely on that historical gate, reconcile the gate against current founder direction and current GitHub state.

## e-SAFE foundation fixture authority

The e-SAFE fixture factory is `src/data/demo/esafeCataniaMemory.ts`.

The only active demo/test Project World for PR #90 foundation fixtures remains:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Important distinction:

- Nexus supports future projects dynamically.
- #90 fixture/testing data remains e-SAFE-only.
- the public Relationship Tree may visibly expose legacy project choices such as Riverside; that does not make them #90 Project Memory fixtures.
- PR #91 intentionally has its own isolated synthetic Residential Building Project World as a separate stacked demonstrator, not as a #90 fixture mutation.

## Current technical boundary

Do not touch from PR #90 foundation work unless explicitly changing scope:

- `NOSMO-website` live Relationship Tree;
- stable Person Card;
- Android/APK / Work Mode runtime;
- BIM runtime;
- DoorFlow / Fire Door Register runtime;
- unrelated Spark runtime files in PR #91;
- existing Work Wallet/auth/runtime branches except during an explicit reconciliation task;
- competing top shell/workbench experiments.

## Correct next controlled sequence

1. Re-check PR #90 and PR #91 current heads.
2. Reconcile historical Spark/founder gate language with the now-current #91 track and founder direction.
3. Keep #90 as the common foundation and #91 as a separate stacked demonstrator.
4. Align shared Object Card v1 contract using ADDON_038 / architecture PR #21 and #91 reference behavior.
5. If PKG-004 is explicitly released, add only the narrow connector foundation: capability truth, honest fixtures, invariants and storage-reference semantics.
6. If PKG-005 is explicitly released, add readiness data contracts, Project Memory arrays, invariants and e-SAFE fixtures without UI.
7. Reconcile identity/auth/runtime from #54-#61 with #90 access contracts; do not duplicate it.
8. Reconcile Work Wallet context from #18/#52/#63 with PKG-004.
9. Reconcile Cloud contracts from #66-#77 plus strict routing behavior from #73, generalized for dynamic Project Worlds.
10. Migrate Relationship Tree behavior deliberately from #15/#45/#86 into source-native #90 architecture.
11. Port BIM/IFC/WorkSuite specialist capabilities later in modular slices.
12. Audit Android native lines separately.
13. Never bulk-merge old stacks simply because historical CI was green.

## Core rule

Nexus is a continuously updated Project Memory and Relationship Graph, not a collection of accumulated PR branches.

Every historical branch is subordinate to the current object identity, provenance, access, temporal, connector and audit contracts when it is eventually ported.
