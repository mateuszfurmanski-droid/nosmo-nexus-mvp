import * as oidc from "openid-client";
import { Router, type IRouter, type Request } from "express";
import { getOidcConfig } from "../lib/auth";

const router: IRouter = Router();
const MOBILE_SCHEME = "nosmo-nexus-workmode";
const MOBILE_HOST = "auth-result";
const SAFE_TOKEN = /^[A-Za-z0-9_-]{32,256}$/;
const SAFE_CODE = /^[A-Za-z0-9._~+\/-]{1,4096}$/;

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function textQuery(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mobileResult(input: { status: string; code?: string; state?: string }): string {
  const url = new URL(`${MOBILE_SCHEME}://${MOBILE_HOST}`);
  url.searchParams.set("status", input.status);
  if (input.code) url.searchParams.set("code", input.code);
  if (input.state) url.searchParams.set("state", input.state);
  return url.toString();
}

/**
 * Android owns PKCE verifier/state/nonce. This endpoint only starts the provider
 * authorization request using the supplied S256 challenge and the same HTTPS
 * callback already used by browser auth. No mobile secret or session is created.
 */
router.get("/mobile-auth/start", async (req, res): Promise<void> => {
  const codeChallenge = textQuery(req.query.code_challenge);
  const state = textQuery(req.query.state);
  const nonce = textQuery(req.query.nonce);

  if (!SAFE_TOKEN.test(codeChallenge) || !SAFE_TOKEN.test(state) || !SAFE_TOKEN.test(nonce)) {
    res.status(400).json({ error: "Invalid mobile authorization parameters" });
    return;
  }

  const config = await getOidcConfig();
  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${getOrigin(req)}/api/callback`,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });
  res.redirect(redirectTo.href);
});

/**
 * Runs before the existing browser /callback handler. Browser auth has a
 * server-side code_verifier cookie and falls through unchanged. Mobile auth has
 * no such cookie: forward only authorization code + state to the registered
 * Android deep link. The app validates state and redeems the code with its PKCE
 * verifier through /mobile-auth/token-exchange.
 */
router.get("/callback", (req, res, next): void => {
  if (req.cookies?.code_verifier) {
    next();
    return;
  }

  const code = textQuery(req.query.code);
  const state = textQuery(req.query.state);
  const providerError = textQuery(req.query.error);

  if (providerError) {
    res.redirect(mobileResult({ status: "ERROR", state: SAFE_TOKEN.test(state) ? state : undefined }));
    return;
  }

  if (!SAFE_CODE.test(code) || !SAFE_TOKEN.test(state)) {
    next();
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.redirect(mobileResult({ status: "AUTHORIZATION_CODE", code, state }));
});

export default router;
