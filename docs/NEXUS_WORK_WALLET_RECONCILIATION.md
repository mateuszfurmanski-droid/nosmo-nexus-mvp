# NOSMO Nexus — Work Wallet Reconciliation

Status: SLICE_A_B_C_IMPLEMENTED / IDENTITY_ACCESS_TICKET_RECONCILIATION_PENDING
Foundation: PR #90 / `codex/nexus-mvp-modular-foundation`
Integration branches:

- Slice A: `codex/work-wallet-reconcile-slice-a`
- Slice B: `codex/work-wallet-reconcile-slice-b`
- Slice C: `codex/work-wallet-reconcile-slice-c-runtime`

Audit baseline: `35a6757ce19fe590754fb7ad13ed48a68cb51705`

External capability label:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

This label means NOSMO Nexus does not currently have a vendor-approved live Work Wallet API integration. Work Wallet's public support material does document administrator-created API keys and an official Zapier integration; those are vendor capability evidence for a future authorised adapter, not evidence that Nexus is currently connected.

## Protected surfaces

This reconciliation does not modify:

- PR #91 / Spark SKANSKA Demo Core;
- accepted Object Card design;
- Relationship Tree gestures/layout;
- Person Card UI;
- Nexus Cloud / Google Drive development;
- BIM / IFC / FabStation;
- Android Work Mode;
- DoorFlow / Fire Door Register;
- Electrical Commissioning;
- external Work Wallet records or status.

## Current foundation findings

PR #90 already contains the canonical connector catalogue and Project Memory connector/object-mapping schemas. It also contains the Phase 14 auth/identity reconciliation boundary.

The foundation inherits one historical Work Wallet gateway module at:

`scripts/src/work-wallet-api.mjs`

Before Slice C, deployment topology was split: `.replit` ran `serve-nexus`, which owned the SPA and Work Wallet gateway but did not own the existing OIDC/auth middleware, while `artifacts/api-server` owned OIDC/auth but was not the configured public runtime. This topology would make an authenticated browser Context Ticket unsafe to add because gateway and Nexus session authority would not share one public runtime.

The foundation still does not contain the PKG-016 Context Ticket runtime or `tools/nexus-overlay-extension` package.

The reconciliation direction remains:

`#90 canonical contracts -> adapt existing donor runtime -> keep one gateway/context/auth path`

not:

`copy old Work Wallet stack beside #90`.

## Donor classification

### Browser client

- PR #18: Manifest V3 Shadow DOM overlay, exact Work Wallet host, route continuity, local mock and exact local mapping.
- PR #52: `nexus-work-wallet-context/v1`, `CONNECTOR_VERIFIED_CONTEXT`, server-owned mapping and browser-without-integration-key boundary.
- PR #63: memory-only raw Context Ticket receiver, one exchange attempt and sanitized verified-context persistence.

Use these as one client lineage. Do not create another overlay.

### Server/auth/runtime

- PR #54: canonical browser-session facade.
- PR #55: exact provider-subject -> canonical Person binding.
- PR #56: historical Project Participation persistence/policy donor.
- PR #57: one Express runtime and bridge to the existing Work Wallet gateway.
- PR #58: Work Wallet context folded into that same runtime.
- PR #59: 60-second, single-use Context Ticket server flow.
- PR #60: exact-origin CORS hardening.
- PR #61: authenticated Nexus bootstrap page.

Use these as one server lineage, with one required policy correction: PR #56's historical `active participation` allow rule is not sufficient under #90. Ticket issue and exchange must consume the canonical #90 access decision, where active Project Participation alone does not grant permission.

## Slice A — canonical mapping and capability truth

Implemented:

1. Work Wallet catalogue mode is no longer described as current `api-sync` capability.
2. Current canonical mode is read/context/navigation with no external write or Project Graph mutation claim.
3. The external capability label is machine-visible from the Work Wallet connector contract.
4. `resolveWorkWalletCanonicalMapping(...)` uses the existing #90 `NexusConnectorObjectMappingRecord` rather than inventing another mapping registry.
5. Mapping resolution requires:
   - exact connector account;
   - exact project;
   - exact external object type;
   - exact external record reference;
   - one server-verified mapping;
   - one active canonical Nexus object in the same project.
6. `verified-external-id` mappings are accepted. Manual mappings are accepted only when they carry explicit `verifiedBy` and `verifiedAt` evidence.
7. Fuzzy/filename/email/BIM/AI-candidate/unknown mapping methods cannot produce connector-verified Work Wallet focus.
8. External Work Wallet identity is never promoted to Nexus canonical identity.

## Slice B — canonical verified context contract

Implemented:

