# Nexus Cloud Data Layer — slice 1

This package is the first source-native implementation slice for issue #48.

Canonical flow:

`capture/import -> storage provider -> Nexus asset metadata -> Project Graph link -> permission check -> realtime registry refresh`

## Current slice

- `NexusAsset`, `NexusFileMetadata` and `NexusAssetLink` contracts.
- Project participation / project function / scope permission resolver.
- Provider-neutral `NexusStorageProvider` boundary.
- `LocalDevNexusStorageProvider` backed by IndexedDB for development only.
- `NexusApiStorageProvider` for production-style browser-to-Nexus-API uploads.
- Runtime provider resolver controlled by `VITE_NEXUS_STORAGE_MODE`.
- Existing `scripts/src/serve-nexus.mjs` now exposes the first server-side Cloud Storage API boundary.
- Durable browser-side offline upload queue backed by IndexedDB.
- Global File Loader bridge that listens for `nexus:file-upload-request`.
- Stable asset IDs derived from project scope + SHA-256 checksum.
- Registry refresh through localStorage, `storage` events, BroadcastChannel and Nexus custom events.

## Explicit boundary

The local-dev provider is not production cloud storage. It exists so the UI and modules bind to the provider-neutral contract instead of server-local folders or a vendor SDK.

The Nexus API provider is the browser-side boundary for S3-compatible, Azure Blob, Microsoft 365 / SharePoint or custom storage. The browser sends the asset blob and metadata to Nexus API endpoints; it does not import vendor SDKs, hold storage credentials, or generate provider-specific object paths itself. The server-side Nexus adapter must enforce permission, write audit, choose the concrete provider and return a `NexusStorageObjectRef`.

The current server route is still a development boundary, not a production cloud adapter. It validates SHA-256 checksum and size, returns canonical storage references and keeps binary in process memory for smoke/demo only. The next backend slice must replace that in-memory object store with a configured S3-compatible or Azure Blob adapter while preserving the same API and metadata contracts.

The offline queue is a client-side durability layer for weak signal/mobile conditions. It preserves the selected file blob and upload context until the browser reports connectivity again, then retries through the same provider-neutral upload path. It is not a separate module storage system and it does not bypass the asset permission resolver.

Production providers must implement the same `NexusStorageProvider` interface for S3-compatible storage, Azure Blob, Microsoft 365 / SharePoint or a customer-owned storage estate.

Nexus owns metadata, Project Graph relationships, permissions and audit. Binary may live in a customer/provider storage account.

## Runtime switch

Default development mode stays local-only:

```bash
VITE_NEXUS_STORAGE_MODE=local-dev
```

Production-style browser boundary:

```bash
VITE_NEXUS_STORAGE_MODE=nexus-api
VITE_NEXUS_STORAGE_PROVIDER_KIND=s3-compatible # or azure-blob / microsoft-365 / custom
VITE_NEXUS_STORAGE_API_BASE_PATH=/api/nexus/cloud-storage
```

Optional development API key support:

```bash
VITE_NEXUS_STORAGE_API_KEY=<browser-sent-dev-key>
NEXUS_CLOUD_STORAGE_API_KEY=<server-expected-dev-key>
```

The browser key is only a development smoke gate. Production authorization must come from authenticated Nexus identity, Project participation, project function and scope on the server.

UI/modules do not change when this switch changes. Only the provider resolver changes the implementation behind `NexusStorageProvider`.

## Server API boundary

The first server boundary is wired into the existing Nexus server entrypoint, not a second server:

- `GET /api/nexus/cloud-storage/status`;
- `POST /api/nexus/cloud-storage/objects`;
- `GET /api/nexus/cloud-storage/objects?projectId=...&assetId=...&fileId=...&objectKey=...`;
- `DELETE /api/nexus/cloud-storage/objects?projectId=...&assetId=...&fileId=...&objectKey=...`.

`POST` sends the raw blob as the request body and the metadata envelope in `X-Nexus-Storage-Metadata`. The server recomputes SHA-256 and rejects size/checksum mismatches.

## Permission rule

Professional identity / qualification is not operational authority. Asset read/write/link/delete decisions resolve from active project participation, project function and exact project scope. Explicit deny wins.
