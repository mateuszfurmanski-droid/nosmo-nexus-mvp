import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFiles,
  useListDoors,
  useUpdateDoorStatus,
  getListDoorsQueryKey,
  type Door,
  type DoorReviewStatus,
} from "@workspace/api-client-react";
import {
  Flame,
  Wrench,
  Lock,
  Eye,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ArrowRight,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

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

function statusLabel(status: DoorReviewStatus): string {
  if (status === "green") return "Done";
  if (status === "red") return "Issue";
  if (status === "amber") return "In progress";
  return "Not started";
}

// ── Task catalog ────────────────────────────────────────────────────────────
// There is no "task type" field on a door — the work requirement lives in the
// free text of the schedule (type / status / materials). We derive task
// membership client-side via keyword matchers. The catalog is deliberately
// explicit and deterministic (no AI inference) for a predictable demo.
interface TaskDef {
  id: string;
  label: string;
  action: string;
  icon: LucideIcon;
  match: RegExp;
}

const TASK_CATALOG: TaskDef[] = [
  {
    id: "fire-keep-shut",
    label: "Fire door keep shut",
    icon: Flame,
    action:
      "Verify fire-door compliance: confirm the self-closing device pulls the door fully shut onto the frame and that the “Fire door — keep shut” signage is fitted.",
    match: /\bfd\d+\b|\bfire\b|intumescent/i,
  },
  {
    id: "closer",
    label: "Install / adjust closer",
    icon: Wrench,
    action:
      "Fit or adjust the overhead door closer. Check the controlled closing speed and that the latch fully engages.",
    match: /closer/i,
  },
  {
    id: "locked",
    label: "Locked / access control",
    icon: Lock,
    action: "Confirm the lock or access-control hardware is fitted and operating correctly.",
    match: /lock|access control/i,
  },
  {
    id: "vision-panel",
    label: "Vision panel",
    icon: Eye,
    action: "Check the vision-panel glazing and beading are fitted, sealed and undamaged.",
    match: /vision panel/i,
  },
  {
    id: "panic",
    label: "Panic / exit hardware",
    icon: ShieldAlert,
    action: "Test the push-bar panic hardware and confirm the escape route is clear and signed.",
    match: /push bar|panic|fire exit/i,
  },
  {
    id: "ironmongery",
    label: "Ironmongery",
    icon: KeyRound,
    action: "Install handles and ironmongery; confirm smooth operation and correct alignment.",
    match: /ironmonger|handle|brass/i,
  },
];

function doorText(d: Door): string {
  return `${d.type} ${d.status} ${d.materials}`;
}

function getDoorTaskIds(d: Door): string[] {
  const text = doorText(d);
  return TASK_CATALOG.filter((t) => t.match.test(text)).map((t) => t.id);
}

export default function PlanReview() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [actedDoorId, setActedDoorId] = useState<string | null>(null);
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

  // Task chips: only show tasks that match at least one door, with done/total.
  const taskChips = useMemo(() => {
    const list = doors ?? [];
    return TASK_CATALOG.map((def) => {
      const ds = list.filter((d) => getDoorTaskIds(d).includes(def.id));
      return { def, total: ds.length, done: ds.filter((d) => d.reviewStatus === "green").length };
    }).filter((c) => c.total > 0);
  }, [doors]);

  const activeTask = TASK_CATALOG.find((t) => t.id === activeTaskId) ?? null;

  // Ids of doors that match the active task (null when no task selected).
  const matchingIds = useMemo(() => {
    if (!activeTask || !doors) return null;
    return new Set(doors.filter((d) => getDoorTaskIds(d).includes(activeTask.id)).map((d) => d.id));
  }, [activeTask, doors]);

  const activeTaskDoors = useMemo(
    () => (activeTask && doors ? doors.filter((d) => getDoorTaskIds(d).includes(activeTask.id)) : []),
    [activeTask, doors],
  );
  const activeDone = activeTaskDoors.filter((d) => d.reviewStatus === "green").length;
  const activeIssues = activeTaskDoors.filter((d) => d.reviewStatus === "red").length;
  const allTaskDone = activeTaskDoors.length > 0 && activeTaskDoors.every((d) => d.reviewStatus === "green");

  // Select a door for the popover and clear any stale upload error from a prior door.
  function openDoor(id: string | null) {
    setSelectedId(id);
    setUploadError(null);
  }

  function selectTask(id: string | null) {
    setActiveTaskId(id);
    setSelectedId(null);
    setActedDoorId(null);
    setUploadError(null);
  }

  function setStatus(doorId: string, status: "red" | "amber" | "green") {
    if (!scheduleFile) return;
    updateStatus.mutate({ id: scheduleFile.id, doorId, data: { reviewStatus: status } });
  }

  // A task action (done / issue) — records that this door was acted on so the
  // "next nearest" suggestion only appears after the user has acted.
  function taskAction(doorId: string, status: "red" | "green") {
    setActedDoorId(doorId);
    setStatus(doorId, status);
  }

  // Nearest incomplete door that shares the active task, excluding the current one.
  function nextDoorFrom(from: Door): { door: Door | null; remaining: number } {
    if (!activeTask) return { door: null, remaining: 0 };
    const candidates = (doors ?? []).filter(
      (d) => d.id !== from.id && getDoorTaskIds(d).includes(activeTask.id) && d.reviewStatus !== "green",
    );
    if (candidates.length === 0) return { door: null, remaining: 0 };
    const origin = pinPos(from);
    const sorted = [...candidates].sort((a, b) => {
      const pa = pinPos(a);
      const pb = pinPos(b);
      const da = (pa.x - origin.x) ** 2 + (pa.y - origin.y) ** 2;
      const db = (pb.x - origin.x) ** 2 + (pb.y - origin.y) ** 2;
      if (da !== db) return da - db;
      return a.id.localeCompare(b.id);
    });
    return { door: sorted[0], remaining: candidates.length };
  }

  function jumpToFirstIssue() {
    const issue = activeTaskDoors.find((d) => d.reviewStatus === "red");
    if (issue) openDoor(issue.id);
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

  const chipClass = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
    }`;

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

      {/* Task filter toolbar */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#0b0f16] px-6 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <ListChecks className="h-3.5 w-3.5" /> Task
        </span>
        <button type="button" onClick={() => selectTask(null)} className={chipClass(!activeTaskId)}>
          All doors
        </button>
        {taskChips.map((c) => {
          const Icon = c.def.icon;
          const active = activeTaskId === c.def.id;
          return (
            <button key={c.def.id} type="button" onClick={() => selectTask(c.def.id)} className={chipClass(active)}>
              <Icon className="h-3.5 w-3.5" />
              {c.def.label}
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-cyan-400/20 text-cyan-100" : "bg-white/10 text-slate-400"
                }`}
              >
                {c.done}/{c.total}
              </span>
            </button>
          );
        })}
      </div>

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
                const canOpen = !activeTask || (matchingIds?.has(d.id) ?? false);
                const faded = !!activeTask && !canOpen;
                const { door: next, remaining } = canOpen && activeTask ? nextDoorFrom(d) : { door: null, remaining: 0 };
                return (
                  <Popover
                    key={d.id}
                    open={selected && canOpen}
                    onOpenChange={(o) => openDoor(o ? d.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!canOpen}
                        data-door-id={d.id}
                        style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg transition-all ${pinColor(
                          d.reviewStatus,
                        )} ${faded ? "opacity-15" : "hover:scale-110"} ${
                          !!activeTask && canOpen ? "ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-[#0a0d13]" : ""
                        } ${selected ? "scale-110 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0d13]" : ""}`}
                        title={`${d.id} — ${d.type}`}
                      >
                        {d.id}
                        {d.hasPhoto ? <span className="ml-1">📷</span> : null}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="center"
                      className="w-80 border-white/10 bg-[#0d111a] p-0 text-slate-100"
                    >
                      <div className="space-y-4 p-4">
                        {/* Header */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${pinColor(d.reviewStatus)}`} />
                            <span className="text-base font-semibold">{d.id}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
                              {statusLabel(d.reviewStatus)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-cyan-300">{d.type}</p>
                        </div>

                        {activeTask && canOpen ? (
                          <>
                            {/* Required action */}
                            <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                                <activeTask.icon className="h-3.5 w-3.5" /> {activeTask.label}
                              </div>
                              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{activeTask.action}</p>
                            </div>

                            <p className="text-xs text-slate-400">
                              <span className="text-slate-500">Schedule:</span> {d.status} · {d.materials}
                            </p>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => taskAction(d.id, "green")}
                                disabled={updateStatus.isPending}
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                              >
                                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark done
                              </Button>
                              <Button
                                onClick={() => taskAction(d.id, "red")}
                                disabled={updateStatus.isPending}
                                variant="outline"
                                className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                              >
                                <AlertTriangle className="mr-1.5 h-4 w-4" /> Report issue
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full border-white/15 bg-white/5 hover:bg-white/10"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              <Camera className="mr-1.5 h-4 w-4" />
                              {uploading ? "Uploading…" : d.hasPhoto ? "Replace photo" : "Add photo"}
                            </Button>
                            {d.reviewStatus === "red" ? (
                              <p className="text-[11px] text-slate-500">
                                Issue flagged as red. Notes aren’t stored in this preview.
                              </p>
                            ) : null}
                            {uploadError ? <p className="text-xs text-red-400">{uploadError}</p> : null}

                            {d.hasPhoto ? (
                              <img
                                src={`/api/demo-files/${scheduleFile?.id}/doors/${d.id}/photo?v=${photoVersion}`}
                                alt={`${d.id} site photo`}
                                className="max-h-40 w-full rounded-md border border-white/10 bg-black/40 object-contain"
                              />
                            ) : null}

                            {/* Next suggestion — shown only after the user acts on this door */}
                            {actedDoorId === d.id ? (
                              <div className="border-t border-white/10 pt-3">
                                {next ? (
                                  <button
                                    type="button"
                                    onClick={() => openDoor(next.id)}
                                    className="flex w-full items-center justify-between rounded-md bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10"
                                  >
                                    <span className="text-xs">
                                      <span className="text-slate-400">Next nearest: </span>
                                      <span className="font-semibold text-cyan-300">{next.id}</span>
                                      <span className="text-slate-500"> · {remaining} left</span>
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-cyan-300" />
                                  </button>
                                ) : allTaskDone ? (
                                  <p className="text-center text-xs text-emerald-300">
                                    ✓ All “{activeTask.label}” doors complete
                                  </p>
                                ) : (
                                  <p className="text-center text-xs text-slate-400">No other matching doors remain</p>
                                )}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {/* Review mode (no task selected) */}
                            <div className="space-y-1 text-xs">
                              <p>
                                <span className="text-slate-500">Status:</span> {d.status}
                              </p>
                              <p>
                                <span className="text-slate-500">Materials:</span> {d.materials}
                              </p>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Review status
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {(["red", "amber", "green"] as const).map((s) => {
                                  const active = d.reviewStatus === s;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setStatus(d.id, s)}
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

                            <Button
                              variant="outline"
                              className="w-full border-white/15 bg-white/5 hover:bg-white/10"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              <Camera className="mr-1.5 h-4 w-4" />
                              {uploading ? "Uploading…" : d.hasPhoto ? "Replace photo" : "Add photo"}
                            </Button>
                            {uploadError ? <p className="text-xs text-red-400">{uploadError}</p> : null}

                            {d.hasPhoto ? (
                              <img
                                src={`/api/demo-files/${scheduleFile?.id}/doors/${d.id}/photo?v=${photoVersion}`}
                                alt={`${d.id} site photo`}
                                className="max-h-40 w-full rounded-md border border-white/10 bg-black/40 object-contain"
                              />
                            ) : null}
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}

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
            </div>
          ) : (
            <div className="text-sm text-slate-500">Loading plan…</div>
          )}
        </div>

        {/* Side panel — task context */}
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-white/10 bg-[#0d111a]">
          {activeTask ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  <activeTask.icon className="h-4 w-4 text-cyan-300" />
                  <h2 className="text-base font-semibold">{activeTask.label}</h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{activeTask.action}</p>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                {/* Progress */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium uppercase tracking-wide text-slate-400">Progress</span>
                    <span className="text-slate-300">
                      {activeDone}/{activeTaskDoors.length} done
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${activeTaskDoors.length ? (activeDone / activeTaskDoors.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Issues */}
                {activeIssues > 0 ? (
                  <button
                    type="button"
                    onClick={jumpToFirstIssue}
                    className="flex w-full items-center justify-between rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-left transition-colors hover:bg-red-500/20"
                  >
                    <span className="flex items-center gap-2 text-xs text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      {activeIssues} issue{activeIssues > 1 ? "s" : ""} flagged
                    </span>
                    <span className="text-[11px] text-red-300/80">Review →</span>
                  </button>
                ) : (
                  <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-400">
                    No issues flagged for this task.
                  </p>
                )}

                <p className="text-xs leading-relaxed text-slate-500">
                  Highlighted pins on the plan need this task. Click one to record the action, then jump to the
                  next-nearest door — no lists or searching.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col px-5 py-6">
              <h2 className="text-base font-semibold">Plan review</h2>
              <p className="mt-1 text-xs text-slate-400">Pick a task above to work straight from the plan.</p>

              <div className="mt-6 space-y-2">
                {(["green", "amber", "red"] as const).map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
                      {s === "green" ? "Done" : s === "amber" ? "In progress" : "Issues"}
                    </span>
                    <span className="text-lg font-semibold">{counts[s]}</span>
                  </div>
                ))}
              </div>

              <p className="mt-auto text-xs leading-relaxed text-slate-500">
                Or click any pin to review its schedule data and set a red/amber/green status.
              </p>
            </div>
          )}

          <div className="border-t border-white/10 px-5 py-3">
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Changes are saved to the database — they survive a refresh.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
