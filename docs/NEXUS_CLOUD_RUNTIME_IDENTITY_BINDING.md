# NOSMO Nexus — Runtime Canonical Identity Binding for Cloud

Status: integration slice stacked on PR #107. Schema and runtime lookup are prepared; no database migration is executed.

## Purpose

Remove the unsafe gap between the current authenticated OIDC session and the canonical Nexus Person required by the Cloud access resolver.

Canonical path:

`OIDC/session account -> exact server-owned IdentityBinding -> canonical personId -> Project Participation + PermissionGrant -> NexusAccessDecisionRecord`

Never:

`req.user.id -> personId`

and never:

`email/name -> personId`.

## Persistence

New table:

`nexus_runtime_identity_bindings`

The table stores:

- binding ID;
- normalized provider/issuer key;
- SHA-256 fingerprint of provider subject;
- canonical Nexus Person ID;
- ACTIVE/revocation state;
- verification timestamp.

It deliberately does not create a `nexus_persons` runtime table. Canonical Person remains a Nexus Project Memory identity rather than a second auth-owned Person authority.

The raw provider subject is not persisted in this table.

## Runtime lookup

Database adapter:

`@workspace/db/nexus-runtime-identity-binding`

API server adapter:

`artifacts/api-server/src/lib/nexus-runtime-identity.ts`

The current Replit/OIDC `req.user.id` is used only as the external provider-subject input to the exact lookup.

Resulting runtime identity states preserve the existing #90 contract:

- unauthenticated -> `UNAUTHENTICATED`;
- authenticated without exact binding -> `UNBOUND`;
- authenticated with one exact ACTIVE binding -> `BOUND` + canonical `personId`.

A binding-store error in enabled postgres mode fails closed through `NEXUS_RUNTIME_IDENTITY_RESOLUTION_UNAVAILABLE`.

## Deployment gate

Binding persistence remains disabled unless:

`NEXUS_IDENTITY_BINDING_MODE=postgres`

No schema migration runs automatically.

Do not set this mode until the exact safe non-production `DATABASE_URL` for `nosmo-nexus-mvp` is identified and the schema is explicitly applied and inspected.

## Security properties

- exact issuer/provider key;
- exact provider-subject fingerprint;
- unique provider + subject binding;
- no email matching;
- no display-name matching;
- no automatic Person creation;
- no browser-supplied Person authority;
- no raw OIDC subject returned to browser;
- binding alone grants no project/world/module access.

## Relation to historical PR #55

PR #55 is donor material for the exact-binding principle and fail-closed runtime lookup.

This slice intentionally does not copy its separate `nexus_persons` table. That avoids creating a second canonical Person authority alongside the #90 Project Memory model.

## Next Cloud step

Persist/read the current #90 canonical authorization inputs:

- Project Participation;
- PermissionGrant;
- optional ModuleEntitlement / competence proof inputs.

Then the authenticated Cloud endpoint can compose:

`session -> IdentityBinding -> canonical access resolver -> Phase 17 write plan -> Drive writer -> persistence proposal -> Phase 19 transaction`.

## Still blocked

- safe `nosmo-nexus-mvp` non-production database not yet identified;
- this schema has not been pushed anywhere;
- no binding row has been created;
- no real BOUND session smoke has run;
- Google OAuth credential for Drive writer remains unprovisioned;
- GitHub Actions currently fail before runner steps.

## Protected surfaces

No changes to PR #91, Object Card, Relationship Tree, File Loader UI, Work Wallet, BIM/IFC/FabStation, Android Work Mode, DoorFlow, Electrical or Person Card UI.

Do not merge automatically.
