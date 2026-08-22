# NOSMO Nexus — Phase 14 Auth / Identity Reconciliation

Status: foundation boundary implemented in PR #90. Existing auth/runtime donor branches remain unmerged and unchanged.

## Purpose

Phase 14 reconciles the historical PKG-017 / PKG-016 auth, Person binding, Project Participation and connector-ticket stack with the current PR #90 Project Memory/access contracts.

The objective is not to create another auth system.

The boundary is:

`OIDC/session -> exact IdentityBinding -> canonical personId -> #90 access resolver -> explicit access decision`

Never:

`OIDC subject / email / external connector identity -> project permission`.

## Protected surfaces

This phase does not modify:

- PR #91 Spark / SKANSKA demo;
- live Relationship Tree;
- Person Card UI;
- existing OIDC/session runtime;
- Work Wallet gateway;
- Context Ticket endpoints;
- database tables on historical branches;
- production deployment configuration.

## Historical donor stack reviewed

### PR #54 — canonical browser session facade

Keep the principle:

- unauthenticated account = `UNAUTHENTICATED`;
- authenticated account without canonical binding = `UNBOUND`;
- provider subject is not exposed as `personId`;
- browser session is `no-store`;
- identity alone does not grant project permission.

This direction is compatible with #90.

### PR #55 — canonical Person identity binding

Keep the principle:

`exact provider + exact providerSubject -> canonical Nexus personId`

with:

- no email/name fuzzy matching;
- no automatic Person creation from login;
- server-owned binding;
- revoked/inactive bindings rejected;
- binding store failure fails closed.

The historical `nexus_persons` table can be treated as a runtime persistence donor, but the canonical Person semantic model remains the #90 `NexusPersonRecord` / Person Card model.

A future persistence reconciliation must avoid two conflicting Person authorities.

### PR #56 — Project Participation authorization

Important semantic drift exists.

Historical #56 policy allowed the initial Work Wallet application surface when exactly one active participation existed and no explicit deny existed.

That is no longer sufficient for #90.

Current #90 policy requires:

1. resolved canonical Person identity;
2. active Project Participation;
3. matching project/world scope;
4. explicit matching allow grant for the requested module/action/scope;
5. no matching explicit deny;
6. any required competence/module gates;
7. a canonical access decision.

Therefore:

`active participation alone != permission`.

The old `ACTIVE_PARTICIPATION_SHARED_ACCESS` behavior must not be ported unchanged.

## Historical Project Participation persistence drift

The historical DB table stores:

- functions;
- assignments;
- trade scopes;
- work-package scopes;
- application permissions

inside one Project Participation row, with several JSON fields.

PR #90 now separates these concepts into canonical records:

- `NexusProjectParticipationRecord`;
- `NexusRoleAssignmentRecord`;
- `NexusTradeAssignmentRecord`;
- `NexusPermissionGrantRecord`;
- `NexusManagerTradeContextRecord`;
- `NexusAccessDecisionRecord`.

Future runtime integration should adapt DB persistence to these canonical semantics rather than copying the old JSON authorization model into the new foundation.

A transitional DB adapter is acceptable, but it must produce the #90 canonical access inputs and must not create a second permission engine.

## PR #57 — unified runtime

Keep as a strong runtime donor:

- one Express runtime;
- reuse existing OIDC/session implementation;
- reuse existing Work Wallet gateway rather than copying it;
- mount API routes and SPA in one controlled runtime;
- never rewrite `/api/*` to SPA history fallback;
- preserve raw Work Wallet request-body ownership before generic body parsing;
- explicit runtime-root resolution rather than assuming process cwd.

Do not copy its older Project Participation allow semantics unchanged.

## PR #59–#61 — short-lived connector Context Ticket path

The capability-ticket architecture remains useful:

- server-issued opaque short-lived ticket;
- single-use exchange;
- raw ticket not persisted;
- exact scope/purpose;
- exact origin allowlist;
- no browser integration secret;
- no client-supplied Person/participation authority;
- current Project Participation/access rechecked during issue/exchange;
- bootstrap ticket not placed in URL/storage.

However, future ticket eligibility must consume the canonical #90 access decision rather than the old `active participation + no deny` shortcut.

Ticket issuance is downstream of access authority, never the authority itself.

## New #90 foundation contract

Added:

`src/core/permissions/runtimeIdentityContract.ts`

It defines:

- `NexusRuntimeIdentityState`;
- `NexusRuntimeIdentityContext`;
- identity-state validation;
- `NexusRuntimeAccessBridgeRequest`;
- fail-closed runtime access preflight.

## Identity state rules

### UNAUTHENTICATED

- `authenticated=false`;
- no `personId`;
- project access denied.

### UNBOUND

- `authenticated=true`;
- no canonical `personId`;
- project access denied.

### BOUND

- `authenticated=true`;
- exact canonical `personId` present;
- identity is valid for access evaluation;
- project access is still NOT granted.

A BOUND identity advances only to:

`CANONICAL_ACCESS_DECISION_REQUIRED`.

## Runtime access bridge rule

`preflightNexusRuntimeAccess(...)` deliberately never returns `allowed=true`.

Its responsibility is only to establish whether the runtime has a valid canonical Person identity that may enter the #90 access resolver.

The canonical resolver must then evaluate:

- participation;
- role/trade assignments where relevant;
- explicit permission grants;
- explicit denies;
- module state;
- object/action scope;
- competence gates where required;
- policy version.

Only that layer may create the authoritative allow/deny outcome.

## Security boundary

The runtime identity bridge must never contain:

- raw OIDC subject in browser-facing context;
- session id;
- access token;
- refresh token;
- provider secret;
- connector integration secret;
- email-derived authority;
- role inferred from display name;
- Work Wallet record identity promoted to Nexus Person identity.

Provider identity resolution remains server-owned.

## Manager/trade boundary

`ManagerTradeContext` remains a UI/filtering context only.

It does not grant access and cannot replace a permission grant.

## Validation

A focused strict TypeScript compile was run against the new runtime identity/access bridge contract and required #90 base types:

`tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution node`

Result: PASS.

This is not a full repository build.

PR #90 remains draft, so the main heavy workflow may remain skipped by design.

## Not implemented in Phase 14

- OIDC code changes;
- DB migrations;
- runtime branch merge;
- Project Participation DB adapter;
- full access resolver runtime;
- Context Ticket changes;
- Work Wallet changes;
- auth UI;
- Person Card changes;
- Spark demo changes;
- deployment changes.

## Controlled integration sequence after Phase 14

1. Keep historical #54/#55 identity rules as donors.
2. Do not port #56 `ACTIVE_PARTICIPATION_SHARED_ACCESS` unchanged.
3. Define a persistence adapter from runtime DB rows into #90 Person/Participation/Grant semantics.
4. Reuse #57 unified runtime topology instead of creating another server.
5. Route every protected request through the #90 access resolver.
6. Only then reconnect PKG-016 Context Ticket issuance/exchange to canonical access decisions.
7. Reconcile Work Wallet connector context separately under PKG-004.
8. Perform authenticated staging smoke before production claims.

## Core rule

Authentication proves an account/session.

Identity binding proves which canonical Nexus Person that session represents.

Project Participation proves a relationship with a project.

Permission grants and policy evaluation decide what that Person may actually do.

These are separate layers and must remain separate.
