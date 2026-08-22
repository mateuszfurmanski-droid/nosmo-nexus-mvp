import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = await fs.readFile(
  path.join(here, "verify-work-wallet-production-api-origin.mjs"),
  "utf8",
);

assert.match(source, /NEXUS_WORK_WALLET_CANDIDATE_API_ORIGIN/);
assert.match(source, /url\.protocol !== "https:"/);
assert.match(source, /redirect: "manual"/);
assert.match(source, /credentials: "omit"/);
assert.match(source, /method: "GET"/);
assert.match(source, /nosmo-nexus-unified-runtime/);
assert.match(source, /\/api\/nexus\/context-tickets\/work-wallet\/bootstrap/);
assert.match(source, /Invalid Nexus Work Wallet connector bootstrap request\./);
assert.match(source, /health\.status !== "ok"/);
assert.match(source, /health\.workWallet/);
assert.equal(/method:\s*"(?:POST|PUT|PATCH|DELETE)"/.test(source), false);
assert.equal(/DATABASE_URL/.test(source), false);
assert.equal(/authorization/i.test(source), false);
assert.equal(/cookie/i.test(source), false);

process.stdout.write("WORK_WALLET_PRODUCTION_API_PREFLIGHT_AUDIT_PASS\n");
