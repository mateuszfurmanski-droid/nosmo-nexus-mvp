# NEXUS Spark Demo Core — SKANSKA Circular Construction

Status: implementation demonstrator  
Branch: `codex/spark-skanska-demo-core`  
PR: `#91`  
Base: `codex/nexus-mvp-modular-foundation` / PR #90

## Purpose

This is a narrow technical demonstrator for the Spark 4.0 / SKANSKA Residential Development application context.

It does not present the full NOSMO Nexus platform as complete.

## Runtime route

`/spark-skanska-demo`

The route intentionally runs outside the legacy Nexus `AppLayout` so the Spark demonstrator does not expose incomplete modules, mixed project fixtures or dead navigation.

## Demonstrated flow

`Project World -> object -> source + evidence -> lifecycle -> maintenance -> human circular decision -> audit event -> environmental reporting`

A saved demo decision performs a complete visible loop:

1. user opens an object record;
2. source, evidence, lifecycle and maintenance context remain visible;
3. user chooses a different circular status;
4. user supplies decision-maker text and a rationale;
5. Nexus creates a timestamped browser-local audit event containing previous status, new status, actor and rationale;
6. the Object Register immediately reflects the latest status;
7. Environmental counts immediately recompute from the current status set;
8. the Environmental view exposes audit-event count, changed-object count and recent decisions.

## Object Card v1 creation flow

The Spark demonstrator now includes the first typed `+ Add Object` flow aligned with `ADDON_038 — Project Object Cards and Relationship Graph`.

A user can create one of the current Object Card v1 profiles:

- `MATERIAL`;
- `PRODUCT`;
- `ASSET`;
- `COMPONENT`;
- `EQUIPMENT`.

The creation form captures:

- name / label;
- specific type;
- project area;
- location;
- source-document reference;
- lifecycle state;
- provenance (`UNKNOWN` or `DERIVED` only in this manual demo flow);
- initial circular status;
- creator text;
- creation note.

Saving creates:

1. a generated stable demo object ID;
2. a browser-local typed Object Card record;
3. an initial lifecycle creation event;
4. an Object creation audit entry;
5. an immediately selectable Object Card in the register;
6. immediate participation in Environmental counts and report export.

A manually created demo record cannot be marked `REAL` through this flow. Adding or editing a source-document reference does not verify that source or upgrade provenance.

The Object Card visual/detail pattern is the current reference direction for future Nexus Material / Product / Asset / Component / Equipment cards. It is not a separate application per type.

## Record edit loop

The same demonstrator supports a constrained record-edit workflow for operational fields:

- location;
- lifecycle state;
- last inspection date;
- source-document reference.

A user can edit those fields, identify who made the change and optionally add a change note. The update is stored as a timestamped browser-local edit event and the register/detail view immediately reflects the latest value.

Editing a source-document reference does **not** upgrade provenance, verify a source or convert `UNKNOWN`/`DERIVED` data into `REAL`. Provenance remains an independent truth boundary.

## Circular / Environmental report

The Environmental view can export the current demonstrator state as CSV and can invoke the browser print flow for print / Save as PDF.

The report includes:

- current Object Register values;
- browser-local Object creation audit;
- circular-status distribution;
- provenance state;
- maintenance-attention counts;
- human circular-decision audit entries;
- record-edit audit entries;
- explicit synthetic-data and CO2 guardrails.

The report does not fabricate quantity, EPD, carbon factor, kgCO2e or avoided-carbon values. CO2 remains `UNKNOWN` where verified inputs are absent.

## Persistence boundary

Object creation, decision and record-edit persistence are deliberately browser-local for this demonstrator. They survive refresh in the same browser where local storage is available, but they are **not** represented as live backend Project Memory writes, authenticated multi-user records or confirmed connector writes.

## Functional UI direction

The Spark demonstrator is also the current UI reference for a more functional Nexus workbench direction:

