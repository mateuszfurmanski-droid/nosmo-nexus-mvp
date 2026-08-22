# Work Wallet Slice Q — DB Schema / Read-Path Invariant Audit

Status: `IMPLEMENTED / CURRENT_SOURCE_REVIEW_PASS / EXECUTABLE_CI_PENDING / DB_SCHEMA_NOT_APPLIED`

## Purpose

Audit the proposed Work Wallet persistence and read path before any PostgreSQL schema application. This slice does not change authorization semantics and does not connect to a database.

## Identity invariants

The audit requires:

- canonical `nexus_pm_people` persistence;
- separate `nexus_identity_bindings`;
- provider identity stored as `provider_subject_digest`, never raw provider subject;
- unique provider + subject-digest binding;
- binding -> canonical Person foreign key with restrictive deletion;
- no email column in the identity-binding table.

## Access / mapping invariants

The audit requires persistence for the existing canonical records:

- Project Participation;
- PermissionGrant;
- AccessDecision;
- connector account;
- connector object mapping.

It verifies workspace scoping and foreign keys from:

- Participation -> canonical Person;
- PermissionGrant -> Participation;
- mapping -> connector account;
- mapping -> canonical Nexus Object.

The exact Work Wallet mapping lookup index must include:

`workspace + connector account + external object type + external object ID`.

The audit deliberately rejects adding a connector-mapping UNIQUE constraint that would replace the existing canonical ambiguity rule. Multiple verified candidates must remain detectable by the domain contract and fail closed as `AMBIGUOUS_MAPPING`.

## Context Ticket invariants

The audit requires:

- `ticket_digest` as the primary key;
- no raw ticket column;
- `issued_session_digest`, not raw session ID;
- frozen workspace/person/project/world/participation/access-decision/Nexus-object/connector-account scope;
- purpose/action scope;
- issue timestamp and expiry;
- nullable consumed timestamp used by atomic consume;
- indexes for rate-limit lookup, expiry, consumed state and frozen canonical scope.

The ticket table intentionally does not become a second canonical authority. Current canonical access and mapping are reloaded after consume.

## Server read-path invariants

The audit also covers `loadNexusWorkWalletProjectMemoryScope(...)` and requires:

- connector account lookup scoped by workspace + exact account;
- AccessDecision lookup scoped to module `work-wallet` and action `connector.context.read`;
- mapping lookup scoped by workspace + connector account + external object type + exact external record reference;
- canonical object lookup scoped by workspace + project + world;
- grant lookup scoped by workspace + Participation;
- cross-checks between indexed columns and canonical `recordJson` IDs/scope fields.

This prevents indexed lookup fields and canonical record payloads from silently diverging.

## Executable audit

Adds:

`lib/db/scripts/audit-nexus-work-wallet-schema.mjs`

Command:

`pnpm --filter @workspace/db audit:nexus-work-wallet-schema`

Expected marker:

`WORK_WALLET_DB_SCHEMA_AUDIT_PASS`

The command is wired into the normal `Validate and Build` workflow after the DB-target preflight test.

## Current review result

The current Slice P source was inspected before this audit was added. It satisfies the invariants above:

- no raw provider subject persistence;
- no raw Context Ticket persistence;
- no raw issuing session ID persistence;
- unique provider + subject digest binding;
- workspace-scoped access/account/mapping persistence;
- mapping foreign keys to connector account and canonical object;
- digest-only Context Ticket with single-use/expiry fields;
- exact Work Wallet read-path constraints and record/index integrity checks.

The executable audit is implemented but a GitHub Actions execution is still pending because the repository runner currently fails before checkout (`steps=null`). This is not reported as an executable PASS.

## DB state

`DB_SCHEMA_NOT_APPLIED`.

No `drizzle-kit push`, `push-force`, bootstrap or database mutation is performed by this slice.

The safe development database target is still not identified. Slice P preflight remains mandatory before any schema review/application against a real environment.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree gestures/layout, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge, deploy or apply DB schema.
