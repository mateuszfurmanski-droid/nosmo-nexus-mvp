import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const bootstrap = read("artifacts/api-server/src/lib/nexus-context-ticket-bootstrap.ts");
const route = read("artifacts/api-server/src/routes/nexus-context-tickets.ts");

assert(bootstrap.includes("EXTENSION_ID = /^[a-p]{32}$/"), "bootstrap must require an exact Chromium extension ID");
assert(bootstrap.includes("parseContextTicketAllowedOrigins()"), "bootstrap extension ID must be backed by the ticket origin allowlist");
assert(bootstrap.includes('default-src \'none\''), "bootstrap CSP must default-deny resources");
assert(bootstrap.includes("frame-ancestors 'none'"), "bootstrap must forbid framing");
assert(bootstrap.includes('res.setHeader("X-Frame-Options", "DENY")'), "bootstrap X-Frame-Options DENY missing");
assert(bootstrap.includes('res.setHeader("Referrer-Policy", "no-referrer")'), "bootstrap no-referrer policy missing");
assert(bootstrap.includes('res.setHeader("Cross-Origin-Opener-Policy", "same-origin")'), "bootstrap COOP isolation missing");
assert(bootstrap.includes('fetch("/api/nexus/context-tickets"'), "bootstrap must issue ticket through same-origin server endpoint");
assert(bootstrap.includes('credentials: "include"'), "bootstrap must use the existing Nexus browser session");
assert(bootstrap.includes("chrome.runtime.sendMessage(extensionId, message"), "bootstrap must send ticket directly to the exact extension");
assert(bootstrap.includes('delete issued.ticket'), "bootstrap must remove ticket from retained response object before handoff");
assert(bootstrap.includes('message.ticket = ""'), "bootstrap must erase message ticket after extension callback");
assert(!bootstrap.includes("localStorage"), "bootstrap must not persist ticket in localStorage");
assert(!bootstrap.includes("sessionStorage"), "bootstrap must not persist ticket in sessionStorage");
assert(!bootstrap.includes("URLSearchParams({ ticket"), "raw ticket must never enter bootstrap URL");
assert(!bootstrap.includes("console.log"), "bootstrap must not log ticket/bootstrap payloads");

assert(route.includes('router.get(\n  "/nexus/context-tickets/bootstrap"'), "bootstrap GET route missing");
assert(route.includes("parseContextTicketBootstrapRequest"), "bootstrap request validation missing");
assert(route.includes("if (!req.isAuthenticated())"), "bootstrap must require Nexus session before rendering handoff page");
assert(route.includes("buildContextTicketBootstrapReturnTo"), "bootstrap login return path must be rebuilt from validated values");
assert(route.includes('res.redirect(302, `/api/login?returnTo=${encodeURIComponent(returnTo)}`)'), "bootstrap unauthenticated redirect must use existing OIDC login");
assert(route.includes("sendContextTicketBootstrapPage(res, bootstrap)"), "validated bootstrap page renderer missing");

console.log("PASS validate-nexus-context-ticket-bootstrap");
