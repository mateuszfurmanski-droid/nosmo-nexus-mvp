---
name: nosmo-nexus frontend demo mode
description: The nosmo-nexus frontend is a deliberate standalone frontend-only investor demo, decoupled from the api-server/auth despite docs/backend still existing.
---

# NOSMO Nexus frontend is intentionally frontend-only

The `artifacts/nosmo-nexus` frontend was deliberately converted into a standalone, frontend-only "Workspace" investor demo. Its active route tree (App.tsx) renders directly with NO auth gate and is driven entirely by local cross-linked sample data in `src/demo/data.ts`. It does NOT use `@workspace/api-client-react`, `@workspace/replit-auth-web`, `@tanstack/react-query`, or any `fetch` to the API.

**Why:** The user explicitly required a frontend-only demo (no backend, no integrations, no auth friction) with realistic sample data for an investor pitch. This intentionally diverges from `replit.md` / `threat_model.md`, which still describe the older backend product (Replit Auth, Postgres, AI assistant, kanban with real DB), and from the still-present-and-running `api-server` artifact.

**How to apply:** Do NOT "fix" the frontend by re-wiring auth or generated API hooks unless the user asks to reconnect it to the backend. Several old backend-coupled files remain on disk but are dead (not imported by the route tree): `pages/{landing,login,ai-assistant,plans,integrations}.tsx` and `components/notes-tab.tsx`. Leaving them unrouted is fine; the constraint is only that the active route tree stays backend-free. The top-bar Global Search and Ask Nexus are demo features powered by local data (canned AI answer).
