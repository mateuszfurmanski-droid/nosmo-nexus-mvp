# NOSMO Nexus — Phase 12 PR Integration Audit

Status: ACTIVE CONTROL MAP  
Repository: `mateuszfurmanski-droid/nosmo-nexus-mvp`  
Foundation PR: `#90`  
Foundation branch: `codex/nexus-mvp-modular-foundation`  
Audit baseline head: `a5be66266c05ac3e2e19651932cab209193de7e7`

## Purpose

This audit stops the repository from being integrated by historical pull-request number or by blindly merging old stacked branches.

The repository contains several valuable implementation lines created before the current modular foundation. Most of them are not safe direct merge candidates because they were built against older shell, project-world, fixture, runtime or data assumptions.

The rule from this point is:

`current architecture -> current foundation contracts -> identify donor capability -> port/reconcile the capability -> validate -> only then integrate`

Never:

`old PR is green -> merge old stack wholesale`

## 1. Current canonical trunk

### PR #90 — modular foundation

Classification: `CANONICAL_FOUNDATION`

PR #90 is the current common contract and Project Memory foundation.

It owns the current direction for:

- registries;
- module and connector contracts;
- Project Memory schemas;
- canonical objects and relationships;
- provenance and audit;
- Project Participation / access contracts;
- temporal `AS_OF` state reconstruction;
- integrity invariants;
- gated PKG-004 and PKG-005 reconciliation.

Current PR #90 fixture rule remains e-SAFE Catania only. This is a fixture/testing rule, not a limitation on future dynamic projects.

### PR #91 — Spark SKANSKA circular demo core

Classification: `CURRENT_STACKED_DEMO`

PR #91 is stacked directly on the current PR #90 head.

It is deliberately narrow:

- route `/spark-skanska-demo`;
- one synthetic Residential Building Project World;
- Object Register;
- typed Material / Product / Asset / Component / Equipment Object Cards;
- browser-local edits and audit;
- human circular decisions;
- environmental reporting with conservative CO2 truthfulness;
- rule-based maintenance attention.

PR #91 is not the canonical Nexus shell and must not replace PR #90 Project Memory contracts.

It is the current product/demo continuation of #90 and a useful reference implementation for `Nexus Object Card v1`.

Related architecture authority is being formalised in `mateuszfurmanski-droid/nosmo-nexus` PR #21 by extending ADDON_038 rather than creating a second Object Card architecture.

## 2. Relationship Tree / Project World donor line

Primary historical line:

`#15 -> #35 -> #42 -> #45`

Additional branches:

- #49 — manager/trade-aware shell on #45;
- #86 — one-chrome/mobile recovery on #45;
- #46 — experimental consolidation/person-avatar branch;
- #24 — external launch context on #15;
- #26 — BIM objects in old Relationship Tree;
- #40 — Change Event projection on #26.

### Classification

#### #15

`CANONICAL_TREE_ENGINE_DONOR`

Keep as the source donor for persistent graph interaction rules: drag, pan, pinch, zoom, glide, project-centred workspace and gesture-gated persistence.

Do not merge the whole historical branch into #90.

#### #35

`SHELL_DONOR`

Useful source-native shell/navigation implementation. Port accepted concepts into the future #90 shell instead of rebasing the complete old shell lineage.

#### #42 / #45

`ESAFE_PROJECT_WORLD_DONOR`

These contain the strongest source-native e-SAFE Timeline/Project World implementation on the old Tree lineage.

Use their data/presentation behavior as migration evidence, but reconcile against #90 temporal schemas and e-SAFE Project Memory rather than preserving a parallel Project World data model.

#### #86

`TREE_RECOVERY_DONOR`

Use as the strongest recovery reference for one top chrome, one graph renderer and Android/Fold viewport containment.

It must not become a second shell lineage.

#### #49

`ROLE_AWARE_SHELL_DONOR`

Use only after #90 ADDON_056 access contracts are authoritative. Manager trade filtering is presentation context, not authorization.

#### #46

`EXPERIMENTAL_FREEZE`

Do not use as an integration base. Preserve for visual/person-node ideas only.

#### #24

`PARTIAL_DONOR`

External launch-context validation remains useful for Work Wallet-style focus. Its BIM use was superseded by the later BIM graph line. Do not restore it wholesale.

#### #26 / #40

`FEATURE_DONOR_ONLY`

They demonstrate BIM and Change Event graph projection, but are coupled to older Riverside synthetic graph data. Port concepts later into #90 canonical objects/events. Do not import their fixture model into the foundation.

### Future Tree migration rule

The future source-native Tree must be built as:

