import { createHash } from "node:crypto";
import path from "node:path";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { createNexusCloudPendingAssetEnvelope } from "../../../../src/core/storage/cloudAssetContract";
import type { NexusCloudClassificationStatus } from "../../../../src/core/storage/cloudRouting";
import { createNexusCloudProviderWritePlan } from "../../../../src/core/storage/cloudProviderAdapterContract";
import { createNexusCloudPersistenceProposal } from "../../../../src/core/storage/cloudPersistenceContract";
import { createNexusCloudDbCommitInput } from "@workspace/db/nexus-cloud-persistence-input";
import { persistNexusCloudCommit } from "@workspace/db/nexus-cloud-persistence";
import { resolveNexusCloudRuntimeWriteAccess } from "../lib/nexus-cloud-access-authority";
import {
  loadNexusCloudGoogleDriveRuntimeConfig,
  NexusCloudRuntimeConfigError,
} from "../lib/nexus-cloud-runtime-config";
import { writeNexusCloudGoogleDriveRuntime } from "../lib/nexus-cloud-google-drive-runtime";
import { createNexusCloudOperationIdentity } from "../lib/nexus-cloud-operation-identity";

const router: IRouter = Router();
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,200}$/;
const classificationValues = new Set<NexusCloudClassificationStatus>([
  "inbox",
  "pending_graph_link",
  "classified_by_trade",
  "classified_by_type",
  "audit_only",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 8,
    fieldSize: 16 * 1024,
  },
});

function parseSingleFile(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      res.status(status).json({ error: `NEXUS_CLOUD_UPLOAD_${error.code}` });
      return;
    }

    res.status(400).json({ error: "NEXUS_CLOUD_UPLOAD_INVALID_MULTIPART" });
  });
}

