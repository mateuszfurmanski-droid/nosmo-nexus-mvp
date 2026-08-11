# Nexus Manager / Trade Shell contract

This slice is stacked on the canonical PR45 Relationship Tree source.

- Manager is the default shell view and can see all project modules.
- Trades inside Manager are profession filters over the same specialist modules, not duplicate applications.
- Trade view accepts `viewerRole="trade"` and `viewerTradeId` and exposes only tools for that assigned project trade.
- Files are grouped by trade at the shell-navigation level; `nexus:file-upload-request` carries `projectId`, `worldId` and `tradeId` to the File Loader boundary.
- Hiding navigation is not an authorization boundary. Production permissions must resolve authenticated Person Card + project functional role + project access.
- `PersistentWorkspace`, e-SAFE hydration, Timeline, pinch/drag/pan/glide and specialist workflow code are outside this slice.
- Preview publishing uses a source-native Vite build with `BASE_PATH=/apps/nexus-manager-preview/`.
