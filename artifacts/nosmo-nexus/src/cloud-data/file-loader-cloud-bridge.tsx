import { useEffect, useMemo, useRef } from "react";
import {
  classifyNexusAssetKind,
  createNexusAssetLinkId,
  createStableNexusAssetId,
  createStableNexusFileId,
  normaliseNexusIdPart,
  type NexusAsset,
  type NexusAssetLink,
  type NexusAssetSourceModule,
  type NexusAssetTargetType,
  type NexusChecksum,
} from "./nexus-asset-contracts";
import { computeSha256, upsertNexusAssetRegistryEntry } from "./asset-registry";
import { createDemoManagerParticipation, resolveNexusAssetPermission } from "./asset-permissions";
import {
  enqueueNexusOfflineUpload,
  markNexusOfflineUploadFailed,
  markNexusOfflineUploadSynced,
  markNexusOfflineUploadUploading,
  readPendingNexusOfflineUploads,
  type NexusFileUploadExplicitTarget,
  type NexusFileUploadRequestDetailBase,
  type NexusQueuedUploadRecord,
} from "./offline-upload-queue";
import { resolveFileLoaderCloudRoute } from "./file-loader-drive-routing";
import { createNexusStorageProvider } from "./storage-provider-resolver";
import type { NexusStorageProvider } from "./storage-provider";

const DEMO_UPLOADER_PERSON_ID = "person-demo-nexus-manager";
const FILE_UPLOAD_REQUEST_EVENT = "nexus:file-upload-request";
const ASSET_UPLOADED_EVENT = "nexus:asset-uploaded";
const ASSET_UPLOAD_FAILED_EVENT = "nexus:asset-upload-failed";
const ASSET_UPLOAD_QUEUED_EVENT = "nexus:asset-upload-queued";
const PROJECT_REGISTRY_REFRESH_EVENT = "nexus:project-registry-refresh";

type ExplicitUploadTarget = NexusFileUploadExplicitTarget;

type FileUploadRequestDetail = NexusFileUploadRequestDetailBase & {
  files?: File[];
};

type GraphStateDetail = {
  selectedId?: string;
};

