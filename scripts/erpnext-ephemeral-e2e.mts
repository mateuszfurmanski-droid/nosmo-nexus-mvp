import { strict as assert } from 'node:assert';

import type { NexusConnectorHttpFetch } from '../src/connectors/snipe-it/snipeItClient';

const loadRuntimeModule = async <T>(specifier: string): Promise<T> => {
  const imported = (await import(specifier)) as { default?: unknown } & Record<string, unknown>;
  return (imported.default ?? imported) as T;
};

const { ErpNextServerClient } = await loadRuntimeModule<typeof import('../src/connectors/erpnext/erpNextClient')>(
  '../src/connectors/erpnext/erpNextClient.ts',
);

const baseUrl = process.env.ERPNEXT_E2E_BASE_URL?.trim();
const apiKey = process.env.ERPNEXT_E2E_API_KEY?.trim();
const apiSecret = process.env.ERPNEXT_E2E_API_SECRET?.trim();
const upstreamImage = process.env.ERPNEXT_E2E_IMAGE?.trim() || 'frappe/erpnext:v16.32.3';
const upstreamConfigCommit = process.env.ERPNEXT_E2E_CONFIG_COMMIT?.trim() || '4b9d35666abd84157ffadbf67558bbd3e1e39de7';

if (!baseUrl) throw new Error('ERPNEXT_E2E_BASE_URL_REQUIRED');
if (!apiKey || !apiSecret) throw new Error('ERPNEXT_E2E_API_CREDENTIALS_REQUIRED');

const observedRequests: Array<{ method: string; pathname: string }> = [];

const fetchImpl: NexusConnectorHttpFetch = async (input, init) => {
  const target = new URL(input);
  observedRequests.push({ method: init.method, pathname: target.pathname });
  const response = await fetch(input, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
  };
};

const authHeader = `token ${apiKey}:${apiSecret}`;
const identityResponse = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/method/frappe.auth.get_logged_user`, {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    Authorization: authHeader,
  },
});
assert.equal(identityResponse.ok, true, `ERPNEXT_AUTH_IDENTITY_HTTP_${identityResponse.status}`);
const identityPayload = (await identityResponse.json()) as { message?: unknown };
assert.equal(identityPayload.message, 'Administrator', 'ERPNEXT_AUTH_IDENTITY_INVALID');

const client = new ErpNextServerClient({
  baseUrl,
  apiKey,
  apiSecret,
  fetchImpl,
});

const [items, warehouses, materialRequests, purchaseOrders] = await Promise.all([
  client.listItems(),
  client.listWarehouses(),
  client.listMaterialRequests(),
  client.listPurchaseOrders(),
]);

assert(Array.isArray(items));
assert(Array.isArray(warehouses));
assert(Array.isArray(materialRequests));
assert(Array.isArray(purchaseOrders));
assert.equal(observedRequests.length, 4, 'ERPNEXT_ADAPTER_REQUEST_COUNT_INVALID');
assert(observedRequests.every((request) => request.method === 'GET'), 'ERPNEXT_ADAPTER_WRITE_REQUEST_DETECTED');

const expectedPaths = new Set([
  '/api/resource/Item',
  '/api/resource/Warehouse',
  '/api/resource/Material%20Request',
  '/api/resource/Purchase%20Order',
]);
for (const request of observedRequests) {
  assert(expectedPaths.has(request.pathname), `ERPNEXT_UNEXPECTED_READ_PATH_${request.pathname}`);
}

const summary = {
  proof: 'nexus-erpnext-ephemeral-upstream-e2e/v1',
  upstreamRuntime: upstreamImage,
  upstreamConfigCommit,
  sourceSystem: 'erpnext',
  authenticatedUser: 'Administrator',
  nexusAdapter: 'ErpNextServerClient',
  reads: {
    Item: items.length,
    Warehouse: warehouses.length,
    MaterialRequest: materialRequests.length,
    PurchaseOrder: purchaseOrders.length,
  },
  adapterRequests: observedRequests.length,
  adapterWriteRequests: observedRequests.filter((request) => request.method !== 'GET').length,
  persistentTenant: false,
  customerDataUsed: false,
  projectGraphMutationAllowed: false,
  canonicalEvidenceCreated: false,
};

const serialized = JSON.stringify(summary);
assert.equal(serialized.includes(apiKey), false, 'ERPNEXT_SANITISED_OUTPUT_CONTAINS_API_KEY');
assert.equal(serialized.includes(apiSecret), false, 'ERPNEXT_SANITISED_OUTPUT_CONTAINS_API_SECRET');

console.log(JSON.stringify(summary, null, 2));
console.log('ERPNEXT_EPHEMERAL_E2E_PASS');
