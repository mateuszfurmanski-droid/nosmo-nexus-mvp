import {
  Building2,
  CheckSquare,
  FileCheck2,
  FileText,
  FolderKanban,
  HardHat,
  Ruler,
  Users,
} from "lucide-react";
import type { WorkspaceNode } from "@/components/workspace-data";
import {
  ESAFE_CATEGORIES,
  ESAFE_SOURCE_FILE_COUNT,
  ESAFE_SOURCE_RECORD_COUNT,
  type EsafeCategory,
  type EsafeTimelineState,
} from "./model";

export const ESAFE_PROJECT_NODE_ID = "esafe-project";

export interface EsafeProjectGraph {
  projectId: string;
  nodes: WorkspaceNode[];
  adjacency: Record<string, string[]>;
}

const categoryIcon: Record<EsafeCategory, WorkspaceNode["Icon"]> = {
  Survey: Ruler,
  BIM: Building2,
  Design: Ruler,
  Production: HardHat,
  Construction: HardHat,
  Testing: CheckSquare,
  Research: FileCheck2,
  Communication: Users,
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function categoryNodeId(category: EsafeCategory) {
  return `esafe-category-${slug(category)}`;
}

function recordNodeId(recordId: string) {
  return `esafe-record-${recordId}`;
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

export function buildEsafeProjectGraph(timeline: EsafeTimelineState): EsafeProjectGraph {
  const visibleIds = new Set(timeline.visibleRecordIds);
  const nodes: WorkspaceNode[] = [
    {
      id: ESAFE_PROJECT_NODE_ID,
      label: "e-SAFE Catania Real Pilot",
      sublabel: `${timeline.visibleRecordCount}/${ESAFE_SOURCE_RECORD_COUNT} records · ${timeline.visibleFileCount}/${ESAFE_SOURCE_FILE_COUNT} files · ${timeline.phase}`,
      type: "project",
      Icon: FolderKanban,
    },
  ];

  for (const category of ESAFE_CATEGORIES) {
    const state = timeline.categories[category];
    const categoryId = categoryNodeId(category);
    nodes.push({
      id: categoryId,
      label: category,
      sublabel: `${state.visible}/${state.total} records visible`,
      type: "module",
      Icon: categoryIcon[category],
      graphParentId: ESAFE_PROJECT_NODE_ID,
    });

    for (const record of state.previews.filter((preview) => visibleIds.has(preview.id))) {
      nodes.push({
        id: recordNodeId(record.id),
        label: record.title,
        sublabel: `${record.core ? "CORE PILOT · " : ""}${record.fileCount} file${record.fileCount === 1 ? "" : "s"} · Zenodo ${record.id}`,
        type: "document",
        Icon: record.core ? FileCheck2 : FileText,
        graphParentId: categoryId,
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