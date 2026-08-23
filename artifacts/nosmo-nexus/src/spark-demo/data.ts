export type CircularStatus =
  | "IN USE"
  | "REUSABLE"
  | "RECOVER"
  | "RECYCLE"
  | "WASTE"
  | "UNKNOWN";

export type Provenance = "REAL" | "DERIVED" | "UNKNOWN";
export type MaintenanceAttention = "LOW" | "MEDIUM" | "HIGH";

export type EvidenceRecord = {
  id: string;
  label: string;
  kind: "document" | "photo" | "inspection" | "decision";
  provenance: Provenance;
  note: string;
};

export type LifecycleEvent = {
  date: string;
  title: string;
  detail: string;
  provenance: Provenance;
};

export type DemoAsset = {
  id: string;
  name: string;
  shortName: string;
  location: string;
  zoneId: string;
  type: string;
  sourceDocument: string;
  evidence: EvidenceRecord[];
  lifecycleStatus: string;
  circularStatus: CircularStatus;
  provenance: Provenance;
  maintenanceAttention: MaintenanceAttention;
  maintenanceReasons: string[];
  lastInspection: string;
  issueHistory: string[];
  maintenanceHistory: string[];
  lifecycle: LifecycleEvent[];
  circularDecision: string;
  circularDecisionBasis: string;
  co2Data: "UNKNOWN" | "DERIVED";
};

export type DemoZone = {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
};

export const demoZones: DemoZone[] = [
  { id: "zone-lobby", name: "Entrance lobby", subtitle: "Ground floor", x: 23, y: 30 },
  { id: "zone-flat", name: "Apartment A-01", subtitle: "Level 01", x: 62, y: 24 },
  { id: "zone-core", name: "Shared core", subtitle: "Levels 00–03", x: 72, y: 62 },
  { id: "zone-plant", name: "Plant / service", subtitle: "Roof + riser", x: 34, y: 70 },
];

