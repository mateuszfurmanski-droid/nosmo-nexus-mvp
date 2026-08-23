import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { strict as assert } from 'node:assert';

import type { NexusConnectorHttpFetch } from '../src/connectors/snipe-it/snipeItClient';

const loadRuntimeModule = async <T>(specifier: string): Promise<T> => {
  const imported = (await import(specifier)) as { default?: unknown } & Record<string, unknown>;
  return (imported.default ?? imported) as T;
};

const { ErpNextServerClient } = await loadRuntimeModule<typeof import('../src/connectors/erpnext/erpNextClient')>(
  '../src/connectors/erpnext/erpNextClient.ts',
);
const { QFieldCloudServerClient } = await loadRuntimeModule<typeof import('../src/connectors/qfield/qFieldCloudClient')>(
  '../src/connectors/qfield/qFieldCloudClient.ts',
);
const { OpenMaintServerClient } = await loadRuntimeModule<typeof import('../src/connectors/openmaint/openMaintClient')>(
  '../src/connectors/openmaint/openMaintClient.ts',
);
const { BcfServerClient } = await loadRuntimeModule<typeof import('../src/connectors/bcf/bcfClient')>(
  '../src/connectors/bcf/bcfClient.ts',
);
const { projectMultitradeExternalRecord } = await loadRuntimeModule<
  typeof import('../src/connectors/multitradeContextProjection')
>('../src/connectors/multitradeContextProjection.ts');

const ERPNEXT_AUTH = 'token nexus-e2e-key:nexus-e2e-secret';
const QFIELD_AUTH = 'Bearer nexus-qfield-e2e';
const OPENMAINT_AUTH = 'nexus-openmaint-e2e';
const BCF_AUTH = 'Bearer nexus-bcf-e2e';
const OBSERVED_AT = '2026-08-23T13:30:00.000Z';

const seenRequests: Array<{ method: string; path: string }> = [];

const json = (res: ServerResponse, status: number, payload: unknown) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

const requireHeader = (req: IncomingMessage, name: string, expected: string): boolean => {
  const value = req.headers[name.toLowerCase()];
  if (value !== expected) return false;
  return true;
};

