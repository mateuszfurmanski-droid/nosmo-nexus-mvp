export const realIfcValidationReadme = {
  schema: "nexus-real-ifc-validation/v1",
  purpose: "Manual validation harness for representative IFC, trusted viewer and SpatialConnector boundary checks.",
  automatedPassDoesNotProve: [
    "real IFC correctness",
    "real-browser Full WASM runtime",
    "trusted viewer match",
    "Android/Samsung Fold interaction",
    "survey or tolerance validation",
    "real FabStation or spatial partner integration",
  ],
} as const;
