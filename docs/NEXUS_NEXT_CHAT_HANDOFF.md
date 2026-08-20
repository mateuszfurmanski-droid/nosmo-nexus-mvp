# NOSMO Nexus — Next Chat Handoff

Status: active handoff for continuing PR #90 without relying on chat memory.

## Repository and PR

- Product source repository: `mateuszfurmanski-droid/nosmo-nexus-mvp`
- Active branch: `codex/nexus-mvp-modular-foundation`
- Active draft PR: https://github.com/mateuszfurmanski-droid/nosmo-nexus-mvp/pull/90
- Public preview repository remains untouched: `mateuszfurmanski-droid/NOSMO-website`
- Live Relationship Tree remains the prototype/demo and must not be rewritten during this foundation work.

## Mandatory reading order in a new chat

1. Check current GitHub state of PR #90 first.
2. Read `docs/NEXUS_ARCHITECTURE_RECONCILIATION_MAP.md` in PR #90.
3. Read `docs/NEXUS_MVP_MODULAR_STRUCTURE.md` and `docs/NEXUS_MVP_MIGRATION_PLAN.md`.
4. In architecture repo `mateuszfurmanski-droid/nosmo-nexus`, read `PROJECT_CONTROL.md`, `docs/DOCUMENTATION_INDEX.md`, `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md`, and relevant PKG files before adding code.
5. Do not rely on old chat assumptions if the repo contradicts them.

## Current PR #90 phases

- Phase 0: modular structure, migration plan, file inventory.
- Phase 1: registries.
- Phase 2: module contracts.
- Phase 3: connector contracts.
- Phase 4: core skeleton.
- Phase 5: project memory schemas.
- Phase 6: architecture reconciliation map.
- Phase 7: gap-close schemas and project memory action contracts.
- Phase 7A: demo scope correction — e-SAFE Catania only.
- Phase 8: e-SAFE-backed fixtures + schema consistency against PKG-001, PKG-002, PKG-004, ADDON_056 and ADDON_057.

## Phase 8 completed state

Phase 8 added or tightened:

- shared provenance classification: `REAL | DERIVED | SYNTHETIC_DEMO | UNKNOWN`;
- PKG-001 canonical object taxonomy and source/confidence fields;
- PKG-002 event provenance, verification and source freshness fields;
- PKG-004 connector contract consistency including integration levels and rate-limit policy placeholder;
- ADDON_056 `ManagerTradeContext`, fail-closed unresolved-identity decision support and project participation/access fixtures;
- ADDON_057 temporal object records and `AS_OF` state resolutions with active revision IDs and source warnings;
- e-SAFE Catania fixtures for project, world, file, drawing, person, company, task, evidence, timeline, graph and access decision;
- public-source references to CORDIS project 893135 and Zenodo Deliverable D5.1;
- corrected modular-structure documentation so no inactive demo world is listed as a current fixture.

The e-SAFE fixture factory is `src/data/demo/esafeCataniaMemory.ts`, backed by `src/data/demo/esafeCataniaFixtures.ts`.

## Founder-locked demo scope

The only active demo/test Project World is:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Riverside and Halifax are not needed for the current MVP foundation and must not be used as demo/test fixtures now.

Use e-SAFE Catania for:

- schema consistency checks;
- Project Memory fixtures;
- Timeline Zone fixtures;
- graph fixture records;
- file/drawing/evidence examples;
- REAL / DERIVED / SYNTHETIC_DEMO / UNKNOWN provenance checks.

Do not add another demo world without a founder checkpoint.

Important distinction:

- Nexus must support unlimited future projects dynamically.
- The current demo/test fixture set must use e-SAFE only.
- Do not re-add Riverside or Halifax as fixtures just to test multi-project logic.

## Current technical boundary

Do not touch:

- `NOSMO-website` live Relationship Tree.
- Person Card stable page.
- Android/APK / Work Mode runtime.
- BIM runtime.
- DoorFlow runtime or Fire Door Register runtime.
- Joanna-protected Spark surfaces.
- Any top workbench/second top bar experiment.

## Known cleanup item

A stray branch exists and is harmless:

`__do_not_create__`

It should be removed later in a repo cleanup pack by GitHub UI or by terminal command:

`git push origin --delete __do_not_create__`

Do not spend product-build time on it now.

## Correct next build sequence

1. Validate Project Memory Actions and fixture referential integrity against the Phase 8 schemas.
2. Add schema/data invariant checks for world isolation, provenance labels, source references and fail-closed access decisions.
3. Reconcile any remaining data-contract drift before UI work.
4. Only after that founder checkpoint, start UI shell components.
5. Then create registry-driven dock/panels.
6. Then migrate the live Relationship Tree prototype into the real app source.

## Core rule

Nexus is not a set of hardcoded demo projects. It is a continuously updated Project Memory and Relationship Graph:

- new projects;
- new worlds;
- new people and companies;
- new files and drawings;
- new evidence;
- new tasks;
- new approvals;
- new timeline events;
- new graph nodes and edges.

For the current MVP/demo/testing track, all fixture data must be based on e-SAFE Catania only. Other future projects can exist dynamically later, but they are not demo scope now.
