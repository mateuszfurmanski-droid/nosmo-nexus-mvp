import {
  createNexusCloudAssetIndexRowPlan,
  NEXUS_CLOUD_ASSET_INDEX_COLUMNS,
  NEXUS_CLOUD_ASSET_INDEX_ROW_PLAN_SCHEMA,
  NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID,
  type NexusCloudAssetIndexRowPlan,
} from "../lib/nexus-cloud-asset-index-row-plan";
import {
  createNexusCloudUploadSessionPlan,
  type NexusCloudUploadSessionPlan,
} from "../lib/nexus-cloud-upload-session";

const ESAFE_INBOX_ID = "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9";
const ESAFE_INBOX_URL = `https://drive.google.com/drive/folders/${ESAFE_INBOX_ID}`;

function assertSmoke(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Nexus Cloud Asset Index row plan smoke failed: ${message}`);
  }
}

function createSmokeUploadSessionPlan(): NexusCloudUploadSessionPlan {
  return createNexusCloudUploadSessionPlan(
    {
      schema: "nexus-cloud-upload-session-request/v1",
      pendingAsset: {
        schema: "nexus-cloud-pending-asset/v1",
        pendingAssetId: "PENDING-NCA-ESAFE-ASSET-INDEX-SMOKE-001",
        assetId: "NCA-ESAFE-ASSET-INDEX-SMOKE-001",
        fileName: "esafe-asset-index-smoke-photo.jpg",
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
      createdAt: "2026-08-11T21:00:00.000Z",
    },
  );
}

function assertFalseFlags(plan: NexusCloudAssetIndexRowPlan) {
  assertSmoke(plan.googleSheetsAppendRequested === false, "googleSheetsAppendRequested must remain false");
  assertSmoke(plan.googleSheetsAppendPerformed === false, "googleSheetsAppendPerformed must remain false");
  assertSmoke(plan.driveWritePerformed === false, "driveWritePerformed must remain false");
  assertSmoke(plan.projectGraphMutationPerformed === false, "projectGraphMutationPerformed must remain false");
}

function runHappyPathSmoke() {
  const uploadSessionPlan = createSmokeUploadSessionPlan();
  const rowPlan = createNexusCloudAssetIndexRowPlan(uploadSessionPlan);

  assertSmoke(rowPlan.schema === NEXUS_CLOUD_ASSET_INDEX_ROW_PLAN_SCHEMA, "unexpected row plan schema");
  assertSmoke(rowPlan.rowPlanId.startsWith("NCA-INDEX-ROW-"), "rowPlanId namespace mismatch");
  assertSmoke(rowPlan.state === "planned_not_appended", "row plan must not be appended");
  assertSmoke(rowPlan.assetIndexSpreadsheetId === NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID, "spreadsheet id mismatch");
  assertSmoke(rowPlan.uploadSessionId === uploadSessionPlan.uploadSessionId, "uploadSessionId mismatch");
  assertSmoke(rowPlan.pendingAssetId === uploadSessionPlan.pendingAssetId, "pendingAssetId mismatch");
  assertSmoke(rowPlan.projectId === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "projectId mismatch");
  assertSmoke(rowPlan.worldId === "esafe-demo", "worldId mismatch");

  assertSmoke(rowPlan.row.assetId === uploadSessionPlan.assetId, "row assetId mismatch");
  assertSmoke(rowPlan.row.fileName === "esafe-asset-index-smoke-photo.jpg", "row fileName mismatch");
  assertSmoke(rowPlan.row.projectId === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "row projectId mismatch");
  assertSmoke(rowPlan.row.worldId === "esafe-demo", "row worldId mismatch");
  assertSmoke(rowPlan.row.tradeId === "", "tradeId must stay blank before classification");
  assertSmoke(rowPlan.row.assetType === "photo", "photo asset type should be inferred from jpg");
  assertSmoke(rowPlan.row.classificationStatus === "inbox", "classificationStatus should reflect the target folder role");
  assertSmoke(rowPlan.row.visibilityScope === "project", "visibility scope must remain project");
  assertSmoke(rowPlan.row.driveFileId === "", "driveFileId must stay blank before Drive write");
  assertSmoke(
    rowPlan.row.drivePathOrUrl === "e-SAFE Catania Project World/00_INBOX/esafe-asset-index-smoke-photo.jpg",
    "drivePathOrUrl should use the target Drive path hint",
  );
  assertSmoke(rowPlan.row.linkedGraphNodeIds === "", "linkedGraphNodeIds must stay blank");
  assertSmoke(rowPlan.row.source.includes("smoke-authenticated-user"), "source should include planning user");
  assertSmoke(rowPlan.row.createdAt === "2026-08-11T21:00:00.000Z", "createdAt mismatch");
  assertSmoke(rowPlan.row.notes.includes("PLANNED_ONLY_DO_NOT_APPEND_YET"), "notes must block accidental append");
  assertSmoke(
    rowPlan.nextRequiredStep === "append_asset_index_row_after_drive_file_id_exists",
    "next required step mismatch",
  );
  assertSmoke(rowPlan.orderedColumns.length === NEXUS_CLOUD_ASSET_INDEX_COLUMNS.length, "ordered column length mismatch");
  assertSmoke(rowPlan.orderedValues.length === NEXUS_CLOUD_ASSET_INDEX_COLUMNS.length, "ordered value length mismatch");
  assertSmoke(rowPlan.orderedValues[0] === rowPlan.row.assetId, "first ordered value should be assetId");
  assertFalseFlags(rowPlan);
}

function runGuardSmoke() {
  const uploadSessionPlan = createSmokeUploadSessionPlan() as unknown as Record<string, unknown>;
  uploadSessionPlan["driveWritePerformed"] = true;

  let failedClosed = false;
  try {
    createNexusCloudAssetIndexRowPlan(uploadSessionPlan);
  } catch {
    failedClosed = true;
  }

  assertSmoke(failedClosed, "row planner must fail closed if Drive write is already marked performed unexpectedly");
}

runHappyPathSmoke();
runGuardSmoke();

console.log("Nexus Cloud Asset Index row plan smoke passed");
