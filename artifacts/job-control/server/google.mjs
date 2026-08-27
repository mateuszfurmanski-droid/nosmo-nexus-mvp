const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

export const JOB_CONTROL_SHEET_ID =
  process.env.JOB_CONTROL_SHEET_ID?.trim() ||
  "1WWTX9qmk3hVaWMii4AyS_VuyfEMxdbiJcuKXKKfCDi4";

export const CV_FILES = {
  "CV 01": { category: "CLEANING", fileId: "1kB8qqpqui7hstjq8ga6V1-wfXscjmfHT" },
  "CV 02": { category: "WAREHOUSE", fileId: "1lMlA5eseF4sBhJBglgULD5-XWrmrtfGz" },
  "CV 03": { category: "FACTORY / PRODUCTION", fileId: "176etIgxsgao_h14fTD1qliylrhgn1gaA" },
  "CV 04": { category: "BAR STAFF", fileId: "1ZMToTOW59t7wmd0aEJxIpitlXqIMIkAW" },
  "CV 05": { category: "CAFE / BREAKFAST", fileId: "1frv-epw9vfLiUYlOY8SmlsEhXXO44l-0" },
  "CV 06": { category: "KITCHEN / CATERING", fileId: "1wFuny94-w__7GF8v6O1WoSCEh36JH4hi" },
  "CV 07": { category: "HOTEL / HOUSEKEEPING", fileId: "1D2-iGhOfhoHKzTSNSJ4dcjC0WJfRkCky" },
};

const readJson = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: { message: text.slice(0, 300) } }; }
};

const googleError = (code, response, payload) => {
  const error = new Error(code);
  error.code = code;
  error.httpStatus = response?.status ?? null;
  error.providerReason =
    typeof payload?.error === "string"
      ? payload.error
      : typeof payload?.error?.status === "string"
        ? payload.error.status
        : null;
  return error;
};

const resolveSecretReference = () => {
  const explicit = process.env.JOB_CONTROL_GOOGLE_SECRET_REFERENCE?.trim();
  if (explicit) return explicit;

  const cloudConfig = process.env.NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON?.trim();
  if (cloudConfig) {
    try {
      const parsed = JSON.parse(cloudConfig);
      if (typeof parsed?.secretReference === "string" && parsed.secretReference.trim()) {
        return parsed.secretReference.trim();
      }
    } catch {
      // Keep fail-closed below.
    }
  }
  return null;
};

export const inspectGoogleConfig = () => {
  const reference = resolveSecretReference();
  const raw = reference ? process.env[reference] : null;
  let secretShapeValid = false;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      secretShapeValid = Boolean(
        parsed?.type === "google-oauth-refresh-token/v1" &&
        typeof parsed.clientId === "string" && parsed.clientId.trim() &&
        typeof parsed.clientSecret === "string" && parsed.clientSecret.trim() &&
        typeof parsed.refreshToken === "string" && parsed.refreshToken.trim(),
      );
    } catch {
      secretShapeValid = false;
    }
  }
  return {
    secretReferenceConfigured: Boolean(reference),
    secretConfigured: Boolean(raw),
    secretShapeValid,
    sheetsWriteEnabled: process.env.JOB_CONTROL_SHEETS_WRITE_ENABLED === "true",
    gmailSendEnabled: process.env.JOB_CONTROL_GMAIL_SEND_ENABLED === "true",
  };
};

const resolveGoogleSecret = () => {
  const reference = resolveSecretReference();
  if (!reference || !/^NEXUS_SECRET_[A-Z0-9_]+$/.test(reference)) {
    throw new Error("JOB_CONTROL_GOOGLE_SECRET_REFERENCE_NOT_CONFIGURED");
  }
  const raw = process.env[reference];
  if (!raw) throw new Error("JOB_CONTROL_GOOGLE_SECRET_NOT_CONFIGURED");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("JOB_CONTROL_GOOGLE_SECRET_INVALID_JSON"); }
  if (parsed?.type !== "google-oauth-refresh-token/v1") {
    throw new Error("JOB_CONTROL_GOOGLE_SECRET_TYPE_MISMATCH");
  }
  for (const key of ["clientId", "clientSecret", "refreshToken"]) {
    if (typeof parsed[key] !== "string" || !parsed[key].trim()) {
      throw new Error(`JOB_CONTROL_GOOGLE_SECRET_MISSING_${key.toUpperCase()}`);
    }
  }
  return parsed;
};

