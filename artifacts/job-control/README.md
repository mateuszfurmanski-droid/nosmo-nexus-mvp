# Joanna Job Control

Private mobile-first PWA for Joanna Bach's existing Bradford job-search workflow.

## What this artifact does

- reads dashboard and job pipeline from the existing Google Sheet;
- reads the seven category CV files from Google Drive;
- chooses the matching CV profile for imported jobs;
- shows job-only Gmail replies when the OAuth credential has Gmail read scope;
- opens formal application forms when no direct email is available;
- can send a reviewed application from `hello@nosmo.tech` only when live send is explicitly released;
- marks `APPLIED` only after a confirmed provider send or an explicit manual confirmation;
- records write/send activity in a dedicated `JOB_CONTROL_ACTIVITY` sheet;
- hands a safe structured prompt to Free ChatGPT without requiring paid ChatGPT features.

## Privacy boundary

The browser never receives Google OAuth client secrets or refresh tokens.

Live Google requests are server-side only. The PWA service worker never caches `/api/*` responses. In live mode the job pipeline is not persisted to localStorage.

The app exposes only Joanna's job-control workflow, not a general Drive browser or general Gmail inbox.

## Required server configuration

Create a strong private access phrase and store only its SHA-256 hash:

`JOB_CONTROL_ACCESS_CODE_HASH=<64-character sha256 hex>`

Set a separate random signing secret:

`JOB_CONTROL_SESSION_SECRET=<long random secret>`

Google OAuth uses the existing Nexus refresh-token secret shape:

`JOB_CONTROL_GOOGLE_SECRET_REFERENCE=NEXUS_SECRET_JOB_CONTROL_GOOGLE`

The referenced environment variable must contain JSON with type `google-oauth-refresh-token/v1` and non-empty `clientId`, `clientSecret`, and `refreshToken` fields.

The adapter can also reuse the `secretReference` from `NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON` when no Job Control override is set.

Required Google scopes for the full pilot:

- Google Sheets read/write: `https://www.googleapis.com/auth/spreadsheets`
- Drive CV read: `https://www.googleapis.com/auth/drive.readonly`
- Gmail application send: `https://www.googleapis.com/auth/gmail.send`
- job-only reply list: `https://www.googleapis.com/auth/gmail.readonly`

The Google account used for Gmail must already have `hello@nosmo.tech` configured as a verified Send As alias.

## Fail-closed release switches

Reads can operate once OAuth is configured.

Writes are separately disabled until explicitly released:

- `JOB_CONTROL_SHEETS_WRITE_ENABLED=false`
- `JOB_CONTROL_GMAIL_SEND_ENABLED=false`

Do not set either flag to `true` until read-only integration checks pass.

## Existing source of truth

The pilot defaults server-side to the current Joanna job database and seven current CV file mappings. None of those IDs are rendered in the normal UI.

The live pipeline reads `DASHBOARD` and `BAZA AKTYWNA`.

The first successful write creates `JOB_CONTROL_ACTIVITY` if it does not already exist.

## Safe send sequence

1. Joanna opens one job.
2. The app chooses one of CV 01–07.
3. Joanna reviews recipient, message and CV.
4. Joanna explicitly confirms send.
5. The backend records a `PENDING` activity entry.
6. Gmail API sends the message.
7. Only after Gmail returns a message ID does the backend attempt to mark the Sheet `APPLIED`.
8. The final provider message ID and sync result are recorded in activity history.
9. If provider outcome is uncertain, automatic retry is blocked and Joanna must inspect Sent first.

## Local/demo mode

If server auth or Google OAuth is not configured, the app stays in clearly-labelled Demo mode. Demo mode never claims a live send or live sync.

## Deployment

Deploy `artifacts/job-control` as the project root. The frontend is Vite and serverless functions live under `api/`.

Current GitHub validation is the authoritative build check while the connected Vercel Hobby project is rate-limited.
