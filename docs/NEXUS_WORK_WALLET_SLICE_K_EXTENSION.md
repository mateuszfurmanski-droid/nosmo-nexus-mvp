# Work Wallet Slice K — Canonical MV3 Overlay / Memory-Only Receiver

Status: `IMPLEMENTED / BEHAVIORAL VALIDATOR ADDED / CI PUSH VALIDATION REQUESTED / CHROME UNPACKED PENDING`

## Purpose

Reconcile the safe browser-extension behavior from historical PR #18 / #52 / #63 onto the current #90-native Work Wallet ticket pipeline without restoring the historical demo-event verification route or creating a second overlay runtime.

Canonical extension path:

`tools/nexus-overlay-extension`

One MV3 extension, one Shadow DOM Sidecar, one verified-context store.

## Manifest boundary

- Manifest V3;
- permission: `storage` only;
- exact Work Wallet content-script host: `https://portal.work-wallet.com/*`;
- exact Nexus host permissions for current prototype origin + localhost development;
- exact `externally_connectable` bootstrap paths only;
- no `<all_urls>`;
- no Work Wallet private storage/database access;
- no Accessibility Service or browser credential scraping.

## User-configured scope is not authority

The extension options page stores only non-secret routing metadata:

- Nexus Project ID;
- Nexus World ID;
- Work Wallet Connector Account ID;
- approved Nexus API base.

Changing these values clears any previous verified context.

These values do not grant access. Server PR #114 still resolves canonical Person, workspace, exact mapping, Project Participation, PermissionGrant and AccessDecision before issuing context.

## Bootstrap / receiver

On explicit `Authorise via Nexus` user action:

1. the extension creates an opaque non-secret request ID;
2. pending metadata is stored only in `chrome.storage.session` with a short TTL;
3. the new Nexus authenticated bootstrap URL contains non-secret metadata only;
4. bootstrap sends one 43-character raw ticket directly to the extension runtime;
5. sender origin/path and all metadata are checked before pending request consumption;
6. pending state is removed before exchange;
7. the raw ticket is POSTed exactly once to the Slice I exchange route with `credentials: omit`;
8. the local raw-ticket variable is cleared in `finally`;
9. no automatic retry occurs;
10. only the sanitized `nexus-work-wallet-context/v1` is persisted to `chrome.storage.local`.

The raw ticket is never stored in local/session extension storage.

## Current verified-context contract

Unlike historical #63, the current extension requires the reconciled PR #95 / #114 context:

- `sourceApplication=WORK_WALLET`;
- `contextSource=CONNECTOR_VERIFIED_CONTEXT`;
- `contextConfidence=1`;
- `verificationSource=WORK_WALLET_DEMO`;
- `developmentContext=true`;
- canonical `nexusObjectId` required;
- canonical server-bound `personId` may be present;
- external capability label must exactly equal:
  `DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`.

The extension never promotes a Work Wallet identifier to Person/Object identity.

## Stale-context rule

On Work Wallet route/record change, persisted connector-verified context is kept only when project, world, connector account, external object type and exact external record reference still match. Otherwise it is removed before the Sidecar renders the new page.

## Tree handoff

The Sidecar never substitutes `nexusObjectId` for `nexusNodeId`.

If the server supplied a verified `nexusNodeId`, Project Tree navigation may use the existing `nexusSource=work-wallet&nexusFocus=<node>` contract. Without an exact graph projection it opens the Relationship Tree without invented focus.

## Validation

`tools/nexus-overlay-extension/tests/validate-context-ticket-receiver.mjs` executes the actual service worker with mocked MV3 APIs and verifies:

- exact manifest host/connectability restrictions;
- bootstrap URL contains no raw ticket;
- pending state is session-only;
- wrong sender does not consume pending state;
- valid sender performs exactly one exchange;
- exchange uses `credentials: omit`;
- pending state is removed;
- sanitized canonical context is persisted;
- raw ticket is absent from both storage areas;
- replay performs no second exchange.

The validator is wired into `Validate and Build` before workspace typecheck.

Because draft PR validation is normally skipped, this branch also allows `Validate and Build` on direct pushes to the exact bounded Slice K branch. A follow-up documentation commit was made after that trigger existed so a push validation is requested without converting the PR out of draft. A PASS is not claimed until a completed run is actually observed.

## Still pending

- confirmed GitHub Actions result for the bounded push validation;
- unpacked Chrome smoke;
- unpacked Edge smoke;
- safe non-production DB schema application for the server ticket/access stores;
- authenticated BOUND Person + canonical access fixture/runtime data;
- authorised real Work Wallet portal smoke.

No external writes are implemented.