export const demoAssets: DemoAsset[] = [
  {
    id: "asset-door-01",
    name: "Timber entrance door set",
    shortName: "Door D-001",
    location: "Entrance lobby · Ground floor",
    zoneId: "zone-lobby",
    type: "Building component",
    sourceDocument: "Demo material schedule · MS-001",
    evidence: [
      { id: "ev-d-1", label: "Installation record", kind: "document", provenance: "DERIVED", note: "Demonstration record linked to the asset." },
      { id: "ev-d-2", label: "Inspection photo set", kind: "photo", provenance: "DERIVED", note: "Synthetic demo evidence; no real site claim." },
    ],
    lifecycleStatus: "Installed and operational",
    circularStatus: "REUSABLE",
    provenance: "DERIVED",
    maintenanceAttention: "LOW",
    maintenanceReasons: ["Latest inspection recorded", "No unresolved issue in demo history"],
    lastInspection: "2026-07-18",
    issueHistory: [],
    maintenanceHistory: ["2026-07-18 · Hinges checked; no action required"],
    lifecycle: [
      { date: "2026-02-10", title: "Specified", detail: "Door set added to the demonstration material schedule.", provenance: "DERIVED" },
      { date: "2026-05-22", title: "Installed", detail: "Installation event linked to Entrance lobby.", provenance: "DERIVED" },
      { date: "2026-07-18", title: "Inspected", detail: "Condition recorded as suitable for continued use.", provenance: "DERIVED" },
    ],
    circularDecision: "Retain in service; assess for direct reuse at strip-out.",
    circularDecisionBasis: "Good recorded condition and separable component type.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-floor-01",
    name: "Raised access floor panels",
    shortName: "Floor RAF-01",
    location: "Entrance lobby · Ground floor",
    zoneId: "zone-lobby",
    type: "Material system",
    sourceDocument: "Demo finishes schedule · FS-004",
    evidence: [
      { id: "ev-f-1", label: "Panel batch record", kind: "document", provenance: "DERIVED", note: "Batch identity exists only inside this demonstrator." },
    ],
    lifecycleStatus: "In use",
    circularStatus: "RECOVER",
    provenance: "DERIVED",
    maintenanceAttention: "MEDIUM",
    maintenanceReasons: ["One historic moisture issue recorded", "Follow-up condition check recommended before recovery"],
    lastInspection: "2026-04-03",
    issueHistory: ["2026-03-28 · Local moisture exposure at north edge"],
    maintenanceHistory: ["2026-04-03 · Affected panel replaced; surrounding panels retained"],
    lifecycle: [
      { date: "2026-01-14", title: "Batch recorded", detail: "Panel system entered into Project Memory.", provenance: "DERIVED" },
      { date: "2026-03-28", title: "Issue raised", detail: "Local moisture exposure linked to this system.", provenance: "DERIVED" },
      { date: "2026-04-03", title: "Maintenance completed", detail: "One affected panel replaced.", provenance: "DERIVED" },
    ],
    circularDecision: "Recover intact panels; inspect before next-use allocation.",
    circularDecisionBasis: "Modular panel system with localised, recorded defect history.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-cabinet-01",
    name: "Kitchen base cabinet set",
    shortName: "Joinery J-014",
    location: "Apartment A-01 · Level 01",
    zoneId: "zone-flat",
    type: "Joinery asset",
    sourceDocument: "Demo apartment fit-out schedule · AF-014",
    evidence: [
      { id: "ev-j-1", label: "Install checklist", kind: "inspection", provenance: "DERIVED", note: "Demonstration checklist with traceable asset ID." },
      { id: "ev-j-2", label: "Condition photo", kind: "photo", provenance: "DERIVED", note: "Synthetic demo image record placeholder represented as evidence metadata only." },
    ],
    lifecycleStatus: "Installed and in use",
    circularStatus: "REUSABLE",
    provenance: "DERIVED",
    maintenanceAttention: "LOW",
    maintenanceReasons: ["No issue history", "Condition check is current in demo timeline"],
    lastInspection: "2026-06-30",
    issueHistory: [],
    maintenanceHistory: [],
    lifecycle: [
      { date: "2026-03-05", title: "Installed", detail: "Joinery set linked to Apartment A-01.", provenance: "DERIVED" },
      { date: "2026-06-30", title: "Condition reviewed", detail: "No visible damage recorded in the demo record.", provenance: "DERIVED" },
    ],
    circularDecision: "Candidate for direct component reuse.",
    circularDecisionBasis: "Discrete demountable asset with no recorded damage.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-glazing-01",
    name: "Internal glazed partition module",
    shortName: "Glazing G-008",
    location: "Apartment A-01 · Level 01",
    zoneId: "zone-flat",
    type: "Partition component",
    sourceDocument: "Demo internal partition schedule · IP-008",
    evidence: [
      { id: "ev-g-1", label: "Product data sheet reference", kind: "document", provenance: "UNKNOWN", note: "No verified manufacturer source is connected in the demonstrator." },
    ],
    lifecycleStatus: "In use; source data incomplete",
    circularStatus: "UNKNOWN",
    provenance: "UNKNOWN",
    maintenanceAttention: "MEDIUM",
    maintenanceReasons: ["Manufacturer/product identity not verified", "Circular route cannot be confirmed from current data"],
    lastInspection: "2026-05-16",
    issueHistory: [],
    maintenanceHistory: [],
    lifecycle: [
      { date: "2026-03-19", title: "Asset observed", detail: "Partition module added with incomplete source metadata.", provenance: "UNKNOWN" },
      { date: "2026-05-16", title: "Inspection recorded", detail: "Condition observed; product identity still unresolved.", provenance: "DERIVED" },
    ],
    circularDecision: "Hold decision until product identity and composition are verified.",
    circularDecisionBasis: "Missing product provenance blocks a defensible circular route.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-luminaire-01",
    name: "LED corridor luminaire",
    shortName: "Light L-021",
    location: "Shared core · Level 02",
    zoneId: "zone-core",
    type: "MEP asset",
    sourceDocument: "Demo electrical asset register · EA-021",
    evidence: [
      { id: "ev-l-1", label: "Commissioning result", kind: "inspection", provenance: "DERIVED", note: "Demonstration commissioning event, not a live Electrical module integration." },
      { id: "ev-l-2", label: "Driver replacement record", kind: "document", provenance: "DERIVED", note: "Maintenance history retained against the asset." },
    ],
    lifecycleStatus: "Operational after component replacement",
    circularStatus: "IN USE",
    provenance: "DERIVED",
    maintenanceAttention: "MEDIUM",
    maintenanceReasons: ["Driver failure occurred once", "Asset returned to service after maintenance"],
    lastInspection: "2026-08-02",
    issueHistory: ["2026-07-28 · Driver fault / intermittent output"],
    maintenanceHistory: ["2026-08-02 · Driver replaced; function check passed"],
    lifecycle: [
      { date: "2026-02-28", title: "Commissioned", detail: "Luminaire recorded as operational.", provenance: "DERIVED" },
      { date: "2026-07-28", title: "Issue raised", detail: "Intermittent driver fault recorded.", provenance: "DERIVED" },
      { date: "2026-08-02", title: "Returned to service", detail: "Driver replaced and function checked.", provenance: "DERIVED" },
    ],
    circularDecision: "Continue use; retain replacement history for future recovery decision.",
    circularDecisionBasis: "Current function restored; maintenance history remains visible.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-pump-01",
    name: "Circulation pump",
    shortName: "Pump P-003",
    location: "Plant / service · Roof plant",
    zoneId: "zone-plant",
    type: "Mechanical asset",
    sourceDocument: "Demo mechanical asset register · MA-003",
    evidence: [
      { id: "ev-p-1", label: "Inspection record", kind: "inspection", provenance: "DERIVED", note: "Inspection and issue records support the attention indicator." },
    ],
    lifecycleStatus: "Operational with recurring issue",
    circularStatus: "IN USE",
    provenance: "DERIVED",
    maintenanceAttention: "HIGH",
    maintenanceReasons: ["Two recurring vibration issues recorded", "Latest event requires engineering review in demo history"],
    lastInspection: "2026-08-12",
    issueHistory: ["2026-05-09 · Elevated vibration", "2026-08-12 · Elevated vibration repeated"],
    maintenanceHistory: ["2026-05-10 · Mounting checked and tightened"],
    lifecycle: [
      { date: "2026-01-30", title: "Commissioned", detail: "Pump entered service.", provenance: "DERIVED" },
      { date: "2026-05-09", title: "Issue raised", detail: "Elevated vibration recorded.", provenance: "DERIVED" },
      { date: "2026-05-10", title: "Maintenance", detail: "Mounting checked and tightened.", provenance: "DERIVED" },
      { date: "2026-08-12", title: "Repeat issue", detail: "Vibration observation repeated; engineering review required.", provenance: "DERIVED" },
    ],
    circularDecision: "Keep in service pending engineering review; no end-of-life decision yet.",
    circularDecisionBasis: "Recurring issue changes maintenance attention, not circular status automatically.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-pipe-01",
    name: "Copper pipe offcut batch",
    shortName: "Copper C-012",
    location: "Plant / service · Riser",
    zoneId: "zone-plant",
    type: "Material batch",
    sourceDocument: "Demo site material movement log · MM-012",
    evidence: [
      { id: "ev-c-1", label: "Segregation record", kind: "document", provenance: "DERIVED", note: "Batch separated from mixed waste in the demo scenario." },
      { id: "ev-c-2", label: "Supervisor decision", kind: "decision", provenance: "DERIVED", note: "Human decision recorded with basis." },
    ],
    lifecycleStatus: "Removed from installation process; segregated",
    circularStatus: "RECYCLE",
    provenance: "DERIVED",
    maintenanceAttention: "LOW",
    maintenanceReasons: ["Material batch is not an operating asset", "No maintenance action required"],
    lastInspection: "2026-08-06",
    issueHistory: [],
    maintenanceHistory: [],
    lifecycle: [
      { date: "2026-08-05", title: "Offcuts recorded", detail: "Batch created from installation offcuts.", provenance: "DERIVED" },
      { date: "2026-08-06", title: "Segregated", detail: "Copper separated from mixed site waste.", provenance: "DERIVED" },
      { date: "2026-08-06", title: "Circular decision", detail: "Supervisor selected recycling route for the demo batch.", provenance: "DERIVED" },
    ],
    circularDecision: "Send as segregated metal recycling stream.",
    circularDecisionBasis: "Known material type and segregated batch condition.",
    co2Data: "UNKNOWN",
  },
  {
    id: "asset-board-01",
    name: "Damaged plasterboard batch",
    shortName: "Board W-006",
    location: "Shared core · Level 03",
    zoneId: "zone-core",
    type: "Material batch",
    sourceDocument: "Demo waste segregation record · WS-006",
    evidence: [
      { id: "ev-w-1", label: "Damage record", kind: "inspection", provenance: "DERIVED", note: "Demo inspection records contamination and breakage." },
    ],
    lifecycleStatus: "Removed / damaged",
    circularStatus: "WASTE",
    provenance: "DERIVED",
    maintenanceAttention: "LOW",
    maintenanceReasons: ["Material batch is not an operating asset", "Disposition decision already recorded"],
    lastInspection: "2026-07-25",
    issueHistory: ["2026-07-25 · Wet contamination and breakage recorded"],
    maintenanceHistory: [],
    lifecycle: [
      { date: "2026-07-25", title: "Damage recorded", detail: "Material marked wet and broken in demo evidence.", provenance: "DERIVED" },
      { date: "2026-07-25", title: "Decision recorded", detail: "Reuse/recovery rejected for this demonstrator record.", provenance: "DERIVED" },
    ],
    circularDecision: "Waste route in current demo state; review if a verified specialist recovery route becomes available.",
    circularDecisionBasis: "Recorded contamination and damage; no verified recovery route connected.",
    co2Data: "UNKNOWN",
  },
];

export const demoProject = {
  id: "NEXUS_SPARK_DEMO_001",
  name: "Residential Building 01",
  subtitle: "Circular Construction Operating Layer",
  clientContext: "SKANSKA Residential Development use-case demonstrator",
  dataNotice: "Synthetic demonstration dataset. It does not represent a real SKANSKA project or measured project performance.",
};
