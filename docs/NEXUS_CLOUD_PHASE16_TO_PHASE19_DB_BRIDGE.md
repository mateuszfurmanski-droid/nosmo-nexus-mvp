# NOSMO Nexus — Phase 16 -> Phase 19 Cloud DB bridge

Status: pure persistence-input bridge implemented. No database mutation or schema push is performed by this slice.

Stack:

- PR #90 provides the canonical Phase 16 persistence proposal and Phase 19 PostgreSQL transaction adapter;
- PR #93 adds the real Google Drive provider writer slice;
- this slice is stacked on PR #93 and closes the structural gap between the Phase 16 proposal and `persistNexusCloudCommit(input)`.

PR #91 Spark SKANSKA demo remains protected and untouched.

## Existing gap

Before this slice:

- `createNexusCloudPersistenceProposal(...)` produced the canonical File, canonical object, external provider reference, storage record, audit event and idempotency key;
- `persistNexusCloudCommit(input)` accepted a `NexusCloudDbCommitInput` and committed all records transactionally;
- the Phase 19 smoke constructed `NexusCloudDbCommitInput` manually.

That manual construction is not an acceptable production composition boundary because it could accidentally reinterpret or mismatch canonical provider identity, project/world scope or storage identity.

## New bridge

Implementation:

`lib/db/src/nexusCloudPersistenceInput.ts`

Export:

`@workspace/db/nexus-cloud-persistence-input`

Function:

`createNexusCloudDbCommitInput(workspaceId, proposal)`

The function accepts the already-authorised Phase 16 proposal shape and returns the exact input consumed by `persistNexusCloudCommit(...)`.

It does not:

- perform Google Drive calls;
- resolve permissions;
- accept browser folder IDs;
- mutate Project Memory;
- mutate Project Graph;
- open a DB transaction;
- run migrations.

## Fail-closed invariants

Before materialising the transaction input, the bridge verifies:

1. valid positive runtime workspace ID;
2. pending asset ID exists;
3. access decision ID exists;
4. idempotency key exists;
5. File, canonical File object, storage record and audit event share the exact project/world;
6. external reference, storage record and audit event all point to the same canonical File object;
7. File and storage record agree on provider connector identity;
8. File and external reference agree on provider object identity;
9. File and storage record agree on storage object key;
10. audit event is `CLOUD_FILE_PERSISTED`;
11. audit provider object identity, where present, matches the external provider reference;
12. persisted timestamp is valid.

Any disagreement fails before `persistNexusCloudCommit` is called.

## Intended composition

Once the runtime auth/access and safe database gates are available, the server path becomes:

`confirmed Drive write receipt`

-> `createNexusCloudPersistenceProposal(pendingAsset, receipt, accessDecision)`

-> require `ready === true`

-> `createNexusCloudDbCommitInput(workspaceId, proposal)`

-> `persistNexusCloudCommit(input)`

-> `COMMITTED` or exact `ALREADY_COMMITTED`

The Google Drive object ID remains an external/provider identity throughout this path and never becomes the canonical Nexus File ID.

## Recovery semantics

PR #93 can rediscover an already-created Drive object for the same provider-write idempotency identity.

Therefore a partial failure can be recovered as:

`Drive write confirmed -> DB commit fails -> retry -> PR #93 returns existing Drive object -> Phase 16 recreates the same canonical proposal -> this bridge recreates the same DB input -> Phase 19 commit ledger commits or returns ALREADY_COMMITTED`.

No partial DB success is reported because Phase 19 remains one PostgreSQL transaction.

## Pure smoke

`lib/db/src/nexusCloudPersistenceInputSmoke.ts`

The smoke exercises no DB connection and no provider call. It verifies:

- valid canonical proposal -> exact DB input mapping;
- project/world mismatch fails;
- provider object mismatch fails;
- canonical object link mismatch fails;
- invalid workspace fails.

CI invocation uses the existing `tsx` tool from the scripts workspace, avoiding cross-root TypeScript imports and avoiding any new dependency/lockfile change.

## Database safety remains unchanged

No `drizzle-kit push` has been run.

No verified non-production `DATABASE_URL` for `nosmo-nexus-mvp` has been identified.

The PostgreSQL database found in the Replit `Nexus Data Fetcher` app belongs to the different `nosmo-nexus-data-fetcher` repository and is not used.

Therefore:

- DB input bridge: IMPLEMENTED;
- Phase 19 transaction adapter: PREPARED in #90;
- schema push: BLOCKED;
- live DB smoke: BLOCKED;
- real Project Memory commit: BLOCKED until a dedicated safe non-production database exists.

## Auth/access gate remains unchanged

The current authenticated API server resolves a Replit session/user and workspace, but the canonical runtime adapter for:

`IdentityBinding -> Person -> Project Participation -> explicit permission grant / explicit deny -> NexusAccessDecisionRecord`

is not implemented in #90 yet.

This slice does not weaken that requirement. A future Cloud write endpoint must fail closed until it can obtain the canonical #90 access decision server-side.

## Protected surfaces

No changes to:

- PR #91;
- Object Card;
- Relationship Tree;
- File Loader UI;
- Work Wallet;
- BIM/IFC;
- FabStation;
- Android Work Mode;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI.
