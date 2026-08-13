# Canonical Relationship Tree Recovery

This draft exists to recover one readable, canonical Relationship Tree before further Cloud, Work Wallet or BIM UI expansion.

## Source of truth

- PR #15 gesture/layout engine remains the interaction baseline.
- PR #45 provides source-native e-SAFE Project World data hydration into the same `PersistentWorkspace`.
- PR #46 BIM/change-event expansion is deliberately excluded from this recovery slice.

## UI rule

One Project World screen may have:

1. one Nexus top project shell;
2. one Relationship Tree renderer;
3. optional project controls opened on demand.

It must not stack a second navigation strip, floating Timeline launcher, duplicate access toolbar or competing graph renderer over the tree.

## Project Worlds

Riverside and e-SAFE are different data inputs for the same Relationship Tree component. They are not separate graph implementations.

## Cloud boundary

Nexus Cloud / Google Drive remains storage + metadata + AssetLink infrastructure. It does not own Relationship Tree layout or add competing tree UI.

## Validation checkpoint

A fresh commit on this recovery branch is used to request a new GitHub Actions run after earlier jobs failed before checkout with `steps=null` / `BlobNotFound`. No product behaviour is changed by this checkpoint.
