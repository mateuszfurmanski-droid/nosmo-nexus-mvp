import { useEffect, useMemo, useState } from "react";
import { CheckSquare, UserRound } from "lucide-react";
import InteractiveWorkspace from "@/components/interactive-workspace";
import { EsafeProjectWorldTimeline } from "@/components/esafe-project-world-timeline";
import { NexusCoreApprovalPanel } from "@/components/nexus-core-approval-panel";
import { NexusCoreSemanticDropAdapter } from "@/components/nexus-core-semantic-drop-adapter";
import { NexusCoreSourcePalette } from "@/components/nexus-core-source-palette";
import { NexusCoreStagingManagerLogin } from "@/components/nexus-core-staging-manager-login";
import { NexusFloatingWindow } from "@/components/nexus-floating-window";
import type { WorkspaceNode } from "@/components/workspace-data";
import { buildEsafeProjectGraph } from "@/project-worlds/esafe/graph";
import { buildEsafeTimelineState, type EsafeTimelineState } from "@/project-worlds/esafe/model";
import "@/project-worlds/esafe/invariants";

const CORE_PROJECT_ID = "project-esafe-catania";
const CORE_WORLD_ID = "world-esafe-catania";
const MANAGER_PERSON_ID = "person-joanna-klosek";
const WORKER_PERSON_ID = "person-mateusz-furmanski";

type AuthoritativeProjection = {
  version?: string;
  snapshot?: {
    tasks?: Record<string, unknown>[];
    evidence?: Record<string, unknown>[];
    approvals?: Record<string, unknown>[];
    timeline?: Record<string, unknown>[];
  };
};

const stagingPeople: WorkspaceNode[] = [
  {
    id: MANAGER_PERSON_ID,
    label: "Joanna Klosek",
    sublabel: "Manager · canonical staging Person",
    type: "person",
    Icon: UserRound,
    company: "NOSMO / e-SAFE",
  },
  {
    id: WORKER_PERSON_ID,
    label: "Mateusz Furmanski",
    sublabel: "Worker · canonical staging Person",
    type: "person",
    Icon: UserRound,
    company: "NOSMO / e-SAFE",
  },
];

const stringValue = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === "string" ? String(record[key]) : undefined;

const stringArray = (record: Record<string, unknown>, key: string): string[] =>
  Array.isArray(record[key]) ? (record[key] as unknown[]).filter((value): value is string => typeof value === "string") : [];

