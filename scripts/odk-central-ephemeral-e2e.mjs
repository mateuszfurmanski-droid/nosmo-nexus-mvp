const BASE_URL = process.env.ODK_CENTRAL_BASE_URL || 'http://127.0.0.1:8383';
const EMAIL = process.env.ODK_E2E_EMAIL || 'nexus-e2e@example.invalid';
const PASSWORD = process.env.ODK_E2E_PASSWORD || 'NexusE2E-Only-2026!';
const PROJECT_NAME = 'NOSMO Nexus Ephemeral Site Forms E2E';
const XML_FORM_ID = 'nexus-site-inspection-e2e';
const INSTANCE_ID = 'uuid:11111111-2222-4333-8444-555555555555';

const formXml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms"
  xmlns:h="http://www.w3.org/1999/xhtml"
  xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <h:title>Nexus Site Inspection E2E</h:title>
    <model>
      <instance>
        <data id="${XML_FORM_ID}" version="1">
          <site_area/>
          <inspection_status/>
          <note/>
          <meta><instanceID/></meta>
        </data>
      </instance>
      <bind nodeset="/data/site_area" type="string"/>
      <bind nodeset="/data/inspection_status" type="string"/>
      <bind nodeset="/data/note" type="string"/>
      <bind nodeset="/data/meta/instanceID" type="string" readonly="true()"/>
    </model>
  </h:head>
  <h:body>
    <input ref="/data/site_area"><label>Site area</label></input>
    <input ref="/data/inspection_status"><label>Inspection status</label></input>
    <input ref="/data/note"><label>Note</label></input>
  </h:body>
</h:html>`;

const submissionXml = `<?xml version="1.0"?>
<data id="${XML_FORM_ID}" version="1">
  <site_area>Level 02 / Door 02.14</site_area>
  <inspection_status>pass</inspection_status>
  <note>Ephemeral Nexus connector proof</note>
  <meta><instanceID>${INSTANCE_ID}</instanceID></meta>
</data>`;

async function request(path, { token, ...init } = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Accept', headers.get('Accept') || 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    redirect: 'manual',
  });

  return response;
}

async function expectJson(response, label) {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`${label}_HTTP_${response.status}_${contentType || 'NO_CONTENT_TYPE'}_${text.slice(0, 180)}`);
  }
  return response.json();
}

async function login() {
  const response = await request('/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const session = await expectJson(response, 'ODK_SESSION_LOGIN');
  if (typeof session?.token !== 'string' || session.token.length < 20) {
    throw new Error('ODK_SESSION_TOKEN_INVALID');
  }
  return session.token;
}

async function main() {
  const token = await login();

  const project = await expectJson(await request('/v1/projects', {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: PROJECT_NAME }),
  }), 'ODK_PROJECT_CREATE');

  if (!Number.isInteger(project?.id) || project.id <= 0) {
    throw new Error('ODK_PROJECT_ID_INVALID');
  }

  await expectJson(await request(`/v1/projects/${project.id}/forms?publish=true`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: formXml,
  }), 'ODK_FORM_CREATE');

  await expectJson(await request(`/v1/projects/${project.id}/forms/${encodeURIComponent(XML_FORM_ID)}/submissions`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: submissionXml,
  }), 'ODK_SUBMISSION_CREATE');

  const projects = await expectJson(await request('/v1/projects', { token }), 'ODK_PROJECT_LIST');
  const forms = await expectJson(await request(`/v1/projects/${project.id}/forms`, { token }), 'ODK_FORM_LIST');
  const submissions = await expectJson(await request(`/v1/projects/${project.id}/forms/${encodeURIComponent(XML_FORM_ID)}/submissions`, { token }), 'ODK_SUBMISSION_LIST');

  if (!Array.isArray(projects) || !projects.some((item) => item?.id === project.id && item?.name === PROJECT_NAME)) {
    throw new Error('ODK_PROJECT_LIST_MISSING_E2E_PROJECT');
  }

  const form = Array.isArray(forms) ? forms.find((item) => item?.xmlFormId === XML_FORM_ID) : null;
  if (!form) throw new Error('ODK_FORM_LIST_MISSING_E2E_FORM');

  const submission = Array.isArray(submissions)
    ? submissions.find((item) => item?.instanceId === INSTANCE_ID)
    : null;
  if (!submission) throw new Error('ODK_SUBMISSION_LIST_MISSING_E2E_SUBMISSION');

  const snapshot = {
    source: 'odk-central-backend-v2026.2.0-ephemeral-github-runner',
    ephemeral: true,
    capturedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      archived: project.archived ?? false,
    },
    form: {
      xmlFormId: form.xmlFormId,
      name: form.name ?? null,
      version: form.version ?? null,
      state: form.state ?? null,
      publishedAt: form.publishedAt ?? null,
      submissions: form.submissions ?? null,
    },
    submission: {
      instanceId: submission.instanceId,
      createdAt: submission.createdAt ?? null,
      updatedAt: submission.updatedAt ?? null,
      reviewState: submission.reviewState ?? null,
    },
  };

  console.log('ODK_CENTRAL_E2E_OK');
  console.log(JSON.stringify(snapshot));

  await request('/v1/sessions/current', { token, method: 'DELETE' }).catch(() => null);
}

main().catch((error) => {
  console.error('ODK_CENTRAL_E2E_FAILED');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
