import crypto from "node:crypto";

const SCHEMA = "nexus-work-wallet-db-preflight/v1";
const REQUIRED_PURPOSE = "nosmo-nexus-mvp-development";
const CHROMIUM_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;

function read(name) {
  return String(process.env[name] ?? "").trim();
}

function parseDatabaseTarget(raw) {
  if (!raw) return { configured: false, valid: false, fingerprint: null };
  try {
    const url = new URL(raw);
    if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
      return { configured: true, valid: false, fingerprint: null };
    }
    if (!url.hostname || !url.pathname || url.pathname === "/") {
      return { configured: true, valid: false, fingerprint: null };
    }

    const target = [
      url.hostname.toLowerCase(),
      url.port || "5432",
      decodeURIComponent(url.pathname).replace(/\/+$/, ""),
    ].join("|");

    return {
      configured: true,
      valid: true,
      fingerprint: crypto.createHash("sha256").update(target, "utf8").digest("hex"),
    };
  } catch {
    return { configured: true, valid: false, fingerprint: null };
  }
}

function parseAllowedOrigins(raw) {
  const exactChromiumOrigins = [];
  let invalidEntries = 0;

  for (const item of raw.split(",")) {
    const candidate = item.trim();
    if (!candidate) continue;

    if (CHROMIUM_EXTENSION_ORIGIN.test(candidate)) {
      exactChromiumOrigins.push(candidate);
      continue;
    }

    try {
      const url = new URL(candidate);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      ) {
        continue;
      }
    } catch {
      // handled below
    }

    invalidEntries += 1;
  }

  return {
    exactChromiumOriginCount: new Set(exactChromiumOrigins).size,
    invalidEntries,
  };
}

function buildReport() {
  const database = parseDatabaseTarget(read("DATABASE_URL"));
  const allowedOrigins = parseAllowedOrigins(
    read("NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS"),
  );
  const expectedFingerprint = read("NEXUS_WORK_WALLET_DB_EXPECTED_FINGERPRINT");
  const nodeEnvironment = read("NODE_ENV") || "unset";

  const checks = {
    databaseConfigured: database.configured,
    databaseUrlIsPostgres: database.valid,
    nonProductionRuntime: nodeEnvironment !== "production",
    targetPurposeAttested:
      read("NEXUS_WORK_WALLET_DB_TARGET_PURPOSE") === REQUIRED_PURPOSE,
    expectedFingerprintConfigured: SHA256_HEX.test(expectedFingerprint),
    targetFingerprintMatches:
      Boolean(database.fingerprint) &&
      SHA256_HEX.test(expectedFingerprint) &&
      crypto.timingSafeEqual(
        Buffer.from(database.fingerprint, "hex"),
        Buffer.from(expectedFingerprint, "hex"),
      ),
    postgresIdentityBindingEnabled:
      read("NEXUS_IDENTITY_BINDING_MODE") === "postgres",
    exactChromiumExtensionOriginConfigured:
      allowedOrigins.exactChromiumOriginCount > 0,
    contextTicketOriginListValid: allowedOrigins.invalidEntries === 0,
  };

  return {
    schema: SCHEMA,
    targetFingerprint: database.fingerprint,
    nodeEnvironment,
    exactChromiumExtensionOriginCount: allowedOrigins.exactChromiumOriginCount,
    checks,
    readyForSafeDevelopmentSchemaReview: Object.values(checks).every(Boolean),
  };
}

const report = buildReport();
const assertSafeDev = process.argv.includes("--assert-safe-dev");

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (assertSafeDev && !report.readyForSafeDevelopmentSchemaReview) {
  process.stderr.write(
    "Work Wallet DB target preflight rejected this runtime. No schema command was executed.\n",
  );
  process.exitCode = 2;
}
