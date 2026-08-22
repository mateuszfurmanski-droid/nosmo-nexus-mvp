# Work Wallet Slice M — Canonical Ticket Pipeline Test

Status: `IMPLEMENTED / EXECUTION PENDING / NO RUNTIME BYPASS`

## Purpose

Exercise the current Work Wallet reconciliation as one canonical in-process pipeline without requiring a live PostgreSQL target:

`persisted-scope-shaped canonical records -> exact mapping -> #99 access -> short-lived ticket -> single-use consume -> current access/mapping re-check -> #95 sanitized verified context`

The in-memory store remains test-only. Production routes continue to use PostgreSQL and the existing Nexus authentication/Person binding path.

## Test fixture

The fixture uses the current canonical record shapes for:

- Nexus Person;
- Canonical Object;
- Work Wallet connector object mapping;
- Project Participation;
- PermissionGrant;
- AccessDecision.

It does not create a Work Wallet-specific role/ACL model and does not treat the external Work Wallet record reference as a Nexus identity.

## Positive path

The test requires:

1. exact `connectorAccountId + externalObjectType + externalRecordReference` mapping;
2. active canonical Person;
3. active exact Project/World object;
4. exactly one active Project Participation;
5. explicit Work Wallet `connector.context.read` allow grant;
6. latest exact `allowed` AccessDecision;
7. ticket issued with canonical Person/Participation/Decision/Object/workspace scope;
8. one successful consume;
9. current canonical scope re-evaluated using `server-context-ticket` identity source;
10. frozen ticket Person/Participation/Decision/Object IDs still equal current eligible IDs;
11. sanitized `nexus-work-wallet-context/v1` built only after the re-check.

Expected positive marker:

`WORK_WALLET_CANONICAL_TICKET_PIPELINE_PASS`

## Access changed after issue

A second ticket is issued from an initially valid scope. Before the post-consume re-check, the exact grant is changed to `deny`.

Expected result:

- consume can still atomically consume the capability;
- current canonical re-check returns `ACCESS_REJECTED`;
- reason is `EXPLICIT_DENY`;
- no verified context is built.

This mirrors the fail-closed exchange semantics in PR #114: a ticket is not a durable permission grant.

## Mapping changed after issue

The exact Work Wallet connector mapping is removed before re-check.

Expected result:

`MAPPING_REJECTED`

The external Work Wallet reference is never promoted to a Nexus Object ID to compensate for the missing mapping.

## Context assertions

Successful context must retain:

- schema `nexus-work-wallet-context/v1`;
- `CONNECTOR_VERIFIED_CONTEXT`;
- confidence `1`;
- canonical Person ID;
- canonical Nexus Object ID;
- exact external record reference;
- `WORK_WALLET_DEMO` / `developmentContext=true`;
- exact capability label:
  `DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`.

## Validation integration

`@workspace/api-server` exposes:

`validate:work-wallet-canonical-pipeline`

The repository workflow invokes it after the MV3 receiver and Context Ticket core validators.

GitHub Actions runner failures before `steps`/logs remain infrastructure-blocked and are not reported as validation failures of this code.

No database schema was applied, no external Work Wallet write was introduced, and protected Nexus/Spark/UI tracks were not changed.
