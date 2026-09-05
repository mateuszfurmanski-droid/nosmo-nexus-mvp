# NOSMO Work V1.0101 — Recovery Baseline

Status: LOCKED REFERENCE
Date recovered: 2026-09-05

## Purpose

This document freezes the verified NOSMO Work / Worker App state that was visible in the ChatGPT Site deployment on 2026-09-04. It exists to prevent further confusion with older Person Card Freeware previews, NOSMO Agency, Nexus Core, or earlier Worker Home / Work Mode experiments.

This is an EXISTING APPLICATION recovery/finalisation track. Do not rebuild it as a new product.

## Product identity

- Product name: NOSMO Work
- Version baseline: V1.0101
- Product type: standalone worker-side mobile-first application
- Deployment at time of capture: ChatGPT Site
- Version line must continue as V1.0102, V1.0103, etc. Do not rename to V2 during finalisation.

## Explicit exclusions

Do NOT use these as the V1.0101 baseline:

- Person Card Freeware preview
- NOSMO Agency / Shared Worker Records
- Nexus Core / Project World
- older native NEXUS Worker Home 0.7.x builds
- old Work Mode launchers with four bottom-nav items

## Verified V1.0101 shell

The V1.0101 mobile shell has:

1. Persistent Ask Nexus search/header at the top.
2. Bottom navigation with exactly five primary destinations:
   - Worker Card
   - Documents
   - Jobs
   - Apps
   - Settings
3. Mobile-first layout sized for phone/Fold usage.
4. NOSMO visual language with compact cards, dark/light capable surfaces and restrained accent colours.

## Verified Worker Card state

Reference capture: `1000073061.jpg` (2026-09-04 15:02 UTC)

Verified elements:

- Worker profile header.
- Live Work Status block.
- Availability is controlled by one compact selector.
- Visible state includes `Available`.
- Menu supports `Available`, `Busy`, and date-based availability.
- Edit and Share actions are present.
- Bottom navigation remains Worker Card / Documents / Jobs / Apps / Settings.

Finalisation rule:

- Canonical availability labels must be exactly `Available`, `Busy`, `Ready on date`.
- Only one active LED/state is visible at a time.
- Ready on date requires a date.

## Verified Documents state

Reference capture: `1000072991.jpg` (2026-09-04 09:40 UTC)

Verified elements:

- Ask Nexus remains visible at top.
- Document categories include identity/right-to-work and other worker document groups.
- Work documents show explicit status badges including:
  - VALID
  - EXPIRING
  - NO EXPIRY
  - PRIVATE
- CV files are shown separately with READY state.
- Several role-specific CVs are supported.
- Bottom navigation remains the same five destinations.

Privacy rule:

- Private documents must never be attached or shared automatically.
- Sharing or sending private worker data requires explicit worker action.

## Verified Jobs state

Reference capture: `1000073057.jpg` (2026-09-04 15:02 UTC)

Verified elements:

- Jobs screen has Jobs / Employers / Add job controls.
- NOSMO WORK AGENT is present.
- Find Work search accepts role, trade, company or keyword.
- Search preferences are visible and persistable.
- Saved Jobs section is present.
- Needs attention, Applications and Replies-to-check counters are present.
- Search and application state must not be lost on navigation.

Historical job-search captures also confirm:

- Work / Tools & materials mode selector.
- batched live vacancy search.
- `Search next 20` behaviour.
- direct vacancy links when available.

Application safety rule:

- Opening WhatsApp, email or an external job source must not mark an application as sent.
- `APPLIED` requires explicit user confirmation.

## Verified Apps state

Reference capture: `1000073055.jpg` (2026-09-04 15:02 UTC)

Verified elements:

- Header: `NOSMO WORK | Powered by NEXUS`.
- Page: Apps.
- Product copy: `Work tools first. Connected services stay folded until you need them.`
- WORK TOOLS includes:
  - Drawings
  - Nexus Upload
  - Work Camera
  - Private Vault
- CONNECTED APPS is collapsed/secondary and shows a count.
- `Manage apps & imports` entry exists.
- Private-launcher copy states that the user chooses what NOSMO imports.

Finalisation rule:

- Work tools stay visually primary.
- Connected services stay secondary/folded until needed.
- Do not claim NOSMO scans installed apps automatically.

## Verified Settings state

Reference captures: `1000072965.jpg`, `1000072967.jpg`, `1000072969.jpg`, `1000072971.jpg`, `1000072973.jpg` (2026-09-04)

Verified appearance options:

- Midnight Black
- Nexus Blue
- Eco Green
- Silent Gold
- Windows Grey
- Architect White

Verified settings also include:

- Reply alerts
- Show WhatsApp contacts
- product copy: `Keep NOSMO Work simple, local and private.`

Finalisation rule:

- All themes must remain readable with no orphan dark/light components.
- No purple visual system is permitted.

## Known finalisation requirements after V1.0101 baseline

These are allowed as V1.0102+ changes because they were already identified as unfinished, not redesign requests:

- reliable install flow (real PWA and/or Android package, never a fake install button)
- thicker/substantial top and bottom system bars where required
- no horizontal overflow, including availability controls
- full dark-mode audit
- responsive Fold closed/open, Android phone, iPhone-size and tablet layouts
- persistent language selection with current-language flag in header
- multilingual UK workforce layer
- Ask Nexus entry via the N/brain logo and predictable search entry
- persistent job-search and application state
- close/reopen state retention
- recruiter-safe sharing
- final install/home-screen/standalone acceptance on Android

## Language target

Minimum target already agreed for UK workforce coverage:

- English
- Polish
- Romanian
- Urdu
- Punjabi
- Bengali
- Gujarati
- Arabic
- Portuguese
- Spanish
- French
- Lithuanian
- Bulgarian
- Ukrainian
- Chinese
- Turkish
- Italian

## Source-of-truth rule from this point

1. V1.0101 visual/behavioural baseline is defined by the verified 2026-09-04 captures above.
2. ChatGPT Sites may be used as preview/deployment, but it must not be the only retained copy of the application.
3. GitHub must hold the canonical recovered source before V1.0102 finalisation is considered complete.
4. Do not replace V1.0101 with older Person Card Freeware code just because that code is easier to locate.
5. Any recovered source must be compared against this baseline before being accepted as canonical.

## Acceptance sequence for final pilot build

Onboarding -> Worker Card -> qualifications/documents -> availability -> work profile -> job search -> job detail -> CV/profile selection -> save/apply -> explicit application status -> agency/employer communication -> recruiter-safe sharing -> Work Mode/tools -> language -> light/dark -> close/reopen state -> Android install -> home-screen launch -> standalone relaunch.
