import type {
  NexusConnectorAccountRecord,
  NexusConnectorDefinitionRecord,
} from "../../../../src/data/schemas/connector.schema";
import type {
  NexusCloudProviderTargetMapping,
} from "../../../../src/core/storage/cloudProviderAdapterContract";
import type {
  NexusCloudRoutingIndex,
  NexusCloudTargetRole,
} from "../../../../src/core/storage/cloudRouting";

export const NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_ENV =
  "NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON" as const;

const SECRET_REFERENCE_PATTERN = /^NEXUS_SECRET_[A-Z0-9_]+$/;
const TARGET_ROLES: NexusCloudTargetRole[] = [
  "00_INBOX",
  "01_PENDING_GRAPH_LINK",
  "02_BY_TRADE",
  "03_BY_TYPE",
  "99_AUDIT",
];

export interface NexusCloudGoogleDriveRuntimeConfig {
  routingIndex: NexusCloudRoutingIndex;
  connectorDefinition: NexusConnectorDefinitionRecord;
  connectorAccount: NexusConnectorAccountRecord;
  targetMappings: NexusCloudProviderTargetMapping[];
}

export class NexusCloudRuntimeConfigError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NexusCloudRuntimeConfigError";
  }
}

const asObject = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NexusCloudRuntimeConfigError(`NEXUS_CLOUD_CONFIG_INVALID_${label}`);
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown, label: string, maxLength = 512): string => {
  if (typeof value !== "string") {
    throw new NexusCloudRuntimeConfigError(`NEXUS_CLOUD_CONFIG_INVALID_${label}`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new NexusCloudRuntimeConfigError(`NEXUS_CLOUD_CONFIG_INVALID_${label}`);
  }
  return normalized;
};

/**
 * Load provider authority from server configuration only.
 *
 * The browser never supplies Drive folder IDs, connector account IDs, provider
 * credentials or secret references. Project/world membership and semantic target
 * role are resolved separately through the canonical Cloud routing contract.
 */
export function loadNexusCloudGoogleDriveRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): NexusCloudGoogleDriveRuntimeConfig {
  const rawText = env[NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_ENV];
  if (!rawText?.trim()) {
    throw new NexusCloudRuntimeConfigError(
      "NEXUS_CLOUD_GOOGLE_DRIVE_RUNTIME_NOT_CONFIGURED",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new NexusCloudRuntimeConfigError(
      "NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_INVALID_JSON",
      error,
    );
  }

  const root = asObject(parsed, "ROOT");
  if (root.schema !== "nexus-cloud-google-drive-runtime/v1") {
    throw new NexusCloudRuntimeConfigError("NEXUS_CLOUD_CONFIG_SCHEMA_MISMATCH");
  }

  const connectorDefinitionId = asString(
    root.connectorDefinitionId,
    "CONNECTOR_DEFINITION_ID",
    128,
  );
  const connectorAccountId = asString(
    root.connectorAccountId,
    "CONNECTOR_ACCOUNT_ID",
    128,
  );
  const tenantId = asString(root.tenantId, "TENANT_ID", 128);
  const secretReference = asString(root.secretReference, "SECRET_REFERENCE", 128);

  if (!SECRET_REFERENCE_PATTERN.test(secretReference)) {
    throw new NexusCloudRuntimeConfigError(
      "NEXUS_CLOUD_CONFIG_SECRET_REFERENCE_REJECTED",
    );
  }

  if (!Array.isArray(root.projects) || root.projects.length === 0) {
    throw new NexusCloudRuntimeConfigError("NEXUS_CLOUD_CONFIG_PROJECTS_REQUIRED");
  }
  if (root.projects.length > 100) {
    throw new NexusCloudRuntimeConfigError("NEXUS_CLOUD_CONFIG_TOO_MANY_PROJECT_WORLDS");
  }

  const projectWorldIds = new Map<string, Set<string>>();
  const worlds: NexusCloudRoutingIndex["worlds"] = [];
  const targetMappings: NexusCloudProviderTargetMapping[] = [];
  const seenWorlds = new Set<string>();

  for (const item of root.projects) {
    const projectConfig = asObject(item, "PROJECT");
    const projectId = asString(projectConfig.projectId, "PROJECT_ID", 128);
    const worldId = asString(projectConfig.worldId, "WORLD_ID", 128);
    const pairKey = `${projectId}\n${worldId}`;

    if (seenWorlds.has(pairKey)) {
      throw new NexusCloudRuntimeConfigError(
        "NEXUS_CLOUD_CONFIG_DUPLICATE_PROJECT_WORLD",
      );
    }
    seenWorlds.add(pairKey);

    const worldsForProject = projectWorldIds.get(projectId) ?? new Set<string>();
    worldsForProject.add(worldId);
    projectWorldIds.set(projectId, worldsForProject);
    worlds.push({ id: worldId, projectId });

    const targets = asObject(projectConfig.targets, "TARGETS");
    for (const targetRole of TARGET_ROLES) {
      const rawTarget = targets[targetRole];
      if (rawTarget == null) continue;

      const providerTargetId = asString(
        rawTarget,
        `TARGET_${targetRole}`,
        512,
      );
      targetMappings.push({
        id: `cloud-target:${projectId}:${worldId}:${targetRole}`,
        projectId,
        worldId,
        targetRole,
        connectorAccountId,
        providerSourceSystem: "google-drive",
        providerTargetId,
        enabled: true,
      });
    }
  }

  if (targetMappings.length === 0) {
    throw new NexusCloudRuntimeConfigError("NEXUS_CLOUD_CONFIG_TARGETS_REQUIRED");
  }

  const now = new Date().toISOString();
  const routingIndex: NexusCloudRoutingIndex = {
    projects: [...projectWorldIds.entries()].map(([id, worldIds]) => ({
      id,
      worldIds: [...worldIds],
    })),
    worlds,
  };

  const connectorDefinition: NexusConnectorDefinitionRecord = {
    id: connectorDefinitionId,
    status: "active",
    title: "Google Drive Nexus Cloud",
    createdAt: now,
    updatedAt: now,
    sourceSystem: "nexus",
    confidence: "confirmed",
    provider: "google",
    product: "drive",
    connectorVersion: "nexus-cloud-google-drive-runtime/v1",
    lifecycleState: "LIVE",
    integrationLevel: 5,
    authenticationMethod: "oauth",
    readableObjectTypes: ["File"],
    writableObjectTypes: ["File"],
    readableFields: ["id", "name", "mimeType", "size", "webViewLink", "modifiedTime", "version", "parents"],
    writableFields: ["name", "parents", "appProperties", "binary"],
    eventSupport: [],
    licenceRequirements: [],
    requiredCustomerRoles: [],
    sourceOfRecordRules: [
      "Nexus canonical identity remains separate from Google Drive file identity",
    ],
    conflictPolicy: "manual-review",
    syncPolicy: "manual",
    connectorOwner: "NOSMO Nexus server runtime",
    lastVerifiedAt: now,
  };

  const connectorAccount: NexusConnectorAccountRecord = {
    id: connectorAccountId,
    status: "active",
    title: "Google Drive Nexus Cloud account",
    createdAt: now,
    updatedAt: now,
    createdBy: "nexus-server-config",
    sourceSystem: "nexus",
    confidence: "confirmed",
    connectorDefinitionId,
    tenantId,
    connectionState: "connected",
    allowedScopes: ["cloud.file.write"],
    secretReference,
    freshnessState: "LIVE",
  };

  return {
    routingIndex,
    connectorDefinition,
    connectorAccount,
    targetMappings,
  };
}
