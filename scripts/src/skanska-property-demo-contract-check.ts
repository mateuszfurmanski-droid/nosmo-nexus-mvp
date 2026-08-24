import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assets,
  companies,
  floors,
  materials,
  people,
  sourceSystems,
  spaces,
} from "../../artifacts/nosmo-nexus/src/skanska-property-demo/data";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SKANSKA Property demo contract failed: ${message}`);
}

function unique(ids: string[], label: string) {
  assert(new Set(ids).size === ids.length, `${label} IDs must be unique`);
}

unique(floors.map((item) => item.id), "floor");
unique(spaces.map((item) => item.id), "space");
unique(assets.map((item) => item.id), "asset");
unique(companies.map((item) => item.id), "company");
unique(people.map((item) => item.id), "person");
unique(materials.map((item) => item.id), "material");

assert(floors.length >= 3, "fixture requires at least 3 floors");
assert(spaces.length >= 5, "fixture requires at least 5 spaces");
assert(assets.length >= 8, "fixture requires at least 8 assets");
assert(companies.length >= 3, "fixture requires at least 3 companies");
assert(people.length >= 5, "fixture requires at least 5 people");

const floorIds = new Set(floors.map((item) => item.id));
const spaceById = new Map(spaces.map((item) => [item.id, item]));
const companyIds = new Set(companies.map((item) => item.id));
const peopleById = new Map(people.map((item) => [item.id, item]));
const materialIds = new Set(materials.map((item) => item.id));

for (const space of spaces) {
  assert(floorIds.has(space.floorId), `space ${space.id} references missing floor ${space.floorId}`);
}

for (const person of people) {
  assert(companyIds.has(person.companyId), `person ${person.id} references missing company ${person.companyId}`);
}

for (const asset of assets) {
  assert(asset.provenance === "SYNTHETIC_DEMO", `asset ${asset.id} must remain SYNTHETIC_DEMO`);
  assert(floorIds.has(asset.floorId), `asset ${asset.id} references missing floor ${asset.floorId}`);
  const space = spaceById.get(asset.spaceId);
  assert(space, `asset ${asset.id} references missing space ${asset.spaceId}`);
  assert(space.floorId === asset.floorId, `asset ${asset.id} floor/space relationship is inconsistent`);
  assert(companyIds.has(asset.installerCompanyId), `asset ${asset.id} installer company is missing`);
  assert(companyIds.has(asset.serviceCompanyId), `asset ${asset.id} service company is missing`);
  assert(peopleById.has(asset.installerPersonId), `asset ${asset.id} installer person is missing`);
  assert(peopleById.has(asset.fmOwnerPersonId), `asset ${asset.id} FM owner is missing`);
  assert(asset.materialIds.length > 0, `asset ${asset.id} requires at least one material relation`);
  for (const materialId of asset.materialIds) {
    assert(materialIds.has(materialId), `asset ${asset.id} references missing material ${materialId}`);
  }
  for (const event of asset.history) {
    if (event.personId) assert(peopleById.has(event.personId), `event ${event.id} references missing person ${event.personId}`);
    if (event.companyId) assert(companyIds.has(event.companyId), `event ${event.id} references missing company ${event.companyId}`);
  }
}

for (const material of materials) {
  assert(material.provenance === "SYNTHETIC_DEMO", `material ${material.id} must remain SYNTHETIC_DEMO`);
}

const workflowAsset = assets.find((asset) => asset.id === "asset-ahu-04");
assert(workflowAsset, "AHU-04 workflow asset is required");
assert(workflowAsset.tag === "AHU-04", "primary workflow asset tag must remain AHU-04");
assert(workflowAsset.issue, "AHU-04 requires an active issue");
assert(workflowAsset.issue.severity === "HIGH", "AHU-04 issue must remain HIGH for the demo story");
assert(workflowAsset.issue.checklist.length >= 5, "AHU-04 Work Mode requires a substantive checklist");
assert(workflowAsset.issue.requiredEvidence.length >= 4, "AHU-04 requires checklist/photo/completion evidence");
assert(workflowAsset.replacement, "AHU-04 requires a replacement case");
assert(/reuse|compatible|another/i.test(workflowAsset.replacement.reuseOpportunity), "AHU-04 requires a credible cross-project reuse opportunity");
assert(/No fabricated kgCO₂e/i.test(workflowAsset.replacement.co2Statement), "carbon boundary must explicitly reject fabricated kgCO₂e");

const activeIssues = assets.filter((asset) => asset.issue).length;
const replacementCases = assets.filter((asset) => asset.replacement).length;
assert(activeIssues >= 1, "fixture requires at least one active issue");
assert(replacementCases >= 1, "fixture requires at least one replacement case");

const requiredSourceIds = ["source-bim", "source-cafm", "source-drive", "source-work-wallet", "source-fabstation", "source-lca"];
for (const id of requiredSourceIds) {
  assert(sourceSystems.some((source) => source.id === id), `source-system layer is missing ${id}`);
}
assert(sourceSystems.every((source) => !/LIVE API|VENDOR APPROVED/i.test(source.status)), "demo must not imply unverified live vendor/API capability");

const here = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(here, "../../artifacts/nosmo-nexus/src/skanska-property-demo/SkanskaPropertyDemo.tsx");
const cssPath = path.resolve(here, "../../artifacts/nosmo-nexus/src/skanska-property-demo/skanska-property-demo.css");
const component = fs.readFileSync(componentPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

for (const marker of [
  '"issue", "task", "work", "evidence", "approved", "updated", "reuse", "esg"',
  "What do we know about this asset?",
  "Finish · send evidence to Object Card",
  "Approve evidence",
  "Update Object Card + Building Graph",
  "Confirm route + create ESG evidence",
  "Reset demo workflow",
]) {
  assert(component.includes(marker), `workflow UI marker missing: ${marker}`);
}

assert(component.includes("disabled={!workflowComplete}"), "Finish must remain gated by checklist and evidence completion");
assert(component.includes("evidenceCount >= 2"), "Work Mode must require two photo-evidence records");
assert(/@media\s*\(/.test(css), "commercial demo CSS requires responsive breakpoints");

console.log(
  JSON.stringify(
    {
      result: "PASS",
      floors: floors.length,
      spaces: spaces.length,
      assets: assets.length,
      companies: companies.length,
      people: people.length,
      materials: materials.length,
      activeIssues,
      replacementCases,
      sources: sourceSystems.length,
      workflowAsset: workflowAsset.tag,
    },
    null,
    2,
  ),
);
