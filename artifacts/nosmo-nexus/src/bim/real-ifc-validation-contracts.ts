import { realIfcValidationBoundary } from "./real-ifc-validation-boundary";
import { realIfcValidationReadme } from "./real-ifc-validation-readme";

export const realIfcValidationContracts = {
  readme: realIfcValidationReadme,
  boundary: realIfcValidationBoundary,
} as const;
