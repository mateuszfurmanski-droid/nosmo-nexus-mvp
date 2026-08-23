export const snipePublicDemoSnapshot = {
  source: "snipe-it-official-public-develop-demo",
  sourceLabel: "Official Snipe-IT public develop demo",
  ephemeral: true,
  capturedAt: "2026-08-23T02:29:17.537Z",
  asset: {
    id: 2608,
    assetTag: "7052772301",
    name: "",
    model: "ZenBook UX310",
    category: "Laptops",
    manufacturer: "Asus",
    status: "Ready to Deploy",
    assignedTo: null,
    location: "Port Theresia",
  },
} as const;

export const snipePublicDemoAssetLabel =
  snipePublicDemoSnapshot.asset.name.trim() ||
  `${snipePublicDemoSnapshot.asset.manufacturer} ${snipePublicDemoSnapshot.asset.model}`;
