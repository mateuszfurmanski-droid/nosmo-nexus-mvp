# Threat Model

## Project Overview

NOSMO Nexus is a multi-page construction-site intelligence web app with a React frontend, an Express API, PostgreSQL storage via Drizzle ORM, and Replit Auth-based OIDC login. Production traffic is expected to reach the app through the web frontend and `/api` backend; the client is untrusted and all data access must be enforced server-side.

## Assets

- **User accounts and sessions** — OIDC identities, session IDs, and refresh/access tokens stored in the server-side session table. Compromise enables full account takeover.
- **Workspace business data** — projects, tasks, plans, notes, comments, activity, and conversations. This is tenant data and must not leak across workspaces.
- **Uploaded plan files** — PDF content is stored as base64 in Postgres and can contain sensitive construction documents.
- **AI conversation data** — prompts, prior chat history, and workspace-derived context may contain sensitive project details.
- **Application secrets** — database credentials, session signing material, OIDC client configuration, and any `OPENAI_API_KEY`.

## Trust Boundaries

- **Browser/mobile client to API** — all request parameters, headers, bodies, and route selection are attacker-controlled until validated.
- **API to PostgreSQL** — the API has broad data access; missing filters or unsafe queries can expose or corrupt tenant data.
- **Authenticated user to workspace data** — every business route after login must enforce the current workspace boundary server-side.
- **API to external identity provider** — login and token exchange rely on OIDC redirects, callbacks, and token handling.
- **API to external AI provider** — when `OPENAI_API_KEY` is present, workspace context and chat content leave the system boundary.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox/` is development-only and should be ignored unless evidence shows production reachability.

## Scan Anchors

- Production backend entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/`.
- Highest-risk backend areas: `src/routes/auth.ts`, `src/middlewares/authMiddleware.ts`, `src/middlewares/requireWorkspace.ts`, `src/routes/plans.ts`, `src/routes/conversations.ts`, `src/lib/auth.ts`, `src/lib/ai/`.
- Data isolation depends on `req.workspaceId` and route-level `workspaceId` filters; nested-resource checks are especially important.
- Public surfaces: `/api/health`, `/api/login`, `/api/callback`, `/api/auth/user`, `/api/logout`, `/api/mobile-auth/*`, landing/login frontend routes.
- Authenticated surfaces: all other `/api` routes and all app pages behind `AppLayout`.
- Dev-only surface: `artifacts/mockup-sandbox/` unless production reachability is demonstrated.

## Threat Categories

### Spoofing

The application relies on Replit OIDC and opaque session identifiers. Protected API routes must accept only valid sessions created by the server, and login/callback/mobile token exchange flows must not allow attacker-controlled redirect, token substitution, or session confusion. Public auth routes that change session state should not be triggerable cross-site through simple browser navigation.

### Tampering

Authenticated users can create and update projects, tasks, notes, plans, comments, and conversations. The server must validate request bodies and ensure referenced parent records belong to the caller's workspace before creating or mutating child records.

### Information Disclosure

The primary confidentiality risk is cross-workspace leakage of business data, uploaded PDFs, notes, comments, or AI conversation history. Responses, searches, file downloads, logs, and AI context construction must be scoped to the authenticated workspace and must not expose secrets or excessive document contents.

### Denial of Service

The API accepts JSON bodies up to 30 MB and supports file ingestion, search, and AI streaming. Public or authenticated endpoints must not allow trivial resource exhaustion through unbounded request volume, oversized payload abuse, or expensive repeated operations.

### Elevation of Privilege

There is no separate admin role, so the key privilege boundary is tenant isolation. The system must prevent an authenticated user from reading, mutating, or linking records outside their own workspace through direct object references, nested resource paths, or session/token misuse.
