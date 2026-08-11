export const NEXUS_CLOUD_DRIVE_SCHEMA = "nexus-cloud-drive-manifest/v1" as const;

export type NexusCloudProjectId =
  | "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA"
  | "RIVERSIDE_DEMO_PROJECT";

export type NexusCloudWorldId = "esafe-demo" | "dev";

export type NexusCloudFolderRole =
  | "cloudRoot"
  | "projectWorldsRoot"
  | "sharedRegistries"
  | "connectorExports"
  | "projectRoot"
  | "inbox"
  | "pendingGraphLink"
  | "byTrade"
  | "byType"
  | "auditProvenance"
  | "legacySourceLibrary";

export type NexusCloudClassificationStatus =
  | "inbox"
  | "pending_graph_link"
  | "classified_by_trade"
  | "classified_by_type"
  | "linked_to_graph"
  | "audit_only";

export type NexusCloudFolderRef = {
  role: NexusCloudFolderRole;
  id: string;
  name: string;
  url: string;
  canonicalUse: string;
};

export type NexusCloudProjectWorld = {
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  displayName: string;
  folders: {
    projectRoot: NexusCloudFolderRef;
    inbox: NexusCloudFolderRef;
    pendingGraphLink: NexusCloudFolderRef;
    byTrade: NexusCloudFolderRef;
    byType: NexusCloudFolderRef;
    auditProvenance: NexusCloudFolderRef;
    legacySourceLibrary?: NexusCloudFolderRef;
  };
};

export type NexusCloudAssetDraft = {
  assetId: string;
  fileName: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  tradeId?: string;
  assetType: string;
  classificationStatus: NexusCloudClassificationStatus;
  driveFileId?: string;
  linkedGraphNodeIds: string[];
  source: string;
};

export type NexusCloudRouteDecision = {
  project: NexusCloudProjectWorld;
  targetFolder: NexusCloudFolderRef;
  classificationStatus: NexusCloudClassificationStatus;
  requiresGraphLinkReview: boolean;
  allowedGraphLink: boolean;
  warnings: string[];
};

const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;
const docsUrl = (id: string) => `https://docs.google.com/document/d/${id}/edit`;
const sheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

