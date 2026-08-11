import { useEffect } from "react";
import { PROJECT_ID } from "./workspace-data";

type GraphCommandDetail = {
  action?: string;
  nodeId?: string;
};

let lastSelectedId = PROJECT_ID;
let lastMode: "map" | "workflow" = "map";

function allButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
}

function buttonContaining(text: string) {
  const needle = text.toLowerCase();
  return allButtons().find((button) => (button.textContent ?? "").toLowerCase().includes(needle));
}

function iconButton(iconClass: string) {
  return document.querySelector<SVGElement>(`svg.${iconClass}`)?.closest<HTMLButtonElement>("button") ?? null;
}

function nodeButton(nodeId: string) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-node-id]"));
  return nodes.find((node) => node.dataset.nodeId === nodeId)?.querySelector<HTMLButtonElement>("button") ?? null;
}

function readZoom() {
  const value = document.querySelector<HTMLElement>("[data-zoom]")?.dataset.zoom;
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function timelineButton() {
  return allButtons().find((button) =>
    (button.getAttribute("title") ?? "").toLowerCase().includes("received documents outward by time") ||
    (button.textContent ?? "").toLowerCase().includes("timeline"),
  ) ?? null;
}

function emitState() {
  const timeline = timelineButton();
  window.dispatchEvent(new CustomEvent("nexus:graph-state", {
    detail: {
      timelineEnabled: timeline?.getAttribute("aria-pressed") === "true",
      selectedId: lastSelectedId,
      zoom: readZoom(),
      mode: lastMode,
    },
  }));
}

function returnToMapIfNeeded(after?: () => void) {
  const back = buttonContaining("back to persistent map");
  if (!back) {
    lastMode = "map";
    after?.();
    return;
  }
  back.click();
  lastMode = "map";
  window.setTimeout(() => after?.(), 30);
}

/**
 * Temporary source-level compatibility bridge for the first shell-reconciliation slice.
 *
 * The public website shell used DOM clicks against the compiled graph bundle. This bridge
 * keeps the same behaviour inside editable Nexus source while the next slice replaces these
 * commands with explicit PersistentWorkspace props/context. No compiled bundle is patched.
 */
export function NexusGraphCompatibilityBridge() {
  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<GraphCommandDetail>).detail ?? {};

      switch (detail.action) {
        case "focus-node": {
          const nodeId = detail.nodeId || PROJECT_ID;
          returnToMapIfNeeded(() => {
            nodeButton(nodeId)?.click();
            lastSelectedId = nodeId;
            window.setTimeout(emitState, 30);
          });
          return;
        }
        case "timeline-toggle":
          timelineButton()?.click();
          break;
        case "zoom-in":
          iconButton("lucide-plus")?.click();
          break;
        case "zoom-out":
          iconButton("lucide-minus")?.click();
          break;
        case "fit":
          iconButton("lucide-maximize-2")?.click();
          break;
        case "reset":
          iconButton("lucide-rotate-ccw")?.click();
          lastSelectedId = PROJECT_ID;
          lastMode = "map";
          break;
        case "workflow":
          buttonContaining("workflow")?.click();
          lastMode = "workflow";
          break;
        default:
          return;
      }

      window.setTimeout(emitState, 40);
    };

    window.addEventListener("nexus:graph-command", handleCommand as EventListener);
    window.setTimeout(emitState, 0);
    window.setTimeout(emitState, 250);

    return () => window.removeEventListener("nexus:graph-command", handleCommand as EventListener);
  }, []);

  return (
    <style>{`
      [data-control][class*="absolute left-3 top-3 z-50"] { display: none !important; }
      [data-control][class*="absolute left-1/2 top-3 z-40"] { display: none !important; }
    `}</style>
  );
}
