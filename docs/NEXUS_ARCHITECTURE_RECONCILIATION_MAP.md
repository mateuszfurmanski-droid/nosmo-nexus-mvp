# Nexus Architecture Reconciliation Map

Status: DRAFT CONTROL MAP  
Branch: `codex/nexus-mvp-modular-foundation`  
PR: `#90`  
Purpose: prevent repeated architecture loops, forgotten ADDONs and false implementation claims while converting the wider Nexus architecture into `nosmo-nexus-mvp` source.

This document is a control layer. It does not change the live Relationship Tree, `NOSMO-website`, Joanna-protected Spark surfaces, DoorFlow runtime, BIM runtime, Android/APK or stable Person Card.

---

## 1. Current decision

`nosmo-nexus-mvp` is becoming the real modular source for Nexus, but it must not pretend that every architecture document is already implemented.

The current public Relationship Tree remains a prototype/live preview. PR #90 is the controlled source foundation that will later allow the Relationship Tree to become data-backed, registry-driven and permission-aware.

---

## 2. Authority order before any future implementation

Read and resolve architecture in this order:

1. `PROJECT_CONTROL.md` in `mateuszfurmanski-droid/nosmo-nexus`.
2. `docs/DOCUMENTATION_INDEX.md` in `mateuszfurmanski-droid/nosmo-nexus`.
3. `docs/NEXUS_BUILD_CONTROL/ADDON_CLASSIFICATION.md` in `mateuszfurmanski-droid/nosmo-nexus`.
4. Relevant `docs/NEXUS_BUILD_CONTROL/packages/PKG_*.md` file.
5. Relevant source `ADDON_*.md` file.
6. Current code state in target repo and branch.
7. Founder instruction from the current conversation.

Older chat memory loses authority when it conflicts with the current repository state, package boundary or founder-locked rule.

---

## 3. Core product principles that must survive migration

1. Relationship Tree / Project Graph is the primary Nexus workspace.
2. New projects, files, people, tasks, evidence and approvals are continuously added. Demo projects are fixtures, not hardcoded product limits.
3. Project structure leads; the system must not force one fixed project shape.
4. Person Card plus Project Participation controls project access, module visibility, trade context and action permissions.
5. Hiding an icon is not authorization. UI and backend must enforce the same access decision.
6. External software remains source of record where declared. Nexus stores references, provenance, decisions, context and project memory.
7. Timeline is not just event history; Timeline Zone must support state reconstruction as of a selected date.
8. DoorFlow and Fire Door Register share one Door Core but must not become uncontrolled forks.
9. FabStation/BIM remains partner-validation work until representative models and partner capabilities are proven.
10. Work Mode / Agency Pack / Nexus email identity are approved future contracts, not currently live services.

---

## 4. What PR #90 has already created

### Phase 0 — Architecture foundation

Files:

- `docs/NEXUS_MVP_MODULAR_STRUCTURE.md`
- `docs/NEXUS_MVP_MIGRATION_PLAN.md`
- `docs/NEXUS_FILE_INVENTORY.md`

Current value:

- separates `nosmo-nexus-mvp` as product source from `NOSMO-website` as public preview/deployment mirror;
- classifies prototype files;
- establishes registry-first and contract-first migration.

Remaining gap:

- not yet reconciled with all ADDONs and Build Control packages until this map.

### Phase 1 — Registries

Files:

- `src/registry/registryTypes.ts`
- `src/registry/moduleRegistry.ts`
- `src/registry/connectorRegistry.ts`
- `src/registry/worldRegistry.ts`
- `src/registry/dockRegistry.ts`
- `src/registry/index.ts`

Current value:

- first source registry for modules, connectors, worlds and dock entries.

Remaining gap:

- registry does not yet include entitlement policy, role/trade rules, source-of-record levels or dynamic module availability.

### Phase 2 — Module contracts

Files:

- `src/modules/moduleContract.ts`
- `src/modules/**/**Module.ts`
- `src/modules/index.ts`

Current value:

- declares Project, Time, People, Docs, Cloud, SOFT, Integrations, Evidence, DoorFlow, Fire Door Register and Electrical as module contracts.

Remaining gap:

