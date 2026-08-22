# NOSMO Nexus MVP Migration Plan

This plan moves Nexus from patched public-preview HTML into a modular source application without breaking the current live prototype.

## Current rule

Do not treat `NOSMO-website/apps/nexus-graph-preview/relationship-tree/` as the long-term source of truth.

That folder is now classified as:

```txt
prototype-source-to-migrate
```

The MVP source must live in:

```txt
mateuszfurmanski-droid/nosmo-nexus-mvp
```

## Safety rule

No live preview rewrites during Phase 0.

No deleting old files.

No UI redesign during Phase 0.

No cache-bust experiments during Phase 0.

## Phase 0 — Foundation

Goal: stop the architectural drift and document the modular target.

Scope:

- create modular structure documentation
- create migration plan
- create file inventory
- identify current source/prototype files
- classify files as core, active module, disabled, dead experiment, unknown
- do not modify live UI
- do not move runtime code yet

Deliverables:

```txt
docs/NEXUS_MVP_MODULAR_STRUCTURE.md
docs/NEXUS_MVP_MIGRATION_PLAN.md
docs/NEXUS_FILE_INVENTORY.md
```

## Phase 1 — Registries

Goal: introduce the MVP control layer without touching the live preview.

Create:

```txt
src/registry/moduleRegistry.ts
src/registry/connectorRegistry.ts
src/registry/worldRegistry.ts
src/registry/dockRegistry.ts
```

Create minimal types:

```txt
src/data/schemas/module.schema.ts
src/data/schemas/connector.schema.ts
src/data/schemas/world.schema.ts
```

No visual implementation yet.

## Phase 2 — Clean Shell Skeleton

Goal: create a clean app shell beside the current prototype.

Create:

```txt
src/app/NexusApp.tsx
src/core/shell/NexusShell.tsx
src/core/shell/TopBar.tsx
src/core/shell/BottomDock.tsx
src/ui/panels/PanelFrame.tsx
src/ui/dock/Dock.tsx
```

The shell must use registries. It must not hardcode modules in component markup.

## Phase 3 — Graph Migration

Goal: move the Relationship Tree / Project Graph into `src/core/graph`.

Target files:

```txt
src/core/graph/ProjectGraph.tsx
src/core/graph/graphRuntime.ts
src/core/graph/graphStore.ts
src/core/graph/graphTypes.ts
```

Rule:

Graph remains persistent background. Panels do not replace it.

## Phase 4 — First Modules

Migrate one module at a time.

Order:

```txt
1. project
2. time
3. docs
4. cloud
5. soft
6. integrations
7. people
8. evidence
```

Each module must have:

```txt
ModulePanel.tsx
module config file
registry entry
no direct dock injection
no global MutationObserver unless approved
```

## Phase 5 — Connectors

Start with reference connectors, not live API promises.

Order:

```txt
1. google-drive
2. work-wallet
3. bim-fabstation
4. companycam
5. microsoft365
6. gmail-whatsapp
7. suppliers
```

Each connector must define:

```txt
id
name
category
status
sourceOfTruth
nexusRole
objectLinks
actions
```

## Phase 6 — Public Preview Export

Only after clean MVP shell works:

- build from `nosmo-nexus-mvp`
- export or deploy preview to `NOSMO-website`
- keep stable public links
- do not edit exported files manually unless emergency hotfix

## Do not migrate yet

The following are not part of Phase 0:

```txt
functional workbench
top command bar
random icon polish patches
Android/APK wrapper
Person Card stable page
BIM heavy runtime
```

## Definition of ready for development

Phase 0 is complete when:

- current live preview is preserved
- branch exists
- modular structure doc exists
- migration plan exists
- file inventory exists
- first list of risky/disabled files is recorded
- next coding work is registry-first, not UI-first
