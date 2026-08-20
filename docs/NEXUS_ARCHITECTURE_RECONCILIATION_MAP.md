# Nexus Architecture Reconciliation Map

Status: DRAFT CONTROL MAP  
Branch: `codex/nexus-mvp-modular-foundation`  
PR: `#90`  
Founder correction: e-SAFE Catania is the only active demo/test Project World for the current MVP foundation.

This document prevents repeated architecture loops, forgotten ADDONs and false implementation claims while converting the wider Nexus architecture into `nosmo-nexus-mvp` source.

This document does not change the live Relationship Tree, `NOSMO-website`, Joanna-protected Spark surfaces, DoorFlow runtime, BIM runtime, Android/APK or stable Person Card.

---

## 1. Current decision

`nosmo-nexus-mvp` is becoming the real modular source for Nexus, but it must not pretend that every architecture document is already implemented.

The current public Relationship Tree remains a prototype/live preview. PR #90 is the controlled source foundation that will later allow the Relationship Tree to become data-backed, registry-driven and permission-aware.

The current demo/test material is e-SAFE Catania only:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Riverside and Halifax are not active demo fixtures for this MVP foundation. They must not appear in active world registry, seed memory, schema tests or next-chat handoff unless the founder explicitly reopens them.

This does not mean Nexus supports only one future project. Nexus must support dynamic creation of future projects and worlds. The restriction applies only to current MVP demo/test fixture material.

---

## 2. Authority order before future implementation

Read and resolve architecture in this order:

1. Founder instruction in the current conversation.
2. Current GitHub state of PR #90.
3. `PROJECT_CONTROL.md` in `mateuszfurmanski-droid/nosmo-nexus`.
4. `docs/DOCUMENTATION_INDEX.md` in `mateuszfurmanski-droid/nosmo-nexus`.
5. `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md` in `mateuszfurmanski-droid/nosmo-nexus`.
6. Relevant `docs/NEXUS_BUILD_CONTROL/packages/PKG_*.md` file.
7. Relevant source `ADDON_*.md` file.
8. Current code state in target repo and branch.

Older chat memory loses authority when it conflicts with the current repository state, package boundary or founder-locked rule.

---

## 3. Core product principles that must survive migration

1. Relationship Tree / Project Graph is the primary Nexus workspace.
2. Nexus is a continuously updated Project Memory and Relationship Graph, not a fixed set of demo projects.
3. e-SAFE Catania is the only active demo/test fixture now.
4. Project structure leads; the system must not force one fixed project shape.
5. Person Card plus Project Participation controls project access, module visibility, trade context and action permissions.
6. Hiding an icon is not authorization. UI and backend must enforce the same access decision.
7. External software remains source of record where declared. Nexus stores references, provenance, decisions, context and project memory.
8. Timeline is not just event history; Timeline Zone must support state reconstruction as of a selected date.
9. DoorFlow and Fire Door Register share one Door Core but must not become uncontrolled forks.
10. FabStation/BIM remains partner-validation work until representative models and partner capabilities are proven.
11. Work Mode / Agency Pack / Nexus email identity are approved future contracts, not currently live services.

---

## 4. PR #90 coverage summary

### Phase 0 — Architecture foundation

Created modular structure, migration plan and file inventory. It separates `nosmo-nexus-mvp` as product source from `NOSMO-website` as public preview/deployment mirror.

### Phase 1 — Registries

Created module, connector, world and dock registries. World registry must contain e-SAFE Catania only for active demo/testing.

### Phase 2 — Module contracts

Declared Project, Time, People, Docs, Cloud, SOFT, Integrations, Evidence, DoorFlow, Fire Door Register and Electrical as module contracts. These are contracts, not runtime migration.

### Phase 3 — Connector contracts

Declared Google Drive, Work Wallet, BIM/FabStation, CompanyCam, Hilti, Microsoft 365, communication handoff and suppliers. These are connector contracts, not live connector claims.

### Phase 4 — Core skeleton

Created shell, graph, timeline, events, permissions and storage contracts. No runtime shell replacement yet.

### Phase 5 — Project Memory data schemas

Created typed memory snapshot for projects, worlds, companies, people, roles, files, drawings, tasks, assets, evidence, approvals, timeline events and graph records.

Phase 5 demo memory must use e-SAFE Catania only. The earlier Riverside fixture was removed from active scope.

### Phase 6 — Architecture reconciliation map

Created this map to stop architecture drift.

### Phase 7 — Gap-close schemas and memory actions

Added canonical objects, relationship edges, external references, event/audit records, connector definition/account/mapping records, access records, temporal records and project memory action contracts.

