# NOSMO Nexus — Phase 15 Cloud Foundation Reconciliation

Status: provider-neutral Nexus Cloud foundation implemented in PR #90. No real cloud provider write is enabled by this phase.

## Purpose

Phase 15 reconciles the useful Nexus Cloud work from historical PRs #66–#77 and the strict routing behaviour from PR #73 with the current PR #90 Project Memory architecture.

The goal is to preserve the strong routing/security rules without copying the old hardcoded Project World manifest into the new foundation.

## Donor stack reviewed

Primary donor line:

`#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`

Additional routing donor:

`#73`

Useful behaviour retained:

- exact `projectId + worldId` before any cloud write planning;
- fail-closed project/world mismatch handling;
- pending asset metadata before binary upload;
- graph candidates are review hints, not automatic graph links;
- File Loader and server must eventually validate the same project/world boundary;
- provider writes, Asset Index append and Project Graph mutation are separate side effects;
- a visible upload-session plan is not evidence that a binary upload happened.

## What is intentionally not copied

The old Cloud stack encoded a concrete Google Drive manifest containing specific e-SAFE and Riverside folder IDs and URLs.

PR #90 foundation does not copy those provider-specific IDs into canonical routing.

The new rule is:

`Project Memory project/world -> semantic Cloud target role -> independent access decision -> configured provider mapping -> provider write`

not:

`hardcoded project name -> hardcoded Drive folder ID`.

## New foundation contracts

### `src/core/storage/cloudRouting.ts`

Adds dynamic Project World routing using canonical project/world records.

The resolver:

- requires an existing project;
- requires an existing world;
- requires `world.projectId === project.id`;
- requires the world to be registered in `project.worldIds`;
- de-duplicates graph candidate object IDs;
- forces graph candidates to remain `pending_graph_link` until reviewed;
- requires trade context before `classified_by_trade`;
- requires an asset/file type before `classified_by_type`;
- returns only a semantic target role;
- always reports that write authorisation is still required;
- always reports that provider mapping is still required.

Semantic target roles:

- `00_INBOX`;
- `01_PENDING_GRAPH_LINK`;
- `02_BY_TRADE`;
- `03_BY_TYPE`;
- `99_AUDIT`.

These are semantic roles, not Google Drive folder IDs.

### `src/core/storage/cloudAssetContract.ts`

Adds `nexus-cloud-pending-asset/v2` as a pre-persistence metadata envelope.

The v2 envelope keeps:

- stable pending asset identity;
- original filename;
- project/world;
- source module;
- file kind/document class;
- MIME/size/checksum where known;
- visibility scope;
- graph candidate object IDs through the resolved route;
- uploader/device/capture provenance where supplied;
- semantic Cloud target role.

It explicitly records that these side effects have not happened:

- binary handling;
- provider write;
- Asset Index append;
- Project Graph mutation.

This prevents UI/session planning from being mistaken for completed storage.

## Storage contract correction

`src/core/storage/storageContract.ts` is now a discriminated storage contract.

### `local-demo`

May remain local and optionally project/world scoped.

### `nexus-cloud`

Requires:

- `projectId`;
- `worldId`;
- `storageObjectKey`.

A real `storageConnectorId` may be supplied when a provider is configured.

### `external-reference`

Requires a real `sourceConnectorId`.

Important correction from Phase 11:

`external-reference` is a storage scope, not a connector ID.

## Dynamic Project World rule

PR #90 Cloud foundation is not limited to e-SAFE.

Any future project/world pair can resolve if it exists canonically in Project Memory and passes access/provider configuration.

The current PR #90 fixture remains e-SAFE-only for foundation testing, but that fixture scope must never become a hardcoded product routing table.

## Google Drive boundary

Google Drive remains the current practical Nexus Cloud adapter and the historical donor stack contains verified Drive folder mappings.

Phase 15 does not:

- authenticate to Google Drive;
- upload a binary;
- move a file;
- create a Drive folder;
- append the Drive Asset Index;
- copy old Drive folder IDs into foundation routing;
- enable browser-side Google credentials.

A future Google Drive adapter may map semantic target roles to configured Drive folders server-side after authorization.

## Access boundary

Cloud routing is not permission authority.

A resolved route only proves that the project/world and classification are structurally valid.

Before a real write, runtime must still resolve:

`authenticated account -> canonical Person -> Project Participation -> explicit permission/access decision -> provider capability -> provider write`.

This keeps Phase 15 aligned with Phase 14 and ADDON_056 fail-closed access.

## Relation to issue #48

Issue #48 remains the long-term Cloud Data Layer target:

`capture/import -> cloud storage -> Project Graph link -> permission check -> realtime project visibility`.

Phase 15 only establishes the provider-neutral routing and pending-asset foundation needed before the real binary provider is selected/implemented.

Still pending from issue #48:

- production binary storage provider;
- real upload session and binary transfer;
- immutable persisted file provenance;
- Project Memory/File record creation after provider write;
- Asset Index equivalent/persistent search index;
- graph link/relink flow with permission/audit;
- authorised binary reads;
- realtime invalidation/visibility;
- offline mobile queue/retry;
- retention/delete audit.

## Protected surfaces

Phase 15 does not modify:

- PR #91 Spark demo or its Object Card;
- live `NOSMO-website` Relationship Tree;
- stable Person Card;
- Android/APK;
- BIM runtime;
- DoorFlow / Fire Door Register;
- historical Cloud donor branches;
- Google Drive contents.

## Next controlled step

The next Cloud step should be a narrow persistence/write-boundary design:

1. define how a successful provider write becomes canonical `NexusFileRecord` + external/provider reference;
2. bind it to Phase 14 access decisions;
3. reconcile the Google Drive adapter mapping without browser credentials;
4. only then implement a real binary upload path.

Do not bulk-merge the historical Cloud stack into PR #90.
