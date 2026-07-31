# NOSMO Person Card Communication Hub Demo

Status: **DEMO / READY FOR TECHNICAL REVIEW**  
Source contract: `ADDON_052_Person_Card_Communication_Hub_and_Contextual_Contact_Routing.md`  
Issue: `nosmo-nexus-mvp#4`

## Purpose

This package is a standalone, dependency-free demonstrator of the Person Card Communication Hub. It can be opened directly in a browser and reviewed independently from the current DoorFlow work.

It demonstrates:

- authorised Person Card communication endpoints,
- normal and urgent contact preferences,
- availability state,
- work/private endpoint visibility,
- phone, SMS, WhatsApp, email and Microsoft Teams launch actions,
- contextual contact generated from a Nexus Object Card,
- editable Context Packet preview,
- local `ACTION_OPENED` timeline events,
- honest separation between opening a channel and verified sending.

## Run locally

No installation or build process is required.

1. Download this directory.
2. Open `index.html` in a modern browser.
3. On mobile, channel buttons will attempt to open the corresponding installed application.
4. On desktop, behaviour depends on the operating system and configured default applications.

For a simple local web server:

```bash
python3 -m http.server 8080 --directory modules/person-card-communication-hub-demo
```

Then open `http://localhost:8080`.

## Data and privacy

All visible profile and project data is synthetic. The demo does not connect to a real mailbox, WhatsApp account, Teams tenant, phone service or Nexus database.

The private mobile toggle demonstrates permission-controlled visibility only. Production implementation must obtain endpoint visibility from the Person Card permission model and must never expose a private endpoint merely because it exists in the database.

## Integrity rule

The demo writes only:

```text
ACTION_OPENED
```

It does not write `SENT`, `DELIVERED`, `READ` or `REPLIED`, because a deep link does not provide verified evidence of those states.

Timeline events are stored only in browser `localStorage` under:

```text
nosmo.communicationHub.demo.events.v1
```

## Current launch actions

| Channel | Demo action | Production note |
|---|---|---|
| Phone | `tel:` deep link | Device action only. |
| SMS | `sms:` deep link with editable body | URI behaviour varies by platform. |
| WhatsApp | `wa.me` compose link | No delivery or reply tracking. |
| Email | `mailto:` composer | This is not Gmail or Outlook account access. |
| Microsoft Teams | Teams chat compose URL | Requires a valid tenant/user and browser support. |
| Slack | Disabled without an authorised endpoint | Add only through a defined connector or workspace link. |

## Proposed Nexus integration boundary

The standalone UI should later be split into reusable components and services.

Suggested component boundary:

```text
PersonCardCommunicationSummary
CommunicationChannelGrid
ContextPacketEditor
CommunicationTimeline
```

Suggested service boundary:

```text
CommunicationEndpointResolver
ContextPacketBuilder
ExternalChannelLauncher
CommunicationEventWriter
```

## Input contract

A production component should receive a Person Card object similar to:

```json
{
  "personId": "PERSON-001",
  "displayName": "Alex Morgan",
  "availability": {
    "state": "AVAILABLE_ON_SITE",
    "nextReviewAt": "2026-07-31T17:30:00Z"
  },
  "preferences": {
    "normalChannel": "WHATSAPP",
    "urgentChannel": "PHONE",
    "documentChannel": "EMAIL"
  },
  "endpoints": [
    {
      "type": "PHONE",
      "value": "+447700900321",
      "classification": "WORK",
      "visibility": "PROJECT_TEAM",
      "verification": "VERIFIED"
    }
  ]
}
```

A contextual contact action should receive a source object reference similar to:

```json
{
  "projectId": "PRJ-HFX-001",
  "objectType": "DOOR_CARD",
  "objectId": "ID.0.5.27",
  "title": "Door closer confirmation required",
  "location": "Level 0 / Corridor 5",
  "priority": "HIGH",
  "requestedAction": "Confirm closer availability and installation time",
  "secureLink": "https://nexus.example/o/door/ID.0.5.27"
}
```

## Event contract

Minimum event written after launching an external action:

```json
{
  "eventType": "ACTION_OPENED",
  "personId": "PERSON-001",
  "channel": "WHATSAPP",
  "sourceObject": {
    "projectId": "PRJ-HFX-001",
    "objectType": "DOOR_CARD",
    "objectId": "ID.0.5.27"
  },
  "occurredAt": "ISO-8601 timestamp",
  "provenance": "CLIENT_DEEP_LINK"
}
```

## Production work still required

- Replace synthetic data with the Nexus Person Card model.
- Enforce server-derived endpoint permissions.
- Move event persistence from `localStorage` to the Nexus timeline service.
- Add route-state preservation when returning from an external app.
- Validate platform-specific deep links on Android, iOS and desktop.
- Add automated accessibility and component tests.
- Add OAuth connectors only after security review and provider configuration.
- Keep credentials and OAuth secrets server-side.

## Non-goals of this demo

This package does not:

- read WhatsApp conversations,
- read or send Gmail/Outlook messages through an API,
- track message delivery,
- claim Slack or Teams workspace access,
- replace the current DoorFlow priority,
- define a final production visual design.

## Review request for Joanna

Please review this package as an isolated module and decide:

1. whether the data boundary fits the current Person Card architecture,
2. which components should be adapted into the Nexus Core shell,
3. whether the first integration should remain launch-only,
4. where `ACTION_OPENED` events should be stored,
5. when the module can be placed in the Nexus start menu without disrupting DoorFlow.
