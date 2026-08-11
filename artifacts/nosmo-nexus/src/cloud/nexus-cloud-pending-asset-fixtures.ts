import {
  assertPendingNexusAssetRecord,
  createPendingNexusAssetRecord,
  type PendingNexusAssetInput,
} from "./nexus-cloud-pending-asset";

const fixedNow = "2026-08-11T15:31:00+01:00";

export const pendingNexusAssetFixtures = {
  esafeInboxPhoto: createPendingNexusAssetRecord(
    {
      originalFileName: "esafe-door-photo-001.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 245760,
      checksumSha256: "a".repeat(64),
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "esafe-demo",
      sourceModule: "android-work-mode",
      tradeId: "02_FIRE_DOORS_JOINERY",
      notes: "Synthetic fixture: new mobile photo goes to e-SAFE inbox until graph link review.",
    },
    fixedNow,
  ),
  riversidePendingDrawing: createPendingNexusAssetRecord(
    {
      originalFileName: "riverside-level-02-markup.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1048576,
      checksumSha256: "b".repeat(64),
      projectId: "RIVERSIDE_DEMO_PROJECT",
      worldId: "dev",
      sourceModule: "file-loader",
      graphCandidateNodeIds: ["riverside-floor-02", "riverside-task-firestopping-001"],
      notes: "Synthetic fixture: graph candidates exist, but the asset is still pending_graph_link.",
    },
    fixedNow,
  ),
  esafeTradeEvidence: createPendingNexusAssetRecord(
    {
      originalFileName: "door-pack-a-fire-door-evidence.pdf",
      mimeType: "application/pdf",
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "esafe-demo",
      sourceModule: "doorflow",
      tradeId: "02_FIRE_DOORS_JOINERY",
      requestedClassification: "classified_by_trade",
      notes: "Synthetic fixture: reviewed DoorFlow evidence routes to e-SAFE BY_TRADE, not Riverside.",
    },
    fixedNow,
  ),
} as const;

function expectThrow(label: string, fn: () => unknown) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`Expected pending Nexus asset fixture to throw: ${label}`);
}

export function assertPendingNexusAssetFixtures() {
  assertPendingNexusAssetRecord(pendingNexusAssetFixtures.esafeInboxPhoto);
  assertPendingNexusAssetRecord(pendingNexusAssetFixtures.riversidePendingDrawing);
  assertPendingNexusAssetRecord(pendingNexusAssetFixtures.esafeTradeEvidence);

  if (pendingNexusAssetFixtures.esafeInboxPhoto.targetFolderId !== "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9") {
    throw new Error("e-SAFE inbox photo must resolve to the e-SAFE 00_INBOX folder");
  }

  if (pendingNexusAssetFixtures.riversidePendingDrawing.targetFolderId !== "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw") {
    throw new Error("Riverside graph-candidate drawing must resolve to Riverside 01_PENDING_GRAPH_LINK");
  }

  if (pendingNexusAssetFixtures.esafeTradeEvidence.targetFolderId !== "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P") {
    throw new Error("e-SAFE trade evidence must resolve to e-SAFE 02_BY_TRADE");
  }

  expectThrow("e-SAFE cannot use Riverside worldId", () =>
    createPendingNexusAssetRecord(
      {
        originalFileName: "wrong-world.jpg",
        projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
        worldId: "dev",
        sourceModule: "file-loader",
      },
      fixedNow,
    ),
  );

  expectThrow("Riverside cannot use e-SAFE worldId", () =>
    createPendingNexusAssetRecord(
      {
        originalFileName: "wrong-world.jpg",
        projectId: "RIVERSIDE_DEMO_PROJECT",
        worldId: "esafe-demo",
        sourceModule: "file-loader",
      },
      fixedNow,
    ),
  );

  const unsafeLinkedAsset = {
    ...pendingNexusAssetFixtures.esafeInboxPhoto,
    classificationStatus: "linked_to_graph",
  } as typeof pendingNexusAssetFixtures.esafeInboxPhoto;
  expectThrow("pending asset cannot directly become linked_to_graph", () => assertPendingNexusAssetRecord(unsafeLinkedAsset));

  const unsafeInput: PendingNexusAssetInput = {
    originalFileName: "candidate-without-pending.pdf",
    projectId: "RIVERSIDE_DEMO_PROJECT",
    worldId: "dev",
    sourceModule: "file-loader",
    requestedClassification: "classified_by_type",
    graphCandidateNodeIds: ["candidate-node"],
  };
  expectThrow("graph candidates must stay pending_graph_link", () =>
    assertPendingNexusAssetRecord(createPendingNexusAssetRecord(unsafeInput, fixedNow)),
  );
}

assertPendingNexusAssetFixtures();
