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

`Project World -> asset/material -> source + evidence -> lifecycle -> maintenance -> human circular decision -> audit event -> environmental reporting`

A saved demo decision now performs a complete visible loop:

1. user opens an asset/material record;
2. source, evidence, lifecycle and maintenance context remain visible;
3. user chooses a different circular status;
4. user supplies decision-maker text and a rationale;
5. Nexus creates a timestamped browser-local audit event containing previous status, new status, actor and rationale;
6. the Asset & Material Register immediately reflects the latest status;
7. Environmental counts immediately recompute from the current status set;
8. the Environmental view exposes audit-event count, changed-asset count and recent decisions.

The audit persistence is deliberately browser-local for this demonstrator. It survives page refresh in the same browser where storage is available, but it is **not** represented as a live backend Project Memory write.

## Functional UI direction

The Spark demonstrator is also the current UI reference for a more functional Nexus workbench direction:

- information density before decoration;
- register/table views before large visual cards;
- compact project structure navigation;
- visible IDs, locations, status, provenance, attention and source references in the primary working view;
- detail panels for evidence, lifecycle, maintenance, decisions and audit history;
- restrained colour used as state signalling rather than decoration;
- minimal gradients, oversized tiles, ornamental graph nodes or game-like presentation;
- mobile remains data-dense and operational, using horizontal register scrolling and a full-screen detail panel where required.

This direction is a product/UI principle for future Nexus shell work. It does **not** modify or release the PR #90 founder-gated foundation scope.

## Included

- one synthetic residential Project World;
- four building areas;
- eight tracked asset/material records;
- circular statuses: `IN USE`, `REUSABLE`, `RECOVER`, `RECYCLE`, `WASTE`, `UNKNOWN`;
- visible provenance: `REAL`, `DERIVED`, `UNKNOWN`;
- documents/evidence references;
- lifecycle events;
- maintenance and inspection history;
- explainable `LOW / MEDIUM / HIGH` maintenance-attention indicator;
- environmental record counts;
- human circular-decision form with rationale;
- timestamped decision audit history;
- browser-local demo persistence;
- environmental recomputation after human decisions.

## Truthfulness rules

1. The dataset is explicitly labelled synthetic and does not represent a real SKANSKA project.
2. No live connector capability is claimed.
3. No predictive-maintenance AI model is claimed.
4. Maintenance attention is rule-based and its reasons are shown.
5. CO2-related data remains `UNKNOWN` where no verified project quantity, EPD or carbon factor exists.
6. No fabricated kgCO2e savings or avoided-carbon values are shown.
7. Human decisions remain explicit and are not presented as AI decisions.
8. Demo decision audit is stored locally in the browser where available and is not presented as a persisted backend Project Memory write.

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
- production multi-user decision persistence or authentication-backed actor identity.

## Acceptance criteria

The demo is acceptable when:

- the route builds in the existing `@workspace/nosmo-nexus` Vite app;
- it can be opened directly without navigating through incomplete Nexus screens;
- desktop and mobile layouts remain usable;
- the primary Project view is a functional asset/material register rather than a decorative dashboard;
- every asset can open a detail panel;
- environmental counts derive from the current demo records;
- a human can select a new circular status and provide a rationale;
- saving that decision creates a visible timestamped audit entry;
- the current asset status and Environmental counts update from the saved decision;
- browser-local persistence is explicitly distinguished from backend Project Memory persistence;
- the UI exposes missing/unknown data rather than hiding it;
- no real SKANSKA project, CO2 performance or live integration claim is implied.
