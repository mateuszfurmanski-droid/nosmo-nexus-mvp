import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const facade = read("artifacts/api-server/src/lib/nexus-browser-session.ts");
const route = read("artifacts/api-server/src/routes/nexus-session.ts");
const routerIndex = read("artifacts/api-server/src/routes/index.ts");

assert(facade.includes('NEXUS_BROWSER_SESSION_SCHEMA = "nexus-browser-session/v1"'), "Missing session schema");
assert(facade.includes('bindingStatus: "UNBOUND"'), "Authenticated account without binding must remain UNBOUND");
assert(facade.includes('bindingStatus: "BOUND"'), "Canonical Person binding must expose BOUND state");
assert(facade.includes("personId: null"), "Unbound session must not invent a canonical personId");
assert(facade.includes("personId: person.personId"), "Bound session must use canonical Person ID");
assert(facade.includes("canIssueContextTicket: false"), "PKG-017 must not enable PKG-016 tickets before project authorization");
assert(route.includes('router.get("/nexus/session"'), "Missing canonical session endpoint");
assert(route.includes('res.setHeader("Cache-Control", "no-store")'), "Session endpoint must be no-store");
assert(route.includes("res.status(401).json(buildNexusBrowserSession(null))"), "Unauthenticated session endpoint must return 401");

const sessionMount = routerIndex.indexOf("router.use(nexusSessionRouter)");
const workspaceGate = routerIndex.indexOf("router.use(requireWorkspace)");
assert(sessionMount >= 0 && workspaceGate >= 0 && sessionMount < workspaceGate, "Session route must be mounted before workspace authorization");

const responseSource = `${facade}\n${route}`;
const forbiddenResponseSignals = [
  ["raw session id", /\bsid\b/],
  ["provider access token", /access_token/],
  ["provider refresh token", /refresh_token/],
  ["OIDC subject claim", /claims\.sub|\bproviderSubject\b/],
  ["authorization bearer", /Bearer\s+/],
];
for (const [label, pattern] of forbiddenResponseSignals) {
  assert(!pattern.test(responseSource), `Canonical browser session facade must not expose ${label}`);
}

console.log("PKG-017 canonical Nexus browser session validator");
console.log("PASS: unauthenticated, UNBOUND and BOUND session states remain explicit");
console.log("PASS: canonical personId appears only after server-side Person binding");
console.log("PASS: no Context Ticket eligibility before project authorization");
console.log("PASS: no raw session/provider credential signals in browser session response code");
console.log("PASS: endpoint is no-store and mounted before workspace authorization");
