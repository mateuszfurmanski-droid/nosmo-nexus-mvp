import { useMemo, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  FileSearch,
  Fingerprint,
  HardDriveUpload,
  Link2,
  LockKeyhole,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import {
  MAX_LOCAL_IFC_BYTES,
  parseIfcStep,
  saveIfcMappings,
  searchIfcEntities,
  upsertIfcMapping,
  type IfcGuidMapping,
  type IfcLocalModelSession,
} from "@/bim/ifc-mapping";

type IfcImportPanelProps = {
  pilots: InstallationPilot[];
  mappings: IfcGuidMapping[];
  onMappingsChange: (mappings: IfcGuidMapping[]) => void;
  onModelSessionChange?: (session: IfcLocalModelSession | null) => void;
  initialTargetId?: string;
};

function bytesLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function sha256Hex(buffer: ArrayBuffer) {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function IfcImportPanel({
  pilots,
  mappings,
  onMappingsChange,
  onModelSessionChange,
  initialTargetId,
}: IfcImportPanelProps) {
  const fallbackTarget = initialTargetId && pilots.some((pilot) => pilot.object.id === initialTargetId)
    ? initialTargetId
    : pilots[0]?.object.id ?? "";
  const [targetId, setTargetId] = useState(fallbackTarget);
  const [loaded, setLoaded] = useState<IfcLocalModelSession | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const smokeFixtureHref = `${import.meta.env.BASE_URL}fixtures/nexus_smoke_electrical.ifc`;

  const targetPilot = pilots.find((pilot) => pilot.object.id === targetId) ?? pilots[0];
  const candidates = useMemo(() => {
    if (!loaded || !targetPilot) return [];
    return searchIfcEntities(loaded.parsed.entities, targetPilot.tradeId, query);
  }, [loaded, query, targetPilot]);

  const candidateCount = loaded?.parsed.entities.filter((entity) => entity.kind === "object").length ?? 0;

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setLoaded(null);
    onModelSessionChange?.(null);
    if (!file.name.toLowerCase().endsWith(".ifc")) {
      setError("Select a plain STEP IFC file with the .ifc extension. IFCZIP is not enabled in this first mapper.");
      return;
    }
    if (file.size > MAX_LOCAL_IFC_BYTES) {
      setError(`This mobile-safe mapper is limited to ${bytesLabel(MAX_LOCAL_IFC_BYTES)} per file. Use a smaller discipline model for this stage.`);
      return;
    }

    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const parsed = parseIfcStep(text);
      if (!parsed.entities.length) {
        setError("No IFC GlobalId records were found. The file may not be IFC STEP/SPF or may be unsupported.");
        return;
      }
      const sha256 = await sha256Hex(buffer);
      const nextSession: IfcLocalModelSession = {
        fileName: file.name,
        fileSize: file.size,
        sha256,
        parsed,
        text,
      };
      setLoaded(nextSession);
      onModelSessionChange?.(nextSession);
      setQuery("");
    } catch {
      setError("The IFC file could not be read locally in this browser.");
    } finally {
      setBusy(false);
    }
  }

  function mapEntity(globalId: string) {
    if (!loaded || !targetPilot) return;
    const entity = loaded.parsed.entities.find((candidate) => candidate.globalId === globalId);
    if (!entity) return;

    const next: IfcGuidMapping = {
      nexusObjectId: targetPilot.object.id,
      ifcGlobalId: entity.globalId,
      ifcEntityType: entity.entityType,
      ifcStepId: entity.stepId,
      ifcName: entity.name,
      ifcTag: entity.tag,
      sourceFileName: loaded.fileName,
      sourceFileSize: loaded.fileSize,
      sourceSchema: loaded.parsed.schema,
      sourceFileSha256: loaded.sha256,
      sourceProjectGlobalId: loaded.parsed.projectGlobalId,
      mappedAt: new Date().toISOString(),
    };

    const updated = upsertIfcMapping(mappings, next);
    saveIfcMappings(updated);
    onMappingsChange(updated);
  }

  function removeMapping(nexusObjectId: string) {
    const updated = mappings.filter((mapping) => mapping.nexusObjectId !== nexusObjectId);
    saveIfcMappings(updated);
    onMappingsChange(updated);
  }

  return (
    <section className="rounded-3xl border border-indigo-400/25 bg-card/65 p-4 md:p-6" aria-label="IFC GlobalId mapper">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-400/10 text-indigo-300">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">IFC GUID ↔ Nexus Object ID</p>
              <h2 className="font-semibold">Local IFC identity mapper</h2>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Read a real IFC STEP file in the browser, select an IfcRoot object and bind its GlobalId to the stable Nexus Object ID. The active file can also feed the local geometry preview, but the file contents are never persisted by this mapper.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">
          <LockKeyhole className="h-3.5 w-3.5" /> LOCAL FILE ONLY
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {pilots.map((pilot) => {
          const mapping = mappings.find((entry) => entry.nexusObjectId === pilot.object.id);
          const active = pilot.object.id === targetId;
          return (
            <button
              key={pilot.object.id}
              type="button"
              onClick={() => setTargetId(pilot.object.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-indigo-400/45 bg-indigo-400/10" : "border-border bg-background/40 hover:bg-secondary/35"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{pilot.tradeName}</p>
                  <p className="mt-1 text-sm font-semibold">{pilot.object.id}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{pilot.object.code} · {pilot.object.name}</p>
                </div>
                {mapping ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Link2 className="h-4 w-4 text-muted-foreground" />}
              </div>
              {mapping && (
                <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-2.5">
                  <p className="truncate font-mono text-[10px] text-emerald-200">{mapping.ifcGlobalId}</p>
                  <p className="mt-1 truncate text-[9px] text-muted-foreground">{mapping.ifcEntityType} · {mapping.sourceFileName}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">Target: {targetPilot?.object.id ?? "No target"}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Choose the Nexus object first, then open an IFC discipline model.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={smokeFixtureHref}
              download="nexus_smoke_electrical.ifc"
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/15"
            >
              Synthetic smoke fixture
            </a>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-400/15">
              <HardDriveUpload className="h-4 w-4" /> {busy ? "Reading IFC…" : "Open .ifc file"}
              <input type="file" accept=".ifc,text/plain" className="hidden" disabled={busy} onChange={loadFile} />
            </label>
          </div>
        </div>
        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-100/90">
          The synthetic smoke fixture is only for repeatable mapper/UI smoke. It is not a representative project IFC and must not be used for real IFC, trusted-viewer, coordinate, tolerance, device or partner PASS.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loaded && (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-border bg-card/45 p-3"><p className="text-[9px] uppercase text-muted-foreground">File</p><p className="mt-1 truncate text-xs font-semibold">{loaded.fileName}</p></div>
              <div className="rounded-xl border border-border bg-card/45 p-3"><p className="text-[9px] uppercase text-muted-foreground">Schema</p><p className="mt-1 text-xs font-semibold">{loaded.parsed.schema ?? "Unknown"}</p></div>
              <div className="rounded-xl border border-border bg-card/45 p-3"><p className="text-[9px] uppercase text-muted-foreground">Size</p><p className="mt-1 text-xs font-semibold">{bytesLabel(loaded.fileSize)}</p></div>
              <div className="rounded-xl border border-border bg-card/45 p-3"><p className="text-[9px] uppercase text-muted-foreground">Root records</p><p className="mt-1 text-xs font-semibold">{loaded.parsed.entities.length}</p></div>
              <div className="rounded-xl border border-border bg-card/45 p-3"><p className="text-[9px] uppercase text-muted-foreground">Object candidates</p><p className="mt-1 text-xs font-semibold">{candidateCount}</p></div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card/35 p-3 text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">Source fingerprint:</span> {loaded.sha256 ? `SHA-256 ${loaded.sha256.slice(0, 16)}…` : "browser hash unavailable"}
              {loaded.parsed.projectGlobalId ? ` · IFC project ${loaded.parsed.projectGlobalId}` : ""}
            </div>

            {loaded.parsed.warnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] text-amber-200">
                {loaded.parsed.warnings.join(" ")}
              </div>
            )}

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search GlobalId, IFC type, name or tag"
                className="w-full rounded-xl border border-border bg-background px-10 py-2.5 text-xs outline-none focus:border-indigo-400/45"
              />
            </div>

            <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {candidates.map((entity) => {
                const current = mappings.some(
                  (mapping) =>
                    mapping.nexusObjectId === targetPilot?.object.id &&
                    mapping.ifcGlobalId === entity.globalId &&
                    (mapping.sourceFileSha256 && loaded.sha256
                      ? mapping.sourceFileSha256 === loaded.sha256
                      : mapping.sourceFileName === loaded.fileName && mapping.sourceFileSize === loaded.fileSize),
                );
                return (
                  <div key={`${entity.stepId}-${entity.globalId}`} className="flex flex-col gap-3 rounded-xl border border-border bg-card/45 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[9px] font-bold">#{entity.stepId}</span>
                        <span className="text-[10px] font-semibold text-indigo-200">{entity.entityType}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-foreground">{entity.globalId}</p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{entity.name ?? entity.tag ?? "Unnamed IFC object"}{entity.tag && entity.name ? ` · tag ${entity.tag}` : ""}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => mapEntity(entity.globalId)}
                      disabled={current || !targetPilot}
                      className="shrink-0 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-[10px] font-semibold text-indigo-200 disabled:opacity-50"
                    >
                      {current ? "Mapped" : `Map to ${targetPilot?.object.id ?? "Nexus"}`}
                    </button>
                  </div>
                );
              })}
              {!candidates.length && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card/35 p-4 text-xs text-muted-foreground">
                  <FileSearch className="h-4 w-4" /> No mappable IFC object matches this search.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {mappings.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Saved local mappings</p>
          {mappings.map((mapping) => (
            <div key={mapping.nexusObjectId} className="flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{mapping.nexusObjectId} ↔ <span className="font-mono text-emerald-200">{mapping.ifcGlobalId}</span></p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{mapping.ifcEntityType} · {mapping.sourceFileName} · {mapping.sourceSchema ?? "schema unknown"}</p>
              </div>
              <button type="button" onClick={() => removeMapping(mapping.nexusObjectId)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-[10px] font-semibold text-red-200">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        IFC file contents and geometry stay only in the active browser session. LocalStorage keeps only the selected GlobalId-to-Nexus mapping and source provenance. After reload, reopen the source IFC to view geometry again. Approved design intent remains with the IFC/model source.
      </p>
    </section>
  );
}
