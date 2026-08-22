# Work Wallet Slice I — Context Ticket Issue / Exchange Routes

Status: `IMPLEMENTED / DB_SCHEMA_NOT_APPLIED / BROWSER_BOOTSTRAP_PENDING`

## Purpose

Expose the short-lived Context Ticket core only after the shared identity, Project Memory loader and canonical Work Wallet domain bridge are in place.

## Issue route

`POST /api/nexus/context-tickets/work-wallet`

Order:

1. same-origin check;
2. authenticated Nexus session;
3. exact server workspace resolution;
4. exact provider subject -> canonical Person binding from PR #106;
5. exact Project Memory scope from PR #109;
6. active canonical connector account;
7. exact canonical mapping from PR #92;
8. canonical PR #99 access eligibility;
9. 60-second single-use ticket from PR #102.

The browser never supplies Person ID, Participation ID, PermissionGrant, AccessDecision or Nexus Object ID as authority.

## Workspace isolation correction

The ticket capability now freezes `workspaceId` in addition to Person / Project / World / Participation / AccessDecision / Nexus Object / connector scope.

Exchange therefore never guesses a workspace from `projectId` or an external Work Wallet identifier.

## Exchange route

`POST /api/nexus/context-tickets/work-wallet/exchange`

Order:

1. same-origin or exact configured Chromium extension origin;
2. origin rejection happens before atomic consume;
3. raw ticket is atomically consumed once;
4. ticket purpose / adapter / allowed action are checked;
5. exact workspace-scoped Project Memory is reloaded;
6. canonical connector account must still be active;
7. PR #99 access gate runs again using `server-context-ticket` as the server-owned runtime identity source;
8. the current successful Person / Participation / AccessDecision / Nexus Object IDs must exactly equal the IDs frozen into the ticket;
9. only then is the PR #95 sanitized `nexus-work-wallet-context/v1` returned.

If access changes after issue, the consumed capability returns no context and cannot be retried.

## Ticket secrecy

- 32 random bytes;
- 60-second TTL;
- SHA-256 digest only in PostgreSQL;
- raw ticket never stored server-side;
- raw ticket is not put in URL, query params or logs;
- unknown / expired / already-consumed all use the same null consume result;
- one successful consume only.

## Current verification source

Returned context remains `WORK_WALLET_DEMO`, therefore `developmentContext=true`.

This is deliberate until an authorised real Work Wallet portal/browser validation exists. It does not claim vendor approval or a live Work Wallet API.

## Database state

`DB_SCHEMA_NOT_APPLIED`.

This slice changes the proposed `nexus_context_tickets` schema to include `workspace_id`, but no `drizzle-kit push`, migration or live DB mutation was executed.

## Next slice

Reconcile the authenticated bootstrap donor from PR #61:

- no ticket in URL;
- unauthenticated browser redirects through existing Nexus login;
- authenticated bootstrap POSTs same-origin to the issue route;
- raw ticket is transferred directly to the extension runtime;
- no localStorage/sessionStorage persistence.

Then reconcile the memory-only extension receiver from PR #63 and run Chrome unpacked local E2E.

## External capability truth

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`
