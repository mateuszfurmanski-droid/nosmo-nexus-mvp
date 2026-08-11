import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, "../src/record-mapping.js"), "utf8");

const storage = {};
const sandbox = {
  console,
  globalThis: null,
  chrome: {
    storage: {
      local: {
        async get(keys) {
          const result = {};
          for (const key of keys) result[key] = storage[key];
          return result;
        },
        async set(values) {
          Object.assign(storage, values);
        }
      }
    }
  }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "record-mapping.js" });

const registry = sandbox.NexusOverlayRecordMapping;
if (!registry) throw new Error("Record mapping registry did not initialise");

const saved = await registry.setMapping({
  projectId: "halifax-demo",
  selectedObjectType: "job",
  externalRecordReference: "JOB-847",
  nexusNodeId: "t-install"
});

if (saved.confirmation !== "USER_CONFIRMED_LOCAL_MAPPING") {
  throw new Error("Saved mapping must be explicitly user-confirmed local mapping");
}

const exact = await registry.resolve({
  sourceApplication: "WORK_WALLET",
  projectId: "halifax-demo",
  selectedObjectType: "job",
  externalRecordReference: "JOB-847"
});
if (exact !== "t-install") throw new Error("Exact mapping did not resolve");

const wrongProject = await registry.resolve({
  sourceApplication: "WORK_WALLET",
  projectId: "other-project",
  selectedObjectType: "job",
  externalRecordReference: "JOB-847"
});
if (wrongProject !== null) throw new Error("Mapping leaked across projects");

const wrongType = await registry.resolve({
  sourceApplication: "WORK_WALLET",
  projectId: "halifax-demo",
  selectedObjectType: "permit",
  externalRecordReference: "JOB-847"
});
if (wrongType !== null) throw new Error("Mapping leaked across object types");

const similarReference = await registry.resolve({
  sourceApplication: "WORK_WALLET",
  projectId: "halifax-demo",
  selectedObjectType: "job",
  externalRecordReference: "JOB-8470"
});
if (similarReference !== null) throw new Error("Mapping used fuzzy/similar external reference matching");

const wrongApplication = await registry.resolve({
  sourceApplication: "OTHER_APP",
  projectId: "halifax-demo",
  selectedObjectType: "job",
  externalRecordReference: "JOB-847"
});
if (wrongApplication !== null) throw new Error("Mapping leaked to another source application");

let rejectedUnsafeNode = false;
try {
  await registry.setMapping({
    projectId: "halifax-demo",
    selectedObjectType: "job",
    externalRecordReference: "JOB-848",
    nexusNodeId: "../t-install"
  });
} catch {
  rejectedUnsafeNode = true;
}
if (!rejectedUnsafeNode) throw new Error("Unsafe Nexus node ID was accepted");

let rejectedUnsafeReference = false;
try {
  await registry.setMapping({
    projectId: "halifax-demo",
    selectedObjectType: "job",
    externalRecordReference: "JOB 849",
    nexusNodeId: "t-install"
  });
} catch {
  rejectedUnsafeReference = true;
}
if (!rejectedUnsafeReference) throw new Error("Unsafe external record reference was accepted");

await registry.removeMapping(saved.id);
const removed = await registry.resolve({
  sourceApplication: "WORK_WALLET",
  projectId: "halifax-demo",
  selectedObjectType: "job",
  externalRecordReference: "JOB-847"
});
if (removed !== null) throw new Error("Removed mapping still resolves");

console.log("PKG-013 explicit Work Wallet record mapping validator");
console.log("PASS: exact project + object type + external reference matching");
console.log("PASS: no fuzzy reference matching");
console.log("PASS: no cross-project, cross-type or cross-application mapping");
console.log("PASS: unsafe Nexus node IDs and references are rejected");
console.log("PASS: mapping removal is effective");
