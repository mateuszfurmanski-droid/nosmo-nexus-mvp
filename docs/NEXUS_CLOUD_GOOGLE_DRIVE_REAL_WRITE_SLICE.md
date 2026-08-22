# NOSMO Nexus — Real Google Drive provider write slice

Status: integration slice stacked on PR #90. Real adapter code exists; live provider execution is blocked until a server-side OAuth credential is provisioned. No database schema push has been executed.

Base verified before branch creation and again before documentation write:

- PR #90: `codex/nexus-mvp-modular-foundation`
- base head: `35a6757ce19fe590754fb7ad13ed48a68cb51705`
- PR #91 Spark SKANSKA demo: protected and untouched

## Why this slice exists

PR #90 already provides the canonical Cloud sequence through Phase 19:

`project/world routing -> Pending Asset v2 -> access decision -> server-only provider write plan -> provider receipt -> canonical persistence proposal -> atomic/idempotent Project Memory transaction`

The missing provider side is a real binary write to Google Drive.

This slice adds that provider execution without copying the historical hardcoded Cloud system back into #90.

## Authentication decision

The current Nexus Cloud tree is in the connected user's My Drive rather than a Shared Drive. The current practical model is therefore:

`browser -> authenticated Nexus backend -> server-side OAuth refresh token -> Google Drive API`

The adapter does not support browser-side Drive credentials.

A service account is intentionally not selected for the current My Drive pilot. Google documents that service accounts do not have normal Drive storage quota / My Drive ownership semantics and should use Shared Drives or impersonate a user. A future Workspace Shared Drive deployment may use a different server-side credential resolver without changing the provider-neutral Nexus contracts.

## Secret boundary

The Phase 17 plan already carries a `secretReference`, never a token value.

The default runtime resolver accepts only references in the server namespace:

`NEXUS_SECRET_*`

For the current OAuth model, the referenced environment secret is JSON with this shape:

```json
{
  "type": "google-oauth-refresh-token/v1",
  "clientId": "SERVER_SECRET",
  "clientSecret": "SERVER_SECRET",
  "refreshToken": "SERVER_SECRET"
}
```

No credential value belongs in Git, browser configuration, Pending Asset metadata, provider target mappings or client responses.

## Provider writer

Implementation:

`scripts/src/nexus-cloud-google-drive-adapter.mjs`

The writer accepts only:

- an already-ready Phase 17 `NexusCloudProviderWritePlan`;
- server-side binary bytes;
- an idempotency key;
- an optional injected server secret resolver / HTTP transport for testing.

It rejects the request unless the plan confirms:

- provider is `google-drive`;
- operation is `create-file`;
- credential source is `server-secret-reference`;
- browser credentials are forbidden;
- provider confirmation is required;
- project, world, target role, connector account, target folder and filename are present.

The browser does not supply a Drive folder ID to this adapter. `providerTargetId` must already have been produced by the server-side canonical target mapping in Phase 17.

## Real Drive operation

For a live call the writer:

1. resolves the OAuth secret from the server secret reference;
2. exchanges the refresh token at Google's OAuth token endpoint;
3. GETs the configured Drive target and verifies that it is an active folder;
4. checks `capabilities.canAddChildren` when Google returns the capability;
5. searches the target folder for an existing Nexus write identity;
6. if there is an exact prior write, returns the existing provider object instead of creating a duplicate;
7. otherwise performs a Google Drive `files.create` multipart upload with metadata + binary content;
8. requires a real provider object ID in the response;
9. returns provider metadata plus a Phase 16-compatible `NexusCloudProviderWriteReceipt`;
10. performs no Project Memory mutation and no Project Graph mutation.

Returned provider identity remains external:

- `driveFileId` / `providerObjectId` = Google identity;
- canonical Nexus File identity remains the responsibility of the Phase 16/18/19 persistence path.

## Retry and recovery semantics

The adapter hashes the caller's idempotency key and records private Drive `appProperties` on the created file:

- Nexus write identity hash;
- request fingerprint;
- scope fingerprint.

Before a provider create, it searches the exact target folder for that write identity.

Outcomes:

- same key + same project/world/target/file/content -> existing Drive object is returned as `ALREADY_WRITTEN`;
- same key + different content or scope -> `NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_CONFLICT`;
- multiple provider objects for one identity -> fail closed as ambiguous;
- concurrent calls in one server process share an in-flight lock.

This gives a concrete recovery path for:

`Drive create succeeded -> Project Memory DB commit failed -> retry`

The retry can rediscover the same Drive object, return the same `providerObjectId`, and retry the canonical transaction instead of silently creating another binary.

