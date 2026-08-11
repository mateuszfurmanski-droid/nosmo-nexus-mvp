import rawManifest from "./nexus-cloud-drive-manifest.v1.json";

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

type NexusCloudDriveManifest = {
  schema: typeof NEXUS_CLOUD_DRIVE_SCHEMA;
  verifiedAt: string;
  purpose: string;
  hardRule: string;
  roots: {
    cloudRoot: NexusCloudFolderRef;
    projectWorldsRoot: NexusCloudFolderRef;
    sharedRegistries: NexusCloudFolderRef;
    connectorExports: NexusCloudFolderRef;
  };
  registries: {
    assetIndex: { id: string; name: string; url: string; columns: string[] };
    routingRules: { id: string; name: string; url: string };
    migrationLog: { id: string; name: string; url: string };
  };
  projectWorlds: NexusCloudProjectWorld[];
};

if (rawManifest.schema !== NEXUS_CLOUD_DRIVE_SCHEMA) {
  throw new Error(`Unsupported Nexus Cloud Drive manifest schema: ${rawManifest.schema}`);
}

export const nexusCloudDriveManifest = rawManifest as unknown as NexusCloudDriveManifest;

export function getNexusCloudProjectWorld(
  projectId: NexusCloudProjectId,
  worldId?: NexusCloudWorldId,
): NexusCloudProjectWorld {
  const project = nexusCloudDriveManifest.projectWorlds.find((entry) => entry.projectId === projectId);
  if (!project) throw new Error(`Unknown Nexus Cloud projectId: ${projectId}`);
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
  if (!folder) throw new Error(`Nexus Cloud folder role ${String(role)} is not configured for ${projectId}`);
  return folder;
}

export function resolveNexusCloudRoute(asset: NexusCloudAssetDraft): NexusCloudRouteDecision {
  const project = getNexusCloudProjectWorld(asset.projectId, asset.worldId);
  const warnings: string[] = [];

  let targetFolder: NexusCloudFolderRef;
  if (asset.classificationStatus === "linked_to_graph") {
    targetFolder = project.folders.pendingGraphLink;
    if (!asset.linkedGraphNodeIds.length) throw new Error("linked_to_graph requires at least one linkedGraphNodeId");
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
    throw new Error(`Nexus Cloud route blocked: ${folderId} is not inside ${asset.projectId}/${asset.worldId}`);
  }
  return route;
}

export function isKnownNexusCloudProjectWorld(projectId: string, worldId: string) {
  return nexusCloudDriveManifest.projectWorlds.some(
    (entry) => entry.projectId === projectId && entry.worldId === worldId,
  );
}
