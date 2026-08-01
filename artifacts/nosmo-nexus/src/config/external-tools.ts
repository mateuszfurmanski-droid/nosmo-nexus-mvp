import {
  Boxes,
  Building2,
  Camera,
  Cloud,
  FilePenLine,
  FolderOpen,
  HardHat,
  Mail,
  Sheet,
  ToolCase,
  Video,
  type LucideIcon,
} from "lucide-react";

export type ExternalToolCategory = "Construction" | "Field" | "Assets" | "Documents" | "Productivity" | "Communication";
export type ExternalToolStage = "LAUNCHER" | "DEEPLINK READY" | "CONNECTOR PLANNED";

export type ExternalTool = {
  id: string;
  name: string;
  description: string;
  href: string;
  category: ExternalToolCategory;
  stage: ExternalToolStage;
  icon: LucideIcon;
  shortLabel: string;
  relevantTrades: string[];
  futureIntegration: string[];
};

export const externalTools: ExternalTool[] = [
  {
    id: "hilti-ontrack",
    name: "Hilti ON!Track",
    description: "Open the existing Hilti asset, tool, equipment and certificate management system.",
    href: "https://ontrack3.hilti.com",
    category: "Assets",
    stage: "LAUNCHER",
    icon: ToolCase,
    shortLabel: "H",
    relevantTrades: ["all"],
    futureIntegration: ["asset availability", "tool assignments", "service dates", "certificate status"],
  },
  {
    id: "fieldwire",
    name: "Fieldwire",
    description: "Open field tasks, plans, punch lists and inspection records in the existing Fieldwire platform.",
    href: "https://app.fieldwire.com/auth/sign_in?lang=en",
    category: "Field",
    stage: "LAUNCHER",
    icon: HardHat,
    shortLabel: "F",
    relevantTrades: ["all"],
    futureIntegration: ["tasks", "punch lists", "plan references", "inspection records"],
  },
  {
    id: "procore",
    name: "Procore",
    description: "Open the Procore construction management platform for projects, RFIs, submittals and daily logs.",
    href: "https://login.procore.com",
    category: "Construction",
    stage: "LAUNCHER",
    icon: Building2,
    shortLabel: "P",
    relevantTrades: ["all"],
    futureIntegration: ["projects", "RFIs", "submittals", "daily logs"],
  },
  {
    id: "autodesk-acc",
    name: "Autodesk Construction Cloud",
    description: "Open ACC for BIM models, drawings, issues and common data environment records.",
    href: "https://acc.autodesk.com",
    category: "Construction",
    stage: "LAUNCHER",
    icon: Boxes,
    shortLabel: "A",
    relevantTrades: ["mechanical-hvac", "plumbing-public-health", "fire-protection", "passive-fire", "drylining-ceilings", "steel-fabrication"],
    futureIntegration: ["models", "issues", "drawing sheets", "project folders"],
  },
  {
    id: "companycam",
    name: "CompanyCam",
    description: "Open project photo records, galleries and field documentation in CompanyCam.",
    href: "https://app.companycam.com/users/sign_in",
    category: "Field",
    stage: "LAUNCHER",
    icon: Camera,
    shortLabel: "C",
    relevantTrades: ["all"],
    futureIntegration: ["project photos", "location context", "evidence links", "completion galleries"],
  },
  {
    id: "bluebeam",
    name: "Bluebeam on the web",
    description: "Open Bluebeam web access for drawings, reviews, markups and Studio collaboration.",
    href: "https://app.bluebeam.com",
    category: "Documents",
    stage: "LAUNCHER",
    icon: FilePenLine,
    shortLabel: "B",
    relevantTrades: ["all"],
    futureIntegration: ["PDF markups", "review sessions", "drawing references", "issue extraction"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Open shared plans, documents, spreadsheets and project folders in Google Drive.",
    href: "https://drive.google.com",
    category: "Documents",
    stage: "LAUNCHER",
    icon: FolderOpen,
    shortLabel: "G",
    relevantTrades: ["all"],
    futureIntegration: ["file picker", "folder sync", "document metadata", "controlled links"],
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    description: "Open the Microsoft 365 workspace for documents, spreadsheets and shared project information.",
    href: "https://www.office.com",
    category: "Productivity",
    stage: "LAUNCHER",
    icon: Sheet,
    shortLabel: "M",
    relevantTrades: ["all"],
    futureIntegration: ["Excel schedules", "document links", "project templates", "controlled exports"],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Open OneDrive project documents and drawing folders.",
    href: "https://onedrive.live.com",
    category: "Documents",
    stage: "LAUNCHER",
    icon: Cloud,
    shortLabel: "O",
    relevantTrades: ["all"],
    futureIntegration: ["project folder sync", "file revisions", "evidence upload", "controlled sharing"],
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    description: "Open Microsoft SharePoint sites and organisational project records.",
    href: "https://www.office.com/launch/sharepoint",
    category: "Documents",
    stage: "LAUNCHER",
    icon: Cloud,
    shortLabel: "S",
    relevantTrades: ["all"],
    futureIntegration: ["site libraries", "project records", "permissions", "document metadata"],
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Open Gmail for project and person communication outside the contextual Communication Hub.",
    href: "https://mail.google.com",
    category: "Communication",
    stage: "LAUNCHER",
    icon: Mail,
    shortLabel: "G",
    relevantTrades: ["all"],
    futureIntegration: ["thread links", "context packets", "follow-up state", "project correspondence"],
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Open Teams for project chats, calls and collaboration spaces.",
    href: "https://teams.microsoft.com",
    category: "Communication",
    stage: "LAUNCHER",
    icon: Video,
    shortLabel: "T",
    relevantTrades: ["all"],
    futureIntegration: ["person chat links", "project channels", "meeting context", "follow-up records"],
  },
];

export function toolsForTrade(tradeId: string) {
  return externalTools.filter((tool) => tool.relevantTrades.includes("all") || tool.relevantTrades.includes(tradeId));
}
