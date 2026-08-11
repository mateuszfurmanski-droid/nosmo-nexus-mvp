import { useEffect } from "react";
import { NODES } from "./workspace-data";

const launchableById = new Map(
  NODES.filter((node) => node.launchPath).map((node) => [node.id, node.launchPath!]),
);

/**
 * Transitional source-level launcher for graph nodes that open specialist static
 * applications. It replaces the public website's generated-bundle patching.
 *
 * The graph data owns the launch path. PersistentWorkspace should eventually call
 * that launch action directly; until then this listener keeps the behaviour in
 * editable source without modifying compiled assets.
 */
export function NexusNativeModuleLauncher() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const node = target.closest<HTMLElement>("[data-node-id]");
      const nodeId = node?.dataset.nodeId;
      if (!nodeId) return;
      const launchPath = launchableById.get(nodeId);
      if (!launchPath) return;

      event.preventDefault();
      event.stopPropagation();
      const base = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      window.location.assign(`${base}${launchPath.replace(/^\//, "")}`);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
