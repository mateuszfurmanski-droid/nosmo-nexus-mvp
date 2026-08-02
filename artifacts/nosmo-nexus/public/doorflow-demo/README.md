# NOSMO DoorFlow — Riverside Heights Demo

Static, self-contained DoorFlow demonstrator connected from the canonical Nexus Menu.

## Included

- fictional Riverside Heights project;
- 15 synthetic doors across three levels;
- plan markers;
- searchable door schedule;
- Building Stack floor view;
- six workflow states;
- fire-door checklist;
- notes with local autosave;
- photo-evidence filename capture;
- fire-approval completion gate;
- responsive Android layout;
- route back to the Nexus Menu.

## Boundaries

- synthetic data only;
- no real client, project or personnel data;
- no API, authentication or Replit dependency;
- no PDF or Excel parsing in this static demonstrator;
- evidence files are not uploaded; only their filenames are retained locally;
- production DoorFlow source remains in `mateuszfurmanski-droid/nosmo-doorflow` and requires a separate migration of its API, authentication and document-processing services.

The static demo exists so the main Nexus application always contains a working DoorFlow experience while the full production module is migrated independently.
