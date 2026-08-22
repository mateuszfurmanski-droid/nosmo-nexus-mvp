# Nexus Cloud authenticated upload endpoint

Status: authenticated upload source is implemented, but no live Drive/DB E2E pass is claimed.

File Loader uses `POST /api/nexus/cloud/files` with server-owned `sourceModule=file-loader`.

Android Work Mode uses `POST /api/nexus/cloud/android/files` with server-owned `sourceModule=android-work-mode`.

Both routes share the same canonical path:

`origin/Bearer gate -> authenticated session/workspace -> exact canonical Person binding -> exact ProjectParticipation + PermissionGrant -> explicit cloud.file.write -> server-owned provenance -> semantic Project World routing -> server-only provider mapping -> existing PR #93 Drive writer -> provider receipt -> canonical persistence proposal -> Phase 19 Project Memory transaction`.

Clients cannot submit or override `sourceModule`, provider target IDs, OAuth credentials, secret references, canonical Person IDs or access decisions.

Successful canonical commit responses echo the server-selected `sourceModule`; Android requires `android-work-mode` before local `TRANSFER_CONFIRMED`.

The Cloud runtime still requires `NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON`, a released/verified provider mapping, server-side OAuth secret and a confirmed Nexus runtime PostgreSQL database. No unrelated Data Fetcher DB is used.

Idempotency remains scoped to workspace/project/world + client Idempotency-Key. Drive success followed by DB failure remains explicit and retryable with the same key. Cross-instance atomic exclusion is still not production-ready and needs a durable PostgreSQL operation ledger/lease.

Prepared validation covers both server-owned provenance routes, stable operation identity, runtime release gates, provider replay/target drift and disposable HTTP/DB smokes. Do not report PASS until Actions reaches actual runner steps.

Protected: PR #91, accepted Object Card, Relationship Tree, File Loader UI, Android UI, Work Wallet, BIM/IFC/FabStation, DoorFlow, Electrical and Person Card. No deployment or production schema migration is performed here.