- information density before decoration;
- register/table views before large visual cards;
- compact project structure navigation;
- visible IDs, locations, status, provenance, attention and source references in the primary working view;
- detail panels for evidence, lifecycle, maintenance, decisions, edits and audit history;
- one Object Card shell with typed profiles rather than separate applications for each object type;
- restrained colour used as state signalling rather than decoration;
- minimal gradients, oversized tiles, ornamental graph nodes or game-like presentation;
- mobile remains data-dense and operational, using horizontal register scrolling and a full-screen detail panel where required.

This direction is a product/UI principle for future Nexus shell work. It does **not** modify or release the PR #90 founder-gated foundation scope.

## Included

- one synthetic residential Project World;
- four building areas;
- eight initial tracked object records;
- browser-local creation of Material / Product / Asset / Component / Equipment Object Cards;
- generated demo Object IDs and creation audit;
- circular statuses: `IN USE`, `REUSABLE`, `RECOVER`, `RECYCLE`, `WASTE`, `UNKNOWN`;
- visible provenance: `REAL`, `DERIVED`, `UNKNOWN`;
- documents/evidence references;
- lifecycle events;
- maintenance and inspection history;
- explainable `LOW / MEDIUM / HIGH` maintenance-attention indicator;
- environmental record counts;
- human circular-decision form with rationale;
- timestamped decision audit history;
- constrained record editing with timestamped edit audit;
- browser-local demo persistence;
- environmental recomputation after object creation and human decisions;
- CSV report export;
- browser print / Save as PDF report path.

## Truthfulness rules

1. The dataset is explicitly labelled synthetic and does not represent a real SKANSKA project.
2. No live connector capability is claimed.
3. No predictive-maintenance AI model is claimed.
4. Maintenance attention is rule-based and its reasons are shown.
5. CO2-related data remains `UNKNOWN` where no verified project quantity, EPD or carbon factor exists.
6. No fabricated kgCO2e savings or avoided-carbon values are shown.
7. Human decisions remain explicit and are not presented as AI decisions.
8. Demo creation, decision and edit audit is stored locally in the browser where available and is not presented as persisted backend Project Memory.
9. Editing or supplying a source reference does not alter provenance automatically.
10. A browser-created demo Object Card cannot be marked `REAL` through the manual creation flow.
11. Report export reflects only the current demonstrator state and carries the same synthetic-data boundaries.

## Not included

- full Nexus shell migration;
- Person Card;
- DoorFlow / Fire Door Register;
- Electrical Commissioning;
- BIM runtime;
- live Work Wallet / Google Drive / FabStation / supplier integrations;
- PKG-005 readiness runtime or predictive AI;
- Android/APK;
- expanded authentication;
- production multi-user Object creation / decision / edit persistence or authentication-backed actor identity;
- verified environmental quantities, EPD ingestion or carbon calculation engine.

## Acceptance criteria

The demo is acceptable when:

- the route builds in the existing `@workspace/nosmo-nexus` Vite app;
- it can be opened directly without navigating through incomplete Nexus screens;
- desktop and mobile layouts remain usable;
- the primary Project view is a functional Object Register rather than a decorative dashboard;
- every object can open a detail panel;
- a user can create a Material / Product / Asset / Component / Equipment Object Card from `+ Add Object`;
- a newly created Object Card appears immediately in the register and Environmental/report state;
- browser-created objects retain `UNKNOWN`/`DERIVED` provenance boundaries and cannot be manually promoted to `REAL` in this flow;
- a user can edit the constrained operational fields and save an edit event;
- the updated values immediately appear in register/detail views;
- a human can select a new circular status and provide a rationale;
- saving that decision creates a visible timestamped audit entry;
- the current object status and Environmental counts update from the saved decision;
- Environmental can export a CSV report of current state and audit data;
- browser print / Save as PDF is available for the Environmental report;
- browser-local persistence is explicitly distinguished from backend Project Memory persistence;
- the UI exposes missing/unknown data rather than hiding it;
- no real SKANSKA project, CO2 performance or live integration claim is implied.