const bodyString = (req: Request, key: string): string | undefined => {
  const value = req.body?.[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

const requireBodyString = (req: Request, key: string, maxLength = 128): string => {
  const value = bodyString(req, key);
  if (!value || value.length > maxLength) {
    throw new Error(`NEXUS_CLOUD_INVALID_${key.toUpperCase()}`);
  }
  return value;
};

const parseClassification = (req: Request): NexusCloudClassificationStatus | undefined => {
  const raw = bodyString(req, "classification");
  if (!raw) return undefined;
  if (!classificationValues.has(raw as NexusCloudClassificationStatus)) {
    throw new Error("NEXUS_CLOUD_INVALID_CLASSIFICATION");
  }
  return raw as NexusCloudClassificationStatus;
};

const requireIdempotencyKey = (req: Request): string => {
  const key = req.get("idempotency-key")?.trim();
  if (!key || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new Error("NEXUS_CLOUD_IDEMPOTENCY_KEY_REQUIRED");
  }
  return key;
};

const safeOriginalFileName = (file: Express.Multer.File): string => {
  const browserNeutralName = file.originalname.replaceAll("\\", "/");
  const candidate = path.posix.basename(browserNeutralName).trim();
  if (!candidate || candidate.length > 255 || /[\u0000-\u001f\u007f]/.test(candidate)) {
    throw new Error("NEXUS_CLOUD_INVALID_FILE_NAME");
  }
  return candidate;
};

const providerErrorCode = (error: unknown): string => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "NEXUS_CLOUD_PROVIDER_WRITE_FAILED";
};

const providerErrorStatus = (code: string): number => {
  if (code.includes("IDEMPOTENCY_CONFLICT")) return 409;
  if (
    code.includes("SECRET_NOT_CONFIGURED") ||
    code.includes("TOKEN_REJECTED") ||
    code.includes("TARGET_PERMISSION_DENIED")
  ) {
    return 503;
  }
  return 502;
};

router.post("/files", parseSingleFile, async (req, res) => {
  if (!req.workspaceId) {
    res.status(500).json({ error: "NEXUS_CLOUD_WORKSPACE_CONTEXT_MISSING" });
    return;
  }

  let projectId: string;
  let worldId: string;
  let idempotencyKey: string;
  let classification: NexusCloudClassificationStatus | undefined;
  let tradeId: string | undefined;
  let fileName: string;

  try {
    projectId = requireBodyString(req, "projectId");
    worldId = requireBodyString(req, "worldId");
    idempotencyKey = requireIdempotencyKey(req);
    classification = parseClassification(req);
    tradeId = bodyString(req, "tradeId");
    if (tradeId && tradeId.length > 128) throw new Error("NEXUS_CLOUD_INVALID_TRADE_ID");
    if (!req.file?.buffer?.length) throw new Error("NEXUS_CLOUD_FILE_REQUIRED");
    fileName = safeOriginalFileName(req.file);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "NEXUS_CLOUD_INVALID_REQUEST",
    });
    return;
  }

  const operation = createNexusCloudOperationIdentity({
    workspaceId: req.workspaceId,
    projectId,
    worldId,
    idempotencyKey,
  });
  const checksumSha256 = createHash("sha256").update(req.file.buffer).digest("hex");

  let accessDecision;
  try {
    accessDecision = await resolveNexusCloudRuntimeWriteAccess({
      req,
      workspaceId: req.workspaceId,
      decisionId: operation.accessDecisionId,
      projectId,
      worldId,
    });
  } catch (error) {
    req.log?.error?.(
      { err: error, operationFingerprint: operation.operationFingerprint, projectId, worldId },
      "Nexus Cloud access authority unavailable",
    );
    res.status(503).json({ error: "NEXUS_CLOUD_ACCESS_AUTHORITY_UNAVAILABLE" });
    return;
  }

  if (accessDecision.result !== "allowed") {
    res.status(403).json({
      error: "NEXUS_CLOUD_WRITE_DENIED",
      reason: accessDecision.reason,
      accessDecisionId: accessDecision.id,
    });
    return;
  }

  let runtimeConfig;
  try {
    runtimeConfig = loadNexusCloudGoogleDriveRuntimeConfig();
  } catch (error) {
    const code =
      error instanceof NexusCloudRuntimeConfigError
        ? error.message
        : "NEXUS_CLOUD_RUNTIME_CONFIG_UNAVAILABLE";
    req.log?.error?.(
      { err: error, operationFingerprint: operation.operationFingerprint },
      "Nexus Cloud provider runtime configuration unavailable",
    );
    res.status(503).json({ error: code });
    return;
  }

  let pendingAsset;
  try {
    const prepared = createNexusCloudPendingAssetEnvelope(
      {
        originalFileName: fileName,
        projectId,
        worldId,
        sourceModule: "file-loader",
        mimeType: req.file.mimetype || "application/octet-stream",
        sizeBytes: req.file.size,
        checksumSha256,
        requestedClassification: classification,
        tradeId,
        uploaderPersonId: accessDecision.personId,
      },
      runtimeConfig.routingIndex,
    );

    // Stable server-owned request identity is required for exact Phase 19 replay.
    pendingAsset = {
      ...prepared,
      pendingAssetId: operation.pendingAssetId,
    };
  } catch (error) {
    res.status(400).json({
      error: "NEXUS_CLOUD_ROUTE_REJECTED",
      reason: error instanceof Error ? error.message : "UNKNOWN_ROUTE_ERROR",
    });
    return;
  }

  const writePlan = createNexusCloudProviderWritePlan(
    pendingAsset,
    accessDecision,
    runtimeConfig.connectorDefinition,
    runtimeConfig.connectorAccount,
    runtimeConfig.targetMappings,
  );

  if (!writePlan.ready) {
    res.status(503).json({
      error: "NEXUS_CLOUD_PROVIDER_NOT_READY",
      reason: writePlan.reason,
      pendingAssetId: writePlan.pendingAssetId,
    });
    return;
  }

  let providerResult;
  try {
    providerResult = await writeNexusCloudGoogleDriveRuntime({
      plan: writePlan,
      binary: req.file.buffer,
      idempotencyKey: operation.providerIdempotencyKey,
    });
  } catch (error) {
    const code = providerErrorCode(error);
    req.log?.error?.(
      { err: error, operationFingerprint: operation.operationFingerprint, projectId, worldId },
      "Nexus Cloud Google Drive write failed",
    );
    res.status(providerErrorStatus(code)).json({
      status: "PROVIDER_WRITE_FAILED",
      error: code,
      providerWriteConfirmed: false,
      retryWithSameIdempotencyKey: true,
    });
    return;
  }

  const persistenceProposal = createNexusCloudPersistenceProposal(
    pendingAsset,
    providerResult.receipt,
    accessDecision,
  );

  if (!persistenceProposal.ready) {
    req.log?.error?.(
      {
        operationFingerprint: operation.operationFingerprint,
        driveFileId: providerResult.driveFileId,
        reason: persistenceProposal.reason,
      },
      "Nexus Cloud provider write succeeded but canonical persistence proposal failed",
    );
    res.status(500).json({
      status: "PROVIDER_WRITTEN_PERSISTENCE_FAILED",
      error: persistenceProposal.reason,
      providerWriteConfirmed: true,
      driveFileId: providerResult.driveFileId,
      retryWithSameIdempotencyKey: true,
      recoverable: true,
    });
    return;
  }

  try {
    const dbInput = createNexusCloudDbCommitInput(req.workspaceId, persistenceProposal);
    const commit = await persistNexusCloudCommit(dbInput);

    res.status(commit.status === "COMMITTED" ? 201 : 200).json({
      status: commit.status,
      providerStatus: providerResult.status,
      idempotentProviderReplay: providerResult.idempotentReplay,
      projectId,
      worldId,
      pendingAssetId: pendingAsset.pendingAssetId,
      accessDecisionId: accessDecision.id,
      fileId: commit.fileId,
      canonicalFileObjectId: persistenceProposal.canonicalFileObject.id,
      driveFileId: providerResult.driveFileId,
      providerWriteConfirmed: true,
      projectMemoryCommitted: true,
      projectGraphMutationPerformed: false,
    });
  } catch (error) {
    req.log?.error?.(
      {
        err: error,
        operationFingerprint: operation.operationFingerprint,
        driveFileId: providerResult.driveFileId,
        projectId,
        worldId,
      },
      "Nexus Cloud provider write succeeded but Project Memory commit failed",
    );

    res.status(503).json({
      status: "PROVIDER_WRITTEN_PERSISTENCE_FAILED",
      error: "NEXUS_CLOUD_PROJECT_MEMORY_COMMIT_FAILED",
      providerWriteConfirmed: true,
      driveFileId: providerResult.driveFileId,
      retryWithSameIdempotencyKey: true,
      recoverable: true,
      projectMemoryCommitted: false,
      projectGraphMutationPerformed: false,
    });
  }
});

export default router;
