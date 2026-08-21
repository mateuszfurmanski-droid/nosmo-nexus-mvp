# NOSMO Nexus × SKANSKA — Spark Funded Product Boundary

Status: application / architecture boundary  
Date: 21 August 2026  
Related demo PR: #91  
Related architecture: `ADDON_038 — Project Object Cards and Relationship Graph`

## Product funded by Spark

Spark does **not** fund the full NOSMO Nexus roadmap.

The proposed funded product is:

**NOSMO Nexus Circular Asset & Material Layer**

It is a bounded productionisation and recipient-validation project for SKANSKA Residential Development.

## Pre-grant evidence

The current Spark Demo Core is pre-grant proof of capability. It already demonstrates:

- an information-dense Object Register;
- one shared Object Card interaction pattern;
- typed Object Card creation for Material / Product / Asset / Component / Equipment;
- source/provenance display;
- evidence and lifecycle history;
- maintenance/inspection context;
- human circular decisions with rationale;
- decision and record-edit audit;
- Circular / Environmental reporting;
- explicit `UNKNOWN` handling instead of fabricated CO2 values.

Current demo writes are browser-local and synthetic. They are not represented as production Project Memory persistence.

## Spark-funded build

The grant scope is to turn the demonstrated interaction into a production-testable recipient pilot:

1. **Persistent Project Memory backend** for the bounded SKANSKA pilot scope.
2. **Nexus Object Card v1** as the canonical shared card model.
3. Typed profiles for **Material / Product / Asset / Component / Equipment**.
4. **Evidence layer** for photos, documents, certificates, EPD references, inspections and approvals.
5. **Lifecycle and maintenance history** connected to each Object Card.
6. **Human-controlled Circular Resource Management** using `IN USE / REUSABLE / RECOVER / RECYCLE / WASTE / UNKNOWN` with audit trail.
7. **Provenance controls** separating `REAL / DERIVED / SYNTHETIC_DEMO / UNKNOWN`; editing a field or source reference must not automatically upgrade provenance.
8. **Recipient data ingestion/integration** from at least one agreed SKANSKA source or controlled representative environment.
9. **Environmental reporting** for quantities, reuse, recovery and recycling; CO2 only where verified quantity plus EPD/carbon-factor data and agreed methodology exist.
10. **Security, access and multi-user persistence** appropriate to the pilot.
11. **Pilot validation**, KPI measurement, limitations and deployment/scale-up recommendation.

## Predictive-maintenance boundary

Spark may fund asset-lifecycle history and predictive-maintenance readiness. A predictive model is not promised without sufficient recipient data volume and quality. Rule-based or analytical demonstrations may be used where justified and labelled accurately.

## Not funded in this project

- the full Nexus commercial roadmap;
- unrelated Person Card functionality;
- full BIM authoring;
- full DoorFlow redevelopment;
- Electrical Commissioning and unrelated trade modules;
- broad Android/APK work unrelated to the pilot;
- speculative connectors not required by SKANSKA;
- later enterprise capabilities not required to validate this use case.

## Reuse inside the wider Nexus product

The funded Object Card and Project Memory capabilities are not disposable grant-only code. After validation, the same canonical Object Card infrastructure becomes a reusable Nexus platform primitive that can be opened from Project Graph, registers, BIM/model context, documents and future specialist modules.

The grant therefore finances a concrete SKANSKA-aligned product slice while creating reusable core infrastructure for the wider NOSMO Nexus platform.
