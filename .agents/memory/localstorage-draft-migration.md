---
name: localStorage draft schema migration
description: Why localStorage-persisted drafts in the nosmo-nexus demo must be normalized on load.
---

# localStorage draft schema migration

Any feature that persists user drafts to `localStorage` and later renders them must normalize/migrate each parsed entry into the current shape *before* rendering — do not trust the stored shape.

**Why:** The frontend-only demo evolves page schemas in place (e.g. Card Maker drafts went from flat fields to a `participations[]` array). A `try/catch` around `JSON.parse` only guards malformed JSON, not shape drift: an older draft missing a now-required array/field throws at render (e.g. `d.participations.filter(...)` on `undefined`) and white-screens the whole page.

**How to apply:** On load, check `Array.isArray`, coerce every field with a typed default, regenerate missing `id`s, default invalid enum values (availability/visibility), and ensure array fields always exist. Apply the same normalization when loading a single draft into the editor. The same risk applies to every future localStorage-backed feature in this artifact.