`#90 Project Memory + #90 access/temporal contracts + selected #15 gesture engine behavior + #45/#86 accepted Project World/chrome behavior`

not as a direct merge of the old stack.

## 3. Work Wallet / identity / unified runtime donor line

### Browser/overlay side

`#18 -> #52 -> #63`

- #18 — sidecar/overlay prototype;
- #52 — connector-verified context;
- #63 — memory-only extension context-ticket receiver.

Classification: `CONNECTOR_CLIENT_DONOR`

### Server identity/runtime side

`#54 -> #55 -> #56 -> #57 -> #58 -> #59 -> #60 -> #61`

- #54 — browser session facade;
- #55 — provider identity -> canonical Person binding;
- #56 — server Project Participation authorization;
- #57 — unified Express Nexus runtime;
- #58 — connector context reconciled into that runtime;
- #59 — short-lived single-use context ticket;
- #60 — exact-origin CORS hardening;
- #61 — authenticated ticket bootstrap page.

Classification: `AUTH_RUNTIME_DONOR_STACK`

### Canonical decision

This stack contains mature security work and many successful historical CI checkpoints. It must be preserved and reconciled.

PR #90 must not implement:

- a second OIDC/session system;
- a second Person binding model;
- a second Work Wallet gateway;
- a second connector-context model;
- another context-ticket authority path.

When runtime integration is authorised, #90 Project Memory IDs, access records and PKG-004 connector truth must be mapped onto this runtime stack deliberately.

Connector mapping never grants Person identity or project authority.

## 4. Nexus Cloud / File Loader donor lines

There are two overlapping historical lines.

### Preferred narrow contract line

`#66 -> #67 -> #68 -> #69 -> #72 -> #75 -> #77`

- #66 — Google Drive manifest/routing contract;
- #67 — Pending Nexus Asset contract;
- #68 — File Loader metadata bridge;
- #69 — visible File Loader route;
- #72 — upload-session planning API stub;
- #75 — frontend upload-session planning client;
- #77 — upload-session planner smoke.

Classification: `CLOUD_CONTRACT_DONOR_STACK`

This is the preferred source for extracting Cloud contracts because the slices are comparatively narrow and capability claims are explicit.

### Cumulative old shell line

- #50 — broad Cloud Data Layer plus Work Mode AI and draft inbox;
- #70 — File Loader project/world guard on #50;
- #73 — cleaner cumulative project/world routing enforcement on #50;
- #78 — WorkSuite draft permission resolver;
- #79 — draft permission decision UI.

Classification: `CUMULATIVE_DONOR_NOT_MERGE_BASE`

PR #50 contains valuable implementations but combines too many concerns and old Project World assumptions. Do not use #50 as the new trunk.

Use #73 as the preferred donor for strict client/server `projectId + worldId` fail-closed routing behavior.

Use #78/#79 as WorkSuite draft-review donor behavior only after reconciling authority with #90 access contracts and the canonical server runtime.

### Blocked/diagnostic branches

- #80 — upload-session endpoint smoke, blocked by no-step Actions failure;
- #82 — Asset Index row plan, blocked by the same infrastructure condition.

Classification: `BLOCKED_REFERENCE_ONLY`

Do not call them validated and do not use them as merge checkpoints until CI/runtime evidence is restored.

### Cloud fixture correction required during port

Historical Cloud branches configure both e-SAFE and Riverside directly. That is valid historical/demo evidence, but it must not be copied into #90 fixture data.

Port the generic routing rule:

`resolve canonical project -> resolve world -> enforce exact project/world scope -> resolve provider target`

The product must support dynamic Project Worlds. The current #90 test fixture remains e-SAFE-only.

## 5. BIM / IFC / Change Control / WorkSuite donor stack

Main historical dependency line:

`#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87`

Issue #89 tracks the next production web-ifc delivery slice.

Architecture authority is primarily documented by `mateuszfurmanski-droid/nosmo-nexus` PR #17 / PKG-012.

Classification: `SPECIALIST_FEATURE_DONOR_STACK`

This is valuable specialist product work but must not become the foundation trunk.

### Extraction order later

1. Object identity and canonical Object Card alignment.
2. IFC GlobalId mapping and model-source provenance.
3. Renderer/runtime adapter boundary.
4. Read-only model properties.
5. Revision intelligence and comparison truth rules.
6. Change Event persistence semantics.
7. WorkSuite Action Engine authorization/concurrency/audit.
8. Compensating actions such as RELEASE_HOLD.
9. SpatialConnector bounded partner hand-off.
10. Representative IFC validation gates.
11. Production web-ifc asset delivery.