export const nexusCloudDriveManifest = {
  schema: NEXUS_CLOUD_DRIVE_SCHEMA,
  verifiedAt: "2026-08-11T14:21:00+01:00",
  purpose: "Current practical Nexus Cloud Memory adapter for Google Drive. Drive IDs are a routing contract, not vendor lock-in.",
  hardRule: "Resolve projectId/worldId before storing, classifying or graph-linking a file.",
  roots: {
    cloudRoot: {
      role: "cloudRoot",
      id: "1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0",
      name: "00_NEXUS_PERSONAL_CLOUD",
      url: folderUrl("1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0"),
      canonicalUse: "Top-level Nexus cloud memory root. Do not store project files directly here.",
    },
    projectWorldsRoot: {
      role: "projectWorldsRoot",
      id: "1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q",
      name: "10_PROJECT_WORLDS",
      url: folderUrl("1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q"),
      canonicalUse: "Every project gets its own child folder. Project separation boundary.",
    },
    sharedRegistries: {
      role: "sharedRegistries",
      id: "1h-sNqC3983nfG1IaUe6SXWeWnJLVrcOx",
      name: "20_SHARED_REGISTRIES",
      url: folderUrl("1h-sNqC3983nfG1IaUe6SXWeWnJLVrcOx"),
      canonicalUse: "Indexes, manifests and configs. Contains NEXUS_CLOUD_ASSET_INDEX.",
    },
    connectorExports: {
      role: "connectorExports",
      id: "1gmhM6WCj-m4Ms_JK7pdvmYP32Id9JkKo",
      name: "30_CONNECTOR_EXPORTS",
      url: folderUrl("1gmhM6WCj-m4Ms_JK7pdvmYP32Id9JkKo"),
      canonicalUse: "Connector staging only. Not canonical by itself.",
    },
  } satisfies Record<string, NexusCloudFolderRef>,
  registries: {
    assetIndex: {
      id: "1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI",
      name: "NEXUS_CLOUD_ASSET_INDEX",
      url: sheetUrl("1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI"),
      columns: [
        "assetId",
        "fileName",
        "projectId",
        "worldId",
        "tradeId",
        "assetType",
        "classificationStatus",
        "visibilityScope",
        "driveFileId",
        "drivePathOrUrl",
        "linkedGraphNodeIds",
        "source",
        "createdAt",
        "notes",
      ],
    },
    routingRules: {
      id: "1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c",
      name: "NEXUS_CLOUD_ROUTING_RULES",
      url: docsUrl("1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c"),
    },
    migrationLog: {
      id: "1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU",
      name: "LOG_20260811_1357_ESAFE_RIVERSIDE_DRIVE_CLEANUP",
      url: docsUrl("1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU"),
    },
  },
  projectWorlds: [
    {
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "esafe-demo",
      displayName: "e-SAFE Catania Project World",
      folders: {
        projectRoot: {
          role: "projectRoot",
          id: "1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE",
          name: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
          url: folderUrl("1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE"),
          canonicalUse: "All e-SAFE files stay under this project root. Never mix with Riverside.",
        },
        inbox: {
          role: "inbox",
          id: "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9",
          name: "00_INBOX",
          url: folderUrl("1xsIITjBwTEE1z7whhub3RnsSXfrxwur9"),
          canonicalUse: "Unclassified new e-SAFE uploads before graph-link review.",
        },
        pendingGraphLink: {
          role: "pendingGraphLink",
          id: "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ",
          name: "01_PENDING_GRAPH_LINK",
          url: folderUrl("1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ"),
          canonicalUse: "e-SAFE files with clear project boundary but pending graph node linkage.",
        },
        byTrade: {
          role: "byTrade",
          id: "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P",
          name: "02_BY_TRADE",
          url: folderUrl("1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P"),
          canonicalUse: "Reviewed e-SAFE files grouped by trade.",
        },
        byType: {
          role: "byType",
          id: "1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9",
          name: "03_BY_TYPE",
          url: folderUrl("1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9"),
          canonicalUse: "Reviewed e-SAFE files grouped by file/media type.",
        },
        auditProvenance: {
          role: "auditProvenance",
          id: "1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz",
          name: "90_AUDIT_PROVENANCE",
          url: folderUrl("1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz"),
          canonicalUse: "e-SAFE migration notes, audit records and provenance evidence.",
        },
        legacySourceLibrary: {
          role: "legacySourceLibrary",
          id: "1jCJW5_dqGMulRopirpyUdlDatyoGA2AN",
          name: "99_LEGACY_IMPORT_20260808_eSAFE_SOURCE_LIBRARY",
          url: folderUrl("1jCJW5_dqGMulRopirpyUdlDatyoGA2AN"),
          canonicalUse: "Legacy e-SAFE source material. Preserve internal structure for provenance.",
        },
      },
    },
    {
      projectId: "RIVERSIDE_DEMO_PROJECT",
      worldId: "dev",
      displayName: "Riverside Demo Project World",
      folders: {
        projectRoot: {
          role: "projectRoot",
          id: "1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g",
          name: "RIVERSIDE_DEMO_PROJECT",
          url: folderUrl("1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g"),
          canonicalUse: "All Riverside files stay under this project root. Never mix with e-SAFE.",
        },
        inbox: {
          role: "inbox",
          id: "1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46",
          name: "00_INBOX",
          url: folderUrl("1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46"),
          canonicalUse: "Unclassified new Riverside uploads before graph-link review.",
        },
        pendingGraphLink: {
          role: "pendingGraphLink",
          id: "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw",
          name: "01_PENDING_GRAPH_LINK",
          url: folderUrl("1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw"),
          canonicalUse: "Riverside files with clear project boundary but pending graph node linkage.",
        },
        byTrade: {
          role: "byTrade",
          id: "1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68",
          name: "02_BY_TRADE",
          url: folderUrl("1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68"),
          canonicalUse: "Reviewed Riverside files grouped by trade.",
        },
        byType: {
          role: "byType",
          id: "14aYunionA4U7DqPdjqelcU7kAGgDse5w",
          name: "03_BY_TYPE",
          url: folderUrl("14aYunionA4U7DqPdjqelcU7kAGgDse5w"),
          canonicalUse: "Reviewed Riverside files grouped by file/media type.",
        },
        auditProvenance: {
          role: "auditProvenance",
          id: "1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a",
          name: "90_AUDIT_PROVENANCE",
          url: folderUrl("1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a"),
          canonicalUse: "Riverside audit records and provenance evidence.",
        },
      },
    },
  ] satisfies NexusCloudProjectWorld[],
} as const;

