import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const runtimePath = path.join(
  repoRoot,
  "artifacts/nosmo-nexus/src/bim/ifc-web-ifc-runtime.ts",
);
const syncPath = path.join(repoRoot, "scripts/sync-web-ifc-runtime-assets.mjs");
const source = fs.readFileSync(runtimePath, "utf8");
const syncSource = fs.readFileSync(syncPath, "utf8");

function requireText(haystack, text, message) {
  if (!haystack.includes(text)) throw new Error(message);
}

requireText(
  source,
  'export const WEB_IFC_VERSION = "0.0.77";',
  "web-ifc runtime must remain pinned to the released 0.0.77 package until a reviewed upgrade lands.",
);
requireText(
  source,
  'export type WebIfcRuntimeDelivery = "local-self-hosted" | "pinned-network-development";',
  "web-ifc delivery modes must remain explicit.",
);
requireText(
  source,
  'vendor/web-ifc/${WEB_IFC_VERSION}/',
  "same-origin versioned web-ifc asset root is missing.",
);
requireText(
  source,
  'export const WEB_IFC_RUNTIME_DELIVERY: WebIfcRuntimeDelivery = import.meta.env.PROD',
  "production web-ifc delivery must be selected explicitly from Vite production mode.",
);
requireText(
  source,
  '? "local-self-hosted"\n  : requestedDevelopmentDelivery;',
  "production must resolve to local-self-hosted delivery.",
);
requireText(
  source,
  'WEB_IFC_RUNTIME_DELIVERY === "local-self-hosted"\n  ? WEB_IFC_LOCAL_RUNTIME_URL\n  : WEB_IFC_DEVELOPMENT_RUNTIME_URL;',
  "web-ifc JS runtime URL must be derived from the explicit delivery mode.",
);
requireText(
  source,
  'WEB_IFC_RUNTIME_DELIVERY === "local-self-hosted"\n  ? WEB_IFC_LOCAL_WASM_URL\n  : WEB_IFC_DEVELOPMENT_WASM_URL;',
  "web-ifc WASM URL must be derived from the explicit delivery mode.",
);
requireText(
  source,
  "https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/web-ifc-api-iife.js",
  "pinned development CDN reference changed unexpectedly.",
);

if (/export const WEB_IFC_RUNTIME_URL\s*=\s*`https:\/\//.test(source)) {
  throw new Error("Production-facing WEB_IFC_RUNTIME_URL must not be an unconditional remote URL.");
}
if (/export const WEB_IFC_WASM_URL\s*=\s*`https:\/\//.test(source)) {
  throw new Error("Production-facing WEB_IFC_WASM_URL must not be an unconditional remote URL.");
}
if (/import\.meta\.env\.PROD[\s\S]{0,120}\?\s*"pinned-network-development"/.test(source)) {
  throw new Error("Production mode must never select pinned-network-development delivery.");
}

requireText(
  syncSource,
  'const WEB_IFC_VERSION = "0.0.77";',
  "asset sync must be pinned to the same released web-ifc version.",
);
requireText(
  syncSource,
  'packageManifest.version !== WEB_IFC_VERSION',
  "asset sync must reject an installed web-ifc version mismatch.",
);
for (const requiredAsset of ["web-ifc-api-iife.js", "web-ifc.wasm", "LICENSE.md"]) {
  requireText(
    syncSource,
    `"${requiredAsset}"`,
    `asset sync must require ${requiredAsset}.`,
  );
}
requireText(
  syncSource,
  'schema: "nexus-web-ifc-runtime/v1"',
  "asset sync must generate the bounded Nexus runtime manifest.",
);

console.log("PASS web-ifc production delivery contract");
