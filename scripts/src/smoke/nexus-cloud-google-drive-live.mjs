import { writeNexusCloudFileToGoogleDrive } from "../nexus-cloud-google-drive-adapter.mjs";

const required = (name) => {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required for the controlled live Drive smoke`);
  return value.trim();
};

if (process.env.NEXUS_CLOUD_GOOGLE_DRIVE_LIVE_SMOKE !== "1") {
  throw new Error(
    "Live Google Drive smoke is disabled. Set NEXUS_CLOUD_GOOGLE_DRIVE_LIVE_SMOKE=1 explicitly.",
  );
}

let plan;
try {
  plan = JSON.parse(required("NEXUS_CLOUD_GOOGLE_DRIVE_WRITE_PLAN_JSON"));
} catch (error) {
  throw new Error("NEXUS_CLOUD_GOOGLE_DRIVE_WRITE_PLAN_JSON must contain one Phase 17 write plan", {
    cause: error,
  });
}

const idempotencyKey = required("NEXUS_CLOUD_GOOGLE_DRIVE_SMOKE_IDEMPOTENCY_KEY");
const content = Buffer.from(
  process.env.NEXUS_CLOUD_GOOGLE_DRIVE_SMOKE_CONTENT ??
    "NOSMO Nexus Cloud controlled Google Drive provider-write smoke\n",
  "utf8",
);

const result = await writeNexusCloudFileToGoogleDrive({
  plan,
  binary: content,
  idempotencyKey,
});

console.log(
  JSON.stringify(
    {
      status: result.status,
      level: "REAL_GOOGLE_DRIVE_PROVIDER_WRITE",
      projectId: result.receipt.projectId,
      worldId: result.receipt.worldId,
      driveFileId: result.driveFileId,
      providerUrl: result.receipt.externalUrl ?? null,
      checksumSha256: result.receipt.checksumSha256,
      idempotentReplay: result.idempotentReplay,
      projectMemoryMutationPerformed: result.projectMemoryMutationPerformed,
      projectGraphMutationPerformed: result.projectGraphMutationPerformed,
      nextRequiredStep: "persist_provider_receipt_transactionally_in_project_memory",
    },
    null,
    2,
  ),
);
