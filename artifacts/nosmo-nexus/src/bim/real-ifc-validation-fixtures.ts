import { installationPilots } from "./installation-pilots";
import { createRealIfcValidationProtocol } from "./real-ifc-validation";

export const syntheticRealIfcValidationProtocolFixtures = installationPilots.map((pilot) =>
  createRealIfcValidationProtocol({ pilot }),
);

export function assertRealIfcValidationProtocolFixtures() {
  for (const fixture of syntheticRealIfcValidationProtocolFixtures) {
    if (fixture.schema !== "nexus-real-ifc-validation/v1") {
      throw new Error(`Invalid real IFC validation schema for ${fixture.nexusObjectId}`);
    }

    if (fixture.source.mappedIfcGlobalId) {
      throw new Error(`Synthetic fixture must not claim mapped IFC GlobalId for ${fixture.nexusObjectId}`);
    }

    if (fixture.summary.blocked < 1) {
      throw new Error(`Synthetic fixture must remain blocked until a real IFC is loaded for ${fixture.nexusObjectId}`);
    }
  }
}

assertRealIfcValidationProtocolFixtures();
