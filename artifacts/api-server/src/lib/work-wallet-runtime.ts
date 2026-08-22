import { pathToFileURL } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { resolveWorkWalletRuntimeModulePath } from "./nexus-runtime-paths";

export type WorkWalletRuntimeStatus = {
  gatewayConfigured: boolean;
  demoMode: boolean;
  storedEvents: number;
};

type WorkWalletRuntimeModule = {
  handleWorkWalletApi: (
    request: Request,
    response: Response,
    url: URL,
  ) => Promise<boolean>;
  workWalletStatus: () => WorkWalletRuntimeStatus;
};

let runtimeModulePromise: Promise<WorkWalletRuntimeModule> | null = null;

function runtimeModuleUrl(): string {
  return pathToFileURL(resolveWorkWalletRuntimeModulePath()).href;
}

async function getWorkWalletRuntimeModule(): Promise<WorkWalletRuntimeModule> {
  if (!runtimeModulePromise) {
    runtimeModulePromise = import(runtimeModuleUrl()).then((module) => {
      if (
        typeof module.handleWorkWalletApi !== "function" ||
        typeof module.workWalletStatus !== "function"
      ) {
        throw new Error("Invalid Work Wallet runtime module contract");
      }
      return module as WorkWalletRuntimeModule;
    });
  }
  return runtimeModulePromise;
}

export function isWorkWalletApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/integrations/work-wallet/");
}

/**
 * Reuses the existing Work Wallet gateway module inside the canonical Express
 * runtime. This runs before express.json(), because that gateway owns and bounds
 * parsing of its webhook body. No Work Wallet business rule is copied here.
 */
export async function workWalletRuntimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const url = new URL(req.originalUrl || req.url, "http://nexus.local");
  if (!isWorkWalletApiPath(url.pathname)) {
    next();
    return;
  }

  try {
    const runtime = await getWorkWalletRuntimeModule();
    if (await runtime.handleWorkWalletApi(req, res, url)) return;
    next();
  } catch (error) {
    req.log?.error?.({ err: error }, "Work Wallet runtime bridge unavailable");
    if (!res.headersSent) {
      res.status(503).json({ error: "WORK_WALLET_RUNTIME_UNAVAILABLE" });
    } else {
      res.end();
    }
  }
}

export async function getWorkWalletRuntimeStatus(): Promise<WorkWalletRuntimeStatus> {
  const runtime = await getWorkWalletRuntimeModule();
  return runtime.workWalletStatus();
}
