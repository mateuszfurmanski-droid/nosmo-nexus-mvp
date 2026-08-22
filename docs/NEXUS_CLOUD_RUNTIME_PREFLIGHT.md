# Nexus Cloud runtime preflight

## Purpose

This slice provides a one-shot, fail-closed, read-only readiness check for the real Nexus Cloud / Google Drive runtime before any schema application or provider file write is attempted.

It is deliberately separate from the upload endpoint. Running the preflight must never itself create a Google Drive file, mutate Project Memory, insert an identity/access row, or run a migration.

## Exact current pilot scope

Canonical Project World:

- `projectId`: `project-esafe-catania`
- `worldId`: `world-esafe-catania`

The connected Google Drive hierarchy was re-read on 2026-08-22 and the exact e-SAFE target folders remain:

- `00_INBOX` -> `1xsIITjBwTEE1z7whhub3RnsSXfrxwur9`
- `01_PENDING_GRAPH_LINK` -> `1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ`
- `02_BY_TRADE` -> `1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P`
- `03_BY_TYPE` -> `1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9`
- canonical `99_AUDIT` -> provider folder `90_AUDIT_PROVENANCE`, ID `1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz`

Hierarchy evidence is recorded in `docs/NEXUS_CLOUD_ESAFE_DRIVE_MAPPING_EVIDENCE.json`.

That JSON file is evidence only. It uses a different schema from the runtime configuration and explicitly records `writeEnabled: false`; it cannot release Google Drive writes.

## What the preflight checks

The preflight checks only server/runtime state.

### Runtime / authentication

- `NEXUS_PUBLIC_ORIGIN` is present and production uses HTTPS;
- `REPL_ID` is configured for the existing OIDC runtime;
- `NEXUS_IDENTITY_BINDING_MODE=postgres`.

### PostgreSQL

The database is opened only after a syntactically valid PostgreSQL `DATABASE_URL` exists.

All database inspection runs inside:

`BEGIN READ ONLY`

and ends with `ROLLBACK`.

The report never returns database host, user, password, database name or full URL. It reports only a short SHA-256 target fingerprint so two runs can be compared without exposing the target.

Required tables:

- `users`
- `sessions`
- `workspaces`
- `nexus_pm_people`
- `nexus_identity_bindings`
- `nexus_pm_project_participations`
- `nexus_pm_permission_grants`
- `nexus_pm_files`
- `nexus_pm_canonical_objects`
- `nexus_pm_external_references`
- `nexus_pm_storage_records`
- `nexus_pm_audit_events`
- `nexus_pm_cloud_commits`
- `nexus_pm_cloud_write_operations`

It also counts whether at least one persisted candidate path exists:

`ACTIVE identity binding -> active canonical Person -> active exact e-SAFE participation -> explicit allow cloud / cloud.file.write`

This is a readiness signal only. It does not replace request-time canonical access evaluation. Explicit deny, ambiguity and exact current user scope still fail closed in the normal #107/#112 authority path.

### Google Drive runtime configuration

The preflight checks:

- `NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON` exists;
- exact canonical e-SAFE project/world are present;
- all five semantic target mappings exactly match the live-read evidence;
- the referenced credential is a `NEXUS_SECRET_*` server secret;
- the secret has the `google-oauth-refresh-token/v1` shape;
- `writeEnabled: true` and a valid `verifiedAt` are required for the canonical runtime config to be considered released.

No OAuth client ID, client secret, refresh token, access token or database credential is returned in the report.

## Real read-only provider probe

Correct JSON shape is not enough to produce READY.

The operator must explicitly set:

`NEXUS_CLOUD_PREFLIGHT_PROVIDER_PROBE=true`

Only then does preflight perform a real provider-network check:

1. resolve the existing server-only `NEXUS_SECRET_*` credential;
2. use the existing PR #93 OAuth exchange implementation to obtain an access token;
3. perform GET-only Google Drive metadata/capability requests for all five exact e-SAFE targets;
4. require each target to be an active Drive folder and not report `canAddChildren=false`.

The provider probe has a 30-second overall abort signal.

It does not call the Drive upload endpoint and contains no `files.create` operation.

## CLI behavior

The CLI entry is:

`artifacts/api-server/scripts/nexus-cloud-runtime-preflight.ts`

Run it through the workspace `tsx` runner.

Default mode prints a sanitized JSON report and exits normally even when status is `BLOCKED`. This is useful for diagnosis.

With `--require-ready`, a non-ready result exits non-zero and can be used as a deployment gate.

`READY_FOR_CONTROLLED_E2E` means only that:

- runtime origin/OIDC settings are present;
- canonical identity mode is postgres;
- the required DB schema is present;
- at least one candidate e-SAFE authority path exists;
- exact provider mapping matches live-read evidence;
- runtime write config is explicitly released;
- OAuth secret shape validates;
- real OAuth exchange succeeds;
- all five exact Drive folders pass read-only capability checks.

It still does not mean a real Nexus Cloud write has passed.

## CI behavior

CI uses only the disposable job-local PostgreSQL target already established by the Cloud stack.

After schema push to that disposable database, CI runs the preflight with:

- synthetic non-secret runtime configuration;
- a synthetic OAuth secret shape;
- provider network probe disabled;
- no seeded canonical identity/access rows.

Therefore the expected status is `BLOCKED`.

The smoke proves that the diagnostic:

- can inspect the disposable schema read-only;
- does not leak the synthetic secret values;
- reports `databaseMutationPerformed=false`;
- reports `providerWritePerformed=false`;
- reports `secretValuesReturned=false`.

It does not prove live OAuth or live Drive readiness.

## Current real-runtime truth

As of this slice:

- live Drive hierarchy/target IDs: read-only metadata verified;
- real `nosmo-nexus-mvp` persistent runtime PostgreSQL target: not positively identified;
- Replit `WeightySeveralPorts`: exists but repeated read-only Agent inspection timed out, so it is not accepted as the runtime DB authority;
- `Nexus Site Manager`: read-only Agent inspection also timed out;
- Google OAuth refresh-token credential for the app runtime: not validated;
- real provider-network preflight: not executed;
- real Drive file create: not executed;
- production schema migration: not executed.

Do not reuse the unrelated `Nexus Data Fetcher` database.

## Next controlled sequence

1. identify the exact runtime PostgreSQL target without exposing its credential;
2. run this preflight in default mode and inspect the sanitized DB fingerprint/table result;
3. only after confirming the target, inspect schema differences before any migration;
4. create/verify one controlled canonical Person binding + exact e-SAFE participation + explicit `cloud.file.write` allow;
5. configure the server OAuth refresh-token secret;
6. stage exact Drive mapping with `writeEnabled=false` first;
7. run `NEXUS_CLOUD_PREFLIGHT_PROVIDER_PROBE=true` read-only provider probe;
8. only after provider probe passes, explicitly review/release `writeEnabled=true` + `verifiedAt`;
9. run preflight with `--require-ready`;
10. only then execute one guarded authenticated upload and require a real `driveFileId` plus Project Memory `COMMITTED`;
11. force a post-provider persistence failure and verify same-key recovery creates no second Drive object.

## Protected surfaces

This slice does not change PR #91, Object Card, Relationship Tree UI/gestures, File Loader UI, Work Wallet behavior, BIM/IFC/FabStation, Android UI, DoorFlow, Electrical Commissioning or Person Card UI.
