import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(artifactDir, "dist");

await esbuild({
  entryPoints: [path.join(artifactDir, "src/cloud-control-e2e.ts")],
  platform: "node",
  target: "node22",
  bundle: true,
  format: "esm",
  outdir: distDir,
  entryNames: "[name]",
  outExtension: { ".js": ".mjs" },
  sourcemap: false,
  logLevel: "info",
  external: ["*.node", "*.wasm", "mupdf"],
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);`,
  },
});
