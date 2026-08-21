# NOSMO Nexus — Phase 16 Cloud Persistence Boundary

Status: persistence proposal contract implemented in PR #90. No real provider write or Project Memory mutation is implemented by this phase.

## Purpose

Phase 16 defines what must happen after a storage provider confirms that a file binary was successfully persisted.

The target sequence is:

`pending asset -> canonical access allow -> provider write receipt -> canonical persistence proposal -> transactional Project Memory commit`

This prevents provider-specific upload code from inventing its own file identity, graph link, audit model or permission rule.

## New contract

`src/core/storage/cloudPersistenceContract.ts`

Exported through `src/core/index.ts`.

## Required Cloud access decision

A provider receipt is not sufficient to create a canonical Nexus file.

The proposal requires a canonical `NexusAccessDecisionRecord` with:

- `result: allowed`;
- resolved `personId`;
- exact matching `projectId`;
- exact matching `worldId`;
- `moduleId: cloud`;
- `actionKey: cloud.file.write`.

Any mismatch fails closed.

This keeps Cloud aligned with Phase 14:

`authentication != identity != participation != permission`.

## Provider write receipt

A successful provider adapter must return an exact receipt containing:

- projectId;
- worldId;
- real provider connector ID;
- provider source-system identity;
- provider object ID;
- provider storage object key;
- persisted timestamp;
- optional external URL/revision;
- provider-confirmed MIME, size and checksum where available.

The receipt scope must match the pending asset scope exactly.

## Canonical persistence proposal

`createNexusCloudPersistenceProposal(...)` does not write data itself.

When all checks pass, it returns one deterministic proposal containing:

1. canonical `NexusFileRecord`;
2. canonical `NexusCanonicalObjectRecord` for the File;
3. provider `NexusExternalReferenceRecord`;
4. `NexusCloudStorageRecord`;
5. `CLOUD_FILE_PERSISTED` audit event;
6. canonical `attach-file-to-project` action;
7. stable idempotency key.

The proposal records:

`projectMemoryMutationPerformed: false`

because a future transactional persistence layer must commit these records together.

## Idempotency rule

Canonical file/proposal IDs derive from:

- provider connector ID;
- provider object ID;
- project ID;
- world ID.

Retrying the same confirmed provider object should therefore produce the same canonical proposal identity rather than creating duplicate Nexus files.

The future persistence implementation must enforce this idempotency atomically.

## Canonical file identity

The provider object ID is not the Nexus file ID.

Nexus creates and owns a stable canonical file identity.

Provider identity remains attached through:

- `storageConnectorId`;
- storage object key;
- external/provider reference;
- source record metadata.

This means a future provider migration does not require the rest of Nexus to treat a Google Drive/SharePoint/S3 object ID as the canonical project object ID.

## Provenance rule

When the provider source is externally verifiable, the File/canonical/reference proposal can carry `REAL` provenance with the provider record as source evidence.

Nexus/manual-only storage sources are not automatically upgraded to `REAL` merely because the proposal exists.

Provider receipt is evidence of persistence, not proof of the truth of every document field or document contents.

## Audit rule

A successful persistence proposal includes a dedicated audit event:

`CLOUD_FILE_PERSISTED`

The event records:

- actor Person;
- project/world;
- canonical file object;
- provider reference;
- timestamp;
- connector/source confirmation state.

The provider adapter must not silently create a file without this auditable Project Memory transition.

## Graph boundary

Phase 16 does not link the new file to graph objects automatically.

Graph candidates from the pending asset remain review/context hints until a separate authorised graph-link action occurs.

Storage success and Project Graph mutation are separate decisions.

## Google Drive boundary

Phase 16 is provider-neutral.

It does not:

- authenticate to Google Drive;
- call Google Drive API;
- write/move/delete a Drive object;
- choose a Drive folder ID;
- create browser credentials;
- alter live Drive contents.

A future server-side Google Drive adapter can satisfy this contract by returning a provider write receipt after mapping Phase 15 semantic target roles to configured Drive folders.

## Relation to PKG-004

Phase 16 does not declare that any connector has production write capability.

A future runtime must still check PKG-004 capability/source-of-record truth before attempting the provider write.

The persistence proposal only describes the canonical consequence after an authorised provider write is confirmed.

## Protected surfaces

Phase 16 does not modify:

- PR #91 Spark demo/card;
- live Relationship Tree;
- Person Card;
- Android/APK;
- BIM runtime;
- DoorFlow / Fire Door Register;
- historical Cloud branches;
- live Google Drive;
- auth/session runtime.

## Validation

A focused strict TypeScript compile was executed against the Phase 16 contract and minimal matching canonical schema stubs.

Result: PASS.

This is not a full repository build.

## Next controlled step

The next Cloud step is the provider adapter boundary, not a UI rewrite:

1. define server-side semantic target-role -> provider folder/object mapping;
2. require PKG-004 capability truth before write;
3. require Phase 14 canonical access before write;
4. obtain provider write receipt;
5. build Phase 16 persistence proposal;
6. commit proposal transactionally;
7. only then add graph-link/realtime/offline behavior.

PR #91 remains out of scope and must stay untouched.