---

## 5. Reconciliation priorities

| Source | PR #90 status | Required action |
|---|---:|---|
| `MASTER_DOC.md` | Partial baseline | Keep as strategy baseline; implement only through ADDON/package mapping. |
| `DOCUMENTATION_INDEX.md` | Partial control | Do not invent ADDON numbers or ignore reading order. |
| `PROJECT_CONTROL.md` | Partial control | No Spark overwrite, no DoorFlow copy, no false connector claims. |
| `ADDON_CLASSIFICATION.md` | Partial control | Convert only allowed categories into MVP contracts. |
| `PKG-001` Canonical Object/Relationship | Partial | Verify `CanonicalObject`, `RelationshipEdge`, `ExternalReference`, relationship types and merge-candidate boundaries. |
| `PKG-002` Timeline/Provenance/Audit | Partial | Verify event, field-change, human-decision, source freshness and action-state distinctions. |
| `PKG-004` Connector Registry/Source of Record | Partial | Verify integration levels 0-7, lifecycle, account instance, object mapping and freshness. |
| `PKG-005` Readiness/Confidence/Human Decision | Not yet | Add readiness schemas after current consistency check, before readiness UI. |
| `ADDON_037` Project-first architecture | Partial | Dynamic projects/files/actions must drive graph. e-SAFE is fixture, not product limit. |
| `ADDON_038` Object Cards/Relationship Graph | Partial | Align graph schema with canonical objects and object-card needs. |
| `ADDON_047` Existing Software Overlay | Partial | Preserve integration levels and source-of-record truthfulness. |
| `ADDON_049` DoorFlow | Contract only | Do not copy DoorFlow runtime into Core. Link through contracts. |
| `ADDON_050` Work Wallet | Partial/demo boundary | No live connector claim without vendor/customer proof. |
| `ADDON_051` FabStation/BIM | Partial/research | Keep contract-level only until model and partner capability exist. |
| `ADDON_053` Fire Door Register | Contract only | Define shared Door Core data before UI integration. |
| `ADDON_056` Role/trade/access | Partial | Must be checked before registry-driven dock/panels. |
| `ADDON_057` Timeline Zone | Partial | Must be checked through e-SAFE-backed `AS_OF(date)` fixtures. |

---

## 6. Correct next build sequence

Do not continue with generic UI shell work yet.

Correct order:

1. Schema consistency review against PKG-001, PKG-002, PKG-004, ADDON_056 and ADDON_057.
2. e-SAFE-backed fixtures only:
   - canonical project/company/person/file/drawing/task/evidence/timeline/graph records;
   - REAL / DERIVED / SYNTHETIC_DEMO / UNKNOWN provenance examples;
   - manager vs tradesperson access decision examples;
   - `AS_OF(date)` temporal reconstruction examples.
3. Project Memory Actions consistency check.
4. Then app shell components.
5. Then registry-driven dock/panels.
6. Then Relationship Tree runtime migration.

---

## 7. Things explicitly not implemented yet

PR #90 does not yet implement:

- production backend authorization;
- actual runtime Relationship Tree graph migration;
- Timeline Zone scrubber UI;
- real Work Wallet API;
- real FabStation API;
- Work Mode PWA/APK;
- Nexus email identities;
- production Google Drive sync;
- procurement automation;
- AI enrichment engine;
- Fire Door Register standalone UI;
- DoorFlow runtime migration;
- BIM model processing;
- stable Person Card visual changes.

Any future PR or demo must not imply these are complete.

---

## 8. Stop conditions

Stop and request founder decision if a task would:

- create a second top bar or second shell;
- replace the live Relationship Tree without a migration checkpoint;
- add Riverside, Halifax or another demo fixture into active MVP scope;
- copy DoorFlow or Fire Register into Core instead of sharing contracts;
- show manager trade switching to a non-manager;
- rely on UI hiding instead of backend authorization;
- claim live connector status without verified vendor/customer capability;
- convert an ADDON_054 candidate into an active build without checkpoint;
- treat synthetic demo records as real source records;
- touch Joanna-protected Spark surfaces without explicit boundary update.

---

## 9. Current answer to the founder concern

The project was beginning to loop because implementation phases were generated from recent conversation momentum instead of reconciling against existing ADDON and Build Control authority.

This map changes the operating mode:

`architecture source -> reconciliation map -> schema/contract gap close -> e-SAFE-backed fixtures -> tests -> UI shell`

No new UI work should start until the e-SAFE-only schema and fixture track is clean.
