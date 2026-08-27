import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  loadNexusCloudGoogleDriveRuntimeConfig,
  NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_ENV,
  NexusCloudRuntimeConfigError,
} from "./nexus-cloud-runtime-config";
import { resolveNexusGoogleDriveWriterModulePath } from "./nexus-runtime-paths";

export const NEXUS_CLOUD_PREFLIGHT_SCHEMA =
  "nexus-cloud-runtime-preflight/v1" as const;
export const NEXUS_CLOUD_ESAFE_PROJECT_ID = "project-esafe-catania" as const;
export const NEXUS_CLOUD_ESAFE_WORLD_ID = "world-esafe-catania" as const;

const REQUIRED_TABLES = [
  "users",
  "sessions",
  "workspaces",
  "nexus_pm_people",
  "nexus_identity_bindings",
  "nexus_identity_claims",
  "nexus_pm_project_participations",
  "nexus_pm_permission_grants",
  "nexus_pm_files",
  "nexus_pm_canonical_objects",
  "nexus_pm_external_references",
  "nexus_pm_storage_records",
  "nexus_pm_audit_events",
  "nexus_pm_cloud_commits",
  "nexus_pm_cloud_write_operations",
] as const;

export const NEXUS_CLOUD_ESAFE_DRIVE_TARGETS = {
  "00_INBOX": "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9",
  "01_PENDING_GRAPH_LINK": "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ",
  "02_BY_TRADE": "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P",
  "03_BY_TYPE": "1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9",
  "99_AUDIT": "1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz",
} as const;

const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const PROVIDER_PREFLIGHT_TIMEOUT_MS = 30_000;

type CheckState = "PASS" | "BLOCKED";

export interface NexusCloudPreflightCheck {
  key: string;
  state: CheckState;
  detail: string;
}

export interface NexusCloudRuntimePreflightResult {
  schema: typeof NEXUS_CLOUD_PREFLIGHT_SCHEMA;
  status: "READY_FOR_CONTROLLED_E2E" | "BLOCKED";
  projectId: typeof NEXUS_CLOUD_ESAFE_PROJECT_ID;
  worldId: typeof NEXUS_CLOUD_ESAFE_WORLD_ID;
  checks: NexusCloudPreflightCheck[];
  database?: {
    targetFingerprint: string;
    requiredTableCount: number;
    presentTableCount: number;
    candidateAuthorityPathCount: number;
  };
  provider: {
    configPresent: boolean;
    mappingMatchesLiveEvidence: boolean;
    writeReleased: boolean;
    oauthSecretConfigured: boolean;
    oauthSecretSchemaValid: boolean;
    providerNetworkProbePerformed: boolean;
    providerNetworkProbePassed: boolean;
  };
  safety: {
    readOnlyDatabaseTransaction: true;
    databaseMutationPerformed: false;
    providerWritePerformed: false;
    secretValuesReturned: false;
  };
}

const pass = (key: string, detail: string): NexusCloudPreflightCheck => ({
  key,
  state: "PASS",
  detail,
});

const blocked = (key: string, detail: string): NexusCloudPreflightCheck => ({
  key,
  state: "BLOCKED",
  detail,
});

const safeDatabaseFingerprint = (databaseUrl: string): string => {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("NEXUS_CLOUD_PREFLIGHT_DATABASE_URL_NOT_POSTGRES");
  }

  const targetIdentity = [
    parsed.protocol,
    parsed.hostname.toLowerCase(),
    parsed.port || "default",
    parsed.pathname,
  ].join("|");
  return createHash("sha256").update(targetIdentity, "utf8").digest("hex").slice(0, 16);
};

const inspectOauthSecret = (
  env: NodeJS.ProcessEnv,
  secretReference: string | undefined,
): {
  configured: boolean;
  schemaValid: boolean;
  schemaIssue:
    | "NOT_CONFIGURED"
    | "INVALID_JSON"
    | "WRONG_TYPE"
    | "MISSING_CLIENT_ID"
    | "MISSING_CLIENT_SECRET"
    | "MISSING_REFRESH_TOKEN"
    | "NONE";
} => {
  if (!secretReference?.startsWith("NEXUS_SECRET_")) {
    return {
      configured: false,
      schemaValid: false,
      schemaIssue: "NOT_CONFIGURED",
    };
  }
  const raw = env[secretReference];
  if (!raw) {
    return {
      configured: false,
      schemaValid: false,
      schemaIssue: "NOT_CONFIGURED",
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.type !== "google-oauth-refresh-token/v1") {
      return { configured: true, schemaValid: false, schemaIssue: "WRONG_TYPE" };
    }
    if (typeof parsed.clientId !== "string" || !parsed.clientId.trim()) {
      return { configured: true, schemaValid: false, schemaIssue: "MISSING_CLIENT_ID" };
    }
    if (typeof parsed.clientSecret !== "string" || !parsed.clientSecret.trim()) {
      return {
        configured: true,
        schemaValid: false,
        schemaIssue: "MISSING_CLIENT_SECRET",
      };
    }
    if (typeof parsed.refreshToken !== "string" || !parsed.refreshToken.trim()) {
      return {
        configured: true,
        schemaValid: false,
        schemaIssue: "MISSING_REFRESH_TOKEN",
      };
    }
    return { configured: true, schemaValid: true, schemaIssue: "NONE" };
  } catch {
    return { configured: true, schemaValid: false, schemaIssue: "INVALID_JSON" };
  }
};

