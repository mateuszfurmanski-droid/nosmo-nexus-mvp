# Nexus Cloud / Core staging auth convergence

Status date: 2026-08-27

Scope: NON_PRODUCTION only.

PR #176 is a thin child over PR #150. It reuses the canonical staging-device identity direction from PR #173 without importing manager UI from PR #175 and without creating a second Cloud authentication model.

## Runtime invariants

- Google OAuth credential remains server-side.
- Google Drive runtime remains `writeEnabled=false`.
- Cloud upload workspace is resolved from authenticated canonical Person -> exact active e-SAFE Project Participation.
- The legacy personal `ensureWorkspace` path is not used for Cloud writes on this child.
- Staging-device provider subjects are opaque and random.
- Only provider-subject digests are persisted in identity bindings.
- One-time claim codes are stored only as digests and are consumed atomically.
- Permission authority remains canonical ProjectParticipation + PermissionGrant with explicit deny precedence.
- No production deployment or production database is touched.

## Live staging database audit

The existing `nosmo-nexus-cloud-staging / nexus_cloud_staging` database already contains:
- canonical identity claim schema;
- canonical Joanna and Mateusz Persons/Participations for e-SAFE;
- a separate dedicated `Nexus Cloud Staging E2E` Person;
- one exact `cloud.file.write` allow grant scoped to that dedicated staging Person's Participation.

No additional real-user Cloud grant is required for the controlled test.

## Controlled sequence

1. exact-head CI/build;
2. create one expiring claim for the dedicated staging Cloud Person;
3. prove staging session -> binding -> exact e-SAFE Participation -> cloud.file.write allow while Drive release is false;
4. insert temporary exact deny, prove fail-closed, remove deny;
5. only then consider one temporary controlled Drive write release;
6. require real Drive receipt + Project Memory COMMITTED;
7. retry same idempotency key and prove no duplicate provider object;
8. return write release to false.

## Live control execution note

The dedicated synthetic staging Participation and its exact cloud.file.write allow grant were refreshed on 2026-08-27 for the bounded control window after the original 2026-08-23 validity interval had expired.
