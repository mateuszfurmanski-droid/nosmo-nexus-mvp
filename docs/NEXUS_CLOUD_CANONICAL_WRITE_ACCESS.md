# NOSMO Nexus — Canonical Cloud Write Access Gate

Status: narrow Cloud integration slice stacked on PR #97. No database migration, provider write or UI change is performed by this slice.

## Purpose

Close the policy gap between an authenticated runtime identity and the existing Phase 17 Google Drive provider write-plan gate.

The required authority path is:

`authenticated runtime -> canonical Person -> exact Project Participation -> explicit permission grant/deny -> NexusAccessDecisionRecord -> Phase 17 provider write plan`

Never:

`login/workspace -> Drive write`

and never:

`active Project Participation -> Drive write`.

## Implementation

New canonical resolver:

`src/core/permissions/canonicalAccessResolver.ts`

Cloud-specific bridge:

`src/core/storage/cloudAccessResolution.ts`

The Cloud bridge always evaluates the exact action:

- module: `cloud`
- action: `cloud.file.write`

The returned `NexusAccessDecisionRecord` can be passed directly to the existing Phase 17 `createNexusCloudProviderWritePlan(...)` gate.

## Fail-closed rules

A Cloud write is denied unless:

1. canonical `personId` is resolved server-side;
2. exactly one active Project Participation exists for the exact `personId + projectId + worldId`;
3. the participation is inside its validity window;
4. no matching explicit deny exists;
5. an exact explicit allow exists for `cloud.file.write`;
6. scoped grants match the requested scope exactly;
7. module state, when supplied, is enabled;
8. required competence gates, when supplied, are proven satisfied.

Explicit deny wins over allow.

A broader deny may block a narrower write. An allow is deliberately stricter: sensitive Cloud writes require an exact module + action grant.

Role assignment, trade assignment, profession, qualification, login identity, email or workspace ownership do not grant Cloud write authority by themselves.

## Historical donor reconciliation

PR #55 remains a useful donor for exact provider-subject -> canonical Person binding persistence.

PR #56 is not ported unchanged because its historical `active participation -> allow` policy is weaker than current #90 semantics.

Only its server-side persistence/resolution pattern is reusable. Current authority requires explicit grant evaluation and explicit deny precedence.

## Smoke

`src/core/permissions/canonicalAccessResolverSmoke.ts`

Covers:

- exact Cloud write grant -> ALLOWED;
- unbound identity -> DENIED;
- missing grant -> DENIED;
- wrong world -> DENIED;
- ambiguous multiple active participations -> DENIED;
- explicit deny precedence -> DENIED;
- expired allow -> DENIED.

CI command:

`pnpm --filter @workspace/scripts smoke:nexus-cloud-access-resolver`

The command performs an isolated strict TypeScript compile of the resolver files and executes the pure smoke. It performs no provider call and no DB mutation.

## Still blocked

This slice does not pretend that runtime canonical identity persistence already exists.

Still required for real E2E:

1. server-owned IdentityBinding persistence adapted from PR #55 into current #90 semantics;
2. persisted Project Participation and PermissionGrant read adapter;
3. safe non-production `DATABASE_URL` for `nosmo-nexus-mvp`;
4. schema application and DB smoke;
5. server-side Google OAuth credential for the current My Drive pilot;
6. authenticated Cloud endpoint that composes:
   - Pending Asset v2;
   - canonical access resolver;
   - Phase 17 provider write plan;
   - PR #93 Drive writer;
   - Phase 16 persistence proposal;
   - PR #97 DB-input bridge;
   - Phase 19 transaction.

## Protected surfaces

Unchanged:

- PR #91 Spark SKANSKA demo;
- accepted Object Card design;
- Relationship Tree UI/gestures;
- File Loader UI;
- Work Wallet;
- BIM/IFC/FabStation;
- Android Work Mode;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI.

No automatic merge.
