# NOSMO Nexus — SKANSKA Property Commercial Demo Foundation Fold-In Plan

Status: integration-control note for PR #160. No protected runtime is changed by this document.

## Purpose

Prevent the SKANSKA Property commercial demonstrator from becoming a parallel product stack.

The current isolated route proves the commercial building-operations story. Productionisation must fold that story into the canonical Nexus foundation, WorkSuite, Android Work Mode, Project Memory, BIM/IFC, Cloud and connector stacks as those controlled PR lineages become available.

The rule is:

> reuse canonical Nexus contracts and identities; do not create SKANSKA-Property-specific copies of core runtime systems.

## Current commercial demo branch

PR #160:

`codex/skanska-property-commercial-operations-demo`

Base:

`codex/spark-skanska-demo-core` / PR #91.

Reason for the current isolated bounded Work Mode representation:

- PR #91 is protected and must remain unchanged;
- the latest canonical WorkSuite / BIM / Android / Cloud slices live on separate controlled branches stacked on the #90 foundation lineage;
- bulk-merging those lineages into the commercial demo solely for visual demonstration would increase conflict risk and duplicate runtime authority;
- therefore PR #160 demonstrates the complete commercial story but does not claim that its browser-local demo actions are canonical WorkSuite/Android/Cloud writes.

## Canonical donor / target stacks

### 1. Common Nexus foundation — PR #90

Authority:

- canonical Project Memory;
- canonical object identity;
- Person binding / Project Participation / permission direction;
- provider-neutral storage and Cloud persistence direction;
- Project Graph remains the target persistent workspace.

Commercial rule:

`building / floor / space / asset / material` must ultimately become canonical Project Memory / Project Graph records or projections, not a second commercial datastore.

### 2. SKANSKA visual / Object Card baseline — PR #91

Authority for this demonstrator:

- current accepted SKANSKA demo visual language;
- current theme/skin preference behavior;
- Object Card demonstrator grammar;
- explicit synthetic-data and carbon-integrity boundaries.

Commercial rule:

Do not refactor or overwrite the Residential Demo. Shared visual primitives may later be extracted only through an explicitly reviewed common-component slice.

### 3. BIM / IFC canonical object identity — PR #94 and subsequent BIM stack

Canonical identity direction:

`Nexus Object ID <-> explicit Project Memory external reference <-> IFC GlobalId`

STEP / express IDs remain diagnostic only.

Commercial rule:

AHU-04 and other commercial demo BIM references are currently synthetic labels. Production fold-in must resolve asset BIM identity through the canonical IFC external-reference model rather than storing BIM IDs as independent commercial primary keys.

### 4. WorkSuite + Project Memory + Timeline — PRs #104 -> #108 -> #119 -> #120

Current controlled capabilities include:

- authority-safe WorkSuite actions;
- human decisions;
- canonical Project Memory commit semantics;
- Timeline projection from the same action identity;
- canonical Issue/RFI records;
- synthetic integrated BIM/IFC/WorkSuite E2E contract evidence.

Commercial fold-in target:

`asset issue -> authorised WorkSuite action/task/issue -> human decision -> Project Memory -> Timeline`

The commercial browser demo must not become a parallel action engine.

### 5. Native Android Work Mode — PR #96

Current canonical direction:

- native Android field client;
- bounded metadata/evidence intake;
- authenticated Nexus session boundary;
- canonical Person / Project Participation / explicit authority;
- evidence handoff and Cloud provenance controls.

Commercial fold-in target:

A future commercial asset task should hand off bounded context to the canonical worker client:

- project/world;
- asset Nexus Object ID;
- exact space/location context;
- issue/task ID;
- instruction;
- checklist/evidence requirements.

The native client must not accept commercial-demo browser state as authority.

### 6. Nexus Cloud / Google Drive pipeline — PR #125

Validated backend direction includes:

`authenticated session -> canonical Person -> ProjectParticipation + PermissionGrant -> cloud.file.write -> provider write -> persistence proposal -> transactional Project Memory commit`

