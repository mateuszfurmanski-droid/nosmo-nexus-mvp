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

assert(app.includes("NexusWorkModeAiHandoffReceiver"), "Work Mode AI receiver must be imported/mounted in App");
assert(receiver.includes("WORK MODE AI"), "visible Work Mode AI label missing");
assert(receiver.includes("android-work-discovery-v1"), "bounded Android AI context marker missing");
assert(receiver.includes("nexusIntent"), "nexusIntent parsing missing");
assert(receiver.includes("nexusPrompt"), "nexusPrompt parsing missing");
assert(/server-side Nexus AI orchestration/i.test(receiver), "server-side orchestration boundary copy missing");

const forbidden = [
  /OPENAI_API_KEY/i,
  /\bapiKey\b/i,
  /chat\.completions/i,
  /responses\.create/i,
];
for (const pattern of forbidden) {
  assert(!pattern.test(receiver), `frontend must not contain ${pattern}`);
}

console.log("PASS validate-work-mode-ai-handoff");
