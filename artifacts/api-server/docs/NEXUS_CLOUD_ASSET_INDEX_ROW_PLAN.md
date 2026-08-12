# Nexus Cloud Asset Index Row Plan

This document defines the planning-only bridge between a Nexus Cloud upload-session plan and the shared `NEXUS_CLOUD_ASSET_INDEX` Google Sheet.

## Position in the flow

```text
File Loader metadata
→ pending asset
→ upload-session plan
→ Asset Index row plan
→ future Drive adapter write
→ future Sheet append
→ future Project Graph link
```

## Source of truth

The current Asset Index spreadsheet is:

- spreadsheet id: `1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI`
- expected columns:
  - `assetId`
  - `fileName`
  - `projectId`
  - `worldId`
  - `tradeId`
  - `assetType`
  - `classificationStatus`
  - `visibilityScope`
  - `driveFileId`
  - `drivePathOrUrl`
  - `linkedGraphNodeIds`
  - `source`
  - `createdAt`
  - `notes`

## What this slice does

`createNexusCloudAssetIndexRowPlan()` takes a validated `nexus-cloud-upload-session-plan/v1` object and returns a `nexus-cloud-asset-index-row-plan/v1` object.

The row plan includes:

- the exact column order expected by the current sheet;
- an object-shaped row for readability;
- an ordered values array for a future append operation;
- a planned row id;
- the target Asset Index spreadsheet id and URL;
- safety boundaries and false mutation flags.

## Important boundary

This is not a Google Sheets write.

The row plan intentionally keeps:

- `googleSheetsAppendRequested: false`
- `googleSheetsAppendPerformed: false`
- `driveWritePerformed: false`
- `projectGraphMutationPerformed: false`

The generated row uses an empty `driveFileId` because the Drive adapter has not yet created a real Drive file. The `notes` field contains `PLANNED_ONLY_DO_NOT_APPEND_YET` to prevent accidental append before the Drive file id exists.

## Project-world separation

Project/world separation is inherited from the upload-session plan, which already revalidates:

- `NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA` must use `worldId: esafe-demo`;
- `RIVERSIDE_DEMO_PROJECT` must use `worldId: dev`.

The Asset Index row planner must not alter that boundary.

## Not implemented here

This slice does not implement:

- Google Sheets API credentials;
- appending rows to the live spreadsheet;
- Google Drive file creation;
- Drive file id assignment;
- trade classification review;
- Project Graph node linking;
- permission propagation;
- production deploy or merge.
