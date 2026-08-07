# PKG-013 Static Validator Audit — 2026-08-07

Status: PASS WITH BROWSER SMOKE TEST PENDING

This audit re-evaluates the contract assertions in `tests/validate-extension.mjs` against the exact files on branch `codex/pkg-013-nexus-overlay-work-wallet` after PR #18 was opened.

## Verified assertions

- Manifest V3 is used.
- Extension permission set is exactly `storage`.
- Host permission is exactly `https://portal.work-wallet.com/*`.
- Exactly one content-script registration is declared.
- Content-script match is exactly `https://portal.work-wallet.com/*`.
- Required Work Wallet adapter fields are present.
- Required second-adapter fixture fields are present.
- Work Wallet adapter ID is `work-wallet`.
- Work Wallet adapter URL pattern is not broader than the approved host.
- Work Wallet `write_capabilities` is empty.
- Vendor approval state is `NOT_CLAIMED`.
- External capability label states development prototype / no live Work Wallet API.
- Required Context Packet fixture fields are present.
- Context fixture is marked as development context.
- Synthetic fixture is not represented as connector-verified context.
- Second adapter fixture uses the same universal `NEXUS_SIDECAR` mode with a unique adapter ID.

## Full PR diff security scan

The executable extension diff was also reviewed for the validator's forbidden patterns. No use was found of:

- `document.cookie`;
- `chrome.cookies`;
- `webRequest`;
- `executeScript`;
- `Authorization:` headers;
- embedded `Bearer` credentials.

The Work Wallet adapter continues to declare no external write capability and explicitly restricts form submission, approval, sign-off, permit, incident and external-record write automation.

## Repository CI

GitHub Actions `Validate and Build` run `31188086346`: SUCCESS.

Verified there:

- workspace typecheck;
- Nexus production build;
- production route and Work Wallet API smoke test;
- build artifact upload.

## Environment limitation

A direct local invocation of:

`node tools/nexus-overlay-extension/tests/validate-extension.mjs`

could not be executed in the assistant runtime because outbound DNS access to GitHub was unavailable for cloning the branch. The equivalent validator assertions above were re-evaluated against files fetched directly from GitHub. This distinction is intentionally preserved.

## Still required

- Chrome unpacked-extension smoke test on an authorised `portal.work-wallet.com` session;
- Edge unpacked-extension smoke test;
- Work Wallet SPA route-continuity test;
- visual review of launcher placement and sidecar usability.

Do not merge until the required browser smoke test and founder review are complete.