const inspectRawProviderConfig = (env: NodeJS.ProcessEnv) => {
  const raw = env[NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_ENV];
  if (!raw?.trim()) {
    return {
      present: false,
      parsed: null as Record<string, unknown> | null,
      secretReference: undefined as string | undefined,
      mappingMatches: false,
      writeEnabled: false,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(raw) as unknown;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error("root");
    }
    parsed = candidate as Record<string, unknown>;
  } catch {
    return {
      present: true,
      parsed: null as Record<string, unknown> | null,
      secretReference: undefined as string | undefined,
      mappingMatches: false,
      writeEnabled: false,
    };
  }

  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const esafe = projects.find((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return (
      record.projectId === NEXUS_CLOUD_ESAFE_PROJECT_ID &&
      record.worldId === NEXUS_CLOUD_ESAFE_WORLD_ID
    );
  }) as Record<string, unknown> | undefined;

  const targets =
    esafe?.targets && typeof esafe.targets === "object" && !Array.isArray(esafe.targets)
      ? (esafe.targets as Record<string, unknown>)
      : undefined;

  const mappingMatches = Boolean(
    targets &&
      Object.entries(NEXUS_CLOUD_ESAFE_DRIVE_TARGETS).every(
        ([role, targetId]) => targets[role] === targetId,
      ),
  );

  return {
    present: true,
    parsed,
    secretReference:
      typeof parsed.secretReference === "string" ? parsed.secretReference.trim() : undefined,
    mappingMatches,
    writeEnabled: parsed.writeEnabled === true,
  };
};

type GoogleDriveCredentialModule = {
  resolveGoogleDriveOAuthSecretFromEnv: (
    secretReference: string,
    env?: NodeJS.ProcessEnv,
  ) => Promise<{
    type: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }>;
  exchangeGoogleDriveAccessToken: (
    secret: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    },
    fetchImpl?: typeof fetch,
  ) => Promise<string>;
};

const runProviderReadOnlyProbe = async (
  env: NodeJS.ProcessEnv,
  secretReference: string,
): Promise<void> => {
  const moduleUrl = pathToFileURL(resolveNexusGoogleDriveWriterModulePath()).href;
  const writer = (await import(moduleUrl)) as GoogleDriveCredentialModule;
  if (
    typeof writer.resolveGoogleDriveOAuthSecretFromEnv !== "function" ||
    typeof writer.exchangeGoogleDriveAccessToken !== "function"
  ) {
    throw new Error("NEXUS_CLOUD_PREFLIGHT_GOOGLE_WRITER_CONTRACT_INVALID");
  }

  const signal = AbortSignal.timeout(PROVIDER_PREFLIGHT_TIMEOUT_MS);
  const boundedFetch: typeof fetch = (request, init = {}) =>
    fetch(request, {
      ...init,
      signal: init.signal ?? signal,
    });

  const secret = await writer.resolveGoogleDriveOAuthSecretFromEnv(
    secretReference,
    env,
  );
  const accessToken = await writer.exchangeGoogleDriveAccessToken(
    secret,
    boundedFetch,
  );

  for (const targetId of Object.values(NEXUS_CLOUD_ESAFE_DRIVE_TARGETS)) {
    const fields = encodeURIComponent(
      "id,mimeType,trashed,capabilities(canAddChildren)",
    );
    const response = await boundedFetch(
      `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(targetId)}?supportsAllDrives=true&fields=${fields}`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      throw new Error("NEXUS_CLOUD_PREFLIGHT_GOOGLE_TARGET_REQUEST_REJECTED");
    }

    const folder = (await response.json()) as Record<string, unknown>;
    const capabilities =
      folder.capabilities && typeof folder.capabilities === "object"
        ? (folder.capabilities as Record<string, unknown>)
        : undefined;
    if (
      folder.id !== targetId ||
      folder.mimeType !== GOOGLE_DRIVE_FOLDER_MIME ||
      folder.trashed === true ||
      capabilities?.canAddChildren === false
    ) {
      throw new Error("NEXUS_CLOUD_PREFLIGHT_GOOGLE_TARGET_NOT_WRITABLE");
    }
  }
};

