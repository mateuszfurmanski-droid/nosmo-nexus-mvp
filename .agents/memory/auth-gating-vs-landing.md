---
name: "App 'UI missing / only landing page' diagnosis"
description: When a mandatory-auth app reportedly "shows only the landing page", suspect the auth funnel, not routing/deploy.
---

# "The app UI is missing / only the landing page shows"

For NOSMO Nexus (and any app where all real pages are gated by an auth layout),
this symptom is almost always an **auth-gating + stale public funnel** mismatch,
NOT a broken router or deployment.

**Why:** All app pages render inside `AppLayout`, which redirects signed-out users
to `/login`. The only route reachable without a session is `/` (the marketing
landing). So a signed-out visitor can *only* ever see the landing page — by design.
When a public "demo mode" (no login) is later replaced by mandatory Replit Auth,
the landing page's CTAs/copy that promised no-login access and deep-linked to
`/dashboard` start silently bouncing visitors to `/login`, which *looks* like the
app vanished.

**How to apply:** Before touching routing/deployment, verify the funnel:
- `curl /api/auth/user` → `{"user":null}` is the correct unauthenticated response.
- `curl /api/login?returnTo=/dashboard` → expect a 302 to `replit.com/oidc` with PKCE/state/nonce/client_id. If so, server auth is fine.
- Protected routes returning 401 when unauthenticated is correct, not a bug.
- The fix is usually to align landing CTAs/copy with the auth model (point them at
  `/login`), not to remove auth.
- A truly public demo is incompatible with per-user workspaces + data isolation
  (each user needs their own workspace, which requires login).