- module contracts do not yet include supported trades, supported project types, action-level permission keys, competence gates or launch return routes required by ADDON_056.

### Phase 3 — Connector contracts

Files:

- `src/connectors/connectorContract.ts`
- `src/connectors/**/**Connector.ts`
- `src/connectors/index.ts`

Current value:

- declares Google Drive, Work Wallet, BIM/FabStation, CompanyCam, Hilti, Microsoft 365, communication handoff and suppliers.

Remaining gap:

- connector contracts do not yet fully match PKG-004 integration levels, lifecycle states, connector instances, mapping records, sync freshness and source-of-record policies.

### Phase 4 — Core skeleton

Files:

- `src/core/coreContract.ts`
- `src/core/shell/shellContract.ts`
- `src/core/graph/graphContract.ts`
- `src/core/timeline/timelineContract.ts`
- `src/core/events/eventBus.ts`
- `src/core/permissions/permissionContract.ts`
- `src/core/storage/storageContract.ts`
- `src/core/index.ts`

Current value:

- creates a safe placeholder for shell, graph, timeline, events, permissions and storage.

Remaining gap:

- no runtime implementation yet; no backend enforcement; no real graph state engine.

### Phase 5 — Project Memory data schemas

Files:

- `src/data/schemas/common.schema.ts`
- `src/data/schemas/project.schema.ts`
- `src/data/schemas/person.schema.ts`
- `src/data/schemas/file.schema.ts`
- `src/data/schemas/evidence.schema.ts`
- `src/data/schemas/task.schema.ts`
- `src/data/schemas/timeline.schema.ts`
- `src/data/schemas/graph.schema.ts`
- `src/data/projectMemory.ts`
- `src/data/demo/esafeCataniaMemory.ts`
- `src/data/demo/riversideMemory.ts`
- `src/data/index.ts`

Current value:

- first typed memory snapshot for projects, worlds, companies, people, roles, files, drawings, tasks, assets, evidence, approvals, timeline events and graph records.

Remaining gap:

- missing dynamic action layer;
- missing append-only event store semantics;
- missing external reference object from PKG-001;
- missing field change and human decision records from PKG-002;
- missing role/trade/action access records from ADDON_056;
- missing Timeline Zone state reconstruction semantics from ADDON_057.

---

## 5. Reconciliation table

