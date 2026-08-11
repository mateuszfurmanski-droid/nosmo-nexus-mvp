import {
  NEXUS_CLOUD_DRIVE_SCHEMA,
  nexusCloudDriveManifest,
  type NexusCloudProjectId,
  type NexusCloudWorldId,
} from "../cloud/nexus-cloud-drive-manifest";

export type NexusFileLoaderCloudRoute =
  | {
      mode: "drive-managed";
      manifestSchema: typeof NEXUS_CLOUD_DRIVE_SCHEMA;
      projectId: NexusCloudProjectId;
      worldId: NexusCloudWorldId;
      classificationStatus: "pending_graph_link";
      targetFolderId: string;
      targetFolderName: "01_PENDING_GRAPH_LINK";
      targetFolderUrl: string;
    }
  | {
      mode: "provider-neutral";
      projectId: string;
      worldId?: string;
    };

function findDriveManagedProject(projectId: string) {
  return nexusCloudDriveManifest.projectWorlds.find((entry) => entry.projectId === projectId);
}

export function isDriveManagedNexusProject(projectId: string): projectId is NexusCloudProjectId {
  return Boolean(findDriveManagedProject(projectId));
}

/**
 * Resolves the logical Cloud placement before File Loader queues or writes data.
 *
 * Google Drive is the current practical Cloud Memory adapter for the two
 * configured Project Worlds. The storage provider remains replaceable: this
 * function provides routing authority, not Google API credentials or a binary
 * write implementation.
 */
export function resolveFileLoaderCloudRoute(
  projectId: string,
  worldId?: string,
): NexusFileLoaderCloudRoute {
  const project = findDriveManagedProject(projectId);

  // Projects not present in the current Drive manifest remain on the generic
  // provider-neutral boundary. Never guess them into e-SAFE or Riverside.
  if (!project) {
    return {
      mode: "provider-neutral",
      projectId,
      worldId: worldId?.trim() || undefined,
    };
  }

  const suppliedWorldId = worldId?.trim();
  if (!suppliedWorldId) {
    throw new Error(`NEXUS_CLOUD_WORLD_REQUIRED:${projectId}`);
  }
  if (suppliedWorldId !== project.worldId) {
    throw new Error(
      `NEXUS_CLOUD_PROJECT_WORLD_MISMATCH:${projectId}:${suppliedWorldId}:${project.worldId}`,
    );
  }

  return {
    mode: "drive-managed",
    manifestSchema: NEXUS_CLOUD_DRIVE_SCHEMA,
    projectId: project.projectId,
    worldId: project.worldId,
    classificationStatus: "pending_graph_link",
    targetFolderId: project.folders.pendingGraphLink.id,
    targetFolderName: "01_PENDING_GRAPH_LINK",
    targetFolderUrl: project.folders.pendingGraphLink.url,
  };
}
