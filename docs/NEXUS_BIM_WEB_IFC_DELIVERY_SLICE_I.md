# BIM / IFC Slice I — web-ifc production delivery gate

Status: IMPLEMENTED CONTRACT / PACKAGE-MANAGER SLICE PENDING / NOT RUNTIME VALIDATED

## Base

This slice is stacked on PR #111 (`codex/bim-spatial-handoff-slice-h`) at head `c9dfa2203ee6e9d3df98d5fb381a031c95051665`.

Historical PR #87 is donor material only. No old BIM UI/runtime stack is bulk-merged.

## Canonical production rule

Full WASM may only run in production from versioned same-origin assets:

`/vendor/web-ifc/0.0.77/`

Required assets:

- `web-ifc-api-iife.js`
- `web-ifc.wasm`
- `LICENSE.md`
- generated `nexus-web-ifc-runtime.json`

Production fallback to a CDN or other remote runtime is forbidden.

Development may use the exact pinned jsDelivr `web-ifc@0.0.77` path only when the development delivery mode is explicitly selected. That path is not a production capability.

If local Full WASM assets are unavailable in production, Nexus must fail closed to the existing Lite/STEP path rather than silently switching to a remote runtime.

## Implemented

- `src/bim/webIfcRuntimeDelivery.ts`
  - exact `web-ifc@0.0.77` runtime contract;
  - local same-origin production plan;
  - optional pinned-network development plan;
  - production plan assertion;
  - no remote production fallback.
- `scripts/sync-web-ifc-runtime-assets.mjs`
  - reads only the installed `@workspace/nosmo-nexus` package dependency;
  - rejects version mismatch;
  - requires JS/WASM/license;
  - copies versioned same-origin assets;
  - writes bounded runtime manifest.
- `scripts/validate-web-ifc-runtime-delivery.mjs`
  - runs without installing dependencies;
  - checks policy/source drift before `pnpm install`;
  - rejects non-exact declared `web-ifc` version;
  - validates an existing local runtime directory when present;
  - reports the package-manager slice as pending when package/assets are absent.
- `tsconfig.bim-ifc.json`
  - makes this delivery contract part of workspace TypeScript validation.
- `.github/workflows/typecheck.yml`
  - adds the source-policy gate immediately after checkout and before dependency installation.

## Deliberately not done

No `web-ifc` dependency was manually added to `artifacts/nosmo-nexus/package.json`.

No `pnpm-lock.yaml` entry was hand-edited.

No JS/WASM/license asset was copied by hand.

Those steps require a real pnpm execution:

1. `pnpm --filter @workspace/nosmo-nexus add --save-exact web-ifc@0.0.77`
2. package-manager-generated `pnpm-lock.yaml`
3. `node scripts/sync-web-ifc-runtime-assets.mjs`
4. build artifact check for all versioned local assets
5. real-browser Full WASM smoke from same-origin assets
6. Lite fallback smoke with Full WASM intentionally unavailable

## Validation truth

Isolated TypeScript compile/source smoke for the new policy: PASS.

Draft PR Actions may still be skipped by repository policy and a skip is not CI PASS.

This slice does not establish:

- `REAL IFC PASS`;
- `TRUSTED VIEWER PASS`;
- `ANDROID/FOLD PASS`;
- `PARTNER HANDOFF PASS`;
- geometry/Pset/tolerance correctness;
- representative IFC validation.

## Protected boundaries

Unchanged:

- PR #91 Spark SKANSKA Demo Core;
- accepted Spark Object Card design;
- Relationship Tree gesture/layout engine;
- Work Wallet;
- Google Drive / Nexus Cloud;
- Android Work Mode;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI;
- FabStation capability claims.

Do not merge automatically.
