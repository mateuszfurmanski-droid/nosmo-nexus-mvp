import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(scriptsDir, "validate-nexus-core-http-e2e.ts");
const output = "/tmp/nexus-core-http-e2e.mjs";

await esbuild({
  entryPoints: [entry],
  platform: "node",
  target: "node22",
  bundle: true,
  format: "esm",
  outfile: output,
  sourcemap: "inline",
  logLevel: "info",
  external: ["*.node", "*.wasm", "mupdf", "pg-native"],
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

await import(pathToFileURL(output).href);
