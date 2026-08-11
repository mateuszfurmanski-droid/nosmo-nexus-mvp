import {
  NEXUS_CLOUD_DRIVE_SCHEMA,
  nexusCloudDriveManifest,
  type NexusCloudProjectId,
  type NexusCloudWorldId,
} from "../cloud/nexus-cloud-drive-manifest";

export type { NexusCloudProjectId, NexusCloudWorldId } from "../cloud/nexus-cloud-drive-manifest";

export type NexusGoogleDriveFolderRole =
  | "cloudRoot"
  | "androidWorkModeInbox"
  | "unclearPhotoReview"
  | "projectCandidateReview"
  | "contactsCalendarReview"
  | "privateDoNotUpload"
  | "projectWorldsRoot"
  | "sharedRegistries"
  | "connectorExports"
  | "auditProvenance"
  | "projectRoot"
  | "projectInbox"
  | "pendingGraphLink"
  | "byTrade"
  | "byType"
  | "projectAudit";

export interface NexusGoogleDriveFolderRef {
  role: NexusGoogleDriveFolderRole;
  id: string;
  title: string;
  url: string;
  canonicalUse: string;
}

export interface NexusGoogleDriveProjectRoute {
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  displayName: string;
  projectRoot: NexusGoogleDriveFolderRef;
  inbox: NexusGoogleDriveFolderRef;
  pendingGraphLink: NexusGoogleDriveFolderRef;
  byTrade: NexusGoogleDriveFolderRef;
  byType: NexusGoogleDriveFolderRef;
  audit: NexusGoogleDriveFolderRef;
}

export interface NexusGoogleDriveRegistryRef {
  id: string;
  title: string;
  url: string;
  role: "assetIndex" | "routingRules" | "migrationLog";
}

function folder(
  role: NexusGoogleDriveFolderRole,
  id: string,
  title: string,
  canonicalUse: string,
): NexusGoogleDriveFolderRef {
  return {
    role,
    id,
    title,
    url: `https://drive.google.com/drive/folders/${id}`,
    canonicalUse,
  };
}

function fromManifestFolder(
  role: NexusGoogleDriveFolderRole,
  source: { id: string; name: string; url: string; canonicalUse: string },
): NexusGoogleDriveFolderRef {
  return {
    role,
    id: source.id,
    title: source.name,
    url: source.url,
    canonicalUse: source.canonicalUse,
  };
}

function projectRoute(projectId: NexusCloudProjectId): NexusGoogleDriveProjectRoute {
  const project = nexusCloudDriveManifest.projectWorlds.find((entry) => entry.projectId === projectId);
  if (!project) throw new Error(`Missing canonical Nexus Cloud project world: ${projectId}`);

  return {
    projectId: project.projectId,
    worldId: project.worldId,
    displayName: project.displayName,
    projectRoot: fromManifestFolder("projectRoot", project.folders.projectRoot),
    inbox: fromManifestFolder("projectInbox", project.folders.inbox),
    pendingGraphLink: fromManifestFolder("pendingGraphLink", project.folders.pendingGraphLink),
    byTrade: fromManifestFolder("byTrade", project.folders.byTrade),
    byType: fromManifestFolder("byType", project.folders.byType),
    audit: fromManifestFolder("projectAudit", project.folders.auditProvenance),
  };
}

const projectRoutes: NexusGoogleDriveProjectRoute[] = [
  projectRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA"),
  projectRoute("RIVERSIDE_DEMO_PROJECT"),
];

/**
 * Compatibility facade for the existing Work Mode / Cloud UI.
 * Canonical project-world folder identity lives only in
 * ../cloud/nexus-cloud-drive-manifest.ts.
 *
 * Global Android review folders are intake/review surfaces, not project storage.
 */
