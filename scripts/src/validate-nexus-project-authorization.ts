import fs from "node:fs";
import path from "node:path";
import {
  evaluateNexusProjectParticipationAccess,
  isSafeNexusProjectId,
  type NexusProjectParticipationPolicyInput,
} from "../../artifacts/api-server/src/lib/nexus-project-access-policy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const now = new Date("2026-08-11T12:00:00.000Z");
const active = (
  overrides: Partial<NexusProjectParticipationPolicyInput> = {},
): NexusProjectParticipationPolicyInput => ({
  participationId: "participation-1",
  status: "ACTIVE",
  startsAt: null,
  endsAt: null,
  applicationPermissions: [],
  ...overrides,
});

const allowed = evaluateNexusProjectParticipationAccess(
  [active()],
  "work-wallet",
  now,
);
assert(allowed.allowed, "active participation must grant shared Work Wallet access");
assert(
  allowed.reason === "ACTIVE_PARTICIPATION_SHARED_ACCESS",
  "active participation reason mismatch",
);

const denied = evaluateNexusProjectParticipationAccess(
  [
    active({
      applicationPermissions: [
        { app: "work-wallet", effect: "allow" },
        { app: "work-wallet", effect: "deny" },
      ],
    }),
  ],
  "work-wallet",
  now,
);
assert(!denied.allowed, "explicit deny must override active/shared and explicit allow");
assert(denied.reason === "EXPLICIT_APPLICATION_DENY", "explicit deny reason mismatch");

for (const [label, record] of [
  ["SUSPENDED", active({ status: "SUSPENDED" })],
  ["LEFT", active({ status: "LEFT" })],
  [
    "future",
    active({ startsAt: new Date("2026-08-12T00:00:00.000Z") }),
  ],
  [
    "expired",
    active({ endsAt: new Date("2026-08-11T11:59:59.000Z") }),
  ],
] as const) {
  const result = evaluateNexusProjectParticipationAccess(
    [record],
    "work-wallet",
    now,
  );
  assert(!result.allowed, `${label} participation must deny`);
  assert(
    result.reason === "NO_ACTIVE_PARTICIPATION",
    `${label} must resolve as no active participation`,
  );
}

const ambiguous = evaluateNexusProjectParticipationAccess(
  [active({ participationId: "p-1" }), active({ participationId: "p-2" })],
  "work-wallet",
  now,
);
assert(!ambiguous.allowed, "multiple active participations must fail closed");
assert(
  ambiguous.reason === "AMBIGUOUS_ACTIVE_PARTICIPATION",
  "multiple active participations must be marked ambiguous",
);

assert(isSafeNexusProjectId("halifax-demo"), "canonical project ID must be accepted");
assert(!isSafeNexusProjectId("../halifax"), "path-like project ID must be rejected");
assert(!isSafeNexusProjectId(""), "empty project ID must be rejected");

const root = process.cwd();
const projectSchema = fs.readFileSync(
  path.join(root, "lib/db/src/schema/projects.ts"),
  "utf8",
);
const participationSchema = fs.readFileSync(
  path.join(root, "lib/db/src/schema/nexus-project-participation.ts"),
  "utf8",
);
const resolver = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/lib/nexus-project-authorization.ts"),
  "utf8",
);

assert(
  projectSchema.includes('nexusProjectId: varchar("nexus_project_id"'),
  "existing projects table must carry stable Nexus project ID",
);
assert(
  !participationSchema.includes('pgTable("nexus_projects"'),
  "Slice C must not create a parallel project table",
);
assert(
  participationSchema.includes("references(() => nexusPersonsTable.id"),
  "participation must reference canonical Person",
);
assert(
  participationSchema.includes("references(() => projectsTable.id"),
  "participation must reference existing Project row",
);
assert(
  resolver.includes('NEXUS_PROJECT_AUTH_MODE === "postgres"'),
  "server project authorization must require explicit runtime gate",
);
assert(
  resolver.includes("eq(projectsTable.nexusProjectId, nexusProjectId)"),
  "project lookup must be exact by canonical Nexus project ID",
);
assert(!/profession|qualification/i.test(resolver), "profession must not grant shared server project access");
assert(!/email|providerSubject/i.test(resolver), "email/provider subject must not grant project authority");

console.log("PASS validate-nexus-project-authorization");
