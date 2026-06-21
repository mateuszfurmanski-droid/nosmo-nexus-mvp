---
name: nosmo-nexus frontend demo mode
description: The nosmo-nexus frontend is a deliberate standalone frontend-only investor demo, decoupled from the api-server/auth despite docs/backend still existing.
---

# NOSMO Nexus frontend is intentionally frontend-only

The `artifacts/nosmo-nexus` frontend was deliberately converted into a standalone, frontend-only "Workspace" investor demo. Its active route tree (App.tsx) renders directly with NO auth gate and is driven entirely by local cross-linked sample data in `src/demo/data.ts`. It does NOT use `@workspace/api-client-react`, `@workspace/replit-auth-web`, `@tanstack/react-query`, or any `fetch` to the API.

**Why:** The user explicitly required a frontend-only demo (no backend, no integrations, no auth friction) with realistic sample data for an investor pitch. This intentionally diverges from `replit.md` / `threat_model.md`, which still describe the older backend product (Replit Auth, Postgres, AI assistant, kanban with real DB), and from the still-present-and-running `api-server` artifact.

**How to apply:** Do NOT "fix" the frontend by re-wiring auth or generated API hooks unless the user asks to reconnect it to the backend. Several old backend-coupled files remain on disk but are dead (not imported by the route tree): `pages/{landing,login,ai-assistant,plans,integrations}.tsx` and `components/notes-tab.tsx`. Leaving them unrouted is fine; the constraint is only that the active route tree stays backend-free. The top-bar Global Search and Ask Nexus are demo features powered by local data (canned AI answer).

## Focus-mode interaction model (Workspace Interaction Model)

Every reference to a domain object (project/person/document/task/note) anywhere in the UI must open deeper context IN PLACE via `src/focus/` (FocusProvider drill-down stack + one shared FocusOverlay), using the `<FocusableEntity target={{type,id}}>` wrapper — NOT a wouter `<Link>`/navigation. Route deep-links (`/people/:id`, `/projects/:id`) still exist as thin wrappers, but in-app object clicks should drill, not navigate.

**Why:** A wouter `<Link>` mid-card silently breaks the "everything opens in place" promise and is easy to miss page-by-page (the Timeline page was overlooked twice and failed review). FocusableEntity nests safely (inner ones stopPropagation on click + Enter/Space); openFocus truncates the stack to an existing ancestor to avoid A→B→A loop growth.

**How to apply:** When adding/editing any page that lists or labels objects, wire object labels/cards to `FocusableEntity`, never `Link`. After such changes, grep the active pages for `from "wouter"` / `<Link` to catch stragglers. Nested role=button is tolerated for this demo but is flagged a11y debt.
