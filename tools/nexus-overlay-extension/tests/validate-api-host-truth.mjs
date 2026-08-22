import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const STATIC_WEBSITE_ORIGIN = "https://nosmotechnology.co.uk";
const LOCAL_API_BASE = "http://127.0.0.1:3000";
const LOCAL_BOOTSTRAP_MATCH =
  `${LOCAL_API_BASE}/api/nexus/context-tickets/work-wallet/bootstrap*`;

const [manifestSource, backgroundSource, optionsSource, optionsHtml] = await Promise.all([
  fs.readFile(path.join(root, "manifest.json"), "utf8"),
  fs.readFile(path.join(root, "src/background.js"), "utf8"),
  fs.readFile(path.join(root, "src/options/options.js"), "utf8"),
  fs.readFile(path.join(root, "src/options/options.html"), "utf8"),
]);

const manifest = JSON.parse(manifestSource);

assert.deepEqual(
  [...manifest.host_permissions].sort(),
  ["https://portal.work-wallet.com/*", `${LOCAL_API_BASE}/*`].sort(),
);
assert.deepEqual(manifest.externally_connectable?.matches, [LOCAL_BOOTSTRAP_MATCH]);

for (const [name, source] of [
  ["manifest", manifestSource],
  ["background", backgroundSource],
  ["options-js", optionsSource],
  ["options-html", optionsHtml],
]) {
  assert.equal(
    source.includes(STATIC_WEBSITE_ORIGIN),
    false,
    `${name} must not treat the static NOSMO website as the Nexus API runtime`,
  );
}

assert.match(backgroundSource, /const DEFAULT_API_BASE = "http:\/\/127\.0\.0\.1:3000";/);
assert.match(optionsSource, /"http:\/\/127\.0\.0\.1:3000"/);
assert.match(optionsHtml, /local development only/);
assert.match(optionsHtml, /No production Nexus API host is enabled/);

process.stdout.write("WORK_WALLET_API_HOST_TRUTH_PASS\n");
