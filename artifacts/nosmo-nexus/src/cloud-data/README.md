# Nexus Cloud Data Layer — slice 1

This package is the first source-native implementation slice for issue #48.

Canonical flow:

`capture/import -> storage provider -> Nexus asset metadata -> Project Graph link -> permission check -> realtime registry refresh`

## Current slice

- `NexusAsset`, `NexusFileMetadata` and `NexusAssetLink` contracts.
- Project participation / project function / scope permission resolver.
- Provider-neutral `NexusStorageProvider` boundary.
- `LocalDevNexusStorageProvider` backed by IndexedDB for development only.
- Durable browser-side offline upload queue backed by IndexedDB.
- Global File Loader bridge that listens for `nexus:file-upload-request`.
- Stable asset IDs derived from project scope + SHA-256 checksum.
- Registry refresh through localStorage, `storage` events, BroadcastChannel and Nexus custom events.

## Explicit boundary

The local-dev provider is not production cloud storage. It exists so the UI and modules bind to the provider-neutral contract instead of server-local folders or a vendor SDK.

The offline queue is a client-side durability layer for weak signal/mobile conditions. It preserves the selected file blob and upload context until the browser reports connectivity again, then retries through the same provider-neutral upload path. It is not a separate module storage system and it does not bypass the asset permission resolver.

Production providers must implement the same `NexusStorageProvider` interface for S3-compatible storage, Azure Blob, Microsoft 365 / SharePoint or a customer-owned storage estate.

Nexus owns metadata, Project Graph relationships, permissions and audit. Binary may live in a customer/provider storage account.

## Permission rule

Professional identity / qualification is not operational authority. Asset read/write/link/delete decisions resolve from active project participation, project function and exact project scope. Explicit deny wins.
