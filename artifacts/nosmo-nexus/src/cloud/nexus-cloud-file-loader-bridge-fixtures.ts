import {
  assertFileLoaderPreparedAsset,
  createFileLoaderPendingAsset,
  createFileLoaderPendingAssets,
  type NexusCloudFileLoaderIncomingFile,
} from "./nexus-cloud-file-loader-bridge";

const esafeMobilePhoto: NexusCloudFileLoaderIncomingFile = {
  name: "door-frame-evidence-001.jpg",
  type: "image/jpeg",
  size: 842_120,
  lastModified: Date.parse("2026-08-11T13:30:00.000Z"),
};

const riversideDrawing: NexusCloudFileLoaderIncomingFile = {
  name: "riverside-level-02-markup.pdf",
  type: "application/pdf",
  size: 2_210_900,
  lastModified: Date.parse("2026-08-11T13:35:00.000Z"),
};

export const preparedEsafeMobilePhoto = assertFileLoaderPreparedAsset(
  createFileLoaderPendingAsset(
    esafeMobilePhoto,
    {
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "esafe-demo",
      sourceModule: "android-work-mode",
      notes: "Mobile Work Mode evidence prepared for project-boundary review.",
    },
    "2026-08-11T14:40:00.000Z",
  ),
);

export const preparedRiversideDrawing = assertFileLoaderPreparedAsset(
  createFileLoaderPendingAsset(
    riversideDrawing,
    {
      projectId: "RIVERSIDE_DEMO_PROJECT",
      worldId: "dev",
      sourceModule: "file-loader",
      requestedClassification: "pending_graph_link",
      graphCandidateNodeIds: ["riverside-floor-02", "riverside-floor-02"],
      notes: "Candidate graph node is a review hint only.",
    },
    "2026-08-11T14:41:00.000Z",
  ),
);

export const preparedEsafeBatch = createFileLoaderPendingAssets(
  [
    { name: "fire-door-before.jpg", type: "image/jpeg", size: 612_000 },
    { name: "fire-door-after.jpg", type: "image/jpeg", size: 640_000 },
  ],
  {
    projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
    worldId: "esafe-demo",
    sourceModule: "doorflow",
    requestedClassification: "classified_by_trade",
    tradeId: "02_FIRE_DOORS_JOINERY",
  },
  "2026-08-11T14:42:00.000Z",
).map(assertFileLoaderPreparedAsset);

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(preparedEsafeMobilePhoto.pendingAsset.targetFolderRole === "inbox", "e-SAFE mobile photo must start in e-SAFE inbox");
assert(preparedEsafeMobilePhoto.pendingAsset.targetFolderId === "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9", "e-SAFE mobile photo routed to wrong folder");
assert(preparedRiversideDrawing.pendingAsset.targetFolderRole === "pendingGraphLink", "Riverside drawing must route to pending graph link");
assert(preparedRiversideDrawing.pendingAsset.targetFolderId === "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", "Riverside drawing routed to wrong folder");
assert(preparedRiversideDrawing.pendingAsset.graphCandidateNodeIds.length === 1, "Graph candidates should be de-duplicated");
assert(preparedRiversideDrawing.projectGraphMutationRequested === false, "File Loader bridge must not mutate Project Graph");
assert(preparedEsafeBatch.every((entry) => entry.pendingAsset.targetFolderRole === "byTrade"), "Reviewed e-SAFE batch must route by trade");

try {
  createFileLoaderPendingAsset(
    { name: "wrong-world.jpg", type: "image/jpeg" },
    {
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "dev",
    },
    "2026-08-11T14:43:00.000Z",
  );
  throw new Error("Expected e-SAFE/dev mismatch to fail");
} catch (error) {
  assert(String(error).includes("project/world mismatch"), "e-SAFE/dev mismatch should fail closed");
}
