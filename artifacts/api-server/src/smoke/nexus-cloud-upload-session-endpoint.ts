import type { AddressInfo } from "node:net";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import nexusCloudRouter from "../routes/nexus-cloud";

type SmokeRequest = Request & {
  workspaceId?: number;
  user?: {
    id: string;
    firstName?: string | null;
  };
  log: {
    error: (payload: unknown, message?: string) => void;
  };
};

type JsonRecord = Record<string, unknown>;

const pendingAsset = {
  schema: "nexus-cloud-pending-asset/v1",
  pendingAssetId: "PENDING-NCA-ESAFE-ENDPOINT-SMOKE-001",
  assetId: "NCA-ESAFE-ENDPOINT-SMOKE-001",
  fileName: "endpoint-smoke-door-photo.jpg",
  projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
  worldId: "esafe-demo",
  classificationStatus: "inbox",
  targetFolderRole: "inbox",
  targetFolderId: "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9",
  targetFolderUrl: "https://drive.google.com/drive/folders/1xsIITjBwTEE1z7whhub3RnsSXfrxwur9",
  uploadState: "metadata_prepared",
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertFalse(record: JsonRecord, key: string): void {
  assertEqual(record[key], false, `${key} must remain false`);
}

function createSmokeApp(authenticated: boolean): Express {
  const app: Express = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction): void => {
    const smokeReq = req as unknown as SmokeRequest;
    smokeReq.log = {
      error(payload: unknown, message?: string): void {
        console.error("Nexus Cloud endpoint smoke route error", { payload, message });
      },
    };
    if (authenticated) {
      smokeReq.workspaceId = 101;
      smokeReq.user = {
        id: "smoke-authenticated-user",
        firstName: "Smoke",
      };
    }
    next();
  });
  app.use(nexusCloudRouter);
  return app;
}

function listen(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo | null;
      if (!address) {
        reject(new Error("Smoke server did not expose an address"));
        return;
      }
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((closeResolve, closeReject) => {
          server.close((err) => {
            if (err) closeReject(err);
            else closeResolve();
          });
        }),
      });
    });
    server.on("error", reject);
  });
}

async function postJson(baseUrl: string, body: unknown): Promise<{ status: number; json: JsonRecord }> {
  const response = await fetch(`${baseUrl}/nexus-cloud/upload-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as JsonRecord;
  return { status: response.status, json };
}

async function smokeAuthenticatedEndpoint(): Promise<void> {
  const server = await listen(createSmokeApp(true));
  try {
    const { status, json } = await postJson(server.baseUrl, {
      schema: "nexus-cloud-upload-session-request/v1",
      pendingAsset,
    });

    assertEqual(status, 202, "Authenticated endpoint smoke must return 202");
    assertEqual(json["schema"], "nexus-cloud-upload-session-plan/v1", "Endpoint response schema mismatch");
    assertEqual(json["state"], "planned_metadata_only", "Endpoint plan state mismatch");
    assertEqual(json["provider"], "google-drive", "Endpoint provider mismatch");
    assertEqual(json["pendingAssetId"], pendingAsset.pendingAssetId, "Endpoint pendingAssetId mismatch");
    assertEqual(json["workspaceId"], 101, "Endpoint workspaceId mismatch");
    assertEqual(json["userId"], "smoke-authenticated-user", "Endpoint userId mismatch");
    assertEqual(json["projectId"], "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "Endpoint projectId mismatch");
    assertEqual(json["worldId"], "esafe-demo", "Endpoint worldId mismatch");
    assertEqual(json["targetFolderId"], "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9", "Endpoint target folder mismatch");
    assertEqual(json["nextRequiredStep"], "implement_drive_upload_adapter", "Endpoint next step mismatch");
    assertEqual(json["uploadUrl"], null, "Endpoint must not return uploadUrl in stub");
    assertEqual(json["driveFileId"], null, "Endpoint must not return driveFileId in stub");

    assertFalse(json, "binaryHandled");
    assertFalse(json, "driveWriteRequested");
    assertFalse(json, "driveWritePerformed");
    assertFalse(json, "assetIndexAppendRequested");
    assertFalse(json, "assetIndexAppendPerformed");
    assertFalse(json, "projectGraphMutationRequested");
    assertFalse(json, "projectGraphMutationPerformed");
  } finally {
    await server.close();
  }
}

async function smokeFailClosedEndpoint(): Promise<void> {
  const server = await listen(createSmokeApp(true));
  try {
    const { status, json } = await postJson(server.baseUrl, {
      pendingAsset: {
        ...pendingAsset,
        worldId: "dev",
      },
    });

    assertEqual(status, 400, "Wrong e-SAFE worldId must fail closed with 400");
    assertEqual(json["schema"], "nexus-cloud-upload-session-error/v1", "Fail-closed schema mismatch");
    assert(String(json["error"] ?? "").includes("must use worldId esafe-demo"), "Fail-closed error must mention e-SAFE world boundary");
  } finally {
    await server.close();
  }
}

async function smokeMissingWorkspaceEndpoint(): Promise<void> {
  const server = await listen(createSmokeApp(false));
  try {
    const { status, json } = await postJson(server.baseUrl, { pendingAsset });

    assertEqual(status, 500, "Direct endpoint without mock workspace must fail before planning");
    assertEqual(json["schema"], "nexus-cloud-upload-session-error/v1", "Missing workspace schema mismatch");
    assert(String(json["error"] ?? "").includes("Authenticated workspaceId is required"), "Missing workspace error must mention workspaceId");
  } finally {
    await server.close();
  }
}

async function main(): Promise<void> {
  await smokeAuthenticatedEndpoint();
  await smokeFailClosedEndpoint();
  await smokeMissingWorkspaceEndpoint();
  console.log("Nexus Cloud upload-session endpoint smoke passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
