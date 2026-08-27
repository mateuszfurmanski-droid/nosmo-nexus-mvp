export type ApiJob = {
  row: number;
  priority: string;
  role: string;
  category: string;
  company: string;
  agency: string;
  location: string;
  transport: string;
  travelTime: string;
  shift: string;
  days: string;
  daypart: string;
  contract: string;
  pay: string;
  startDate: string;
  experience: string;
  requirements: string;
  cvCode: string;
  coverLetter: string;
  applicationMethod: string;
  applicationLink: string;
  email: string;
  phone: string;
  contactPerson: string;
  dateFound: string;
  listingAge: string;
  status: string;
  notes: string;
  whatsapp: string;
  whatsappInfo: string;
  bestContact: string;
  sourceUrl: string;
  match: number;
};

export type ReplyItem = {
  id: string;
  threadId: string | null;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
  internalDate: string | null;
};

const API_BASE = "/api/job-control";\n\nconst request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  let payload: any = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const error = new Error(payload?.code || `HTTP_${response.status}`) as Error & {
      status?: number;
      payload?: any;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload as T;
};

export const api = {
  authStatus: () =>
    request<{ ok: true; configured: boolean; authenticated: boolean }>("${API_BASE}/auth"),

  login: (code: string) =>
    request<{ ok: true; authenticated: true }>("${API_BASE}/auth", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  logout: () =>
    request<{ ok: true }>("${API_BASE}/auth", { method: "DELETE" }),

  dashboard: () =>
    request<{
      ok: true;
      source: string;
      metrics: {
        active: number;
        applied: number;
        contacted: number;
        interviews: number;
        forms: number;
        morning: number;
        night: number;
        priorityA: number;
      };
      syncedAt: string;
    }>("${API_BASE}/dashboard"),

  jobs: () =>
    request<{ ok: true; source: string; jobs: ApiJob[]; syncedAt: string }>("${API_BASE}/jobs"),

  cvs: () =>
    request<{
      ok: true;
      source: string;
      cvs: Array<{
        code: string;
        category: string;
        name: string;
        mimeType: string;
        modifiedTime: string | null;
        webViewLink: string | null;
        available: boolean;
      }>;
    }>("${API_BASE}/cvs"),

  integrations: () =>
    request<{
      ok: true;
      integrations: {
        auth: { configured: boolean; connected: boolean };
        google: {
          configured: boolean;
          tokenExchange: boolean;
          sheetsRead: boolean;
          driveRead: boolean;
          sheetsWriteEnabled: boolean;
          gmailSendEnabled: boolean;
        };
        checkedAt: string;
      };
      googleError?: { code: string; httpStatus: number | null; providerReason: string | null };
    }>("${API_BASE}/integrations"),

  replies: () =>
    request<{ ok: true; source: string; replies: ReplyItem[]; syncedAt: string }>("${API_BASE}/replies"),

  updateStatus: (input: {
    row: number;
    status: string;
    note: string;
    confirmed: boolean;
  }) =>
    request<{ ok: true; row: number; status: string; confirmedAt: string }>("${API_BASE}/update-status", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  sendApplication: (input: {
    row: number;
    to: string;
    subject: string;
    body: string;
    cvCode: string;
    idempotencyKey: string;
    confirmed: true;
  }) =>
    request<{
      ok: true;
      sent: true;
      idempotentReplay: boolean;
      messageId: string;
      statusUpdated: boolean;
    }>("${API_BASE}/send-application", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
