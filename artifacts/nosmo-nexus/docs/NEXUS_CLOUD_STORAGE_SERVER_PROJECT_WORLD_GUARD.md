# Nexus Cloud Storage API — server project-world guard

Status: DRAFT implementation slice
Parent stack: PR #70 / `codex/cloud-drive-file-loader-routing-guard-v2`

## Purpose

The File Loader already resolves `projectId + worldId` before writing an offline queue record or replaying a provider write.

This slice adds the same fail-closed boundary to the server-side Cloud Storage API so a crafted request cannot bypass the frontend guard and write an e-SAFE object under Riverside scope, or a Riverside object under e-SAFE scope.

## Guard schema

`nexus-cloud-storage-project-world-server-guard/v1`

## Managed Project Worlds

| projectId | required worldId | current logical Drive target |
|---|---|---|
| `NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA` | `esafe-demo` | `01_PENDING_GRAPH_LINK` / `1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ` |
| `RIVERSIDE_DEMO_PROJECT` | `dev` | `01_PENDING_GRAPH_LINK` / `1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw` |

## Enforcement

For Drive-managed Project Worlds:

- POST metadata must include `scope.projectId` and matching `scope.worldId`;
- missing `scope.worldId` returns `NEXUS_CLOUD_WORLD_REQUIRED:*`;
- mismatched `scope.worldId` returns `NEXUS_CLOUD_PROJECT_WORLD_MISMATCH:*`;
- read/delete requests for guarded projects also require matching `worldId`;
- stored object lookup includes `worldId` scope, not only project/asset/file/object key.

Unrelated projects such as `HALIFAX-DEMO` remain provider-neutral and are not guessed into either Google Drive Project World.

## Boundary

This slice still does not implement Google OAuth, Google Drive binary writes, Asset Index append, Project Graph mutation, production storage, production deployment, or authenticated Person + Project Participation enforcement.

It only moves the e-SAFE/Riverside project-world separation from frontend-only guard to frontend + server API guard.
