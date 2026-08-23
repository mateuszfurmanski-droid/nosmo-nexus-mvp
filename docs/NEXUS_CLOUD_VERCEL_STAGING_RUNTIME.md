# Nexus Cloud Vercel Staging Runtime

Status date: 2026-08-23

## Scope

This slice provides a narrow non-production Vercel runtime for the real Nexus Cloud backend route. It is stacked on the guarded runtime preflight work and does not modify the protected Spark demo or any accepted UI surface.

The adapter mounts the existing repository `nexusCloudRouter` unchanged behind the existing server-side middleware chain:

`authMiddleware -> requireNexusCloudMutationOrigin -> requireWorkspace -> nexusCloudRouter`

It deliberately excludes the Nexus web UI, generic MVP routes and Work Wallet runtime.

## Positively identified staging database

- Provider: Neon Postgres
- Project: `nosmo-nexus-cloud-staging`
- Project ID: `curly-frost-39121675`
- Branch: `main`
- Branch ID: `br-mute-shadow-a6nup1je`
- Database: `nexus_cloud_staging`
- Non-secret target fingerprint: `ec4d20b0ccb94d8a`
- Classification: isolated non-production staging

## Executed Vercel -> Neon exact-target evidence

Dedicated Vercel project:

- project: `nosmo-nexus-cloud-staging`
- project ID: `prj_SlNzV4zgxagf5clGrH8UbFZyJwCK`
- canonical staging URL: `https://nosmo-nexus-cloud-staging.vercel.app`

The read-only exact-target probe returned HTTP 200 with:

- `status = DATABASE_READY`
- `databaseName = nexus_cloud_staging`
- `targetFingerprint = ec4d20b0ccb94d8a`
- `exactExpectedDatabase = true`
- required tables `14 / 14`
- `missingTables = []`
- `databaseMutationPerformed = false`
- `providerWritePerformed = false`
- `secretValuesReturned = false`

This proves the Vercel runtime is attached to the exact intended Neon staging database. It is not a Google Drive E2E PASS.

## Controlled canonical access evidence

A synthetic, short-lived non-production session and canonical access path were created in the staging database only. No real user email or personal data was used and the bearer token is not recorded in this document or repository.

The path is:

`staging session -> exact OIDC subject digest binding -> canonical Person -> exact e-SAFE ProjectParticipation -> explicit cloud.file.write PermissionGrant`

Observed server-side read-only access smoke:

1. allow-only state:
   - HTTP 200
   - `identityState = BOUND`
   - exactly one active ProjectParticipation
   - exactly one active PermissionGrant
   - result `ACCESS_ALLOWED`
   - reason `explicit-grant`
2. temporary deny-precedence state:
   - one explicit deny was added to the same Participation
   - existing allow remained present
   - HTTP 403
   - result `DENIED`
   - reason `explicit-deny`
3. cleanup:
   - temporary deny was removed
   - residual deny rows `0`
   - Participation returned to one active grant ID
   - result returned to HTTP 200 / `explicit-grant`

The temporary public self-test endpoint used to collect this evidence is not part of the intended steady-state staging runtime and should be removed after evidence capture.

## Runtime adapter

New staging entry points:

- `artifacts/api-server/src/vercel-cloud-staging.ts`
- `api/index.ts`
- `vercel.json`

The adapter imports and mounts the existing Cloud route; it does not fork provider-write or Project Memory logic.

The Vercel function includes the server-only Google Drive writer module and runtime-root marker files so the existing dynamic provider module resolver can operate inside the function bundle.

## Required runtime configuration

Already configured on the dedicated staging Vercel project:

- `DATABASE_URL` -> exact `nexus_cloud_staging` target

Required before using the canonical identity/access path in the real adapter:

- `NEXUS_IDENTITY_BINDING_MODE=postgres`

Required before a real Google Drive provider probe/write can be attempted:

- `NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON`
- one referenced `NEXUS_SECRET_*` value with schema `google-oauth-refresh-token/v1`
- exact e-SAFE target mapping
- explicit provider read-only probe
- explicit controlled write release only after the probe passes

For Bearer-session Cloud mutations, the existing origin middleware deliberately bypasses cookie CSRF-origin checks. Cookie-authenticated browser writes still require the normal `NEXUS_PUBLIC_ORIGIN` rule.

## Current release truth

Verified:

- exact Vercel -> Neon target
- 14/14 required tables
- durable database state-machine smoke from the prior staging bootstrap
- controlled canonical identity/access allow path
- explicit deny precedence

Not yet verified:

- Vercel build of this repository-native serverless adapter
- authenticated request through the actual `nexusCloudRouter`
- server Google OAuth refresh-token credential
- real OAuth token exchange
- GET-only Drive capability probe through the repository writer module
- real Drive file create
- Project Memory commit following a real Drive create
- same-key recovery after forced post-provider persistence failure

No Google Drive integration or E2E PASS is claimed yet.

## Protected surfaces

Unchanged:

- PR #90 foundation
- PR #91 Spark SKANSKA Demo Core
- accepted Object Card
- Relationship Tree UI/gestures
- File Loader UI
- Work Wallet UI/behavior
- BIM/IFC/FabStation
- Android UI
- DoorFlow
- Electrical Commissioning
- Person Card UI

No auto merge or production Nexus deployment is authorized by this staging slice.
