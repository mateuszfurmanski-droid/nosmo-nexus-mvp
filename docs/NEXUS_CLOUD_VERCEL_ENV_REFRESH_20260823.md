# Nexus Cloud Vercel environment refresh

Status date: 2026-08-27

Documentation-only refresh to trigger a new GitHub -> Vercel Preview deployment for `codex/nexus-cloud-vercel-staging-runtime` after the corrected staging OAuth secret was saved.

The e-SAFE Drive mapping remains server-side and `writeEnabled` remains false. This refresh exists only so PR #150 runtime inherits the latest Preview environment before a real OAuth + GET-only Google Drive capability probe.

No Google Drive write is enabled by this commit. No Project Memory mutation is performed. No production deployment or production database change is performed. PR #91 and all protected UI surfaces remain untouched.
