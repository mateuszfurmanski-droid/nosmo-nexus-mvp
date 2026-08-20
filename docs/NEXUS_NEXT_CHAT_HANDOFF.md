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
- Phase 9: Project Memory integrity checks + action-policy consistency.

## Phase 9 completed state

Phase 9 adds:

- `src/data/projectMemoryInvariants.ts` with referential-integrity checks for Project Memory;
- duplicate base-record ID detection;
- project/world isolation validation;
- graph node/edge reference and world checks;
- canonical object / relationship / external-reference checks;
- provenance rules for `REAL`, `SYNTHETIC_DEMO` and `UNKNOWN` records;
- ADDON_056 fail-closed checks requiring resolved identity, active participation and an explicit matching grant before an `allowed` decision is accepted;
- explicit-deny conflict detection so a matching deny invalidates an allowed decision;
- manager trade context scope validation without treating manager context as a permission grant;
- ADDON_057 `AS_OF` checks for missing objects, conflicting state buckets, active revisions and future-event leakage;
- `PROJECT_MEMORY_ACTION_POLICY` so action access/audit/blocked-by-default semantics have one canonical source;
- e-SAFE-only fixture restrictions that reject Riverside/Halifax demo worlds;
- `src/data/demo/esafeCataniaPhase9Fixtures.ts` to close two Phase 8 fixture gaps: the previously dangling canonical person reference and missing temporal state for canonical D5.1 evidence;
- automatic e-SAFE memory assertion when `createEsafeCataniaMemory()` builds the fixture snapshot.

No UI or React shell work was started.

## e-SAFE fixture authority

The e-SAFE fixture factory is `src/data/demo/esafeCataniaMemory.ts`.

Its source-backed baseline remains in `src/data/demo/esafeCataniaFixtures.ts`; Phase 9 integrity additions are in `src/data/demo/esafeCataniaPhase9Fixtures.ts`.

The only active demo/test Project World is:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Riverside and Halifax are not needed for the current MVP foundation and must not be used as demo/test fixtures now.

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

1. Reconcile remaining Project Memory contract drift exposed by Phase 9 invariants.
2. Add PKG-005 readiness/confidence/human-decision contract coverage if Build Control still requires it.
3. Re-check connector/source-of-record invariants against PKG-004 before UI work.
4. Founder checkpoint.
5. Only then start the first real Nexus shell components.
6. Then create registry-driven dock/panels.
7. Then migrate the live Relationship Tree prototype into the real app source.

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
