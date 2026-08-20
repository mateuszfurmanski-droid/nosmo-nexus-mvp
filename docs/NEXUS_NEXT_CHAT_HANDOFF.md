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

1. Finish schema consistency review against PKG-001, PKG-002, PKG-004, ADDON_056 and ADDON_057.
2. Add tests or fixtures for canonical objects, event provenance, access decisions and temporal state.
3. Only after this, start UI shell components.
4. Then create registry-driven dock/panels.
5. Then migrate the live Relationship Tree prototype into the real app source.

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

Demo worlds such as e-SAFE Catania and Riverside are fixtures only. They must remain isolated and must not limit future dynamic project creation.
