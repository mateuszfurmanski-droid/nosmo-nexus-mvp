# IFC Smoke Fixture

Status: SYNTHETIC DEMO ONLY

This file documents the repeatable smoke fixture for the BIM / Real IFC Validation harness.

Fixture path:

- `artifacts/nosmo-nexus/public/fixtures/nexus_smoke_electrical.ifc`

Runtime URL in the built app:

- `/fixtures/nexus_smoke_electrical.ifc`

## Purpose

The fixture gives reviewers a deterministic browser-smoke file for the IFC mapper and `nexus-real-ifc-validation/v1` panel.

It is intentionally tiny and synthetic. It is not a representative project IFC and must never be used as evidence for real IFC validation, trusted viewer geometry/Pset comparison, Android/Samsung Fold behaviour, survey/coordinate/tolerance validation or FabStation/spatial partner hand-off.

## Expected smoke path

1. Open `/bim-overlay?trade=electrical&object=NXS-MEP-003`.
2. Download `/fixtures/nexus_smoke_electrical.ifc` from the synthetic fixture link in the IFC mapper.
3. Upload the fixture through `Open .ifc file`.
4. Map `IFCCABLECARRIERSEGMENT` GlobalId `0CABLETRAYSMOKE0000001` to `NXS-MEP-003`.
5. Confirm that the Object Card shows `LOCAL IFC ID MAPPED`.
6. Confirm that the Real IFC Validation Harness still shows `nexus-real-ifc-validation/v1`.
7. Confirm eligible gates move to `READY FOR MANUAL CHECK`, not real/project PASS.

## Boundary

- Synthetic fixture PASS means the local mapper and validation UI path can be exercised.
- Synthetic fixture PASS does not validate model correctness, authored coordinates, geometry fidelity, project lineage, Psets/type/material values, real browser Full WASM on representative IFC, mobile behaviour or partner integration.
