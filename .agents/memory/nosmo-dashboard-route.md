---
name: NOSMO dashboard route is "/"
description: The demo dashboard lives at "/", not "/dashboard"; a /dashboard 404 is expected, not a bug.
---

In the frontend-only NOSMO Nexus demo, the Dashboard page is mounted at `/` (the index route). There is no `/dashboard` route.

**Why:** `replit.md`'s "Product" section still lists "Dashboard (`/dashboard`)" from the earlier backend-era design — that is stale. The current demo's nav item, the 404 page's "Return to Dashboard" button, and `landing.tsx`/`login.tsx` redirects are the only places `/dashboard` appears; `landing.tsx`/`login.tsx` are dead (not routed in `App.tsx`), and the nav + 404 both correctly point to `/`.

**How to apply:** A `/dashboard` request returning the 404 page is correct behaviour. Do NOT "fix" it by adding a `/dashboard` route — no in-app link targets it, and routing it would just duplicate `/`. If an e2e/test asserts `/dashboard` loads, that is a wrong test assumption; assert `/` instead.