export const getAccessToken = async () => {
  const secret = resolveGoogleSecret();
  const form = new URLSearchParams({
    client_id: secret.clientId,
    client_secret: secret.clientSecret,
    refresh_token: secret.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await readJson(response);
  if (!response.ok || typeof payload.access_token !== "string") {
    throw googleError("JOB_CONTROL_GOOGLE_TOKEN_REJECTED", response, payload);
  }
  return payload.access_token;
};

const googleJson = async (url, token, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });
  const payload = await readJson(response);
  if (!response.ok) throw googleError("JOB_CONTROL_GOOGLE_REQUEST_REJECTED", response, payload);
  return payload;
};

export const readSheetRange = async (range, token = null) => {
  const accessToken = token ?? await getAccessToken();
  const url = `${SHEETS_API}/${encodeURIComponent(JOB_CONTROL_SHEET_ID)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const payload = await googleJson(url, accessToken);
  return Array.isArray(payload.values) ? payload.values : [];
};

export const writeSheetRange = async (range, values, token = null) => {
  if (process.env.JOB_CONTROL_SHEETS_WRITE_ENABLED !== "true") {
    throw new Error("JOB_CONTROL_SHEETS_WRITE_DISABLED");
  }
  const accessToken = token ?? await getAccessToken();
  const url = `${SHEETS_API}/${encodeURIComponent(JOB_CONTROL_SHEET_ID)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  return googleJson(url, accessToken, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
};

const listSheets = async (token) => {
  const fields = encodeURIComponent("sheets.properties(sheetId,title)");
  const url = `${SHEETS_API}/${encodeURIComponent(JOB_CONTROL_SHEET_ID)}?fields=${fields}`;
  return googleJson(url, token);
};

const addSheet = async (title, token) => {
  const url = `${SHEETS_API}/${encodeURIComponent(JOB_CONTROL_SHEET_ID)}:batchUpdate`;
  return googleJson(url, token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
};

export const ensureActivitySheet = async (token) => {
  const title = "JOB_CONTROL_ACTIVITY";
  const spreadsheet = await listSheets(token);
  const exists = (spreadsheet.sheets ?? []).some((sheet) => sheet?.properties?.title === title);
  if (!exists) {
    if (process.env.JOB_CONTROL_SHEETS_WRITE_ENABLED !== "true") {
      throw new Error("JOB_CONTROL_ACTIVITY_SHEET_MISSING_AND_WRITES_DISABLED");
    }
    await addSheet(title, token);
    await writeSheetRange(
      `${title}!A1:J1`,
      [["Timestamp", "Idempotency Key", "Job Row", "Action", "Channel", "Status", "CV", "Recipient", "Provider Message ID", "Note"]],
      token,
    );
  }
  return title;
};

export const appendActivity = async (entry, token = null) => {
  if (process.env.JOB_CONTROL_SHEETS_WRITE_ENABLED !== "true") {
    throw new Error("JOB_CONTROL_SHEETS_WRITE_DISABLED");
  }
  const accessToken = token ?? await getAccessToken();
  const title = await ensureActivitySheet(accessToken);
  const range = encodeURIComponent(`${title}!A:J`);
  const url = `${SHEETS_API}/${encodeURIComponent(JOB_CONTROL_SHEET_ID)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  return googleJson(url, accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      values: [[
        new Date().toISOString(),
        entry.idempotencyKey ?? "",
        entry.jobRow ?? "",
        entry.action ?? "",
        entry.channel ?? "",
        entry.status ?? "",
        entry.cvCode ?? "",
        entry.recipient ?? "",
        entry.providerMessageId ?? "",
        entry.note ?? "",
      ]],
    }),
  });
};

export const findActivityByKey = async (key, token = null) => {
  const accessToken = token ?? await getAccessToken();
  try {
    const rows = await readSheetRange("JOB_CONTROL_ACTIVITY!A2:J2000", accessToken);
    const hit = rows.find((row) => row?.[1] === key);
    if (!hit) return null;
    return {
      timestamp: hit[0] ?? "",
      key: hit[1] ?? "",
      jobRow: hit[2] ?? "",
      action: hit[3] ?? "",
      channel: hit[4] ?? "",
      status: hit[5] ?? "",
      cvCode: hit[6] ?? "",
      recipient: hit[7] ?? "",
      providerMessageId: hit[8] ?? "",
      note: hit[9] ?? "",
    };
  } catch (error) {
    if (error?.httpStatus === 400) return null;
    throw error;
  }
};

export const getDriveMetadata = async (fileId, token = null) => {
  const accessToken = token ?? await getAccessToken();
  const fields = encodeURIComponent("id,name,mimeType,size,modifiedTime,webViewLink,trashed");
  return googleJson(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`,
    accessToken,
  );
};

export const downloadDriveFile = async (fileId, token = null) => {
  const accessToken = token ?? await getAccessToken();
  const response = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    const payload = await readJson(response);
    throw googleError("JOB_CONTROL_DRIVE_DOWNLOAD_REJECTED", response, payload);
  }
  return Buffer.from(await response.arrayBuffer());
};

const base64url = (value) =>
  Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const cleanHeader = (value, max = 300) =>
  String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

const mimeMessage = ({ to, subject, body, filename, pdf }) => {
  const boundary = `job_control_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const attachment = pdf.toString("base64").replace(/.{1,76}/g, "$&\r\n");
  const text = [
    `From: Joanna Bach <hello@nosmo.tech>`,
    `Reply-To: Joanna Bach <Joanna94bach@gmail.com>`,
    `To: ${cleanHeader(to)}`,
    `Subject: ${cleanHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    String(body ?? ""),
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${cleanHeader(filename, 160)}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${cleanHeader(filename, 160)}"`,
    "",
    attachment,
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return base64url(text);
};

export const sendGmailApplication = async ({ to, subject, body, cvCode }, token = null) => {
  if (process.env.JOB_CONTROL_GMAIL_SEND_ENABLED !== "true") {
    throw new Error("JOB_CONTROL_GMAIL_SEND_DISABLED");
  }
  const cv = CV_FILES[cvCode];
  if (!cv) throw new Error("JOB_CONTROL_UNKNOWN_CV");
  const accessToken = token ?? await getAccessToken();
  const [meta, pdf] = await Promise.all([
    getDriveMetadata(cv.fileId, accessToken),
    downloadDriveFile(cv.fileId, accessToken),
  ]);
  if (meta?.trashed === true || meta?.mimeType !== "application/pdf") {
    throw new Error("JOB_CONTROL_CV_NOT_AVAILABLE");
  }
  const raw = mimeMessage({
    to,
    subject,
    body,
    filename: meta.name || `${cvCode}.pdf`,
    pdf,
  });
  const payload = await googleJson(`${GMAIL_API}/users/me/messages/send`, accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!payload?.id) throw new Error("JOB_CONTROL_GMAIL_CONFIRMATION_MISSING");
  return { messageId: payload.id, threadId: payload.threadId ?? null };
};

export const safeGoogleError = (error) => ({
  code:
    error && typeof error.code === "string" && /^JOB_CONTROL_[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : error instanceof Error && /^JOB_CONTROL_[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "JOB_CONTROL_GOOGLE_FAILURE",
  httpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
  providerReason:
    typeof error?.providerReason === "string" && /^[A-Z0-9_]{2,80}$/i.test(error.providerReason)
      ? error.providerReason
      : null,
});
