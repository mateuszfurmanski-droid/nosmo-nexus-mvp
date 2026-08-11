import { useMemo, useState, type ChangeEvent } from "react";
import {
  createFileLoaderPendingAssets,
  type NexusCloudFileLoaderIncomingFile,
  type NexusCloudFileLoaderSelection,
} from "@/cloud/nexus-cloud-file-loader-bridge";
import type { NexusCloudProjectId, NexusCloudWorldId } from "@/cloud/nexus-cloud-drive-manifest";

type FileLoaderBridgeSourceModule = NonNullable<NexusCloudFileLoaderSelection["sourceModule"]>;

const projectOptions: Array<{ projectId: NexusCloudProjectId; worldId: NexusCloudWorldId; label: string }> = [
  {
    projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
    worldId: "esafe-demo",
    label: "e-SAFE Catania",
  },
  {
    projectId: "RIVERSIDE_DEMO_PROJECT",
    worldId: "dev",
    label: "Riverside Demo",
  },
];

const sourceModules: FileLoaderBridgeSourceModule[] = [
  "file-loader",
  "android-work-mode",
  "doorflow",
  "electrical-commissioning",
  "bim-ifc",
  "snagging",
  "qa-qc",
  "person-card",
  "connector-export",
];

function toIncomingFiles(fileList: FileList | null): NexusCloudFileLoaderIncomingFile[] {
  return [...(fileList ?? [])].map((file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
  }));
}

function splitGraphCandidates(value: string) {
  return value
    .split(/[\n,]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function NexusCloudFileLoaderBridge() {
  const [projectKey, setProjectKey] = useState("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA|esafe-demo");
  const [sourceModule, setSourceModule] = useState<FileLoaderBridgeSourceModule>("file-loader");
  const [classification, setClassification] = useState<NexusCloudFileLoaderSelection["requestedClassification"]>("inbox");
  const [tradeId, setTradeId] = useState("");
  const [graphCandidates, setGraphCandidates] = useState("");
  const [files, setFiles] = useState<NexusCloudFileLoaderIncomingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(() => {
    const [projectId, worldId] = projectKey.split("|") as [NexusCloudProjectId, NexusCloudWorldId];
    return { projectId, worldId };
  }, [projectKey]);

  const prepared = useMemo(() => {
    if (!files.length) return [];
    try {
      setError(null);
      return createFileLoaderPendingAssets(
        files,
        {
          ...selectedProject,
          sourceModule,
          requestedClassification: classification,
          tradeId: tradeId.trim() || undefined,
          graphCandidateNodeIds: splitGraphCandidates(graphCandidates),
          notes: "Prepared from Nexus Cloud File Loader bridge UI. Metadata only; binary upload not performed here.",
        },
        new Date().toISOString(),
      );
    } catch (caught) {
      setError(String(caught));
      return [];
    }
  }, [classification, files, graphCandidates, selectedProject, sourceModule, tradeId]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(toIncomingFiles(event.target.files));
  }

  return (
    <section className="rounded-3xl border border-sky-400/25 bg-card/65 p-4 md:p-6" aria-label="Nexus Cloud File Loader bridge">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">Nexus Cloud</p>
          <h2 className="text-lg font-semibold">File Loader pending asset bridge</h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Select the project before selecting files. This bridge prepares metadata and routing only; it does not upload binaries, write Google Drive, append Asset Index or mutate Project Graph.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold text-amber-200">METADATA ONLY</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-semibold">
          Project World
          <select value={projectKey} onChange={(event) => setProjectKey(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs">
            {projectOptions.map((project) => (
              <option key={`${project.projectId}|${project.worldId}`} value={`${project.projectId}|${project.worldId}`}>{project.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Source module
          <select value={sourceModule} onChange={(event) => setSourceModule(event.target.value as FileLoaderBridgeSourceModule)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs">
            {sourceModules.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Initial classification
          <select value={classification} onChange={(event) => setClassification(event.target.value as NexusCloudFileLoaderSelection["requestedClassification"])} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs">
            <option value="inbox">00_INBOX</option>
            <option value="pending_graph_link">01_PENDING_GRAPH_LINK</option>
            <option value="classified_by_trade">02_BY_TRADE</option>
            <option value="classified_by_type">03_BY_TYPE</option>
            <option value="audit_only">90_AUDIT_PROVENANCE</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Trade ID
          <input value={tradeId} onChange={(event) => setTradeId(event.target.value)} placeholder="02_FIRE_DOORS_JOINERY" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs" />
        </label>
      </div>

      <label className="mt-4 block space-y-1 text-xs font-semibold">
        Graph candidate node IDs — review hints only
        <textarea value={graphCandidates} onChange={(event) => setGraphCandidates(event.target.value)} placeholder="door-001, room-L02-014" className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs" />
      </label>

      <div className="mt-4 rounded-2xl border border-dashed border-sky-400/35 bg-sky-400/5 p-4">
        <label className="inline-flex cursor-pointer items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-200">
          Select files for metadata preparation
          <input type="file" multiple className="hidden" onChange={handleFiles} />
        </label>
        <p className="mt-2 text-[10px] text-muted-foreground">Selected file metadata stays in the browser. This UI intentionally does not read, hash or upload file contents.</p>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-200">{error}</div>}

      {prepared.length > 0 && (
        <div className="mt-5 space-y-3">
          {prepared.map((entry) => (
            <article key={entry.pendingAsset.pendingAssetId} className="rounded-2xl border border-border bg-background/50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">{entry.pendingAsset.fileName}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{entry.pendingAsset.pendingAssetId}</p>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-200">{entry.nextRequiredStep}</span>
              </div>
              <div className="mt-3 grid gap-2 text-[10px] text-muted-foreground md:grid-cols-3">
                <span>Target: {entry.pendingAsset.targetFolderRole}</span>
                <span>Folder: {entry.pendingAsset.targetFolderId}</span>
                <span>Upload state: {entry.pendingAsset.uploadState}</span>
              </div>
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-border bg-card/45 p-3 text-[10px] leading-relaxed">{JSON.stringify(entry, null, 2)}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