type UploadableFile = {
  content: Blob;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

type UploadResult = {
  asset: NexusAsset;
  links: NexusAssetLink[];
};

function isFileArray(value: unknown): value is File[] {
  return Array.isArray(value) && typeof File !== "undefined" && value.every((item) => item instanceof File);
}

function toUploadableFile(file: File): UploadableFile {
  return {
    content: file,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified,
  };
}

function toUploadableQueuedFile(record: NexusQueuedUploadRecord): UploadableFile {
  return {
    content: record.content,
    name: record.file.name,
    type: record.file.type || "application/octet-stream",
    size: record.file.size,
    lastModified: record.file.lastModified,
  };
}

function isBrowserOnline() {
  return typeof navigator.onLine !== "boolean" || navigator.onLine;
}

function inferSelectedTarget(selectedId: string | undefined, projectId: string | undefined): ExplicitUploadTarget | null {
  if (!selectedId || selectedId === projectId) return null;
  const id = selectedId.toLowerCase();
  if (id.startsWith("task") || id.startsWith("t-") || id.includes("task")) return { targetType: "task", targetId: selectedId };
  if (id.includes("door")) return { targetType: "door", targetId: selectedId };
  if (id.includes("snag") || id.includes("issue")) return { targetType: "snag", targetId: selectedId };
  if (id.includes("insp")) return { targetType: "inspection", targetId: selectedId };
  if (id.startsWith("p-") || id.includes("person")) return { targetType: "person", targetId: selectedId };
  if (id.startsWith("nxs-") || id.includes("asset") || id.includes("mep")) return { targetType: "asset", targetId: selectedId };
  return { targetType: "asset", targetId: selectedId };
}

function createLinks(
  detail: NexusFileUploadRequestDetailBase,
  assetId: string,
  sourceModule: NexusAssetSourceModule,
  projectId: string,
  selectedId: string | undefined,
  createdByPersonId: string,
  createdAt: string,
): NexusAssetLink[] {
  const rawTargets: ExplicitUploadTarget[] = [
    { targetType: "project", targetId: projectId },
  ];

  if (detail.tradeId) rawTargets.push({ targetType: "trade", targetId: detail.tradeId });
  if (detail.target) rawTargets.push(detail.target);
  if (detail.taskId) rawTargets.push({ targetType: "task", targetId: detail.taskId });
  if (detail.objectId) rawTargets.push({ targetType: "asset", targetId: detail.objectId });
  if (detail.inspectionId) rawTargets.push({ targetType: "inspection", targetId: detail.inspectionId });
  if (detail.personId) rawTargets.push({ targetType: "person", targetId: detail.personId });
  if (detail.workPackageId) rawTargets.push({ targetType: "work_package", targetId: detail.workPackageId });

  const inferred = inferSelectedTarget(selectedId, projectId);
  if (inferred) rawTargets.push(inferred);

  const seen = new Set<string>();
  return rawTargets
    .filter((target) => {
      const key = `${target.targetType}:${target.targetId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((target) => ({
      linkId: createNexusAssetLinkId(assetId, target.targetType, target.targetId),
      assetId,
      projectId,
      targetType: target.targetType,
      targetId: target.targetId,
      role: target.targetType === "project" ? "primary_project_media" : "reference",
      sourceModule,
      createdByPersonId,
      createdAt,
    }));
}

function dispatchUploadFailure(filename: string, message: string) {
  window.dispatchEvent(new CustomEvent(ASSET_UPLOAD_FAILED_EVENT, { detail: { filename, message } }));
}

function dispatchUploadQueued(record: NexusQueuedUploadRecord) {
  window.dispatchEvent(new CustomEvent(ASSET_UPLOAD_QUEUED_EVENT, {
    detail: {
      filename: record.file.name,
      projectId: record.projectId,
      queueItemId: record.queueItemId,
      attempts: record.attempts,
    },
  }));
}

async function uploadToNexusCloudDataLayer(
  provider: NexusStorageProvider,
  detail: NexusFileUploadRequestDetailBase & { projectId: string },
  file: UploadableFile,
  selectedId: string | undefined,
): Promise<UploadResult> {
  const projectId = detail.projectId;

  resolveFileLoaderCloudRoute(projectId, detail.worldId);

  const sourceModule = detail.sourceModule ?? "file-loader";
  const uploadedByPersonId = detail.uploadedByPersonId ?? DEMO_UPLOADER_PERSON_ID;
  const participation = createDemoManagerParticipation(uploadedByPersonId, projectId);
  const checksum: NexusChecksum = { algorithm: "sha256", value: await computeSha256(file.content) };
  const assetId = createStableNexusAssetId(projectId, checksum);
  const fileId = createStableNexusFileId(assetId, file.name);
  const objectKey = `${normaliseNexusIdPart(projectId)}/${assetId}/${fileId}`;
  const now = new Date().toISOString();

  const permission = resolveNexusAssetPermission({
    viewerPersonId: uploadedByPersonId,
    projectId,
    permission: "asset:write",
    participation,
    targetType: "project",
    targetId: projectId,
  });

  if (!permission.allowed) throw new Error(permission.reason);

  const stored = await provider.putObject({
    scope: { projectId, worldId: detail.worldId, assetId, fileId },
    objectKey,
    content: file.content,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    checksum,
  });

  const links = createLinks(
    detail,
    assetId,
    sourceModule,
    projectId,
    selectedId,
    uploadedByPersonId,
    now,
  );

  const asset: NexusAsset = {
    assetId,
    projectId,
    kind: classifyNexusAssetKind({ name: file.name, type: file.type }, sourceModule),
    status: "AVAILABLE",
    title: file.name,
    checksum,
    primaryFile: {
      fileId,
      assetId,
      projectId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      extension: file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined,
      sizeBytes: file.size,
      checksum,
      storage: stored.storage,
      uploadedAt: now,
      uploadedByPersonId,
    },
    provenance: {
      captureMode: sourceModule === "mobile-camera" ? "capture" : "import",
      sourceModule,
      uploadedByPersonId,
      uploadedAt: now,
      originalFilename: file.name,
      originalMimeType: file.type || "application/octet-stream",
      originalSizeBytes: file.size,
      deviceId: detail.deviceId,
      clientSessionId: detail.clientSessionId,
      clientGeneratedAt: file.lastModified ? new Date(file.lastModified).toISOString() : now,
      userAgent: navigator.userAgent,
      networkState: typeof navigator.onLine === "boolean" ? navigator.onLine ? "online" : "offline" : "unknown",
    },
    createdAt: now,
    updatedAt: now,
  };

  upsertNexusAssetRegistryEntry({ asset, links });
  window.dispatchEvent(new CustomEvent(ASSET_UPLOADED_EVENT, { detail: { asset, links } }));
  window.dispatchEvent(new CustomEvent(PROJECT_REGISTRY_REFRESH_EVENT, { detail: { projectId, assetId } }));
  return { asset, links };
}

export function NexusFileLoaderCloudBridge() {
  const provider = useMemo(() => createNexusStorageProvider(), []);
  const selectedNodeRef = useRef<string | undefined>(undefined);
  const drainingQueueRef = useRef(false);

  useEffect(() => {
    const handleGraphState = (event: Event) => {
      selectedNodeRef.current = (event as CustomEvent<GraphStateDetail>).detail?.selectedId;
    };

    window.addEventListener("nexus:graph-state", handleGraphState as EventListener);
    return () => window.removeEventListener("nexus:graph-state", handleGraphState as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const drainOfflineQueue = async () => {
      if (cancelled || drainingQueueRef.current || !isBrowserOnline()) return;
      drainingQueueRef.current = true;

      try {
        const queued = await readPendingNexusOfflineUploads();
        for (const record of queued) {
          if (cancelled || !isBrowserOnline()) return;
          await markNexusOfflineUploadUploading(record.queueItemId);
          try {
            const result = await uploadToNexusCloudDataLayer(
              provider,
              record.detail,
              toUploadableQueuedFile(record),
              record.selectedNodeId,
            );
            await markNexusOfflineUploadSynced(record.queueItemId, result.asset.assetId);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown Nexus offline upload sync failure.";
            await markNexusOfflineUploadFailed(record.queueItemId, message);
            dispatchUploadFailure(record.file.name, message);
          }
        }
      } finally {
        drainingQueueRef.current = false;
      }
    };

    const onOnline = () => {
      void drainOfflineQueue();
    };

    window.addEventListener("online", onOnline);
    void drainOfflineQueue();

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [provider]);

  useEffect(() => {
    const handleUploadRequest = async (event: Event) => {
      const detail = (event as CustomEvent<FileUploadRequestDetail>).detail ?? {};
      const projectId = detail.projectId;
      const files = detail.files;

      if (!projectId || !isFileArray(files) || files.length === 0) return;

      const uploadDetail: NexusFileUploadRequestDetailBase & { projectId: string } = {
        ...detail,
        projectId,
      };
      delete (uploadDetail as FileUploadRequestDetail).files;

      try {
        resolveFileLoaderCloudRoute(projectId, uploadDetail.worldId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nexus Cloud project/world routing failed.";
        for (const file of files) dispatchUploadFailure(file.name, message);
        return;
      }

      for (const file of files) {
        if (!isBrowserOnline()) {
          try {
            const queued = await enqueueNexusOfflineUpload(file, uploadDetail, selectedNodeRef.current);
            dispatchUploadQueued(queued);
          } catch (error) {
            dispatchUploadFailure(file.name, error instanceof Error ? error.message : "Failed to queue Nexus upload offline.");
          }
          continue;
        }

        try {
          await uploadToNexusCloudDataLayer(provider, uploadDetail, toUploadableFile(file), selectedNodeRef.current);
        } catch (error) {
          dispatchUploadFailure(file.name, error instanceof Error ? error.message : "Unknown Nexus asset upload failure.");
        }
      }
    };

    window.addEventListener(FILE_UPLOAD_REQUEST_EVENT, handleUploadRequest as EventListener);
    return () => window.removeEventListener(FILE_UPLOAD_REQUEST_EVENT, handleUploadRequest as EventListener);
  }, [provider]);

  return null;
}
