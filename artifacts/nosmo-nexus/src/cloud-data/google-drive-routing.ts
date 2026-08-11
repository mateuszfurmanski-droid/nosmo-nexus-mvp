export type NexusCloudProjectId = "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA" | "RIVERSIDE_DEMO_PROJECT";
export type NexusCloudWorldId = "esafe-demo" | "dev";

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

function folder(role: NexusGoogleDriveFolderRole, id: string, title: string, canonicalUse: string): NexusGoogleDriveFolderRef {
  return {
    role,
    id,
    title,
    url: `https://drive.google.com/drive/folders/${id}`,
    canonicalUse,
  };
}

function doc(role: NexusGoogleDriveRegistryRef["role"], id: string, title: string, url: string): NexusGoogleDriveRegistryRef {
  return { role, id, title, url };
}

export const NEXUS_GOOGLE_DRIVE_CLOUD_CONFIG = {
  providerId: "nexus-google-drive-personal-cloud-v1",
  providerKind: "google-drive",
  status: "configured-boundary",
  sourceOfTruth: "NEXUS_CLOUD_ASSET_INDEX + NEXUS_CLOUD_ROUTING_RULES",
  root: folder(
    "cloudRoot",
    "1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0",
    "00_NEXUS_PERSONAL_CLOUD",
    "Top-level Nexus cloud memory root. Do not store project files directly here.",
  ),
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
    projectWorldsRoot: folder(
      "projectWorldsRoot",
      "1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q",
      "10_PROJECT_WORLDS",
      "Every project gets its own child folder. This is the project separation boundary.",
    ),
    sharedRegistries: folder(
      "sharedRegistries",
      "1h-sNqC3983nfG1IaUe6SXWeWnJLVrcOx",
      "20_SHARED_REGISTRIES",
      "Indexes, manifests and provider-neutral registries.",
    ),
    connectorExports: folder(
      "connectorExports",
      "1gmhM6WCj-m4Ms_JK7pdvmYP32Id9JkKo",
      "30_CONNECTOR_EXPORTS",
      "External connector staging. Not canonical by itself.",
    ),
    auditProvenance: folder(
      "auditProvenance",
      "1XB3sxhtqtsGHYgXS4HhEs-BgLGaj56A9",
      "90_AUDIT_PROVENANCE",
      "Cloud-level audit and migration provenance.",
    ),
  },
  registries: {
    assetIndex: doc(
      "assetIndex",
      "1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI",
      "NEXUS_CLOUD_ASSET_INDEX",
      "https://docs.google.com/spreadsheets/d/1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI/edit",
    ),
    routingRules: doc(
      "routingRules",
      "1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c",
      "NEXUS_CLOUD_ROUTING_RULES",
      "https://docs.google.com/document/d/1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c/edit",
    ),
    migrationLog: doc(
      "migrationLog",
      "1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU",
      "LOG_20260811_1357_ESAFE_RIVERSIDE_DRIVE_CLEANUP",
      "https://docs.google.com/document/d/1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU/edit",
    ),
  },
  projectRoutes: [
    {
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "esafe-demo",
      displayName: "e-SAFE Catania Project World",
      projectRoot: folder(
        "projectRoot",
        "1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE",
        "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
        "All e-SAFE files stay under this project root. Never mix with Riverside.",
      ),
      inbox: folder("projectInbox", "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9", "00_INBOX", "Project-specific intake pending graph link."),
      byTrade: folder("byTrade", "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P", "02_BY_TRADE", "Reviewed files classified by trade."),
      byType: folder("byType", "1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9", "03_BY_TYPE", "Optional secondary grouping by file type."),
      audit: folder("projectAudit", "1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz", "90_AUDIT_PROVENANCE", "Project-specific provenance and migration notes."),
    },
    {
      projectId: "RIVERSIDE_DEMO_PROJECT",
      worldId: "dev",
      displayName: "Riverside Demo Project World",
      projectRoot: folder(
        "projectRoot",
        "1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g",
        "RIVERSIDE_DEMO_PROJECT",
        "All Riverside files stay under this project root. Never mix with e-SAFE.",
      ),
      inbox: folder("projectInbox", "1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46", "00_INBOX", "Project-specific intake pending graph link."),
      byTrade: folder("byTrade", "1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68", "02_BY_TRADE", "Reviewed files classified by trade."),
      byType: folder("byType", "14aYunionA4U7DqPdjqelcU7kAGgDse5w", "03_BY_TYPE", "Optional secondary grouping by file type."),
      audit: folder("projectAudit", "1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a", "90_AUDIT_PROVENANCE", "Project-specific provenance and migration notes."),
    },
  ],
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

export function resolveNexusGoogleDriveProjectRoute(projectId: string, worldId?: string): NexusGoogleDriveProjectRoute | null {
  return NEXUS_GOOGLE_DRIVE_CLOUD_CONFIG.projectRoutes.find((route) => {
    if (route.projectId !== projectId) return false;
    if (worldId && route.worldId !== worldId) return false;
    return true;
  }) ?? null;
}

export function requireNexusGoogleDriveProjectRoute(projectId: string, worldId?: string): NexusGoogleDriveProjectRoute {
  const route = resolveNexusGoogleDriveProjectRoute(projectId, worldId);
  if (!route) throw new Error(`No Nexus Google Drive project route for projectId=${projectId}${worldId ? ` worldId=${worldId}` : ""}.`);
  return route;
}

export function isNexusGoogleDriveProjectBoundaryValid(projectId: string, worldId: string, folderId: string): boolean {
  const route = resolveNexusGoogleDriveProjectRoute(projectId, worldId);
  if (!route) return false;
  return [route.projectRoot.id, route.inbox.id, route.byTrade.id, route.byType.id, route.audit.id].includes(folderId);
}
