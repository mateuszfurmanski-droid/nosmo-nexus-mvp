# NOSMO Nexus™

A construction-site intelligence platform. Dark professional web app with 9 pages, real DB, Replit Auth, AI assistant, and kanban tasks. Investor-demo V0.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nosmo-nexus run dev` — run the frontend (port 24329)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, pino logging
- DB: PostgreSQL + Drizzle ORM (tables: users, projects, tasks, plans, comments, activity)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Frontend: React 19 + Vite, Wouter routing, shadcn/ui, TanStack Query
- Auth: Replit Auth (OIDC) via `@workspace/replit-auth-web`
- Build: esbuild (CJS bundle, API)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (from codegen)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle schema files (projects, tasks, plans, comments, auth, activity)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/nosmo-nexus/src/pages/` — All 9 frontend pages
- `artifacts/nosmo-nexus/src/index.css` — Dark theme (graphite/cyan) CSS variables

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → hooks. Never write fetch calls manually.
- All auth is Replit OIDC. Use `useAuth()` from `@workspace/replit-auth-web`, not generated hooks.
- `lib/replit-auth-web` must have `composite: true` + `vite-env.d.ts` shim for `import.meta.env`.
- AI responses are mocked in `artifacts/api-server/src/routes/ai.ts` (keyword matching).
- Plan file upload is mocked (filename only, no file storage) — flagged in UI as V0 behaviour.

## Product

- **Landing** (`/`) — Marketing page, no auth required
- **Login** (`/login`) — Replit Auth sign-in, redirects to dashboard
- **Dashboard** (`/dashboard`) — Stats cards + task breakdown chart + activity feed
- **Projects** (`/projects`) — CRUD project list with status badges
- **Project Detail** (`/projects/:id`) — Tasks + plans for a single project
- **PDF Plans** (`/plans`) — Register plans, view processing status
- **Tasks** (`/tasks`) — Kanban board (To Do / In Progress / Done) with move buttons
- **AI Assistant** (`/ai`) — Chat UI using mocked AI endpoint
- **Integrations** (`/integrations`) — 7 future connectors (all "Coming Soon")

## User preferences

- **Scope = Doorflow core only.** Keep the demo to: plan view, door points, door popup, red/amber/green status, photo attachment, and task filtering (incl. the tool-load + efficient-route optimisation layer). **No** user/company/entity profiles, **no** CRUD screens, **no** forms. Keep it minimal and fast — don't add features beyond this core unless explicitly asked.

## Gotchas

- Run `pnpm run typecheck:libs` before leaf package typechecks if you change any `lib/*`.
- Do not run `pnpm run dev` at workspace root — it has no dev script by design.
- `lib/replit-auth-web` needs both `composite: true` in tsconfig AND `src/vite-env.d.ts` for `import.meta.env` to resolve.
- Proxy routes all traffic through `/` — never call service ports directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
