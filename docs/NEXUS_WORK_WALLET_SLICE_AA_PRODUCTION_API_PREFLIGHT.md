# Work Wallet Slice AA — production API activation preflight

Status: `IMPLEMENTED / READ-ONLY AUDIT PASS / REMOTE PREFLIGHT NOT RUN`

## Purpose

Slice Z removes all unverified production API hosts from the canonical MV3 extension. Slice AA defines the read-only evidence required before any future HTTPS origin may be added back as a Nexus Work Wallet connector API target.

## Operator verifier

Command:

`pnpm --filter @workspace/scripts verify:work-wallet-production-api-origin`

Required environment:

`NEXUS_WORK_WALLET_CANDIDATE_API_ORIGIN=https://<exact-reviewed-origin>`

The verifier accepts one exact HTTPS origin only. Credentials, path, query and fragment are rejected.

It performs only two GET probes with redirects disabled and credentials omitted:

1. `GET /health`
   - must return HTTP 200;
   - JSON `status` must be `ok`;
   - `service` must equal `nosmo-nexus-unified-runtime`;
   - a Work Wallet runtime status object must be present.

2. `GET /api/nexus/context-tickets/work-wallet/bootstrap` without metadata
   - must fail closed with HTTP 400;
   - response must contain the canonical invalid-bootstrap message.

This proves both runtime identity and route ownership without authenticating, issuing a ticket, consuming a ticket or touching the database.

## Safety

The verifier:

- uses GET only;
- follows no redirects;
- sends no cookies or credentials;
- reads no `DATABASE_URL`;
- sends no Authorization header;
- performs no bootstrap issue/exchange;
- performs no external Work Wallet operation;
- limits response-body size.

## CI

The remote verifier is deliberately NOT run by CI because CI must not decide production host activation from arbitrary external network state.

CI runs only:

`pnpm --filter @workspace/scripts audit:work-wallet-production-api-origin`

The audit verifies the read-only/no-auth/no-DB guardrails of the verifier source.

An isolated audit completed with:

`WORK_WALLET_PRODUCTION_API_PREFLIGHT_AUDIT_PASS`

No remote production-origin PASS is claimed.

## Activation sequence after a future remote PASS

A remote verifier PASS is necessary but not sufficient. Before enabling the host in the extension:

1. record the exact HTTPS origin;
2. configure server `NEXUS_CONTEXT_TICKET_SAME_ORIGINS`;
3. configure exact reviewed Chromium extension origin in `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`;
4. add the exact API origin coherently to MV3 host permissions, externally-connectable bootstrap match, service-worker allowlist and options UI;
5. run the API-host-truth validator;
6. identify and approve the Nexus MVP non-production Postgres target;
7. run DB preflight/readiness;
8. apply schema only to the approved non-production target;
9. run DB-backed Context Ticket smoke;
10. run unpacked Chrome E2E;
11. only then consider broader environment activation.

External capability remains exactly:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No deployment, DB mutation, external Work Wallet write, #91 change or protected UI change is included.
