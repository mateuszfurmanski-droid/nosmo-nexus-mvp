import { strict as assert } from 'node:assert';

import type { NexusConnectorHttpFetch } from '../src/connectors/snipe-it/snipeItClient';

const loadRuntimeModule = async <T>(specifier: string): Promise<T> => {
  const imported = (await import(specifier)) as { default?: unknown } & Record<string, unknown>;
  return (imported.default ?? imported) as T;
};

const { QFieldCloudServerClient } = await loadRuntimeModule<
  typeof import('../src/connectors/qfield/qFieldCloudClient')
>('../src/connectors/qfield/qFieldCloudClient.ts');

const baseUrl = process.env.QFIELDCLOUD_E2E_BASE_URL?.trim();
const token = process.env.QFIELDCLOUD_E2E_TOKEN?.trim();
const expectedProjectId = process.env.QFIELDCLOUD_E2E_PROJECT_ID?.trim();

if (!baseUrl) throw new Error('QFIELDCLOUD_E2E_BASE_URL_REQUIRED');
if (!token) throw new Error('QFIELDCLOUD_E2E_TOKEN_REQUIRED');
if (!expectedProjectId) throw new Error('QFIELDCLOUD_E2E_PROJECT_ID_REQUIRED');

const seenRequests: Array<{ method: string; path: string }> = [];

const fetchImpl: NexusConnectorHttpFetch = async (input, init) => {
  const method = init?.method ?? 'GET';
  const url = new URL(input);
  seenRequests.push({ method, path: url.pathname });
  const response = await fetch(input, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
  };
};

const client = new QFieldCloudServerClient({ baseUrl, token, fetchImpl });
const projects = await client.listProjects();
const project = projects.find((candidate) => candidate.id === expectedProjectId);
assert(project, 'QFIELDCLOUD_EXPECTED_PROJECT_NOT_LISTED');

const detail = (await client.getProject(expectedProjectId)) as {
  id?: string;
  name?: string;
  owner?: string;
  description?: string | null;
};
assert.equal(detail.id, expectedProjectId, 'QFIELDCLOUD_PROJECT_DETAIL_ID_MISMATCH');

assert.equal(seenRequests.length, 2, 'QFIELDCLOUD_UNEXPECTED_REQUEST_COUNT');
assert(seenRequests.every((request) => request.method === 'GET'), 'QFIELDCLOUD_CONNECTOR_WRITE_DETECTED');
assert(seenRequests.some((request) => request.path === '/api/v1/projects/'));
assert(seenRequests.some((request) => request.path === `/api/v1/projects/${expectedProjectId}/`));

const summary = {
  harness: 'nexus-qfieldcloud-ephemeral-e2e/v1',
  upstream: 'QFieldCloud self-hosted backend pinned by workflow',
  project: {
    id: detail.id,
    name: detail.name ?? project.name ?? null,
    owner: detail.owner ?? project.owner ?? null,
  },
  connectorRequests: seenRequests.length,
  connectorWriteRequests: seenRequests.filter((request) => request.method !== 'GET').length,
  authScheme: 'Token',
  projectGraphMutation: false,
  canonicalEvidencePromotion: false,
  persistentTenantClaimed: false,
};

const serialized = JSON.stringify(summary);
assert.equal(serialized.includes(token), false, 'QFIELDCLOUD_SANITISED_OUTPUT_CONTAINS_TOKEN');

console.log(JSON.stringify(summary, null, 2));
console.log('QFIELDCLOUD_EPHEMERAL_E2E_PASS');
