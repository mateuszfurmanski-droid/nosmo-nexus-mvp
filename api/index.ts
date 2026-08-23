import app from "../artifacts/api-server/src/vercel-cloud-staging";

// Vercel accepts an Express application as a Node function handler. The app is
// deliberately the narrow Cloud-only staging adapter, not the full UI runtime.
export default app;
