import app from "./vercel-core-staging";

const port = Number(process.env.PORT ?? 4317);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("INVALID_CORE_PORT");
const server = app.listen(port, "127.0.0.1", () => console.log(`NEXUS_P0_HTTP_READY port=${port}`));
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => server.close(() => process.exit(0)));
