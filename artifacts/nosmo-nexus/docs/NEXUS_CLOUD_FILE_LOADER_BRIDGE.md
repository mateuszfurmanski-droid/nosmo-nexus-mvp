# Nexus Cloud File Loader Bridge

Status: draft implementation slice. Stacked on PR #67.

Schema:

`nexus-cloud-file-loader-bridge/v1`

## Purpose

This slice introduces the first UI/API bridge between a file selection surface and the Nexus Cloud pending asset contract.

It does one thing only:

`selected browser File metadata -> project/world selection -> PendingNexusAssetRecord preview`

It deliberately does not upload file contents or mutate Google Drive, Asset Index, Project Graph or any production storage state.

## Files

- `src/cloud/nexus-cloud-file-loader-bridge.ts`
- `src/cloud/nexus-cloud-file-loader-bridge-fixtures.ts`
- `src/components/nexus-cloud-file-loader-bridge.tsx`

## Required order

1. Resolve `projectId` and `worldId`.
2. Select one or more files.
3. Prepare pending asset metadata.
4. Resolve target project folder from the Drive manifest.
5. Review graph candidate nodes as hints only.
6. Later, a separate authorised slice may request a binary upload session.

## Bridge output

The bridge produces `NexusCloudFileLoaderPreparedAsset` containing:

- `schema: nexus-cloud-file-loader-bridge/v1`
- `bridgeMode: metadata_only_prepare`
- `pendingAsset: PendingNexusAssetRecord`
- `binaryHandled: false`
- `driveWriteRequested: false`
- `assetIndexAppendRequested: false`
- `projectGraphMutationRequested: false`
- `nextRequiredStep`
- explicit prohibited actions

## Safety boundary

This bridge must not:

- read file body content;
- upload a binary;
- write to Google Drive;
- move files;
- append `NEXUS_CLOUD_ASSET_INDEX`;
- mutate Project Graph;
- mark graph candidate nodes as approved links;
- treat Relationship Tree preview data as file source of truth.

## Why this exists

The current Nexus Cloud source of truth is project-first. The bridge prevents the old failure mode where a file path or Relationship Tree preview could decide the project later.

The correct flow is:

`projectId/worldId -> pending asset metadata -> target project folder -> future upload session -> Asset Index -> Project Graph link -> permission/realtime layer`

## Not included

- upload endpoint;
- Drive OAuth;
- Drive API mutation;
- checksum hashing from file body;
- Asset Index append;
- offline upload queue;
- realtime registry refresh;
- Project Graph mutation;
- production deploy or merge.
