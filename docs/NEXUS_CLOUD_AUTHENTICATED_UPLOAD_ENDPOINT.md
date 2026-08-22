# Nexus Cloud authenticated upload endpoint

## Status

This slice source-composes the authenticated Nexus backend upload path from canonical identity/access through the existing Google Drive writer and into the Phase 19 Project Memory transaction.

It is **not** evidence that Google Drive is live in a Nexus deployment.

Current truthful status:

> Authenticated backend upload path implemented; File Loader and Android Work Mode use separate server-owned provenance routes over one shared authority/provider/persistence pipeline. Real end-to-end execution remains blocked until server OAuth, a confirmed Nexus runtime database, schema/bootstrap data and a real runtime smoke are available.

No PR #91 / Spark Demo surface is changed.

## Endpoints and provenance

File Loader:

`POST /api/nexus/cloud/files`

Server-owned provenance:

`sourceModule = file-loader`

Android Work Mode:

`POST /api/nexus/cloud/android/files`

Server-owned provenance:

`sourceModule = android-work-mode`

Both routes use the same internal handler, canonical access resolution, semantic routing, Drive writer and Project Memory persistence path. The caller does **not** submit `sourceModule` in the body or headers.

Transport: `multipart/form-data`

Required:

- file field: `file`;
- body: `projectId`;
- body: `worldId`;
- header: `Idempotency-Key` (16-200 chars, restricted safe character set).

Optional:

- `classification`: `inbox | pending_graph_link | classified_by_trade | classified_by_type | audit_only`;
- `tradeId` when trade classification requires it.

The client does **not** supply source-module provenance, Drive folder/path, connector authority, OAuth/secret values, canonical Person ID, participation, permission grant or access decision.

Maximum binary size is 25 MiB.

Successful canonical commit responses echo the server-selected `sourceModule`. Android Work Mode requires `android-work-mode` in that receipt before it may transition local evidence to `TRANSFER_CONFIRMED`.

## Request authority sequence

`mutation origin gate`

-> `authenticated session / workspace`

-> `exact provider subject -> canonical Person binding`

-> exact ProjectParticipation + PermissionGrant

-> canonical `cloud.file.write`

-> server-owned source provenance

-> semantic Project/ProjectWorld Cloud routing

-> server-only provider mapping

-> Phase 17 provider write plan

-> PR #93 Google Drive writer

-> provider-confirmed receipt

-> Phase 16 canonical persistence proposal

-> PR #97 DB input bridge

-> Phase 19 PostgreSQL transaction.

Participation alone grants nothing. Exact explicit allow is required and explicit deny wins.

## CSRF / mobile boundary

Cookie-authenticated browser writes require exact same-origin. Production requires `NEXUS_PUBLIC_ORIGIN`.

Cross-site requests are rejected before workspace resolution.

Explicit Bearer session transport remains available for authorised native/mobile clients. Tokens never appear in URL provenance or route selection.

## Server-only Drive runtime mapping

Runtime mapping remains in `NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON` and contains semantic project/world -> provider target mapping plus a `NEXUS_SECRET_*` reference, never OAuth credential values.

A mapping is not LIVE merely because it exists. `writeEnabled: true` and a valid operator `verifiedAt` timestamp are required, and the Drive writer independently verifies OAuth/target access on the real provider request.

## One Drive writer

The API server still delegates to the single existing writer:

`scripts/src/nexus-cloud-google-drive-adapter.mjs`

No second OAuth or Drive network implementation was created for Android.

## Idempotency and recovery

The client supplies one logical `Idempotency-Key`.

The server derives provider operation identity from:

`workspaceId + projectId + worldId + Idempotency-Key`.

The same operation deterministically produces `pendingAssetId`, `accessDecisionId` and provider idempotency identity.

Reusing a logical operation with changed content or changed semantic target/folder is rejected before another sequential provider create. Within one server process, same-operation requests are serialized and waiters re-run fingerprint validation.

If Drive succeeds but Project Memory persistence fails, the endpoint returns `PROVIDER_WRITTEN_PERSISTENCE_FAILED`, preserves the real `driveFileId`, reports the operation as recoverable and requires retry with the same idempotency key. It never reports a canonical commit in that state.

## Remaining concurrency boundary

Cross-instance atomic exclusion is **not yet claimed**.

An autoscaled runtime still requires a durable PostgreSQL write-operation ledger/lease before production release so two separate server instances cannot begin the same provider create concurrently.

## Prepared validation

The branch prepares:

- source topology/provenance validation for File Loader and Android server-owned routes;
- stable operation identity smoke;
- server runtime mapping/release-gate smoke;
- Drive mock-provider smoke including changed-target conflict;
- disposable CI PostgreSQL schema push only;
- cross-site mutation rejection and unauthenticated same-origin rejection.

These are prepared checks, not a PASS claim until Actions reaches runner steps.

## External blockers for real E2E

1. server-side Google OAuth refresh-token secret for the pilot Drive owner;
2. confirmed `nosmo-nexus-mvp` PostgreSQL runtime DB, not the unrelated Data Fetcher DB;
3. reviewed schema application plus controlled canonical Person/binding/participation/exact Cloud allow bootstrap;
4. released server target mapping;
5. durable cross-instance operation ledger;
6. real authenticated File Loader + Android uploads returning real `driveFileId` and COMMITTED Project Memory transaction;
7. provider-success/DB-failure recovery smoke.

## Explicit non-goals

No Project Graph mutation, UI redesign, Work Wallet/BIM/IFC/FabStation change, Android UI change, DoorFlow/Electrical/Person Card change, PR #91 change, deployment or production DB migration is performed by this slice.
