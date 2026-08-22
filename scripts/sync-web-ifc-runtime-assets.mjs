import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_IFC_VERSION = '0.0.77';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const packageRoot = path.join(repoRoot, 'artifacts/nosmo-nexus/node_modules/web-ifc');
const packageManifestPath = path.join(packageRoot, 'package.json');
const targetRoot = path.join(
  repoRoot,
  'artifacts/nosmo-nexus/public/vendor/web-ifc',
  WEB_IFC_VERSION,
);

if (!fs.existsSync(packageManifestPath)) {
  throw new Error(
    `web-ifc is not installed for @workspace/nosmo-nexus. Add exact web-ifc@${WEB_IFC_VERSION} through pnpm before syncing runtime assets.`,
  );
}

const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf8'));
if (packageManifest.version !== WEB_IFC_VERSION) {
  throw new Error(
    `Refusing to sync web-ifc ${packageManifest.version ?? 'unknown'}; Nexus production delivery is pinned to ${WEB_IFC_VERSION}.`,
  );
}

const requiredFiles = ['web-ifc-api-iife.js', 'web-ifc.wasm', 'LICENSE.md'];
for (const filename of requiredFiles) {
  const source = path.join(packageRoot, filename);
  if (!fs.existsSync(source)) {
    throw new Error(`Installed web-ifc@${WEB_IFC_VERSION} is missing required runtime asset ${filename}.`);
  }
}

fs.rmSync(targetRoot, { recursive: true, force: true });
fs.mkdirSync(targetRoot, { recursive: true });
for (const filename of requiredFiles) {
  fs.copyFileSync(path.join(packageRoot, filename), path.join(targetRoot, filename));
}

const runtimeManifest = {
  schema: 'nexus-web-ifc-runtime/v1',
  package: 'web-ifc',
  version: WEB_IFC_VERSION,
  delivery: 'local-self-hosted',
  source: 'pnpm workspace dependency',
  files: requiredFiles,
  generatedAt: new Date().toISOString(),
  boundary:
    'Runtime packaging only; does not validate IFC geometry, coordinates, Psets, revisions, device behaviour or partner integration.',
};

fs.writeFileSync(
  path.join(targetRoot, 'nexus-web-ifc-runtime.json'),
  `${JSON.stringify(runtimeManifest, null, 2)}\n`,
  'utf8',
);

console.log(`Synced web-ifc@${WEB_IFC_VERSION} runtime assets to ${path.relative(repoRoot, targetRoot)}`);
