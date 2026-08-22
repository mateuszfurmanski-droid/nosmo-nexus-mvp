# NOSMO Nexus — Unified Authenticated Runtime for Cloud

Status: integration slice stacked on PR #112. Deployment topology is proposed in branch configuration only; nothing is deployed or merged automatically.

## Purpose

Ensure the eventual Nexus Cloud upload endpoint runs inside the same authenticated runtime that owns OIDC/session, workspace resolution and canonical access decisions.

The previous repository deployment configuration started:

`@workspace/scripts serve-nexus`

while OIDC/session and the new canonical Cloud authority live in:

`@workspace/api-server`

A real Cloud write must not be mounted on an unauthenticated/static helper runtime.

## Canonical runtime direction

This slice makes the existing API server the proposed unified Nexus runtime for:

- OIDC/session middleware;
- authenticated/workspace API routes;
- canonical runtime Person binding;
- canonical Project Participation/PermissionGrant Cloud authority;
- existing Work Wallet gateway through delegation, not duplication;
- built Nexus SPA assets and non-API history fallback.

## Work Wallet preservation

The existing `scripts/src/work-wallet-api.mjs` remains the only Work Wallet gateway business implementation.

`artifacts/api-server/src/lib/work-wallet-runtime.ts` dynamically loads and delegates to it.

The bridge is mounted before generic JSON parsing so the existing Work Wallet raw-body boundary remains intact.

No Work Wallet mapping/event behavior is copied or redesigned.

## Runtime path safety

`nexus-runtime-paths.ts` resolves the repository root from verified marker files rather than assuming process cwd.

Supported candidates include:

- explicit `NEXUS_RUNTIME_ROOT`;
- `INIT_CWD`;
- package/runtime-relative candidates.

The resolver must find the existing Work Wallet module and Nexus web package markers before accepting a root.

## Proposed Replit topology

The branch changes `.replit` from:

`build frontend -> run scripts serve-nexus`

to:

`build frontend + API server -> run authenticated API server`.

This is source configuration only. No Replit deployment was executed.

## SPA/API boundary

The API server serves the built Nexus SPA after API middleware.

History fallback never rewrites `/api/*` requests to `index.html`.

## CI database safety

This slice defines an exact disposable PostgreSQL 16 service inside GitHub Actions:

`postgresql://postgres:postgres@127.0.0.1:5432/nexus_cloud_ci`

This database exists only inside the CI job and is explicitly non-production. Therefore `drizzle-kit push` is permitted only against this job-local URL for schema validation.

No external `DATABASE_URL` is used and no deployment database is modified.

Current GitHub Actions infrastructure has been failing before runner steps, so this CI path is prepared but must not be reported as executed until a runner actually starts.

## Unified runtime smoke intent

When Actions becomes available, CI will:

1. start disposable PostgreSQL;
2. install dependencies;
3. validate runtime topology;
4. typecheck workspace;
5. run existing Cloud pure/mock smokes;
6. build Nexus web;
7. build API server;
8. apply schema only to disposable CI Postgres;
9. start the exact proposed API-server runtime;
10. verify external health, API health, SPA/history fallback and delegated Work Wallet behavior.

## Cloud authority alignment

The validator checks that the unified runtime contains:

- exact runtime IdentityBinding resolution;
- no direct `req.user.id -> personId` promotion;
- Project access persistence loading;
- delegation to the canonical `resolveNexusCloudWriteAccess` policy engine.

No Cloud provider write is performed by this slice.

## Next engineering slice

Move/reconcile the PR #93 Google Drive writer into a shared server provider runtime that can be called by `@workspace/api-server` without maintaining a second writer implementation.

Then mount one authenticated multipart endpoint composing:

`File -> Pending Asset v2 -> canonical authority -> Phase 17 provider plan -> Drive writer -> receipt -> Phase 16 proposal -> PR #97 DB input -> Phase 19 transaction`.

## Remaining external gates

- server-side Google OAuth client/refresh-token secret for the My Drive pilot;
- server-owned provider target mappings;
- controlled binding/participation/allow records in a safe runtime database;
- real Actions runner or equivalent executable environment for validation;
- real Drive + DB smoke before any live-integration claim.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree UI/gestures, File Loader UI, BIM/IFC/FabStation, Android Work Mode, DoorFlow, Electrical and Person Card UI are unchanged.

Do not merge automatically.
