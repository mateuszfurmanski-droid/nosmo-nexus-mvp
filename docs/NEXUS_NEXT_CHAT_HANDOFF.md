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
3. Read `docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md` before touching Nexus Cloud/File Loader/storage routing.
4. Read `docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md` before touching auth/session/Person binding/Project Participation/Context Ticket runtime.
5. Read `docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md` before creating any new project-object/card model.
6. Read `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before choosing any historical PR as an integration base.
7. Read `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md`.
8. Read `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
9. Read `docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` before readiness implementation.
10. Read `docs/NEXUS_PHASE_11_PKG004_CONNECTOR_RECONCILIATION.md` before connector/runtime integration.
11. In architecture repo `mateuszfurmanski-droid/nosmo-nexus`, read `PROJECT_CONTROL.md`, `docs/DOCUMENTATION_INDEX.md`, `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md`, relevant PKG files, and current ADDON_038/Object Card work.
12. Do not rely on old chat assumptions if current GitHub contradicts them.

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
- Phase 15: Nexus Cloud foundation reconciliation — dynamic provider-neutral project/world routing and pending-asset v2 contract added; no provider write; #91 untouched.

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

Preferred narrow donor line:

`#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`

PR #73 is the strict end-to-end project/world routing donor.

Phase 15 has now extracted the provider-neutral routing semantics into #90. Do not bulk-merge this historical Cloud stack.

Historical Drive folder IDs remain provider configuration/donor evidence, not canonical foundation routing.

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

- `src/data/schemas/objectCard.schema.ts`;
- `NexusObjectType` extended with `Product` and `Component`;
- shared Object Card profile taxonomy and ten-section model;
- Door / InstallationObject resolve to Component profile;
- Person and Company keep dedicated identity card surfaces;
- Object Card is a Project Memory projection, not a parallel data store.

No Object Card UI was added to #90 and no Spark files in #91 were changed.

## Phase 14 auth / identity reconciliation

Authority inside #90:

`docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md`

New foundation contract:

`src/core/permissions/runtimeIdentityContract.ts`

Canonical separation:

`authentication -> identity binding -> Project Participation -> permission evaluation`

Retained donor rules:

- OIDC/provider subject is not canonical Person ID;
- authenticated without exact binding = `UNBOUND`;
- no email/name fuzzy identity binding;
- failures fail closed;
- reuse existing unified auth/session/runtime and Work Wallet gateway rather than duplicating them.

Historical drift not to port:

`active participation alone != permission`.

Current #90 requires explicit matching allow grant plus valid identity/participation and explicit-deny precedence.

Runtime preflight:

- `UNAUTHENTICATED` -> denied;
- `UNBOUND` -> denied;
- `BOUND + personId` -> still requires canonical #90 access decision.

No OIDC, DB, Context Ticket, Work Wallet, deployment, Person Card or Spark code was changed in Phase 14.

## Phase 15 Nexus Cloud foundation reconciliation

Authority inside #90:

`docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md`

New contracts:

- `src/core/storage/cloudRouting.ts`;
- `src/core/storage/cloudAssetContract.ts`;
- tightened `src/core/storage/storageContract.ts`;
- exports added in `src/core/index.ts`.

### Dynamic routing rule

Cloud routing now resolves against canonical Project/ProjectWorld records rather than a hardcoded provider manifest.

Required boundary:

`exact projectId + exact worldId`.

The resolver fails closed when:

- project does not exist;
- world does not exist;
- world belongs to another project;
- world is not registered on the project;
- graph candidates are treated as already classified/linked rather than review hints;
- trade/type classification lacks required context.

### Provider-neutral target

Foundation resolves only semantic target roles:

- `00_INBOX`;
- `01_PENDING_GRAPH_LINK`;
- `02_BY_TRADE`;
- `03_BY_TYPE`;
- `99_AUDIT`.

It does not contain Google Drive folder IDs/URLs.

A provider adapter must map the semantic role after an independent access decision.

### Pending asset v2

`nexus-cloud-pending-asset/v2` is a pre-persistence metadata envelope.

It records project/world, source module, file metadata/provenance hints and semantic route while explicitly keeping these side effects false:

- binary handled;
- provider write performed;
- Asset Index append performed;
- Project Graph mutation performed.

### Storage scope correction

`nexus-cloud` storage records require `projectId + worldId`.

`external-reference` now requires a real `sourceConnectorId` and is explicitly a storage scope, not a fake connector ID.

### Google Drive boundary

Google Drive remains the current practical Nexus Cloud adapter/donor implementation, but no Google credential, API write, binary upload, folder move or Drive Asset Index mutation was added to #90 in Phase 15.

The actual Drive content was not modified.

## Spark / checkpoint correction

PR #91 exists but is explicitly protected from this foundation track. Do not use historical gate cleanup as a reason to alter #91.

Before releasing PKG-004 or PKG-005 product code solely on historical gate wording, reconcile the gate against current founder direction and current GitHub state.

## e-SAFE foundation fixture authority

The e-SAFE fixture factory is `src/data/demo/esafeCataniaMemory.ts`.

The only active demo/test Project World for PR #90 foundation fixtures remains:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Important distinction:

- Nexus supports future projects dynamically.
- #90 fixture/testing data remains e-SAFE-only.
- dynamic Cloud routing is not limited to that fixture.
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
- historical Cloud donor branches;
- live Google Drive contents;
- competing top shell/workbench experiments.

## Correct next controlled sequence

1. Re-check PR #90 current head before every write.
2. Keep PR #91 frozen from this foundation track.
3. Use Phase 13 Object Card v1 as the shared project-object/card contract.
4. Use Phase 14 runtime identity bridge; auth/session or active participation must not grant project access directly.
5. Use Phase 15 provider-neutral Cloud routing; do not hardcode project-to-Drive folder IDs into foundation.
6. Define the Cloud persistence boundary: successful provider write -> canonical `NexusFileRecord` + provider/external reference + audit.
7. Bind the Cloud write path to canonical Phase 14 access decisions before implementing real binary upload.
8. Reconcile the server-side Google Drive adapter mapping to semantic target roles; no browser credentials.
9. Reconcile Work Wallet connector context from #18/#52/#63 with PKG-004 when the package gate permits implementation.
10. If PKG-004 is explicitly released, add only the narrow connector capability/source-of-record foundation.
11. If PKG-005 is explicitly released, add readiness data contracts/invariants/e-SAFE fixtures without UI.
12. Migrate Relationship Tree behavior deliberately from #15/#45/#86 into source-native #90 architecture.
13. Port BIM/IFC/WorkSuite specialist capabilities later in modular slices that use Object Card v1.
14. Audit Android native lines separately.
15. Never bulk-merge old stacks simply because historical CI was green.

## Core rule

Nexus is a continuously updated Project Memory and Relationship Graph, not a collection of accumulated PR branches.

Authentication proves an account/session. Identity binding proves which canonical Person it represents. Project Participation proves a project relationship. Explicit permission grants and policy evaluation decide what the Person may do.

Cloud routing proves only where an authorised project/world object may be stored semantically. It does not itself grant permission and does not prove a provider write occurred.

Every historical branch is subordinate to the current object identity, provenance, access, temporal, connector, audit, Object Card and provider-neutral storage contracts when it is eventually ported.
