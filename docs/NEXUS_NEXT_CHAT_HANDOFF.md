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
- use foundation cleanup as a reason to alter Spark demo behaviour.

Only change #91 after an explicit Spark-demo request.

## Mandatory reading order

1. Current PR #90 state/head.
2. This handoff.
3. `docs/NEXUS_PHASE_19_POSTGRES_CLOUD_PERSISTENCE.md` before DB/schema changes.
4. `docs/NEXUS_PHASE_18_CLOUD_ATOMIC_PROJECT_MEMORY_COMMIT.md` before Cloud persistence semantics.
5. `docs/NEXUS_PHASE_17_CLOUD_PROVIDER_ADAPTER_BOUNDARY.md` before provider-adapter work.
6. `docs/NEXUS_PHASE_16_CLOUD_PERSISTENCE_BOUNDARY.md` before persistence proposals.
7. `docs/NEXUS_PHASE_15_CLOUD_FOUNDATION_RECONCILIATION.md` before Cloud/File Loader routing.
8. `docs/NEXUS_PHASE_14_AUTH_IDENTITY_RECONCILIATION.md` before auth/session/Person binding.
9. `docs/NEXUS_PHASE_13_OBJECT_CARD_V1_FOUNDATION.md` before creating another card/object model.
10. `docs/NEXUS_PHASE_12_PR_INTEGRATION_AUDIT.md` before using historical PRs.
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
- Phase 16 — provider-confirmed write -> canonical persistence proposal.
- Phase 17 — server-only provider write-plan boundary with truthful capability gating.
- Phase 18 — storage records in Project Memory + atomic/idempotent semantic commit.
- Phase 19 — existing PostgreSQL/Drizzle DB schema + transactional Cloud persistence adapter prepared; schema not pushed to a live DB.

## Core architecture rules

### Project Memory / Project Worlds

Nexus is a continuously updated Project Memory + Relationship Graph.

PR #90 fixture data remains e-SAFE Catania only. This is fixture scope, not a product limitation. Future projects/worlds are dynamic canonical records.

The legacy public Relationship Tree may still show Riverside; that does not make Riverside a #90 fixture.

### Object Card v1

`Object Card = Project Memory projection`

Material/Product/Asset/Component/Equipment are typed profiles of one shared card model. Person and Company retain dedicated identity/participation semantics.

### Auth/access

`authentication -> exact identity binding -> Project Participation -> explicit permission/policy decision`

Rules:

- provider subject != canonical Person ID;
- authenticated but unbound -> deny;
- no email/name fuzzy identity binding;
- active participation alone != permission;
- explicit allow is required under current #90 policy;
- explicit deny wins;
- auth/session/runtime never self-grants project access.

Historical #54-#61 remains donor runtime/persistence work; do not build a second auth implementation.

## Cloud foundation

### Phase 15 — routing

Exact canonical `projectId + worldId` is mandatory.

Semantic target roles only:

- `00_INBOX`
- `01_PENDING_GRAPH_LINK`
- `02_BY_TRADE`
- `03_BY_TYPE`
- `99_AUDIT`

These are not provider folder IDs.

### Phase 16 — persistence proposal

Sequence:

`pending asset -> cloud.file.write allow -> provider receipt -> canonical persistence proposal`

Proposal includes File record, canonical File object, provider reference, storage record, audit event, attach-file action and stable idempotency key. It does not mutate Project Memory itself.

### Phase 17 — provider adapter boundary

A real provider write plan requires truthful connector capability:

- exact `cloud.file.write` access;
- `LIVE` connector lifecycle;
- integration level >= 5 / CONTROLLED_TWO_WAY_API;
- declared File write support;
- connected account;
- explicit account write scope;
- server-side secret reference;
- exact enabled project/world/semantic-target mapping.

No browser credential authority and no automatic Project Graph mutation.

Google Drive catalogue contract currently remains reference/deep-link, not a live write capability. `canUpdateProjectGraph: false`.

### Phase 18 — atomic semantic commit

`all canonical Cloud records together or none`

Exact replay -> `ALREADY_COMMITTED`.
Partial state, changed identity or provider-object collision -> fail closed.

