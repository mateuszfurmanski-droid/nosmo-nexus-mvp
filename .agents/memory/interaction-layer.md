---
name: NOSMO interaction layer
description: Rules for the keyboard/drag "desktop-like" interaction layer on the `/` node workspace demo.
---

# NOSMO interaction layer (`/` node workspace)

The `/` demo (interactive-workspace.tsx) has a UI-local interaction layer: selection,
"context" set, context links, and focus history. It powers arrow-key spatial nav,
Enter=focus, Space=add/remove context, Backspace=remove-from-context else go-back,
and HTML5 drag (node→node = connect+add-to-context, node→empty = remove-from-context).

## Rule: interaction gestures must stay UI-local — never write to the business/activity stream
`connectNodes()` (and the rest of the interaction layer) must NOT call `logEvent`.
**Why:** the user's hard constraint for this investor demo is "NO new business logic."
A connect/select/context gesture is transient UI state; logging it into the activity
timeline makes a UI gesture look like real workflow data. `logEvent` is reserved for the
pre-existing business interactions (assignment, supplies, issues, complete).
**How to apply:** when extending interaction controls, keep state session-only
(useState/useRef); do not persist and do not emit activity events.

## Rule: keyboard spatial nav depends on the `data-testid="tile-<id>"` contract
`moveSelection` finds navigable nodes by querying `[data-testid^='tile-']` and reading
their live `getBoundingClientRect()`, then scores `along + 2*across`. Every navigable
node (Tile, MicroNode/DocStack, taskflow row, center tile) must carry
`data-testid="tile-<id>"`, or arrow keys silently skip it.
**Why:** reading rendered geometry keeps the radial auto-layout the single source of
positioning — nav never recomputes/overrides layout.
**How to apply:** any new node-rendering component must set that data-testid, and the
single keydown effect reads fresh state via the `sel` useRef (deps `[]`).
