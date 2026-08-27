import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "job_control_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const safeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

const sessionSecret = () => {
  const value = process.env.JOB_CONTROL_SESSION_SECRET?.trim();
  if (!value || value.length < 24) throw new Error("JOB_CONTROL_SESSION_SECRET_NOT_CONFIGURED");
  return value;
};

const expectedAccessHash = () => {
  const value = process.env.JOB_CONTROL_ACCESS_CODE_HASH?.trim().toLowerCase();
  if (!value || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("JOB_CONTROL_ACCESS_CODE_HASH_NOT_CONFIGURED");
  }
  return value;
};

const sign = (payload) =>
  createHmac("sha256", sessionSecret()).update(payload, "utf8").digest("base64url");

export const authConfigured = () => {
  try {
    sessionSecret();
    expectedAccessHash();
    return true;
  } catch {
    return false;
  }
};

export const verifyAccessCode = (code) => {
  if (typeof code !== "string" || code.length < 4 || code.length > 128) return false;
  return safeEqual(sha256(code), expectedAccessHash());
};

export const createSessionCookie = () => {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `joanna:${expiresAt}`;
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
};

export const clearSessionCookie = () =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

const cookieValue = (req) => {
  const raw = req.headers.cookie ?? "";
  const item = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? item.slice(COOKIE_NAME.length + 1) : null;
};

export const hasValidSession = (req) => {
  try {
    const token = cookieValue(req);
    if (!token) return false;
    const [payloadEncoded, signature] = token.split(".");
    if (!payloadEncoded || !signature) return false;
    const payload = Buffer.from(payloadEncoded, "base64url").toString("utf8");
    const [subject, expiryRaw] = payload.split(":");
    if (subject !== "joanna") return false;
    const expiry = Number(expiryRaw);
    if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) return false;
    return safeEqual(signature, sign(payload));
  } catch {
    return false;
  }
};

export const requireSession = (req, res) => {
  if (!authConfigured()) {
    res.status(503).json({ ok: false, code: "AUTH_NOT_CONFIGURED" });
    return false;
  }
  if (!hasValidSession(req)) {
    res.status(401).json({ ok: false, code: "AUTH_REQUIRED" });
    return false;
  }
  return true;
};
