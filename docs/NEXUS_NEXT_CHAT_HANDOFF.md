# NOSMO Nexus — Next Chat Handoff

Status: active handoff for continuing PR #90 without relying on chat memory.

## Repository authority

- Product repo: `mateuszfurmanski-droid/nosmo-nexus-mvp`
- Foundation branch: `codex/nexus-mvp-modular-foundation`
- Foundation PR: #90
- Spark demo: PR #91 / `codex/spark-skanska-demo-core`
- Architecture repo: `mateuszfurmanski-droid/nosmo-nexus`
- Public preview repo: `mateuszfurmanski-droid/NOSMO-website`

Always re-check current GitHub state before writing. Do not rely on old chat state when GitHub differs.

## Hard founder boundary — PR #91

PR #91 is the Spark / SKANSKA demonstrator and is protected from the #90 foundation track.

Do not from #90 work:

- edit #91 files;
- rebase #91 merely because #90 moved;
- refactor/redesign the accepted Spark Object Card;
- migrate its browser-local demo state;
- use architecture cleanup as a reason to alter Spark demo behaviour.

Only change #91 when the founder explicitly asks for a concrete Spark-demo change.

## Mandatory reading order

1. Current PR #90 state/head.
2. This handoff.
3. `docs/NEXUS_PHASE_16_CLOUD_PERSISTENCE_BOUNDARY.md` before Cloud persistence/provider work.
4. `docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md` before Cloud/File Loader routing work.
5. `docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md` before auth/session/Person binding/Context Ticket work.
6. `docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md` before creating another card/object model.
7. `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before using historical PRs.
8. `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md`.
9. `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
10. Phase 10/11 PKG-005 and PKG-004 reconciliation docs before gated implementation.
11. Current `PROJECT_CONTROL.md` and relevant PKG/ADDON files in `nosmo-nexus`.

## PR #90 phase state

- Phase 0 — modular structure/migration inventory.
- Phase 1 — registries.
- Phase 2 — module contracts.
- Phase 3 — connector contracts.
- Phase 4 — core shell/graph/timeline/events/permissions/storage skeleton.
- Phase 5 — Project Memory schemas.
- Phase 6 — architecture reconciliation.
- Phase 7 / 7A — canonical/audit/access/temporal gap close + e-SAFE-only fixture correction.
- Phase 8 — e-SAFE provenance/access/temporal fixtures.
- Phase 9 — Project Memory integrity/action-policy invariants.
- Phase 10 — PKG-005 contract prepared; runtime code gated.
- Phase 11 — PKG-004 source-of-record reconciliation prepared; connector runtime/invariants gated.
- Phase 12 — historical PR integration audit.
- Phase 13 — Object Card v1 foundation.
- Phase 14 — auth/identity reconciliation.
- Phase 15 — provider-neutral Nexus Cloud routing/pending-asset v2.
- Phase 16 — Cloud provider-write -> canonical persistence proposal boundary.

## Canonical architecture rules

### Project Memory

Nexus is a continuously updated Project Memory + Relationship Graph, not a collection of accumulated PR branches.

Historical branches are donors only and must be reconciled to current identity/provenance/access/temporal/connector/audit/storage contracts.

### Project Worlds

PR #90 fixture data remains e-SAFE Catania only:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

This is fixture scope, not a product limitation. Future projects/worlds are dynamic canonical records.

The legacy public Relationship Tree may still show Riverside. That does not make Riverside a #90 fixture.

### Object Card v1

`Object Card = Project Memory projection`

not a separate data store.

Material/Product/Asset/Component/Equipment etc. are typed profiles of one Object Card model.

Person and Company retain dedicated identity/participation semantics.

### Auth/access

Canonical separation:

`authentication -> identity binding -> Project Participation -> explicit permission/policy decision`

Rules:

- OIDC/provider subject != canonical Person ID;
- authenticated but not exactly bound = `UNBOUND` -> deny;
- no email/name fuzzy identity binding;
- active Project Participation alone != permission;
- explicit allow is required under current #90 policy;
- explicit deny wins;
- auth/session/runtime must never self-grant project access.

Historical #54-#61 remains runtime/persistence donor work. Do not create a second auth/session/Context Ticket implementation.

## Phase 15 — Nexus Cloud routing foundation

Authority:

`docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md`

Files:

- `src/core/storage/cloudRouting.ts`
- `src/core/storage/cloudAssetContract.ts`
- `src/core/storage/storageContract.ts`

Cloud routing requires exact canonical:

`projectId + worldId`

and fails closed on missing/mismatched project/world.

Foundation resolves only semantic targets:

- `00_INBOX`
- `01_PENDING_GRAPH_LINK`
- `02_BY_TRADE`
- `03_BY_TYPE`
- `99_AUDIT`

