import { strict as assert } from 'node:assert';

import type { NexusConnectorHttpFetch } from '../src/connectors/snipe-it/snipeItClient';

const loadRuntimeModule = async <T>(specifier: string): Promise<T> => {
  const imported = (await import(specifier)) as { default?: unknown } & Record<string, unknown>;
  return (imported.default ?? imported) as T;
};

const { OpenMaintServerClient } = await loadRuntimeModule<typeof import('../src/connectors/openmaint/openMaintClient')>(
  '../src/connectors/openmaint/openMaintClient.ts',
);

const baseUrl = process.env.OPENMAINT_E2E_BASE_URL?.trim();
const sessionToken = process.env.OPENMAINT_E2E_SESSION_TOKEN?.trim();
const runtimeImage = process.env.OPENMAINT_E2E_IMAGE?.trim() || 'itmicus/cmdbuild:om-2.4.2-4.2.0';
const runtimeDigest = process.env.OPENMAINT_E2E_IMAGE_DIGEST?.trim() || 'runtime-digest-not-recorded';

if (!baseUrl) throw new Error('OPENMAINT_E2E_BASE_URL_REQUIRED');
if (!sessionToken) throw new Error('OPENMAINT_E2E_SESSION_TOKEN_REQUIRED');

const requests: Array<{ method: string; path: string }> = [];

const fetchImpl: NexusConnectorHttpFetch = async (input, init) => {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET') throw new Error(`OPENMAINT_NEXUS_WRITE_BLOCKED_${method}`);

  const url = new URL(input);
  requests.push({ method, path: url.pathname });

  const response = await fetch(input, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
  };
};

const client = new OpenMaintServerClient({ baseUrl, sessionToken, fetchImpl });
const classes = await client.listClasses();
assert(classes.length > 0, 'OPENMAINT_REAL_UPSTREAM_RETURNED_NO_CLASSES');

const classIds = classes
  .map((row) => {
    const value = row as { _id?: unknown; name?: unknown };
    const candidate = value._id ?? value.name;
    return candidate === undefined || candidate === null ? '' : String(candidate).trim();
  })
  .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);

assert(classIds.length > 0, 'OPENMAINT_REAL_UPSTREAM_CLASS_IDENTIFIERS_MISSING');

let selectedClassId: string | null = null;
let selectedCards: Awaited<ReturnType<InstanceType<typeof OpenMaintServerClient>['listCards']>> = [];
let cardReadSucceeded = false;
const cardReadErrors: string[] = [];

for (const classId of classIds.slice(0, 30)) {
  try {
    const cards = await client.listCards(classId);
    cardReadSucceeded = true;
    selectedClassId = classId;
    selectedCards = cards;
    if (cards.length > 0) break;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    cardReadErrors.push(`${classId}:${message}`);
  }
}

assert(cardReadSucceeded, `OPENMAINT_REAL_UPSTREAM_CARD_READ_FAILED:${cardReadErrors.slice(0, 3).join('|')}`);
assert(selectedClassId, 'OPENMAINT_REAL_UPSTREAM_CLASS_SELECTION_FAILED');
assert(requests.length >= 2, 'OPENMAINT_REAL_UPSTREAM_TOO_FEW_NEXUS_READS');
assert(requests.every((request) => request.method === 'GET'), 'OPENMAINT_NEXUS_WRITE_DETECTED');

const firstCard = selectedCards[0];
const summary = {
  harness: 'nexus-openmaint-ephemeral-e2e/v1',
  upstreamApplication: 'openMAINT 2.4.2 / CMDBuild core 4.2.0',
  runtimePackaging: 'community Docker packaging of the openMAINT release',
  runtimeImage,
  runtimeDigest,
  classesObserved: classes.length,
  selectedClassId,
  cardsObservedInSelectedClass: selectedCards.length,
  representativeCardId: firstCard?._id ?? null,
  representativeCardCode: typeof firstCard?.Code === 'string' ? firstCard.Code : null,
  nexusRequests: requests.length,
  nexusWriteRequests: requests.filter((request) => request.method !== 'GET').length,
  nexusAdapterReadOnly: true,
  persistentTenantClaimed: false,
  customerDataUsed: false,
};

const serialized = JSON.stringify(summary);
assert.equal(serialized.includes(sessionToken), false, 'OPENMAINT_SANITISED_OUTPUT_CONTAINS_SESSION_TOKEN');

console.log(JSON.stringify(summary, null, 2));
console.log('OPENMAINT_EPHEMERAL_E2E_PASS');
