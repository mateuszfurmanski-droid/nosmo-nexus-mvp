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

The current foundation demo/test material is e-SAFE Catania only:

`NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`

Riverside and Halifax are not active Project Memory fixtures for this MVP foundation. The old public Relationship Tree may still visibly expose legacy project choices; that legacy preview state does not make those projects current PR #90 fixtures.

This does not mean Nexus supports only one future project. Nexus must support dynamic creation of future projects and worlds. The restriction applies only to current MVP foundation fixture material.

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
3. e-SAFE Catania is the only active foundation fixture now.
4. Project structure leads; the system must not force one fixed project shape.
5. Person Card plus Project Participation controls project access, module visibility, trade context and action permissions.
6. Hiding an icon is not authorization. UI and backend must enforce the same access decision.
7. External software remains source of record where declared. Nexus stores references, provenance, decisions, context and project memory.
8. Timeline is not just event history; Timeline Zone must support state reconstruction as of a selected date.
9. Readiness must expose blockers, warnings, uncertainty, confidence, freshness and human overrides; a percentage cannot hide a safety-critical fail.
10. DoorFlow and Fire Door Register share one Door Core but must not become uncontrolled forks.
11. FabStation/BIM remains partner-validation work until representative models and partner capabilities are proven.
12. Work Mode / Agency Pack / Nexus email identity are approved future contracts, not currently live services.

---

## 4. PR #90 coverage summary

### Phase 0 — Architecture foundation

Created modular structure, migration plan and file inventory. It separates `nosmo-nexus-mvp` as product source from `NOSMO-website` as public preview/deployment mirror.

### Phase 1 — Registries

Created module, connector, world and dock registries. World registry uses e-SAFE Catania for current foundation testing.

### Phase 2 — Module contracts

Declared Project, Time, People, Docs, Cloud, SOFT, Integrations, Evidence, DoorFlow, Fire Door Register and Electrical as module contracts. These are contracts, not runtime migration.

### Phase 3 — Connector contracts

Declared Google Drive, Work Wallet, BIM/FabStation, CompanyCam, Hilti, Microsoft 365, communication handoff and suppliers. These are connector contracts, not live connector claims.

### Phase 4 — Core skeleton

Created shell, graph, timeline, events, permissions and storage contracts. No runtime shell replacement yet.

### Phase 5 — Project Memory data schemas

Created typed memory snapshot for projects, worlds, companies, people, roles, files, drawings, tasks, assets, evidence, approvals, timeline events and graph records.

### Phase 6 — Architecture reconciliation map

Created this map to stop architecture drift.

### Phase 7 — Gap-close schemas and memory actions

Added canonical objects, relationship edges, external references, event/audit records, connector definition/account/mapping records, access records, temporal records and Project Memory action contracts.

### Phase 8 — e-SAFE-backed schema consistency

Reconciled PKG-001, PKG-002, PKG-004, ADDON_056 and ADDON_057 contract gaps and added source-backed/synthetic/derived/unknown e-SAFE fixture classes.

### Phase 9 — Project Memory integrity

Added invariant validation for references, world isolation, graph consistency, provenance, access decisions, temporal `AS_OF` resolution and Project Memory action policy.

### Phase 10 — PKG-005 contract preparation

Added `docs/NEXUS_PHASE_10_PKG005_READINESS_CONTRACT.md` defining the post-gate product contract and acceptance scenarios for readiness, confidence, safety-critical blocking, Reality Mode, explainable scoring, reassessment and RFI draft boundaries.

No PKG-005 product runtime was added because the authoritative package is `SPEC_READY / CODE_BLOCKED_BY_SPARK_CHECKPOINT` and `PROJECT_CONTROL.md` still gates PKG-001 to PKG-005 product-code integration behind Joanna's Spark Smoke Test and founder checkpoint.

---

## 5. Reconciliation priorities

