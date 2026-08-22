# Work Wallet Reconciliation — Slice W: HTTP / Origin Boundary

Status: `IMPLEMENTED / ISOLATED ORIGIN BEHAVIOR PASS / LIVE HTTP E2E PENDING`

External capability remains exactly:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

## Scope

Slice W hardens the Context Ticket HTTP origin boundary. It does not change canonical Person binding, mapping, Project Participation, permissions, access decisions, ticket TTL/single-use behavior, extension UI, vendor capability, or any external Work Wallet write path.

## Problem closed

The earlier `request-origin.ts` reconstructed an expected request origin from:

- `X-Forwarded-Proto`;
- `X-Forwarded-Host`;
- `Host` as fallback.

The unified Express runtime does not configure Express `trust proxy`, while that helper independently trusted forwarded headers for a security decision. This made Context Ticket same-origin authorization dependent on transport/proxy headers rather than a server-owned origin policy.

Slice W removes Host and `X-Forwarded-*` from Context Ticket authorization authority.

## Server-owned web-origin policy

Same-origin Context Ticket issue/exchange now uses:

`NEXUS_CONTEXT_TICKET_SAME_ORIGINS`

The value is a comma-separated exact allowlist.

Production accepts only normalized HTTPS origins with:

- no credentials;
- no path other than `/`;
- no query;
- no fragment.

Production is fail-closed when no approved web origin is configured.

In non-production only, the exact loopback origin below is automatically available:

`http://127.0.0.1:3000`

`http://localhost:3000` is not implicitly equivalent.

Before any public/runtime connector smoke, the actual Nexus public origin must be explicitly configured, for example the reviewed Nexus web origin used by that environment. No deployment is performed by this slice.

## Browser declaration handling

For web same-origin authorization:

- exact `Origin` is preferred;
- `Referer` may provide its origin when `Origin` is absent;
- if both are present they must resolve to the same origin;
- malformed origins fail closed;
- `Origin: null` fails closed;
- port differences are significant;
- lookalike/suffix domains are not accepted.

No Host, forwarded host or forwarded proto value can make an unapproved browser origin pass.

## Chromium extension origin remains separate

The exact raw `Origin` header remains available to the existing exchange-origin policy so that a reviewed origin such as:

`chrome-extension://<exact-32-char-extension-id>`

can be matched against:

`NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`

The extension origin is not added to the web same-origin allowlist and does not become a web origin.

## Route ordering

Issue route order remains:

1. no-store headers;
2. same-origin rejection;
3. workspace resolution;
4. auth/session checks;
5. canonical Person/mapping/access orchestration;
6. ticket issue.

Exchange route order remains:

1. no-store headers;
2. exact allowed-origin rejection;
3. ticket body parsing;
4. atomic consume through the canonical service;
5. current Project Memory reload;
6. access re-check;
7. verified context response.

A rejected origin therefore cannot consume a valid Context Ticket.

## Validation

Added:

- `validate:work-wallet-context-ticket-origin`;
- `audit:work-wallet-context-ticket-origin-order`.

Behavioral coverage includes:

- exact approved HTTPS origin;
- lookalike HTTPS origin;
- wrong port;
- spoofed `X-Forwarded-Host` / `X-Forwarded-Proto`;
- Host spoof input;
- approved Referer fallback;
- Origin/Referer mismatch;
- `Origin: null`;
- missing declaration;
- exact reviewed Chromium extension origin;
- extension-origin lookalike;
- exact configured additional HTTPS exchange origin;
- development loopback only.

An isolated Node harness using the Slice W origin semantics completed with:

`WORK_WALLET_CONTEXT_TICKET_ORIGIN_BOUNDARY_PASS`

Current GitHub source was also inspected and confirms the issue middleware precedes workspace resolution and exchange origin rejection precedes ticket parsing/service invocation: `SOURCE_ORDER_AUDIT_PASS`.

GitHub-hosted execution remains subject to the known repository Actions runner-startup problem; no GitHub-hosted PASS is claimed until steps actually execute.

## Remaining external blockers

- trusted Nexus MVP development PostgreSQL target: `NOT IDENTIFIED`;
- Work Wallet schema applied to development: `NO`;
- Person/OIDC development binding bootstrap: `NOT RUN`;
- synthetic Work Wallet canonical fixture: `NOT RUN`;
- DB-backed Context Ticket smoke: `NOT RUN`;
- unpacked Chrome E2E: blocked by current container browser administrator policy;
- Edge smoke: pending;
- authorised real Work Wallet portal smoke: pending;
- vendor-approved/live Work Wallet API: unavailable/not approved.

No merge, deployment, schema push, fixture bootstrap, external Work Wallet write, PR #91 modification or protected UI change is part of Slice W.
