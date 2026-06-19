---
name: API server zod imports
description: api-server package has no zod dependency — cannot import zod/v4 directly in route files
---

The `@workspace/api-server` package does NOT have `zod` in its `package.json` dependencies.

**Rule:** Never `import { z } from "zod/v4"` in route files under `artifacts/api-server/src/routes/`.

**Why:** The package only depends on `@workspace/api-zod` (generated Zod schemas) and `@workspace/db`. Adding inline zod validation causes a TS2307 error at typecheck time.

**How to apply:** For ad-hoc input validation in routes, use manual JS checks (`typeof x === "string"`, `parseInt`, etc.) or import the generated Zod schemas from `@workspace/api-zod`. If zod is genuinely needed, add it to api-server's `package.json` dependencies using the catalog pin.
