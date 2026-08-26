import { createHash } from "node:crypto";
import { once } from "node:events";
import { and, eq } from "drizzle-orm";
import app from "../src/app";
import {
  db,
  pool,
  usersTable,
  workspacesTable,
  sessionsTable,
  nexusIdentityBindingsTable,
  nexusIdentityClaimsTable,
  nexusPmPeopleTable,
  nexusPmProjectParticipationsTable,
} from "@workspace/db";
import {
  digestProviderSubject,
  getCurrentIdentityProviderKey,
} from "../src/lib/nexus-person-binding";

const PROJECT_ID = "project-esafe-catania";
const WORLD_ID = "world-esafe-catania";
const SUBJECT = "synthetic-identity-claim-user";
const PERSON_ID = "person-esafe-identity-claim-user";
const SESSION_ID = "c".repeat(64);
const CLAIM_CODE = "synthetic-e2e-claim-7d4d04c7f92a4f2a92a0d00f6f2d46a5";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`IDENTITY_CLAIM_ASSERTION_FAILED: ${message}`);
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
  const now = new Date();
  await db.insert(usersTable).values({
    id: SUBJECT,
    email: "identity-claim.synthetic@invalid.example",
    firstName: "Synthetic Claim User",
  });
  const [workspace] = await db
    .insert(workspacesTable)
    .values({ ownerId: SUBJECT, name: "SYNTHETIC_E2E identity claim workspace" })
    .returning();
  assert(workspace, "workspace was not created");

  await db.insert(sessionsTable).values({
    sid: SESSION_ID,
    sess: {
      user: { id: SUBJECT, email: "identity-claim.synthetic@invalid.example", firstName: "Synthetic Claim User" },
      access_token: "synthetic-claim-access",
    },
    expire: new Date(Date.now() + 60 * 60 * 1000),
  });

  await db.insert(nexusPmPeopleTable).values({
    personId: PERSON_ID,
    displayName: "SYNTHETIC_E2E Identity Claim User",
    personType: "worker",
    status: "active",
    recordJson: activeRecord({ id: PERSON_ID, displayName: "SYNTHETIC_E2E Identity Claim User", personType: "worker" }),
    persistedAt: now,
  });

  await db.insert(nexusPmProjectParticipationsTable).values({
    participationId: "participation-identity-claim-user",
    workspaceId: workspace.id,
    personId: PERSON_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    participationStatus: "active",
    recordJson: activeRecord({
      id: "participation-identity-claim-user",
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
    }),
    persistedAt: now,
  });

  await db.insert(nexusIdentityClaimsTable).values({
    claimId: "claim-identity-e2e-001",
    codeDigest: sha(CLAIM_CODE),
    personId: PERSON_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
}

async function callClaim(origin: string): Promise<{ status: number; payload: any }> {
  const response = await fetch(`${origin}/api/nexus/core/identity/claim`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SESSION_ID}`,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ claimCode: CLAIM_CODE }),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

async function main(): Promise<void> {
  await seed();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "HTTP server did not expose an address");
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    const first = await callClaim(origin);
    assert(first.status === 201, `first claim expected 201, got ${first.status}: ${JSON.stringify(first.payload)}`);
    assert(first.payload?.bound === true, "claim did not return bound=true");
    assert(first.payload?.personId === PERSON_ID, "claim bound wrong Person");

    const provider = getCurrentIdentityProviderKey();
    const providerSubjectDigest = digestProviderSubject(SUBJECT);
    const [binding] = await db
      .select()
      .from(nexusIdentityBindingsTable)
      .where(
        and(
          eq(nexusIdentityBindingsTable.provider, provider),
          eq(nexusIdentityBindingsTable.providerSubjectDigest, providerSubjectDigest),
        ),
      );
    assert(binding?.personId === PERSON_ID, "exact provider subject digest binding was not persisted");
    assert(binding?.status === "ACTIVE", "binding is not active");

    const [claim] = await db
      .select()
      .from(nexusIdentityClaimsTable)
      .where(eq(nexusIdentityClaimsTable.claimId, "claim-identity-e2e-001"));
    assert(claim?.status === "CONSUMED", "claim was not consumed");
    assert(claim?.consumedProviderSubjectDigest === providerSubjectDigest, "consumed subject digest mismatch");
    assert(claim?.consumedAt instanceof Date, "claim consumedAt missing");

    const replay = await callClaim(origin);
    assert(replay.status === 403, `claim replay expected 403, got ${replay.status}`);

    console.log(JSON.stringify({
      marker: "NEXUS_CORE_IDENTITY_CLAIM_PASS",
      scope: "SYNTHETIC_E2E_ONLY",
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      bindingPersisted: true,
      rawProviderSubjectPersisted: false,
      claimConsumed: true,
      replayHttpStatus: replay.status,
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
