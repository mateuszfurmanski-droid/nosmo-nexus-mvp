# Nexus × FabStation project-package plan

Status: bounded FILE_EXCHANGE planning contract

This slice turns the public FabStation file-exchange evidence into a deterministic Nexus project-package plan without creating a ZIP, uploading a file or mutating partner state.

## Current official FabStation package rules used by Nexus

FabStation's public knowledge base currently documents the following steel project package behavior:

- project upload uses a ZIP archive;
- one KSS file is mandatory;
- more than one KSS is an error;
- IFC is optional in FabStation generally but is required by this Nexus spatial hand-off profile so the mapped object remains usable in 3D/AR context;
- more than one project IFC is an error;
- the documented steel project IFC format is IFC2x3;
- PDF drawings are optional, but without them FabStation Drawings are not available;
- KSS + IFC enables 3D Viewer and AR features;
- current project files should represent the latest Issued for Construction revision.

Official references:

- https://www.fabstation.com/kb/creating-zip/
- https://www.fabstation.com/kb/files-not-uploading/
- https://www.fabstation.com/kb/supported-file-formats/
- https://www.fabstation.com/kb/tekla-export-plugin/
- https://www.fabstation.com/kb/sds2-export/

## Nexus plan contract

Schema:

`nexus-fabstation-project-package-plan/v1`

Input:

- one existing `nexus-spatial-hand-off/v1` packet using the public FabStation FILE_EXCHANGE descriptor;
- bounded canonical Nexus File references only;
- exact Project / Project World scope;
- file name, byte length and SHA-256 for each referenced file.

The planner requires:

- exactly one KSS reference;
- exactly one project IFC reference;
- IFC schema `IFC2X3` under the currently confirmed public partner evidence;
- exact source IFC filename and SHA-256 equality with the frozen spatial hand-off packet;
- zero or more PDF references;
- no duplicate Nexus File IDs;
- no duplicate package filenames;
- exact project/world scope for every file;
- supported `.kss`, `.ifc`, `.pdf` extensions only.

## Why IFC4 is currently blocked

The public representative IFC used by Slice L / PR #124 is IFC4. It is useful for Nexus structural validation, but the current public FabStation steel-project evidence specifically documents IFC2x3.

Therefore an IFC4 hand-off fails with:

`IFC2X3_REQUIRED_BY_CURRENT_PUBLIC_EVIDENCE`

This is intentional. Nexus will not infer broader partner schema acceptance from its own IFC parser capability.

The gate can only be relaxed after direct FabStation evidence confirms another supported schema/profile.

## Output

A successful plan records:

- exact project/world/object/IFC GlobalId scope;
- source model revision;
- partner FILE_EXCHANGE evidence descriptor;
- deterministic bounded file references;
- ZIP package profile;
- feature readiness implied by the selected files.

Execution state:

`PROJECT_PACKAGE_PLAN_READY_NO_UPLOAD`

## Hard boundaries

The planner:

- contains no file bytes;
- does not create a ZIP;
- does not upload to FabStation;
- does not call a partner API;
- does not mutate partner or Nexus state;
- does not create a live-sync claim;
- does not establish `PARTNER_HANDOFF_PASS`.

A human must review/assemble the actual ZIP and perform the upload through the documented FabStation portal or another explicitly partner-approved mechanism.

## Next partner evidence gate

For a real hand-off PoC we still need:

1. an authorised project package with one non-empty KSS;
2. a project IFC matching the exact Nexus-mapped source and a FabStation-confirmed schema/profile;
3. optional matching PDFs if Drawings are required;
4. human review of revision / Issued-for-Construction status;
5. actual upload to a partner-approved FabStation project;
6. evidence that FabStation processed the package;
7. Nexus recording the resulting partner hand-off evidence without inventing API/live-sync semantics.

Only then may the partner validation gate be evaluated for promotion.

## Protected boundaries

No PR #91 or Spark Object Card changes. No Work Wallet, Nexus Cloud, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gesture/layout changes. No automatic merge or deployment.
