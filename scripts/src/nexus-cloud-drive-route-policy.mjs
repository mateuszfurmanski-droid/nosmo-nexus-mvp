import { readFileSync } from "node:fs";

const MANIFEST_SCHEMA = "nexus-cloud-drive-manifest/v1";
const manifestUrl = new URL(
  "../../artifacts/nosmo-nexus/src/cloud/nexus-cloud-drive-manifest.v1.json",
  import.meta.url,
);

function loadManifest() {
  const parsed = JSON.parse(readFileSync(manifestUrl, "utf8"));
  if (parsed?.schema !== MANIFEST_SCHEMA || !Array.isArray(parsed?.projectWorlds)) {
    throw new Error("NEXUS_CLOUD_DRIVE_MANIFEST_INVALID");
  }
  return parsed;
}

const manifest = loadManifest();

function findProject(projectId) {
  return manifest.projectWorlds.find((entry) => entry?.projectId === projectId) ?? null;
}

export function nexusCloudDriveManifestStatus() {
  return {
    schema: manifest.schema,
    verifiedAt: manifest.verifiedAt,
    configuredProjectWorlds: manifest.projectWorlds.length,
  };
}

/**
 * Server-side project/world boundary using the same JSON data consumed by the
 * typed browser manifest. Unknown projects remain provider-neutral; configured
 * Drive Project Worlds fail closed when worldId is absent or mismatched.
 */
export function resolveNexusServerCloudRoute(projectId, worldId) {
  const project = findProject(projectId);
  if (!project) {
    return {
      mode: "provider-neutral",
      projectId,
      worldId: typeof worldId === "string" && worldId.trim() ? worldId.trim() : undefined,
    };
  }

  const suppliedWorldId = typeof worldId === "string" ? worldId.trim() : "";
  if (!suppliedWorldId) {
    throw new Error(`NEXUS_CLOUD_WORLD_REQUIRED:${projectId}`);
  }
  if (suppliedWorldId !== project.worldId) {
    throw new Error(
      `NEXUS_CLOUD_PROJECT_WORLD_MISMATCH:${projectId}:${suppliedWorldId}:${project.worldId}`,
    );
  }

  const pending = project.folders?.pendingGraphLink;
  if (!pending?.id || !pending?.url) {
    throw new Error(`NEXUS_CLOUD_PENDING_GRAPH_ROUTE_MISSING:${projectId}`);
  }

  return {
    mode: "drive-managed",
    manifestSchema: manifest.schema,
    projectId: project.projectId,
    worldId: project.worldId,
    classificationStatus: "pending_graph_link",
    targetFolderId: pending.id,
    targetFolderUrl: pending.url,
  };
}
