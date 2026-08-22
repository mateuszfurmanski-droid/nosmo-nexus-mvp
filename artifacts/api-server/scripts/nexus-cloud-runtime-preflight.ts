import { runNexusCloudRuntimePreflight } from "../src/lib/nexus-cloud-runtime-preflight";

const requireReady = process.argv.includes("--require-ready");
const result = await runNexusCloudRuntimePreflight(process.env);

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (requireReady && result.status !== "READY_FOR_CONTROLLED_E2E") {
  process.exitCode = 2;
}
