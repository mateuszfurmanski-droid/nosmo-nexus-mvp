# Nexus Cloud Staging Bootstrap

Status date: 2026-08-22

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
- environment: preview/non-production only
- first dedicated preview deployment: `dpl_7RkPyy2niZTd9PBqzsUvRNWfS1Jp`
- database-probe deployment: `dpl_Eqquyyfjuv9Q2uPtE5SzH8q562fB`
- current probe URL: `https://nosmo-nexus-cloud-staging-dbcb3ffx0.vercel.app`
- Google Drive writes: disabled

The probe deployment contains a GET-only `/api/preflight` endpoint intended to inspect the exact Neon staging schema without returning credentials or performing database/provider writes.

The deployment build reached `READY` and the serverless runtime executed.

Current Vercel -> Neon attachment truth:

- `/api/preflight` returned HTTP `503` with `DATABASE_URL_NOT_CONFIGURED`;
- the endpoint therefore failed closed before any database operation;
- the deployment helper accepted only deployment files and did not persist the attempted deployment-level environment input;
- no database credential was embedded in source/deployment files;
- a later attempt to create a disposable read-only SQL login with an explicit password was blocked by platform secret-safety checks before execution, so no such role was created;
- a persistent `DATABASE_URL` still must be attached through the hosting platform's secure environment/Marketplace secret mechanism.

This is now the preferred staging host direction. The historical Replit candidate should not be used unless its exact runtime state later becomes independently verifiable.

## GitHub Actions truth

The latest #137 validation run still failed before runner step execution with `steps=null`.

Therefore:

- no CI typecheck/build PASS is claimed;
- the real Neon database smoke above is independently executed evidence and is not derived from GitHub Actions.

## What has NOT been done

- no production database was modified;
- no historical Replit database was reused;
- no canonical real user/Person binding was seeded;
- no Project Participation or `cloud.file.write` grant was created for a real user;
- no persistent Vercel `DATABASE_URL` secret has been attached yet;
- no Google OAuth refresh-token credential was configured;
- no real provider-network preflight was executed from the application runtime;
- no Google Drive file was created;
- no Nexus Cloud E2E write has been claimed as PASS;
- no Cloud PR was merged into its base;
- PR #91 was not modified.

## Next controlled gates

1. attach the exact Neon `nexus_cloud_staging` connection through the Vercel project's secure environment/Marketplace secret mechanism;
2. rerun the Vercel GET-only preflight and require exact database + `14 / 14` tables;
3. deploy the actual `nosmo-nexus-mvp` authenticated API runtime/bundle rather than the minimal probe;
4. capture the authenticated runtime subject and establish the exact provider-subject digest -> canonical Person binding;
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
