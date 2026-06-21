import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFiles,
  useListDoors,
  useUpdateDoorStatus,
  getListDoorsQueryKey,
  type Door,
  type DoorReviewStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

const STATUS_META: Record<"red" | "amber" | "green", { label: string; dot: string; ring: string }> = {
  red: { label: "Red", dot: "bg-red-500", ring: "ring-red-500" },
  amber: { label: "Amber", dot: "bg-amber-500", ring: "ring-amber-500" },
  green: { label: "Green", dot: "bg-emerald-500", ring: "ring-emerald-500" },
};

function pinColor(status: DoorReviewStatus): string {
  if (status === "red") return "bg-red-500";
  if (status === "amber") return "bg-amber-500";
  if (status === "green") return "bg-emerald-500";
  return "bg-slate-500";
}

export default function PlanReview() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: files } = useListFiles();
  const planFile = files?.find((f) => f.kind === "pdf" && f.status === "ready");
  const scheduleFile = files?.find((f) => f.kind === "excel" && f.status === "ready");

  const doorsQueryKey = scheduleFile ? getListDoorsQueryKey(scheduleFile.id) : null;
  const { data: doors } = useListDoors(scheduleFile?.id ?? "", {
    query: { enabled: !!scheduleFile, queryKey: getListDoorsQueryKey(scheduleFile?.id ?? "") },
  });

  const updateStatus = useUpdateDoorStatus({
    mutation: {
      onSuccess: () => {
        if (doorsQueryKey) void queryClient.invalidateQueries({ queryKey: doorsQueryKey });
      },
    },
  });

  const selectedDoor = doors?.find((d) => d.id === selectedId) ?? null;

  // Resolve a pin position for every door, falling back to a bottom row for
  // any door without seeded coordinates.
  const unpositioned = (doors ?? []).filter((d) => d.x == null || d.y == null);
  function pinPos(d: Door): { x: number; y: number } {
    if (d.x != null && d.y != null) return { x: d.x, y: d.y };
    const idx = unpositioned.indexOf(d);
    return { x: (idx + 1) / (unpositioned.length + 1), y: 0.94 };
  }

  function setStatus(status: "red" | "amber" | "green") {
    if (!scheduleFile || !selectedDoor) return;
    updateStatus.mutate({ id: scheduleFile.id, doorId: selectedDoor.id, data: { reviewStatus: status } });
  }

  async function onPhotoSelected(file: File) {
    if (!scheduleFile || !selectedDoor) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`/api/demo-files/${scheduleFile.id}/doors/${selectedDoor.id}/photo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Upload failed");
      }
      setPhotoVersion((v) => v + 1);
      if (doorsQueryKey) await queryClient.invalidateQueries({ queryKey: doorsQueryKey });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const planImageUrl = planFile ? `/api/demo-files/${planFile.id}/pages/1/image` : null;
  const counts = {
    red: doors?.filter((d) => d.reviewStatus === "red").length ?? 0,
    amber: doors?.filter((d) => d.reviewStatus === "amber").length ?? 0,
    green: doors?.filter((d) => d.reviewStatus === "green").length ?? 0,
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0d13] text-slate-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-cyan-500/90" />
          <div>
            <h1 className="text-sm font-semibold tracking-wide">
              NOSMO Nexus<span className="text-cyan-400"> · Plan Review</span>
            </h1>
            <p className="text-xs text-slate-400">Lloyds Bank, Halifax — 360 Interiors · Ground Floor Door Schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{counts.green}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{counts.amber}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />{counts.red}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{doors?.length ?? 0} doors</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Plan stage */}
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden p-6">
          {planImageUrl ? (
            <div className="relative h-full max-w-full" style={{ aspectRatio: "1000 / 680", width: "auto" }}>
              <img
                src={planImageUrl}
                alt="Ground floor plan"
                className="absolute inset-0 h-full w-full rounded-lg border border-white/10 bg-white object-fill shadow-2xl"
                draggable={false}
              />
              {(doors ?? []).map((d) => {
                const pos = pinPos(d);
                const selected = d.id === selectedId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg transition-transform hover:scale-110 ${pinColor(
                      d.reviewStatus,
                    )} ${selected ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0d13] scale-110" : ""}`}
                    title={`${d.id} — ${d.type}`}
                  >
                    {d.id}
                    {d.hasPhoto ? <span className="ml-1">📷</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Loading plan…</div>
          )}
        </div>

        {/* Side panel */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-white/10 bg-[#0d111a]">
          {selectedDoor ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className={`h-3 w-3 rounded-full ${pinColor(selectedDoor.reviewStatus)}`} />
                  <h2 className="text-lg font-semibold">{selectedDoor.id}</h2>
                </div>
                <p className="mt-1 text-sm text-cyan-300">{selectedDoor.type}</p>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                {/* Schedule data */}
                <div className="space-y-3">
                  <Field label="Schedule status" value={selectedDoor.status} />
                  <Field label="Materials" value={selectedDoor.materials} />
                </div>

                {/* Review status */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Review status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["red", "amber", "green"] as const).map((s) => {
                      const active = selectedDoor.reviewStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s)}
                          disabled={updateStatus.isPending}
                          className={`flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                            active
                              ? `border-transparent text-white ring-2 ${STATUS_META[s].ring} ${STATUS_META[s].dot}`
                              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
                          {STATUS_META[s].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Photo */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Site photo</p>
                  {selectedDoor.hasPhoto ? (
                    <img
                      src={`/api/demo-files/${scheduleFile?.id}/doors/${selectedDoor.id}/photo?v=${photoVersion}`}
                      alt={`${selectedDoor.id} site photo`}
                      className="mb-2 max-h-48 w-full rounded-md border border-white/10 object-contain bg-black/40"
                    />
                  ) : (
                    <div className="mb-2 flex h-28 items-center justify-center rounded-md border border-dashed border-white/15 text-xs text-slate-500">
                      No photo attached
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onPhotoSelected(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full border-white/15 bg-white/5 hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading…" : selectedDoor.hasPhoto ? "Replace photo" : "Attach photo"}
                  </Button>
                  {uploadError ? <p className="mt-2 text-xs text-red-400">{uploadError}</p> : null}
                </div>
              </div>

              <div className="border-t border-white/10 px-5 py-3">
                <p className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Changes are saved to the database — they survive a refresh.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="mb-3 text-3xl">📍</div>
              <p className="text-sm font-medium text-slate-300">Select a door on the plan</p>
              <p className="mt-1 text-xs text-slate-500">
                Click any pin to view its schedule data, set a red/amber/green status, and attach a site photo.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-100">{value || "—"}</p>
    </div>
  );
}