| Source | PR #90 status | Required action |
|---|---:|---|
| `MASTER_DOC.md` | Partial baseline | Keep as strategy baseline; implement only through ADDON/package mapping. |
| `DOCUMENTATION_INDEX.md` | Partial control | Do not invent ADDON numbers or ignore reading order. |
| `PROJECT_CONTROL.md` | Active boundary | No Spark overwrite, no DoorFlow copy, no false connector claims, respect package gates. |
| `ADDON_CLASSIFICATION.md` | Partial control | Convert only allowed categories into MVP contracts. |
| `PKG-001` Canonical Object/Relationship | Contract + foundation code | Continue validating against canonical object and relationship invariants. |
| `PKG-002` Timeline/Provenance/Audit | Contract + foundation code | Continue validating events, decisions, provenance, freshness and temporal history. |
| `PKG-004` Connector Registry/Source of Record | Contract + foundation code | Re-check source-of-record and connector invariants before shell work. |
| `PKG-005` Readiness/Confidence/Human Decision | Contract prepared / code gated | Do not add product runtime until Spark Smoke Test + explicit founder checkpoint release the gate. |
| `ADDON_037` Project-first architecture | Partial | Dynamic projects/files/actions must drive graph. e-SAFE is fixture, not product limit. |
| `ADDON_038` Object Cards/Relationship Graph | Partial | Align graph schema with canonical objects and object-card needs. |
| `ADDON_047` Existing Software Overlay | Partial | Preserve integration levels and source-of-record truthfulness. |
| `ADDON_049` DoorFlow | Contract only | Do not copy DoorFlow runtime into Core. Link through contracts. |
| `ADDON_050` Work Wallet | Partial/demo boundary | No live connector claim without vendor/customer proof. |
| `ADDON_051` FabStation/BIM | Partial/research | Keep contract-level only until model and partner capability exist. |
| `ADDON_053` Fire Door Register | Contract only | Define shared Door Core data before UI integration. |
| `ADDON_056` Role/trade/access | Foundation coverage | Keep fail-closed access as a backend/data rule, not UI-only filtering. |
| `ADDON_057` Timeline Zone | Foundation coverage | Preserve e-SAFE-backed `AS_OF(date)` fixture and temporal uncertainty rules. |

---

## 6. Correct next build sequence

Do not continue with generic UI shell work yet.

Correct order from the current Phase 10 state:

1. Re-check PKG-004 connector/source-of-record invariants against the Phase 9 Project Memory validator.
2. Verify current Joanna Spark Smoke Test and founder-checkpoint state from GitHub and Build Control rather than assuming it from chat.
3. If PKG-005 is explicitly released, implement data-only readiness schemas, Project Memory arrays, invariant checks and e-SAFE fixtures first.
4. Validate readiness rules including UNKNOWN, SOURCE_UNAVAILABLE, safety-critical blockers, explainable score and Reality Mode human authority.
5. Re-run type/invariant validation.
6. Founder checkpoint for the first real Nexus shell if the explicit release does not already cover it.
7. Then build shell components.
8. Then registry-driven dock/panels.
9. Then migrate the live Relationship Tree runtime into source-native Nexus.

---

## 7. Things explicitly not implemented yet

PR #90 does not yet implement:

- PKG-005 readiness runtime or readiness UI;
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

- integrate PKG-005 product code before the Spark Smoke Test/founder gate is explicitly released;
- create a second top bar or second shell;
- replace the live Relationship Tree without a migration checkpoint;
- add Riverside, Halifax or another project as a current PR #90 foundation fixture without explicit founder direction;
- copy DoorFlow or Fire Register into Core instead of sharing contracts;
- show manager trade switching to a non-manager;
- rely on UI hiding instead of backend authorization;
- claim live connector status without verified vendor/customer capability;
- convert an ADDON_054 candidate into an active build without checkpoint;
- treat synthetic demo records as real source records;
- touch Joanna-protected Spark surfaces without explicit boundary update.

---

## 9. Current operating mode

The project was beginning to loop because implementation phases were generated from recent conversation momentum instead of reconciling against existing ADDON and Build Control authority.

The controlled sequence is now:

`architecture source -> reconciliation map -> schema/contract gap close -> e-SAFE-backed fixtures -> invariants -> gated contract preparation -> explicit release -> product code -> UI shell`

No new UI work should start until the required package and founder gates are satisfied.
