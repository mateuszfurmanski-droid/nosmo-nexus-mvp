# NOSMO Nexus — Next Chat Handoff

Status: active handoff for PR #90. Always verify current GitHub state before writing.

## Repository authority

- Product repo: `mateuszfurmanski-droid/nosmo-nexus-mvp`
- Foundation branch: `codex/nexus-mvp-modular-foundation`
- Foundation draft PR: #90
- Spark demo: PR #91 / `codex/spark-skanska-demo-core`
- Architecture repo: `mateuszfurmanski-droid/nosmo-nexus`
- Public preview repo: `mateuszfurmanski-droid/NOSMO-website`

## Hard founder boundary — PR #91

PR #91 is the Spark / SKANSKA demonstrator and is protected from the #90 foundation track.

Do not from #90 work:

- edit #91 files;
- rebase #91 merely because #90 moved;
- refactor/redesign the accepted Spark Object Card;
- migrate its browser-local demo state;
- use architecture cleanup as a reason to alter Spark demo behaviour.

Only change #91 after an explicit Spark-demo request.

## Mandatory reading order

1. Current PR #90 state/head.
2. This handoff.
3. `docs/NEXUS_PHASE_17_CLOUD_PROVIDER_ADAPTER_BOUNDARY.md` before provider-adapter work.
4. `docs/NEXUS_PHASE_16_CLOUD_PERSISTENCE_BOUNDARY.md` before Cloud persistence work.
5. `docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md` before Cloud/File Loader routing work.
6. `docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md` before auth/session/Person binding/Context Ticket work.
7. `docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md` before creating another card/object model.
8. `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before using historical PRs.
9. `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md`.
10. `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
11. Phase 10/11 PKG-005 and PKG-004 reconciliation docs before gated implementation.
12. Current `PROJECT_CONTROL.md` and relevant PKG/ADDON files in `nosmo-nexus`.

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
- Phase 17 — server-only Cloud provider-adapter write-plan boundary; capability truth enforced; no provider write.

## Canonical architecture rules

### Project Memory / Project Worlds

Nexus is a continuously updated Project Memory + Relationship Graph, not a collection of accumulated PR branches.

PR #90 fixture data remains e-SAFE Catania only:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

This is fixture scope only. Future projects/worlds are dynamic canonical records.

The legacy public Relationship Tree may still show Riverside. That does not make Riverside a #90 fixture.

### Object Card v1

`Object Card = Project Memory projection`

Material/Product/Asset/Component/Equipment etc. are typed profiles of one shared card model. Person and Company retain dedicated identity/participation semantics.

### Auth/access

Canonical separation:

`authentication -> identity binding -> Project Participation -> explicit permission/policy decision`

Rules:

- provider subject != canonical Person ID;
- authenticated but not exactly bound = `UNBOUND` -> deny;
- no email/name fuzzy identity binding;
- active Project Participation alone != permission;
- explicit allow is required under current #90 policy;
- explicit deny wins;
- auth/session/runtime must never self-grant project access.

Historical #54-#61 remains runtime/persistence donor work. Do not create a second auth/session/Context Ticket implementation.

## Phase 15 — Nexus Cloud routing foundation

Files:

- `src/core/storage/cloudRouting.ts`
- `src/core/storage/cloudAssetContract.ts`
- `src/core/storage/storageContract.ts`

Cloud routing requires exact canonical:

`projectId + worldId`

and fails closed on missing/mismatched project/world.

Foundation resolves semantic targets only:

- `00_INBOX`
- `01_PENDING_GRAPH_LINK`
- `02_BY_TRADE`
- `03_BY_TYPE`
- `99_AUDIT`

These are semantic roles, not Google Drive folder IDs.

`nexus-cloud-pending-asset/v2` is pre-persistence metadata only. Binary/provider/index/graph side effects remain false.

Google Drive folder IDs/URLs are provider configuration and must not become canonical routing.

`external-reference` is a storage scope, not a connector ID.

## Phase 16 — Cloud persistence boundary

File:

`src/core/storage/cloudPersistenceContract.ts`

Canonical sequence:

`pending asset -> canonical cloud.file.write allow -> provider write receipt -> persistence proposal -> future transactional commit`

Required access decision:

