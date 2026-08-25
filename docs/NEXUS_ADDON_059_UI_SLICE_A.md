# NEXUS ADDON_059 UI Slice A

This slice implements the first bounded ADDON_059 interaction surface on the e-SAFE Catania core branch.

## Authority

Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#24`.

Runtime base: `nosmo-nexus-mvp#162`.

The browser is not mutation authority. Semantic drag-and-drop prepares a request only. Project Participation, PermissionGrant, AccessDecision, canonical Person binding and the WorkSuite/core work-cycle remain server authority.

## Included

- accepted PersistentWorkspace donor from the #15 -> #45 -> #86 Relationship Tree lineage;
- no persistent top navigation bar;
- bottom source palette;
- manager Work Package composition zone;
- whole-package drag;
- compatible / blocked target highlighting;
- `nexus-semantic-drop-request/v1` UI request event;
- explicit `clientMutationPerformed=false` and `persistencePerformed=false` until an authenticated adapter exists;
- exact canonical request scope `project-esafe-catania` / `world-esafe-catania`;
- synthetic Person target reuses #162 fixture `person-esafe-demo-manager` and remains visibly `SYNTHETIC_DEMO`.

## Not included

- durable Work Package persistence;
- direct Project Memory mutation;
- assignment API;
- Android recipient projection;
- Person Card/Object Card persistence changes;
- TimeSpace floating window;
- production deployment or production database changes.

## Validation rule

A skipped draft workflow is not PASS. Full TypeScript/build/e-SAFE smoke validation must execute on the exact PR head before this slice is described as CI green.
