import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckSquare, FileText, FolderKanban, UserRound } from 'lucide-react';
import InteractiveWorkspace from '@/components/interactive-workspace';
import { NexusCoreApprovalPanel } from '@/components/nexus-core-approval-panel';
import { NexusCoreSemanticDropAdapter } from '@/components/nexus-core-semantic-drop-adapter';
import { NexusCoreSourcePalette } from '@/components/nexus-core-source-palette';
import { NexusCoreStagingManagerLogin } from '@/components/nexus-core-staging-manager-login';
import { NexusFloatingWindow } from '@/components/nexus-floating-window';
import type { WorkspaceNode, TaskStatus } from '@/components/workspace-data';
import { readNexusCoreStagingSession } from '@/lib/nexus-core-staging-session';
const projectId='project-esafe-catania',worldId='world-esafe-catania';
type RecordData=Record<string,any>;
export default function EsafeCoreWorkspace() {
  const [projection,setProjection]=useState<RecordData>({snapshot:{}});
  useEffect(()=>{
    const update=(e:Event)=>setProjection((e as CustomEvent).detail);
    const clear=()=>setProjection({snapshot:{}});
    window.addEventListener('nexus:core-authoritative-projection',update);
    window.addEventListener('nexus:core-staging-session-change',clear);
    return()=>{window.removeEventListener('nexus:core-authoritative-projection',update);window.removeEventListener('nexus:core-staging-session-change',clear);};
  },[]);
  const s=projection.snapshot??{};
  const nodes=useMemo(()=>{
    const result:WorkspaceNode[]=[{id:projectId,label:'e-SAFE Catania',sublabel:'Project',type:'project',Icon:FolderKanban}];
    for(const p of s.people??[])result.push({id:p.id,label:p.displayName,sublabel:p.status,type:'person',Icon:UserRound});
    for(const t of s.tasks??[])result.push({id:t.id,label:t.title,sublabel:t.taskStatus,type:'task',Icon:CheckSquare});
    for(const o of s.objects??[])result.push({id:o.id,label:o.title,sublabel:o.objectType,type:'issue',Icon:Building2});
    for(const f of s.files??[])result.push({id:f.id,label:f.title,sublabel:'Document',type:'document',Icon:FileText});
    return result;
  },[s]);
  const adjacency=useMemo(()=>{
    const sets=new Map<string,Set<string>>(nodes.map(n=>[n.id,new Set()]));
    const link=(a:string,b:string)=>{if(sets.has(a)&&sets.has(b)&&a!==b){sets.get(a)!.add(b);sets.get(b)!.add(a);}};
    for(const n of nodes)link(projectId,n.id);
    for(const t of s.tasks??[])for(const p of [...(t.assignedPersonIds??[]),...(t.relatedFileIds??[])])link(t.id,p);
    for(const e of s.relationshipEdges??[])link(e.sourceObjectId,e.targetObjectId);
    return Object.fromEntries([...sets].map(([id,neighbors])=>[id,[...neighbors]]));
  },[nodes,s]);
  const taskLinks=Object.fromEntries((s.tasks??[]).map((t:RecordData)=>[t.id,{people:t.assignedPersonIds??[],docs:t.relatedFileIds??[]} ]));
  const statuses:Record<string,TaskStatus>=Object.fromEntries((s.tasks??[]).map((t:RecordData)=>[t.id,t.taskStatus==='done'?'done':t.taskStatus==='in-progress'?'in-progress':'todo']));
  const width=window.innerWidth,height=window.innerHeight;
  return <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
    <InteractiveWorkspace nodes={nodes} projectId={projectId} managerId={readNexusCoreStagingSession()?.personId??''} adjacency={adjacency} taskLinks={taskLinks} authoritativeTaskStatuses={statuses} headerTitle="e-SAFE Catania · Nexus Relationship Tree" />
    <NexusFloatingWindow id="manager-login" title="Manager identity" defaultPosition={{x:12,y:54}} widthClass="w-[min(380px,calc(100vw-16px))]"><NexusCoreStagingManagerLogin embedded /></NexusFloatingWindow>
    <NexusFloatingWindow id="core-authority" title="Core authority" defaultPosition={{x:Math.max(12,width/2-260),y:54}} widthClass="w-[min(520px,calc(100vw-16px))]" defaultMinimized><NexusCoreSemanticDropAdapter embedded /></NexusFloatingWindow>
    <NexusFloatingWindow id="approval" title="Human approval" defaultPosition={{x:Math.max(12,width-380),y:54}} widthClass="w-[min(360px,calc(100vw-16px))]" defaultMinimized><NexusCoreApprovalPanel embedded /></NexusFloatingWindow>
    <NexusFloatingWindow id="work-package" title="Work Package" defaultPosition={{x:12,y:Math.max(120,height-320)}} widthClass="w-[min(720px,calc(100vw-16px))]" heightClass="max-h-[58dvh]"><NexusCoreSourcePalette embedded nodes={nodes} projectId={projectId} worldId={worldId}/></NexusFloatingWindow>
    <NexusFloatingWindow id="timeline" title="Project Timeline" defaultPosition={{x:Math.max(12,width-700),y:Math.max(100,height-460)}} widthClass="w-[min(680px,calc(100vw-16px))]" heightClass="h-[min(62dvh,560px)]" defaultMinimized>
      <ol className="space-y-2 p-3 text-xs text-slate-100">{(s.timeline??[]).map((e:RecordData)=><li key={e.id}><time>{new Date(e.eventAt).toLocaleString()}</time> · {e.title??e.eventType}</li>)}</ol>
    </NexusFloatingWindow>
  </div>;
}
