import {
  Building2,
  CheckSquare,
  FileCheck2,
  FileText,
  FolderKanban,
  HardHat,
  Ruler,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { WorkspaceNode } from "@/components/workspace-data";
import {
  ESAFE_CATEGORIES,
  ESAFE_RECORDS,
  ESAFE_SOURCE_FILE_COUNT,
  ESAFE_SOURCE_RECORD_COUNT,
  type EsafeRecord,
  type EsafeRecordPreview,
  type EsafeTimelineState,
} from "./model";

export const ESAFE_PROJECT_NODE_ID = "esafe-project";

export const ESAFE_TRADES = [
  "Structural / Seismic",
  "MEP / Energy",
  "Electrical / Controls",
  "BIM / Digital",
  "Fabrication / Installation",
  "Survey / QA",
  "Project / General",
] as const;

export type EsafeTrade = (typeof ESAFE_TRADES)[number];

export interface EsafeProjectGraph {
  projectId: string;
  nodes: WorkspaceNode[];
  adjacency: Record<string, string[]>;
}

const tradeIcon: Record<EsafeTrade, WorkspaceNode["Icon"]> = {
  "Structural / Seismic": Building2,
  "MEP / Energy": Wrench,
  "Electrical / Controls": Zap,
  "BIM / Digital": Ruler,
  "Fabrication / Installation": HardHat,
  "Survey / QA": CheckSquare,
  "Project / General": Users,
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tradeNodeId(trade: EsafeTrade) {
  return `esafe-trade-${slug(trade)}`;
}

function recordNodeId(recordId: string) {
  return `esafe-record-${recordId}`;
}

// The current e-SAFE publication model does not expose a canonical trade field.
// Until a source-native trade attribute exists, use conservative title-based inference
// and keep Project / General as the fallback rather than inventing a specialist trade.
export function inferEsafeTrade(record: Pick<EsafeRecord, "title" | "category">): EsafeTrade {
  const value = record.title.toLowerCase();

  if (
    value.includes("bems") ||
    value.includes("building energy management") ||
    value.includes("control system") ||
    value.includes("automation")
  ) return "Electrical / Controls";

  if (
    value.includes("bim") ||
    value.includes("3d physical") ||
    value.includes("digital model") ||
    value.includes("decision support") ||
    value.includes("e-dss") ||
    value.includes("geo-dataset")
  ) return "BIM / Digital";

  if (
    value.includes("survey") ||
    value.includes("monitor") ||
    value.includes("test") ||
    value.includes("certificate") ||
    value.includes("evaluation")
  ) return "Survey / QA";

  if (
    value.includes("production") ||
    value.includes("delivery") ||
    value.includes("pre-assembly") ||
    value.includes("prefabricat") ||
    value.includes("fabrication") ||
    value.includes("assembly manual")
  ) return "Fabrication / Installation";

  if (
    value.includes("seismic") ||
    value.includes("rc frame") ||
    value.includes("rc-framed") ||
    value.includes("friction") ||
    value.includes("exoskeleton") ||
    value.includes("clt") ||
    value.includes("steel") ||
    value.includes("structural") ||
    value.includes("dissipative") ||
    value.includes("coupling")
  ) return "Structural / Seismic";

  if (
    value.includes("energy") ||
    value.includes("energetic") ||
    value.includes("thermal") ||
    value.includes("hygrothermal") ||
    value.includes("acoustic") ||
    value.includes("heat") ||
    value.includes("hot water") ||
    value.includes("moisture")
  ) return "MEP / Energy";

  return "Project / General";
}

function buildAdjacency(nodes: WorkspaceNode[]) {
  const map: Record<string, Set<string>> = Object.fromEntries(nodes.map((node) => [node.id, new Set<string>()]));
  const link = (a: string, b: string) => {
    if (a === b || !map[a] || !map[b]) return;
    map[a].add(b);
    map[b].add(a);
  };

  for (const node of nodes) {
    if (node.id === ESAFE_PROJECT_NODE_ID) continue;
    link(node.graphParentId ?? ESAFE_PROJECT_NODE_ID, node.id);
  }

  return Object.fromEntries(Object.entries(map).map(([id, links]) => [id, [...links]]));
}

function timelinePreviews(timeline: EsafeTimelineState) {
  const previews = new Map<string, EsafeRecordPreview>();
  for (const category of ESAFE_CATEGORIES) {
    for (const preview of timeline.categories[category].previews) previews.set(preview.id, preview);
  }
  return [...previews.values()];
}

export function buildEsafeProjectGraph(timeline: EsafeTimelineState): EsafeProjectGraph {
  const visibleIds = new Set(timeline.visibleRecordIds);
  const previews = timelinePreviews(timeline)
    .filter((preview) => visibleIds.has(preview.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  const nodes: WorkspaceNode[] = [
    {
      id: ESAFE_PROJECT_NODE_ID,
      label: "e-SAFE Catania Real Pilot",
      sublabel: `${timeline.visibleRecordCount}/${ESAFE_SOURCE_RECORD_COUNT} records · ${timeline.visibleFileCount}/${ESAFE_SOURCE_FILE_COUNT} files · ${timeline.phase}`,
      type: "project",
      Icon: FolderKanban,
    },
  ];

  for (const trade of ESAFE_TRADES) {
    const allTradeRecords = ESAFE_RECORDS.filter((record) => inferEsafeTrade(record) === trade);
    if (!allTradeRecords.length) continue;

    const visibleTradeCount = allTradeRecords.filter((record) => visibleIds.has(record.id)).length;
    const tradeId = tradeNodeId(trade);
    nodes.push({
      id: tradeId,
      label: trade,
      sublabel: `${visibleTradeCount}/${allTradeRecords.length} records visible`,
      type: "module",
      Icon: tradeIcon[trade],
      graphParentId: ESAFE_PROJECT_NODE_ID,
    });

    const latestTradePreviews = previews
      .filter((record) => inferEsafeTrade(record) === trade)
      .slice(0, 3);

    for (const record of latestTradePreviews) {
      nodes.push({
        id: recordNodeId(record.id),
        label: record.title,
        sublabel: `${record.core ? "CORE PILOT · " : ""}${record.category} · ${record.fileCount} file${record.fileCount === 1 ? "" : "s"} · Zenodo ${record.id}`,
        type: "document",
        Icon: record.core ? FileCheck2 : FileText,
        graphParentId: tradeId,
        receivedAt: `${record.date}T12:00:00Z`,
        documentDate: record.date,
        launchPath: record.url,
      });
    }
  }

  return {
    projectId: ESAFE_PROJECT_NODE_ID,
    nodes,
    adjacency: buildAdjacency(nodes),
  };
}
