# Nexus Cloud Google Drive Manifest

Status: DRAFT / practical adapter manifest
Parent issue: #48
Implementation issue: #64

## Purpose

This document records the current Google Drive structure as the first practical Nexus Cloud Memory layer.

Google Drive is used here as a practical storage and registry adapter for the current development phase. It is not a vendor lock-in, not a replacement for the provider-neutral storage boundary and not a reason for modules to bypass Nexus metadata, permissions or audit.

## Verified source

- Cloud root: `00_NEXUS_PERSONAL_CLOUD` / `1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0`
- Project Worlds root: `10_PROJECT_WORLDS` / `1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q`
- e-SAFE Catania project root: `NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA` / `1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE`
- Riverside project root: `RIVERSIDE_DEMO_PROJECT` / `1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g`
- Asset Index: `NEXUS_CLOUD_ASSET_INDEX` / `1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI`
- Routing Rules: `NEXUS_CLOUD_ROUTING_RULES` / `1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c`
- Migration Log: `LOG_20260811_1357_ESAFE_RIVERSIDE_DRIVE_CLEANUP` / `1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU`

## Routing order

1. Resolve `projectId` and `worldId` first.
2. Store new uploads under the canonical project root, not the top-level cloud root.
3. If classification is unclear, use project `00_INBOX`.
4. If project is clear but graph target is unclear, use project `01_PENDING_GRAPH_LINK`.
5. Classify reviewed files by trade under `02_BY_TRADE` and optionally by type under `03_BY_TYPE`.
6. Register metadata in `NEXUS_CLOUD_ASSET_INDEX`.
7. Link to Project Graph only after project boundary and permission scope are clear.

## Hard boundary

- Relationship Tree previews are not file source of truth.
- e-SAFE files must not be stored in Riverside folders.
- Riverside files must not be stored in e-SAFE folders.
- Person Card evidence may link to a person, but does not replace the project boundary.
- Connector exports are staging records only; they do not become canonical without registration.
- File Loader must not treat local server folders as the production storage model.

## Current project worlds

| projectId | worldId | Project root |
|---|---|---|
| `NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA` | `esafe-demo` | `1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE` |
| `RIVERSIDE_DEMO_PROJECT` | `dev` | `1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g` |

## Code contract

The source-native contract lives in:

- `src/cloud/nexus-cloud-drive-manifest.ts`
- `src/cloud/nexus-cloud-drive-manifest-fixtures.ts`

The guard must fail closed when:

- a known `projectId` is paired with the wrong `worldId`;
- an e-SAFE asset is routed to a Riverside folder;
- a Riverside asset is routed to an e-SAFE folder;
- `linked_to_graph` is requested without graph node IDs.

## Non-goals for this slice

This slice does not implement upload sessions, Google API writes, file moves, permissions, OAuth, thumbnailing, binary downloads, realtime invalidation or offline sync.

Those belong to the next implementation slices after the manifest and project-world boundary are stable.