| Source | Current authority | PR #90 coverage | Status | Required next action |
|---|---|---:|---|---|
| `MASTER_DOC.md` | Stable product baseline: legacy-friendly intelligence layer, file/project memory, integration layer, security and permissions | Partial | CANONICAL BASELINE | Keep as strategy baseline; do not code directly from it without ADDON/package mapping. |
| `DOCUMENTATION_INDEX.md` | Controlled ADDON numbering, current reading order, approved ADDON sequence | Partial | CONTROL | PR #90 must never invent ADDON numbers or ignore reading order. |
| `PROJECT_CONTROL.md` | Operational source of truth, workstream split, protected Joanna surfaces, current module boundaries | Partial | CONTROL | PR #90 must remain non-overlapping: no Spark overwrite, no DoorFlow copy, no false live connector claims. |
| `ADDON_CLASSIFICATION.md` | Classification of all ADDONs into build/control/backlog/research/parallel categories | Partial | CONTROL | Convert only allowed categories into MVP contracts; backlog/research remains explicitly labelled. |
| `PKG-001` Canonical Object and Relationship Contract | One canonical identity/relationship model across people, companies, projects, docs, tasks, evidence, assets, doors and external records | Partial | BUILD INTO MVP | Extend data schemas with `CanonicalObject`, `RelationshipEdge`, `ExternalReference`, relationship-type registry and merge-candidate rules. |
| `PKG-002` Timeline, Provenance and Audit Contract | One event/provenance/audit model, AI vs verified state, field changes, human decisions | Partial | BUILD INTO MVP | Add `NexusEvent`, `FieldChange`, `HumanDecision`, source freshness and action-state distinctions. |
| `PKG-003` Person Card Communication Contract | Call/SMS/WhatsApp/email handoff with `ACTION_OPENED`, response required and follow-up tracking | Minimal | BACKLOG / CONTRACT | Add communication action records only after Person Card communication mapping; do not claim sent/delivered. |
| `PKG-004` Connector Registry and Source-of-Record Contract | Integration levels, lifecycle state, connector account, object mapping, source-of-record ownership | Partial | BUILD INTO MVP | Upgrade connector contracts to include integration levels 0-7, lifecycle, account instance, object mapping and freshness. |
| `PKG-005` Readiness, Confidence and Human Decision Contract | Reusable readiness assessment, findings, RFI draft, Reality Mode decision | Not yet | NEXT CONTRACT TARGET | Add readiness schemas after reconciliation, before UI-driven readiness panels. |
| `ADDON_027` Person-Centric Workflow UI | Person-centric IN/workspace/OUT logic | Minimal | ARCHITECTURE RULE | Keep Person Card as identity/context layer; do not modify stable Person Card visuals here. |
| `ADDON_028` Live Intelligent Workspace | Live active workspace/context suggestions | Minimal | JOANNA REFERENCE / LATER | No parallel shell redesign; convert into event/context contracts later. |
| `ADDON_029` Privacy-first Person Card context discovery | Consent, endpoint visibility, profile privacy | Partial | BUILD CONTROL | Extend permissions and profile source contracts before any auto-enrichment UI. |
| `ADDON_031` Business Memory Engine | Persistent business/project memory | Partial | BUILD INTO MVP | Project Memory is started; needs append-only events, provenance and query semantics. |
| `ADDON_032` Workspace/UI Foundation | Core workspace and UI foundation | Partial | PROTECTED UI / CONTRACT | Keep one shell, one graph background, overlays above graph. No second top bar/workbench. |
| `ADDON_033` AI-assisted Person Card enrichment | Proposed updates, source trail, duplicate control | Not yet | BACKLOG CONTRACT | Add proposed-update and data-health records later. |
| `ADDON_035` Continuous profile enrichment/data health | Source freshness, confidence, data-health indicators | Not yet | BACKLOG CONTRACT | Add data-health state once PKG-002 is extended. |
| `ADDON_037` Project-first architecture | Uploaded project structure defines system | Partial | CANONICAL RULE | Dynamic projects/files/actions must drive graph; demo factories remain fixtures only. |
| `ADDON_038` Object Cards / Relationship Graph | Object identity and relationships beyond people | Partial | BUILD INTO MVP | Align graph schema with CanonicalObject/RelationshipEdge and object card needs. |
| `ADDON_039` Spatial Project Engine | Building/project space as navigation interface | Minimal | AFTER GRAPH FOUNDATION | Do not build heavy spatial runtime yet; reserve world/asset/room/floor IDs. |
| `ADDON_040` Reality On Demand | Lightweight loading of heavy media | Minimal | LATER | Storage and file references must support deferred media loading. |
| `ADDON_041` Project Readiness Engine | Findings, scores, clarification/RFI | Not yet | NEXT AFTER PKG-001/002/004 | Implement schemas/contracts before any readiness UI. |
| `ADDON_042` Reality Mode / AI confidence | Unknown/conflicting/verified states, human override | Partial | BUILD INTO MVP | Must be added to event, readiness and AI-proposal contracts. |
| `ADDON_043` Training/certification | Competence gates in Person Card | Minimal | BACKLOG / ACCESS DEPENDENCY | Needed before restricted action authorization is complete. |
| `ADDON_044` Smart Integration Suggester | Guides external integration selection | Minimal | AFTER CONNECTOR REGISTRY | Requires real connector registry maturity; do not build as UI first. |
| `ADDON_045` Company capture/relationship intelligence | Company Cards and relationship intelligence | Partial | BACKLOG | Company records exist; automatic capture and confidence are not built. |
| `ADDON_046` Task supply/procurement loop | Materials/tools/equipment readiness and procurement | Minimal | BACKLOG | Keep suppliers connector; no procurement automation claim. |
| `ADDON_047` Existing Software Overlay | Vendor-neutral overlay strategy | Partial | BUILD INTO MVP | Connector contracts must preserve integration levels and source-of-record truthfulness. |
| `ADDON_048` External BIM production coordination | External BIM partner layer | Minimal | RESEARCH / PARTNER VALIDATION | No live API/sync claims. |
| `ADDON_049` DoorFlow lifecycle | Fire door workflow module | Module contract only | PARALLEL MODULE | Do not copy DoorFlow runtime into Core. Link through module/connector/memory contracts. |
| `ADDON_050` Work Wallet connector | Safety/compliance connector boundary | Partial | DEMO PRESERVE / FUTURE LIVE | Keep source-of-record external; no live connector claim without vendor/customer proof. |
| `ADDON_051` FabStation/BIM multi-trade layer | Spatial install layer, partner boundary | Partial | RESEARCH / PARTNER VALIDATION | Keep contract-level only until representative model and partner capability exist. |
| `ADDON_052` Person Card Communication Hub | Contextual contact routing | Minimal | CONTRACT LATER | Communication connector exists; needs event/audit states. |
| `ADDON_053` Fire Door Register + Shared Door Core | Standalone register, shared Door Object/core | Module contract only | PARALLEL MODULE | Define shared Door Core data before UI integration. |
| `ADDON_054` Multi-trade app portfolio/factory | Candidate app map + Shared Module Factory | Partial | PORTFOLIO CONTROL | Registry supports modules, but candidates must not become active without founder checkpoint. |
| `ADDON_055` Work Mode / Agency Pack / Email Identity | Mobile work mode and `nexus.nosmo.tech` identity | Minimal | FUTURE CONTRACT | Do not touch APK/mobile shell/email as live service. |
| `ADDON_056` Role/trade/app access control | Person Card + Project Participation controls modules/actions | Partial | MUST BUILD BEFORE UI DOCK | Add ProjectParticipation, RoleAssignment, TradeAssignment, PermissionGrant, ModuleEntitlement and AccessDecision. |
| `ADDON_057` Timeline Zone | Temporal scrubber and state reconstruction | Partial | MUST MAP TO TIMELINE CORE | Add validFrom/validTo, AS_OF state reconstruction and provenance labels REAL/DERIVED/SYNTHETIC_DEMO/UNKNOWN. |

