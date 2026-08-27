import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Request } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  nexusIdentityBindingsTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  sessionsTable,
} from "@workspace/db";
import { createNexusCloudDbCommitInput } from "@workspace/db/nexus-cloud-persistence-input";
import { persistNexusCloudCommit } from "@workspace/db/nexus-cloud-persistence";
import { markNexusCloudWriteCommitted } from "@workspace/db/nexus-cloud-write-operation";
import { createNexusCloudPendingAssetEnvelope } from "../../../src/core/storage/cloudAssetContract";
import { createNexusCloudProviderWritePlan } from "../../../src/core/storage/cloudProviderAdapterContract";
import { createNexusCloudPersistenceProposal } from "../../../src/core/storage/cloudPersistenceContract";
import { resolveNexusCloudRuntimeWriteAccess } from "./lib/nexus-cloud-access-authority";
import { executeNexusCloudDurableProviderWrite } from "./lib/nexus-cloud-durable-provider-write";
import { createNexusCloudOperationIdentity } from "./lib/nexus-cloud-operation-identity";
import { loadNexusCloudGoogleDriveRuntimeConfig } from "./lib/nexus-cloud-runtime-config";
import {
  CLOUD_CONTROL_PERSON_ID,
  createNexusCloudControlSession,
  ESAFE_PROJECT_ID,
  ESAFE_WORLD_ID,
} from "./lib/nexus-cloud-staging-device-session";

const DENY_GRANT_ID = "grant-staging-cloud-e2e-build-deny";
const IDEMPOTENCY_KEY = "nexus-cloud-controlled-real-e2e-20260827-v1";
const FILE_NAME = "nexus-cloud-controlled-real-e2e-20260827.txt";
const FILE_BODY =
  "NOSMO Nexus controlled real Google Drive E2E\n" +
  "Project: project-esafe-catania\n" +
  "World: world-esafe-catania\n" +
  "Date: 2026-08-27\n";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fakeRequest(providerSubject: string, displayName: string): Request {
  const req = {
    user: {
      id: providerSubject,
      email: null,
      firstName: displayName,
      lastName: null,
      profileImageUrl: null,
    },
    isAuthenticated() {
      return true;
    },
  };
  return req as unknown as Request;
}

async function deleteTemporaryDeny(): Promise<void> {
  await db
    .delete(nexusPmPermissionGrantsTable)
    .where(eq(nexusPmPermissionGrantsTable.grantId, DENY_GRANT_ID));

  const [participation] = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      eq(
        nexusPmProjectParticipationsTable.participationId,
        "participation-staging-esafe-e6b22d317d35",
      ),
    )
    .limit(1);

  if (participation) {
    await db
      .update(nexusPmProjectParticipationsTable)
      .set({
        permissionGrantIds: participation.permissionGrantIds.filter(
          (grantId) => grantId !== DENY_GRANT_ID,
        ),
      })
      .where(
        eq(
          nexusPmProjectParticipationsTable.participationId,
          participation.participationId,
        ),
      );
  }
}