const inspectDatabase = async (
  env: NodeJS.ProcessEnv,
  checks: NexusCloudPreflightCheck[],
): Promise<NexusCloudRuntimePreflightResult["database"] | undefined> => {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    checks.push(blocked("database.configured", "DATABASE_URL is not configured."));
    return undefined;
  }

  let targetFingerprint: string;
  try {
    targetFingerprint = safeDatabaseFingerprint(databaseUrl);
  } catch {
    checks.push(blocked("database.target", "DATABASE_URL is not a valid PostgreSQL target."));
    return undefined;
  }

  checks.push(
    pass(
      "database.target",
      `PostgreSQL target is configured; non-secret target fingerprint ${targetFingerprint}.`,
    ),
  );

  let pool: { connect: () => Promise<any>; end: () => Promise<void> } | undefined;
  try {
    ({ pool } = (await import("@workspace/db")) as {
      pool: { connect: () => Promise<any>; end: () => Promise<void> };
    });
  } catch {
    checks.push(blocked("database.module", "Nexus database module could not initialize."));
    return {
      targetFingerprint,
      requiredTableCount: REQUIRED_TABLES.length,
      presentTableCount: 0,
      candidateAuthorityPathCount: 0,
    };
  }

  let client: any;
  try {
    client = await pool.connect();
  } catch {
    checks.push(blocked("database.reachable", "PostgreSQL connection could not be established."));
    await pool.end();
    return {
      targetFingerprint,
      requiredTableCount: REQUIRED_TABLES.length,
      presentTableCount: 0,
      candidateAuthorityPathCount: 0,
    };
  }

  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SELECT 1");
    checks.push(pass("database.reachable", "PostgreSQL accepted a read-only transaction."));

    const tableResult = await client.query(
      `SELECT required_name AS name, to_regclass(required_name)::text AS regclass
         FROM unnest($1::text[]) AS required(required_name)`,
      [REQUIRED_TABLES],
    );
    const present = new Set<string>(
      tableResult.rows
        .filter((row: { regclass: string | null }) => Boolean(row.regclass))
        .map((row: { name: string }) => row.name),
    );
    const missing = REQUIRED_TABLES.filter((name) => !present.has(name));

    if (missing.length === 0) {
      checks.push(
        pass(
          "database.schema",
          `All ${REQUIRED_TABLES.length} required Nexus auth/access/Cloud tables are present.`,
        ),
      );
    } else {
      checks.push(
        blocked(
          "database.schema",
          `Missing required tables: ${missing.join(", ")}. No schema mutation was attempted.`,
        ),
      );
    }

    let candidateAuthorityPathCount = 0;
    if (
      present.has("nexus_pm_people") &&
      present.has("nexus_identity_bindings") &&
      present.has("nexus_pm_project_participations") &&
      present.has("nexus_pm_permission_grants")
    ) {
      const authorityResult = await client.query(
        `SELECT count(*)::int AS count
           FROM nexus_identity_bindings b
           JOIN nexus_pm_people p
             ON p.person_id = b.person_id
           JOIN nexus_pm_project_participations pp
             ON pp.person_id = p.person_id
           JOIN nexus_pm_permission_grants g
             ON g.participation_id = pp.participation_id
            AND g.workspace_id = pp.workspace_id
          WHERE b.status = 'ACTIVE'
            AND b.revoked_at IS NULL
            AND lower(p.status) = 'active'
            AND pp.project_id = $1
            AND pp.world_id = $2
            AND pp.participation_status = 'active'
            AND (pp.valid_from IS NULL OR pp.valid_from <= now())
            AND (pp.valid_to IS NULL OR pp.valid_to > now())
            AND g.effect = 'allow'
            AND g.module_id = 'cloud'
            AND g.action_key = 'cloud.file.write'
            AND (g.valid_from IS NULL OR g.valid_from <= now())
            AND (g.valid_to IS NULL OR g.valid_to > now())`,
        [NEXUS_CLOUD_ESAFE_PROJECT_ID, NEXUS_CLOUD_ESAFE_WORLD_ID],
      );
      candidateAuthorityPathCount = Number(authorityResult.rows[0]?.count ?? 0);

      if (candidateAuthorityPathCount > 0) {
        checks.push(
          pass(
            "authority.candidate-path",
            `${candidateAuthorityPathCount} persisted candidate authority path(s) exist for exact e-SAFE cloud.file.write. Canonical request-time deny evaluation is still required.`,
          ),
        );
      } else {
        checks.push(
          blocked(
            "authority.candidate-path",
            "No persisted active identity -> Person -> e-SAFE participation -> exact cloud.file.write allow path exists.",
          ),
        );
      }
    } else {
      checks.push(
        blocked(
          "authority.candidate-path",
          "Authority-path rows cannot be inspected until identity/access tables exist.",
        ),
      );
    }

    await client.query("ROLLBACK");

    return {
      targetFingerprint,
      requiredTableCount: REQUIRED_TABLES.length,
      presentTableCount: present.size,
      candidateAuthorityPathCount,
    };
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {
      // No mutation exists to recover; keep diagnostics fail-closed.
    }
    checks.push(
      blocked(
        "database.read",
        "Read-only PostgreSQL inspection failed; no database details were returned.",
      ),
    );
    return {
      targetFingerprint,
      requiredTableCount: REQUIRED_TABLES.length,
      presentTableCount: 0,
      candidateAuthorityPathCount: 0,
    };
  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * One-shot, read-only readiness report for the real Nexus Cloud runtime.
 *
 * It never runs migrations, inserts rows, performs a Google Drive create, or
 * returns database/OAuth secret values. The optional provider probe performs
 * only OAuth token exchange and Drive folder GET/capability checks.
 */