export const NEXUS_GOOGLE_DRIVE_CLOUD_CONFIG = {
  schema: NEXUS_CLOUD_DRIVE_SCHEMA,
  providerId: "nexus-google-drive-personal-cloud-v1",
  providerKind: "google-drive",
  status: "configured-boundary",
  sourceOfTruth: "NEXUS_CLOUD_ASSET_INDEX + NEXUS_CLOUD_ROUTING_RULES",
  root: fromManifestFolder("cloudRoot", nexusCloudDriveManifest.roots.cloudRoot),
  globalFolders: {
    androidWorkModeInbox: folder(
      "androidWorkModeInbox",
      "1yyVwt4WGHUlP81XZN_38RT9ic95A0YVh",
      "00_INBOX_FROM_ANDROID_WORK_MODE",
      "Initial Android Work Mode intake only. Files still require project resolution before canonical storage.",
    ),
    unclearPhotoReview: folder(
      "unclearPhotoReview",
      "1teqLeR0bQJmSHyvkRmKwBODdoRrseJs5",
      "02_REVIEW_UNCLEAR_PHOTOS",
      "Photos or evidence requiring manual classification.",
    ),
    projectCandidateReview: folder(
      "projectCandidateReview",
      "1OTapFre2kpxa4cELr_dES7V-IcJm5j4L",
      "03_OTHER_PROJECT_CANDIDATES",
      "Possible project material that has not reached a project boundary decision.",
    ),
    contactsCalendarReview: folder(
      "contactsCalendarReview",
      "17sZPa2UPQSKgNaDPH28epfKFhPqqHCbd",
      "04_CONTACTS_CALENDAR_REVIEW",
      "Reviewed phone-derived context, not raw phone authority.",
    ),
    privateDoNotUpload: folder(
      "privateDoNotUpload",
      "1aJEXvV92AJC06t1X3PBjWwmfn_ZjthxC",
      "05_PRIVATE_DO_NOT_UPLOAD",
      "Explicit privacy exclusion bucket. Never ingest into Project Graph.",
    ),
    projectWorldsRoot: fromManifestFolder(
      "projectWorldsRoot",
      nexusCloudDriveManifest.roots.projectWorldsRoot,
    ),
    sharedRegistries: fromManifestFolder(
      "sharedRegistries",
      nexusCloudDriveManifest.roots.sharedRegistries,
    ),
    connectorExports: fromManifestFolder(
      "connectorExports",
      nexusCloudDriveManifest.roots.connectorExports,
    ),
  },
  registries: {
    assetIndex: {
      role: "assetIndex",
      id: nexusCloudDriveManifest.registries.assetIndex.id,
      title: nexusCloudDriveManifest.registries.assetIndex.name,
      url: nexusCloudDriveManifest.registries.assetIndex.url,
    },
    routingRules: {
      role: "routingRules",
      id: nexusCloudDriveManifest.registries.routingRules.id,
      title: nexusCloudDriveManifest.registries.routingRules.name,
      url: nexusCloudDriveManifest.registries.routingRules.url,
    },
    migrationLog: {
      role: "migrationLog",
      id: nexusCloudDriveManifest.registries.migrationLog.id,
      title: nexusCloudDriveManifest.registries.migrationLog.name,
      url: nexusCloudDriveManifest.registries.migrationLog.url,
    },
  } satisfies Record<string, NexusGoogleDriveRegistryRef>,
  projectRoutes,
  hardRules: [
    "Resolve projectId and worldId before canonical project storage.",
    "Do not store project files directly in 00_NEXUS_PERSONAL_CLOUD.",
    "If project classification is uncertain, use a review inbox instead of another project root.",
    "No e-SAFE file may be stored in Riverside folders.",
    "No Riverside file may be stored in e-SAFE folders.",
    "Person Card evidence may link to a person, but it never replaces the projectId boundary.",
    "Connector exports are staging inputs, not canonical Project Graph authority by themselves.",
  ],
} as const;

export function resolveNexusGoogleDriveProjectRoute(
  projectId: string,
  worldId?: string,
): NexusGoogleDriveProjectRoute | null {
  return projectRoutes.find((route) => {
    if (route.projectId !== projectId) return false;
    if (worldId && route.worldId !== worldId) return false;
    return true;
  }) ?? null;
}

export function requireNexusGoogleDriveProjectRoute(
  projectId: string,
  worldId?: string,
): NexusGoogleDriveProjectRoute {
  const route = resolveNexusGoogleDriveProjectRoute(projectId, worldId);
  if (!route) {
    throw new Error(
      `No Nexus Google Drive project route for projectId=${projectId}${worldId ? ` worldId=${worldId}` : ""}.`,
    );
  }
  return route;
}

export function isNexusGoogleDriveProjectBoundaryValid(
  projectId: string,
  worldId: string,
  folderId: string,
): boolean {
  const route = resolveNexusGoogleDriveProjectRoute(projectId, worldId);
  if (!route) return false;
  return [
    route.projectRoot.id,
    route.inbox.id,
    route.pendingGraphLink.id,
    route.byTrade.id,
    route.byType.id,
    route.audit.id,
  ].includes(folderId);
}
