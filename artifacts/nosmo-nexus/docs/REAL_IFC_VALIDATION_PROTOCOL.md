# Real IFC Validation Protocol

Status: DRAFT / MANUAL VALIDATION REQUIRED

This protocol belongs to the BIM / FabStation Operational Layer and supports the `nexus-real-ifc-validation/v1` product contract.

## Purpose

Move the BIM stack from synthetic/demo confidence toward representative-model evidence without crossing the Nexus source-of-record boundary.

This protocol validates what Nexus can safely prepare:

- local IFC session opened in browser;
- explicit IFC GlobalId -> Nexus Object ID mapping;
- source file provenance and SHA-256 where available;
- geometry selection comparison against a trusted IFC viewer;
- read-only IFC item/Pset/type/material source-data comparison;
- two-revision comparison readiness;
- SpatialConnector bounded hand-off payload.

## Non-goals

This protocol does not certify:

- BIM authoring correctness;
- clash detection;
- survey validation;
- fabrication tolerance;
- installation tolerance compliance;
- physical movement;
- design approval;
- FabStation/live partner integration.

## Required manual evidence

For each representative IFC validation run, record outside the Project Graph payload:

- validator name;
- date/time;
- browser/device;
- trusted IFC viewer used;
- IFC source system/export origin if known;
- current IFC file name and SHA-256 where available;
- mapped IFC GlobalId;
- Nexus Object ID;
- whether geometry selection matched the trusted viewer;
- whether item/Psets/type/material values matched the trusted viewer;
- whether revision comparison used two real revisions from the same project lineage;
- whether any SpatialConnector capability was partner-confirmed.

## Boundary rules

- Do not upload raw IFC into Project Graph launch URLs.
- Do not persist full Psets, geometry arrays, meshes or credentials in Change Event envelopes.
- Do not use STEP/express ID as persistent identity.
- Do not auto-remap removed objects to the most similar replacement.
- Do not mutate readiness, procurement, evidence, inspection, sign-off or as-built state from IFC values alone.
- Do not call a manual mapping or launcher a live integration.
- Do not upgrade SpatialConnector maturity without partner evidence.

## Current validation state

Automated CI may validate TypeScript, production build and route/API smoke only.

Until manual evidence is recorded, the following remain NOT VALIDATED:

- representative real IFC model;
- two real IFC revisions;
- real-browser Full WASM runtime;
- Android/Samsung Fold IFC interaction;
- trusted viewer geometry/Pset comparison;
- coordinate comparison against authorised project/survey basis;
- real FabStation or spatial partner hand-off.
