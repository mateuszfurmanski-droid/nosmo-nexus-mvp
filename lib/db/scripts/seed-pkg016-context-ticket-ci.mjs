import pg from "pg";

const { Pool } = pg;

if (process.env.CI !== "true" || process.env.NEXUS_CI_CONTEXT_TICKET_FIXTURE !== "true") {
  throw new Error("PKG-016 CI fixture is restricted to explicit CI execution");
}

if (process.env.NODE_ENV === "production") {
  throw new Error("PKG-016 CI fixture is forbidden in production");
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const provider = "oidc:https://replit.com/oidc";
const providerSubject = "oidc-sub-ci";
const personId = "person-ci";
const nexusProjectId = "halifax-demo";
const participationId = "participation-ci-halifax";
const sessionId = "ci-session-pkg016";

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO users (id, email, first_name, last_name)
     VALUES ($1, 'pkg016-ci@example.invalid', 'PKG016', 'CI')
     ON CONFLICT (id) DO NOTHING`,
    [providerSubject],
  );

  const workspaceResult = await client.query(
    `INSERT INTO workspaces (owner_id, name)
     VALUES ($1, 'PKG-016 CI Workspace')
     ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [providerSubject],
  );
  const workspaceId = workspaceResult.rows[0]?.id;
  if (!workspaceId) throw new Error("Unable to resolve CI workspace");

  const projectResult = await client.query(
    `SELECT id FROM projects WHERE nexus_project_id = $1 LIMIT 1`,
    [nexusProjectId],
  );

  let projectDbId = projectResult.rows[0]?.id;
  if (!projectDbId) {
    const inserted = await client.query(
      `INSERT INTO projects (workspace_id, nexus_project_id, name, status)
       VALUES ($1, $2, 'Halifax PKG-016 CI', 'active')
       RETURNING id`,
      [workspaceId, nexusProjectId],
    );
    projectDbId = inserted.rows[0]?.id;
  }
  if (!projectDbId) throw new Error("Unable to resolve CI project");

  await client.query(
    `INSERT INTO nexus_persons (id, display_name, status)
     VALUES ($1, 'PKG-016 CI Person', 'ACTIVE')
     ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'`,
    [personId],
  );

  await client.query(
    `INSERT INTO nexus_identity_bindings
      (id, provider, provider_subject, person_id, status, verified_at)
     VALUES ('identity-ci-pkg016', $1, $2, $3, 'ACTIVE', NOW())
     ON CONFLICT (provider, provider_subject) DO NOTHING`,
    [provider, providerSubject, personId],
  );

  await client.query(
    `INSERT INTO nexus_project_participations
      (id, person_id, project_id, status, functions, assignments, trade_scopes, work_package_scopes, application_permissions)
     VALUES ($1, $2, $3, 'ACTIVE', '["PROJECT_MANAGER"]'::jsonb, '["GENERAL"]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [participationId, personId, projectDbId],
  );

  await client.query(
    `INSERT INTO sessions (sid, sess, expire)
     VALUES ($1, $2::jsonb, NOW() + INTERVAL '1 hour')
     ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
    [
      sessionId,
      JSON.stringify({
        user: {
          id: providerSubject,
          email: "pkg016-ci@example.invalid",
          firstName: "PKG016",
          lastName: "CI",
          profileImageUrl: null,
        },
        access_token: "ci-non-production-placeholder",
      }),
    ],
  );

  await client.query("COMMIT");
  console.log("PASS seed-pkg016-context-ticket-ci");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
