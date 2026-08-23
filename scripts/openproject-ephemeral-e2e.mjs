const baseUrl = process.env.OPENPROJECT_E2E_BASE_URL || 'http://127.0.0.1:8080';
const token = process.env.OPENPROJECT_E2E_API_TOKEN;

if (!token) {
  throw new Error('OPENPROJECT_E2E_API_TOKEN_REQUIRED');
}

const headers = {
  Accept: 'application/hal+json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
};

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const error = new Error(`OPENPROJECT_E2E_HTTP_${response.status}_${path}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

const elements = (payload, code) => {
  const rows = payload?._embedded?.elements;
  if (!Array.isArray(rows)) throw new Error(code);
  return rows;
};

const identifier = `nexus-e2e-${Date.now()}`;
const projectName = 'NOSMO Nexus Ephemeral Work E2E';
const subject = 'Nexus Work Package E2E';

const project = await request('/api/v3/projects', {
  method: 'POST',
  body: JSON.stringify({
    _type: 'Project',
    name: projectName,
    identifier,
    public: false,
    active: true,
  }),
});

if (!Number.isInteger(project?.id) || project.id <= 0) {
  throw new Error('OPENPROJECT_E2E_PROJECT_CREATE_INVALID');
}

const typesPayload = await request(`/api/v3/projects/${project.id}/types`);
const types = elements(typesPayload, 'OPENPROJECT_E2E_TYPES_INVALID');
const type = types.find((candidate) => candidate?.isDefault) || types[0];

if (!Number.isInteger(type?.id) || type.id <= 0) {
  throw new Error('OPENPROJECT_E2E_TYPE_MISSING');
}

const workPackage = await request('/api/v3/work_packages?notify=false', {
  method: 'POST',
  body: JSON.stringify({
    _type: 'WorkPackage',
    subject,
    description: {
      format: 'markdown',
      raw: 'Ephemeral Nexus integration proof. No customer or operational data.',
    },
    _links: {
      project: { href: `/api/v3/projects/${project.id}` },
      type: { href: `/api/v3/types/${type.id}` },
    },
  }),
});

if (!Number.isInteger(workPackage?.id) || workPackage.id <= 0) {
  throw new Error('OPENPROJECT_E2E_WORK_PACKAGE_CREATE_INVALID');
}

const projects = elements(
  await request('/api/v3/projects?pageSize=100'),
  'OPENPROJECT_E2E_PROJECT_LIST_INVALID',
);
const workPackages = elements(
  await request('/api/v3/work_packages?pageSize=100&filters=[]'),
  'OPENPROJECT_E2E_WORK_PACKAGE_LIST_INVALID',
);
const workPackageDetail = await request(`/api/v3/work_packages/${workPackage.id}`);

const observedProject = projects.find((candidate) => candidate?.id === project.id);
const observedWorkPackage = workPackages.find((candidate) => candidate?.id === workPackage.id);

if (!observedProject) throw new Error('OPENPROJECT_E2E_PROJECT_NOT_OBSERVED');
if (!observedWorkPackage) throw new Error('OPENPROJECT_E2E_WORK_PACKAGE_NOT_OBSERVED');
if (workPackageDetail?.id !== workPackage.id) throw new Error('OPENPROJECT_E2E_DETAIL_NOT_OBSERVED');

const snapshot = {
  source: 'openproject-v17.6.0-all-in-one-ephemeral-github-runner',
  ephemeral: true,
  capturedAt: new Date().toISOString(),
  project: {
    id: observedProject.id,
    identifier: observedProject.identifier,
    name: observedProject.name,
    active: observedProject.active,
    public: observedProject.public,
  },
  workPackage: {
    id: observedWorkPackage.id,
    subject: observedWorkPackage.subject,
    type: observedWorkPackage?._links?.type?.title || type.name || null,
    status: observedWorkPackage?._links?.status?.title || null,
    project: observedWorkPackage?._links?.project?.title || projectName,
    createdAt: observedWorkPackage.createdAt || null,
    updatedAt: observedWorkPackage.updatedAt || null,
  },
};

console.log('OPENPROJECT_E2E_OK');
console.log(JSON.stringify(snapshot));
