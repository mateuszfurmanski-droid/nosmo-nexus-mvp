import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const policyPath = path.join(repoRoot, 'src/bim/webIfcRuntimeDelivery.ts');
const syncPath = path.join(repoRoot, 'scripts/sync-web-ifc-runtime-assets.mjs');
const appPackagePath = path.join(repoRoot, 'artifacts/nosmo-nexus/package.json');
const assetRoot = path.join(repoRoot, 'artifacts/nosmo-nexus/public/vendor/web-ifc/0.0.77');

const policySource = fs.readFileSync(policyPath, 'utf8');
const syncSource = fs.readFileSync(syncPath, 'utf8');
const appPackage = JSON.parse(fs.readFileSync(appPackagePath, 'utf8'));

const requireText = (haystack, text, message) => {
  if (!haystack.includes(text)) throw new Error(message);
};

requireText(policySource, "export const WEB_IFC_VERSION = '0.0.77' as const;", 'web-ifc must remain pinned to 0.0.77.');
requireText(policySource, "'local-self-hosted'", 'local-self-hosted delivery mode is required.');
requireText(policySource, "'pinned-network-development'", 'development network mode must remain explicit.');
requireText(policySource, 'productionFallbackToRemoteAllowed: false', 'remote production fallback must remain disabled.');
requireText(policySource, 'liteFallbackRequiredWhenUnavailable: true', 'Lite fallback requirement must remain enabled.');
requireText(policySource, 'vendor/web-ifc/${WEB_IFC_VERSION}/', 'versioned same-origin asset root is missing.');
requireText(
  policySource,
  'https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/web-ifc-api-iife.js',
  'pinned development runtime reference changed unexpectedly.',
);

if (/production\s*\?\s*'pinned-network-development'/.test(policySource)) {
  throw new Error('Production must never select pinned-network-development delivery.');
}
if (/productionFallbackToRemoteAllowed:\s*true/.test(policySource)) {
  throw new Error('Production remote fallback must remain impossible.');
}

requireText(syncSource, "const WEB_IFC_VERSION = '0.0.77';", 'asset sync version must match policy.');
requireText(syncSource, "packageManifest.version !== WEB_IFC_VERSION", 'asset sync must reject package-version mismatch.');
for (const requiredAsset of ['web-ifc-api-iife.js', 'web-ifc.wasm', 'LICENSE.md']) {
  requireText(syncSource, `'${requiredAsset}'`, `asset sync must require ${requiredAsset}.`);
}
requireText(syncSource, "schema: 'nexus-web-ifc-runtime/v1'", 'runtime manifest schema is missing.');

const declaredVersion =
  appPackage.dependencies?.['web-ifc'] ??
  appPackage.devDependencies?.['web-ifc'] ??
  appPackage.peerDependencies?.['web-ifc'];

if (declaredVersion !== undefined && declaredVersion !== '0.0.77') {
  throw new Error(`@workspace/nosmo-nexus declares web-ifc ${declaredVersion}; exact 0.0.77 is required.`);
}

if (fs.existsSync(assetRoot)) {
  for (const requiredAsset of ['web-ifc-api-iife.js', 'web-ifc.wasm', 'LICENSE.md', 'nexus-web-ifc-runtime.json']) {
    if (!fs.existsSync(path.join(assetRoot, requiredAsset))) {
      throw new Error(`Existing production asset directory is incomplete: missing ${requiredAsset}.`);
    }
  }
  console.log('PASS web-ifc production delivery contract; LOCAL_RUNTIME_ASSETS_PRESENT');
} else if (declaredVersion === '0.0.77') {
  console.log('PASS web-ifc production delivery contract; PACKAGE_DECLARED_ASSET_SYNC_PENDING');
} else {
  console.log('PASS web-ifc production delivery contract; PACKAGE_MANAGER_SLICE_PENDING');
}
