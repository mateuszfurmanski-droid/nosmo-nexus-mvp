# NOSMO Fire Door Register & Inspection Demo

Self-contained, mobile-first synthetic demonstrator for a fire-door register that can operate without a PDF plan or Excel schedule.

## Route

`/fire-door-register-demo/`

## Included

- manual Fire Door Card creation;
- unique Door ID protection;
- site, building, level, location, rating and configuration fields;
- responsible person, certificate reference, notes and inspection dates;
- register search and status filters;
- registered, approved, issue and inspection-due totals;
- local status updates;
- Inspect Existing Door, Install New Door and Replace Existing Door process selection;
- ten saveable process sectors;
- Previous, Next and direct sector navigation;
- Save & Exit and resume;
- Finish validation linking back to missing sectors;
- process completion updating the register outcome;
- local JSON export;
- local browser persistence.

## Integrity boundary

- fictional Riverside Heights data only;
- no production credentials;
- no backend or cross-device synchronisation;
- no PDF or Excel parsing;
- no claim of regulatory certification;
- local browser storage only.

The production-oriented implementation is developed separately in `mateuszfurmanski-droid/nosmo-doorflow` draft PR #27.