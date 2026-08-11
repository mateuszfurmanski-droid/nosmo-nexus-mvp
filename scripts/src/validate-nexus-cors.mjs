import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const corsPolicy = read("artifacts/api-server/src/lib/nexus-cors.ts");
const app = read("artifacts/api-server/src/app.ts");

assert(
  corsPolicy.includes("NEXUS_CORS_ALLOWED_ORIGINS"),
  "general exact CORS allowlist is missing",
);
assert(
  corsPolicy.includes("NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS"),
  "context ticket extension origins must feed the exact CORS policy",
);
assert(
  corsPolicy.includes("chrome-extension:\\/\\/"),
  "exact Chromium extension origin support is missing",
);
assert(
  corsPolicy.includes('url.protocol === "https:"'),
  "production web CORS origins must be HTTPS",
);
assert(
  corsPolicy.includes('process.env.NODE_ENV !== "production"'),
  "localhost HTTP CORS must be development-only",
);
assert(
  !corsPolicy.includes('allowed.add("*")'),
  "CORS policy must not grant wildcard origin",
);
assert(
  !corsPolicy.includes('"https://*"') && !corsPolicy.includes('"http://*"'),
  "CORS policy must not grant wildcard schemes",
);

assert(
  app.includes("isNexusCorsOriginAllowed(origin)"),
  "Express runtime must use the exact Nexus CORS policy",
);
assert(
  !app.includes("cors({ credentials: true, origin: true })"),
  "permissive reflected credentialed CORS must be removed",
);
assert(
  app.includes("credentials: true"),
  "approved cross-origin browser clients must retain credentialed CORS support",
);

console.log("PASS validate-nexus-cors");
