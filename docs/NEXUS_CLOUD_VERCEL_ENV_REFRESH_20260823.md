# Nexus Cloud Vercel environment refresh

Status date: 2026-08-27

This documentation-only commit triggers a fresh GitHub -> Vercel Preview deployment for branch `codex/nexus-cloud-vercel-staging-runtime` after the dedicated staging project received the corrected server-side `NEXUS_SECRET_GOOGLE_DRIVE_ESAFE_STAGING` credential in Preview scope.

The credential value is not stored in Git. The exact e-SAFE Drive mapping remains server-side and `writeEnabled` remains false. This refresh exists only so PR #150 runtime inherits the updated Preview secret for a real OAuth + GET-only Google Drive capability probe.

No Google Drive write is enabled by this commit. No Project Memory mutation is performed. No production deployment or production database change is performed. PR #91 and all protected UI surfaces remain untouched.
