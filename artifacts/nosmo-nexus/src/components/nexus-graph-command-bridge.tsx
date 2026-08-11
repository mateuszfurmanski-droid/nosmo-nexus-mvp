import { useEffect } from "react";
import { PROJECT_ID } from "./workspace-data";

type CommandDetail = { action?: string; nodeId?: string };

let selectedId = PROJECT_ID;
let graphMode: "map" | "workflow" = "map";

function root() {
  return document.querySelector<HTMLElement>("[data-zoom]");
}

function buttons() {
  return Array.from(root()?.querySelectorAll<HTMLButtonElement>("button") ?? []);
}

function nodeButton(nodeId: string) {
  const nodes = Array.from(root()?.querySelectorAll<HTMLElement>("[data-node-id]") ?? []);
  return nodes.find((node) => node.dataset.nodeId === nodeId)?.querySelector<HTMLButtonElement>("button") ?? null;
}

function controlByIcon(className: string) {
  return root()?.querySelector<SVGElement>(`svg.${className}`)?.closest<HTMLButtonElement>("button") ?? null;
}

function timelineControl() {
  return buttons().find((button) => (button.getAttribute("title") ?? "").toLowerCase().includes("received documents outward by time")) ?? null;
}

function workflowControl() {
  return buttons().find((button) => (button.getAttribute("title") ?? "").toLowerCase().includes("open workflow view")) ?? null;
}

function backToMapControl() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    (button.textContent ?? "").toLowerCase().includes("back to persistent map"),
  ) ?? null;
}

function emitState() {
  const zoomValue = root()?.dataset.zoom;
  const zoom = zoomValue ? Number(zoomValue) : undefined;
  window.dispatchEvent(new CustomEvent("nexus:graph-state", {
    detail: {
      timelineEnabled: timelineControl()?.getAttribute("aria-pressed") === "true",
      selectedId,
      zoom: Number.isFinite(zoom) ? zoom : undefined,
      mode: graphMode,
    },
  }));
}

function onMap(callback: () => void) {
  const back = backToMapControl();
  if (!back) {
    graphMode = "map";
    callback();
    return;
  }
  back.click();
  graphMode = "map";
  window.setTimeout(callback, 40);
}

export function NexusGraphCommandBridge() {
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<CommandDetail>).detail ?? {};

      if (detail.action === "focus-node") {
        const nextId = detail.nodeId || PROJECT_ID;
        onMap(() => {
          nodeButton(nextId)?.click();
          selectedId = nextId;
          window.setTimeout(emitState, 40);
        });
        return;
      }

      if (detail.action === "timeline-toggle") timelineControl()?.click();
      if (detail.action === "zoom-in") controlByIcon("lucide-plus")?.click();
      if (detail.action === "zoom-out") controlByIcon("lucide-minus")?.click();
      if (detail.action === "fit") controlByIcon("lucide-maximize-2")?.click();
      if (detail.action === "reset") {
        controlByIcon("lucide-rotate-ccw")?.click();
        selectedId = PROJECT_ID;
        graphMode = "map";
      }
      if (detail.action === "workflow") {
        workflowControl()?.click();
        graphMode = "workflow";
      }

      window.setTimeout(emitState, 50);
    };

    window.addEventListener("nexus:graph-command", handle as EventListener);
    window.setTimeout(emitState, 0);
    window.setTimeout(emitState, 250);
    return () => window.removeEventListener("nexus:graph-command", handle as EventListener);
  }, []);

  return (
    <style>{`
      [data-control][class*="absolute left-3 top-3 z-50"] { display: none !important; }
      [data-control][class*="absolute left-1/2 top-3 z-40"] { display: none !important; }
    `}</style>
  );
}
