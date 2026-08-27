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
- `screen.html?screen=work` — worker-owned professional Work Card with role, availability, preferred location, employment type, recent projects, work history, references, skills, licences/tickets, employer/agency notes and optional explicit Share Work Card action; local-first and separate from recruitment;
- `screen.html?screen=work-mode` — Work Mode V2 fourth window with local supported-app discovery, explicit Add / Open / Remove actions, privacy information and work-app category cards;
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

The V2 implementation package lives in `work-mode-v2/` and is now activated only by the fourth `screen.html?screen=work-mode` window.

The canonical `index.html` Person Card still does not import the package directly. Documents, Work Card and Work Mode share the same `screen.html` host, and navigation between those three windows is switched client-side with History API state rather than loading another product.

Work Mode V2 is not a second app and not a separate launcher product.

Privacy authority: `nosmo-nexus#26` / ADDON_029.

### V2 trust rule

> Your Work Card belongs to you.

> Private by default. Shared only by you.

Installed-app discovery must remain device-local. Detection is not connection, connection is not content access, and content access is not sharing.


## Work Mode V2 active boundary

- first scan shows: `App discovery happens only on this device. NOSMO does not upload or store a list of your installed apps.`;
- Android discovery uses only verified controlled package identifiers from the Construction App Registry;
- no broad installed-app inventory permission;
- detection creates no tile until the user chooses Add to Work Mode;
- OPEN launches only and grants no content access;
- Remove from Work Mode removes only the local tile;
- browser preview never simulates installed apps when the Android bridge is unavailable;
- BIM / drawings, snagging, site forms, timesheets, Work Wallet, cloud storage, communication and project management are UI categories, not new standalone product dependencies.
