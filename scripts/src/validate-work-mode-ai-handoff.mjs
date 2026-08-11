import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const app = read("artifacts/nosmo-nexus/src/App.tsx");
const receiver = read("artifacts/nosmo-nexus/src/cloud-data/work-mode-ai-handoff-receiver.tsx");
const inbox = read("artifacts/nosmo-nexus/src/cloud-data/worksuite-draft-action-inbox.tsx");
const server = read("scripts/src/nexus-work-mode-ai-api.mjs");

assert(app.includes("NexusWorkModeAiHandoffReceiver"), "Work Mode AI receiver must be imported/mounted in App");
assert(app.includes("NexusWorkSuiteDraftActionInbox"), "WorkSuite draft action inbox must be imported/mounted in App");
assert(receiver.includes("WORK MODE AI"), "visible Work Mode AI label missing");
assert(receiver.includes("android-work-discovery-v1"), "bounded Android AI context marker missing");
assert(receiver.includes("nexusIntent"), "nexusIntent parsing missing");
assert(receiver.includes("nexusPrompt"), "nexusPrompt parsing missing");
assert(receiver.includes("/api/nexus/work-mode-ai/context"), "server-side Work Mode AI context endpoint missing");
assert(receiver.includes("nexus:work-mode-ai-next-action"), "next action UI intent event missing");
assert(receiver.includes("nexus:work-mode-ai-evidence-review-request"), "evidence review draft intent event missing");
assert(receiver.includes("nexus:worksuite-draft-action-proposed"), "WorkSuite draft action event missing");
assert(receiver.includes("draftAction"), "frontend must dispatch server draftAction envelope");
assert(receiver.includes("intent-only-no-mutation"), "next action must remain intent-only in this slice");
assert(receiver.includes("draft-only-no-mutation"), "WorkSuite draft envelope must remain non-mutating");
assert(receiver.includes("worksuite-action-engine-required"), "WorkSuite Action Engine execution boundary missing");
assert(receiver.includes("Requires Project Participation before mutation"), "authority boundary copy missing for action intents");
assert(/server-side Nexus AI orchestration/i.test(receiver), "server-side orchestration boundary copy missing");

assert(inbox.includes("WORKSUITE DRAFT INBOX"), "WorkSuite draft inbox visible label missing");
assert(inbox.includes("nexus:worksuite-draft-action-proposed"), "WorkSuite draft inbox must listen for draft events");
assert(inbox.includes("draft-only-no-mutation"), "WorkSuite draft inbox must enforce non-mutating draft envelopes");
assert(inbox.includes("worksuite-action-engine-required"), "WorkSuite draft inbox must preserve Action Engine boundary");
assert(inbox.includes("Review required"), "WorkSuite draft inbox must show review-required status");
assert(inbox.includes("Requires Project Participation before mutation"), "WorkSuite draft inbox authority warning missing");
assert(inbox.includes("does not execute WorkSuite Action Engine mutations"), "WorkSuite draft inbox execution guard copy missing");
assert(!/\bexecute\s*\(/i.test(inbox), "WorkSuite draft inbox must not execute actions");
assert(!/\bmutate\s*\(/i.test(inbox), "WorkSuite draft inbox must not mutate actions");
assert(!/\bapprove\s*\(/i.test(inbox), "WorkSuite draft inbox must not approve actions");
assert(!/fetch\(/i.test(inbox), "WorkSuite draft inbox must not call backend APIs in this slice");

assert(server.includes("draftAction"), "server must return draftAction envelopes");
assert(server.includes("buildWorkSuiteDraftAction"), "server draft envelope builder missing");
assert(server.includes("workSuiteActionEngineApproval"), "server must require WorkSuite Action Engine approval");
assert(server.includes("draft-only-no-mutation"), "server draft envelope must be non-mutating");
assert(server.includes("worksuite-action-engine-required"), "server draft execution boundary missing");
assert(server.includes("Do not execute or mutate until WorkSuite Action Engine resolves permissions"), "server mutation guard copy missing");

const forbidden = [
  /OPENAI_API_KEY/i,
  /\bapiKey\b/i,
  /chat\.completions/i,
  /responses\.create/i,
];
for (const pattern of forbidden) {
  assert(!pattern.test(receiver), `frontend must not contain ${pattern}`);
  assert(!pattern.test(server), `server boundary must not contain ${pattern}`);
}

console.log("PASS validate-work-mode-ai-handoff");
