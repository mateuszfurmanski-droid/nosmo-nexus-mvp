# NOSMO Nexus — Work Wallet Zapier Bridge

Status: IMPLEMENTED IN REPOSITORY — SERVER DEPLOYMENT REQUIRED  
Date: 2026-07-31

## What is implemented

The repository now contains:

- an interactive Work Wallet event simulator inside the Safety Connector,
- an Integration Log,
- event-driven Person Card updates,
- event-driven DoorFlow gate re-evaluation,
- a secured TypeScript webhook gateway,
- payload validation,
- event ID idempotency,
- a bounded in-memory event log,
- a health endpoint.

The browser demonstrator uses synthetic data only.

## Gateway source

```text
scripts/src/work-wallet-gateway.ts
```

Run command:

```bash
pnpm --filter @workspace/scripts work-wallet-gateway
```

## Required server environment

```text
NEXUS_INTEGRATION_KEY=<long-random-secret>
PORT=8787
```

Do not put `NEXUS_INTEGRATION_KEY` in frontend code, GitHub, localStorage or a Zapier screenshot.

## Endpoints

Health check:

```text
GET /health
```

Receive an event:

```text
POST /api/integrations/work-wallet/events
```

Read the temporary gateway log:

```text
GET /api/integrations/work-wallet/events
```

Both event endpoints require:

```text
X-Nexus-Integration-Key: <server secret>
```

## Accepted event types

```text
AUDIT_COMPLETED
RISK_ASSESSMENT_COMPLETED
ASSET_INSPECTION_COMPLETED
INDUCTION_COMPLETED
PERMIT_RENEWED
SOURCE_RESTORED
```

The last three are currently demonstrator-normalised event types. Production names and mappings must be confirmed against Work Wallet's official event/API contract.

## Example request

```bash
curl -X POST "https://YOUR-GATEWAY/api/integrations/work-wallet/events" \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Integration-Key: YOUR_SECRET" \
  -d '{
    "id": "ww-event-1001",
    "eventType": "AUDIT_COMPLETED",
    "projectId": "HALIFAX-DEMO",
    "sourceRecord": "WW-AUD-1001",
    "title": "Fire-door work package audit completed",
    "detail": "Audit completed with one follow-up action."
  }'
```

Expected first response:

```json
{
  "status": "accepted",
  "event": {}
}
```

Sending the same `id` again returns:

```json
{
  "status": "duplicate",
  "eventId": "ww-event-1001"
}
```

## Zapier configuration

Initial proof-of-concept:

1. Select a supported Work Wallet trigger in Zapier.
2. Add `Webhooks by Zapier` as the action.
3. Select POST.
4. Set the gateway URL.
5. Add the `X-Nexus-Integration-Key` header.
6. Map Work Wallet fields into the normalized payload.
7. Test with a synthetic project first.
8. Confirm the event appears in the gateway log.
9. Confirm Nexus creates the expected Project Action or status refresh.

## Current persistence limitation

The standalone gateway stores up to 200 normalized events in memory. Restarting the process clears this temporary log.

Before production use, replace the in-memory store with a tenant-isolated database and add:

- durable event storage,
- dead-letter handling,
- retry state,
- payload hashing,
- tenant mapping,
- project/person ID mapping,
- structured audit access,
- secret rotation,
- monitoring and alerting.

## Deployment checkpoint

The connector must not be described as live until all of the following are true:

- the gateway process is deployed,
- HTTPS is active,
- `NEXUS_INTEGRATION_KEY` is configured server-side,
- `/health` responds successfully,
- an authenticated test POST is accepted,
- a duplicate event is handled idempotently,
- no secret appears in browser code,
- Work Wallet/Zapier field mappings are confirmed,
- customer data protection requirements are approved.
