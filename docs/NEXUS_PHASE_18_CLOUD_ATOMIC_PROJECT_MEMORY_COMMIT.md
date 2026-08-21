# NOSMO Nexus — Phase 18 Cloud Atomic Project Memory Commit

Status: foundation transaction semantics only. No database/provider runtime is introduced.

## Purpose

Phase 18 closes the gap between the Phase 16 persistence proposal and canonical Project Memory.

The rule is:

`provider-confirmed Phase 16 proposal -> validate current access/action -> atomic Project Memory commit -> invariant check`

A file persistence operation must either create all canonical Nexus records together or create none of them.

## Storage becomes Project Memory state

Phase 16 already produced a `NexusCloudStorageRecord`, but `NexusProjectMemorySnapshot` did not previously store storage records.

Phase 18 adds:

- `src/data/schemas/storage.schema.ts`;
- `storageRecords` to `NexusProjectMemorySnapshot`;
- `storageRecords: []` to `emptyProjectMemorySnapshot()`;
- `src/data/projectMemoryStorageInvariants.ts`;
- `src/core/storage/cloudProjectMemoryCommit.ts`.

`src/core/storage/storageContract.ts` now re-exports the canonical storage schema instead of defining a second storage-record model.

This prevents storage metadata from becoming a parallel source of truth outside Project Memory.

## Atomic logical commit

`commitNexusCloudPersistenceProposal(...)` consumes:

- current `NexusProjectMemorySnapshot`;
- one ready Phase 16 `NexusCloudPersistenceProposal`.

A successful commit adds together:

1. `NexusFileRecord`;
2. canonical File object;
3. provider/external reference;
4. Nexus Cloud storage record;
5. `CLOUD_FILE_PERSISTED` Nexus audit event.

The input snapshot is not mutated. A new snapshot is returned only after validation succeeds.

This is an in-memory transaction contract, not yet a database transaction.

## Access revalidation

Commit re-checks that the referenced access decision still exists in Project Memory and is:

- `allowed`;
- bound to a resolved Person;
- scoped to the exact project/world;
- `moduleId: cloud`;
- `actionKey: cloud.file.write`.

It also validates the canonical `attach-file-to-project` action against the Project Memory action policy.

## Idempotency

Phase 16 creates deterministic record IDs and an idempotency key.

Phase 18 uses the deterministic record identities to guarantee retry behaviour:

### Exact complete replay

If File, canonical object, external reference, storage record and audit event all already exist and their canonical identity fields match the proposal:

`ALREADY_COMMITTED`

No new records are added.

### Partial prior state

If only some proposal records already exist:

`PARTIAL_STATE_CONFLICT`

The commit fails closed and returns the original snapshot.

### Same IDs with different identity

If all IDs exist but identity fields differ:

`IDENTITY_CONFLICT`

The commit fails closed.

### Provider object already linked elsewhere

If the same provider + external object ID is already linked to another canonical Nexus object:

`PROVIDER_OBJECT_ALREADY_LINKED`

The commit fails closed.

## Project/world scope

Before mutation, the commit verifies:

- project exists;
- world exists;
- world belongs to that project;
- project registers that world;
- File/canonical/storage/audit records share one project/world scope;
- storage/external references point to the exact canonical File object.

## Storage invariants

`validateProjectMemoryStorage(...)` checks storage records separately because storage records are not `NexusBaseRecord` objects.

Checks include:

- storage ID cannot collide with another Project Memory record ID;
- storage object must reference a canonical Nexus object;
- Nexus Cloud storage must use a valid exact project/world pair;
- provider storage object key must exist;
- real storage connector ID must exist as a non-empty identifier;
- external-reference storage requires a real source connector ID;
- project-scoped external references must provide projectId/worldId together and consistently.

## Post-commit validation

Before a new snapshot is returned, Phase 18 runs:

- existing `validateProjectMemorySnapshot(...)`;
- new `validateProjectMemoryStorage(...)`.

If either report fails:

`POST_COMMIT_INVARIANT_FAILURE`

and the original memory snapshot is returned unchanged.

## Graph boundary remains separate

Phase 18 still does not create a Project Graph node or edge.

Storage persistence and graph linking remain distinct authorised/audited actions.

## Validation

A focused strict TypeScript compile of the Phase 18 storage-invariant and Cloud commit contracts against minimal dependency stubs completed successfully.

This validates isolated TypeScript contract structure. It is not a full repository build and does not prove database transaction behaviour.

## Not implemented

- database transaction;
- row-level locking;
- distributed idempotency store;
- provider API calls;
- Google Drive credentials;
- binary upload;
- graph linking;
- realtime invalidation;
- offline retry;
- production deployment.

## Next controlled step

The next persistence task is to define a database/storage adapter that implements these transaction semantics without changing the canonical contract:

- one DB transaction where supported;
- unique constraints for canonical/provider identity;
- idempotent retry;
- rollback on partial failure;
- no Project Graph mutation inside the storage transaction.

A real Google Drive adapter remains separately gated by truthful PKG-004 connector capability and server-side credential configuration.
