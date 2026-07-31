export type RequirementStatus = "PASS" | "WARNING" | "FAIL" | "UNKNOWN";
export type GateStatus = "READY" | "WARNING" | "BLOCKED" | "UNKNOWN";

export type ComplianceRequirement = {
  name: string;
  status: RequirementStatus;
  detail: string;
  expiry?: string;
  sourceRecord: string;
};

export type DemoWorker = {
  id: string;
  initials: string;
  name: string;
  role: string;
  company: string;
  gate: GateStatus;
  gateReason: string;
  lastChecked: string;
  requirements: ComplianceRequirement[];
};

export type WorkWalletEventType =
  | "AUDIT_COMPLETED"
  | "RISK_ASSESSMENT_COMPLETED"
  | "ASSET_INSPECTION_COMPLETED"
  | "INDUCTION_COMPLETED"
  | "PERMIT_RENEWED"
  | "SOURCE_RESTORED";

export type IntegrationEvent = {
  id: string;
  eventType: WorkWalletEventType;
  title: string;
  detail: string;
  sourceRecord: string;
  projectId: string;
  personId?: string;
  receivedAt: string;
  status: "PROCESSED" | "REJECTED";
  actionCreated: string;
};

export type SimulatorScenario = {
  eventType: WorkWalletEventType;
  label: string;
  description: string;
};

