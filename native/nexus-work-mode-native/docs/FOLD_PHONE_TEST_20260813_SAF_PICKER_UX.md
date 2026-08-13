# Fold phone test — SAF picker UX

Date: 2026-08-13
Branch: `agent/android-native-diagnostic`
PR: #41

## Test evidence

Samsung Fold smoke test confirmed:

- native Nexus Work Mode shell launches;
- Nexus Cloud / Google Drive map opens;
- `00_NEXUS_PERSONAL_CLOUD` exists in Google Drive;
- canonical root contains expected Nexus folders including:
  - `00_INBOX_FROM_ANDROID_WORK_MODE`
  - `10_PROJECT_WORLDS`
  - `90_ANDROID_PHONE_TESTS`
  - `90_AUDIT_PROVENANCE`
  - `90_GITHUB_BACKUPS`
- Project Worlds folder separates:
  - `NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA`
  - `RIVERSIDE_DEMO_PROJECT`

## UX issue observed

During manual testing, the user repeatedly landed in the normal Google Drive app UI instead of the Android Storage Access Framework folder picker with `USE THIS FOLDER`.

Observed confusion points:

- `OPEN NEXUS CLOUD / GOOGLE DRIVE` opens the normal Drive app and is useful for viewing folders, but it does not grant SAF write permission.
- `+ CONNECT GOOGLE DRIVE PERSONAL CLOUD` should be the permission-granting path.
- The UI must make this distinction explicit because Drive app browsing and SAF folder permission look similar to users.

## Required UX correction

The next APK should make the permission path unambiguous:

1. Rename `OPEN NEXUS CLOUD / GOOGLE DRIVE` to something like `VIEW DRIVE FOLDER MAP ONLY`.
2. Rename `+ CONNECT GOOGLE DRIVE PERSONAL CLOUD` to `SELECT CLOUD ROOT WITH USE THIS FOLDER`.
3. Before launching `ACTION_OPEN_DOCUMENT_TREE`, show a short instruction:
   `In the Android folder picker choose Google Drive > My Drive > NOSMO > 03_NEXUS > 00_NEXUS_PERSONAL_CLOUD, then tap USE THIS FOLDER.`
4. After a folder is selected, show the selected URI/state clearly before scan.
5. If `personalCloudTree` is empty and the user taps scan/accept, show a hard prompt to connect the Personal Cloud root first.

## Build blocker

Current PR head has not produced a new APK because GitHub Actions is blocked before runner startup by account billing/spending-limit. The currently installed APK is therefore older than the latest branch state.

Do not mark this UX issue complete until a new APK is built and tested on Fold.