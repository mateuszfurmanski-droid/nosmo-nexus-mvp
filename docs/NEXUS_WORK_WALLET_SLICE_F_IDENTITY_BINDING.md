# NOSMO Nexus — Work Wallet Slice F / Shared Identity Binding

Status: IMPLEMENTED_IN_SOURCE / DB_SCHEMA_NOT_APPLIED / RUNTIME_BOUND_SMOKE_PENDING

Base: PR #102 / `codex/work-wallet-reconcile-slice-e-ticket-core`

External capability label:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

## Purpose

Resolve the current shared Nexus blocker:

`authenticated provider subject -> exact server-owned IdentityBinding -> canonical Nexus Person`

Never:

`OIDC subject / users.id / email / Work Wallet identity = Nexus personId`.

This is a shared Nexus identity boundary, not a Work Wallet-specific Person system. Android Work Mode and future Nexus runtimes may reuse the same binding.

## Implemented

- canonical Person persistence table `nexus_pm_people` for the existing Project Memory `NexusPersonRecord` identity;
- exact provider binding table `nexus_identity_bindings`;
- raw provider subjects are not persisted in the binding table;
- runtime stores/looks up SHA-256 provider-subject digest under an exact normalized OIDC issuer key;
- active, non-revoked binding + active canonical Person required;
- no email/name fuzzy matching;
- no automatic login-time Person creation;
- binding resolution disabled unless `NEXUS_IDENTITY_BINDING_MODE=postgres`;
- read-only `/api/nexus/session` exposes only `UNAUTHENTICATED`, `UNBOUND` or `BOUND` canonical state;
- provider subject, session ID, provider tokens and provider key remain server-side;
- `canIssueContextTicket=false` remains invariant even for BOUND Person until canonical project access is resolved;
- guarded development-only bootstrap exists for future local/staging smoke.

## Development bootstrap

Command:

`pnpm --filter @workspace/db bootstrap-nexus-identity`

Required guards include:

- non-production environment;
- `NEXUS_DEV_IDENTITY_BOOTSTRAP=true`;
- explicit canonical Person ID;
- explicit provider subject;
- explicit display name;
- exact issuer configuration.

The bootstrap hashes the provider subject before persistence and rejects reassignment to a different Person.

## Database state

`DB_SCHEMA_NOT_APPLIED`

No schema push, migration application or database mutation was executed by this slice.

## Still required before ticket routes

1. Persist/load canonical Project Participation records.
2. Persist/load explicit PermissionGrant records.
3. Persist/load canonical AccessDecision records.
4. Build a server-owned Project Memory access snapshot for the requested Person/project/world/object.
5. Invoke PR #99 eligibility at ticket issue.
6. Re-check canonical access after ticket consume before returning context.

## Protected surfaces

Untouched:

- PR #91 Spark SKANSKA Demo Core;
- Object Card design;
- Relationship Tree gestures/layout;
- Person Card UI;
- Google Drive / Nexus Cloud track;
- BIM / IFC / FabStation track;
- Android implementation;
- DoorFlow;
- Electrical Commissioning.
