# Real IFC Validation Status

## Automated

Validated product head: `ef6e9a6666c2f3133fbb0840bb2ebbd833ee28ac`.

- Validate and Build #397 / run `31483255554` — SUCCESS;
- dependency installation — PASS;
- workspace TypeScript typecheck — PASS;
- production build — PASS;
- production route / Work Wallet API smoke — PASS;
- build artifact upload — PASS;
- secure backup #294 / run `31483255553` — SUCCESS.

## Manual

NOT VALIDATED:

- representative real IFC model;
- two real IFC revisions;
- real-browser Full WASM execution;
- Android/Samsung Fold interaction;
- trusted IFC viewer geometry comparison;
- trusted IFC viewer Pset/type/material comparison;
- coordinate comparison against authorised project/survey basis;
- real FabStation or other spatial partner hand-off.

## Rule

Do not convert any item above to PASS unless the manual evidence is attached or recorded in the relevant review notes. Automated CI does not establish real-browser/device, real IFC, trusted viewer, coordinate, survey, tolerance or partner PASS.