- `result: allowed`
- resolved `personId`
- exact project/world
- `moduleId: cloud`
- `actionKey: cloud.file.write`

A valid persistence proposal contains together:

1. `NexusFileRecord`
2. canonical File object
3. provider/external reference
4. `NexusCloudStorageRecord`
5. `CLOUD_FILE_PERSISTED` audit event
6. canonical `attach-file-to-project` action
7. stable idempotency key

The proposal itself does not mutate Project Memory.

Provider object IDs never become canonical Nexus File IDs.

Storage success does not automatically mutate Project Graph.

## Phase 17 — server-side provider adapter boundary

Authority:

`docs/NEXUS_PHASE_17_CLOUD_PROVIDER_ADAPTER_BOUNDARY.md`

File:

`src/core/storage/cloudProviderAdapterContract.ts`

New rule:

`semantic route -> canonical access -> connector capability truth -> server provider target -> provider confirmation -> Phase 16 persistence proposal`

A provider write plan is denied unless:

- canonical access is allowed for exact project/world and `cloud.file.write`;
- connector account matches the connector definition;
- connector lifecycle is `LIVE`;
- connector integration level is at least `5 / CONTROLLED_TWO_WAY_API`;
- connector declares File write capability;
- connector account is `connected`;
- `cloud.file.write` is explicitly allowed in account scopes;
- a server-side secret reference exists;
- exactly one enabled provider-target mapping exists for the exact project/world/semantic target role.

The plan is server-only and explicitly states:

- `browserCredentialsAllowed: false`
- `providerWritePerformed: false`
- `projectMemoryMutationPerformed: false`
- `projectGraphMutationPerformed: false`
- provider confirmation is required.

No provider network call is made by the contract.

### Google Drive truth correction

`src/connectors/google-drive/googleDriveConnector.ts` remains a reference/deep-link catalogue contract, not live capability truth.

It now explicitly has:

`canUpdateProjectGraph: false`

and its notes state that reference metadata writes are not Google Drive binary/API writes.

Current Google Drive reference/deep-link status therefore does **not** satisfy the Phase 17 live provider-write gate.

No Google Drive contents, credentials or provider folders were modified.

## Historical donor map

### Relationship Tree

Primary donor line:

`#15 -> #35 -> #42 -> #45`

Additional donors: #86, #49, #24, #26/#40. #46 remains experimental/freeze.

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

Phase 15-17 supersede hardcoded routing/provider assumptions for #90. Do not bulk-merge the old Cloud stack.

### BIM / IFC / WorkSuite

Specialist donor line:

`#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87`

Port later in slices converging on Object Card v1 + Project Memory.

### Android

#41, #44/#85 and #27 remain separate native lines. Audit separately before consolidation.

## PKG gates

PKG-004 and PKG-005 runtime/product implementation remain subject to current architecture/founder gate state.

Do not infer release from old CI, old chats or PR #91.

Connector catalogue status is not capability truth.

Phase 17 consumes the PKG-004 truth model but does not release a real connector or provider runtime.

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
2. Design the transactional/idempotent Project Memory commit boundary for Phase 16 proposals.
3. Commit File + canonical object + provider reference + storage record + audit as one logical transaction or not at all.
4. Add duplicate/idempotency handling so retries cannot create parallel File identities.
5. Only after persistence works, add separate authorised graph-link behaviour.
6. Then add realtime invalidation and offline mobile retry.
7. Reconcile a real server-side Google Drive adapter only after truthful PKG-004 connector/account capability is released; never browser credentials.
8. Reconcile Work Wallet connector context with PKG-004 without duplicating runtime.
9. Implement gated PKG-004/005 product slices only when explicitly released.
10. Deliberately migrate Relationship Tree into source-native #90 architecture.
11. Port BIM/IFC/WorkSuite later in modular slices.
12. Audit Android separately.
13. Never bulk-merge historical stacks solely because old CI was green.

## Core principle

Cloud routing proves only where an authorised object may be stored semantically.

Provider write planning proves only that current access/capability/configuration permits a server attempt.

Provider receipt proves the provider confirmed persistence.

Canonical persistence creates Nexus-owned file identity, reference and audit state.

Project Graph linking is a separate authorised relationship decision.
