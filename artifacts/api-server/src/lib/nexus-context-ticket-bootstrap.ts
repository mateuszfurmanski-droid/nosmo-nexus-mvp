import crypto from "node:crypto";
import type { Response } from "express";
import { parseContextTicketAllowedOrigins } from "./nexus-context-ticket-origin";

const EXTENSION_ID = /^[a-p]{32}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{16,96}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export type ContextTicketBootstrapRequest = {
  adapterId: "work-wallet";
  projectId: string;
  worldId: string;
  connectorAccountId: string;
  externalObjectType: string;
  externalRecordReference: string;
  extensionId: string;
  requestId: string;
};

function safeString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function queryValue(query: Record<string, unknown>, key: string): string | null {
  const raw = query[key];
  return typeof raw === "string" ? raw.trim() || null : null;
}

export function parseContextTicketBootstrapRequest(
  query: Record<string, unknown>,
): ContextTicketBootstrapRequest | null {
  const adapterId = queryValue(query, "adapterId");
  const projectId = queryValue(query, "projectId");
  const worldId = queryValue(query, "worldId");
  const connectorAccountId = queryValue(query, "connectorAccountId");
  const externalObjectType = queryValue(query, "externalObjectType");
  const externalRecordReference = queryValue(query, "externalRecordReference");
  const extensionId = queryValue(query, "extensionId");
  const requestId = queryValue(query, "requestId");

  if (
    adapterId !== "work-wallet" ||
    !safeString(projectId, 160) ||
    !safeString(worldId, 160) ||
    !safeString(connectorAccountId, 160) ||
    !safeString(externalObjectType, 120) ||
    !safeString(externalRecordReference, 256) ||
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
    worldId,
    connectorAccountId,
    externalObjectType,
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
    worldId: request.worldId,
    connectorAccountId: request.connectorAccountId,
    externalObjectType: request.externalObjectType,
    externalRecordReference: request.externalRecordReference,
    extensionId: request.extensionId,
    requestId: request.requestId,
  });
  return `/api/nexus/context-tickets/work-wallet/bootstrap?${query.toString()}`;
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
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  );

  const projectId = jsString(request.projectId);
  const worldId = jsString(request.worldId);
  const connectorAccountId = jsString(request.connectorAccountId);
  const externalObjectType = jsString(request.externalObjectType);
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
  h1{font-size:20px;margin:0 0 10px}p{line-height:1.5;color:#aebdc8}code{font-size:12px;color:#dbe7ef;overflow-wrap:anywhere}#status{margin-top:18px;padding:12px;border-radius:10px;background:#0f171d;color:#dce7ed}
</style>
</head>
<body>
<main>
  <h1>Nexus connector authorisation</h1>
  <p>Nexus is authorising one short-lived, read-only connector context for the approved browser extension.</p>
  <p>Project: <code id="project"></code><br>Record: <code id="record"></code></p>
  <div id="status">Authorising…</div>
</main>
<script nonce="${nonce}">
(() => {
  const projectId = ${projectId};
  const worldId = ${worldId};
  const connectorAccountId = ${connectorAccountId};
  const externalObjectType = ${externalObjectType};
  const externalRecordReference = ${externalRecordReference};
  const extensionId = ${extensionId};
  const requestId = ${requestId};
  const status = document.getElementById("status");
  document.getElementById("project").textContent = projectId;
  document.getElementById("record").textContent = externalRecordReference;

  const fail = (message) => {
    status.textContent = message;
  };

  const run = async () => {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      fail("The approved Nexus extension is not available in this browser.");
      return;
    }

    let issued = null;
    let rawTicket = "";
    try {
      const response = await fetch("/api/nexus/context-tickets/work-wallet", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          worldId,
          connectorAccountId,
          externalObjectType,
          externalRecordReference
        })
      });
      issued = await response.json().catch(() => null);
      if (!response.ok || !issued || typeof issued.ticket !== "string" || issued.ticket.length !== 43) {
        fail("Nexus could not authorise this connector context.");
        return;
      }
      rawTicket = issued.ticket;
      delete issued.ticket;
    } catch {
      fail("Nexus could not reach the connector authorisation service.");
      return;
    }

    const message = {
      type: "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1",
      requestId,
      projectId,
      worldId,
      connectorAccountId,
      externalObjectType,
      externalRecordReference,
      ticket: rawTicket,
      expiresAt: issued.expiresAt
    };

    chrome.runtime.sendMessage(extensionId, message, (response) => {
      message.ticket = "";
      rawTicket = "";
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
