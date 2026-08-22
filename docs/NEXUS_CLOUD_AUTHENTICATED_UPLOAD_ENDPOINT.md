# Nexus Cloud authenticated upload endpoint

## Status

This slice source-composes the first authenticated Nexus backend upload path from canonical identity/access through the real Google Drive writer and into the existing Phase 19 Project Memory transaction.

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

The client does **not** supply:

- source-module provenance;
- Drive folder ID;
- Drive path;
- connector definition/account ID;
- OAuth token;
- OAuth client ID/secret;
- refresh token;
- server secret reference;
- canonical Person ID;
- Project Participation;
- permission grant;
- access decision.

Maximum binary size in this first endpoint is 25 MiB.

Successful responses echo the server-selected `sourceModule` so native clients can fail closed if the wrong provenance route is ever reached.

## Request authority sequence

The mounted path is:

`mutation origin gate`

-> `authenticated session / workspace`

-> `exact provider subject -> canonical Person binding`

-> `exact workspace/person/project/world ProjectParticipation + PermissionGrant`

-> canonical `cloud.file.write` access decision

-> server-owned source provenance

-> Project/ProjectWorld semantic Cloud routing

-> server-only provider mapping

-> Phase 17 provider write plan

-> PR #93 Google Drive writer

-> provider-confirmed Drive receipt

-> Phase 16 canonical persistence proposal

-> PR #97 DB input bridge

-> Phase 19 PostgreSQL transaction.

Active Project Participation alone does not grant the write. Exact explicit allow is required and explicit deny wins.

## CSRF / mobile transport boundary

Cookie-authenticated browser writes require an exact same-origin request. In production `NEXUS_PUBLIC_ORIGIN` must be configured.

Cross-site requests are rejected before workspace resolution.

The existing explicit Bearer session transport remains available for authorised native/mobile clients; the endpoint does not put a token in a URL.

## Server-only Drive runtime mapping

Environment name:

`NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON`

Shape:

```json
{
  "schema": "nexus-cloud-google-drive-runtime/v1",
  "writeEnabled": true,
  "verifiedAt": "<ISO-8601 operator verification timestamp>",
  "connectorDefinitionId": "<canonical connector definition id>",
  "connectorAccountId": "<canonical connector account id>",
  "tenantId": "<Nexus tenant id>",
  "secretReference": "NEXUS_SECRET_GOOGLE_DRIVE_OAUTH",
  "projects": [
    {
      "projectId": "<canonical Nexus project id>",
      "worldId": "<canonical Nexus world id>",
      "targets": {
        "00_INBOX": "<provider folder id>",
        "01_PENDING_GRAPH_LINK": "<provider folder id>",
        "02_BY_TRADE": "<provider folder id>",
        "03_BY_TYPE": "<provider folder id>",
        "99_AUDIT": "<provider folder id>"
      }
    }
  ]
}
```

Folder IDs exist only in server runtime configuration, not in browser/native state and not as canonical Nexus identities.

World IDs must be globally unambiguous in this server routing index.

Merely providing a config is insufficient. `writeEnabled` must be exactly `true` and a valid `verifiedAt` timestamp must exist before the server materialises a LIVE level-5 write capability. This operator release still does not prove provider success: the writer separately verifies OAuth and the target folder for each write.

## OAuth secret

The `secretReference` must match the server namespace `NEXUS_SECRET_*`.

Expected value behind the reference:

```json
{
  "type": "google-oauth-refresh-token/v1",
  "clientId": "...",
  "clientSecret": "...",
  "refreshToken": "..."
}
```

The secret value is consumed only by the existing PR #93 server writer. It is never returned to the client or stored in this runtime mapping JSON.

## One Drive writer

The API server does not contain a second OAuth/Drive implementation.

It dynamically delegates to:

`scripts/src/nexus-cloud-google-drive-adapter.mjs`

Export:

`writeNexusCloudFileToGoogleDrive(...)`

That writer remains responsible for:

- refresh-token exchange;
- Drive target verification;
- private `appProperties` write identity;
- provider replay lookup;
- multipart Drive `files.create`;
- real provider object ID / receipt.

## Idempotency and recovery

The client supplies one logical `Idempotency-Key`.

The server derives a provider identity from:

`workspaceId + projectId + worldId + Idempotency-Key`.

The raw client key is not forwarded as the provider write identity.

The same derived operation also deterministically produces:

- `pendingAssetId`;
- `accessDecisionId`.

This is required because Phase 19 exact replay compares those IDs.

The Drive writer searches the accessible Drive namespace for its private write identity rather than searching only the currently requested folder. Therefore a reused key with changed content or changed semantic target/folder is rejected before another `files.create` in sequential execution.

Within one server process, concurrent requests for the same provider write identity are serialized. A waiter re-runs provider fingerprint validation after the leader completes, so it cannot blindly inherit a success for changed content/target.

### Drive success, DB failure

If Drive confirms the file but Project Memory persistence fails, the endpoint does not return fake success.

It returns:

`PROVIDER_WRITTEN_PERSISTENCE_FAILED`

with:

- `providerWriteConfirmed: true`;
- real `driveFileId`;
- `projectMemoryCommitted: false` where applicable;
- `retryWithSameIdempotencyKey: true`;
- `recoverable: true`.

On retry the Drive writer can rediscover the provider object, then the same stable canonical proposal/Phase 19 input can be retried.

## Remaining concurrency boundary

Cross-instance atomic exclusion is **not yet claimed**.

The proposed Nexus runtime uses autoscaling, so two separate server instances could theoretically begin the same provider write before either Drive object becomes discoverable.

Before production release the next controlled slice must add a durable PostgreSQL write-operation ledger/lease keyed by the canonical provider operation identity. It must acquire authority before the external Drive create and retain recovery state after provider confirmation.

Until that durable ledger is implemented and tested, these endpoints remain integration source, not production-ready Cloud write authority.

## Prepared validation

The branch prepares:

- source topology/provenance validator for File Loader and Android server-owned routes;
- pure stable-operation-ID smoke;
- pure server runtime mapping/release-gate smoke;
- existing Drive mock-provider smoke, including changed-target conflict;
- disposable PostgreSQL schema push in GitHub Actions only;
- HTTP smoke: cross-site Cloud POST -> 403 before workspace;
- HTTP smoke: same-origin unauthenticated Cloud POST -> 401.

These tests are **prepared**, not reported as PASS until GitHub Actions actually reaches runner steps.

## External blockers

Still required for a real E2E PASS:

1. server-side Google OAuth refresh-token secret for the account owning the current My Drive pilot;
2. a confirmed `nosmo-nexus-mvp` runtime PostgreSQL database (not the unrelated Data Fetcher DB);
3. schema application and controlled canonical Person/binding/participation/exact Cloud allow bootstrap;
4. server-only target config populated from verified Drive structure and explicitly released;
5. durable cross-instance operation ledger;
6. real authenticated File Loader and Android uploads returning real `driveFileId` values and COMMITTED Project Memory transactions;
7. retry smoke for provider success / DB failure recovery.

## Explicit non-goals

These endpoints do not:

- mutate Project Graph;
- redesign File Loader UI;
- change Relationship Tree;
- change Object Card;
- change Work Wallet semantics;
- change BIM/IFC/FabStation;
- change Android UI;
- change DoorFlow/Electrical/Person Card;
- deploy or migrate a production database.
