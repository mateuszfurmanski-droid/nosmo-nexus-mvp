# NOSMO Nexus Work Mode — native Android MVP

This package is the native Android-first evolution of the existing web `/first-run` demonstrator.

## Current MVP

- explicit Android permission flow for Contacts and Calendar;
- work-signal classification from authorised contact and calendar metadata;
- system document picker for user-selected PDF/DOCX/XLSX/text/image inputs;
- system photo picker for user-selected work evidence;
- Discovery Review with confidence score and selected-by-default acceptance;
- local-first persistence of discovery metadata and an activity/audit log;
- Work Mode toggle and active-project context;
- project-aware launch surface for Relationship Tree, Person Cards, Tasks, Documents, DoorFlow, Electrical, BIM/FabStation and Ask Nexus;
- no Nexus cloud sync in this branch.

## Security and privacy boundary

The app does not bypass Android sandboxing. It does not read private WhatsApp, Gmail, Work Wallet, Procore, Autodesk, Hilti or other app databases. Those systems require supported deep links and/or explicit API/OAuth connectors.

Contacts and Calendar are read only after the user grants Android permission. Documents and photos are available only after the user selects them through the operating-system picker. Removing local Nexus data does not delete the original source data.

## Deliberately not claimed yet

- background crawling of the whole Android filesystem;
- private messenger history scraping;
- notification-listener ingestion;
- OCR/PDF semantic extraction;
- Android Work Profile / device-policy management;
- `SYSTEM_ALERT_WINDOW` floating overlay permission;
- production Nexus backend sync;
- live third-party connectors.

## Build direction

The package intentionally lives under `native/` rather than the root `artifacts/*` pnpm workspace so the existing Nexus web lockfile and CI remain unchanged while the Android client is developed independently.

`eas.json` includes an internal APK profile and a production Android App Bundle profile. Expo/EAS project ownership and signing credentials must be configured before a distributable signed build is produced.

## Next engineering slice

1. Add signed Android development/APK build and automated native typecheck.
2. Persist explicit source enable/disable state and tighten Android manifest permissions to read-only requirements.
3. Add on-device document text/OCR classification without uploading content by default.
4. Add Nexus backend authentication and Project Graph sync with source/audit provenance.
5. Add approved connectors for Microsoft 365/OneDrive/SharePoint, Gmail, Work Wallet, Procore, Autodesk and Hilti.
6. Add share-intent handoff so files/photos/links can be sent into the active Nexus project from Android's Share menu.
7. Add optional notification ingestion only through a clearly disclosed native notification-listener permission and per-app allowlist.
