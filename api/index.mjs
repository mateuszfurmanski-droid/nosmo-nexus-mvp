import app from "../artifacts/api-server/dist/vercel-cloud-staging.mjs";

// The TypeScript source is validated by the repository compiler first, then
// bundled explicitly for Vercel. This entry stays JavaScript-only so Vercel
// does not reinterpret the monorepo with a second incompatible tsconfig.
export default app;
