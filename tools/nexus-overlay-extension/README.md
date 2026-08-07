# NOSMO Nexus Overlay Prototype — PKG-013

Status: DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API

This folder contains the first isolated Chrome / Edge Manifest V3 implementation slice derived from `ADDON_057` and `PKG-013`.

## Scope

The prototype proves a reusable Nexus browser sidecar with Work Wallet as the first adapter.

It does not modify Work Wallet server code and does not provide live Work Wallet API access.

Current Work Wallet browser host:

```text
https://portal.work-wallet.com/*
```

The extension requests only:

```text
permission: storage
host: https://portal.work-wallet.com/*
```

## What is implemented

- Manifest V3 extension shell;
- universal Nexus launcher;
- Shadow DOM sidecar isolated from page styles;
- Work Wallet adapter manifest;
- second adapter fixture proving registry reuse;
- local Nexus Context Packet;
- options page for synthetic development context;
- adapter enable / disable state;
- route continuity watcher for SPA navigation;
- safe Nexus deep-link actions;
- local minimal diagnostics;
- self-contained Node validator.

## Explicit limitations

- no Work Wallet API key;
- no live Work Wallet data sync;
- no external record write;
- no automatic Work Wallet form submission;
- no automatic approvals, permits, incident actions or sign-off;
- no relationship-tree launch-context injection in this first slice;
- no production rollout;
- no claim of Work Wallet partnership, certification or approval;
- no Gmail or Teams OAuth;
- no native Android / iOS overlay.

Work Wallet remains the source of record for its formal safety and compliance records under ADDON_050.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose `Load unpacked`.
4. Select this `tools/nexus-overlay-extension` folder.
5. Open extension details and confirm the requested site access is limited to `portal.work-wallet.com`.
6. Open the extension options page and optionally seed local Nexus context.
7. Open the authorised Work Wallet portal session.

## Load unpacked in Edge

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Choose `Load unpacked`.
4. Select this folder.
5. Confirm the same restricted host access.

## Development context

The options page stores a local development Context Packet using `chrome.storage.local`.

Synthetic context is explicitly labelled:

```text
DEMO / LOCAL CONTEXT
```

If no context exists, the sidecar displays:

```text
NO NEXUS CONTEXT
```

Page route information is not treated as connector-verified data.

## Current actions

Safe launch actions are filtered by the local `allowedActionKeys` fixture.

Available prototype targets include:

- Project Tree;
- generic People / Person Card area when person context exists;
- Tasks;
- Documents;
- Gmail compose as launch-only communication;
- related Nexus integrations;
- Work Wallet / Safety Connector status;
- Return to Nexus.

`Ask Nexus` and `Supplies / Purchases` remain disabled in this slice because no safe verified target is defined yet.

Opening a target is a user-initiated launch. It is not evidence that a message was sent or an external record was changed.

## Validation

Run from the repository root:

```bash
node tools/nexus-overlay-extension/tests/validate-extension.mjs
```

The validator checks:

- Manifest V3;
- exact extension permissions;
- exact Work Wallet host permission;
- adapter schema;
- empty Work Wallet write capability;
- Context Packet fixture;
- second adapter fixture;
- referenced extension files;
- selected forbidden credential/session interception patterns.

## Manual smoke test

1. Load the extension unpacked.
2. Open `https://portal.work-wallet.com/` using an authorised session.
3. Confirm exactly one Nexus `N` launcher appears at the right edge.
4. Open the sidecar.
5. Close the sidecar and confirm Work Wallet remains unchanged.
6. Navigate between normal Work Wallet portal routes and confirm the launcher is not duplicated.
7. Open extension options and save synthetic project/person context.
8. Return to Work Wallet and confirm `DEMO / LOCAL CONTEXT` is visible.
9. Clear context and confirm `NO NEXUS CONTEXT`.
10. Disable the Work Wallet adapter and confirm the Nexus overlay disappears without affecting the portal.
11. Re-enable it and confirm the launcher returns.
12. Open Project Tree and Connector Status using explicit clicks.
13. Confirm no Work Wallet form is submitted by the extension.

## Package boundary

This implementation PR may modify only:

```text
tools/nexus-overlay-extension/**
```

Any requirement outside this folder is `CONFLICT_REQUIRES_DECISION` under PKG-013.
