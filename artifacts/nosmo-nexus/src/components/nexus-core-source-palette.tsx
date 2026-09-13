import {
  AppWindow,
  CheckSquare,
  ClipboardCheck,
  FileCheck2,
  FileText,
  PackageOpen,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { nexusCoreRequest } from "@/lib/nexus-core-staging-session";
import type { WorkspaceNode } from "./workspace-data";

type SourceKind = "task" | "app" | "document" | "evidence" | "checklist" | "approval" | "object";
type DragKind = SourceKind | "work-package";

type PaletteSource = {
  kind: SourceKind;
  label: string;
  Icon: typeof CheckSquare;
};

type PackageItem = {
  id: string;
  kind: SourceKind;
  label: string;
};

type DragPayload = {
  kind: DragKind;
  label: string;
  packageItems?: PackageItem[];
  canonicalId?: string;
  expectedPackageRevision?: number;
};

type DropResolution = {
  allowed: boolean;
  intent: string;
};

const SOURCES: PaletteSource[] = [
  { kind: "task", label: "Task", Icon: CheckSquare },
  { kind: "app", label: "App", Icon: AppWindow },
  { kind: "document", label: "Document", Icon: FileText },
  { kind: "evidence", label: "Evidence", Icon: FileCheck2 },
  { kind: "checklist", label: "Checklist", Icon: ClipboardCheck },
  { kind: "approval", label: "Approval", Icon: ShieldCheck },
  { kind: "object", label: "Object", Icon: PackageOpen },
];

function resolveDrop(source: DragKind, target: WorkspaceNode): DropResolution {
  const allowed = source === 'work-package' ? ['person','issue'].includes(target.type)
    : ['task','app'].includes(source) ? target.type === 'person'
    : source === 'document' && target.type === 'task';
  return { allowed, intent: allowed ? 'validate-canonical-intent' : 'unsupported-target' };
}

export function NexusCoreSourcePalette({
  nodes,
  projectId,
  worldId,
  embedded = false,
}: {
  nodes: WorkspaceNode[];
  projectId: string;
  worldId: string;
  embedded?: boolean;
}) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [targetId, setTargetId] = useState<string | null>(null);
  const [overPackage, setOverPackage] = useState(false);
  const [message, setMessage] = useState("Compose a Work Package, then drop it on a compatible graph object.");
  const canonical = useRef<any>(null);
  const busy = useRef(false);
  const scope = { projectId, worldId };
  const stripAuthority = (item: any) => { const { targetCapabilityRequirements, ...business } = item; return business; };
  const adopt = (p: any) => {
    canonical.current = p;
    setPackageItems(p.items.map((i: any) => ({ id: i.itemId, kind: i.kind === 'EVIDENCE_REQUIREMENT' ? 'evidence' : i.kind.toLowerCase(), label: i.title })));
    setMessage(`${p.title} · revision ${p.revision} · ${p.assignmentState}`);
  };
  const save = async (changes: any) => {
    if (busy.current) throw new Error('Wait for the current save.');
    busy.current = true;
    try {
      const p = canonical.current;
      const value = await nexusCoreRequest(p ? `work-packages/${encodeURIComponent(p.packageId)}` : 'work-packages',
        { ...scope, requestId: crypto.randomUUID(), ...(p ? { expectedRevision: p.revision } : { title: 'Work Package', items: [] }), ...changes }, p ? 'PATCH' : 'POST');
      adopt(value.workPackage);
      window.dispatchEvent(new CustomEvent('nexus:core-package-saved', { detail: value.workPackage }));
    } finally { busy.current = false; }
  };
  const change = (operation: () => Promise<void>) => void operation().catch(e => setMessage(e instanceof Error ? e.message : 'Save could not be confirmed. Refresh before retry.'));
  const choose = (type: WorkspaceNode['type'], label: string) => {
    const choices = nodes.filter(n => n.type === type);
    const selected = window.prompt(`${label}: enter the ID.\n${choices.map(n => `${n.id} — ${n.label}`).join('\n')}`);
    if (!selected) return undefined;
    if (!choices.some(n => n.id === selected.trim())) throw new Error('Select an existing project record.');
    return selected.trim();
  };
  const addSource = async (kind: SourceKind, label: string) => {
    const p = canonical.current, itemId = crypto.randomUUID();
    const title = window.prompt(`${label} title`, label); if (!title?.trim()) return;
    const item: any = { itemId, kind: kind.toUpperCase(), title: title.trim(), order: p?.items.length ?? 0 };
    const changes: any = {};
    if (kind === 'approval') throw new Error('Human approval follows Finish; it is not a package item.');
    if (kind === 'object') {
      const objectId = choose('issue', 'Object / location'); if (!objectId) return;
      await save({ objectContextIds: [...new Set([...(p?.objectContextIds ?? []), objectId])], locationContextIds: [...new Set([...(p?.locationContextIds ?? []), objectId])] }); return;
    }
    if (kind === 'app') { item.appId = window.prompt('Enabled App ID'); if (!item.appId) return; }
    if (kind === 'document') { item.documentId = choose('document','Document'); if (!item.documentId) return; }
    if (kind === 'checklist') {
      const titles = window.prompt('Checklist entries, separated by semicolons'); if (!titles?.trim()) return;
      item.checklistId = `checklist:${itemId}`;
      changes.checklistDefinitions = [...(p?.checklistDefinitions ?? []), { checklistId: item.checklistId, revision: 1, title: item.title,
        items: titles.split(';').filter(v=>v.trim()).map((v,n)=>({ itemId: `check:${itemId}:${n}`, order:n, title:v.trim(), required:true, expectedResponseType:'BOOLEAN' })) }];
    }
    if (kind === 'evidence') {
      const type = window.prompt('Evidence type: inspection-answer, photo, video, document, signature, external-reference','inspection-answer'); if (!type) return;
      item.kind='EVIDENCE_REQUIREMENT'; item.evidenceRequirementId=`requirement:${itemId}`;
      changes.evidenceRequirements=[...(p?.evidenceRequirements ?? []), { requirementId:item.evidenceRequirementId, allowedEvidenceType:type, description:item.title, requiredCount:1, requiredBeforeFinish:true }];
    }
    await save({ ...changes, items: [...(p?.items ?? []).map(stripAuthority),item] });
  };
  const removeItem = async (itemId?: string) => {
    const p=canonical.current;if(!p)return;
    const kept=itemId?p.items.filter((i:any)=>i.itemId!==itemId):[];
    await save({ items:kept.map(stripAuthority),checklistDefinitions:p.checklistDefinitions.filter((d:any)=>kept.some((i:any)=>i.checklistId===d.checklistId)),
      evidenceRequirements:p.evidenceRequirements.filter((r:any)=>kept.some((i:any)=>i.evidenceRequirementId===r.requirementId)) });
  };
  const editContext = async () => {
    let p=canonical.current;
    if (!p) {
      const existingId=window.prompt('Existing Work Package ID (empty creates a new package)','');
      if(existingId===null)return;
      if(existingId.trim()){const found=await nexusCoreRequest(`work-packages/${encodeURIComponent(existingId.trim())}?${new URLSearchParams(scope)}`);adopt(found.workPackage);return;}
    }
    const title=window.prompt('Work Package title',p?.title??'Work Package');if(!title)return;
    const deadline=window.prompt('Deadline (ISO date/time); empty clears it',p?.deadline??'');if(deadline===null)return;
    const objectId=choose('issue','Optional Object / Location (Cancel keeps current)');
    await save({title,deadline:deadline||null,...(objectId?{objectContextIds:[objectId],locationContextIds:[objectId]}:{})});
  };
  const editItem = async (itemId:string) => {
    const p=canonical.current,item=p.items.find((i:any)=>i.itemId===itemId);
    const title=window.prompt('Item title',item.title);if(!title)return;
    const order=Number(window.prompt('Position (0 is first)',String(item.order)));if(!Number.isInteger(order)||order<0)return;
    const groupTitle=window.prompt('Group title (empty: no group)',p.groups.find((g:any)=>g.groupId===item.groupId)?.title??'');if(groupTitle===null)return;
    const group=groupTitle.trim() ? p.groups.find((g:any)=>g.title===groupTitle.trim())??{groupId:crypto.randomUUID(),order:p.groups.length,title:groupTitle.trim()}:undefined;
    const ordered=[...p.items].sort((a:any,b:any)=>a.order-b.order).filter((i:any)=>i.itemId!==itemId);
    ordered.splice(Math.min(order,ordered.length),0,{...item,title,groupId:group?.groupId});
    await save({groups:group&&!p.groups.some((g:any)=>g.groupId===group.groupId)?[...p.groups,group]:p.groups,items:ordered.map((i:any,n:number)=>({...stripAuthority(i),order:n}))});
  };
  useEffect(() => {
    const restore = (event: Event) => {
      const packages = (event as CustomEvent).detail?.snapshot?.workPackages ?? [];
      const current = canonical.current;
      const candidate = current ? packages.find((p:any)=>p.packageId===current.packageId) : packages.length === 1 ? packages[0] : undefined;
      if (candidate && !busy.current) adopt(candidate);
    };
    const clear = () => { canonical.current=null;setPackageItems([]); };
    window.addEventListener('nexus:core-authoritative-projection',restore);
    window.addEventListener('nexus:core-staging-session-change',clear);
    return()=>{window.removeEventListener('nexus:core-authoritative-projection',restore);window.removeEventListener('nexus:core-staging-session-change',clear);};
  }, []);
  const dragRef = useRef<DragPayload | null>(null);
  const targetRef = useRef<string | null>(null);
  const overPackageRef = useRef(false);

  dragRef.current = drag;
  targetRef.current = targetId;
  overPackageRef.current = overPackage;

  const clearTargetDecorations = () => {
    document.querySelectorAll<HTMLElement>("[data-nexus-drop-state]").forEach((element) => {
      delete element.dataset.nexusDropState;
    });
  };

  const inspectPointer = (x: number, y: number, payload = dragRef.current) => {
    if (!payload) return;
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const packageZone = element?.closest<HTMLElement>("[data-nexus-package-zone]");
    const isPackageZone = Boolean(packageZone && payload.kind !== "work-package");
    setOverPackage(isPackageZone);
    overPackageRef.current = isPackageZone;

    clearTargetDecorations();
    if (isPackageZone) {
      setTargetId(null);
      targetRef.current = null;
      return;
    }

    const targetElement = element?.closest<HTMLElement>("[data-node-id]");
    const nextTargetId = targetElement?.dataset.nodeId ?? null;
    const target = nextTargetId ? byId.get(nextTargetId) : undefined;
    if (!targetElement || !target) {
      setTargetId(null);
      targetRef.current = null;
      return;
    }

    const resolution = resolveDrop(payload.kind, target);
    targetElement.dataset.nexusDropState = resolution.allowed ? "compatible" : "blocked";
    setTargetId(nextTargetId);
    targetRef.current = nextTargetId;
  };

  const finishDrag = () => {
    const payload = dragRef.current;
    const activeTargetId = targetRef.current;
    const droppedInPackage = overPackageRef.current;

    clearTargetDecorations();
    setDrag(null);
    dragRef.current = null;
    setTargetId(null);
    targetRef.current = null;
    setOverPackage(false);
    overPackageRef.current = false;

    if (!payload) return;

    if (droppedInPackage && payload.kind !== "work-package") {
      change(() => addSource(payload.kind as SourceKind, payload.label));
      return;
    }

    const target = activeTargetId ? byId.get(activeTargetId) : undefined;
    if (!target) {
      setMessage("Drop cancelled — no compatible target selected.");
      return;
    }

    const resolution = resolveDrop(payload.kind, target);
    if (!resolution.allowed) {
      setMessage(`Blocked: ${payload.label} cannot be dropped on ${target.label}. No relationship was created.`);
      return;
    }

    if (!payload.canonicalId) { setMessage('Select a persisted source first.'); return; }
    const detail = {
      schema: 'nexus-semantic-drop-request/v1', ...scope,
      source: { type: payload.kind === 'work-package' ? 'WORK_PACKAGE' : payload.kind.toUpperCase(), id: payload.canonicalId },
      target: { type: target.type === 'person' ? 'PERSON' : target.type === 'task' ? 'TASK' : 'OBJECT', id: target.id },
      expectedPackageRevision: payload.expectedPackageRevision,
    };

    window.dispatchEvent(new CustomEvent("nexus:semantic-drop-request", { detail }));
    setMessage(`SAVING · ${payload.label} → ${target.label} · waiting for Nexus Core authority…`);
  };

  useEffect(() => {
    const onAuthoritativeResult = (event: Event) => {
      const detail = (event as CustomEvent<{
        ok?: boolean;
        response?: {
          assignment?: {
            taskId?: string;
            assignedPersonId?: string;
          };
          message?: string;
          error?: string;
        };
      }>).detail;

      if (!detail) return;
      if (!detail.ok) {
        const failure = detail.response?.message || detail.response?.error || "Core rejected the assignment.";
        setMessage(`BLOCKED · ${failure}`);
        return;
      }

      const taskId = detail.response?.assignment?.taskId;
      const assignedPersonId = detail.response?.assignment?.assignedPersonId;
      const recipient = assignedPersonId ? byId.get(assignedPersonId)?.label ?? assignedPersonId : "recipient";
      setMessage(taskId
        ? `ASSIGNED · ${taskId} → ${recipient} · authoritative recipient projection updated.`
        : "COMMITTED · Nexus Core confirmed the semantic drop.");
    };

    window.addEventListener("nexus:semantic-drop-authoritative-result", onAuthoritativeResult as EventListener);
    return () => window.removeEventListener("nexus:semantic-drop-authoritative-result", onAuthoritativeResult as EventListener);
  }, [byId]);

  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      setPointer({ x: event.clientX, y: event.clientY });
      inspectPointer(event.clientX, event.clientY);
    };
    const up = () => finishDrag();
    const cancel = () => {
      clearTargetDecorations();
      setDrag(null);
      dragRef.current = null;
      setTargetId(null);
      targetRef.current = null;
      setOverPackage(false);
      overPackageRef.current = false;
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, byId]);

  const beginDrag = (event: ReactPointerEvent, payload: DragPayload) => {
    event.preventDefault();
    event.stopPropagation();
    setPointer({ x: event.clientX, y: event.clientY });
    setDrag(payload);
    dragRef.current = payload;
    inspectPointer(event.clientX, event.clientY, payload);
  };

  const activeTarget = targetId ? byId.get(targetId) : undefined;
  const activeResolution = drag && activeTarget ? resolveDrop(drag.kind, activeTarget) : null;

  return (
    <>
      <style>{`
        [data-nexus-drop-state="compatible"] {
          outline: 3px solid rgba(52, 211, 153, .95) !important;
          outline-offset: 5px !important;
          box-shadow: 0 0 0 8px rgba(52, 211, 153, .18), 0 0 34px rgba(52, 211, 153, .55) !important;
        }
        [data-nexus-drop-state="blocked"] {
          outline: 3px solid rgba(248, 113, 113, .92) !important;
          outline-offset: 5px !important;
          box-shadow: 0 0 0 8px rgba(248, 113, 113, .14) !important;
        }
      `}</style>

      <section
        data-control
        className={`${embedded ? "relative w-full" : "pointer-events-auto fixed bottom-[92px] left-1/2 z-[110] w-[min(720px,calc(100vw-20px))] -translate-x-1/2"} rounded-2xl border border-cyan-300/25 bg-slate-950/92 p-2.5 text-slate-100 shadow-2xl backdrop-blur-xl`}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <button type="button" onClick={() => change(editContext)} className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">Manager Work Package · edit title / deadline / context</button>
            <div className="truncate text-[9px] text-slate-400">{message}</div>
          </div>
          {packageItems.length > 0 && (
            <button type="button" onClick={() => change(() => removeItem())} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Clear Work Package">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div
          data-nexus-package-zone
          className={`flex min-h-16 items-center gap-2 overflow-x-auto rounded-xl border border-dashed px-2 py-2 transition ${overPackage ? "border-emerald-300 bg-emerald-400/10" : "border-cyan-300/25 bg-slate-900/70"}`}
        >
          <button
            type="button"
            disabled={packageItems.length === 0 || busy.current}
            onPointerDown={(event) => beginDrag(event, { kind: "work-package", label: "Work Package", packageItems, canonicalId: canonical.current?.packageId, expectedPackageRevision: canonical.current?.revision })}
            className="flex h-12 min-w-[112px] items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-[.08em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
            title="Drag to assign. Edit package title for deadline and context."
            onDoubleClick={() => change(editContext)}
          >
            <PackageOpen className="h-4 w-4" /> Work Package
          </button>

          {packageItems.length === 0 ? (
            <span className="px-2 text-[10px] text-slate-500">Drag source tiles here first.</span>
          ) : packageItems.map((item) => (
            <span key={item.id} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-[10px] font-semibold">
              <button type="button" title="Edit title, order and group" onClick={() => change(() => editItem(item.id))}>{item.label}</button>
              <button
                type="button"
                onClick={() => change(() => removeItem(item.id))}
                className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
                aria-label={`Remove ${item.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <nav
        data-control
        aria-label="Nexus bottom source palette"
        className={`${embedded ? "relative h-auto w-full" : "pointer-events-auto fixed inset-x-0 bottom-0 z-[120] h-[84px]"} border-t border-cyan-300/20 bg-slate-950/96 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_32px_rgba(0,0,0,.36)] backdrop-blur-xl`}
      >
        <div className="mx-auto flex h-full max-w-4xl items-start gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SOURCES.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              type="button"
              onPointerDown={(event) => {
                const p=canonical.current;
                const item=p?.items.find((i:any)=>i.kind===kind.toUpperCase());
                beginDrag(event,{kind,label,canonicalId:item?.taskId??item?.appId??item?.documentId});
              }}
              className="flex h-[62px] min-w-[72px] touch-none flex-col items-center justify-center gap-1 rounded-xl border border-cyan-700/45 bg-gradient-to-b from-[#0b3655] to-[#061827] px-2 text-cyan-100 shadow-lg active:scale-[.97]"
            >
              <Icon className="h-5 w-5 text-cyan-300" />
              <span className="text-[9px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {drag && (
        <div
          className={`pointer-events-none fixed z-[3000] -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] shadow-2xl backdrop-blur ${
            overPackage || activeResolution?.allowed
              ? "border-emerald-300 bg-emerald-950/90 text-emerald-100"
              : activeTarget
                ? "border-red-300 bg-red-950/90 text-red-100"
                : "border-cyan-300 bg-slate-950/90 text-cyan-100"
          }`}
          style={{ left: pointer.x, top: pointer.y }}
        >
          {drag.label}
          {overPackage ? " → add to package" : activeTarget ? ` → ${activeTarget.label}` : ""}
        </div>
      )}
    </>
  );
}