### Important Object Card reconciliation

The BIM Object Card must eventually converge with current ADDON_038 / `Nexus Object Card v1` work and the #91 reference prototype.

Do not keep a separate BIM-only canonical card model if the shared Object Card can express the object through a BIM/Installation profile.

## 6. Android / Work Mode lines

Relevant open lines include:

- #41 — native Android Work Mode + Google Drive Personal Cloud; contains the strongest Samsung/Fold-tested lineage and a previously validated APK checkpoint;
- #44 — native Work Mode beta line;
- #85 — Work Mode Layer + Knowledge Vacuum stacked on #44;
- #27 — earlier native/Expo-era first implementation direction.

Classification: `SEPARATE_NATIVE_TRACK`

Do not integrate Android code into #90 foundation.

Before any Android consolidation, perform a separate native-line audit and choose one canonical lineage based on:

- latest device-tested APK;
- current source completeness;
- privacy/permission boundaries;
- Project Memory hand-off compatibility;
- Cloud routing compatibility;
- build reproducibility.

Until then, #41 is the strongest operational reference but this audit does not close or delete #44/#85/#27.

## 7. Spark SKANSKA and Object Card relationship

The appearance of PR #91 changes one stale observation in #90: a Spark-specific branch now exists.

This does not by itself prove that the historical Joanna Thin Spark Core Smoke Test / founder checkpoint from old Project Control has been formally completed.

Correct interpretation:

- #91 is the current explicit Spark SKANSKA demo track;
- #91 is cleanly stacked on #90;
- it can serve as a bounded demonstrator without becoming the Nexus trunk;
- its Object Card work should inform the shared ADDON_038 Object Card contract;
- old gate language must be reviewed against current founder decisions before gated PKG-004/005 product code is released.

## 8. Integration classifications

Use these labels in future audits:

- `CANONICAL_FOUNDATION` — current trunk contracts/source direction.
- `CURRENT_STACKED_DEMO` — current intentionally separate demo built on foundation.
- `*_DONOR` / `*_DONOR_STACK` — valuable implementation to port/reconcile, not merge wholesale.
- `FEATURE_DONOR_ONLY` — preserve specific behavior/contracts only.
- `EXPERIMENTAL_FREEZE` — do not extend until selected again.
- `BLOCKED_REFERENCE_ONLY` — not a validated integration checkpoint.
- `SEPARATE_NATIVE_TRACK` — product track kept outside the foundation integration sequence.

## 9. Controlled integration order

Unless a new founder decision changes priority, use this order after the required gates are explicitly resolved:

1. Keep #90 as the common modular foundation.
2. Keep #91 as the separate Spark SKANSKA demonstrator stacked on #90.
3. Reconcile shared Object Card v1 contract using ADDON_038 / architecture PR #21 and #91 reference behavior.
4. Reconcile canonical identity/auth/runtime from #54-#61 with #90 Person/Participation/access contracts.
5. Reconcile Work Wallet connector context from #18/#52/#63 with PKG-004 capability truth; keep one gateway/context model.
6. Port Cloud contracts from #66-#77 and strict routing semantics from #73, generalized to dynamic Project Worlds.
7. Port the persistent Tree deliberately from #15/#45/#86 into the new #90 shell/data architecture.
8. Port role/trade shell behavior only through #90 access decisions, never as UI-only authorization.
9. Port BIM/IFC/WorkSuite capabilities from the specialist donor stack in modular slices aligned with shared Object Card and Project Memory.
10. Audit and choose one Android native lineage separately.
11. Only after source-native parity, reduce public website wrappers to deployment mirrors rather than parallel application logic.

## 10. Explicit no-go actions

Do not:

- merge every green historical PR into `main`;
- make #50 the new trunk;
- make #15/#45 the new trunk;
- make the BIM stack the new trunk;
- make #91 the whole Nexus product;
- restore Riverside/Halifax as #90 foundation fixtures just because historical branches use them;
- duplicate auth/session/Work Wallet gateway/context-ticket implementations;
- duplicate Object Card architectures;
- treat connector catalogue labels as API capability authority;
- close historical PRs solely because this audit classifies them as donors;
- merge or deploy any of these branches automatically.

## 11. Immediate next engineering action

After this audit, the next safe action is not another broad feature branch.

First reconcile the gate state against the now-current GitHub reality (#91 exists and is stacked on #90). Then, when explicitly released, implement the smallest common foundation slice that removes duplication risk:

- shared Object Card contract alignment;
- or PKG-004 connector capability invariants;
- or PKG-005 readiness data contracts;

without starting a competing shell or runtime.
