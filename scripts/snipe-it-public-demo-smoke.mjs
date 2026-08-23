const BASE_URL = 'https://develop.snipeitapp.com';
const USERNAME = 'admin';
const PASSWORD = 'password';
const USER_AGENT = 'NOSMO-Nexus-SnipeIT-Public-Demo-Smoke/1.0';

const cookieJar = new Map();

function storeCookies(headers) {
  const getSetCookie = headers.getSetCookie?.bind(headers);
  const values = getSetCookie ? getSetCookie() : [];
  for (const value of values) {
    const first = value.split(';', 1)[0];
    const index = first.indexOf('=');
    if (index <= 0) continue;
    cookieJar.set(first.slice(0, index), first.slice(index + 1));
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function requiredCsrf(html) {
  const match = html.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i)
    ?? html.match(/value=["']([^"']+)["'][^>]*name=["']_token["']/i);
  if (!match) throw new Error('SNIPE_DEMO_CSRF_NOT_FOUND');
  return match[1];
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set('User-Agent', USER_AGENT);
  const cookies = cookieHeader();
  if (cookies) headers.set('Cookie', cookies);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    redirect: 'manual',
  });
  storeCookies(response.headers);
  return response;
}

async function main() {
  const loginPage = await request('/login', {
    headers: { Accept: 'text/html' },
  });
  if (loginPage.status !== 200) {
    throw new Error(`SNIPE_DEMO_LOGIN_PAGE_HTTP_${loginPage.status}`);
  }

  const loginHtml = await loginPage.text();
  const csrf = requiredCsrf(loginHtml);

  const loginBody = new URLSearchParams({
    _token: csrf,
    username: USERNAME,
    password: PASSWORD,
  });

  const loginResponse = await request('/login', {
    method: 'POST',
    headers: {
      Accept: 'text/html',
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${BASE_URL}/login`,
    },
    body: loginBody,
  });

  if (![302, 303].includes(loginResponse.status)) {
    throw new Error(`SNIPE_DEMO_LOGIN_HTTP_${loginResponse.status}`);
  }

  const redirectLocation = loginResponse.headers.get('location') || '/';
  const redirectPath = redirectLocation.startsWith(BASE_URL)
    ? redirectLocation.slice(BASE_URL.length) || '/'
    : redirectLocation.startsWith('/')
      ? redirectLocation
      : '/';

  const authenticatedPage = await request(redirectPath, {
    headers: { Accept: 'text/html' },
  });
  if (authenticatedPage.status !== 200) {
    throw new Error(`SNIPE_DEMO_AUTH_PAGE_HTTP_${authenticatedPage.status}`);
  }
  await authenticatedPage.arrayBuffer();

  if (!cookieJar.has('snipeit_passport_token')) {
    throw new Error('SNIPE_DEMO_FRESH_API_COOKIE_NOT_ISSUED');
  }

  const assetsResponse = await request('/api/v1/hardware?limit=5&offset=0&sort=created_at&order=desc', {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const contentType = assetsResponse.headers.get('content-type') || '';
  if (assetsResponse.status !== 200 || !contentType.includes('application/json')) {
    throw new Error(`SNIPE_DEMO_ASSET_API_HTTP_${assetsResponse.status}_${contentType || 'NO_CONTENT_TYPE'}`);
  }

  const payload = await assetsResponse.json();
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (rows.length === 0) {
    throw new Error('SNIPE_DEMO_ASSET_API_EMPTY');
  }

  const asset = rows[0];
  const snapshot = {
    source: 'snipe-it-official-public-develop-demo',
    ephemeral: true,
    capturedAt: new Date().toISOString(),
    asset: {
      id: asset?.id ?? null,
      assetTag: asset?.asset_tag ?? null,
      name: asset?.name ?? null,
      model: asset?.model?.name ?? null,
      category: asset?.category?.name ?? null,
      manufacturer: asset?.manufacturer?.name ?? null,
      status: asset?.status_label?.name ?? null,
      assignedTo: asset?.assigned_to?.name ?? asset?.assigned_to ?? null,
      location: asset?.location?.name ?? null,
    },
  };

  console.log('SNIPE_DEMO_E2E_OK');
  console.log(JSON.stringify(snapshot));
}

main().catch((error) => {
  console.error('SNIPE_DEMO_E2E_FAILED');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
