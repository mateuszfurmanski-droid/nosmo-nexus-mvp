# NOSMO Nexus — SKANSKA Property Demo Operator Runbook

Status: commercial property / building operations demonstrator. Synthetic demo data only.

## Goal

Prove one coherent proposition:

> NOSMO Nexus understands the relationship between the physical building, its assets, materials, people, work and evidence.

Do not present this as another CAFM or asset-management application. Existing BIM, FM/CAFM, document storage, contractor systems and LCA/material sources remain source systems. Nexus is the relationship and operational-intelligence layer above them.

## Primary route

`/skanska-property-demo`

Primary case: `AHU-04 — Air Handling Unit 04`.

## 3-minute partner walkthrough

### 1. Start from the Building Graph

Show:

`SKANSKA PROPERTY -> SKANSKA Property Demo Building -> L00 -> L00-MEP-01 -> AHU-04`

Say:

“Instead of searching separate systems, we start from the physical object and its relationships.”

Do not claim this synthetic building is a real SKANSKA building.

### 2. Open the Object Card

Show WHAT / WHERE / WHO / WHEN / PROOF / NEXT through the current asset record:

- exact room and floor;
- BIM reference;
- manufacturer / model / serial number;
- installation date;
- installer and service company;
- Facility Manager owner;
- warranty;
- manuals / QA records / photos;
- inspection and maintenance history;
- next service;
- material composition and reuse potential.

Key phrase:

“Everything SKANSKA knows about this physical object.”

### 3. Ask Nexus

Press:

`What do we know about this asset?`

The deterministic demo answer must expose:

- WHAT;
- WHERE;
- WHO;
- WHEN;
- PROOF;
- NEXT;
- REUSE / CIRCULAR.

Key phrase:

“Stop Searching. Start Asking.”

Truth boundary: this answer is generated from the visible synthetic graph. It is not a live external LLM call and does not use real SKANSKA operational data.

### 4. Open the active issue

Open the AHU-04 high-priority issue:

`Supply fan bearing inspection / replacement decision`.

Create the task already bound to:

- AHU-04;
- L00-MEP-01;
- Piotr Nowak;
- XYZ Mechanical Demo Ltd;
- required checklist;
- required proof.

Message to communicate:

“The task does not lose context when it leaves the Facility Manager.”

### 5. Work Mode

Open Work Mode.

Complete all checklist items and record the two required demo photos.

Finish must remain blocked until:

- every checklist item is complete;
- 2/2 required photo records exist.

Then Finish.

Truth boundary: this branch uses a bounded demo representation because the canonical WorkSuite / native Android Work Mode implementation lives on separate protected development stacks. Do not claim this route is executing the current native Android production path.

### 6. Evidence and approval

Show that evidence returns to the same asset context.

Approve the evidence as Facility Manager.

Then select:

`Update Object Card + Building Graph`.

Show the new history events attached to AHU-04 rather than a disconnected task record.

### 7. Replacement / reuse

Open the replacement / reuse decision.

Show:

- compatible replacement option;
- existing material composition;
- retained assemblies;
- recovery routes;
- synthetic cross-project reuse opportunity.

Key phrase:

“Replacement becomes a resource decision, not just a maintenance close-out.”

### 8. ESG evidence

Confirm the circular route and create ESG evidence.

Show that the same object history now contains:

- inspection evidence;
- worker completion;
- human approval;
- material record;
- reuse opportunity;
- circular resource route;
- ESG evidence.

Carbon rule:

Never show or state a quantitative kgCO2e result unless a verified EPD/LCA factor and required quantities/methodology are connected. The demo deliberately blocks fabricated quantitative carbon values.

## Source-system story

Open the Sources tab only after the asset story is clear.

Explain the architecture as:

`BIM / IFC`
`FM / CAFM`
`Document storage`
`Work Wallet / contractor context`
`FabStation / spatial hand-off`
`LCA / material sources`

↓

`NOSMO NEXUS PROJECT / BUILDING GRAPH`

Do not imply vendor approval, live APIs or production write authority unless separately validated on the relevant connector PR.

## Acceptance checklist before partner use

The demo is partner-ready only when all of the following remain true:

- direct route builds and loads;
- commercial graph fixture contract PASS;
- 1 building present;
- at least 3 floors;
- at least 5 spaces;
- at least 8 assets;
- at least 3 companies;
- at least 5 people;
- all asset, person, company, floor, space and material references resolve;
- all commercial fixture assets/materials remain labelled `SYNTHETIC_DEMO`;
- AHU-04 has one active issue and one replacement case;
- Finish remains gated by checklist + evidence;
- approval is a distinct human step;
- Object Card / Building Graph history updates only after approval;
- circular decision follows replacement planning;
- ESG evidence follows the circular decision;
- no fabricated quantitative carbon claim exists;
- responsive CSS breakpoints remain present;
- dedicated GitHub Actions workflow is green;
- branch Vercel deployment reaches READY;
- anonymous/public-access status is stated truthfully.

## Current public-preview boundary

The connected `nosmo-nexus-cloud-staging` Vercel project currently protects previews with Vercel Authentication. A READY deployment is therefore not automatically an anonymous stable public preview.

Do not call Definition of Done complete until either:

1. a separate public demo deployment is created without weakening Cloud-staging protection; or
2. an explicitly approved public-access configuration is applied to a dedicated demo project.

A temporary Vercel share link is suitable for controlled review but is not the final stable public URL.

## Reset

At the end of the walkthrough use:

`Reset demo workflow`

This returns the synthetic AHU-04 story to its initial active-issue state for the next demonstration.
