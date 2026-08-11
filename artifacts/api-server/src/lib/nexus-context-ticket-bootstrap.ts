import crypto from "node:crypto";
import type { Response } from "express";
import { isSafeExternalRecordReference } from "./nexus-context-ticket";
import { parseContextTicketAllowedOrigins } from "./nexus-context-ticket-origin";
import { isSafeNexusProjectId } from "./nexus-project-access-policy";

const EXTENSION_ID = /^[a-p]{32}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{16,96}$/;

export type ContextTicketBootstrapRequest = {
  adapterId: "work-wallet";
  projectId: string;
  externalRecordReference: string;
  extensionId: string;
  requestId: string;
};

export function parseContextTicketBootstrapRequest(
  query: Record<string, unknown>,
): ContextTicketBootstrapRequest | null {
  const value = (key: string): string | null => {
    const raw = query[key];
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  };

  const adapterId = value("adapterId");
  const projectId = value("projectId");
  const externalRecordReference = value("externalRecordReference");
  const extensionId = value("extensionId");
  const requestId = value("requestId");

  if (
    adapterId !== "work-wallet" ||
    !projectId ||
    !isSafeNexusProjectId(projectId) ||
    !externalRecordReference ||
    !isSafeExternalRecordReference(externalRecordReference) ||
    !extensionId ||
    !EXTENSION_ID.test(extensionId) ||
    !requestId ||
    !REQUEST_ID.test(requestId)
  ) {
    return null;
  }

  const extensionOrigin = `chrome-extension://${extensionId}`;
  if (!parseContextTicketAllowedOrigins().has(extensionOrigin)) {
    return null;
  }

  return {
    adapterId: "work-wallet",
    projectId,
    externalRecordReference,
    extensionId,
    requestId,
  };
}

export function buildContextTicketBootstrapReturnTo(
  request: ContextTicketBootstrapRequest,
): string {
  const query = new URLSearchParams({
    adapterId: request.adapterId,
    projectId: request.projectId,
    externalRecordReference: request.externalRecordReference,
    extensionId: request.extensionId,
    requestId: request.requestId,
  });
  return `/api/nexus/context-tickets/bootstrap?${query.toString()}`;
}

function jsString(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function sendContextTicketBootstrapPage(
  res: Response,
  request: ContextTicketBootstrapRequest,
): void {
  const nonce = crypto.randomBytes(18).toString("base64");

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  );

  const adapterId = jsString(request.adapterId);
  const projectId = jsString(request.projectId);
  const externalRecordReference = jsString(request.externalRecordReference);
  const extensionId = jsString(request.extensionId);
  const requestId = jsString(request.requestId);

  res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nexus Connector Authorisation</title>
<style nonce="${nonce}">
  :root{font-family:Inter,system-ui,sans-serif;color:#e8eef3;background:#101820;color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
  main{width:min(440px,100%);border:1px solid #30404c;border-radius:16px;background:#17232c;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,.3)}
  h1{font-size:20px;margin:0 0 10px}p{line-height:1.5;color:#aebdc8}code{font-size:12px;color:#dbe7ef}#status{margin-top:18px;padding:12px;border-radius:10px;background:#0f171d;color:#dce7ed}
</style>
</head>
<body>
<main>
  <h1>Nexus connector authorisation</h1>
  <p>Nexus is authorising one short-lived, read-only connector context for this browser extension.</p>
  <p>Project: <code>${request.projectId}</code><br>Record: <code>${request.externalRecordReference}</code></p>
  <div id="status">Authorising…</div>
</main>
<script nonce="${nonce}">
(() => {
  const adapterId = ${adapterId};
  const projectId = ${projectId};
  const externalRecordReference = ${externalRecordReference};
  const extensionId = ${extensionId};
  const requestId = ${requestId};
  const status = document.getElementById("status");

  const fail = (message) => {
    status.textContent = message;
  };

  const run = async () => {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      fail("The approved Nexus extension is not available in this browser.");
      return;
    }

    let issued;
    try {
      const response = await fetch("/api/nexus/context-tickets", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterId, projectId, externalRecordReference })
      });
      issued = await response.json().catch(() => null);
      if (!response.ok || !issued || typeof issued.ticket !== "string" || issued.ticket.length !== 43) {
        fail("Nexus could not authorise this connector context.");
        return;
      }
    } catch {
      fail("Nexus could not reach the connector authorisation service.");
      return;
    }

    const message = {
      type: "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1",
      requestId,
      projectId,
      externalRecordReference,
      ticket: issued.ticket,
      expiresAt: issued.expiresAt
    };
    delete issued.ticket;

    chrome.runtime.sendMessage(extensionId, message, (response) => {
      message.ticket = "";
      if (chrome.runtime.lastError || !response?.ok) {
        fail("The Nexus extension did not accept the short-lived context ticket.");
        return;
      }
      status.textContent = "Authorised. You can return to Work Wallet.";
      setTimeout(() => window.close(), 450);
    });
  };

  void run();
})();
</script>
</body>
</html>`);
}
