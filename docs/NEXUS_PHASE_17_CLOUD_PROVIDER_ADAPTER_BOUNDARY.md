# NOSMO Nexus — Phase 17 Cloud Provider Adapter Boundary

Status: foundation contract only. No live provider write is released by this phase.

## Purpose

Phase 17 defines the server-side boundary between the provider-neutral Nexus Cloud contracts from Phase 15/16 and a future real storage provider such as Google Drive.

The key rule is:

`semantic Nexus Cloud route -> canonical access -> connector capability truth -> server-side provider target -> provider confirmation -> Phase 16 persistence proposal`

The browser must not own provider credentials, folder authority or Project Graph mutation rights.

## Authority

This phase reconciles:

- Phase 14 canonical auth/identity/access boundary;
- Phase 15 provider-neutral Cloud routing;
- Phase 16 provider-write receipt / persistence proposal boundary;
- PKG-004 connector integration levels and capability truth;
- historical Nexus Cloud donor work from PRs #66-#77 and strict project/world routing from #73.

PR #91 Spark demo remains protected and untouched.

## New contract

`src/core/storage/cloudProviderAdapterContract.ts`

The contract introduces:

- `NexusCloudProviderTargetMapping`;
- `createNexusCloudProviderWritePlan(...)`;
- fail-closed provider-plan denial reasons;
- explicit minimum write integration level;
- explicit server-only credential boundary;
- explicit prohibition on automatic Project Memory / Project Graph mutation.

## Provider target mapping

Canonical Cloud routing resolves only semantic target roles:

- `00_INBOX`;
- `01_PENDING_GRAPH_LINK`;
- `02_BY_TRADE`;
- `03_BY_TYPE`;
- `99_AUDIT`.

A server-side provider configuration maps one exact tuple:

`projectId + worldId + targetRole + connectorAccountId`

to a provider target such as a Google Drive folder ID.

Provider target IDs are configuration, not canonical Nexus object IDs.

No provider folder IDs are hardcoded in the Phase 15/17 routing logic.

## Write capability gate

A provider write plan is denied unless all of the following are true:

1. canonical access decision is `allowed`;
2. access contains a resolved Person ID;
3. access project/world exactly matches the pending asset;
4. access is for `moduleId: cloud` and `actionKey: cloud.file.write`;
5. connector account references the exact connector definition;
6. connector lifecycle is `LIVE`;
7. connector integration level is at least `5 / CONTROLLED_TWO_WAY_API`;
8. connector definition declares File write support;
9. connector account state is `connected`;
10. connector account explicitly contains `cloud.file.write` in allowed scopes;
11. server-side `secretReference` exists;
12. exactly one enabled target mapping exists for the Project World and semantic target role.

This means a deep link, reference-only connector or demo connector cannot silently become a live file-write adapter.

## Server credential boundary

The write plan declares:

- `credentialSource: server-secret-reference`;
- `browserCredentialsAllowed: false`.

Secret values must never appear in browser code, repository files or client-facing configuration.

The target provider adapter is expected to resolve the secret reference only inside the trusted server runtime.

## No side effects from planning

A valid provider write plan still reports:

- `providerWritePerformed: false`;
- `projectMemoryMutationPerformed: false`;
- `projectGraphMutationPerformed: false`.

The plan only authorises and describes a future server-side provider operation.

## Provider confirmation rule

A provider write is not considered successful until the provider confirms the write.

After confirmation, the runtime must create a `NexusCloudProviderWriteReceipt` and then call the Phase 16 persistence boundary.

The provider object ID is preserved as an external/provider identifier. It never becomes the canonical Nexus File ID.

## Google Drive current truth

Google Drive is the current practical Nexus Cloud storage location and historical donor implementation.

The current #90 `googleDriveConnector.ts` is a reference/deep-link catalogue contract and is not live capability truth.

It now explicitly sets:

`canUpdateProjectGraph: false`

and states that attaching Nexus reference metadata is not a Google Drive binary/API write capability.

Current `active-reference` / deep-link posture does not satisfy the Phase 17 write gate.

Therefore Phase 17 does not claim that Nexus currently has a production Google Drive write integration.

A future Drive adapter must only be enabled after the real connector definition/account records truthfully declare the supported integration level, lifecycle, scopes, authentication and source-of-record rules.

## Graph boundary

Storage and Project Graph remain separate authorised actions.

A provider adapter cannot:

- create graph edges;
- approve graph candidates;
- move records between worlds;
- grant project access;
- convert provider folder membership into Nexus authority.

After a file is persisted, any graph linking must use a separate canonical, authorised and audited Nexus action.

## Validation

A focused strict TypeScript compile of `cloudProviderAdapterContract.ts` against minimal dependency stubs completed successfully.

This validates the isolated contract shape and TypeScript syntax only. It is not a full repository build and does not prove provider runtime behaviour.

## Not implemented in Phase 17

- Google OAuth/service-account setup;
- Google Drive API calls;
- binary upload;
- multipart/resumable upload;
- provider retry/backoff;
- real target mappings with Drive folder IDs;
- transactional Project Memory commit;
- Asset Index persistence;
- automatic graph linking;
- realtime notification;
- offline mobile retry;
- production deployment.

## Next controlled step

Design the atomic/idempotent Project Memory commit boundary for a Phase 16 persistence proposal.

That commit must ensure that File record, canonical File object, provider reference, storage record and audit event cannot partially diverge if persistence fails or a request is retried.