export async function runNexusCloudRuntimePreflight(
  env: NodeJS.ProcessEnv = process.env,
): Promise<NexusCloudRuntimePreflightResult> {
  const checks: NexusCloudPreflightCheck[] = [];

  const stagingDeviceAuth = env.NEXUS_CLOUD_STAGING_DEVICE_AUTH === "true";
  const publicOrigin = env.NEXUS_PUBLIC_ORIGIN?.trim();

  if (stagingDeviceAuth) {
    checks.push(
      pass(
        "runtime.public-origin",
        "Controlled Cloud staging uses explicit Bearer sessions; browser-cookie mutation origin is not the active auth path.",
      ),
    );
    checks.push(
      pass(
        "runtime.oidc-client",
        "Controlled Cloud staging uses the canonical staging-device claim/session path; REPL_ID is not required.",
      ),
    );
  } else {
    if (!publicOrigin) {
      checks.push(blocked("runtime.public-origin", "NEXUS_PUBLIC_ORIGIN is not configured."));
    } else {
      try {
        const origin = new URL(publicOrigin);
        if (origin.protocol !== "https:" && env.NODE_ENV === "production") {
          checks.push(blocked("runtime.public-origin", "Production NEXUS_PUBLIC_ORIGIN must use HTTPS."));
        } else {
          checks.push(pass("runtime.public-origin", "NEXUS_PUBLIC_ORIGIN is syntactically valid."));
        }
      } catch {
        checks.push(blocked("runtime.public-origin", "NEXUS_PUBLIC_ORIGIN is not a valid URL."));
      }
    }

    if (env.REPL_ID?.trim()) {
      checks.push(pass("runtime.oidc-client", "REPL_ID is configured for the existing OIDC runtime."));
    } else {
      checks.push(blocked("runtime.oidc-client", "REPL_ID is not configured."));
    }
  }

  if (env.NEXUS_IDENTITY_BINDING_MODE === "postgres") {
    checks.push(pass("runtime.identity-mode", "Canonical identity binding mode is postgres."));
  } else {
    checks.push(
      blocked(
        "runtime.identity-mode",
        "NEXUS_IDENTITY_BINDING_MODE must be postgres for a BOUND canonical Person session.",
      ),
    );
  }

  const providerRaw = inspectRawProviderConfig(env);
  let providerConfigValid = false;
  if (!providerRaw.present) {
    checks.push(
      blocked(
        "provider.config",
        `${NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_ENV} is not configured.`,
      ),
    );
  } else if (!providerRaw.parsed) {
    checks.push(blocked("provider.config", "Google Drive runtime config is not valid JSON/object data."));
  } else {
    checks.push(pass("provider.config", "Google Drive server runtime config is present."));

    if (providerRaw.mappingMatches) {
      checks.push(
        pass(
          "provider.mapping",
          "Exact e-SAFE semantic targets match the live-read Drive mapping evidence recorded on 2026-08-22.",
        ),
      );
    } else {
      checks.push(
        blocked(
          "provider.mapping",
          "e-SAFE project/world semantic target mapping differs from the live-read Drive evidence.",
        ),
      );
    }

    if (providerRaw.writeEnabled) {
      try {
        loadNexusCloudGoogleDriveRuntimeConfig(env);
        providerConfigValid = true;
        checks.push(
          pass(
            "provider.release",
            "Drive write release is explicitly enabled and the canonical runtime config validates.",
          ),
        );
      } catch (error) {
        checks.push(
          blocked(
            "provider.release",
            error instanceof NexusCloudRuntimeConfigError
              ? error.message
              : "Drive runtime release validation failed.",
          ),
        );
      }
    } else {
      checks.push(
        blocked(
          "provider.release",
          "Drive mapping may be staged, but writeEnabled is not explicitly true. No provider write is released.",
        ),
      );
    }
  }

  const oauth = inspectOauthSecret(env, providerRaw.secretReference);
  if (!oauth.configured) {
    checks.push(
      blocked(
        "provider.oauth-secret",
        "Referenced NEXUS_SECRET_* Google OAuth refresh-token credential is not configured.",
      ),
    );
  } else if (!oauth.schemaValid) {
    checks.push(
      blocked(
        "provider.oauth-secret",
        `Referenced Google OAuth credential exists but does not match google-oauth-refresh-token/v1 shape (safe schema issue: ${oauth.schemaIssue}).`,
      ),
    );
  } else {
    checks.push(
      pass(
        "provider.oauth-secret",
        "Referenced Google OAuth credential has the expected server-only shape; values were not returned.",
      ),
    );
  }

  const providerNetworkProbeRequested =
    env.NEXUS_CLOUD_PREFLIGHT_PROVIDER_PROBE === "true";
  let providerNetworkProbePerformed = false;
  let providerNetworkProbePassed = false;

  if (!providerNetworkProbeRequested) {
    checks.push(
      blocked(
        "provider.network-probe",
        "Read-only Google OAuth/Drive capability probe has not been explicitly requested.",
      ),
    );
  } else if (!oauth.schemaValid || !providerRaw.mappingMatches || !providerRaw.secretReference) {
    checks.push(
      blocked(
        "provider.network-probe",
        "Read-only provider probe cannot run until exact mapping and OAuth secret shape validate.",
      ),
    );
  } else {
    providerNetworkProbePerformed = true;
    try {
      await runProviderReadOnlyProbe(env, providerRaw.secretReference);
      providerNetworkProbePassed = true;
      checks.push(
        pass(
          "provider.network-probe",
          "Real OAuth token exchange and read-only capability checks passed for all five e-SAFE Drive targets; no file was created.",
        ),
      );
    } catch (error) {
      const safeFailureCode =
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string" &&
        /^NEXUS_[A-Z0-9_]+$/.test((error as { code: string }).code)
          ? (error as { code: string }).code
          : error instanceof Error && /^NEXUS_[A-Z0-9_]+$/.test(error.message)
            ? error.message
            : "NEXUS_CLOUD_PREFLIGHT_PROVIDER_PROBE_FAILED";
      const safeProviderReason =
        error &&
        typeof error === "object" &&
        "providerReason" in error &&
        typeof (error as { providerReason?: unknown }).providerReason === "string" &&
        /^[a-z0-9_]{2,80}$/.test(
          (error as { providerReason: string }).providerReason,
        )
          ? (error as { providerReason: string }).providerReason
          : undefined;
      checks.push(
        blocked(
          "provider.network-probe",
          `Real read-only Google OAuth/Drive capability probe failed (${safeFailureCode}${safeProviderReason ? `; provider=${safeProviderReason}` : ""}); provider details and secret values were not returned.`,
        ),
      );
    }
  }

  const database = await inspectDatabase(env, checks);
  const provider = {
    configPresent: providerRaw.present,
    mappingMatchesLiveEvidence: providerRaw.mappingMatches,
    writeReleased: providerConfigValid,
    oauthSecretConfigured: oauth.configured,
    oauthSecretSchemaValid: oauth.schemaValid,
    providerNetworkProbePerformed,
    providerNetworkProbePassed,
  };

  const hasBlocker = checks.some((check) => check.state === "BLOCKED");
  return {
    schema: NEXUS_CLOUD_PREFLIGHT_SCHEMA,
    status: hasBlocker ? "BLOCKED" : "READY_FOR_CONTROLLED_E2E",
    projectId: NEXUS_CLOUD_ESAFE_PROJECT_ID,
    worldId: NEXUS_CLOUD_ESAFE_WORLD_ID,
    checks,
    database,
    provider,
    safety: {
      readOnlyDatabaseTransaction: true,
      databaseMutationPerformed: false,
      providerWritePerformed: false,
      secretValuesReturned: false,
    },
  };
}
