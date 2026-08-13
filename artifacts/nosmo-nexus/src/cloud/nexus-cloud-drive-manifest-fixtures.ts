import {
  assertNoCrossProjectCloudRoute,
  getNexusCloudProjectWorld,
  isKnownNexusCloudProjectWorld,
  resolveNexusCloudFolder,
  resolveNexusCloudRoute,
  type NexusCloudAssetDraft,
} from "./nexus-cloud-drive-manifest";

const esafePendingAsset: NexusCloudAssetDraft = {
  assetId: "NXS-CLOUD-SMOKE-ESAFE-001",
  fileName: "door-evidence-smoke.jpg",
  projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
  worldId: "esafe-demo",
  tradeId: "02_FIRE_DOORS_JOINERY",
  assetType: "photo",
  classificationStatus: "pending_graph_link",
  linkedGraphNodeIds: [],
  source: "File Loader / Android Work Mode",
};

const riversideInboxAsset: NexusCloudAssetDraft = {
  assetId: "NXS-CLOUD-SMOKE-RIVERSIDE-001",
  fileName: "riverside-snag-smoke.jpg",
  projectId: "RIVERSIDE_DEMO_PROJECT",
  worldId: "dev",
  tradeId: "snagging",
  assetType: "photo",
  classificationStatus: "inbox",
  linkedGraphNodeIds: [],
  source: "File Loader / Android Work Mode",
};

export function assertNexusCloudDriveManifestFixtures() {
  const esafe = getNexusCloudProjectWorld("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "esafe-demo");
  const riverside = getNexusCloudProjectWorld("RIVERSIDE_DEMO_PROJECT", "dev");

  if (esafe.folders.projectRoot.id === riverside.folders.projectRoot.id) {
    throw new Error("e-SAFE and Riverside must not share a project root folder.");
  }

  const esafePending = resolveNexusCloudRoute(esafePendingAsset);
  if (esafePending.targetFolder.id !== esafe.folders.pendingGraphLink.id) {
    throw new Error("e-SAFE pending graph link route resolved to the wrong folder.");
  }

  const riversideInbox = resolveNexusCloudRoute(riversideInboxAsset);
  if (riversideInbox.targetFolder.id !== riverside.folders.inbox.id) {
    throw new Error("Riverside inbox route resolved to the wrong folder.");
  }

  const esafeTradeFolder = resolveNexusCloudFolder(
    "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
    "byTrade",
    "esafe-demo",
  );
  assertNoCrossProjectCloudRoute(
    { ...esafePendingAsset, classificationStatus: "classified_by_trade" },
    esafeTradeFolder.id,
  );

  let mismatchBlocked = false;
  try {
    getNexusCloudProjectWorld("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "dev");
  } catch {
    mismatchBlocked = true;
  }
  if (!mismatchBlocked) {
    throw new Error("projectId/worldId mismatch must fail closed.");
  }

  let crossProjectBlocked = false;
  try {
    assertNoCrossProjectCloudRoute(esafePendingAsset, riverside.folders.inbox.id);
  } catch {
    crossProjectBlocked = true;
  }
  if (!crossProjectBlocked) {
    throw new Error("Cross-project Drive route must fail closed.");
  }

  if (!isKnownNexusCloudProjectWorld("RIVERSIDE_DEMO_PROJECT", "dev")) {
    throw new Error("Riverside project world should be registered.");
  }
}

assertNexusCloudDriveManifestFixtures();
