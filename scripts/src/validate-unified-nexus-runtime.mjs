import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const replit = read(".replit");
const app = read("artifacts/api-server/src/app.ts");
const bridge = read("artifacts/api-server/src/lib/work-wallet-runtime.ts");
const runtimePaths = read("artifacts/api-server/src/lib/nexus-runtime-paths.ts");
const legacyGateway = read("scripts/src/work-wallet-api.mjs");

assert(
  replit.includes("pnpm --filter @workspace/api-server build"),
  "deployment build must build the API server",
);
assert(
  replit.includes('run = "pnpm --filter @workspace/api-server start"'),
  "deployment run must use the canonical API server",
);
assert(
  !replit.includes('run = "pnpm --filter @workspace/scripts serve-nexus"'),
  "deployment must not keep the old static/gateway server as the public runtime",
);

const gatewayMount = app.indexOf("app.use(workWalletRuntimeMiddleware)");
const jsonParser = app.indexOf("app.use(express.json");
assert(gatewayMount >= 0, "Work Wallet runtime bridge must be mounted");
assert(jsonParser >= 0 && gatewayMount < jsonParser, "Work Wallet gateway must own its body before generic JSON parsing");
assert(app.includes('app.use("/api", router)'), "canonical API router must remain mounted");
assert(app.includes("express.static(publicDirectory"), "canonical API runtime must serve built SPA assets");
assert(app.includes("resolveNexusWebPublicDirectory()"), "SPA path must use canonical runtime root resolution");
assert(app.includes('req.path.startsWith("/api/")'), "SPA fallback must not rewrite API paths");
assert(app.includes('app.get("/health"'), "unified external health endpoint missing");

assert(
  bridge.includes("resolveWorkWalletRuntimeModulePath()"),
  "Work Wallet bridge must use canonical runtime path resolution",
);
assert(
  bridge.includes("runtime.handleWorkWalletApi(req, res, url)"),
  "bridge must delegate to the existing Work Wallet handler",
);
assert(
  !bridge.includes("allowedEventTypes"),
  "bridge must not copy Work Wallet gateway business rules",
);
assert(
  runtimePaths.includes('"scripts/src/work-wallet-api.mjs"'),
  "runtime root resolver must locate the existing Work Wallet gateway module",
);
assert(
  runtimePaths.includes('"artifacts/nosmo-nexus/dist/public"'),
  "runtime root resolver must locate the built Nexus SPA",
);
assert(
  runtimePaths.includes("process.env.NEXUS_RUNTIME_ROOT"),
  "runtime root must support an explicit deployment override",
);
assert(
  runtimePaths.includes("process.env.INIT_CWD"),
  "runtime root should account for pnpm package cwd",
);
assert(
  runtimePaths.includes("existsSync"),
  "runtime root candidates must be verified by repository markers",
);
assert(
  legacyGateway.includes("export async function handleWorkWalletApi"),
  "canonical legacy gateway export is missing",
);

console.log("PASS validate-unified-nexus-runtime");