1. Preserves the historical schema name `nexus-work-wallet-context/v1` rather than creating a competing Context Packet.
2. Builds `CONNECTOR_VERIFIED_CONTEXT` only after Slice A exact canonical mapping succeeds.
3. Adds canonical `nexusObjectId` to the sanitized context while preserving optional `nexusNodeId` compatibility for the existing Tree handoff.
4. `personId` input is explicitly named `canonicalPersonId`; the builder does not accept a Work Wallet user/person identifier as Nexus identity.
5. An optional Tree `graphFocus` must declare the same `canonicalObjectId` already resolved by Project Memory; mismatched graph focus fails closed.
6. `nexusNodeId` is never inferred from an external Work Wallet reference.
7. `developmentContext` is derived from verification source and the external capability label remains attached to the sanitized context.

## Slice C — one authenticated public runtime topology

Implemented by reconciling the validated PR #57 / #60 runtime topology rather than introducing a second server:

1. `.replit` now proposes building the existing Nexus web app and existing `@workspace/api-server`, then running that API server as the one public runtime.
2. The Express runtime serves the SPA/history fallback and preserves API-route separation.
3. The existing `scripts/src/work-wallet-api.mjs` remains the only Work Wallet gateway; it is loaded through a small runtime bridge rather than copied.
4. The Work Wallet gateway middleware is mounted before generic `express.json()` so its existing bounded raw-body ownership is preserved.
5. Existing Nexus `authMiddleware` remains the session/auth implementation in the same public runtime; no second OIDC/session stack is created.
6. Global credentialed CORS is no longer reflective. Cross-origin browser access is exact-allowlist only, including exact reviewed Chromium extension origins.
7. Security headers previously present in `serve-nexus` are preserved in the Express runtime.
8. CI definition now targets the proposed runtime topology: web build + API build + unified runtime smoke + Work Wallet event/idempotency smoke + exact-origin CORS smoke.

Important limitation: Slice C only unifies topology. It does not claim canonical Person binding, canonical Project Participation authorization or Context Ticket availability yet. Existing auth proves a Nexus browser session only. Ticket issuance remains blocked until #55/#56/#59 semantics are reconciled to current #90 access authority.

Slices A/B/C intentionally do not create a second gateway, overlay, Person resolver, Project Participation model, connector registry, auth implementation or Context Ticket authority.

## Donor correction required before ticket port

The historical PKG-015 server mapping key used `project + external reference` for `nexusNodeId` resolution. That is weaker than the current required contract.

The reconciled server path must use:

`connector account + exact project + external object type + exact external reference -> canonical Nexus object`

Only after canonical object resolution may an existing graph projection determine an appropriate Relationship Tree node/focus. A Work Wallet external ID must never be used directly as a Nexus Object/Node ID.

The historical PR #56 authorization rule also cannot be restored unchanged. The current #90 authority is:

`authenticated session -> exact canonical Person binding -> active Project Participation -> explicit permission/policy decision -> allowed connector action`

Active participation by itself is not permission.

## Next runtime slices

### Slice D — Person + access + Context Ticket reconciliation

Reconcile #54-#61 into the current #90 semantics without creating another Person or access authority. Provider identity -> canonical Person remains server-owned. Historical persistence may be used only as an adapter into #90 Person/Participation/Grant semantics. Require an explicit canonical #90 `allowed` access decision at ticket issue and exchange.

Preserve from #59/#60/#61:

- short opaque ticket;
- 60-second TTL unless a later security review tightens it;
- single-use atomic consumption;
- digest-only persistence;
- exact purpose/adapter/scope;
- same-origin issue;
- exact reviewed exchange origin;
- origin rejection before consumption;
- no ticket in URL;
- no raw ticket in logs or persistent browser storage;
- no browser integration secret;
- current access re-check at exchange.

### Slice E — browser client reconciliation

Use the #18 -> #52 -> #63 extension lineage as the only overlay. Preserve Manifest V3, Shadow DOM, exact host permissions, route-clears-stale-context behavior and memory-only ticket handling. The extension must consume the same `nexus-work-wallet-context/v1` schema emitted by the server, including canonical object identity when present.

### Slice F — browser E2E

Required labels:

- Chrome unpacked against local Work Wallet mock: `LOCAL CONNECTOR E2E PASS` only after actual browser evidence.
- Edge unpacked: PASS or explicit PENDING.
- Real `portal.work-wallet.com`: no LIVE claim without authorised access and vendor/customer permission.

### Slice G — official API readiness

Work Wallet public support currently exposes an Integrations API area, API-key creation with permission selection, and Zapier events. Before an official Nexus API adapter is implemented, obtain authorised customer/vendor documentation defining endpoints, scopes, rate limits, data model, webhook/event semantics, test environment and allowed use. Keep Work Wallet as source-of-record for its formal records and keep external writes disabled by default.

## Write boundary

Current connector direction remains READ / CONTEXT / NAVIGATION.

Do not automatically:

- close permits;
- approve audits;
- sign inspections;
- create formal incidents;
- change compliance status.

Any future external write requires a separate explicit contract, provider capability evidence, server-side authorization and human approval.
