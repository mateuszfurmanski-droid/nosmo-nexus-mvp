import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(
  scriptDirectory,
  "../../artifacts/nosmo-nexus/dist/public",
);
const port = Number(process.env.PORT ?? "3000");

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
]);

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
}

function isInsidePublicDirectory(filePath) {
  return (
    filePath === publicDirectory ||
    filePath.startsWith(`${publicDirectory}${path.sep}`)
  );
}

async function existingFile(filePath) {
  try {
    const details = await stat(filePath);
    return details.isFile();
  } catch {
    return false;
  }
}

async function resolveRequestFile(pathname) {
  const requestedPath = path.resolve(publicDirectory, `.${pathname}`);

  if (!isInsidePublicDirectory(requestedPath)) {
    return null;
  }

  if (await existingFile(requestedPath)) {
    return requestedPath;
  }

  const directoryIndex = path.join(requestedPath, "index.html");
  if (await existingFile(directoryIndex)) {
    return directoryIndex;
  }

  // Client-side routes such as /workspace and /safety-connector must return
  // the SPA shell. Missing files with an extension remain genuine 404s.
  if (!path.extname(pathname)) {
    const appShell = path.join(publicDirectory, "index.html");
    if (await existingFile(appShell)) {
      return appShell;
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response);

  if (request.url === "/health") {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ status: "ok", service: "nosmo-nexus-web" }));
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad Request");
    return;
  }

  const filePath = await resolveRequestFile(pathname);
  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension) ?? "application/octet-stream";
  const cacheControl =
    extension === ".html"
      ? "no-cache"
      : "public, max-age=31536000, immutable";

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    response.end("Internal Server Error");
  });
  stream.pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`NOSMO Nexus web server listening on 0.0.0.0:${port}`);
  console.log(`Serving ${publicDirectory}`);
});
