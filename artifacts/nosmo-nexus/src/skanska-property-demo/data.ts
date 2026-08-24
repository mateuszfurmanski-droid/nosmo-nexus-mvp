export type DemoProvenance = "SYNTHETIC_DEMO";

export type Company = {
  id: string;
  name: string;
  role: string;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  companyId: string;
};

export type Floor = {
  id: string;
  name: string;
  level: string;
};

export type Space = {
  id: string;
  floorId: string;
  name: string;
  code: string;
  use: string;
};

export type Material = {
  id: string;
  name: string;
  composition: string;
  recoveryRoute: string;
  reusePotential: "HIGH" | "MEDIUM" | "LOW";
  provenance: DemoProvenance;
};

export type HistoryEvent = {
  id: string;
  date: string;
  type: "INSTALLATION" | "INSPECTION" | "MAINTENANCE" | "ISSUE" | "APPROVAL" | "REPLACEMENT" | "REUSE";
  title: string;
  detail: string;
  personId?: string;
  companyId?: string;
};

export type AssetIssue = {
  id: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  instruction: string;
  checklist: string[];
  requiredEvidence: string[];
};

export type ReplacementCase = {
  reason: string;
  replacementOption: string;
  retainedMaterials: string[];
  reuseOpportunity: string;
  recyclingRoute: string;
  co2Statement: string;
};

export type Asset = {
  id: string;
  tag: string;
  name: string;
  category: string;
  floorId: string;
  spaceId: string;
  bimRef: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  installerCompanyId: string;
  installerPersonId: string;
  serviceCompanyId: string;
  fmOwnerPersonId: string;
  warranty: string;
  manuals: string[];
  certificates: string[];
  photos: string[];
  condition: string;
  nextService: string;
  materialIds: string[];
  history: HistoryEvent[];
  issue?: AssetIssue;
  replacement?: ReplacementCase;
  provenance: DemoProvenance;
};

export const propertyPortfolio = {
  id: "portfolio-skanska-property-demo",
  name: "SKANSKA PROPERTY",
  provenance: "SYNTHETIC_DEMO" as DemoProvenance,
};

export const building = {
  id: "building-spdb-01",
  name: "SKANSKA Property Demo Building",
  address: "Warsaw · synthetic demo location",
  status: "IN OPERATION",
  provenance: "SYNTHETIC_DEMO" as DemoProvenance,
};

export const floors: Floor[] = [
  { id: "floor-00", name: "Ground Floor", level: "L00" },
  { id: "floor-01", name: "Office Floor 01", level: "L01" },
  { id: "floor-02", name: "Office Floor 02", level: "L02" },
];

export const spaces: Space[] = [
  { id: "space-lobby", floorId: "floor-00", name: "Main Lobby", code: "L00-LOBBY", use: "Public / reception" },
  { id: "space-plant", floorId: "floor-00", name: "Mechanical Plant Room", code: "L00-MEP-01", use: "Plant" },
  { id: "space-open-01", floorId: "floor-01", name: "Open Office East", code: "L01-OFF-E", use: "Office" },
  { id: "space-meeting", floorId: "floor-01", name: "Meeting Suite", code: "L01-MTG", use: "Meeting" },
  { id: "space-open-02", floorId: "floor-02", name: "Open Office West", code: "L02-OFF-W", use: "Office" },
  { id: "space-core", floorId: "floor-02", name: "Fire / Service Core", code: "L02-CORE", use: "Life safety / circulation" },
];

export const companies: Company[] = [
  { id: "company-skanska-property", name: "SKANSKA Property Team", role: "Facility / asset owner" },
  { id: "company-xyz-mech", name: "XYZ Mechanical Demo Ltd", role: "Mechanical installer / service contractor" },
  { id: "company-north-electrical", name: "North Electrical Demo Sp. z o.o.", role: "Electrical / controls contractor" },
];

