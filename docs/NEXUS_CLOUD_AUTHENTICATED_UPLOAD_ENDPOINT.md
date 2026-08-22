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

Server-owned provenance: `file-loader`.

Android Work Mode:

`POST /api/nexus/cloud/android/files`

Server-owned provenance: `android-work-mode`.

Both routes use one shared handler. The client cannot submit or override `sourceModule` in body or headers.

Required multipart inputs remain `file`, `projectId`, `worldId` and `Idempotency-Key`. Optional provider-neutral classification/trade metadata is unchanged. Maximum binary size remains 25 MiB.

Successful canonical commit responses echo the server-selected `sourceModule`. Android requires `android-work-mode` in that receipt before local `TRANSFER_CONFIRMED`.

## Authority path

`mutation origin/Bearer gate`

-> authenticated session/workspace

-> exact provider-subject -> canonical Person binding

-> exact ProjectParticipation + PermissionGrant

-> explicit `cloud.file.write`

-> server-owned source provenance

-> semantic Project/ProjectWorld routing

-> server-only provider mapping

-> Phase 17 provider write plan

-> existing PR #93 Drive writer

-> provider receipt

-> Phase 16 persistence proposal

-> PR #97 DB input bridge

-> Phase 19 PostgreSQL transaction.

Participation alone grants nothing and explicit deny wins.

## Provider / OAuth boundary

`NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON` remains server-only. It maps exact Project World semantic targets to provider folder IDs and references a `NEXUS_SECRET_*` secret; OAuth credential values are not client-visible.

A mapping is not LIVE merely because it exists. `writeEnabled: true`, a valid operator `verifiedAt`, actual OAuth success and provider target verification are still required.

The API server does not add a second Drive writer for Android. Both routes delegate to `scripts/src/nexus-cloud-google-drive-adapter.mjs`.

## Idempotency and recovery

The client supplies one logical `Idempotency-Key`; the server derives the provider operation identity from workspace/project/world plus that key.

The same operation deterministically produces `pendingAssetId`, `accessDecisionId` and provider idempotency identity. Reusing the operation with changed content or target is rejected before another sequential provider create.

If Drive succeeds but Project Memory persistence fails, the endpoint returns `PROVIDER_WRITTEN_PERSISTENCE_FAILED`, preserves the real `driveFileId`, marks the operation recoverable and requires retry with the same idempotency key. It never reports a canonical commit in that state.

## Remaining production concurrency boundary

Cross-instance atomic exclusion is **not yet claimed**. An autoscaled runtime still needs a durable PostgreSQL write-operation ledger/lease before production release.

## Prepared validation

The branch prepares source validation for both server-owned provenance routes, stable operation identity, runtime release gates, mock Drive replay/target drift, and disposable PostgreSQL/HTTP smoke checks.

These checks are not a PASS claim until GitHub Actions reaches runner steps.

## External blockers for real E2E

1. server-side Google OAuth refresh-token secret for the pilot Drive owner;
2. confirmed `nosmo-nexus-mvp` PostgreSQL runtime DB, not the unrelated Data Fetcher DB;
3. reviewed schema application plus controlled Person/binding/participation/exact Cloud allow bootstrap;
4. released server target mapping;
5. durable cross-instance operation ledger;
6. real authenticated File Loader and Android uploads returning real `driveFileId` plus COMMITTED Project Memory transactions;
7. provider-success/DB-failure recovery smoke.

## Protected surfaces

No PR #91, Object Card, Relationship Tree, File Loader UI, Android UI, Work Wallet, BIM/IFC/FabStation, DoorFlow, Electrical or Person Card redesign/deployment is performed by this slice.