export const initialWorkers: DemoWorker[] = [
  {
    id: "p1",
    initials: "MF",
    name: "Mateusz Furmanski",
    role: "Fire Door Installer",
    company: "NOSMO Demo Contractor",
    gate: "READY",
    gateReason: "All blocking requirements are verified.",
    lastChecked: "31 Jul 2026, 20:59 BST",
    requirements: [
      { name: "Site induction", status: "PASS", detail: "Halifax induction completed", sourceRecord: "WW-IND-1042" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Fire-door installation RAMS signed", sourceRecord: "WW-RAMS-2218" },
      { name: "Fire-door competence", status: "PASS", detail: "Installer competence valid", expiry: "18 Mar 2027", sourceRecord: "WW-TRN-0917" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity and trade record verified", expiry: "02 Nov 2028", sourceRecord: "WW-ID-0412" },
      { name: "Permit to work", status: "PASS", detail: "Not required for selected task", sourceRecord: "NEXUS-RULE-PTW-01" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p2",
    initials: "DP",
    name: "Daniel Price",
    role: "Carpenter",
    company: "Northfield Interiors",
    gate: "BLOCKED",
    gateReason: "Project induction has not been completed.",
    lastChecked: "31 Jul 2026, 20:57 BST",
    requirements: [
      { name: "Site induction", status: "FAIL", detail: "No completed Halifax induction found", sourceRecord: "WW-IND-MISSING" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Fire-door installation RAMS signed", sourceRecord: "WW-RAMS-2241" },
      { name: "Fire-door competence", status: "PASS", detail: "Installer competence valid", expiry: "11 Jan 2027", sourceRecord: "WW-TRN-1014" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity and trade record verified", expiry: "09 Jun 2028", sourceRecord: "WW-ID-0511" },
      { name: "Permit to work", status: "PASS", detail: "Not required for selected task", sourceRecord: "NEXUS-RULE-PTW-01" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p3",
    initials: "JK",
    name: "Joanna Klosek",
    role: "Project Systems Lead",
    company: "NOSMO",
    gate: "WARNING",
    gateReason: "Required qualification expires within 30 days.",
    lastChecked: "31 Jul 2026, 20:58 BST",
    requirements: [
      { name: "Site induction", status: "PASS", detail: "Halifax induction completed", sourceRecord: "WW-IND-1077" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Inspection RAMS signed", sourceRecord: "WW-RAMS-2290" },
      { name: "Fire-door inspection awareness", status: "WARNING", detail: "Qualification expires soon", expiry: "19 Aug 2026", sourceRecord: "WW-TRN-1098" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity record verified", expiry: "24 Apr 2028", sourceRecord: "WW-ID-0554" },
      { name: "Permit to work", status: "PASS", detail: "Not required for selected task", sourceRecord: "NEXUS-RULE-PTW-01" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p4",
    initials: "KN",
    name: "Kamil Nowak",
    role: "Installer",
    company: "Steel & Site Services",
    gate: "BLOCKED",
    gateReason: "The required hot-works permit has expired.",
    lastChecked: "31 Jul 2026, 20:56 BST",
    requirements: [
      { name: "Site induction", status: "PASS", detail: "Halifax induction completed", sourceRecord: "WW-IND-0998" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Installation RAMS signed", sourceRecord: "WW-RAMS-2150" },
      { name: "Installation competence", status: "PASS", detail: "Competence record valid", expiry: "05 May 2027", sourceRecord: "WW-TRN-0870" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity and trade record verified", expiry: "14 Feb 2028", sourceRecord: "WW-ID-0392" },
      { name: "Hot-works permit", status: "FAIL", detail: "Permit expired and requires renewal", expiry: "30 Jul 2026", sourceRecord: "WW-PTW-1842" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p5",
    initials: "BM",
    name: "Bartlomiej Mejer",
    role: "Operations Lead",
    company: "NOSMO GreenLoop",
    gate: "UNKNOWN",
    gateReason: "The safety source is unavailable, so compliance cannot be verified.",
    lastChecked: "31 Jul 2026, 20:41 BST",
    requirements: [
      { name: "Site induction", status: "UNKNOWN", detail: "Last confirmed status unavailable", sourceRecord: "WW-SOURCE-OFFLINE" },
      { name: "RAMS acknowledgement", status: "UNKNOWN", detail: "Unable to verify current acknowledgement", sourceRecord: "WW-SOURCE-OFFLINE" },
      { name: "Role competence", status: "PASS", detail: "Last confirmed competence remains in date", expiry: "12 Dec 2026", sourceRecord: "WW-TRN-1180" },
      { name: "CSCS / identity", status: "PASS", detail: "Last confirmed identity record remains in date", expiry: "22 Sep 2027", sourceRecord: "WW-ID-0610" },
      { name: "Permit to work", status: "UNKNOWN", detail: "Live permit state cannot be verified", sourceRecord: "WW-SOURCE-OFFLINE" },
      { name: "Work restrictions", status: "UNKNOWN", detail: "Live restriction state cannot be verified", sourceRecord: "WW-SOURCE-OFFLINE" },
    ],
  },
];

export const simulatorScenarios: SimulatorScenario[] = [
  { eventType: "AUDIT_COMPLETED", label: "Receive completed audit", description: "Creates a linked Nexus project action." },
  { eventType: "RISK_ASSESSMENT_COMPLETED", label: "Receive risk assessment", description: "Adds a reviewed RAMS / risk event to project memory." },
  { eventType: "ASSET_INSPECTION_COMPLETED", label: "Receive asset inspection", description: "Creates an asset inspection record for the project." },
  { eventType: "INDUCTION_COMPLETED", label: "Complete Daniel induction", description: "Changes Daniel from BLOCKED to READY." },
  { eventType: "PERMIT_RENEWED", label: "Renew Kamil permit", description: "Changes Kamil from BLOCKED to READY." },
  { eventType: "SOURCE_RESTORED", label: "Restore source for Bartlomiej", description: "Refreshes previously UNKNOWN records." },
];

export const sampleWebhookPayload = JSON.stringify(
  {
    id: "ww-demo-event-1001",
    eventType: "AUDIT_COMPLETED",
    projectId: "HALIFAX-DEMO",
    sourceRecord: "WW-AUD-1001",
    title: "Fire-door work package audit completed",
    detail: "Audit completed with one follow-up action.",
  },
  null,
  2,
);

function nowLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date());
}

function eventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ww-demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function recalculateGate(worker: DemoWorker): DemoWorker {
  const failed = worker.requirements.find((item) => item.status === "FAIL");
  const unknown = worker.requirements.find((item) => item.status === "UNKNOWN");
  const warning = worker.requirements.find((item) => item.status === "WARNING");

  if (failed) return { ...worker, gate: "BLOCKED", gateReason: `${failed.name}: ${failed.detail}`, lastChecked: nowLabel() };
  if (unknown) return { ...worker, gate: "UNKNOWN", gateReason: `${unknown.name} cannot be verified.`, lastChecked: nowLabel() };
  if (warning) return { ...worker, gate: "WARNING", gateReason: `${warning.name}: ${warning.detail}`, lastChecked: nowLabel() };
  return { ...worker, gate: "READY", gateReason: "All blocking requirements are verified.", lastChecked: nowLabel() };
}

function updateRequirement(
  worker: DemoWorker,
  matcher: (requirement: ComplianceRequirement) => boolean,
  replacement: Partial<ComplianceRequirement>,
) {
  return recalculateGate({
    ...worker,
    requirements: worker.requirements.map((requirement) =>
      matcher(requirement) ? { ...requirement, ...replacement } : requirement,
    ),
  });
}

export function applyIntegrationEvent(workers: DemoWorker[], event: IntegrationEvent) {
  if (event.eventType === "INDUCTION_COMPLETED") {
    return workers.map((worker) =>
      worker.id === (event.personId ?? "p2")
        ? updateRequirement(worker, (item) => item.name === "Site induction", {
            status: "PASS",
            detail: "Halifax induction completed through integration event",
            sourceRecord: event.sourceRecord,
          })
        : worker,
    );
  }

  if (event.eventType === "PERMIT_RENEWED") {
    return workers.map((worker) =>
      worker.id === (event.personId ?? "p4")
        ? updateRequirement(worker, (item) => item.name === "Hot-works permit", {
            status: "PASS",
            detail: "Hot-works permit renewed and active",
            expiry: "31 Jul 2027",
            sourceRecord: event.sourceRecord,
          })
        : worker,
    );
  }

  if (event.eventType === "SOURCE_RESTORED") {
    return workers.map((worker) => {
      if (worker.id !== (event.personId ?? "p5")) return worker;
      return recalculateGate({
        ...worker,
        requirements: worker.requirements.map((requirement) =>
          requirement.status === "UNKNOWN"
            ? {
                ...requirement,
                status: "PASS",
                detail: `${requirement.name} verified after source recovery`,
                sourceRecord: event.sourceRecord,
              }
            : requirement,
        ),
      });
    });
  }

  return workers;
}

export function createSimulatorEvent(eventType: WorkWalletEventType): IntegrationEvent {
  const common = {
    id: eventId(),
    eventType,
    projectId: "HALIFAX-DEMO",
    receivedAt: nowLabel(),
    status: "PROCESSED" as const,
  };

  switch (eventType) {
    case "AUDIT_COMPLETED":
      return { ...common, title: "Audit completed", detail: "Fire-door work package audit received.", sourceRecord: "WW-AUD-1001", actionCreated: "Project Action: Review one audit finding" };
    case "RISK_ASSESSMENT_COMPLETED":
      return { ...common, title: "Risk assessment completed", detail: "Updated task-specific RAMS received.", sourceRecord: "WW-RA-2044", actionCreated: "Project Memory: RAMS review event stored" };
    case "ASSET_INSPECTION_COMPLETED":
      return { ...common, title: "Asset inspection completed", detail: "Inspection result received for access equipment.", sourceRecord: "WW-AST-3110", actionCreated: "Asset Card: Inspection status refreshed" };
    case "INDUCTION_COMPLETED":
      return { ...common, personId: "p2", title: "Site induction completed", detail: "Daniel Price completed the Halifax induction.", sourceRecord: "WW-IND-2401", actionCreated: "Person Card refreshed; DoorFlow gate re-evaluated" };
    case "PERMIT_RENEWED":
      return { ...common, personId: "p4", title: "Permit renewed", detail: "Kamil Nowak hot-works permit is active.", sourceRecord: "WW-PTW-2402", actionCreated: "Person Card refreshed; DoorFlow gate re-evaluated" };
    case "SOURCE_RESTORED":
      return { ...common, personId: "p5", title: "Source connection restored", detail: "Current compliance records are available again.", sourceRecord: "WW-SYNC-2403", actionCreated: "Unknown records refreshed; gate re-evaluated" };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normaliseWebhookPayload(payload: unknown): IntegrationEvent {
  const record = asRecord(payload);
  if (!record) throw new Error("Payload must be a JSON object.");

  const eventType = stringValue(record, "eventType") as WorkWalletEventType | undefined;
  if (!eventType || !simulatorScenarios.some((scenario) => scenario.eventType === eventType)) {
    throw new Error("Unsupported or missing eventType.");
  }

  const projectId = stringValue(record, "projectId");
  const sourceRecord = stringValue(record, "sourceRecord");
  const title = stringValue(record, "title");
  const detail = stringValue(record, "detail");
  if (!projectId || !sourceRecord || !title || !detail) {
    throw new Error("projectId, sourceRecord, title and detail are required.");
  }

  return {
    id: stringValue(record, "id") ?? eventId(),
    eventType,
    projectId,
    personId: stringValue(record, "personId"),
    sourceRecord,
    title,
    detail,
    receivedAt: nowLabel(),
    status: "PROCESSED",
    actionCreated:
      eventType === "INDUCTION_COMPLETED" || eventType === "PERMIT_RENEWED" || eventType === "SOURCE_RESTORED"
        ? "Person Card refreshed; DoorFlow gate re-evaluated"
        : "Project integration event stored and linked",
  };
}