export const people: Person[] = [
  { id: "person-anna-fm", name: "Anna Kowalska", role: "Facility Manager", companyId: "company-skanska-property" },
  { id: "person-john-engineer", name: "John Smith", role: "Mechanical Engineer", companyId: "company-xyz-mech" },
  { id: "person-piotr-service", name: "Piotr Nowak", role: "Service Technician", companyId: "company-xyz-mech" },
  { id: "person-joanna-inspector", name: "Joanna Example", role: "Inspection Lead", companyId: "company-skanska-property" },
  { id: "person-marek-electrical", name: "Marek Zielinski", role: "Electrical Engineer", companyId: "company-north-electrical" },
];

export const materials: Material[] = [
  { id: "material-galv-steel", name: "Galvanised steel", composition: "Steel casing / frame", recoveryRoute: "Direct component recovery or segregated metal recycling", reusePotential: "HIGH", provenance: "SYNTHETIC_DEMO" },
  { id: "material-aluminium", name: "Aluminium", composition: "Heat exchanger / casing elements", recoveryRoute: "Segregated non-ferrous metal recycling", reusePotential: "MEDIUM", provenance: "SYNTHETIC_DEMO" },
  { id: "material-copper", name: "Copper", composition: "Coils / cabling / conductors", recoveryRoute: "Segregated copper recovery", reusePotential: "MEDIUM", provenance: "SYNTHETIC_DEMO" },
  { id: "material-electronics", name: "Control electronics", composition: "PCB, sensors and control module", recoveryRoute: "Authorised WEEE route; component reuse only after test", reusePotential: "MEDIUM", provenance: "SYNTHETIC_DEMO" },
  { id: "material-timber", name: "Engineered timber", composition: "Door leaf / frame elements", recoveryRoute: "Direct reuse where certification and condition allow", reusePotential: "HIGH", provenance: "SYNTHETIC_DEMO" },
  { id: "material-glass", name: "Safety glass", composition: "Internal partition glazing", recoveryRoute: "Direct module reuse preferred; specialist glass recovery otherwise", reusePotential: "HIGH", provenance: "SYNTHETIC_DEMO" },
];

