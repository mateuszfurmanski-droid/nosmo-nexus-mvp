# NOSMO Nexus — Phase 13 Object Card v1 Foundation

Status: foundation contract implemented in PR #90. No UI migration is included in this phase.

## Purpose

Phase 13 aligns the PR #90 Project Memory foundation with the current ADDON_038 Object Card v1 direction without modifying the Spark demonstrator in PR #91.

The core decision is:

`Object Card = projection of canonical Project Memory`

not:

`Object Card = second independent data store`

This prevents a card, graph, timeline and backend from developing conflicting copies of object state.

## Protected Spark rule

PR #91 is the Spark / SKANSKA demonstrator and is intentionally frozen from this foundation task.

Phase 13 does not:

- modify PR #91;
- rebase PR #91;
- refactor the Spark Asset / Material card;
- replace its visual design;
- move its browser-local demo state into #90;
- claim its local demo persistence is production Project Memory.

The current Spark card can remain a visual/interaction reference while #90 develops the canonical data contract separately.

## Architecture source

Current architecture reference:

- `mateuszfurmanski-droid/nosmo-nexus` PR #21;
- ADDON_038 — Project Object Cards and Relationship Graph.

The architecture establishes one shared Object Card shell with typed profiles and an information-dense workbench direction.

Phase 13 implements only the non-UI foundation needed to support that direction.

## Added contract

New file:

`src/data/schemas/objectCard.schema.ts`

It defines:

- `NexusObjectCardProfile`;
- `NexusObjectCardSection`;
- `NexusObjectCardProfileDefinition`;
- `NEXUS_OBJECT_CARD_V1_PROFILES`;
- `resolveNexusObjectCardSurface(...)`;
- `NexusObjectCardProjectionDescriptor`;
- `createNexusObjectCardProjectionDescriptor(...)`.

The descriptor intentionally contains only:

- canonical Object ID;
- canonical Object Type;
- resolved card profile;
- project/world scope;
- projection-source marker.

It does not duplicate status, provenance, evidence, lifecycle, human decisions or audit records.

Those remain owned by Project Memory.

## Shared sections

The canonical Object Card section model is:

1. identity;
2. location/context;
3. relations;
4. source/provenance;
5. evidence;
6. lifecycle;
7. operational state;
8. human decisions;
9. audit/history;
10. reporting/actions.

A profile may make a section required, conditional or profile-specific.

## Typed profiles

The current foundation profiles are:

- Project;
- Material;
- Product;
- Asset;
- Component;
- Equipment;
- Space;
- Document;
- Task;
- Issue;
- WorkPackage;
- RFI;
- Approval;
- Evidence;
- Generic.

## Canonical object taxonomy change

`NexusObjectType` now includes:

- `Product`;
- `Component`.

These were necessary to represent the ADDON_038 model directly rather than overloading Asset or InstallationObject for every physical/project object.

## Component rule

The following currently resolve to the shared `Component` profile:

- `Component`;
- `Door`;
- `InstallationObject`.

This preserves specialist Door/BIM behavior while preventing each specialist surface from becoming a separate object-storage model.

A future Fire Door Card, Window Card, Wall Card or MEP Object Card should normally be a typed/specialised Component projection over canonical Project Memory.

## Person and Company boundary

`Person` and `Company` do not resolve to the generic Object Card surface.

They return dedicated surfaces:

- `person-card`;
- `company-card`.

This is deliberate. Person identity, Project Participation, role/trade assignment and access authority must not be flattened into a generic asset/object model.

The dedicated cards may reuse visual conventions from Object Card v1, but their authority semantics remain separate.

## Provenance and decision boundary

Object Card v1 does not create a new provenance or decision model.

It must resolve:

- provenance from canonical object/source/external-reference/temporal records;
- evidence from Project Memory evidence/inspection/file relations;
- human decisions from `NexusHumanDecisionRecord`;
- field history from `NexusFieldChangeRecord`;
- temporal state from ADDON_057-compatible records;
- access from ADDON_056-compatible Project Participation/permission decisions.

Manual field editing must not automatically upgrade source provenance.

AI suggestion must remain distinguishable from source truth and human decision.

## Product vs Asset vs Component

Foundation semantics:

- Product = product/specification/catalogue identity;
- Asset = managed physical instance with operational/maintenance history;
- Component = installed building element/component;
- Material = material/batch/quantity/circularity context;
- Equipment = tools/plant/service equipment with equipment-specific inspection/service controls.

These are different typed profiles of one Object Card system, not separate applications.

## Projection rule

`createNexusObjectCardProjectionDescriptor(...)` is deliberately lightweight.

The future resolver/UI should take that descriptor and resolve live Project Memory sections at read time or through a bounded cache/projection layer.

Do not persist a second card-owned copy of:

- object status;
- source truth;
- evidence;
- lifecycle state;
- maintenance state;
- decisions;
- audit history.

## Current validation

A focused strict TypeScript compile was executed against the new Object Card contract and its required canonical/common/registry types:

`tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution node`

Result: PASS.

This is not a full repository build.

PR #90 remains draft, so the heavy repository `Validate and Build` workflow may still be skipped by design.

## Not implemented in Phase 13

- Object Card React component;
- Spark card changes;
- Person Card changes;
- Company Card UI;
- Project Memory persistence changes;
- product/component fixtures;
- BIM/IFC migration;
- DoorFlow migration;
- readiness UI;
- connector runtime;
- new shell/panel work.

## Next controlled step

After Phase 13, the foundation has enough object taxonomy to avoid creating another incompatible card model.

The next high-value reconciliation should be one of:

1. auth/identity runtime reconciliation from PRs #54-#61 into #90 contracts; or
2. Cloud contract reconciliation from #66-#77 plus #73 routing rules;

while keeping PR #91 untouched.

Do not start real Object Card UI in #90 until the target shell/overlay host and Project Memory resolver path are chosen deliberately.
