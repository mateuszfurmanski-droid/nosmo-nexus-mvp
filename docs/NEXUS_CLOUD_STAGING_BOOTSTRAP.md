# Nexus Cloud Staging Bootstrap

Status date: 2026-08-23

## Purpose

This document records the positively identified, isolated non-production infrastructure for the Nexus Cloud integration track.

It contains no connection string, password, OAuth credential, provider token, or other secret value.

## Canonical staging database

- Provider: Neon Postgres
- Neon project name: `nosmo-nexus-cloud-staging`
- Neon project ID: `curly-frost-39121675`
- Primary branch name: `main`
- Primary branch ID: `br-mute-shadow-a6nup1je`
- Database: `nexus_cloud_staging`
- PostgreSQL version observed during bootstrap: `18.6`
- Environment classification: isolated non-production Nexus Cloud staging

This database was created specifically for `mateuszfurmanski-droid/nosmo-nexus-mvp` Cloud integration work. It is not the database of `Nexus Data Fetcher`, `WeightySeveralPorts`, or any historical Replit application.

## Schema bootstrap procedure executed

A temporary Neon branch named `nexus-cloud-schema-test` was first created from the empty staging branch.

The current Cloud-required schema from the stacked Nexus Cloud line was applied there before the primary staging branch was modified.

Verified on the temporary branch:

- required tables present: `14 / 14`;
- expected explicit indexes present: `11 / 11`;
- foreign-key constraints observed: `13`;
- unique constraints observed: `9`.

After that verification, the same schema was applied to the primary `main` staging branch.

Primary staging readback after bootstrap:

- required tables present: `14 / 14`;
- missing required tables: none.

The temporary schema-test branch was then deleted.

## Required tables

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

## Real staging database smoke executed

A synthetic authority/operation-ledger smoke was executed against the actual `nexus_cloud_staging` primary branch, then fully cleaned up.

Observed results:

- exact synthetic identity -> Person -> e-SAFE participation -> explicit `cloud.file.write` allow path count: `1`;
- first durable provider operation accepted as `PENDING_PROVIDER`;
- duplicate insertion using the same `provider_write_identity` produced no second operation row;
- transition to `PROVIDER_CONFIRMED` retained the synthetic provider object ID;
- forced transition to `PERSISTENCE_FAILED` retained the provider receipt/object identity;
- transition to `COMMITTED` retained the same provider object ID and added the canonical file ID;
- final receipt provider object ID matched the operation provider object ID;
- cleanup readback: `0` residual synthetic smoke rows.

This validates the real Neon schema/constraints and the expected durable state model at database level. It does not claim the TypeScript runtime adapter, OAuth provider network path, or end-to-end Cloud upload has passed.

## Replit runtime attempt

A new Replit application could not be created because the account returned `requires_active_subscription`.

The historical `Nexus Site Manager` Replit (`replId 19d9a9f1-12d3-45ae-82f5-82c944a4f3d0`) was selected only as a candidate non-production staging host.

Replit was instructed to preserve its historical state, use the current Cloud branch, remain unpublished, keep Drive writes disabled, and accept database/OAuth only through secure server-side integration mechanisms.

Current Replit truth:

- update requests returned only `phase=updating`;
- subsequent read-only Agent inspections timed out;
- application metadata continued to show its old modification timestamp;
- no secure `DATABASE_URL` attachment was positively verified;
- no runtime branch/head was positively verified;
- the app remains unpublished;
- therefore this Replit is NOT an authoritative staging runtime.

## Dedicated Vercel staging host

A new isolated Vercel project was successfully created without reusing any historical preview project:

- Vercel project name: `nosmo-nexus-cloud-staging`
- Vercel project ID: `prj_SlNzV4zgxagf5clGrH8UbFZyJwCK`
- environment: non-production staging project; provider writes disabled
- first dedicated preview deployment: `dpl_7RkPyy2niZTd9PBqzsUvRNWfS1Jp`
- initial database-probe deployment: `dpl_Eqquyyfjuv9Q2uPtE5SzH8q562fB`
- current database-probe redeployment: `dpl_6z7KeEfNuQQ179PVVF34e5FXuVnV`
- current probe URL: `https://nosmo-nexus-cloud-staging-5cz1ovoje.vercel.app`
- Google Drive writes: disabled