export const assets: Asset[] = [
  {
    id: "asset-ahu-04",
    tag: "AHU-04",
    name: "Air Handling Unit 04",
    category: "HVAC / AHU",
    floorId: "floor-00",
    spaceId: "space-plant",
    bimRef: "IFC-DEMO-AHU-04",
    manufacturer: "Ventora Demo Systems",
    model: "VX-8500",
    serialNumber: "DEMO-AHU04-26017",
    installationDate: "2024-09-16",
    installerCompanyId: "company-xyz-mech",
    installerPersonId: "person-john-engineer",
    serviceCompanyId: "company-xyz-mech",
    fmOwnerPersonId: "person-anna-fm",
    warranty: "Demo warranty record · to 2029-09-15",
    manuals: ["O&M Manual · AHU-04 · DEMO", "EC Fan Service Guide · DEMO"],
    certificates: ["Commissioning certificate · DEMO-COMM-041", "Filter pressure test · DEMO-QA-118"],
    photos: ["Installation photo set · 6 files", "2026-05 inspection · 4 files"],
    condition: "Operational · fan bearing trend requires inspection",
    nextService: "2026-08-28",
    materialIds: ["material-galv-steel", "material-aluminium", "material-copper", "material-electronics"],
    history: [
      { id: "ahu-event-1", date: "2024-09-16", type: "INSTALLATION", title: "Installed", detail: "AHU installed and linked to BIM object IFC-DEMO-AHU-04.", personId: "person-john-engineer", companyId: "company-xyz-mech" },
      { id: "ahu-event-2", date: "2024-09-20", type: "APPROVAL", title: "Commissioning approved", detail: "Commissioning evidence package accepted in demo history.", personId: "person-joanna-inspector", companyId: "company-skanska-property" },
      { id: "ahu-event-3", date: "2026-02-17", type: "MAINTENANCE", title: "Planned service", detail: "Filters changed and drive inspection completed.", personId: "person-piotr-service", companyId: "company-xyz-mech" },
      { id: "ahu-event-4", date: "2026-05-29", type: "INSPECTION", title: "Condition inspection", detail: "Raised vibration trend recorded on supply fan bearing.", personId: "person-joanna-inspector", companyId: "company-skanska-property" },
      { id: "ahu-event-5", date: "2026-08-24", type: "ISSUE", title: "Inspection required", detail: "Bearing trend crossed the synthetic demo attention threshold; field inspection required.", personId: "person-anna-fm", companyId: "company-skanska-property" },
    ],
    issue: {
      id: "issue-ahu04-bearing",
      title: "Supply fan bearing inspection / replacement decision",
      severity: "HIGH",
      instruction: "Inspect supply fan bearing, confirm vibration condition, photograph nameplate and bearing assembly, and record replace/retain recommendation.",
      checklist: ["Confirm lock-off / safe access", "Verify asset tag AHU-04", "Inspect bearing and mounting", "Record vibration condition", "Confirm retain or replace recommendation"],
      requiredEvidence: ["Asset / nameplate photo", "Bearing assembly photo", "Completed checklist", "Technician completion record"],
    },
    replacement: {
      reason: "Synthetic demo scenario: bearing/fan module may require replacement after inspection.",
      replacementOption: "Compatible EC fan module VX-EC-630 · demo catalogue option",
      retainedMaterials: ["Galvanised AHU casing", "Heat exchanger aluminium", "Copper coil assembly"],
      reuseOpportunity: "3 compatible EC fan modules are shown as required on another SKANSKA demo project. This is synthetic cross-project demo data, not a live requirement.",
      recyclingRoute: "Failed bearing / motor separated; metals to segregated recovery, electronics through authorised WEEE route.",
      co2Statement: "Demo ESG record compares retain/reuse/recycle routes qualitatively. No fabricated kgCO₂e value is claimed without a verified EPD/LCA factor.",
    },
    provenance: "SYNTHETIC_DEMO",
  },
  {
    id: "asset-fcu-12", tag: "FCU-12", name: "Fan Coil Unit 12", category: "HVAC / FCU", floorId: "floor-01", spaceId: "space-open-01", bimRef: "IFC-DEMO-FCU-12", manufacturer: "Ventora Demo Systems", model: "FC-420", serialNumber: "DEMO-FCU12-4412", installationDate: "2024-10-03", installerCompanyId: "company-xyz-mech", installerPersonId: "person-john-engineer", serviceCompanyId: "company-xyz-mech", fmOwnerPersonId: "person-anna-fm", warranty: "Demo warranty record · to 2028-10-02", manuals: ["FCU O&M · DEMO"], certificates: ["Commissioning sheet · DEMO-FCU-12"], photos: ["Installed condition · 3 files"], condition: "Operational", nextService: "2026-10-03", materialIds: ["material-galv-steel", "material-copper"], history: [{ id: "fcu12-e1", date: "2024-10-03", type: "INSTALLATION", title: "Installed", detail: "Installed and commissioned.", personId: "person-john-engineer", companyId: "company-xyz-mech" }, { id: "fcu12-e2", date: "2026-04-04", type: "INSPECTION", title: "Inspection passed", detail: "No action required.", personId: "person-joanna-inspector", companyId: "company-skanska-property" }], provenance: "SYNTHETIC_DEMO"
  },
  {
    id: "asset-fire-door-21", tag: "FD-21", name: "Fire Door Set 21", category: "Life safety / fire door", floorId: "floor-02", spaceId: "space-core", bimRef: "IFC-DEMO-DOOR-21", manufacturer: "SafeDoor Demo", model: "FD60-T", serialNumber: "DEMO-FD21", installationDate: "2024-08-26", installerCompanyId: "company-skanska-property", installerPersonId: "person-joanna-inspector", serviceCompanyId: "company-skanska-property", fmOwnerPersonId: "person-anna-fm", warranty: "Demo warranty · 5 years", manuals: ["Fire door O&M · DEMO"], certificates: ["FD60 declaration · DEMO", "Installation QA · DEMO"], photos: ["Installation QA · 8 files", "Annual inspection · 5 files"], condition: "Pass · monitor closer adjustment", nextService: "2027-01-15", materialIds: ["material-timber", "material-galv-steel"], history: [{ id: "fd21-e1", date: "2024-08-26", type: "INSTALLATION", title: "Installed", detail: "Installation QA linked to door object.", personId: "person-joanna-inspector" }, { id: "fd21-e2", date: "2026-01-15", type: "INSPECTION", title: "Annual inspection", detail: "Inspection passed; closer adjustment monitored.", personId: "person-joanna-inspector" }], provenance: "SYNTHETIC_DEMO"
  },
  {
    id: "asset-light-34", tag: "LGT-34", name: "LED Lighting Unit 34", category: "Electrical / lighting", floorId: "floor-01", spaceId: "space-meeting", bimRef: "IFC-DEMO-LGT-34", manufacturer: "Luma Demo", model: "LINE-1200", serialNumber: "DEMO-LGT34", installationDate: "2024-11-08", installerCompanyId: "company-north-electrical", installerPersonId: "person-marek-electrical", serviceCompanyId: "company-north-electrical", fmOwnerPersonId: "person-anna-fm", warranty: "Demo warranty · to 2029-11-07", manuals: ["Luminaire datasheet · DEMO"], certificates: ["Electrical commissioning · DEMO"], photos: ["Commissioned installation · 2 files"], condition: "Operational", nextService: "2027-02-01", materialIds: ["material-aluminium", "material-electronics"], history: [{ id: "lgt34-e1", date: "2024-11-08", type: "INSTALLATION", title: "Installed", detail: "Lighting asset commissioned.", personId: "person-marek-electrical", companyId: "company-north-electrical" }], provenance: "SYNTHETIC_DEMO"
  },
  {
    id: "asset-access-07", tag: "ACS-07", name: "Access Control Reader 07", category: "Security / access", floorId: "floor-00", spaceId: "space-lobby", bimRef: "IFC-DEMO-ACS-07", manufacturer: "SecureEntry Demo", model: "SE-R7", serialNumber: "DEMO-ACS07", installationDate: "2024-09-02", installerCompanyId: "company-north-electrical", installerPersonId: "person-marek-electrical", serviceCompanyId: "company-north-electrical", fmOwnerPersonId: "person-anna-fm", warranty: "Demo warranty · 36 months", manuals: ["Access reader manual · DEMO"], certificates: ["Functional test · DEMO"], photos: ["Installation detail · 2 files"], condition: "Operational", nextService: "2026-12-10", materialIds: ["material-electronics", "material-aluminium"], history: [{ id: "acs7-e1", date: "2024-09-02", type: "INSTALLATION", title: "Installed", detail: "Reader associated to Main Lobby access zone.", personId: "person-marek-electrical", companyId: "company-north-electrical" }, { id: "acs7-e2", date: "2026-06-11", type: "MAINTENANCE", title: "Firmware / function check", detail: "Synthetic maintenance event recorded.", personId: "person-marek-electrical", companyId: "company-north-electrical" }], provenance: "SYNTHETIC_DEMO"
  },
  {
    id: "asset-pump-02", tag: "PMP-02", name: "Heating Circulation Pump 02", category: "Mechanical / pump", floorId: "floor-00", spaceId: "space-plant", bimRef: "IFC-DEMO-PMP-02", manufacturer: "Flow Demo", model: "P-80E", serialNumber: "DEMO-PMP02", installationDate: "2024-09-18", installerCompanyId: "company-xyz-mech", installerPersonId: "person-john-engineer", serviceCompanyId: "company-xyz-mech", fmOwnerPersonId: "person-anna-fm", warranty: "Demo warranty · to 2028-09-17", manuals: ["Pump service manual · DEMO"], certificates: ["Commissioning result · DEMO"], photos: ["Pump installation · 3 files"], condition: "Operational after seal service", nextService: "2026-11-30", materialIds: ["material-galv-steel", "material-copper", "material-electronics"], history: [{ id: "pump2-e1", date: "2024-09-18", type: "INSTALLATION", title: "Installed", detail: "Pump commissioned.", personId: "person-john-engineer", companyId: "company-xyz-mech" }, { id: "pump2-e2", date: "2026-03-12", type: "MAINTENANCE", title: "Seal service", detail: "Minor seal leak rectified and closed.", personId: "person-piotr-service", companyId: "company-xyz-mech" }], provenance: "SYNTHETIC_DEMO"
  },
  {
    id: "asset-glazing-09", tag: "GLZ-09", name: "Demountable Glazed Partition 09", category: "Fit-out / partition", floorId: "floor-02", spaceId: "space-open-02", bimRef: "IFC-DEMO-GLZ-09", manufacturer: "ClearSpace Demo", model: "MOD-100", serialNumber: "DEMO-GLZ09", installationDate: "2024-12-02", installerCompanyId: "company-skanska-property", installerPersonId: "person-joanna-inspector", serviceCompanyId: "company-skanska-property", fmOwnerPersonId: "person-anna-fm", warranty: "Demo product warranty", manuals: ["Demount / remount guide · DEMO"], certificates: ["Safety glazing declaration · DEMO"], photos: ["Installed module · 4 files"], condition: "Good · high direct-reuse potential", nextService: "Condition review at next fit-out change", materialIds: ["material-glass", "material-aluminium"], history: [{ id: "glz9-e1", date: "2024-12-02", type: "INSTALLATION", title: "Installed", detail: "Demountable partition linked as recoverable building asset.", personId: "person-joanna-inspector" }, { id: "glz9-e2", date: "2026-07-01", type: "INSPECTION", title: "Reuse condition review", detail: "No visible damage recorded; dimensions retained in object record.", personId: "person-joanna-inspector" }], provenance: "SYNTHETIC_DEMO"
  },
  {
    id: "asset-sensor-18", tag: "IAQ-18", name: "Indoor Air Quality Sensor 18", category: "BMS / sensor", floorId: "floor-02", spaceId: "space-open-02", bimRef: "IFC-DEMO-IAQ-18", manufacturer: "Sense Demo", model: "IAQ-X", serialNumber: "DEMO-IAQ18", installationDate: "2025-01-17", installerCompanyId: "company-north-electrical", installerPersonId: "person-marek-electrical", serviceCompanyId: "company-north-electrical", fmOwnerPersonId: "person-anna-fm", warranty: "Demo warranty · 24 months", manuals: ["IAQ sensor manual · DEMO"], certificates: ["Calibration certificate · DEMO"], photos: ["Installed sensor · 2 files"], condition: "Operational · calibration due", nextService: "2026-09-15", materialIds: ["material-electronics"], history: [{ id: "iaq18-e1", date: "2025-01-17", type: "INSTALLATION", title: "Installed", detail: "Sensor linked to BMS demo source reference.", personId: "person-marek-electrical", companyId: "company-north-electrical" }, { id: "iaq18-e2", date: "2026-03-15", type: "INSPECTION", title: "Calibration check", detail: "Calibration within demo tolerance.", personId: "person-marek-electrical", companyId: "company-north-electrical" }], provenance: "SYNTHETIC_DEMO"
  },
];

export const sourceSystems = [
  { id: "source-bim", name: "BIM / IFC", role: "Object identity + spatial reference", status: "EXISTING NEXUS LAYER" },
  { id: "source-cafm", name: "FM / CAFM", role: "Maintenance / work-order source", status: "DEMO SOURCE · openMAINT adapter available separately" },
  { id: "source-drive", name: "Document storage", role: "Manuals / certificates / photos", status: "NEXUS CLOUD LAYER EXISTS SEPARATELY" },
  { id: "source-work-wallet", name: "Work Wallet", role: "Worker / compliance context", status: "CONNECTOR STACK EXISTS SEPARATELY" },
  { id: "source-fabstation", name: "FabStation / spatial connector", role: "Spatial work hand-off", status: "CANDIDATE / EVIDENCE-GATED" },
  { id: "source-lca", name: "LCA / material data", role: "Carbon / circularity factors", status: "NO LIVE FACTOR CLAIM IN THIS DEMO" },
];
