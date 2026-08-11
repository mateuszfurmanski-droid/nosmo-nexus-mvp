import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function resolveNexusRuntimeRoot(): string {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = unique([
    process.env.NEXUS_RUNTIME_ROOT?.trim(),
    process.env.INIT_CWD?.trim(),
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(moduleDirectory, "../../.."),
    path.resolve(moduleDirectory, "../../../.."),
  ]);

  for (const candidate of candidates) {
    if (
      existsSync(path.join(candidate, "scripts/src/work-wallet-api.mjs")) &&
      existsSync(path.join(candidate, "artifacts/api-server/package.json"))
    ) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve canonical Nexus runtime root");
}

export function resolveNexusWebPublicDirectory(): string {
  const publicDirectory = path.join(
    resolveNexusRuntimeRoot(),
    "artifacts/nosmo-nexus/dist/public",
  );

  if (!existsSync(path.join(publicDirectory, "index.html"))) {
    throw new Error("Built Nexus web application is unavailable");
  }

  return publicDirectory;
}

export function resolveWorkWalletRuntimeModulePath(): string {
  const modulePath = path.join(
    resolveNexusRuntimeRoot(),
    "scripts/src/work-wallet-api.mjs",
  );

  if (!existsSync(modulePath)) {
    throw new Error("Work Wallet runtime module is unavailable");
  }

  return modulePath;
}

export function resolveNexusCloudStorageRuntimeModulePath(): string {
  const modulePath = path.join(
    resolveNexusRuntimeRoot(),
    "scripts/src/nexus-cloud-storage-api.mjs",
  );

  if (!existsSync(modulePath)) {
    throw new Error("Nexus Cloud storage runtime module is unavailable");
  }

  return modulePath;
}
