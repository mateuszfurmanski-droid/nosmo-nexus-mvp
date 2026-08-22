# NOSMO Nexus File Inventory

This inventory records the current public-preview Nexus files before migration into the modular MVP source app.

Source reviewed:

```txt
mateuszfurmanski-droid/NOSMO-website
apps/nexus-graph-preview/relationship-tree/
```

Target source app:

```txt
mateuszfurmanski-droid/nosmo-nexus-mvp
```

## Classification legend

```txt
KEEP_CORE        = current working prototype core; do not touch casually
ACTIVE_MODULE    = active prototype feature; migrate later one by one
ACTIVE_ADDON     = active add-on; fragile, migrate to module/registry
DISABLED         = intentionally disabled / kill-switch
DEAD_EXPERIMENT  = do not load; kept only for reference
UNKNOWN          = inspect before modifying
MIGRATE_LATER    = useful but not Phase 0
```

## Current Relationship Tree prototype files

```txt
apps/nexus-graph-preview/relationship-tree/index.html                         KEEP_CORE
apps/nexus-graph-preview/relationship-tree/nexus-world-bootstrap.js            KEEP_CORE
apps/nexus-graph-preview/relationship-tree/nexus-shell-v2.js                   KEEP_CORE
apps/nexus-graph-preview/relationship-tree/nexus-shell-v2.css                  KEEP_CORE
apps/nexus-graph-preview/relationship-tree/nexus-timeline-panel.js             KEEP_CORE / ADDON LOADER
apps/nexus-graph-preview/relationship-tree/nexus-timeline-panel.css            KEEP_CORE / LEGACY TIMELINE STYLE
apps/nexus-graph-preview/relationship-tree/nexus-bottom-dock-bridge.js         ACTIVE_ADDON / FRAGILE
apps/nexus-graph-preview/relationship-tree/nexus-project-time-instrument.js    ACTIVE_MODULE
apps/nexus-graph-preview/relationship-tree/nexus-project-time-instrument.css   ACTIVE_MODULE
apps/nexus-graph-preview/relationship-tree/nexus-project-time-instrument-tune.css ACTIVE_MODULE / STYLE OVERRIDE
apps/nexus-graph-preview/relationship-tree/nexus-project-switcher.js           ACTIVE_MODULE
apps/nexus-graph-preview/relationship-tree/nexus-project-switcher.css          ACTIVE_MODULE
apps/nexus-graph-preview/relationship-tree/nexus-people-panel.js               ACTIVE_MODULE
apps/nexus-graph-preview/relationship-tree/nexus-people-panel.css              ACTIVE_MODULE
apps/nexus-graph-preview/relationship-tree/nexus-cloud-panel.js                ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-cloud-panel.css               ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-software-panel.js             ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-software-panel.css            ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-integrations-panel.js         ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-integrations-panel.css        ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-addon-dock-icons.js           ACTIVE_ADDON / STYLE PATCH
apps/nexus-graph-preview/relationship-tree/nexus-addon-dock-icons.css          ACTIVE_ADDON / STYLE PATCH
apps/nexus-graph-preview/relationship-tree/nexus-functional-workbench.js       DISABLED / KILL-SWITCH
apps/nexus-graph-preview/relationship-tree/nexus-functional-workbench.css      DISABLED / KILL-SWITCH
apps/nexus-graph-preview/relationship-tree/nexus-top-command-bar.js            DEAD_EXPERIMENT / DO NOT LOAD
apps/nexus-graph-preview/relationship-tree/nexus-top-command-bar.css           DEAD_EXPERIMENT / DO NOT LOAD
apps/nexus-graph-preview/relationship-tree/nexus-compact-top-shell.css         ACTIVE_ADDON / STYLE OVERRIDE
apps/nexus-graph-preview/relationship-tree/nexus-top-time-chip.js              ACTIVE_ADDON
apps/nexus-graph-preview/relationship-tree/nexus-mobile-dock-polish.css        UNKNOWN / INSPECT BEFORE USE
apps/nexus-graph-preview/relationship-tree/nexus-one-shell-fixes.js            UNKNOWN / INSPECT BEFORE USE
apps/nexus-graph-preview/relationship-tree/nexus-esafe-graph-runtime.js        MIGRATE_LATER
apps/nexus-graph-preview/relationship-tree/esafe-embedded-adapter.js           MIGRATE_LATER
apps/nexus-graph-preview/relationship-tree/nexus-manager-trades-view.js        MIGRATE_LATER
apps/nexus-graph-preview/relationship-tree/nexus-trade-content-ai.js           MIGRATE_LATER
apps/nexus-graph-preview/relationship-tree/nexus-trade-graph-runtime.js        MIGRATE_LATER
apps/nexus-graph-preview/relationship-tree/nexus-workmode-world.js             MIGRATE_LATER / DO NOT TOUCH NOW
apps/nexus-graph-preview/relationship-tree/PROJECT_CONTEXT_LIVE_VERIFIED.txt   REFERENCE
apps/nexus-graph-preview/relationship-tree/TIMELINE_LIVE_VERIFIED.txt          REFERENCE
```

## Current prototype behavior to preserve

Before any migration or rewrite, these must remain available in the current live preview:

```txt
Relationship Tree / Project Graph
Top MENU / PROJECT / TIME / FILES / TOOLS shell
Bottom dock
Project Time player
CLOUD panel
SOFT panel
INT panel
Project World links: e-SAFE Catania / Riverside
```

## Known hazards

```txt
nexus-functional-workbench.js/css
```

Created an unwanted second top bar. It is now disabled with a kill-switch. Do not reactivate.

```txt
nexus-top-command-bar.js/css
```

Previously caused GitHub Pages failure when loaded. Do not load without separate branch testing.

```txt
nexus-timeline-panel.js
```

Currently acts as an add-on loader. This is a temporary prototype pattern, not the final architecture.

```txt
nexus-bottom-dock-bridge.js
```

Controls injected dock behavior and is fragile. Do not rewrite in live preview.

```txt
nexus-addon-dock-icons.js/css
```

Visual patch only. Should be replaced by one registry-driven icon system in the MVP.

## Migration target mapping

```txt
nexus-shell-v2.js/css                    -> src/core/shell/
nexus-bottom-dock-bridge.js              -> src/ui/dock/ + src/registry/dockRegistry.ts
nexus-project-time-instrument.js/css      -> src/core/timeline/ + src/modules/time/
nexus-project-switcher.js/css            -> src/modules/project/
nexus-people-panel.js/css                -> src/modules/people/
nexus-cloud-panel.js/css                 -> src/modules/cloud/ + src/connectors/google-drive/
nexus-software-panel.js/css              -> src/modules/soft/ + src/registry/connectorRegistry.ts
nexus-integrations-panel.js/css           -> src/modules/integrations/ + src/registry/connectorRegistry.ts
nexus-esafe-graph-runtime.js              -> src/worlds/esafe-catania/
esafe-embedded-adapter.js                 -> src/worlds/esafe-catania/ or connector adapter
nexus-trade-graph-runtime.js              -> src/modules/project/ or src/core/graph/
nexus-workmode-world.js                   -> HOLD; separate work mode track
```

## Phase 0 decision

Do not delete or rename the current prototype files yet.

Do not continue adding random add-ons to the live preview.

The next coding step must be registry-first inside `nosmo-nexus-mvp`.
