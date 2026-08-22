# Nexus Cloud shared identity convergence

## Scope

This slice reconciles the Nexus Cloud runtime identity persistence with the shared canonical Person direction already established by PR #106 and consumed by the current Android Work Mode track.

It is stacked on PR #117 and changes no UI, provider write behavior or Project Graph behavior.

## Superseded runtime-only identity table

PR #110 introduced `nexus_runtime_identity_bindings` as a narrow Cloud unblocker. That table did not persist or foreign-key the canonical Nexus Person itself.

The shared architecture now uses:

- `nexus_pm_people` — persistence of the existing canonical Project Memory `NexusPersonRecord`;
- `nexus_identity_bindings` — exact server-owned provider/issuer + SHA-256(subject) -> canonical Person binding.

The runtime-only `nexus_runtime_identity_bindings` table is removed from the final source state of this branch.

## Exact identity rule

`authenticated provider subject`

-> normalize exact issuer/provider key

-> SHA-256 subject digest

-> exact active `nexus_identity_bindings` row

-> active existing `nexus_pm_people` row

-> canonical `personId`

Never:

- provider subject = Person ID;
- email = Person ID;
- display name = Person ID;
- Work Wallet/Drive/Android external ID = Person ID;
- automatic Person creation during login.

## Project access linkage

`nexus_pm_project_participations.person_id` now foreign-keys the canonical `nexus_pm_people.person_id` while retaining the stricter #112 Cloud access fields:

- exact project + world;
- explicit `permissionGrantIds`;
- validity windows;
- explicit grant/deny records;
- Cloud access resolved only by the canonical #107 policy.

Active participation alone still grants nothing.

## Relationship to parallel PRs

- PR #106 is the semantic source for shared Person/binding persistence.
- PR #107 remains the canonical fail-closed access policy used by Cloud.
- PR #112 remains the Cloud access persistence/read adapter.
- PR #109 contains overlapping Work Wallet persistence plus Work Wallet connector-specific records and must not be bulk-merged into this Cloud stack. Its overlapping access tables need later reconciliation onto the shared schema rather than a second definition.

## Database safety

No external database schema was applied.

No production/staging `DATABASE_URL` was touched.

The only authorised schema application prepared in the current Cloud chain remains the disposable GitHub Actions PostgreSQL service from PR #117.

## Next slice

Mount the authenticated Nexus Cloud binary endpoint on the unified API runtime using one existing Google Drive writer implementation from PR #93:

`session -> workspace -> canonical Person -> ProjectParticipation/PermissionGrant -> access decision -> semantic route -> server provider mapping -> Drive write -> provider receipt -> canonical persistence proposal -> Phase 19 transaction`.
