import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(artifactDir, "dist");
const outfile = path.join(distDir, "vercel-cloud-staging.mjs");

await mkdir(distDir, { recursive: true });
await rm(outfile, { force: true });
await rm(`${outfile}.map`, { force: true });

await esbuild({
  entryPoints: [path.join(artifactDir, "src/vercel-cloud-staging.ts")],
  platform: "node",
  target: "node22",
  bundle: true,
  format: "esm",
  outfile,
  sourcemap: "linked",
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
