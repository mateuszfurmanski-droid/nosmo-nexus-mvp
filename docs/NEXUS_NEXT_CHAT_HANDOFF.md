# NOSMO Nexus — Next Chat Handoff

Status: active handoff for continuing PR #90 without relying on chat memory.

## Repository and PR

- Product source repository: `mateuszfurmanski-droid/nosmo-nexus-mvp`
- Active foundation branch: `codex/nexus-mvp-modular-foundation`
- Active foundation draft PR: https://github.com/mateuszfurmanski-droid/nosmo-nexus-mvp/pull/90
- Spark demonstrator: PR #91, branch `codex/spark-skanska-demo-core`
- Public preview repository: `mateuszfurmanski-droid/NOSMO-website`
- Live Relationship Tree remains a prototype/demo and must not be rewritten during foundation work.

## Explicit founder boundary for PR #91

PR #91 is the Spark / SKANSKA demonstrator and must remain untouched from the PR #90 foundation track unless the founder explicitly requests a concrete Spark-demo change.

Do not from PR #90 work:

- edit #91 files;
- rebase #91 merely because #90 moved;
- refactor the Spark Object Card;
- redesign the Spark card;
- migrate its local demo state;
- use #90 cleanup as a reason to change the accepted Spark visual direction.

The current Spark Object Card is an accepted reference direction. Foundation work may align contracts around it without modifying it.

## Mandatory reading order in a new chat

1. Check current GitHub state of PR #90 first.
2. Treat PR #91 as protected/frozen unless explicitly working on Spark demo scope.
3. Read `docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md` before touching auth/session/Person binding/Project Participation/Context Ticket runtime.
4. Read `docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md` before creating any new project-object/card model.
5. Read `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before choosing any historical PR as an integration base.
6. Read `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md`.
7. Read `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
8. Read `docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` before readiness implementation.
9. Read `docs/NEXUS_PHASE_11_PKG004_CONNECTOR_RECONCILIATION.md` before connector/runtime integration.
10. In architecture repo `mateuszfurmanski-droid/nosmo-nexus`, read `PROJECT_CONTROL.md`, `docs/DOCUMENTATION_INDEX.md`, `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md`, relevant PKG files, and current ADDON_038/Object Card work.
11. Do not rely on old chat assumptions if current GitHub contradicts them.

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
- Phase 13: Object Card v1 foundation — canonical projection/profile contract added in #90; #91 untouched.
- Phase 14: auth/identity reconciliation — server identity bridge added; historical runtime authorization drift recorded; #91 untouched.

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

`docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` defines the post-gate contract for readiness/confidence/human decisions. No PKG-005 runtime/readiness UI was added in PR #90.

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

- #90 = `CANONICAL_FOUNDATION`.
- #91 = protected Spark demonstrator, not a replacement Nexus trunk.

Related architecture work: `mateuszfurmanski-droid/nosmo-nexus` PR #21 formalises shared `Nexus Object Card v1` under ADDON_038.

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

## Phase 13 Object Card v1 foundation

Authority inside #90:

`docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md`

Implementation:

- new `src/data/schemas/objectCard.schema.ts`;
- `NexusObjectType` extended with `Product` and `Component`;
- new Object Card profile taxonomy;
- shared ten-section card model;
- Door / InstallationObject resolve to Component profile;
- Person and Company resolve to dedicated card surfaces, not generic Object Card;
- Object Card descriptor is a lightweight Project Memory projection and does not duplicate status/evidence/lifecycle/decision/audit state;
- new schema exported from `src/data/index.ts`.

Core rule:

`Object Card = Project Memory projection`

not a parallel data store.

Focused strict TypeScript compile against the new contract and required base types passed. This is not a full repository build.

No Object Card UI was added to #90 and no Spark files in #91 were changed.

## Phase 14 auth / identity reconciliation

Authority inside #90:

`docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md`

New foundation contract:

`src/core/permissions/runtimeIdentityContract.ts`

exported from `src/core/index.ts`.

### Canonical separation

`authentication -> identity binding -> Project Participation -> permission evaluation`

These are separate layers.

### Historical donor rules retained

From #54/#55:

- OIDC/provider subject is not canonical Person ID;
- authenticated without exact binding = `UNBOUND`;
- no email/name fuzzy identity binding;
- server-owned exact provider+subject binding;
- failures fail closed.

From #57:

- reuse one unified Express runtime;
- reuse existing auth/session implementation;
- reuse existing Work Wallet gateway;
- API routes are never SPA fallback;
- raw Work Wallet body handling stays before generic JSON parsing.

From #59-#61:

- short-lived/single-use Context Ticket is a useful downstream capability;
- no browser integration secret;
- exact origin/scope/purpose;
- raw ticket not persisted or placed in URL;
- ticket issuance/exchange must re-check canonical access.

### Historical authorization drift that must NOT be ported

PR #56 used an initial rule where one active Project Participation could grant the Work Wallet application surface unless an explicit deny existed.

That conflicts with the current #90 access model.

Current #90 requires an explicit matching allow grant in addition to valid identity/participation, with explicit deny precedence and other policy gates.

Therefore:

`active participation alone != permission`.

The historical DB `nexus_project_participations` JSON permission model is a persistence donor only. It must later adapt into #90 canonical participation/role/trade/grant records rather than becoming a second permission engine.

### Runtime identity bridge behavior

`UNAUTHENTICATED` -> denied.

`UNBOUND` -> denied.

`BOUND + canonical personId` -> still not allowed; returns `CANONICAL_ACCESS_DECISION_REQUIRED` and proceeds to #90 resolver.

The preflight intentionally never returns `allowed=true`.

Focused strict TypeScript compile passed. This is not a full repository build.

No OIDC, DB, Context Ticket, Work Wallet, deployment, Person Card or Spark code was changed in Phase 14.

## Spark / checkpoint correction

An earlier Phase 11 observation said there was no Spark branch. That statement is stale: PR #91 exists.

However, #91 is explicitly protected from this foundation track. Do not use historical gate cleanup as a reason to alter #91.

Before releasing PKG-004 or PKG-005 product code solely on historical gate wording, reconcile the gate against current founder direction and current GitHub state.

## e-SAFE foundation fixture authority

The e-SAFE fixture factory is `src/data/demo/esafeCataniaMemory.ts`.

The only active demo/test Project World for PR #90 foundation fixtures remains:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Important distinction:

- Nexus supports future projects dynamically.
- #90 fixture/testing data remains e-SAFE-only.
- the public Relationship Tree may visibly expose legacy project choices such as Riverside; that does not make them #90 Project Memory fixtures.
- #91 has its own isolated Spark demo world and must not be folded into #90 fixtures from this track.

## Current technical boundary

Do not touch from PR #90 foundation work unless explicitly changing scope:

- PR #91 Spark runtime/card/demo files;
- `NOSMO-website` live Relationship Tree;
- stable Person Card;
- Android/APK / Work Mode runtime;
- BIM runtime;
- DoorFlow / Fire Door Register runtime;
- existing Work Wallet/auth/runtime branches except during an explicit reconciliation task;
- competing top shell/workbench experiments.

## Correct next controlled sequence

1. Re-check PR #90 current head before every write.
2. Keep PR #91 frozen from this foundation track.
3. Use Phase 13 Object Card v1 as the shared project-object/card contract; do not create another card model.
4. Use Phase 14 runtime identity bridge; do not allow auth/session or active participation to grant project access directly.
5. Reconcile Cloud contracts from #66-#77 plus strict routing behavior from #73, generalized for dynamic Project Worlds.
6. Reconcile Work Wallet connector context from #18/#52/#63 with PKG-004 when the package gate permits implementation.
7. Define the future DB adapter from historical Person/Participation persistence into #90 canonical Person/Participation/Grant semantics before reconnecting Context Tickets.
8. If PKG-004 is explicitly released, add only the narrow connector foundation: capability truth, honest fixtures, invariants and storage-reference semantics.
9. If PKG-005 is explicitly released, add readiness data contracts, Project Memory arrays, invariants and e-SAFE fixtures without UI.
10. Migrate Relationship Tree behavior deliberately from #15/#45/#86 into source-native #90 architecture.
11. Port BIM/IFC/WorkSuite specialist capabilities later in modular slices that use Object Card v1.
12. Audit Android native lines separately.
13. Never bulk-merge old stacks simply because historical CI was green.

## Core rule

Nexus is a continuously updated Project Memory and Relationship Graph, not a collection of accumulated PR branches.

Authentication proves an account/session. Identity binding proves which canonical Person it represents. Project Participation proves a project relationship. Explicit permission grants and policy evaluation decide what the Person may do.

Every historical branch is subordinate to the current object identity, provenance, access, temporal, connector, audit and Object Card projection contracts when it is eventually ported.
