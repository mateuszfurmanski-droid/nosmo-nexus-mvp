# NOSMO Nexus — Phase 20 ADDON_057 Adaptive Connector Presentation Contract

Status: IMPLEMENTATION SLICE / NO LIVE CUSTOMER CONNECTIONS
Branch: `codex/addon057-adaptive-connector-contract`
Base: PR #90 `codex/nexus-mvp-modular-foundation`
Architecture authority: `nosmo-nexus` draft ADDON_057 / PR #22

## Purpose

Implement the non-visual contract required by ADDON_057 without editing protected Spark, Relationship Tree, Object Card or vendor UI surfaces.

The slice deliberately separates:

- connector runtime/capability truth;
- presentation/skin metadata;
- legal/licence/trademark evidence;
- user/project authorization;
- canonical Project Memory provenance.

A skin must never create API capability or partner approval.

## New common contract

`src/connectors/connectorPresentationContract.ts`

Defines:

- experience boundary (`launch`, `context`, `overlay-sidecar`, `api-data`, `approved-co-branded-ui`, `deep-operational`);
- legal modes (`CLOSED_VENDOR_NO_APPROVAL`, `CLOSED_VENDOR_API_APPROVED`, `PARTNER_CO_BRAND_APPROVED`, `OPEN_SOURCE_MODIFIABLE`, `NEXUS_NATIVE`);
- source-brand and logo policies;
- UI adaptation levels;
- trademark and partner approval states;
- honest presentation status;
- `NexusConnectorSkinManifest`;
- legal evidence references;
- validation rules that reject unapproved source-UI adaptation and unsupported co-branding claims.

`capabilityAuthority` is locked to `connector-definition-record`. The presentation record is not capability authority.

## Restricted-vendor proof

Work Wallet receives a separate presentation profile only:

`src/connectors/work-wallet/workWalletPresentation.ts`

Current state:

- `DEMONSTRATION`;
- maximum adaptive experience: `context`;
- legal mode: `CLOSED_VENDOR_NO_APPROVAL`;
- UI adaptation: `nexus-shell-only`;
- no vendor UI modification;
- no vendor approval claim;
- no live API claim added by this slice.

This profile exists specifically to prove that the adaptive framework fails closed for an unapproved vendor.

## Open-source connector 1 — Snipe-IT

Files:

- `src/connectors/snipe-it/snipeItClient.ts`;
- `src/connectors/snipe-it/snipeItConnector.ts`.

Current capability:

- server-side bearer-token client contract;
- `GET /api/v1/hardware` asset listing;
- `GET /api/v1/hardware/{id}` asset detail;
- read-only Nexus connector capability;
- no configured instance;
- no token in repository;
- no graph mutation;
- no automatic Nexus evidence creation;
- mapping remains a later verified operation.

Verified public basis at implementation time:

- upstream repository reports AGPL-3.0-or-later;
- official documentation exposes JSON REST API;
- official documentation exposes branding/custom CSS settings.

Public co-brand/trademark use still requires separate review. Open-source source-code rights do not automatically transfer trademark rights.

## Open-source connector 2 — ODK Central

Files:

- `src/connectors/odk/odkCentralClient.ts`;
- `src/connectors/odk/odkConnector.ts`.

Current capability:

- server-side bearer-token client contract;
- `GET /v1/projects`;
- `GET /v1/projects/{projectId}/forms`;
- `GET /v1/projects/{projectId}/forms/{xmlFormId}/submissions`;
- read-only Nexus connector capability;
- no configured Central tenant;
- no token/App User secret in repository;
- no graph mutation;
- no automatic evidence promotion;
- ODK identity does not become Nexus Person identity without verified mapping.

Verified public basis at implementation time:

- ODK Central upstream reports Apache-2.0;
- official Central API is public RESTful API;
- official docs support session bearer authentication and role/permission evaluation.

Public ODK name/trademark treatment remains separately reviewable.

## Registry changes

The lightweight Connector Registry now includes:

- `snipe-it-assets`;
- `odk-field-forms`.

Both remain `planned` because no customer instance is configured.

`src/connectors/index.ts` exports the two runtime contracts, clients, three presentation profiles and the common presentation contract.

## Authentication extension

`NexusConnectorAuthMode` adds `bearer-token` so ODK session-bearer access is not mislabeled as an API key.

This is a connector-contract vocabulary extension only. It does not store or issue bearer tokens.

## Explicit non-goals

This slice does not:

- edit `/spark` or PR #91;
- edit Relationship Tree UI;
- edit Object Card UI;
- add a live Snipe-IT tenant;
- add a live ODK Central tenant;
- add credentials;
- write external records;
- map external users directly into Person Cards;
- modify Work Wallet UI;
- claim Work Wallet approval;
- make a presentation profile source-of-record or permission authority;
- introduce a second connector capability registry.

## Next controlled implementation steps

1. Run repository typecheck/validation when an executable CI/runtime is available.
2. Add focused unit coverage for `validateNexusConnectorPresentation`.
3. Provision disposable non-production Snipe-IT and ODK instances outside source control.
4. Store credentials only in approved server-side secret storage.
5. Exercise read adapters against synthetic/demo records.
6. Add canonical `ConnectorDefinitionRecord` / `ConnectorAccountRecord` fixtures only after capability truth is verified.
7. Add read-only external-reference mappings into Project Memory.
8. Only then expose the first adaptive shell/profile in a non-protected UI surface.
9. Any later Work Wallet/Hilti/vendor source-UI adaptation requires the approval evidence defined by ADDON_057.
