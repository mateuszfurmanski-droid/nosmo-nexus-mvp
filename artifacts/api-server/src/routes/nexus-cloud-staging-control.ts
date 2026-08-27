import { and, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  nexusIdentityBindingsTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
} from "@workspace/db";
import { getSessionId, deleteSession } from "../lib/auth";
import {
  CLOUD_CONTROL_PERSON_ID,
  createNexusCloudControlSession,
  ESAFE_PROJECT_ID,
  ESAFE_WORLD_ID,
} from "../lib/nexus-cloud-staging-device-session";
import { digestProviderSubject, STAGING_DEVICE_IDENTITY_PROVIDER } from "../lib/nexus-person-binding";
import { resolveNexusServerRuntimeIdentity } from "../lib/nexus-runtime-identity";

const router: IRouter = Router();
const DENY_GRANT_ID = "grant-staging-cloud-e2e-explicit-deny";

function requireHarness(res: Response): boolean {
  if (
    process.env.NEXUS_CLOUD_CONTROL_HARNESS_ENABLED !== "true" ||
    process.env.VERCEL_ENV === "production"
  ) {
    res.status(404).json({ error: "NEXUS_CLOUD_CONTROL_HARNESS_DISABLED" });
    return false;
  }
  return true;
}

function sameOrigin(req: Request): boolean {
  const origin = req.get("origin");
  const host = req.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function requireControlIdentity(req: Request, res: Response) {
  if (!req.isAuthenticated() || !req.user?.id) {
    res.status(401).json({ error: "NEXUS_CLOUD_CONTROL_AUTH_REQUIRED" });
    return null;
  }
  const identity = await resolveNexusServerRuntimeIdentity(req);
  if (identity.identityState !== "BOUND" || identity.personId !== CLOUD_CONTROL_PERSON_ID) {
    res.status(403).json({ error: "NEXUS_CLOUD_CONTROL_PERSON_MISMATCH" });
    return null;
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      and(
        eq(nexusPmProjectParticipationsTable.canonicalPersonId, CLOUD_CONTROL_PERSON_ID),
        eq(nexusPmProjectParticipationsTable.projectId, ESAFE_PROJECT_ID),
        eq(nexusPmProjectParticipationsTable.worldId, ESAFE_WORLD_ID),
        eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
      ),
    );
  const active = rows.filter((row) => {
    if (row.validFrom && row.validFrom > now) return false;
    if (row.validTo && row.validTo <= now) return false;
    return true;
  });
  if (active.length !== 1) {
    res.status(409).json({ error: "NEXUS_CLOUD_CONTROL_PARTICIPATION_INVALID" });
    return null;
  }
  return active[0]!;
}

router.get("/nexus/cloud/_staging/control", async (_req, res) => {
  if (!requireHarness(res)) return;

  try {
    const session = await createNexusCloudControlSession();
    res.cookie("sid", session.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.type("html").send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Nexus Cloud controlled E2E</title></head>
<body style="font-family:system-ui;background:#111;color:#eee;padding:24px">
<h1>Nexus Cloud controlled staging E2E</h1>
<p>Dedicated synthetic staging Person only. No OAuth credential is exposed to this page.</p>
<pre id="out">Running...</pre>
<script>
const out = document.getElementById('out');
const log = (x) => { out.textContent += '\\n' + x; };

async function toggleDeny(action) {
  const r = await fetch('/api/nexus/cloud/_staging/control/deny', {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({action})
  });
  return {status:r.status, body:await r.json()};
}

async function upload(key) {
  const fd = new FormData();
  fd.append('projectId', '${ESAFE_PROJECT_ID}');
  fd.append('worldId', '${ESAFE_WORLD_ID}');
  fd.append('classification', 'audit_only');
  fd.append('file', new Blob(['NOSMO Nexus controlled staging E2E 2026-08-27\\n'], {type:'text/plain'}), 'nexus-cloud-controlled-e2e.txt');
  const r = await fetch('/api/nexus/cloud/files', {
    method: 'POST',
    headers: {'idempotency-key':key},
    body: fd
  });
  let body;
  try { body = await r.json(); } catch { body = {error:'NON_JSON_RESPONSE'}; }
  return {status:r.status, body};
}

(async () => {
  out.textContent = '1. enabling temporary explicit deny...';
  const denyOn = await toggleDeny('on');
  log(JSON.stringify(denyOn));

  const denied = await upload('nexus-cloud-controlled-e2e-20260827-v1');
  log('2. denied upload: ' + JSON.stringify(denied));

  const denyOff = await toggleDeny('off');
  log('3. deny cleanup: ' + JSON.stringify(denyOff));

  const allowed = await upload('nexus-cloud-controlled-e2e-20260827-v1');
  log('4. allow/write-gate result: ' + JSON.stringify(allowed));

  if (allowed.body && allowed.body.driveFileId) {
    const replay = await upload('nexus-cloud-controlled-e2e-20260827-v1');
    log('5. same-key replay: ' + JSON.stringify(replay));
    if (replay.body && replay.body.driveFileId === allowed.body.driveFileId) {
      log('RESULT: REAL_WRITE_AND_IDEMPOTENT_REPLAY_PASS');
    } else {
      log('RESULT: WRITE_OCCURRED_BUT_REPLAY_MISMATCH');
    }
  } else if (allowed.body && allowed.body.error === 'NEXUS_CLOUD_GOOGLE_DRIVE_WRITE_NOT_RELEASED') {
    log('RESULT: AUTHORITY_AND_DENY_PASS_WRITE_STILL_LOCKED');
  } else {
    log('RESULT: BLOCKED_OR_UNEXPECTED');
  }
})();
</script>
</body>
</html>`);
  } catch (error) {
    res.status(500).json({
      error: "NEXUS_CLOUD_CONTROL_BOOTSTRAP_FAILED",
      message: error instanceof Error ? error.message : "unknown",
    });
  }
});

router.post("/nexus/cloud/_staging/control/deny", async (req, res) => {
  if (!requireHarness(res)) return;
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "NEXUS_CLOUD_CONTROL_ORIGIN_REJECTED" });
    return;
  }

  const participation = await requireControlIdentity(req, res);
  if (!participation) return;

  const action = req.body?.action;
  if (action !== "on" && action !== "off") {
    res.status(400).json({ error: "NEXUS_CLOUD_CONTROL_ACTION_INVALID" });
    return;
  }

  await db.delete(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, DENY_GRANT_ID));

  if (action === "on") {
    const now = new Date();
    await db.insert(nexusPmPermissionGrantsTable).values({
      grantId: DENY_GRANT_ID,
      workspaceId: participation.workspaceId,
      participationId: participation.participationId,
      effect: "deny",
      moduleId: "cloud",
      actionKey: "cloud.file.write",
      recordJson: {
        id: DENY_GRANT_ID,
        participationId: participation.participationId,
        effect: "deny",
        moduleId: "cloud",
        actionKey: "cloud.file.write",
        status: "active",
        provenance: "NON_PRODUCTION_CONTROL_HARNESS",
      },
      persistedAt: now,
    });
  }

  res.json({ ok: true, action, grantId: DENY_GRANT_ID });
});

router.post("/nexus/cloud/_staging/control/cleanup", async (req, res) => {
  if (!requireHarness(res)) return;
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "NEXUS_CLOUD_CONTROL_ORIGIN_REJECTED" });
    return;
  }

  await db.delete(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, DENY_GRANT_ID));

  if (req.user?.id?.startsWith("staging-device:")) {
    const digest = digestProviderSubject(req.user.id);
    await db
      .update(nexusIdentityBindingsTable)
      .set({ status: "REVOKED", revokedAt: new Date() })
      .where(
        and(
          eq(nexusIdentityBindingsTable.provider, STAGING_DEVICE_IDENTITY_PROVIDER),
          eq(nexusIdentityBindingsTable.providerSubjectDigest, digest),
          eq(nexusIdentityBindingsTable.personId, CLOUD_CONTROL_PERSON_ID),
        ),
      );
  }
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.clearCookie("sid", { path: "/" });
  res.json({ ok: true });
});

export default router;
