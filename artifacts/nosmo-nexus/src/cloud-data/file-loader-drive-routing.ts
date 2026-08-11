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
 * Resolve the logical Cloud placement before File Loader queues or writes data.
 * Google Drive is the current practical Cloud Memory adapter for the configured
 * Project Worlds. This is routing authority only; it is not a Google API write.
 */
export function resolveFileLoaderCloudRoute(
  projectId: string,
  worldId?: string,
): NexusFileLoaderCloudRoute {
  const project = findDriveManagedProject(projectId);

  // Never guess an unrelated/generic project into e-SAFE or Riverside.
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
