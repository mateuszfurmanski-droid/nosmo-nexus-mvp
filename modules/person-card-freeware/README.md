# NOSMO Person Card Freeware

Canonical isolated product line for the standalone Person Card / Work Profile / agency and recruitment app.

## Product boundary

- standalone, mobile-first;
- no Relationship Tree;
- no e-SAFE, DoorFlow, Electrical, Work Wallet, BIM/FabStation, Android Worker Home, Spark or SKANSKA dependency;
- Data Fetcher stays as the profile intake surface;
- Work Hub owns Find Work, Matches, Agencies, AI Check and Share Profile;
- Inbox owns agency requests/offers/work requests.

## Frozen visual donor

Source repository: `mateuszfurmanski-droid/NOSMO-website`

Frozen donor: `person-card-kamil-v47.html` / `v47top1`

Verified source blob SHA: `6b33057751dacb58555fc3462f2b6b811f53d48d`

The donor itself is not modified in this repository. `index.html` is the consolidated freeware copy derived from PR #39.

## Consolidation sources

Frontend source: NOSMO-website PR #39, head `fde179a4ad0e08ce418821b7b1017099ec9d3f14`.

Backend source: nosmo-nexus-mvp PR #182, head `d1de9c4aa5d7f9ed44284bea5ceed752f493456c`.

Superseded UI: nosmo-nexus-mvp PR #180. Do not restore.

## Current static routes

- `index.html` — canonical Person Card Freeware;
- `screen.html?screen=documents` — worker-owned Documents window;
- `screen.html?screen=work` — worker-owned Work Card for current / previous work records, local-first and separate from recruitment;
- `onboarding.html` — worker onboarding;
- `agency-invite.html` — agency invite desk;
- `section.html` — CV/certs/refs/availability/vault sections;
- `data-fetcher/` — standalone profile file intake;
- `directory.html` — standalone worker registry starting point.

Server-backed Job Gateway, invite signing, AI prefill and persistence are added in the backend consolidation commits on this same branch.


## Work Card / Work Mode roadmap

The same Freeware application evolves without replacing the canonical Person or Work Profile:

- V1 — Person Card Freeware / Work Profile / agency + recruitment;
- V2 — Work Card local supported-app discovery, explicit app tiles and Privacy & Connections;
- V2.1 — supported deep links;
- V3 — explicitly authorised official connectors and cross-app workflow.

The dormant V2 implementation package lives in `work-mode-v2/`.

It is intentionally **not imported by V1** until platform discovery and privacy acceptance gates pass.

Work Mode V2 is not a second app and not a separate launcher product.

Privacy authority: `nosmo-nexus#26` / ADDON_029.

### V2 trust rule

> Your Work Card belongs to you.

> Private by default. Shared only by you.

Installed-app discovery must remain device-local. Detection is not connection, connection is not content access, and content access is not sharing.
