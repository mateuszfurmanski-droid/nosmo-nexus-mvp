import {
  createNexusCloudUploadSessionPlan,
  NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA,
  type NexusCloudUploadSessionPlan,
} from "../lib/nexus-cloud-upload-session";

const ESAFE_INBOX_ID = "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9";
const ESAFE_INBOX_URL = `https://drive.google.com/drive/folders/${ESAFE_INBOX_ID}`;

function assertSmoke(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Nexus Cloud upload-session smoke failed: ${message}`);
  }
}

function assertFalseFlags(plan: NexusCloudUploadSessionPlan) {
  assertSmoke(plan.binaryHandled === false, "binaryHandled must remain false");
  assertSmoke(plan.driveWriteRequested === false, "driveWriteRequested must remain false");
  assertSmoke(plan.driveWritePerformed === false, "driveWritePerformed must remain false");
  assertSmoke(plan.assetIndexAppendRequested === false, "assetIndexAppendRequested must remain false");
  assertSmoke(plan.assetIndexAppendPerformed === false, "assetIndexAppendPerformed must remain false");
  assertSmoke(plan.projectGraphMutationRequested === false, "projectGraphMutationRequested must remain false");
  assertSmoke(plan.projectGraphMutationPerformed === false, "projectGraphMutationPerformed must remain false");
  assertSmoke(plan.uploadUrl === null, "uploadUrl must remain null in stub");
  assertSmoke(plan.driveFileId === null, "driveFileId must remain null in stub");
}

function runHappyPathSmoke() {
  const plan = createNexusCloudUploadSessionPlan(
    {
      schema: "nexus-cloud-upload-session-request/v1",
      pendingAsset: {
        schema: "nexus-cloud-pending-asset/v1",
        pendingAssetId: "PENDING-NCA-ESAFE-SMOKE-001",
        assetId: "NCA-ESAFE-SMOKE-001",
        fileName: "esafe-smoke-photo.jpg",
        projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
        worldId: "esafe-demo",
        classificationStatus: "inbox",
        targetFolderRole: "inbox",
        targetFolderId: ESAFE_INBOX_ID,
        targetFolderUrl: ESAFE_INBOX_URL,
        uploadState: "metadata_prepared",
      },
    },
    {
      workspaceId: 101,
      userId: "smoke-authenticated-user",
      createdAt: "2026-08-11T20:00:00.000Z",
    },
  );

  assertSmoke(plan.schema === NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA, "unexpected upload-session plan schema");
  assertSmoke(plan.uploadSessionId.startsWith("NCS-UPLOAD-"), "uploadSessionId namespace mismatch");
  assertSmoke(plan.state === "planned_metadata_only", "state must stay metadata-only");
  assertSmoke(plan.provider === "google-drive", "provider should be google-drive plan only");
  assertSmoke(plan.projectId === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "projectId mismatch");
  assertSmoke(plan.worldId === "esafe-demo", "worldId mismatch");
  assertSmoke(plan.workspaceId === 101, "workspaceId mismatch");
  assertSmoke(plan.userId === "smoke-authenticated-user", "userId mismatch");
  assertSmoke(plan.targetFolderRole === "inbox", "target role mismatch");
  assertSmoke(plan.targetFolderId === ESAFE_INBOX_ID, "target folder id mismatch");
  assertSmoke(plan.targetFolderUrl === ESAFE_INBOX_URL, "target folder url mismatch");
  assertSmoke(
    plan.targetDrivePathHint === "e-SAFE Catania Project World/00_INBOX/esafe-smoke-photo.jpg",
    "target Drive path hint mismatch",
  );
  assertSmoke(plan.nextRequiredStep === "implement_drive_upload_adapter", "next step mismatch");
  assertFalseFlags(plan);
}

function runProjectWorldGuardSmoke() {
  let failedClosed = false;
  try {
    createNexusCloudUploadSessionPlan(
      {
        pendingAsset: {
          schema: "nexus-cloud-pending-asset/v1",
          pendingAssetId: "PENDING-NCA-BAD-WORLD-SMOKE-001",
          assetId: "NCA-BAD-WORLD-SMOKE-001",
          fileName: "bad-world.jpg",
          projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
          worldId: "dev",
          classificationStatus: "inbox",
          targetFolderRole: "inbox",
          targetFolderId: ESAFE_INBOX_ID,
          targetFolderUrl: ESAFE_INBOX_URL,
          uploadState: "metadata_prepared",
        },
      },
      {
        workspaceId: 101,
        userId: "smoke-authenticated-user",
        createdAt: "2026-08-11T20:00:00.000Z",
      },
    );
  } catch {
    failedClosed = true;
  }
  assertSmoke(failedClosed, "e-SAFE project with Riverside/dev worldId must fail closed");
}

runHappyPathSmoke();
runProjectWorldGuardSmoke();

console.log("Nexus Cloud upload-session plan smoke passed");