Cross-instance atomic provider locking is not claimed yet. A durable server operation ledger is still required before horizontally scaled production deployment.

## Failure semantics

The writer fails explicitly for:

- plan not ready;
- wrong provider;
- browser credential boundary violation;
- secret absent/invalid;
- OAuth token exchange rejection;
- Drive network/provider rejection;
- target not a folder / trashed / not writable;
- binary missing or empty;
- size mismatch;
- checksum mismatch;
- idempotency conflict;
- ambiguous replay state;
- provider response without a Drive file ID.

It never converts these states into a false success.

## Controlled smoke

Mock-provider transport smoke:

`scripts/src/smoke/nexus-cloud-google-drive-adapter.mjs`

It covers:

- first provider create;
- real receipt shape with Drive ID;
- exact retry with no second provider create;
- idempotency conflict for changed content;
- provider mismatch denial;
- target-folder permission denial;
- no Project Memory or graph mutation.

This test is intentionally labelled `MOCK_PROVIDER_TRANSPORT`. It is not evidence of a real Google Drive write.

Guarded live smoke:

`scripts/src/smoke/nexus-cloud-google-drive-live.mjs`

It will not execute unless all of these are explicitly configured server-side:

- `NEXUS_CLOUD_GOOGLE_DRIVE_LIVE_SMOKE=1`;
- `NEXUS_CLOUD_GOOGLE_DRIVE_WRITE_PLAN_JSON`;
- `NEXUS_CLOUD_GOOGLE_DRIVE_SMOKE_IDEMPOTENCY_KEY`;
- the secret named by the Phase 17 plan.

A successful live smoke must return a real `driveFileId`. Until that happens, the integration must not be described as Google Drive integrated or production ready.

## Database safety

No `drizzle-kit push` was run.

A Replit PostgreSQL environment was found for a different repository (`nosmo-nexus-data-fetcher`). It is not a verified non-production database for `nosmo-nexus-mvp` and must not be used for Phase 19.

The current safe status for the #90 schema is therefore:

- schema design: prepared;
- transactional adapter: prepared;
- safe `nosmo-nexus-mvp` non-production `DATABASE_URL`: not identified;
- schema push: BLOCKED;
- live DB smoke: BLOCKED.

## Current status matrix

| Capability | Status | Evidence / boundary |
| --- | --- | --- |
| Provider-neutral project/world routing | PASS in #90 foundation | Phase 15 exact canonical scope |
| Server-only provider write-plan gate | PASS in #90 foundation | Phase 17 |
| Google Drive real writer implementation | IMPLEMENTED | This slice |
| Browser Drive credentials | FORBIDDEN | Adapter guard |
| Real Drive folder currently exists | PASS | Existing Nexus Cloud / e-SAFE folder structure |
| e-SAFE `00_INBOX` currently exists | PASS | Existing Drive structure |
| Mock adapter smoke | PENDING CI execution | Does not claim provider write |
| Live Google Drive binary create | BLOCKED | OAuth secret not provisioned in Nexus runtime |
| Real `driveFileId` from Nexus backend | BLOCKED | Same credential gate |
| Phase 16 receipt -> proposal | PASS in #90 contract | Existing foundation |
| Phase 19 transactional persistence code | PASS as prepared code | Existing foundation; DB not migrated |
| Safe #90 non-production database | BLOCKED | Not identified |
| DB schema push | BLOCKED | Must not run yet |
| Drive success -> DB retry recovery | IMPLEMENTED provider side / DB PENDING | Existing Drive object can be rediscovered |
| Cross-instance provider idempotency | PENDING | Requires durable server operation ledger |
| File Loader E2E bridge | PENDING | Must follow backend/provider + DB validation |
| Project Graph mutation | OUT OF SCOPE | Separate authorised action |
| PR #91 Spark demo | UNCHANGED | Protected |

## Next smallest slices

1. Execute CI mock adapter smoke and fix only this integration slice if needed.
2. Provision one server-side Google OAuth client/refresh token for the account that owns the current Nexus Cloud My Drive tree; store it only as a server secret.
3. Build one truthful LIVE connector definition/account + server target mapping for one controlled Project World / semantic role.
4. Run guarded live smoke and record the returned Drive file ID.
5. Identify/provision a dedicated non-production PostgreSQL database for `nosmo-nexus-mvp`.
6. Inspect and apply only the Phase 19 schema to that non-production DB.
7. Execute COMMITTED / replay / idempotency-conflict / provider-conflict / forced-rollback DB smokes.
8. Add the authenticated API-server orchestration endpoint that composes Phase 14/15/17 -> Drive writer -> Phase 16/19 transaction.
9. Only after the backend passes, connect the existing File Loader without redesigning it.
