# Nexus Cloud Staging Bootstrap

Status date: 2026-08-22

## Purpose

This document records the positively identified, isolated non-production PostgreSQL target for the Nexus Cloud integration track.

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

## What has NOT been done

- no production database was modified;
- no historical Replit database was reused;
- no canonical real user/Person binding was seeded;
- no Project Participation or `cloud.file.write` grant was created for a real user;
- no Google OAuth refresh-token credential was configured;
- no real provider-network preflight was executed from the application runtime;
- no Google Drive file was created;
- no Nexus Cloud E2E write has been claimed as PASS;
- no PR was merged or deployed.

## Next controlled gates

1. attach an actual `nosmo-nexus-mvp` staging runtime to this database through a server-only `DATABASE_URL`;
2. run `nexus-cloud-runtime-preflight/v1` against this exact target;
3. capture the authenticated runtime OIDC subject and establish an exact provider-subject digest -> canonical Person binding;
4. create one controlled e-SAFE Project Participation and explicit `cloud.file.write` allow;
5. configure the server-only Google OAuth refresh-token credential;
6. run the explicit GET-only provider probe for all five verified e-SAFE Drive targets;
7. require `READY_FOR_CONTROLLED_E2E` before enabling a controlled provider write;
8. perform one guarded authenticated upload and verify a real Drive file ID plus Project Memory `COMMITTED`;
9. exercise post-provider persistence failure recovery and verify no duplicate Drive create on same-key retry.

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
