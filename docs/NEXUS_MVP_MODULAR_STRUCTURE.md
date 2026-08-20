# NOSMO Nexus MVP Modular Structure

NOSMO Nexus MVP is the source application for the Nexus Construction Operating Layer.

`NOSMO-website` is not the source application. It is only a public preview, marketing site and deployment mirror.

The MVP must be built as a modular application with:

- one Nexus shell
- one persistent Project Graph
- one module registry
- one connector registry
- one world registry
- panels as overlays
- workflow modules loaded from registry
- connectors separated from UI
- Project Worlds separated from each other

## Repository responsibility

```txt
nosmo-nexus-mvp = real application source
NOSMO-website   = public preview / marketing / exported demo mirror
```

No future MVP architecture should depend on manually patched public-preview HTML files as the source of truth.

## Target high-level structure

```txt
nosmo-nexus-mvp/
├─ docs/
├─ public/
└─ src/
   ├─ app/
   ├─ core/
   ├─ registry/
   ├─ modules/
   ├─ connectors/
   ├─ worlds/
   ├─ data/
   ├─ ui/
   └─ utils/
```

## Source structure

```txt
src/
├─ main.tsx
├─ App.tsx
│
├─ app/
│  ├─ NexusApp.tsx
│  ├─ routes.tsx
│  ├─ providers.tsx
│  └─ appConfig.ts
│
├─ core/
│  ├─ shell/
│  │  ├─ NexusShell.tsx
│  │  ├─ TopBar.tsx
│  │  ├─ BottomDock.tsx
│  │  └─ shell.css
│  │
│  ├─ graph/
│  │  ├─ ProjectGraph.tsx
│  │  ├─ graphStore.ts
│  │  ├─ graphTypes.ts
│  │  └─ graphRuntime.ts
│  │
│  ├─ timeline/
│  │  ├─ ProjectTime.tsx
│  │  ├─ timelineStore.ts
│  │  └─ timelineTypes.ts
│  │
│  ├─ events/
│  │  ├─ eventBus.ts
│  │  └─ nexusEvents.ts
│  │
│  ├─ permissions/
│  │  ├─ permissions.ts
│  │  └─ roles.ts
│  │
│  └─ storage/
│     ├─ storageAdapter.ts
│     └─ localStore.ts
│
├─ registry/
│  ├─ moduleRegistry.ts
│  ├─ connectorRegistry.ts
│  ├─ worldRegistry.ts
│  └─ dockRegistry.ts
│
├─ modules/
│  ├─ project/
│  ├─ people/
│  ├─ docs/
│  ├─ cloud/
│  ├─ soft/
│  ├─ integrations/
│  ├─ evidence/
│  ├─ doorflow/
│  ├─ fire-door-register/
│  └─ electrical/
│
├─ connectors/
│  ├─ google-drive/
│  ├─ work-wallet/
│  ├─ bim-fabstation/
│  ├─ companycam/
│  ├─ microsoft365/
│  ├─ gmail-whatsapp/
│  └─ suppliers/
│
├─ worlds/
│  ├─ esafe-catania/
│  ├─ riverside/
│  └─ worldTypes.ts
│
├─ data/
│  ├─ schemas/
│  └─ demo/
│
├─ ui/
│  ├─ dock/
│  ├─ panels/
│  ├─ icons/
│  ├─ theme/
│  └─ components/
│
└─ utils/
   ├─ ids.ts
   ├─ dates.ts
   ├─ links.ts
   └─ guards.ts
```

## Non-negotiable architecture rules

1. Relationship Tree / Project Graph remains the persistent workspace background.
2. Panels open above the graph. They must not replace the graph world.
3. e-SAFE Catania and Riverside must remain separate Project Worlds.
4. The dock reads from `dockRegistry.ts` and `moduleRegistry.ts`.
5. SOFT and INT read from `connectorRegistry.ts`.
6. CLOUD reads from a cloud/storage adapter, not hardcoded panel markup.
7. UI does not own connector truth. Connectors are data/service modules.
8. Experiments are disabled by registry, not deleted or hidden by random CSS.
9. Live public preview is a deployment target, not the source of application architecture.

## First registries

The first registry files to introduce are:

```txt
src/registry/moduleRegistry.ts
src/registry/connectorRegistry.ts
src/registry/worldRegistry.ts
src/registry/dockRegistry.ts
```

These must exist before more UI modules are added.

## Initial module list

```txt
project
people
docs
time
cloud
soft
integrations
evidence
doorflow
fire-door-register
electrical
```

## Initial connector list

```txt
google-drive
work-wallet
bim-fabstation
companycam
hilti
microsoft365
procore-dalux
autodesk-bluebeam
gmail-whatsapp
suppliers
```