These are semantic roles, not Google Drive folder IDs.

`nexus-cloud-pending-asset/v2` is pre-persistence metadata only. It explicitly keeps binary/provider/index/graph side effects false.

Google Drive remains the current practical adapter/donor, but its folder IDs/URLs are provider configuration and must not become canonical project routing.

`external-reference` is a storage scope, not a connector ID.

## Phase 16 — Cloud persistence boundary

Authority:

`docs/NEXUS_PHASE_16_CLOUD_PERSISTENCE_BOUNDARY.md`

File:

`src/core/storage/cloudPersistenceContract.ts`

Canonical sequence:

`pending asset -> canonical cloud.file.write access allow -> provider write receipt -> persistence proposal -> future transactional commit`

A successful provider write alone does not create a Nexus file.

Required access decision:

- `result: allowed`
- resolved `personId`
- exact project/world
- `moduleId: cloud`
- `actionKey: cloud.file.write`

Provider receipt must contain exact project/world plus real connector ID, provider object ID, storage object key and persisted timestamp.

A valid Phase 16 proposal contains together:

1. `NexusFileRecord`
2. canonical File object
3. provider/external reference
4. `NexusCloudStorageRecord`
5. `CLOUD_FILE_PERSISTED` audit event
6. canonical `attach-file-to-project` action
7. stable idempotency key

The proposal does **not** mutate Project Memory itself. It reports `projectMemoryMutationPerformed: false` until a future transactional persistence layer commits the records atomically.

Provider object IDs are never promoted to canonical Nexus File IDs.

Storage success does not automatically mutate Project Graph. Graph linking remains a separate authorised/audited action.

Focused strict TypeScript checks for Phase 15 and Phase 16 contracts passed. These are not a full repository build.

## Historical donor map

### Relationship Tree

Primary donor line:

`#15 -> #35 -> #42 -> #45`

Additional donors: #86, #49, #24, #26/#40. #46 remains experimental/freeze.

Do not bulk-merge this line.

### Work Wallet / auth runtime

Client/extension:

`#18 -> #52 -> #63`

Server/runtime:

`#54 -> #55 -> #56 -> #57 -> #58 -> #59 -> #60 -> #61`

Reuse and reconcile; do not duplicate.

### Nexus Cloud

Historical donor line:

`#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`

PR #73 is the strict project/world routing donor.

Phase 15/16 now supersede the hardcoded routing/persistence assumptions for the #90 foundation. Do not bulk-merge the old Cloud stack.

### BIM / IFC / WorkSuite

Specialist donor line:

`#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87`

Port later in slices converging on Object Card v1 + Project Memory.

### Android

#41, #44/#85 and #27 remain separate native lines. Audit separately before consolidation.

## PKG gates

PKG-004 and PKG-005 runtime/product implementation remain subject to their current architecture/founder gate state.

Do not infer release merely from old CI, old chats or the existence of PR #91.

Connector catalogue status is not real connector capability truth.

## Protected surfaces from #90 foundation work

Do not touch unless scope is explicitly changed:

- PR #91 Spark demo/card/runtime;
- `NOSMO-website` live Relationship Tree;
- stable Person Card;
- Android/APK / Work Mode runtime;
- BIM runtime;
- DoorFlow / Fire Door Register runtime;
- historical Cloud donor branches;
- live Google Drive contents;
- existing auth/Work Wallet runtime branches except explicit reconciliation;
- competing top-shell/workbench experiments.

## Correct next controlled sequence

1. Re-check #90 head before every write; keep #91 frozen.
2. Reconcile the server-side provider adapter boundary for Nexus Cloud.
3. Map Phase 15 semantic target roles to provider configuration server-side; never browser credentials.
4. Require PKG-004 capability truth and Phase 14 canonical access before provider write.
5. On provider success, generate Phase 16 persistence proposal.
6. Design transactional/idempotent commit of File + canonical object + provider reference + audit/action into Project Memory.
7. Only after persistence works, add separate authorised graph-link behavior.
8. Then add realtime invalidation and offline mobile retry.
9. Reconcile Work Wallet connector context with PKG-004 without duplicating runtime.
10. Implement gated PKG-004/005 product slices only when explicitly released.
11. Deliberately migrate Relationship Tree into source-native #90 architecture.
12. Port BIM/IFC/WorkSuite later in modular slices.
13. Audit Android separately.
14. Never bulk-merge historical stacks solely because old CI was green.

## Core principle

Cloud routing proves only where an authorised object may be stored semantically.

Provider receipt proves that a provider persisted a binary.

Canonical persistence creates Nexus-owned file identity, reference and audit state.

Project Graph linking is a separate authorised relationship decision.
