import { createHash } from "node:crypto";
import { once } from "node:events";
import { and, eq } from "drizzle-orm";
import app from "../src/vercel-core-staging";
import {
  db,
  pool,
  usersTable,
  workspacesTable,
  nexusIdentityBindingsTable,
  nexusIdentityClaimsTable,
  nexusPmAccessDecisionsTable,
  nexusPmPeopleTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  sessionsTable,
} from "@workspace/db";
import {
  STAGING_DEVICE_IDENTITY_PROVIDER,
  STAGING_DEVICE_SUBJECT_PREFIX,
} from "../src/lib/nexus-person-binding";

const PROJECT_ID = "project-esafe-catania";
const WORLD_ID = "world-esafe-catania";
const PERSON_ID = "person-staging-device-worker";
const CLAIM_CODE = "staging-device-e2e-claim-53f85fbf95b2483d890eab8b8b13e8ca";
const MODULE_ID = "worksuite";
const ACTION = "worksuite.assignment.read";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`STAGING_DEVICE_LOGIN_ASSERTION_FAILED: ${message}`);
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function activeRecord(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "active",
    validFrom: "2026-01-01T00:00:00.000Z",
    competenceRequirementIds: [],
    ...extra,
  };
}

async function seed(): Promise<void> {
  const ownerId = "synthetic-staging-device-owner";
  const now = new Date();
  await db.insert(usersTable).values({
    id: ownerId,
    email: "staging-device-owner@invalid.example",
    firstName: "Synthetic Staging Owner",
  });
  const [workspace] = await db
    .insert(workspacesTable)
    .values({ ownerId, name: "SYNTHETIC_E2E staging device workspace" })
    .returning();
  assert(workspace, "workspace missing");

  await db.insert(nexusPmPeopleTable).values({
    personId: PERSON_ID,
    displayName: "SYNTHETIC_E2E Staging Device Worker",
    personType: "worker",
    status: "active",
    recordJson: activeRecord({ id: PERSON_ID, personType: "worker" }),
    persistedAt: now,
  });

  const participationId = "participation-staging-device-worker";
  await db.insert(nexusPmProjectParticipationsTable).values({
    participationId,
    workspaceId: workspace.id,
    personId: PERSON_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    participationStatus: "active",
    recordJson: activeRecord({ id: participationId, personId: PERSON_ID, projectId: PROJECT_ID, worldId: WORLD_ID }),
    persistedAt: now,
  });

  await db.insert(nexusPmPermissionGrantsTable).values({
    grantId: "grant-staging-device-read",
    workspaceId: workspace.id,
    participationId,
    effect: "allow",
    moduleId: MODULE_ID,
    actionKey: ACTION,
    recordJson: activeRecord({ id: "grant-staging-device-read", effect: "allow", actionKey: ACTION }),
    persistedAt: now,
  });

  await db.insert(nexusPmAccessDecisionsTable).values({
    decisionId: "decision-staging-device-read",
    workspaceId: workspace.id,
    personId: PERSON_ID,
    participationId,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId: MODULE_ID,
    actionKey: ACTION,
    result: "allowed",
    evaluatedAt: now,
    recordJson: activeRecord({ id: "decision-staging-device-read", result: "allowed", actionKey: ACTION }),
    persistedAt: now,
  });

  await db.insert(nexusIdentityClaimsTable).values({
    claimId: "claim-staging-device-e2e-001",
    codeDigest: sha(CLAIM_CODE),
    personId: PERSON_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
}

async function request(origin: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${origin}${path}`, { ...init, redirect: "manual" });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  return { status: response.status, payload };
}

async function main(): Promise<void> {
  await seed();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "server address missing");
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    const login = await request(origin, "/api/nexus/core/staging-device-login", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ claimCode: CLAIM_CODE }),
    });
    assert(login.status === 201, `login expected 201, got ${login.status}: ${JSON.stringify(login.payload)}`);
    assert(login.payload?.authentication === "STAGING_DEVICE_CLAIM", "wrong authentication marker");
    assert(login.payload?.personId === PERSON_ID, "wrong Person");
    const token = String(login.payload?.token ?? "");
    assert(token.length === 64, "opaque session token missing");

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.sid, token));
    const sessionUser = session?.sess && typeof session.sess === "object"
      ? (session.sess as any).user
      : null;
    assert(typeof sessionUser?.id === "string" && sessionUser.id.startsWith(STAGING_DEVICE_SUBJECT_PREFIX), "session subject is not staging-device scoped");

    const [binding] = await db
      .select()
      .from(nexusIdentityBindingsTable)
      .where(
        and(
          eq(nexusIdentityBindingsTable.provider, STAGING_DEVICE_IDENTITY_PROVIDER),
          eq(nexusIdentityBindingsTable.personId, PERSON_ID),
        ),
      );
    assert(binding?.status === "ACTIVE", "staging binding missing");
    assert(!JSON.stringify(binding).includes(String(sessionUser.id)), "raw staging subject persisted in binding row");

    const inbox = await request(
      origin,
      `/api/nexus/core/work-inbox?projectId=${PROJECT_ID}&worldId=${WORLD_ID}`,
      { headers: { authorization: `Bearer ${token}`, accept: "application/json" } },
    );
    assert(inbox.status === 200, `work inbox expected 200, got ${inbox.status}: ${JSON.stringify(inbox.payload)}`);
    assert(inbox.payload?.recipientPersonId === PERSON_ID, "session did not resolve canonical Person");
    assert(Array.isArray(inbox.payload?.tasks) && inbox.payload.tasks.length === 0, "fixture inbox should be empty");

    const replay = await request(origin, "/api/nexus/core/staging-device-login", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ claimCode: CLAIM_CODE }),
    });
    assert(replay.status === 403, `replay expected 403, got ${replay.status}`);

    const [claim] = await db
      .select()
      .from(nexusIdentityClaimsTable)
      .where(eq(nexusIdentityClaimsTable.claimId, "claim-staging-device-e2e-001"));
    assert(claim?.status === "CONSUMED", "claim not consumed");
    assert(claim?.consumedAt instanceof Date, "claim consumedAt missing");

    console.log(JSON.stringify({
      marker: "NEXUS_CORE_STAGING_DEVICE_LOGIN_PASS",
      scope: "NON_PRODUCTION_SYNTHETIC_E2E",
      authentication: "STAGING_DEVICE_CLAIM",
      provider: STAGING_DEVICE_IDENTITY_PROVIDER,
      claimConsumed: true,
      replayHttpStatus: replay.status,
      canonicalInboxHttpStatus: inbox.status,
      rawClaimPersisted: false,
      rawStagingSubjectPersistedInBinding: false,
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
