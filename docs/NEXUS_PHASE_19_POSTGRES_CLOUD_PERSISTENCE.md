# NOSMO Nexus — Phase 19 PostgreSQL Cloud Persistence

Status: code prepared in the existing `@workspace/db` PostgreSQL/Drizzle layer. Database schema has NOT been pushed to any live environment by this phase.

## Purpose

Phase 19 turns the Phase 18 in-memory atomic/idempotent Cloud commit semantics into a durable PostgreSQL transaction boundary using the repository's existing database stack.

No second database technology is introduced.

Existing repository stack:

- `@workspace/db`;
- PostgreSQL through `DATABASE_URL`;
- Drizzle ORM / drizzle-kit;
- API server already depends on `@workspace/db` and `drizzle-orm`.

## Important separation from demo files

The existing `demo_files` table is intentionally unauthenticated demo storage and stores binary bodies directly in PostgreSQL.

Phase 19 does not reuse it for Nexus Cloud.

Canonical Nexus Cloud persistence stores metadata, canonical identity, provider references, storage references and audit state. Binary content remains in the configured provider.

## New schema

File:

`lib/db/src/schema/nexusProjectMemoryCloud.ts`

Tables:

- `nexus_pm_files`;
- `nexus_pm_canonical_objects`;
- `nexus_pm_external_references`;
- `nexus_pm_storage_records`;
- `nexus_pm_audit_events`;
- `nexus_pm_cloud_commits`.

All rows are workspace-scoped.

Canonical Nexus project/world IDs remain text IDs and are not coerced into the historical numeric `projects.id` model.

## Database uniqueness / identity rules

The schema provides durable conflict protection for:

- canonical Nexus File ID;
- canonical object ID;
- external reference ID;
- storage record ID;
- audit event ID;
- Cloud idempotency key;
- provider object identity per workspace + connector;
- provider storage object key per workspace + connector;
- committed file identity per workspace.

This means a retry cannot silently create a second canonical file for the same confirmed provider object.

## Transaction adapter

File:

`lib/db/src/nexusCloudPersistence.ts`

Package export:

`@workspace/db/nexus-cloud-persistence`

Function:

`persistNexusCloudCommit(input)`

Sequence inside one PostgreSQL transaction:

1. validate required transport fields;
2. check exact idempotency-key replay;
3. return `ALREADY_COMMITTED` for a complete exact replay;
4. reject mismatched reuse of the same idempotency key;
5. reject an already-bound provider object;
6. insert canonical File metadata;
7. insert canonical File object;
8. insert provider/external reference;
9. insert storage record;
10. insert audit event;
11. insert Cloud commit ledger last;
12. return `COMMITTED` only after the transaction completes.

If any insert or uniqueness constraint fails, PostgreSQL rolls the transaction back.

## Runtime boundary

Phase 19 is a DB adapter, not an upload implementation.

It does not:

- write a binary to Google Drive;
- configure OAuth/service accounts;
- expose credentials to the browser;
- issue a provider write receipt;
- grant Cloud access;
- create graph edges;
- mutate PR #91 Spark demo;
- push the new schema to a live database.

The intended runtime chain remains:

`canonical access -> provider write plan -> provider confirmation -> Phase 16 proposal -> Phase 18 semantic checks -> Phase 19 PostgreSQL transaction`

## Why the schema is not pushed automatically

The DB package uses `drizzle-kit push` against whatever `DATABASE_URL` is present in the execution environment.

Running that command without first identifying the target environment could mutate a shared or production/Replit database.

Therefore Phase 19 adds the schema and transaction code only. Applying the schema requires an explicit environment check and controlled DB migration/push step.

## Validation status

The source was reviewed against the existing Drizzle/PostgreSQL patterns in `lib/db`.

A local clone/typecheck attempt from the tool runtime could not run because that runtime could not resolve `github.com` over DNS. Do not report a local TypeScript PASS from that attempt.

PR #90 remains draft, so heavy GitHub Validate and Build may be skipped by workflow policy.

## Next controlled step

1. identify which `DATABASE_URL` environment is safe for development/testing;
2. inspect current schema diff before applying it;
3. apply Phase 19 tables to a non-production DB first;
4. execute transaction smoke cases:
   - first commit -> COMMITTED;
   - exact retry -> ALREADY_COMMITTED;
   - changed payload under same key -> conflict;
   - duplicate provider object -> conflict;
   - forced insert failure -> verify full rollback;
5. only after persistence smoke passes, connect a real provider write path;
6. graph linking stays a separate authorised/audited action.

PR #91 remains protected and untouched.