export function getNexusCloudProjectWorld(
  projectId: NexusCloudProjectId,
  worldId?: NexusCloudWorldId,
): NexusCloudProjectWorld {
  const project = nexusCloudDriveManifest.projectWorlds.find((entry) => entry.projectId === projectId);
  if (!project) {
    throw new Error(`Unknown Nexus Cloud projectId: ${projectId}`);
  }
  if (worldId && project.worldId !== worldId) {
    throw new Error(`Nexus Cloud project/world mismatch: ${projectId} is ${project.worldId}, not ${worldId}`);
  }
  return project;
}

export function resolveNexusCloudFolder(
  projectId: NexusCloudProjectId,
  role: keyof NexusCloudProjectWorld["folders"],
  worldId?: NexusCloudWorldId,
): NexusCloudFolderRef {
  const project = getNexusCloudProjectWorld(projectId, worldId);
  const folder = project.folders[role];
  if (!folder) {
    throw new Error(`Nexus Cloud folder role ${String(role)} is not configured for ${projectId}`);
  }
  return folder;
}

export function resolveNexusCloudRoute(asset: NexusCloudAssetDraft): NexusCloudRouteDecision {
  const project = getNexusCloudProjectWorld(asset.projectId, asset.worldId);
  const warnings: string[] = [];

  let targetFolder: NexusCloudFolderRef;
  if (asset.classificationStatus === "linked_to_graph") {
    targetFolder = project.folders.pendingGraphLink;
    if (!asset.linkedGraphNodeIds.length) {
      throw new Error("linked_to_graph requires at least one linkedGraphNodeId");
    }
  } else if (asset.classificationStatus === "classified_by_trade") {
    targetFolder = project.folders.byTrade;
    if (!asset.tradeId) warnings.push("classified_by_trade asset has no tradeId yet.");
  } else if (asset.classificationStatus === "classified_by_type") {
    targetFolder = project.folders.byType;
  } else if (asset.classificationStatus === "audit_only") {
    targetFolder = project.folders.auditProvenance;
  } else if (asset.classificationStatus === "pending_graph_link") {
    targetFolder = project.folders.pendingGraphLink;
  } else {
    targetFolder = project.folders.inbox;
  }

  return {
    project,
    targetFolder,
    classificationStatus: asset.classificationStatus,
    requiresGraphLinkReview: asset.classificationStatus !== "linked_to_graph",
    allowedGraphLink: asset.classificationStatus === "linked_to_graph" && asset.linkedGraphNodeIds.length > 0,
    warnings,
  };
}

export function assertNoCrossProjectCloudRoute(asset: NexusCloudAssetDraft, folderId: string) {
  const route = resolveNexusCloudRoute(asset);
  const projectFolderIds = Object.values(route.project.folders).map((folder) => folder.id);
  if (!projectFolderIds.includes(folderId)) {
    throw new Error(
      `Nexus Cloud route blocked: ${folderId} is not inside ${asset.projectId}/${asset.worldId}`,
    );
  }
  return route;
}

export function isKnownNexusCloudProjectWorld(projectId: string, worldId: string) {
  return nexusCloudDriveManifest.projectWorlds.some(
    (entry) => entry.projectId === projectId && entry.worldId === worldId,
  );
}
