# Work Mode V2 — App Discovery, Launcher and Privacy

Status: DORMANT IMPLEMENTATION PACKAGE
Parent application: NOSMO Person Card Freeware
Canonical product PR: #184
Privacy authority: ADDON_029

This directory extends the existing Freeware application. It is not a separate launcher application and it does not create another Person Card.

## Activation rule

Nothing in this directory is loaded by V1 `index.html` yet.

V2 discovery remains disabled until:

- native/platform local discovery adapter exists;
- acceptance tests remain green;
- Privacy & Connections is approved;
- all enabled UI locales contain trust copy.

## Construction App Registry

`construction-app-registry.json` is product metadata listing only supported applications.

Only entries with:

- `discoveryEnabled: true`;
- `identifierStatus: verified-controlled`;
- explicit platform identifiers

may be probed.

Construction-specific apps whose package identifiers are not yet verified remain present as planned definitions with discovery disabled. This is intentional and prevents guessing identifiers.

## Local discovery

`local-discovery.mjs` takes a platform-specific `probeInstalled` callback.

It never enumerates the device itself and contains no network transport.

Android V2 should implement the callback using targeted package visibility/query mechanisms for the controlled registry. Do not request unrestricted package inventory solely for this feature.

## User-facing levels

- OPEN — launch only.
- DEEP_LINK — navigate to a supported destination.
- CONNECTED — exchange explicitly authorised data.

These levels are user-facing capability truth and are separate from finer connector implementation levels in ADDON_047.

## Privacy

DetectedAppLocalState is device-local only.

The installed-app inventory must never be sent to:

- Nexus servers;
- analytics;
- logs;
- crash reports;
- support exports;
- employer or agency views.

Detection creates no tile, connection, consent grant or share without explicit user action.
