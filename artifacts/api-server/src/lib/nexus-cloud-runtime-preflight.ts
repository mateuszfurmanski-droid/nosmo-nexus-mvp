import { createHash } from "node:crypto";
import {
  loadNexusCloudGoogleDriveRuntimeConfig,
  NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_ENV,
  NexusCloudRuntimeConfigError,
} from "./nexus-cloud-runtime-config";

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

type CheckState = "PASS" | "BLOCKED" | "WARN";

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
  provider?: {
    configPresent: boolean;
    mappingMatchesLiveEvidence: boolean;
    writeReleased: boolean;
    oauthSecretConfigured: boolean;
    oauthSecretSchemaValid: boolean;
    providerNetworkProbePerformed: false;
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

const warn = (key: string, detail: string): NexusCloudPreflightCheck => ({
  key,
  state: "WARN",
  detail,
});

const safeDatabaseFingerprint = (databaseUrl: string): string => {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("NEXUS_CLOUD_PREFLIGHT_DATABASE_URL_NOT_POSTGRES");
  }

  // Do not expose host, username, database name, password or query parameters.
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
): { configured: boolean; schemaValid: boolean } => {
  if (!secretReference?.startsWith("NEXUS_SECRET_")) {
    return { configured: false, schemaValid: false };
  }
  const raw = env[secretReference];
  if (!raw) return { configured: false, schemaValid: false };

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const schemaValid =
      parsed.type === "google-oauth-refresh-token/v1" &&
      typeof parsed.clientId === "string" && parsed.clientId.trim().length > 0 &&
      typeof parsed.clientSecret === "string" && parsed.clientSecret.trim().length > 0 &&
      typeof parsed.refreshToken === "string" && parsed.refreshToken.trim().length > 0;
    return { configured: true, schemaValid };
  } catch {
    return { configured: true, schemaValid: false };
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

  const client = await pool.connect();
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
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Read-only diagnostic only; no mutation exists to recover.
    }
    checks.push(
      blocked(
        "database.read",
        `Read-only PostgreSQL inspection failed: ${error instanceof Error ? error.message : "unknown error"}.`,
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
 * This function intentionally closes the DB pool because it is designed for a
 * CLI/pre-deployment diagnostic process, not for an already-running API server.
 * It never runs migrations, inserts rows, performs a Google Drive create, or
 * returns database/OAuth secret values.
 */
export async function runNexusCloudRuntimePreflight(
  env: NodeJS.ProcessEnv = process.env,
): Promise<NexusCloudRuntimePreflightResult> {
  const checks: NexusCloudPreflightCheck[] = [];

  const publicOrigin = env.NEXUS_PUBLIC_ORIGIN?.trim();
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
        "Referenced Google OAuth credential exists but does not match google-oauth-refresh-token/v1 shape.",
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

  checks.push(
    warn(
      "provider.network-probe",
      "No Google OAuth token exchange or target capability request is performed by this preflight slice.",
    ),
  );

  const database = await inspectDatabase(env, checks);
  const provider = {
    configPresent: providerRaw.present,
    mappingMatchesLiveEvidence: providerRaw.mappingMatches,
    writeReleased: providerConfigValid,
    oauthSecretConfigured: oauth.configured,
    oauthSecretSchemaValid: oauth.schemaValid,
    providerNetworkProbePerformed: false as const,
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