async function main(): Promise<void> {
  if (process.env.NEXUS_CLOUD_CONTROL_E2E_EXECUTE !== "true") {
    console.log("NEXUS_CLOUD_CONTROL_E2E_SKIP execute flag is false");
    return;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("NEXUS_CLOUD_CONTROL_E2E_PRODUCTION_FORBIDDEN");
  }

  if (!process.env.NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON) {
    const vercelConfig = JSON.parse(
      await readFile(new URL("../../../vercel.json", import.meta.url), "utf8"),
    ) as { env?: Record<string, string> };
    const configured = vercelConfig.env?.NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON;
    if (configured) process.env.NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON = configured;
  }

  const runtimeConfig = loadNexusCloudGoogleDriveRuntimeConfig();
  const session = await createNexusCloudControlSession();
  const req = fakeRequest(session.providerSubject, session.displayName);
  let driveFileId: string | undefined;
  let canonicalFileId: string | undefined;

  try {
    await deleteTemporaryDeny();

    const now = new Date();
    await db.insert(nexusPmPermissionGrantsTable).values({
      grantId: DENY_GRANT_ID,
      workspaceId: session.workspaceId,
      participationId: "participation-staging-esafe-e6b22d317d35",
      effect: "deny",
      moduleId: "cloud",
      actionKey: "cloud.file.write",
      recordJson: {
        id: DENY_GRANT_ID,
        participationId: "participation-staging-esafe-e6b22d317d35",
        effect: "deny",
        moduleId: "cloud",
        actionKey: "cloud.file.write",
        status: "active",
        provenance: "NON_PRODUCTION_BUILD_CONTROL_E2E",
      },
      persistedAt: now,
    });

    await db
      .update(nexusPmProjectParticipationsTable)
      .set({
        permissionGrantIds: [
          "grant-staging-cloud-write-158ecedee155",
          DENY_GRANT_ID,
        ],
      })
      .where(
        eq(
          nexusPmProjectParticipationsTable.participationId,
          "participation-staging-esafe-e6b22d317d35",
        ),
      );

    const denied = await resolveNexusCloudRuntimeWriteAccess({
      req,
      workspaceId: session.workspaceId,
      decisionId: "ACCESS-NCW-CONTROL-DENY-20260827",
      projectId: ESAFE_PROJECT_ID,
      worldId: ESAFE_WORLD_ID,
    });
    assert(denied.result !== "allowed", "NEXUS_CLOUD_CONTROL_EXPLICIT_DENY_FAILED");

    await deleteTemporaryDeny();

    const operation = createNexusCloudOperationIdentity({
      workspaceId: session.workspaceId,
      projectId: ESAFE_PROJECT_ID,
      worldId: ESAFE_WORLD_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
    });

    const allowed = await resolveNexusCloudRuntimeWriteAccess({
      req,
      workspaceId: session.workspaceId,
      decisionId: operation.accessDecisionId,
      projectId: ESAFE_PROJECT_ID,
      worldId: ESAFE_WORLD_ID,
    });
    assert(allowed.result === "allowed", `NEXUS_CLOUD_CONTROL_ALLOW_FAILED:${allowed.reason}`);
    assert(allowed.personId === CLOUD_CONTROL_PERSON_ID, "NEXUS_CLOUD_CONTROL_PERSON_MISMATCH");

    const binary = Buffer.from(FILE_BODY, "utf8");
    const checksumSha256 = createHash("sha256").update(binary).digest("hex");
    const prepared = createNexusCloudPendingAssetEnvelope(
      {
        originalFileName: FILE_NAME,
        projectId: ESAFE_PROJECT_ID,
        worldId: ESAFE_WORLD_ID,
        sourceModule: "file-loader",
        mimeType: "text/plain",
        sizeBytes: binary.length,
        checksumSha256,
        requestedClassification: "audit_only",
        uploaderPersonId: allowed.personId,
      },
      runtimeConfig.routingIndex,
    );
    const pendingAsset = {
      ...prepared,
      pendingAssetId: operation.pendingAssetId,
    };

    const writePlan = createNexusCloudProviderWritePlan(
      pendingAsset,
      allowed,
      runtimeConfig.connectorDefinition,
      runtimeConfig.connectorAccount,
      runtimeConfig.targetMappings,
    );
    assert(writePlan.ready, `NEXUS_CLOUD_CONTROL_PLAN_FAILED:${writePlan.reason}`);

    const provider = await executeNexusCloudDurableProviderWrite({
      workspaceId: session.workspaceId,
      operation,
      pendingAsset,
      plan: writePlan,
      binary,
      checksumSha256,
    });

    if (provider.status === "BUSY") {
      throw new Error("NEXUS_CLOUD_CONTROL_PROVIDER_BUSY");
    }

    if (provider.status === "ALREADY_COMMITTED") {
      driveFileId = provider.driveFileId;
      canonicalFileId = provider.canonicalFileId;
    } else {
      driveFileId = provider.driveFileId;
      const proposal = createNexusCloudPersistenceProposal(
        pendingAsset,
        provider.receipt,
        allowed,
      );
      assert(proposal.ready, `NEXUS_CLOUD_CONTROL_PERSISTENCE_PROPOSAL_FAILED:${proposal.reason}`);

      const commit = await persistNexusCloudCommit(
        createNexusCloudDbCommitInput(session.workspaceId, proposal),
      );
      canonicalFileId = commit.fileId;

      await markNexusCloudWriteCommitted({
        operationId: provider.operationId,
        canonicalFileId: commit.fileId,
        committedAt: new Date(),
      });
    }

    const replay = await executeNexusCloudDurableProviderWrite({
      workspaceId: session.workspaceId,
      operation,
      pendingAsset,
      plan: writePlan,
      binary,
      checksumSha256,
    });

    assert(replay.status === "ALREADY_COMMITTED", "NEXUS_CLOUD_CONTROL_REPLAY_NOT_COMMITTED");
    assert(replay.driveFileId === driveFileId, "NEXUS_CLOUD_CONTROL_REPLAY_DRIVE_ID_MISMATCH");
    assert(replay.canonicalFileId === canonicalFileId, "NEXUS_CLOUD_CONTROL_REPLAY_FILE_ID_MISMATCH");

    console.log(
      "NEXUS_CLOUD_CONTROL_E2E_RESULT " +
        JSON.stringify({
          status: "PASS",
          explicitDeny: "PASS",
          canonicalAllow: "PASS",
          providerWrite: "CONFIRMED",
          projectMemory: "COMMITTED",
          idempotentReplay: "PASS",
          personId: CLOUD_CONTROL_PERSON_ID,
          projectId: ESAFE_PROJECT_ID,
          worldId: ESAFE_WORLD_ID,
          workspaceId: session.workspaceId,
          driveFileId,
          canonicalFileId,
          secretValuesReturned: false,
        }),
    );
  } finally {
    await deleteTemporaryDeny().catch(() => undefined);
    await db.delete(sessionsTable).where(eq(sessionsTable.sid, session.token)).catch(() => undefined);
    await db
      .update(nexusIdentityBindingsTable)
      .set({
        status: "REVOKED",
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(nexusIdentityBindingsTable.bindingId, session.bindingId),
          eq(nexusIdentityBindingsTable.personId, CLOUD_CONTROL_PERSON_ID),
        ),
      )
      .catch(() => undefined);
  }
}

await main();