---

## 6. Correct next build sequence after this map

Do not continue with generic UI shell work yet.

Correct order:

1. Extend schemas to match PKG-001 and PKG-002:
   - `CanonicalObject`
   - `RelationshipEdge`
   - `ExternalReference`
   - `NexusEvent`
   - `FieldChange`
   - `HumanDecision`
2. Upgrade Connector contracts to PKG-004:
   - integration level 0-7
   - lifecycle state
   - connector account
   - object mapping
   - sync freshness
   - source-of-record policy
3. Add ADDON_056 access model:
   - `ProjectParticipation`
   - `RoleAssignment`
   - `TradeAssignment`
   - `PermissionGrant`
   - `ModuleEntitlement`
   - `ManagerTradeContext`
   - `AccessDecision`
4. Add ADDON_057 Timeline Zone contract:
   - `validFrom`
   - `validTo`
   - `AS_OF(date)` reconstruction boundary
   - provenance label: `REAL`, `DERIVED`, `SYNTHETIC_DEMO`, `UNKNOWN`
5. Add Project Memory Actions:
   - create project/world
   - attach file
   - link person/project
   - add evidence/task/event
   - connect graph objects
   - reject cross-world moves unless explicitly authorised
6. Only then start app shell components.

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
- merge e-SAFE and Riverside data;
- copy DoorFlow or Fire Register into Core instead of sharing contracts;
- show manager trade switching to a non-manager;
- rely on UI hiding instead of backend authorization;
- claim live connector status without verified vendor/customer capability;
- convert an ADDON_054 candidate into an active build without checkpoint;
- treat synthetic demo records as real source records;
- touch Joanna-protected Spark surfaces without explicit boundary update.

---

## 9. Current answer to the founder concern

The project was beginning to loop because the implementation phases were being generated from recent conversation momentum instead of reconciling against the existing ADDON and Build Control authority.

This map changes the operating mode:

```text
Before:
recent idea -> new contract -> maybe forgotten older rule

After:
ADDON / PKG authority -> reconciliation map -> explicit gap -> controlled next build
```

The next implementation must close the named gaps above, not invent another surface.
