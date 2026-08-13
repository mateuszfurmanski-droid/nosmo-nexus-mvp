# web-ifc Runtime Delivery

Status: DRAFT / PRODUCTION DELIVERY GATE

This document belongs to the NOSMO Nexus BIM / FabStation Operational Layer.

## Current pinned engine

- package: `web-ifc`
- pinned released version: `0.0.77`
- Nexus Lite STEP renderer remains the bundled fallback.

The Full WASM engine is an operational BIM selection / source-data / comparison backend. It does not make Nexus a BIM authoring, clash, survey or tolerance system.

## Delivery modes

### Development

`pinned-network-development`

Development may retain the existing explicit opt-in jsDelivr delivery for `web-ifc@0.0.77` while the packaging slice is being completed. The IFC model itself remains browser-local.

### Production

`local-self-hosted`

Production is fail-closed to same-origin assets under:

`/vendor/web-ifc/0.0.77/`

Required files for the current single-thread path:

- `web-ifc-api-iife.js`
- `web-ifc.wasm`

A production build must not fall back to jsDelivr or another third-party runtime host if those assets are missing. Full WASM may fail unavailable; the bundled Lite STEP renderer must remain usable.

## Slice A — this branch

This branch establishes only the delivery boundary:

- production selects same-origin versioned assets;
- development keeps the existing pinned-network opt-in;
- the current IFC file remains local to the browser;
- a source validator rejects an unconditional remote production runtime/WASM URL;
- no BIM identity, geometry, Pset, revision, Change Event, WorkSuite or Project Graph semantics change.

## Slice B — still required

Production delivery is NOT COMPLETE until a real package-manager run performs all of the following:

1. add exact `web-ifc@0.0.77` to the Nexus workspace package;
2. generate the workspace `pnpm-lock.yaml` through pnpm — never by hand;
3. copy or bundle the package JS/WASM into the versioned same-origin build assets;
4. verify the built artifact contains the required JS/WASM files;
5. execute Full WASM in a real browser from those local assets;
6. confirm Lite fallback when Full WASM is unavailable;
7. retain the `0.0.77` package license/notices required for redistributed runtime assets.

## Validation boundary

Even after Slice B automated PASS, the following remain manual / runtime gates:

- representative real IFC;
- two real IFC revisions;
- trusted viewer geometry comparison;
- trusted viewer Pset/type/material comparison;
- Android / Samsung Fold Full WASM interaction;
- authorised project/survey coordinate comparison;
- real FabStation or other spatial-partner hand-off.

CI PASS or successful asset packaging must not be reported as any of those manual PASS states.
