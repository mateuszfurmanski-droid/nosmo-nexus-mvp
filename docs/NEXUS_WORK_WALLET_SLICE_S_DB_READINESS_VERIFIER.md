# Work Wallet Slice S — Read-only DB Readiness Verifier

Status: `IMPLEMENTED_IN_SOURCE / SOURCE_AUDIT_PASS / EXECUTION_PENDING / DB_NOT_IDENTIFIED`

## Purpose

Provide a final read-only gate between future Work Wallet development fixture bootstrap and any DB-backed HTTP/browser Context Ticket smoke.

This verifier does not repair, migrate, bootstrap or mutate Nexus data. It proves that the exact canonical runtime scope required by the Work Wallet ticket service exists in the reviewed non-production PostgreSQL target.

## Mandatory target gate

Execution requires explicit opt-in:

`NEXUS_DEV_WORK_WALLET_VERIFY=true`

Before a PostgreSQL pool is created, the verifier executes Slice P:

`verify-nexus-work-wallet-db-target.mjs --assert-safe-dev`

Therefore the target must already satisfy the reviewed development fingerprint/purpose, PostgreSQL identity-binding mode and exact Chromium extension-origin requirements.

## Read-only transaction

The verifier uses:

`BEGIN READ ONLY`

and always finishes with `ROLLBACK` before releasing the connection.

It contains no INSERT, UPDATE, DELETE, CREATE, ALTER or DROP operation.

## Readiness conditions

The exact configured synthetic scope must satisfy all of the following:

1. required Work Wallet/Nexus tables exist;
2. configured workspace exists;
3. canonical Person exists and is active;
4. exact OIDC provider + SHA-256 provider-subject digest resolves to exactly one ACTIVE, non-revoked binding for that Person;
5. deterministic connector account exists in the same workspace, has `connectorDefinitionId=work-wallet`, is connected and canonical status is active;
6. exact `workspace + connector account + external type + external record` lookup yields exactly one server-verified read-only mapping;
7. mapping resolves to the deterministic canonical Nexus Object in the exact project/world and the object is active;
8. exactly one active Project Participation exists for the canonical Person/project/world;
9. applicable Work Wallet `connector.context.read` grants contain no explicit deny;
10. the deterministic exact-object allow grant exists;
11. current Work Wallet AccessDecision history exists for the exact person/participation/project/world/object scope;
12. the latest decision timestamp is unambiguous;
13. the latest decision is the deterministic expected AccessDecision and is `allowed` both in indexed columns and canonical record JSON;
14. the Context Ticket table is present for the subsequent DB-backed issue/exchange smoke.

## Security boundary

The raw provider subject is never queried or persisted. It is hashed in process and only `provider_subject_digest` is queried.

The verifier does not print:

- provider subject;
- provider-subject digest;
- DATABASE_URL;
- DB host/user/password;
- session identifiers;
- raw Context Tickets.

Its successful output contains only canonical development-scope IDs required to hand off to the subsequent controlled smoke.

## Source guardrail audit

`audit:nexus-work-wallet-db-readiness` checks that the verifier retains:

- explicit opt-in;
- Slice P preflight-before-Pool ordering;
- `BEGIN READ ONLY` + rollback cleanup;
- digest-only identity lookup;
- revoked binding rejection;
- Work Wallet connector-account binding;
- exactly one verified mapping;
- exactly one active Participation;
- explicit deny rejection + explicit allow requirement;
- latest temporal AccessDecision ambiguity rejection;
- latest allowed AccessDecision requirement;
- Context Ticket table presence;
- no INSERT/UPDATE/DELETE/DDL;
- no sensitive runtime logging.

Expected audit marker:

`WORK_WALLET_DB_READINESS_AUDIT_PASS`

The non-mutating audit is wired into normal `Validate and Build`.

## Validation truth

Current GitHub source was inspected in full and satisfies the audit invariants:

`SOURCE_AUDIT_PASS`

The executable audit could not be run in the current local tool runtime because `raw.githubusercontent.com` DNS resolution remains unavailable. GitHub Actions also remains affected by the known runner-startup failure pattern. Therefore `WORK_WALLET_DB_READINESS_AUDIT_PASS` is not claimed as executed yet.

The live readiness verifier itself has NOT been run because:

- the safe `nosmo-nexus-mvp` development PostgreSQL target is still not identified;
- Work Wallet schema is not applied;
- canonical development identity/access/mapping fixture is not bootstrapped.

## Next controlled sequence

1. identify the actual non-production Nexus MVP PostgreSQL target;
2. inspect and independently approve its Slice P fingerprint;
3. inspect Drizzle diff;
4. apply only the reviewed schema to that development target;
5. run the separate canonical Person/OIDC identity bootstrap;
6. run Slice R synthetic Work Wallet fixture bootstrap;
7. run this Slice S read-only verifier;
8. only if readiness returns `ready: true`, run DB-backed Context Ticket issue/exchange smoke;
9. then unpacked Chrome E2E;
10. Edge smoke afterwards.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree layout/gestures, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge, deploy, migrate or execute fixture/bootstrap commands automatically.
