# Real IFC Validation Status

## Automated

Validated product head before browser-smoke status update: `b4e33ac87646b3aa96c257d2663d9038b1f37693`.

- Validate and Build #398 / run `31483346902` — SUCCESS;
- dependency installation — PASS;
- workspace TypeScript typecheck — PASS;
- production build — PASS;
- production route / Work Wallet API smoke — PASS;
- build artifact upload — PASS;
- secure backup #295 / run `31483346936` — SUCCESS.

## Browser smoke

PARTIAL PASS on downloaded GitHub Actions build artifact `nosmo-nexus-web`.

Environment:

- artifact: `nosmo-nexus-web`;
- artifact digest: `sha256:08fe1ef68fac6818d65f66ff36302e9949e797ec812eccd54538d1ecb7f87116`;
- served locally from the artifact with SPA fallback;
- Chromium managed URL blocklist was removed inside the disposable sandbox before local smoke execution.

Observed:

- `/bim-overlay?trade=electrical&object=NXS-MEP-003` rendered the shared BIM Object Card;
- file input exists with accept value `.ifc,text/plain`;
- without a mapped IFC object, the validation harness remains blocked as intended;
- synthetic STEP IFC smoke file `nexus_smoke_electrical.ifc` loaded in the browser;
- synthetic `IFCCABLECARRIERSEGMENT` GlobalId `0CABLETRAYSMOKE0000001` was mapped to `NXS-MEP-003`;
- UI showed `LOCAL IFC ID MAPPED`;
- `nexus-real-ifc-validation/v1` remained visible in the harness;
- identity, geometry, source-data and SpatialConnector gates moved to `READY FOR MANUAL CHECK` where local evidence was sufficient;
- external Google Fonts failed to resolve in the sandbox, but the application still rendered and the BIM validation UI functioned.

Boundary:

- this browser smoke used a synthetic IFC file, not a representative project IFC;
- this does not establish trusted-viewer geometry comparison PASS;
- this does not establish trusted-viewer Pset/type/material comparison PASS;
- this does not establish Android/Samsung Fold PASS;
- this does not establish coordinate/survey/tolerance PASS;
- this does not establish real FabStation or spatial partner hand-off PASS.

## Manual

NOT VALIDATED:

- representative real IFC model;
- two real IFC revisions;
- trusted IFC viewer geometry comparison;
- trusted IFC viewer Pset/type/material comparison;
- coordinate comparison against authorised project/survey basis;
- Android/Samsung Fold interaction;
- real FabStation or other spatial partner hand-off.

## Rule

Do not convert any item above to PASS unless the manual evidence is attached or recorded in the relevant review notes. Automated CI and synthetic browser smoke do not establish real-browser/device, real IFC, trusted viewer, coordinate, survey, tolerance or partner PASS.