# Nexus Cloud Vercel environment refresh

Status date: 2026-08-23

This documentation-only commit exists to trigger a fresh GitHub -> Vercel Preview deployment for branch `codex/nexus-cloud-vercel-staging-runtime` after the dedicated staging project received `NEXUS_IDENTITY_BINDING_MODE=postgres`.

The project-level environment variable was saved for Production and Preview. The immediate Vercel popup redeployed the older production probe slot, not PR #150. Therefore a fresh Git-triggered Preview is required so the repository-native `nexusCloudRouter` runtime inherits the updated project environment.

No Google Drive write is enabled by this commit. No Project Memory mutation is performed. PR #91 and all protected UI surfaces remain untouched.
