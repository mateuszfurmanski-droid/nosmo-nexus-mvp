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
3. `docs/NEXUS_PHASE_18_CLOUD_ATOMIC_PROJECT_MEMORY_COMMIT.md` before Cloud persistence transactions.
4. `docs/NEXUS_PHASE_17_CLOUD_PROVIDER_ADAPTER_BOUNDARY.md` before provider-adapter work.
5. `docs/NEXUS_PHASE_16_CLOUD_PERSISTENCE_BOUNDARY.md` before Cloud persistence proposals.
6. `docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md` before Cloud/File Loader routing.
7. `docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md` before auth/session/Person binding/Context Ticket work.
8. `docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md` before creating another card/object model.
9. `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before using historical PRs.
10. `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md`.
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
- Phase 16 — provider-write -> canonical persistence proposal boundary.
- Phase 17 — server-only provider write-plan boundary with capability truth.
- Phase 18 — storage records moved into Project Memory + atomic/idempotent Cloud commit semantics.

## Core architecture rules

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

## Phase 15 — Nexus Cloud routing

Files:

- `src/core/storage/cloudRouting.ts`
- `src/core/storage/cloudAssetContract.ts`
- `src/core/storage/storageContract.ts`

Cloud routing requires exact canonical `projectId + worldId` and resolves semantic targets only:

- `00_INBOX`
- `01_PENDING_GRAPH_LINK`
- `02_BY_TRADE`
- `03_BY_TYPE`
- `99_AUDIT`

These are semantic roles, not Google Drive folder IDs.

`nexus-cloud-pending-asset/v2` is pre-persistence metadata only.

## Phase 16 — Cloud persistence proposal

File:

`src/core/storage/cloudPersistenceContract.ts`

Sequence:

`pending asset -> canonical cloud.file.write allow -> provider write receipt -> persistence proposal`

A proposal contains together:

1. `NexusFileRecord`
2. canonical File object
3. provider/external reference
4. Nexus Cloud storage record
5. `CLOUD_FILE_PERSISTED` audit event
6. canonical `attach-file-to-project` action
7. stable idempotency key

The proposal itself does not mutate Project Memory.

Provider object IDs never become canonical Nexus File IDs.

## Phase 17 — server-side provider adapter

Authority:

`docs/NEXUS_PHASE_17_CLOUD_PROVIDER_ADAPTER_BOUNDARY.md`

File:

`src/core/storage/cloudProviderAdapterContract.ts`

A provider write plan is denied unless:

- exact canonical `cloud.file.write` access is allowed;
- connector/account match;
- lifecycle is `LIVE`;
- integration level is at least `5 / CONTROLLED_TWO_WAY_API`;
- File write capability is declared;
- account is `connected`;
- account scope includes `cloud.file.write`;
- server secret reference exists;
- exactly one enabled target mapping exists for exact project/world/semantic target role.

The plan is server-only:

- `browserCredentialsAllowed: false`
- `providerWritePerformed: false`
- `projectMemoryMutationPerformed: false`
- `projectGraphMutationPerformed: false`

No provider network call is made by the contract.

### Google Drive truth

`src/connectors/google-drive/googleDriveConnector.ts` is a reference/deep-link catalogue contract, not live capability truth.

It now has `canUpdateProjectGraph: false` and explicitly says Nexus reference writes are not Google Drive binary/API writes.

Current Drive reference/deep-link posture does not satisfy the Phase 17 live-write gate.

No Google Drive contents, credentials or folders were modified.

## Phase 18 — atomic/idempotent Project Memory commit

Authority:

`docs/NEXUS_PHASE_18_CLOUD_ATOMIC_PROJECT_MEMORY_COMMIT.md`

New/changed files:

- `src/data/schemas/storage.schema.ts`
- `src/data/projectMemory.ts` now contains `storageRecords`
- `src/data/projectMemoryStorageInvariants.ts`
- `src/core/storage/cloudProjectMemoryCommit.ts`
- `src/core/storage/storageContract.ts` re-exports canonical storage schema

Core rule:

`all canonical Cloud persistence records commit together or none commit`

A successful logical commit adds together:

1. File record
2. canonical File object
3. provider/external reference
4. storage record
5. audit event

The input memory snapshot is immutable; a new snapshot is returned only after validation.

### Retry behaviour

- complete exact replay -> `ALREADY_COMMITTED`, no mutation;
- partial existing records -> `PARTIAL_STATE_CONFLICT`, fail closed;
- same IDs with changed identity -> `IDENTITY_CONFLICT`, fail closed;
- same provider object linked to another canonical object -> `PROVIDER_OBJECT_ALREADY_LINKED`, fail closed.

### Revalidation

Commit re-checks:

- project/world existence and exact scope;
- stored access decision still allowed for `cloud.file.write`;
- canonical action-policy consistency;
- normal Project Memory invariants;
- new storage invariants.

If post-commit invariants fail, the original snapshot is returned unchanged.

Phase 18 is still an in-memory transaction contract, not a DB transaction.

Focused strict TypeScript compile for Phase 17 and Phase 18 isolated contracts passed. This is not a full repository build.

## Historical donor map

- Relationship Tree: `#15 -> #35 -> #42 -> #45`, plus #86/#49/#24/#26/#40 donors; #46 freeze.
- Work Wallet client: `#18 -> #52 -> #63`.
- Auth/runtime: `#54 -> #55 -> #56 -> #57 -> #58 -> #59 -> #60 -> #61`.
- Nexus Cloud donor line: `#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`; #73 strict routing donor.
- BIM/IFC/WorkSuite: `#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87`.
- Android: #41, #44/#85 and #27 remain separate native lines.

Do not bulk-merge donor stacks.

## PKG gates

PKG-004 and PKG-005 runtime/product implementation remain subject to current architecture/founder gate state.

Connector catalogue status is not capability truth.

Phase 17 consumes PKG-004 capability semantics but does not release a live provider runtime.

## Protected surfaces

Do not touch from #90 foundation work unless explicitly requested:

- PR #91 Spark demo/card/runtime;
- `NOSMO-website` live Relationship Tree;
- stable Person Card;
- Android/APK / Work Mode runtime;
- BIM runtime;
- DoorFlow / Fire Door Register runtime;
- historical Cloud donor branches;
- live Google Drive contents;
- existing auth/Work Wallet runtime branches except explicit reconciliation.

## Correct next controlled sequence

1. Re-check #90 before every write; keep #91 frozen.
2. Design a persistence adapter/DB transaction implementing Phase 18 semantics without changing the contract.
3. Define unique constraints for canonical File identity and provider-object identity.
4. Add rollback/idempotency behaviour for real persistence.
5. Only after persistence works, add separate authorised/audited graph-link behaviour.
6. Then add realtime invalidation and offline mobile retry.
7. Reconcile a real Google Drive adapter only after truthful PKG-004 capability + server credentials are explicitly released.
8. Reconcile Work Wallet with PKG-004 without duplicating runtime.
9. Implement gated PKG-004/005 product slices only when explicitly released.
10. Deliberately migrate Relationship Tree into source-native #90 architecture.
11. Port BIM/IFC/WorkSuite later in modular slices.
12. Audit Android separately.

## Core principle

Cloud routing proves where an authorised object may be stored semantically.

Provider planning proves current access/capability/config allows a server attempt.

Provider receipt proves provider persistence.

Phase 18 canonical commit creates one coherent Nexus File identity/reference/storage/audit state.

Project Graph linking remains a separate authorised relationship decision.