const recordValue = (record: Record<string, unknown>, key: string): Record<string, unknown> | null => {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

export default function EsafeCoreWorkspace() {
  const [timeline, setTimeline] = useState<EsafeTimelineState>(() => buildEsafeTimelineState(0.72, "simulation"));
  const [authoritativeProjection, setAuthoritativeProjection] = useState<AuthoritativeProjection | null>(null);

  useEffect(() => {
    const handleTimeline = (event: Event) => {
      const detail = (event as CustomEvent<EsafeTimelineState & { worldId?: string }>).detail;
      if (!detail || detail.worldId !== "esafe") return;
      setTimeline(detail);
    };
    window.addEventListener("nexus:project-world-time-change", handleTimeline as EventListener);
    return () => window.removeEventListener("nexus:project-world-time-change", handleTimeline as EventListener);
  }, []);

  useEffect(() => {
    const handleProjection = (event: Event) => {
      const detail = (event as CustomEvent<AuthoritativeProjection>).detail;
      if (!detail?.snapshot) return;
      setAuthoritativeProjection(detail);
    };
    window.addEventListener("nexus:core-authoritative-projection", handleProjection as EventListener);
    return () => window.removeEventListener("nexus:core-authoritative-projection", handleProjection as EventListener);
  }, []);

  const graph = useMemo(() => buildEsafeProjectGraph(timeline, null), [timeline]);
  const authoritativeTasks = authoritativeProjection?.snapshot?.tasks ?? [];

  const nodes = useMemo(() => {
    const merged = [...graph.nodes];
    const existingIds = new Set(merged.map((node) => node.id));

    for (const person of stagingPeople) {
      if (!existingIds.has(person.id)) {
        merged.push(person);
        existingIds.add(person.id);
      }
    }

    for (const task of authoritativeTasks) {
      const taskId = stringValue(task, "id");
      if (!taskId || existingIds.has(taskId)) continue;
      merged.push({
        id: taskId,
        label: stringValue(task, "title") ?? taskId,
        sublabel: `AUTHORITATIVE · ${stringValue(task, "taskStatus") ?? "unknown"}`,
        type: "task",
        Icon: CheckSquare,
      });
      existingIds.add(taskId);
    }

    return merged;
  }, [authoritativeTasks, graph.nodes]);

  const adjacency = useMemo(() => {
    const relationSets = new Map<string, Set<string>>();
    for (const [id, related] of Object.entries(graph.adjacency)) {
      relationSets.set(id, new Set(related));
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const connect = (left: string, right: string) => {
      if (!left || !right || left === right || !nodeIds.has(left) || !nodeIds.has(right)) return;
      if (!relationSets.has(left)) relationSets.set(left, new Set());
      if (!relationSets.has(right)) relationSets.set(right, new Set());
      relationSets.get(left)!.add(right);
      relationSets.get(right)!.add(left);
    };

    connect(MANAGER_PERSON_ID, graph.projectId);
    connect(WORKER_PERSON_ID, graph.projectId);

    for (const task of authoritativeTasks) {
      const taskId = stringValue(task, "id");
      if (!taskId) continue;
      connect(taskId, graph.projectId);
      for (const personId of stringArray(task, "assignedPersonIds")) connect(taskId, personId);

      const workPackage = recordValue(task, "workPackage");
      const packageItems = workPackage?.packageItems;
      if (Array.isArray(packageItems)) {
        for (const item of packageItems) {
          if (!item || typeof item !== "object" || Array.isArray(item)) continue;
          const itemRecord = item as Record<string, unknown>;
          const itemId = stringValue(itemRecord, "id");
          if (itemId) connect(taskId, itemId);
        }
      }
    }

    return Object.fromEntries([...relationSets].map(([id, related]) => [id, [...related]]));
  }, [authoritativeTasks, graph.adjacency, graph.projectId, nodes]);

  const taskLinks = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const links: Record<string, { people: string[]; docs: string[] }> = {};

    for (const node of nodes) {
      if (node.type !== "task") continue;
      const related = adjacency[node.id] ?? [];
      links[node.id] = {
        people: related.filter((id) => byId.get(id)?.type === "person"),
        docs: related.filter((id) => byId.get(id)?.type === "document"),
      };
    }

    return links;
  }, [adjacency, nodes]);

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <InteractiveWorkspace
        nodes={nodes}
        projectId={graph.projectId}
        managerId={MANAGER_PERSON_ID}
        adjacency={adjacency}
        taskLinks={taskLinks}
        headerTitle="e-SAFE Catania Real Pilot · Nexus Relationship Tree"
      />

      <NexusFloatingWindow
        id="manager-login"
        title="Manager identity"
        defaultPosition={{ x: 12, y: 54 }}
        widthClass="w-[min(380px,calc(100vw-16px))]"
      >
        <NexusCoreStagingManagerLogin embedded />
      </NexusFloatingWindow>

      <NexusFloatingWindow
        id="core-authority"
        title="Core authority"
        defaultPosition={{ x: Math.max(12, Math.round(viewportWidth / 2 - 260)), y: 54 }}
        widthClass="w-[min(520px,calc(100vw-16px))]"
        defaultMinimized
      >
        <NexusCoreSemanticDropAdapter embedded />
      </NexusFloatingWindow>

      <NexusFloatingWindow
        id="approval"
        title="Human approval"
        defaultPosition={{ x: Math.max(12, viewportWidth - 380), y: 54 }}
        widthClass="w-[min(360px,calc(100vw-16px))]"
        defaultMinimized
      >
        <NexusCoreApprovalPanel embedded />
      </NexusFloatingWindow>

      <NexusFloatingWindow
        id="work-package"
        title="Work Package"
        defaultPosition={{ x: 12, y: Math.max(120, viewportHeight - 320) }}
        widthClass="w-[min(720px,calc(100vw-16px))]"
        heightClass="max-h-[58dvh]"
      >
        <NexusCoreSourcePalette
          embedded
          nodes={nodes}
          projectId={CORE_PROJECT_ID}
          worldId={CORE_WORLD_ID}
        />
      </NexusFloatingWindow>

      <NexusFloatingWindow
        id="timeline"
        title="Project Timeline"
        defaultPosition={{ x: Math.max(12, viewportWidth - 700), y: Math.max(100, viewportHeight - 460) }}
        widthClass="w-[min(680px,calc(100vw-16px))]"
        heightClass="h-[min(62dvh,560px)]"
        defaultMinimized
      >
        <EsafeProjectWorldTimeline embedded onClose={() => undefined} />
      </NexusFloatingWindow>
    </div>
  );
}