The probe deployment contains a GET-only `/api/preflight` endpoint intended to inspect the exact Neon staging schema without returning credentials or performing database/provider writes.

The deployment build reached `READY` and the serverless runtime executed.

## Verified Vercel -> Neon attachment

A persistent `DATABASE_URL` was attached manually through the Vercel project's secure Environment Variables UI, marked Sensitive, and the database-probe preview was redeployed without build cache.

The fresh preview reached `READY` and `/api/preflight` executed against the real Neon staging database.

Sanitized probe result:

- schema: `nexus-cloud-staging-runtime-probe/v1`;
- status: `BLOCKED`;
- environment: `non-production`;
- source head: `null` in the minimal probe;
- resolved database name: `nexus_cloud_staging`;
- exact expected database attestation: `false`;
- required table count: `14`;
- present table count: `14`;
- missing tables: `[]`;
- provider write enabled: `false`;
- database mutation performed: `false`;
- provider write performed: `false`;
- secret values returned: `false`.

This positively verifies that the Vercel staging runtime can connect to the intended Neon database and read the complete current Cloud-required schema. The earlier `DATABASE_URL_NOT_CONFIGURED` blocker is resolved.

The remaining `BLOCKED` status is no longer a database-connectivity failure. The minimal probe still reports `exactExpectedDatabase=false`, so exact target attestation must be resolved before treating the probe as a release gate. Provider writes also remain intentionally disabled.

The only runtime log emitted for the successful database read was a `pg` SSL-mode compatibility warning. No credential, host, password, or secret value was returned by the probe.

The dedicated Vercel project is now the preferred staging host direction. The historical Replit candidate should not be used unless its exact runtime state later becomes independently verifiable.

## GitHub Actions truth

The latest #137 validation runs continue to fail before runner step execution with `steps=null`.

Therefore:

- no CI typecheck/build PASS is claimed;
- the real Neon database smoke and Vercel -> Neon read-only probe above are independently executed evidence and are not derived from GitHub Actions.

## What has NOT been done

- no production database was modified;
- no historical Replit database was reused;
- no canonical real user/Person binding was seeded;
- no Project Participation or `cloud.file.write` grant was created for a real user;
- no full `nosmo-nexus-mvp` authenticated API runtime has been deployed to Vercel yet;
- exact expected-database attestation in the minimal Vercel probe is not yet satisfied;
- no Google OAuth refresh-token credential was configured;
- no real provider-network preflight was executed from the application runtime;
- no Google Drive file was created;
- no Nexus Cloud E2E write has been claimed as PASS;
- no Cloud PR was merged into its base;
- PR #91 was not modified.

## Next controlled gates

1. resolve the minimal Vercel probe's exact-target attestation so the known `nexus_cloud_staging` target is explicitly accepted rather than merely connected;
2. deploy the actual `nosmo-nexus-mvp` authenticated API runtime/bundle rather than the minimal probe;
3. establish a stable runtime identity path for Vercel staging and capture the authenticated subject;
4. establish the exact provider-subject digest -> canonical Person binding;
5. create one controlled e-SAFE Project Participation and explicit `cloud.file.write` allow;
6. configure the server-only Google OAuth refresh-token credential;
7. run the explicit GET-only provider probe for all five verified e-SAFE Drive targets;
8. require `READY_FOR_CONTROLLED_E2E` before enabling a controlled provider write;
9. perform one guarded authenticated upload and verify a real Drive file ID plus Project Memory `COMMITTED`;
10. exercise post-provider persistence failure recovery and verify no duplicate Drive create on same-key retry.

## Protected surfaces

This staging bootstrap did not modify:

- PR #90 foundation;
- PR #91 Spark SKANSKA Demo Core;
- accepted Object Card;
- Relationship Tree UI/gestures;
- File Loader UI;
- Work Wallet behavior/UI;
- BIM/IFC/FabStation;
- Android UI;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI.
