# Nexus × FabStation public file-exchange evidence

Status: official public capability evidence

This slice narrows the FabStation uncertainty using FabStation's own public documentation without inventing an API or live integration.

## Official public evidence

FabStation's knowledge base documents a project-package workflow using:

- project KSS/KISS data;
- project IFC;
- assembly/part PDFs;
- ZIP upload into a FabStation project.

FabStation also documents exporter/plugin workflows for detailing systems including Tekla Structures and SDS2. Its BIM guidance states that FabStation-STEEL adopted IFC2x3 as the selected IFC import format.

Evidence references are stored in `FABSTATION_PUBLIC_CAPABILITY_EVIDENCE`.

## Confirmed capability class

The following vendor capabilities are now treated as publicly documented:

- project-level file exchange;
- project ZIP upload;
- IFC2x3 project input;
- KSS project input;
- PDF project input;
- Tekla export plugin workflow.

This supports a FabStation partner maturity classification of:

`FILE_EXCHANGE`

## Nexus-specific claim remains unverified

`FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR` deliberately uses:

- maturity: `FILE_EXCHANGE`;
- claimStatus: `UNVERIFIED`.

The distinction is intentional.

FabStation's public documentation proves that FabStation can consume documented project files. It does not prove that FabStation accepts the Nexus JSON hand-off contract or exposes an object-level integration endpoint.

The existing `nexus-spatial-hand-off/v1` packet remains bounded context prepared by Nexus only. It does not upload an IFC/KSS/PDF package, execute a partner adapter or mutate FabStation state.

## Capabilities not confirmed by public evidence

No claim is released for:

- public API;
- public SDK;
- webhook;
- stable object-level deep link;
- embeddable viewer;
- acceptance of `nexus-spatial-hand-off/v1`;
- live sync;
- two-way sync;
- external partner write API.

## Partner hand-off gate

Current status becomes more precise:

`FABSTATION FILE EXCHANGE CONFIRMED — NEXUS HANDOFF EXECUTION UNVERIFIED`

This is still not `PARTNER_HANDOFF_PASS`.

A real hand-off requires one of:

1. partner-approved Nexus -> FabStation project-package PoC using the documented file-exchange route; or
2. direct FabStation confirmation of another integration mechanism, followed by implementation and execution of that exact mechanism.

Only actual execution with recorded evidence may promote `PARTNER_HANDOFF_PASS`.

## Protected boundaries

No PR #91 change. No Spark Object Card change. No live API/sync claim. No Work Wallet, Nexus Cloud/Drive implementation, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gesture/layout change.

Draft only. No automatic merge.
