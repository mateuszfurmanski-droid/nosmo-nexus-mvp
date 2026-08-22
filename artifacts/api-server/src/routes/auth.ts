import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { ensureWorkspace } from "../lib/workspace";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const MOBILE_AUTH_FLOW_COOKIE = "nexus_mobile_auth_flow";
const MOBILE_AUTH_STATE_COOKIE = "nexus_mobile_auth_state";
const MOBILE_AUTH_FLOW = "android-work-mode-v1";
const MOBILE_AUTH_CALLBACK = "nosmo-nexus-workmode://auth-result";
const PKCE_S256_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const OIDC_CORRELATION_PATTERN = /^[A-Za-z0-9._~-]{32,128}$/;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getOidcCallbackUrl(req: Request): string {
  return `${getOrigin(req)}/api/callback`;
}

function isSameOrigin(req: Request): boolean {
  const expected = getOrigin(req);
  const origin = req.headers["origin"];
  if (origin) {
    return origin === expected;
  }
  // Fall back to Referer when Origin is absent (e.g. same-origin navigations).
  const referer = req.headers["referer"];
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }
  // No Origin or Referer — reject to be safe.
  return false;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function clearBrowserOidcCookies(res: Response): void {
  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });
}

function clearMobileAuthCookies(res: Response): void {
  res.clearCookie(MOBILE_AUTH_FLOW_COOKIE, { path: "/" });
  res.clearCookie(MOBILE_AUTH_STATE_COOKIE, { path: "/" });
}

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

function mobileAuthReturnUrl(input: {
  status: "AUTHORIZATION_CODE" | "FAILED";
  code?: string;
  state?: string;
  error?: string;
}): string {
  const url = new URL(MOBILE_AUTH_CALLBACK);
  url.searchParams.set("status", input.status);
  if (input.code) url.searchParams.set("code", input.code);
  if (input.state) url.searchParams.set("state", input.state);
  if (input.error) url.searchParams.set("error", input.error);
  return url.toString();
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  // Create the user's workspace (and starter project) on first login.
  await ensureWorkspace(user.id, user.firstName);
  return user;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = getOidcCallbackUrl(req);

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  clearMobileAuthCookies(res);
  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

/**
 * Start native Android OIDC without registering a second provider redirect URI.
 *
 * Android owns the PKCE verifier and sends only its S256 challenge plus fresh
 * state/nonce. The provider still redirects to the existing HTTPS /api/callback.
 * That callback forwards the short-lived, PKCE-bound authorization code to the
 * fixed Android deep link. No Nexus session ID or provider token enters a URL.
 */
router.get("/mobile-auth/start", async (req: Request, res: Response) => {
  const codeChallenge = queryString(req.query.code_challenge);
  const state = queryString(req.query.state);
  const nonce = queryString(req.query.nonce);
  const callbackUrl = getOidcCallbackUrl(req);

  if (
    !callbackUrl.startsWith("https://") ||
    !codeChallenge ||
    !PKCE_S256_PATTERN.test(codeChallenge) ||
    !state ||
    !OIDC_CORRELATION_PATTERN.test(state) ||
    !nonce ||
    !OIDC_CORRELATION_PATTERN.test(nonce)
  ) {
    res.status(400).json({ error: "NEXUS_MOBILE_AUTH_START_INVALID" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    clearBrowserOidcCookies(res);
    setOidcCookie(res, MOBILE_AUTH_FLOW_COOKIE, MOBILE_AUTH_FLOW);
    setOidcCookie(res, MOBILE_AUTH_STATE_COOKIE, state);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(redirectTo.href);
  } catch (err) {
    req.log.error({ err }, "Mobile auth bootstrap unavailable");
    res.status(503).json({ error: "NEXUS_MOBILE_AUTH_START_UNAVAILABLE" });
  }
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const callbackUrl = getOidcCallbackUrl(req);
  const mobileFlow = req.cookies?.[MOBILE_AUTH_FLOW_COOKIE];

  if (mobileFlow === MOBILE_AUTH_FLOW) {
    const expectedState = req.cookies?.[MOBILE_AUTH_STATE_COOKIE];
    const state = queryString(req.query.state);
    const code = queryString(req.query.code);
    clearMobileAuthCookies(res);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");

    if (!expectedState || !state || state !== expectedState || !code) {
      res.redirect(
        mobileAuthReturnUrl({
          status: "FAILED",
          error: "MOBILE_AUTH_CALLBACK_REJECTED",
        }),
      );
      return;
    }

    res.redirect(
      mobileAuthReturnUrl({
        status: "AUTHORIZATION_CODE",
        code,
        state,
      }),
    );
    return;
  }

  const config = await getOidcConfig();
  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);
  clearBrowserOidcCookies(res);

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.post("/logout", async (req: Request, res: Response) => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.json({ redirectUrl: endSessionUrl.href });
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;
    const expectedRedirectUri = getOidcCallbackUrl(req);
    if (
      !expectedRedirectUri.startsWith("https://") ||
      redirect_uri !== expectedRedirectUri
    ) {
      res.status(400).json({ error: "NEXUS_MOBILE_AUTH_REDIRECT_MISMATCH" });
      return;
    }

    try {
      const config = await getOidcConfig();

      const callbackUrl = new URL(expectedRedirectUri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.setHeader("Cache-Control", "no-store");
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
