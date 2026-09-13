/** Real HTTP + PostgreSQL; fixtures provision authority only, never the work cycle. */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { eq } from 'drizzle-orm';
import * as d from '@workspace/db';
import { NEXUS_AUTHORITY_ACTIONS as A, NEXUS_CANONICAL_ACTION_REGISTRY as registry } from '../../../src/core/permissions/canonicalAuthorityContract';
import { digestId } from '../src/lib/nexus-core-runtime-context';
const url = new URL(process.env.DATABASE_URL!);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && process.env.NEXUS_P0_E2E === '1', 'Disposable local database and explicit E2E flag required');
process.env.NEXUS_ENV = 'development';
process.env.NEXUS_P0_VALIDATION_SECRET = randomBytes(32).toString('hex');
process.env.LOG_LEVEL = 'silent';
const { default: app } = await import('../src/vercel-core-staging');
const { db, pool } = d;
const tag = randomBytes(6).toString('hex'), at = new Date(), iso = at.toISOString();
const projectId = 'project-esafe-catania', worldId = 'world-esafe-catania', scope = { projectId, worldId };
const manager = `p0-manager-${tag}`, worker = `p0-worker-${tag}`;
const tokens = new Map<string,string>();
const base = (id: string) => ({ id, status: 'active', title: id, createdAt: iso, updatedAt: iso, sourceSystem: 'nexus', confidence: 'confirmed', provenance: 'SYNTHETIC_HTTP_E2E' });
let workspaceId = 0, seq = 0;
const participation = (p: string) => `participation:${p}`;
let server: ReturnType<typeof app.listen>;
let origin = '';
async function call(person: string, path: string, body?: any, status: number | number[] = 200, method?: string) {
  const response = await fetch(`${origin}/api/nexus/core/${path}${body ? '' : `?${new URLSearchParams(scope)}`}`, {
    method: method ?? (body ? 'POST' : 'GET'), headers: { Authorization: `Bearer ${tokens.get(person) ?? 'invalid'}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify({ ...scope, ...body }) : undefined,
  });
  const result: any = await response.json();
  assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${method ?? (body ? 'POST' : 'GET')} ${path}: ${response.status} ${JSON.stringify(result)}`);
  return result;
}
function pass(name: string) { console.log(`P0_HTTP_PASS ${name}`); }
async function grant(p: string, actionKey: string, objectScopeId?: string, effect: 'allow' | 'deny' = 'allow') {
  const moduleId = actionKey.startsWith('authority.') ? 'authority' : actionKey.startsWith('doorflow.') ? 'doorflow' : 'worksuite';
  const grantId = `p0-grant-${tag}-${++seq}`, partId = participation(p);
  const recordJson = { ...base(grantId), participationId: partId, effect, moduleId, actionKey, ...(objectScopeId ? { objectScopeId } : {}) };
  await db.insert(d.nexusPmPermissionGrantsTable).values({ grantId, workspaceId, participationId: partId, effect, moduleId, actionKey, objectScopeId, recordJson, persistedAt: at });
  if (effect === 'allow') {
    const [part] = await db.select().from(d.nexusPmProjectParticipationsTable).where(eq(d.nexusPmProjectParticipationsTable.participationId, partId));
    await db.update(d.nexusPmProjectParticipationsTable).set({ recordJson: { ...part!.recordJson, permissionGrantIds: [...part!.recordJson.permissionGrantIds as string[], grantId] } }).where(eq(d.nexusPmProjectParticipationsTable.participationId, partId));
    const decisionId = `decision:${grantId}`;
    await db.insert(d.nexusPmAccessDecisionsTable).values({ decisionId, workspaceId, personId: p, participationId: partId, ...scope, moduleId, actionKey, objectScopeId, result: 'allowed', evaluatedAt: at, persistedAt: at,
      recordJson: { ...base(decisionId), personId: p, participationId: partId, ...scope, moduleId, actionKey, ...(objectScopeId ? { objectScopeId } : {}), result: 'allowed', evaluatedAt: iso, policyVersion: 'synthetic-p0-explicit-v1' } });
  }
  return grantId;
}
async function snapshotCounts() {
  const names = ['nexus_pm_tasks','nexus_pm_evidence','nexus_pm_approvals','nexus_pm_timeline_events','nexus_pm_nexus_events','nexus_wp_assignments','nexus_semantic_operation_receipts','nexus_pm_permission_grants'];
  const counts = [];
  for (const name of names) counts.push(Number((await pool.query(`select count(*) as n from ${name} where workspace_id=$1`,[workspaceId])).rows[0].n));
  return counts;
}
try {
  await db.insert(d.usersTable).values({ id: manager });
  const [ws] = await db.insert(d.workspacesTable).values({ ownerId: manager, name: 'Disposable synthetic P0' }).returning(); workspaceId = ws!.id;
  for (const p of [manager,worker]) {
    const subject = `synthetic-subject:${p}`, sid = randomBytes(32).toString('hex'); tokens.set(p,sid);
    await db.insert(d.nexusPmPeopleTable).values({ personId:p, displayName:p, personType:'natural-person', status:'active', recordJson:{...base(p),displayName:p,personType:'natural-person'},persistedAt:at });
    await db.insert(d.nexusIdentityBindingsTable).values({bindingId:`binding:${p}`,provider:'oidc:https://replit.com/oidc',providerSubjectDigest:createHash('sha256').update(subject).digest('hex'),personId:p,status:'ACTIVE',verifiedAt:at});
    await db.insert(d.sessionsTable).values({sid,expire:new Date(Date.now()+3600000),sess:{user:{id:subject,email:null,firstName:null,lastName:null,profileImageUrl:null},access_token:'SYNTHETIC_P0_HTTP_E2E',expires_at:Math.floor(Date.now()/1000)+3600}});
    await db.insert(d.nexusPmProjectParticipationsTable).values({participationId:participation(p),workspaceId,personId:p,...scope,participationStatus:'active',persistedAt:at,
      recordJson:{...base(participation(p)),personId:p,...scope,participationStatus:'active',permissionGrantIds:[],approvalScopeIds:[projectId],competenceRequirementIds:[],roleIds:[],tradeIds:[]}});
  }
  for (const moduleId of ['worksuite','authority','doorflow']) {
    const entitlementId = `entitlement:${tag}:${moduleId}`;
    const allowedActionKeys = moduleId === 'doorflow' ? ['doorflow.open'] : Object.values(registry).filter(a=>a.moduleId===moduleId).map(a=>a.actionKey);
    await db.insert(d.nexusPmModuleEntitlementsTable).values({entitlementId,workspaceId,...scope,moduleId,persistedAt:at,
      recordJson:{entitlementId,workspaceId,...scope,moduleId,projectEnabled:true,availabilityState:'active',allowedActionKeys,competenceRequirementKeys:[],revision:'fixture'}});
  }
  const createKey = 'create-main', packageId = digestId('wp',workspaceId,projectId,worldId,manager,createKey), taskId = digestId('task',packageId,'task-one');
  const objectId = `object-${tag}`, fileId = `file-${tag}`;
  await db.insert(d.nexusPmCanonicalObjectsTable).values({objectId,workspaceId,...scope,objectType:'building',recordJson:{...base(objectId),...scope,objectType:'building',lifecycleStatus:'active'},persistedAt:at});
  await db.insert(d.nexusPmFilesTable).values({fileId,workspaceId,...scope,providerConnectorId:'synthetic-drive',storageObjectKey:`synthetic-${tag}`,providerObjectId:`synthetic-file-${tag}`,recordJson:{...base(fileId),...scope,provider:'google-drive',providerObjectId:`synthetic-file-${tag}`},persistedAt:at});
  for (const action of [A.managerComposeWorkPackage,A.managerValidateSemanticIntent,A.managerReadProjection,A.approverReadQueue,A.workerReadOwnAssignments,A.managerGrantAppCapability]) await grant(manager,action);
  for (const action of [A.managerEditDraftPackage,A.managerAssignWorkPackageToPerson]) await grant(manager,action,packageId);
  for (const action of [A.managerAssignTaskToPerson,A.managerAttachDocumentToTask,A.approverInspectEvidence,A.approverDecide]) await grant(manager,action,taskId);
  await grant(manager,A.managerBindWorkPackageToObject,objectId);
  for (const action of [A.workerReadOwnAssignments,A.workerReadApprovalState]) await grant(worker,action);
  await grant(worker,A.workerReadAssignedPackage,packageId);
  for (const action of [A.workerStartTask,A.workerUpdateOwnChecklist,A.workerAddEvidence,A.workerFinishSubmit]) await grant(worker,action,taskId);
  server = app.listen(0,'127.0.0.1'); await once(server,'listening'); origin=`http://127.0.0.1:${(server.address() as any).port}`;
  assert.equal((await call(worker,'person')).personId,worker);
  await call('unknown','work-inbox',undefined,401);
  await call(worker,'projection',undefined,403);
  await call(manager,'work-packages',{requestId:'wrong-scope',...scope,worldId:'world-other'},403);
  pass('distinct authenticated sessions / exact shared scope / fail closed reads');
  const compose = {requestId:createKey,actorPersonId:worker,title:'Synthetic P0 inspection',deadline:new Date(Date.now()+86400000).toISOString(),objectContextIds:[objectId],locationContextIds:[objectId],
    items:[{itemId:'task-one',kind:'TASK',title:'Inspect door'},{itemId:'checklist',kind:'CHECKLIST',title:'Checks',checklistId:'checks'},{itemId:'evidence',kind:'EVIDENCE_REQUIREMENT',title:'Result',evidenceRequirementId:'result'}],
    checklistDefinitions:[{checklistId:'checks',title:'Checks',items:[{itemId:'check-one',title:'Safety confirmed',required:true,expectedResponseType:'BOOLEAN'}]}],
    evidenceRequirements:[{requirementId:'result',allowedEvidenceType:'inspection-answer',description:'Inspection result',requiredBeforeFinish:true,requiredCount:1}]};
  let p = (await call(manager,'work-packages',compose,201)).workPackage;
  assert.equal(p.creatorPersonId,manager); assert.equal(p.packageId,packageId);
  const afterCreate=await snapshotCounts(); await call(manager,'work-packages',compose,200); assert.deepEqual(await snapshotCounts(),afterCreate);
  await call(manager,'work-packages',{...compose,title:'Changed semantics'},409);
  p=(await call(manager,`work-packages/${packageId}/items`,{requestId:'add-doc',expectedRevision:p.revision,item:{itemId:'doc',kind:'DOCUMENT',title:'Drawing',documentId:fileId}})).workPackage;
  p=(await call(manager,`work-packages/${packageId}/items/doc`,{requestId:'remove-doc',expectedRevision:p.revision},200,'DELETE')).workPackage;
  p=(await call(manager,`work-packages/${packageId}/ordering`,{requestId:'order',expectedRevision:p.revision,groups:[{groupId:'inspection',title:'Inspection',order:0}],ordering:p.items.map((i:any,n:number)=>({itemId:i.itemId,order:n,groupId:'inspection'}))},200,'PUT')).workPackage;
  pass('compose/add/remove/group/order and deterministic retry; spoofed actor ignored');
  const drop = {requestId:'assign-main',source:{type:'WORK_PACKAGE',id:packageId},target:{type:'PERSON',id:worker},expectedPackageRevision:p.revision};
  let v=await call(manager,'semantic-drop/validate',drop);
  await call(manager,'semantic-drop/commit',{...drop,validationToken:v.validationToken+'x'},403);
  await call(manager,'semantic-drop/validate',{...drop,companionGrants:[]},400);
  const beforeDeny=await snapshotCounts();
  const deny=await grant(manager,A.managerAssignWorkPackageToPerson,packageId,'deny');
  await call(manager,'semantic-drop/commit',{...drop,validationToken:v.validationToken},403);
  await db.delete(d.nexusPmPermissionGrantsTable).where(eq(d.nexusPmPermissionGrantsTable.grantId,deny)); assert.deepEqual(await snapshotCounts(),beforeDeny);
  const [part] = await db.select().from(d.nexusPmProjectParticipationsTable).where(eq(d.nexusPmProjectParticipationsTable.participationId,participation(worker)));
  v=await call(manager,'semantic-drop/validate',drop);
  await db.update(d.nexusPmProjectParticipationsTable).set({recordJson:{...part!.recordJson,validTo:new Date(Date.now()-1000).toISOString()}}).where(eq(d.nexusPmProjectParticipationsTable.participationId,participation(worker)));
  await call(manager,'semantic-drop/commit',{...drop,validationToken:v.validationToken},403);
  await db.update(d.nexusPmProjectParticipationsTable).set({recordJson:part!.recordJson}).where(eq(d.nexusPmProjectParticipationsTable.participationId,participation(worker)));
  const [g]=await db.select().from(d.nexusPmPermissionGrantsTable).where(eq(d.nexusPmPermissionGrantsTable.actionKey,A.managerAssignWorkPackageToPerson));
  v=await call(manager,'semantic-drop/validate',drop);
  await db.update(d.nexusPmPermissionGrantsTable).set({recordJson:{...g!.recordJson,status:'revoked'}}).where(eq(d.nexusPmPermissionGrantsTable.grantId,g!.grantId));
  await call(manager,'semantic-drop/commit',{...drop,validationToken:v.validationToken},403);
  await db.update(d.nexusPmPermissionGrantsTable).set({recordJson:g!.recordJson}).where(eq(d.nexusPmPermissionGrantsTable.grantId,g!.grantId));
  assert.deepEqual(await snapshotCounts(),beforeDeny);
  pass('deny/revoked grant/expired target participation between validate and commit; zero mutation');
  v=await call(manager,'semantic-drop/validate',drop);
  const concurrent=await Promise.all([1,2,3].map(()=>call(manager,'semantic-drop/commit',{...drop,validationToken:v.validationToken},[200,201])));
  assert.equal(concurrent.filter(r=>r.status==='COMMITTED').length,1);
  const assignmentId=concurrent[0].assignment.assignmentId;
  await call(manager,'semantic-drop',{...drop,target:{type:'OBJECT',id:objectId}},409);
  const inbox=await call(worker,'work-inbox'); assert.equal(inbox.assignments.length,1); assert.equal(inbox.tasks[0].id,taskId); assert.equal(inbox.tasks[0].workPackage.packageId,packageId);
  const assigned=await call(worker,`assignments/${assignmentId}`); assert.equal(assigned.snapshot.packageRevision,p.revision);
  const rawTask=(await pool.query('select record_json from nexus_pm_tasks where task_id=$1',[taskId])).rows[0].record_json; assert.equal(rawTask.workPackage,undefined);
  pass('concurrent retry one outcome / persisted immutable snapshot / Android projection');
  await call(worker,`tasks/${taskId}/start`,{requestId:'start',actorPersonId:manager});
  await call(worker,`tasks/${taskId}/finish`,{requestId:'early-finish'},409);
  await call(worker,`tasks/${taskId}/checklist`,{requestId:'bad-check',checklistId:'checks',responses:[{itemId:'check-one',value:'true'}]},400);
  await call(worker,`tasks/${taskId}/checklist`,{requestId:'check',checklistId:'checks',responses:[{itemId:'check-one',value:true}]});
  await call(worker,`tasks/${taskId}/finish`,{requestId:'missing-evidence'},409);
  await call(worker,`tasks/${taskId}/evidence`,{requestId:'fake-photo',evidenceType:'photo',title:'No binary receipt'},409);
  const e=await call(worker,`tasks/${taskId}/evidence`,{requestId:'evidence',evidenceType:'inspection-answer',title:'Result',answerText:'Synthetic inspection completed'},201);
  const f=await call(worker,`tasks/${taskId}/finish`,{requestId:'finish',completedChecklistItemIds:['check-one']},201);
  assert.equal((await call(manager,'approval-queue')).approvals[0].id,f.approvalId);
  assert.equal((await call(manager,`approvals/${f.approvalId}/evidence`)).evidence[0].id,e.evidenceId);
  await call(worker,`approvals/${f.approvalId}/decision`,{requestId:'worker-approve',decision:'approved'},403);
  await call(manager,`approvals/${f.approvalId}/decision`,{requestId:'approve',decision:'approved'});
  for(const [path,b] of [[`tasks/${taskId}/start`,{requestId:'start',actorPersonId:manager}],[`tasks/${taskId}/finish`,{requestId:'finish',completedChecklistItemIds:['check-one']}]] as const) assert.equal((await call(worker,path,b)).status,'ALREADY_COMMITTED');
  assert.equal((await call(manager,`approvals/${f.approvalId}/decision`,{requestId:'approve',decision:'approved'})).status,'ALREADY_COMMITTED');
  await call(manager,`approvals/${f.approvalId}/decision`,{requestId:'approve',decision:'rejected',reason:'Changed semantics'},409);
  const memory=(await call(manager,'project-memory')).snapshot;
  assert.equal(memory.tasks[0].taskStatus,'done'); assert.equal(memory.evidence[0].evidenceStatus,'reviewed'); assert.equal(memory.approvals[0].approvalStatus,'approved');
  assert.equal(memory.assignments[0].status,'COMPLETED'); assert.equal(memory.assignments[0].snapshot.packageRevision,p.revision);
  assert.ok(memory.timeline.length>=6 && memory.relationshipEdges.length>0 && memory.people.length===2 && memory.objects.length===1);
  assert.equal((await call(manager,'approval-queue')).approvals.length,0); assert.ok((await call(manager,'timeline')).timeline.length>=6);
  assert.equal((await call(worker,`tasks/${taskId}/approval-state`)).approval.approvalStatus,'approved');
  pass('Start / typed Checklist / Evidence metadata / Finish / human Approval / durable Memory / terminal retries');
  for (const [source,target] of [[{type:'TASK',id:taskId},{type:'PERSON',id:worker}],[{type:'DOCUMENT',id:fileId},{type:'TASK',id:taskId}],[{type:'WORK_PACKAGE',id:packageId},{type:'OBJECT',id:objectId}],[{type:'APP',id:'doorflow'},{type:'PERSON',id:worker}]]) {
    const intent={requestId:`intent-${source.type}`,source,target,expectedPackageRevision:p.revision};
    const validation=await call(manager,'semantic-drop/validate',intent);
    await call(manager,'semantic-drop/commit',{...intent,validationToken:validation.validationToken},201);
  }
  pass('all five C2 semantic intents / server-derived atomic companion capability');
  const beforeRollback=await snapshotCounts();
  await pool.query("create function p0_fail_timeline() returns trigger language plpgsql as $$ begin raise exception 'SYNTHETIC_ROLLBACK'; end $$; create trigger p0_fail before insert on nexus_pm_timeline_events for each row execute function p0_fail_timeline()");
  try { await call(manager,'semantic-drop',{requestId:'rollback-app',source:{type:'APP',id:'doorflow'},target:{type:'PERSON',id:worker}},503); }
  finally { await pool.query('drop trigger p0_fail on nexus_pm_timeline_events; drop function p0_fail_timeline()'); }
  assert.deepEqual(await snapshotCounts(),beforeRollback); pass('forced late failure rolls back companion grants, receipts, events and projections');
  await pool.query('alter table nexus_pm_module_entitlements rename to p0_unavailable_entitlements');
  try { await call(manager,'projection',undefined,503); }
  finally { await pool.query('alter table p0_unavailable_entitlements rename to nexus_pm_module_entitlements'); }
  assert.deepEqual(await snapshotCounts(),beforeRollback); pass('authority store unavailable / no mutation');
  console.log('NEXUS_P0_HTTP_POSTGRES_E2E_PASS');
} finally {
  if (server!) await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await pool.end();
}
