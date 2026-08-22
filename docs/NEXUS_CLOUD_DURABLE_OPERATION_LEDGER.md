# Nexus Cloud durable provider operation ledger

Status: source-complete slice; no production deployment or live Google Drive E2E is claimed.

## Why this slice exists

PR #125 introduced the authenticated Nexus Cloud upload pipeline and already had:

- exact canonical session/Person/Project access;
- provider-neutral Cloud routing;
- one server-only Google Drive writer;
- provider receipt -> canonical Project Memory transaction;
- provider-side idempotency and one-process in-flight serialization.

That was not enough for an autoscaled API runtime. Two API instances could still race between the HTTP request and the external provider write.

This slice adds a PostgreSQL operation ledger before the provider call so one canonical provider write identity has one durable lease at a time across all API instances sharing the database.

## State machine

Table:

`nexus_pm_cloud_write_operations`

States:

1. `PENDING_PROVIDER`
   - operation exists;
   - one instance may hold a time-bounded lease;
   - no provider success has been durably confirmed yet.

2. `PROVIDER_CONFIRMED`
   - Google Drive success is known;
   - real provider object ID and provider receipt are stored;
   - Project Memory commit may still be pending.

3. `PERSISTENCE_FAILED`
   - provider success is retained;
   - a canonical Project Memory proposal/transaction failed;
   - retry must reuse the stored provider receipt instead of creating another Drive file.

4. `COMMITTED`
   - provider success and canonical Project Memory persistence are both complete;
   - final retry returns the already committed canonical File identity.

## Durable identity and conflict rules

Each operation freezes:

- `workspaceId`;
- `projectId`;
- `worldId`;
- provider connector;
- provider write identity;
- request fingerprint.

The provider write identity is derived from the exact canonical workspace/project/world plus the client `Idempotency-Key`. It is unique in PostgreSQL.

The request fingerprint includes the semantic classification/target, provider mapping, file name, MIME type, size and SHA-256 content checksum. Reusing one provider write identity with different content or scope fails closed before a provider write.

A provider object is also unique per workspace + connector + provider object ID, preventing the same Google Drive object from being attached to two Cloud write operations.

## Cross-instance lease

`acquireNexusCloudWriteLease(...)` is called before Google Drive.

Possible results:

- `ACQUIRED` — this instance may perform/recover the provider write;
- `BUSY` — another unexpired lease owns the operation; HTTP returns `OPERATION_IN_PROGRESS` plus `Retry-After`;
- `PROVIDER_CONFIRMED` — do not call Drive again; reuse the stored provider receipt;
- `ALREADY_COMMITTED` — do not call Drive or Project Memory again.

A crashed `PENDING_PROVIDER` lease can be atomically reclaimed only after expiry and only when the exact stored operation identity/request fingerprint still matches.

## Provider deadline versus lease

Current constants:

- Google provider operation deadline: 90 seconds;
- durable provider lease: 120 seconds.

The 90-second `AbortSignal` is shared by OAuth exchange, target verification, provider replay lookup and `files.create`. The remaining lease window is reserved for durable receipt confirmation.

If a provider request times out after Google may already have created the file, the next request reacquires the operation lease and the existing PR #93 writer searches its private Drive write identity before another create. Exact existing provider state is returned as an idempotent replay.

## Provider success before Project Memory

After Google returns a real provider object ID, Nexus must first persist:

- `providerObjectId`;
- full bounded provider receipt;
- `PROVIDER_CONFIRMED` state.

Only then does the route build the Phase 16 canonical persistence proposal and run the Phase 19 Project Memory transaction.

This preserves recoverability for:

`Drive OK -> API crash -> retry`.

## Failure semantics

### Provider call fails before confirmed success

The lease is released best-effort. If the release cannot be stored, normal lease expiry remains the recovery path.

Response is not a success.

### Drive succeeds but ledger confirmation fails

Response:

`PROVIDER_WRITTEN_LEDGER_CONFIRMATION_FAILED`

The response explicitly states provider success is possible/known and Project Memory is not committed. Retry must use the same `Idempotency-Key` after lease recovery. The Drive writer's provider idempotency lookup remains the recovery path.

### Drive succeeds but Project Memory fails

Ledger moves to `PERSISTENCE_FAILED` when possible and retains the provider receipt.

Retry does not call Drive. It rebuilds the canonical proposal from the stored receipt and retries the Project Memory transaction.

### Project Memory commits but ledger finalization fails

Response:

`PROJECT_MEMORY_COMMITTED_LEDGER_FINALIZATION_FAILED`

This is not reported as a clean end-to-end success. On retry, Phase 19 exact idempotency returns `ALREADY_COMMITTED`; the operation ledger can then transition to `COMMITTED`.

## Graph boundary

Storage/persistence success still does not mutate Project Graph.

`projectGraphMutationPerformed` remains `false`.

Graph linking requires a separate authorised action.

## Validation prepared

Source validator:

`node scripts/src/validate-nexus-cloud-durable-operation-ledger.mjs`

It asserts:

- unique provider write identity;
- provider object uniqueness;
- state-machine presence;
- durable lease/reclaim path;
- exact request fingerprint conflict handling;
- provider receipt is persisted after Drive and before Project Memory;
- stored-receipt recovery bypasses a second Drive call;
- HTTP route uses the durable seam, not the Drive writer directly;
- provider deadline remains shorter than lease;
- disposable PostgreSQL smoke is wired into CI.

Disposable PostgreSQL smoke:

`lib/db/src/nexusCloudWriteOperationSmoke.ts`

Prepared cases:

- first instance acquires lease;
- concurrent second instance receives `BUSY`;
- same identity + changed fingerprint conflicts;
- expired lease is reclaimed;
- provider receipt is recovered;
- persistence-failed receipt is recovered;
- final committed retry returns `ALREADY_COMMITTED`.

The workflow applies schema only to job-local PostgreSQL:

`postgresql://postgres:postgres@127.0.0.1:5432/nexus_cloud_ci`

No deployment or external database schema is applied by this slice.

## Current validation truth

Repository GitHub Actions have repeatedly failed before the first runner step (`steps=null`). Therefore:

- source validator: IMPLEMENTED / CI EXECUTION NOT YET PROVEN;
- PostgreSQL ledger smoke: IMPLEMENTED / CI EXECUTION NOT YET PROVEN;
- workspace typecheck/build: NOT CLAIMED PASS for this slice;
- real Google Drive write: NOT RUN;
- production autoscale readiness: NOT CLAIMED.

## Remaining gates for real Nexus Cloud E2E

1. provision a server-only Google OAuth refresh-token secret for the My Drive owner;
2. identify the exact safe `nosmo-nexus-mvp` non-production/runtime PostgreSQL database;
3. inspect/apply the canonical identity/access/Cloud/operation-ledger schemas there;
4. bootstrap one controlled canonical Person binding + exact Project Participation + explicit `cloud.file.write` allow;
5. release exact server project/world/semantic-role -> Drive target configuration;
6. run one authenticated multipart upload and capture the real `driveFileId`;
7. verify Project Memory `COMMITTED` transaction and audit records;
8. force a post-provider persistence failure and verify same-key recovery without a second Drive file;
9. only after those pass, reconnect File Loader/Android clients to this endpoint without redesigning their UI.

## Protected surfaces

Unchanged by this slice:

- PR #91 Spark SKANSKA Demo Core;
- accepted Object Card;
- Relationship Tree UI/gestures;
- File Loader UI;
- Work Wallet behavior;
- BIM/IFC/FabStation;
- Android UI;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI.

Do not auto-merge or deploy this slice.
