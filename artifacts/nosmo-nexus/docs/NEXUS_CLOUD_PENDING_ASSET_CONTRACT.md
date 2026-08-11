# Nexus Cloud Pending Asset Contract

Status: DRAFT / first File Loader boundary slice

Parent issue: #48  
Manifest issue: #64  
Stacked on: PR #66 / Google Drive Nexus Cloud manifest

## Purpose

This contract is the first safe File Loader boundary for Nexus Cloud.

Before any module uploads, classifies or graph-links a file, Nexus must resolve:

1. `projectId`;
2. `worldId`;
3. canonical project folder family;
4. initial asset classification;
5. whether graph-link review is still required.

The current Drive-backed Project World structure is used as the practical Cloud Memory adapter. It is not a vendor lock-in decision and it does not replace the provider-neutral storage interface required by issue #48.

## Contract

Schema:

`nexus-cloud-pending-asset/v1`

A `PendingNexusAssetRecord` is metadata only. It prepares a route for a file but does not upload, move, index, persist or graph-link the binary.

It records:

- stable pending asset ID;
- eventual Nexus asset ID;
- original file name;
- MIME type, file size and checksum where known;
- `projectId` and `worldId`;
- source module such as `file-loader`, `android-work-mode`, `doorflow`, `bim-ifc`;
- initial classification: `inbox`, `pending_graph_link`, `classified_by_trade`, `classified_by_type` or `audit_only`;
- target Drive folder role/id/url from the manifest;
- optional graph candidate IDs as review hints only;
- boundaries preventing source-of-truth confusion.

## Hard rules

- A pending asset cannot start as `linked_to_graph`.
- `graphCandidateNodeIds` do not approve a Project Graph link.
- `projectId/worldId` mismatch fails closed.
- e-SAFE cannot resolve into Riverside folders.
- Riverside cannot resolve into e-SAFE folders.
- Global Nexus Cloud root is not an upload target for project files.
- Relationship Tree previews are not file source of truth.

## Initial routing policy

- No graph candidate: route to project `00_INBOX`.
- Graph candidate exists but is not approved: route to project `01_PENDING_GRAPH_LINK`.
- Reviewed trade classification: route to project `02_BY_TRADE`.
- Reviewed type classification: route to project `03_BY_TYPE`.
- Audit/provenance-only material: route to project `90_AUDIT_PROVENANCE`.

## Explicit non-goals

This slice does not implement:

- Drive API writes;
- binary upload sessions;
- asset-index append;
- file moves;
- thumbnails/previews;
- permission checks against a real user session;
- realtime invalidation;
- offline upload queue;
- Project Graph mutation;
- production deployment.

## Next slice

After this contract, the File Loader UI/API can create a `PendingNexusAssetRecord` first, then hand off to a provider-specific upload adapter. Only after the binary exists in the correct project folder should Nexus append to `NEXUS_CLOUD_ASSET_INDEX` and request Project Graph linking.