const server = createServer((req, res) => {
  const method = req.method ?? 'UNKNOWN';
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  seenRequests.push({ method, path: url.pathname });

  if (method !== 'GET') {
    json(res, 405, { error: 'READ_ONLY_FIXTURE' });
    return;
  }

  if (url.pathname.startsWith('/erp/api/resource/')) {
    if (!requireHeader(req, 'authorization', ERPNEXT_AUTH)) {
      json(res, 401, { error: 'ERPNEXT_AUTH_REQUIRED' });
      return;
    }
    const doctype = decodeURIComponent(url.pathname.slice('/erp/api/resource/'.length));
    const fixtures: Record<string, unknown[]> = {
      Item: [{ name: 'MAT-CABLE-001', item_name: 'LSZH Cable 2.5mm' }],
      Warehouse: [{ name: 'SITE-HALIFAX', warehouse_name: 'Halifax Site Store' }],
      'Material Request': [{ name: 'MR-0007', material_request_type: 'Material Transfer' }],
      'Purchase Order': [{ name: 'PO-0042', supplier: 'Nexus Demo Supplier' }],
    };
    const data = fixtures[doctype];
    if (!data) {
      json(res, 404, { error: 'ERPNEXT_DOCTYPE_NOT_FOUND' });
      return;
    }
    json(res, 200, { data });
    return;
  }

  if (url.pathname === '/qfield/api/v1/projects/' || url.pathname === '/qfield/api/v1/projects/qf-halifax/') {
    if (!requireHeader(req, 'authorization', QFIELD_AUTH)) {
      json(res, 401, { detail: 'QFIELD_AUTH_REQUIRED' });
      return;
    }
    const project = {
      id: 'qf-halifax',
      name: 'Halifax Utilities Survey',
      description: 'Synthetic field mapping fixture',
      owner: 'nexus-e2e',
      updated_at: OBSERVED_AT,
    };
    json(res, 200, url.pathname.endsWith('/qf-halifax/') ? project : { results: [project] });
    return;
  }

  if (url.pathname === '/openmaint/services/rest/v3/classes') {
    if (!requireHeader(req, 'cmdbuild-authorization', OPENMAINT_AUTH)) {
      json(res, 401, { success: false });
      return;
    }
    json(res, 200, { data: [{ _id: 'HVACUnit', name: 'HVACUnit' }] });
    return;
  }

  if (url.pathname === '/openmaint/services/rest/v3/classes/HVACUnit/cards') {
    if (!requireHeader(req, 'cmdbuild-authorization', OPENMAINT_AUTH)) {
      json(res, 401, { success: false });
      return;
    }
    json(res, 200, {
      data: [{ _id: 701, Code: 'AHU-07', Description: 'Level 02 Air Handling Unit', Status: 'Active' }],
    });
    return;
  }

  if (url.pathname === '/bcf/bcf/3.0/projects') {
    if (!requireHeader(req, 'authorization', BCF_AUTH)) {
      json(res, 401, { error: 'BCF_AUTH_REQUIRED' });
      return;
    }
    json(res, 200, [{ project_id: 'bcf-halifax', name: 'Halifax BIM Coordination' }]);
    return;
  }

  if (url.pathname === '/bcf/bcf/3.0/projects/bcf-halifax/topics') {
    if (!requireHeader(req, 'authorization', BCF_AUTH)) {
      json(res, 401, { error: 'BCF_AUTH_REQUIRED' });
      return;
    }
    json(res, 200, [{
      guid: '11111111-2222-4333-8444-555555555555',
      title: 'Duct clashes with beam at Level 02',
      topic_status: 'Open',
      topic_type: 'Clash',
      modified_date: OBSERVED_AT,
    }]);
    return;
  }

  json(res, 404, { error: 'FIXTURE_ROUTE_NOT_FOUND' });
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;

const fetchImpl: NexusConnectorHttpFetch = async (input, init) => {
  const response = await fetch(input, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
  };
};

try {
  const erp = new ErpNextServerClient({
    baseUrl: `${base}/erp`,
    apiKey: 'nexus-e2e-key',
    apiSecret: 'nexus-e2e-secret',
    fetchImpl,
  });
  const qfield = new QFieldCloudServerClient({
    baseUrl: `${base}/qfield`,
    bearerToken: 'nexus-qfield-e2e',
    fetchImpl,
  });
  const openmaint = new OpenMaintServerClient({
    baseUrl: `${base}/openmaint`,
    sessionToken: OPENMAINT_AUTH,
    fetchImpl,
  });
  const bcf = new BcfServerClient({
    baseUrl: `${base}/bcf`,
    bearerToken: 'nexus-bcf-e2e',
    fetchImpl,
  });

  const [items, warehouses, materialRequests, purchaseOrders] = await Promise.all([
    erp.listItems(),
    erp.listWarehouses(),
    erp.listMaterialRequests(),
    erp.listPurchaseOrders(),
  ]);
  const qfieldProjects = await qfield.listProjects();
  const qfieldProject = await qfield.getProject(qfieldProjects[0]?.id ?? '');
  const openmaintClasses = await openmaint.listClasses();
  const openmaintCards = await openmaint.listCards('HVACUnit');
  const bcfProjects = await bcf.listProjects();
  const bcfTopics = await bcf.listTopics(bcfProjects[0]?.project_id ?? '');

  assert.equal(items[0]?.name, 'MAT-CABLE-001');
  assert.equal(warehouses[0]?.name, 'SITE-HALIFAX');
  assert.equal(materialRequests[0]?.name, 'MR-0007');
  assert.equal(purchaseOrders[0]?.name, 'PO-0042');
  assert.equal(qfieldProjects[0]?.id, 'qf-halifax');
  assert.equal((qfieldProject as { id?: string }).id, 'qf-halifax');
  assert.equal((openmaintClasses[0] as { _id?: string })._id, 'HVACUnit');
  assert.equal(openmaintCards[0]?._id, 701);
  assert.equal(bcfProjects[0]?.project_id, 'bcf-halifax');
  assert.equal(bcfTopics[0]?.guid, '11111111-2222-4333-8444-555555555555');

  const projections = [
    projectMultitradeExternalRecord({
      connectorDefinitionId: 'erpnext-trades',
      sourceSystem: 'erpnext',
      recordType: 'Purchase Order',
      externalId: purchaseOrders[0]!.name,
      observedAt: OBSERVED_AT,
      contextLinks: [
        { objectType: 'Project', nexusObjectId: 'halifax-demo', relationship: 'context-for' },
        { objectType: 'Company', nexusObjectId: 'nexus-demo-supplier', relationship: 'supplied-by' },
      ],
    }),
    projectMultitradeExternalRecord({
      connectorDefinitionId: 'qfield-trades',
      sourceSystem: 'qfieldcloud',
      recordType: 'Field Project',
      externalId: qfieldProjects[0]!.id,
      observedAt: OBSERVED_AT,
      contextLinks: [
        { objectType: 'Project', nexusObjectId: 'halifax-demo', relationship: 'context-for' },
        { objectType: 'Floor', nexusObjectId: 'halifax-level-02', relationship: 'located-in' },
      ],
    }),
    projectMultitradeExternalRecord({
      connectorDefinitionId: 'openmaint-trades',
      sourceSystem: 'openmaint',
      recordType: 'Technical Asset Card',
      externalId: openmaintCards[0]!._id,
      observedAt: OBSERVED_AT,
      contextLinks: [
        { objectType: 'Asset', nexusObjectId: 'ahu-07', relationship: 'concerns' },
        { objectType: 'Inspection', nexusObjectId: 'ahu-07-maintenance-review', relationship: 'supports' },
      ],
    }),
    projectMultitradeExternalRecord({
      connectorDefinitionId: 'bcf-trades',
      sourceSystem: 'bcf-api',
      recordType: 'BCF Topic',
      externalId: bcfTopics[0]!.guid,
      observedAt: OBSERVED_AT,
      contextLinks: [
        { objectType: 'Project', nexusObjectId: 'halifax-demo', relationship: 'context-for' },
        { objectType: 'Task', nexusObjectId: 'coordination-clash-001', relationship: 'concerns' },
      ],
    }),
  ];

  assert.equal(projections.length, 4);
  for (const projection of projections) {
    assert.equal(projection.mappingKind, 'external-reference-only');
    assert.equal(projection.promotion.canonicalEvidenceCreated, false);
    assert.equal(projection.promotion.projectGraphMutationAllowed, false);
    assert.equal(projection.promotion.externalIdentityPromotedToPerson, false);
    assert.equal(projection.promotion.approvalPromotedFromExternalStatus, false);
  }

  assert.equal(seenRequests.length, 10);
  assert(seenRequests.every((request) => request.method === 'GET'));

  const summary = {
    harness: 'nexus-multitrade-shared-e2e/v1',
    upstream: 'local protocol-faithful disposable fixture server',
    requests: seenRequests.length,
    writeRequests: seenRequests.filter((request) => request.method !== 'GET').length,
    connectors: projections.map((projection) => ({
      id: projection.externalReference.connectorDefinitionId,
      sourceSystem: projection.externalReference.sourceSystem,
      recordType: projection.externalReference.recordType,
      externalId: projection.externalReference.externalId,
      mappingKind: projection.mappingKind,
      graphMutationAllowed: projection.promotion.projectGraphMutationAllowed,
      canonicalEvidenceCreated: projection.promotion.canonicalEvidenceCreated,
    })),
    realPersistentUpstreamClaimed: false,
  };

  const serialized = JSON.stringify(summary);
  for (const secret of ['nexus-e2e-secret', 'nexus-qfield-e2e', 'nexus-openmaint-e2e', 'nexus-bcf-e2e']) {
    assert.equal(serialized.includes(secret), false, 'SANITISED_OUTPUT_CONTAINS_SECRET');
  }

  console.log(JSON.stringify(summary, null, 2));
  console.log('MULTITRADE_SHARED_E2E_PASS');
} finally {
  server.close();
  await once(server, 'close');
}