`storageRecords` are now part of `NexusProjectMemorySnapshot`.

### Phase 19 — PostgreSQL / Drizzle persistence

Authority:

`docs/NEXUS_PHASE_19_POSTGRES_CLOUD_PERSISTENCE.md`

Existing stack confirmed:

- `@workspace/db`;
- PostgreSQL through `DATABASE_URL`;
- Drizzle ORM;
- API server already depends on this DB package.

No second database technology was introduced.

New schema:

`lib/db/src/schema/nexusProjectMemoryCloud.ts`

Tables:

- `nexus_pm_files`
- `nexus_pm_canonical_objects`
- `nexus_pm_external_references`
- `nexus_pm_storage_records`
- `nexus_pm_audit_events`
- `nexus_pm_cloud_commits`

New transaction adapter:

`lib/db/src/nexusCloudPersistence.ts`

Package export:

`@workspace/db/nexus-cloud-persistence`

Function:

`persistNexusCloudCommit(input)`

Behaviour:

- uses one PostgreSQL transaction;
- exact idempotent replay returns `ALREADY_COMMITTED`;
- mismatched idempotency key reuse fails;
- duplicate provider object fails;
- DB unique constraints protect canonical/provider/storage identities;
- File + canonical object + external reference + storage + audit + commit ledger are inserted together;
- any failed insert/constraint rolls back the transaction.

The old `demo_files` table is NOT Nexus Cloud. It is an explicitly unauthenticated demo binary-storage surface and remains separate.

Important: Phase 19 schema has NOT been applied to any live database. Do not run `drizzle-kit push` until the exact `DATABASE_URL` environment is identified and confirmed safe.

A local tool-runtime clone/typecheck attempt could not run because the runtime had no DNS access to github.com. Do not claim a local TypeScript PASS for Phase 19. Draft PR CI may also be skipped by policy.

## Historical donor map

- Relationship Tree: `#15 -> #35 -> #42 -> #45`, plus #86/#49/#24/#26/#40 donors; #46 freeze.
- Work Wallet client: `#18 -> #52 -> #63`.
- Auth/runtime: `#54 -> #55 -> #56 -> #57 -> #58 -> #59 -> #60 -> #61`.
- Nexus Cloud: `#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`; #73 strict routing donor.
- BIM/IFC/WorkSuite: `#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87`.
- Android: #41, #44/#85 and #27 remain separate native lines.

Do not bulk-merge donor stacks.

## Protected surfaces

Do not touch from #90 foundation work unless explicitly requested:

- PR #91 Spark demo/card/runtime;
- `NOSMO-website` live Relationship Tree;
- stable Person Card;
- Android/APK / Work Mode runtime;
- BIM runtime;
- DoorFlow / Fire Door Register runtime;
- live Google Drive contents;
- historical donor branches except explicit reconciliation.

## Correct next controlled sequence

1. Re-check #90 before every write; keep #91 frozen.
2. Identify the existing DB environments / `DATABASE_URL` target without exposing credentials.
3. Choose a safe non-production DB for the first Phase 19 schema application.
4. Inspect Drizzle schema diff before applying.
5. Apply schema only to the confirmed non-production DB.
6. Run DB smoke cases: COMMITTED, exact retry, idempotency conflict, provider conflict, forced rollback.
7. After durable persistence passes, add separate authorised/audited graph-link persistence.
8. Then realtime invalidation/offline retry.
9. Reconcile real Google Drive write only after truthful PKG-004 capability + server credentials are explicitly released.
10. Reconcile Work Wallet without duplicating its runtime.
11. Migrate Relationship Tree deliberately into source-native #90.
12. Port BIM/IFC/WorkSuite later in modular slices.
13. Audit Android separately.

## Core principle

Cloud routing determines the semantic destination.
Provider planning proves current access/capability/config permits an attempt.
Provider receipt proves external storage succeeded.
Phase 18 defines canonical all-or-none semantics.
Phase 19 makes those semantics durable in the existing PostgreSQL database.
Project Graph linking remains a separate authorised relationship decision.
