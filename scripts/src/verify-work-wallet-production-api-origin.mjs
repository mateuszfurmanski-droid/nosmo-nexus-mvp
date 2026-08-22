import process from "node:process";

const ENV_NAME = "NEXUS_WORK_WALLET_CANDIDATE_API_ORIGIN";
const HEALTH_PATH = "/health";
const BOOTSTRAP_PATH = "/api/nexus/context-tickets/work-wallet/bootstrap";
const EXPECTED_SERVICE = "nosmo-nexus-unified-runtime";
const MAX_BODY_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;

function fail(message) {
  process.stderr.write(`WORK_WALLET_PRODUCTION_API_PREFLIGHT_BLOCKED: ${message}\n`);
  process.exitCode = 1;
}

function parseCandidateOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

async function readBoundedText(response) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new Error("response body exceeds preflight limit");
  }
  return text;
}

async function getExact(url) {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    credentials: "omit",
    headers: {
      Accept: "application/json, text/plain;q=0.9",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function main() {
  const origin = parseCandidateOrigin(process.env[ENV_NAME]);
  if (!origin) {
    fail(`${ENV_NAME} must be one exact HTTPS origin with no path, credentials, query or fragment`);
    return;
  }

  let healthResponse;
  try {
    healthResponse = await getExact(`${origin}${HEALTH_PATH}`);
  } catch {
    fail("candidate origin health endpoint is unreachable");
    return;
  }

  if (healthResponse.status !== 200) {
    fail(`candidate /health returned HTTP ${healthResponse.status}`);
    return;
  }
  if (healthResponse.type === "opaqueredirect" || healthResponse.status >= 300) {
    fail("candidate /health redirected instead of serving the unified runtime directly");
    return;
  }

  let health;
  try {
    const text = await readBoundedText(healthResponse);
    health = JSON.parse(text);
  } catch {
    fail("candidate /health did not return bounded JSON");
    return;
  }

  if (
    !health ||
    typeof health !== "object" ||
    health.status !== "ok" ||
    health.service !== EXPECTED_SERVICE ||
    !health.workWallet ||
    typeof health.workWallet !== "object"
  ) {
    fail("candidate /health does not identify a healthy Nexus unified runtime with Work Wallet status");
    return;
  }

  let bootstrapResponse;
  try {
    bootstrapResponse = await getExact(`${origin}${BOOTSTRAP_PATH}`);
  } catch {
    fail("candidate Work Wallet bootstrap route is unreachable");
    return;
  }

  if (bootstrapResponse.status !== 400) {
    fail(`bootstrap ownership probe returned HTTP ${bootstrapResponse.status}; expected fail-closed 400 for missing metadata`);
    return;
  }

  let bootstrapText;
  try {
    bootstrapText = await readBoundedText(bootstrapResponse);
  } catch {
    fail("bootstrap ownership response exceeded the preflight limit");
    return;
  }

  if (!bootstrapText.includes("Invalid Nexus Work Wallet connector bootstrap request.")) {
    fail("candidate origin does not expose the expected Nexus Work Wallet bootstrap route contract");
    return;
  }

  process.stdout.write(`${JSON.stringify({
    origin,
    service: EXPECTED_SERVICE,
    health: "ok",
    bootstrapRoute: "owned",
  })}\n`);
  process.stdout.write("WORK_WALLET_PRODUCTION_API_PREFLIGHT_PASS\n");
}

await main();
