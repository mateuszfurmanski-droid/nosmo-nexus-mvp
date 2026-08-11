import { pathToFileURL } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { resolveNexusCloudStorageRuntimeModulePath } from "./nexus-runtime-paths";
import {
  NexusIdentityBindingStoreUnavailableError,
  resolveNexusPersonBinding,
} from "./nexus-person-binding";
import {
  NexusProjectAuthorizationStoreUnavailableError,
  resolveNexusProjectApplicationAccess,
} from "./nexus-project-authorization";

export type NexusCloudStorageRuntimeStatus = {
  configured: boolean;
  demoMode: boolean;
  providerBoundary: string;
  providerKind: string;
  storedObjects: number;
  driveRouting?: {
    schema: string;
    verifiedAt: string;
    configuredProjectWorlds: number;
  };
};

type NexusCloudStorageRequestScope = {
  projectId: string;
  worldId?: string;
};

type NexusCloudStorageRuntimeModule = {
  handleNexusCloudStorageApi: (
    request: Request,
    response: Response,
    url: URL,
    options?: { authorisedByNexusSession?: boolean },
  ) => Promise<boolean>;
  resolveNexusCloudStorageRequestScope: (
    request: Request,
    url: URL,
  ) => NexusCloudStorageRequestScope | null;
  nexusCloudStorageStatus: () => NexusCloudStorageRuntimeStatus;
};

let runtimeModulePromise: Promise<NexusCloudStorageRuntimeModule> | null = null;

function runtimeModuleUrl(): string {
  return pathToFileURL(resolveNexusCloudStorageRuntimeModulePath()).href;
}

async function getRuntimeModule(): Promise<NexusCloudStorageRuntimeModule> {
  if (!runtimeModulePromise) {
    runtimeModulePromise = import(runtimeModuleUrl()).then((module) => {
      if (
        typeof module.handleNexusCloudStorageApi !== "function" ||
        typeof module.resolveNexusCloudStorageRequestScope !== "function" ||
        typeof module.nexusCloudStorageStatus !== "function"
      ) {
        throw new Error("Invalid Nexus Cloud storage runtime module contract");
      }
      return module as NexusCloudStorageRuntimeModule;
    });
  }
  return runtimeModulePromise;
}

export function isNexusCloudStorageApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/nexus/cloud-storage/");
}

function sendJson(res: Response, status: number, body: unknown) {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.json(body);
}

function isRoutingInputError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.startsWith("NEXUS_CLOUD_") ||
    error.message === "MISSING_METADATA" ||
    error.message === "INVALID_METADATA" ||
    error.message === "MISSING_REQUIRED_FIELDS";
}

/**
 * Canonical authenticated browser/storage boundary.
 *
 * The raw binary body remains owned by the shared Cloud handler. This middleware
 * performs identity and Project Participation authorization before delegating a
 * trusted server-internal call; browser clients never receive a storage API key.
 */
export async function nexusCloudStorageRuntimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const url = new URL(req.originalUrl || req.url, "http://nexus.local");
  if (!isNexusCloudStorageApiPath(url.pathname)) {
    next();
    return;
  }

  try {
    const runtime = await getRuntimeModule();

    // Status is non-mutating and contains no credential or user authority.
    if (req.method === "GET" && url.pathname === "/api/nexus/cloud-storage/status") {
      if (await runtime.handleNexusCloudStorageApi(req, res, url)) return;
      next();
      return;
    }

    if (!req.isAuthenticated()) {
      sendJson(res, 401, { error: "UNAUTHENTICATED" });
      return;
    }

    const person = await resolveNexusPersonBinding(req.user.id);
    if (!person) {
      sendJson(res, 403, { error: "NEXUS_PERSON_BINDING_REQUIRED" });
      return;
    }

    const scope = runtime.resolveNexusCloudStorageRequestScope(req, url);
    if (!scope) {
      sendJson(res, 400, { error: "INVALID_CLOUD_STORAGE_SCOPE" });
      return;
    }

    const access = await resolveNexusProjectApplicationAccess(
      person.personId,
      scope.projectId,
      "cloud-storage",
    );
    if (!access.allowed || !access.participationId) {
      sendJson(res, 403, {
        error: "NEXUS_PROJECT_ACCESS_DENIED",
        reason: access.reason,
      });
      return;
    }

    if (
      await runtime.handleNexusCloudStorageApi(req, res, url, {
        authorisedByNexusSession: true,
      })
    ) {
      return;
    }

    next();
  } catch (error) {
    if (isRoutingInputError(error)) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : "INVALID_CLOUD_STORAGE_SCOPE",
      });
      return;
    }

    if (
      error instanceof NexusIdentityBindingStoreUnavailableError ||
      error instanceof NexusProjectAuthorizationStoreUnavailableError
    ) {
      sendJson(res, 503, { error: "NEXUS_AUTHORIZATION_UNAVAILABLE" });
      return;
    }

    req.log?.error?.({ err: error }, "Nexus Cloud storage runtime unavailable");
    sendJson(res, 503, { error: "NEXUS_CLOUD_STORAGE_RUNTIME_UNAVAILABLE" });
  }
}

export async function getNexusCloudStorageRuntimeStatus(): Promise<NexusCloudStorageRuntimeStatus> {
  const runtime = await getRuntimeModule();
  return runtime.nexusCloudStorageStatus();
}