Commercial fold-in target:

Worker photos, manuals, certificates and inspection files should enter through the canonical Cloud/evidence pipeline with server-owned provenance. The commercial route must not invent a separate upload API or storage folder hierarchy.

### 7. FM / CAFM source connector — openMAINT PR #161

The openMAINT connector has a successful disposable real-application E2E proof on its dedicated head.

Current truth boundary:

- authenticated REST v3 read compatibility validated against disposable openMAINT 2.4.2 / CMDBuild 4.2.0 runtime;
- Nexus adapter remains GET-only in the proof;
- external records remain external-reference context;
- no Project Graph mutation, canonical Evidence/Approval/Person promotion or upstream write is claimed.

Commercial fold-in target:

Use openMAINT as one credible FM/CAFM source example for:

- technical asset cards;
- maintenance context;
- work-order context where available.

Do not copy or reskin openMAINT UI into Nexus. Use the connector/adaptive presentation boundary.

### 8. Work Wallet / contractor identity context

Commercial fold-in target:

Where worker/compliance context is required, consume the existing Work Wallet connector/identity boundary. Do not create a SKANSKA-Property-specific worker compliance model.

### 9. Spatial / FabStation boundary

Commercial fold-in target:

Where a field worker needs spatial guidance, pass bounded Nexus Object / IFC / operational context through the existing SpatialConnector boundary. Do not claim FabStation API/deep-link/live-sync capability beyond separately validated partner evidence.

## Commercial canonical object model target

The current synthetic story should map into one Project / Building Graph:

`PROJECT / PROPERTY PORTFOLIO`
`-> BUILDING`
`-> FLOOR`
`-> SPACE`
`-> ASSET`
`-> MATERIAL`
`-> PERSON`
`-> COMPANY`
`-> ISSUE / TASK`
`-> INSPECTION`
`-> DOCUMENT / PHOTO / EVIDENCE`
`-> MAINTENANCE EVENT`
`-> HUMAN APPROVAL / DECISION`
`-> REPLACEMENT / REUSE EVENT`
`-> ESG / CIRCULAR EVIDENCE`

No node type above should require a second commercial-only identity namespace when an existing canonical Nexus identity exists.

## Controlled fold-in sequence

Do not bulk-merge all donor branches.

Recommended sequence after founder-approved common foundation consolidation:

1. Define canonical Building / Floor / Space records or projections inside Project Memory without changing Relationship Tree gestures.
2. Seed the commercial synthetic fixture through the canonical Project Memory schema.
3. Replace synthetic BIM labels with the canonical IFC external-reference projection.
4. Project the active AHU-04 issue into canonical Issue / WorkSuite context.
5. Create an authority-safe task/action handoff using canonical Person + Project Participation.
6. Hand worker context to canonical Work Mode rather than the isolated browser representation.
7. Return evidence through the canonical Cloud/evidence boundary.
8. Commit human approval + action result + Timeline projection using canonical IDs.
9. Attach replacement/reuse decision to the same asset identity.
10. Add CAFM/openMAINT read context as an external source, not a second source of Nexus identity.
11. Add quantitative carbon only when verified quantity + EPD/LCA factor + methodology exist.
12. Remove the isolated demo-only state machine only after the canonical path reproduces the full demo story end to end.

## Explicit non-goals

This plan does not authorise:

- retargeting or rebasing protected PR #91;
- bulk-merging historical WorkSuite/BIM/Cloud/Android stacks into PR #160;
- modifying Relationship Tree gesture/layout code;
- creating a second Object Card implementation;
- creating a second Person model;
- creating a second Work Mode backend;
- creating a second Cloud provider path;
- upstream CAFM writes;
- FabStation live-sync claims;
- unverified Work Wallet capability;
- fabricated quantitative CO2/CO2e values.

## Current demo truth

PR #160 remains a synthetic commercial demonstrator. It can credibly show the commercial operating-layer workflow and relationship model today. Its browser-local workflow state is demonstration state, not production Project Memory / WorkSuite / Android / Cloud authority.
