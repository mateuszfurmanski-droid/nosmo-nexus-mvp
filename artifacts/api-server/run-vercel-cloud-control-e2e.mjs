import { spawnSync } from "node:child_process";

const steps = [
  { command: "pnpm", args: ["run", "typecheck:libs"] },
  { command: "pnpm", args: ["--filter", "@workspace/api-server", "typecheck"] },
  { command: "node", args: ["artifacts/api-server/build-vercel-staging.mjs"] },
  { command: "node", args: ["artifacts/api-server/build-cloud-control-e2e.mjs"] },
  {
    command: "node",
    args: ["artifacts/api-server/dist/cloud-control-e2e.mjs"],
    env: { ...process.env, NEXUS_CLOUD_CONTROL_E2E_EXECUTE: "true" },
  },
];

for (const step of steps) {
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    env: step.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
