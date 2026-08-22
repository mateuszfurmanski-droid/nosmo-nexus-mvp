# Work Wallet Reconciliation — Slice Y: Extension-Only Additional Exchange Origins

Status: `IMPLEMENTED / ISOLATED PASS / LIVE HTTP-BROWSER E2E PENDING`

External capability remains exactly:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

## Scope

Slice Y completes the origin-authority separation introduced by Slice W.

Two server-owned configuration channels now have distinct responsibilities:

- `NEXUS_CONTEXT_TICKET_SAME_ORIGINS` — approved web origins;
- `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS` — additional exact Chromium extension origins only.

## Hardening

Before Slice Y, `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS` could parse both:

- `chrome-extension://<id>`;
- arbitrary normalized HTTPS origins.

After Slice W, approved web origins already have their own explicit exact allowlist. Retaining HTTPS parsing in the additional exchange list created unnecessary configuration overlap and a misconfiguration path.

Slice Y removes HTTPS parsing from the additional exchange list.

Only values matching:

`chrome-extension://[a-p]{32}`

are accepted there.

## Exchange behavior

`isAllowedContextTicketExchangeOrigin` now authorizes:

1. an exact approved web origin through `isSameOriginRequest` / `NEXUS_CONTEXT_TICKET_SAME_ORIGINS`; or
2. an exact reviewed Chromium extension origin through `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`.

A web origin placed only in `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS` is ignored and rejected.

## Bootstrap compatibility

The authenticated bootstrap already validates its `extensionId` by constructing the exact `chrome-extension://<id>` origin and checking the same extension-only allowlist. Slice X has an explicit regression for a valid but unapproved extension ID.

## Validation

The existing Context Ticket origin-boundary regression was updated to verify channel separation.

An isolated behavioral harness completed with:

`WORK_WALLET_ORIGIN_CHANNEL_SEPARATION_PASS`

It verifies:

- exact extension origin in additional allowlist -> accepted;
- HTTPS origin in additional allowlist -> ignored/rejected;
- approved web origin in SAME_ORIGINS -> accepted;
- the same HTTPS exchange origin becomes valid only after explicit SAME_ORIGINS approval.

GitHub-hosted CI PASS is not claimed while Actions continues to fail before runner steps.

## Remaining external blockers

- trusted Nexus MVP development PostgreSQL target: not identified;
- schema: not applied;
- canonical development identity/fixture bootstrap: not run;
- DB-backed Context Ticket smoke: not run;
- unpacked Chrome E2E: blocked by current container browser administrator policy;
- Edge smoke: pending;
- authorised real Work Wallet portal smoke: pending.

No merge, deployment, DB mutation, external Work Wallet write, PR #91 modification or protected UI change is included.
