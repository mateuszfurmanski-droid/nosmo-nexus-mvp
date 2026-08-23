# Nexus Cloud Vercel Git Connection

Status date: 2026-08-23

The dedicated non-production Vercel project `nosmo-nexus-cloud-staging` was connected to the private GitHub repository `mateuszfurmanski-droid/nosmo-nexus-mvp` after the repository-native staging adapter was prepared in PR #150.

This commit is intentionally documentation-only and exists to verify the GitHub -> Vercel Preview deployment trigger for branch `codex/nexus-cloud-vercel-staging-runtime`.

It does not enable Google Drive writes, does not change runtime authorization, does not alter Project Memory state, and does not touch any protected UI or PR #91 demo surface.
