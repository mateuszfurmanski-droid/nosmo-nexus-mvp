---
name: Radial graph auto-fit (InteractiveWorkspace)
description: Invariants for making the NOSMO radial graph (route "/") auto-fit one screen responsively without scroll or overlap.
---

# Radial graph auto-fit invariants

The `/` graph (`interactive-workspace.tsx`) scales the whole stage with a single
`transform: scale(fitScale)` to fit the viewport. A few constraints are easy to
get wrong:

- **Uniform fit-scale fits the bounding box only — it CANNOT undo internal
  overlap.** Scaling shrinks everything by the same ratio, so if a cluster
  overlaps the centre tile in unscaled coordinates, it still overlaps after
  scaling. **Why:** on short viewports the radii (`RX = max(floor, w*0.4)`,
  `RY = max(floor, h*0.33)`) shrank with height while cluster pixel-heights are
  fixed, so the top cluster collapsed into the centre. **How to apply:**
  separation must come from height-independent radii *floors* big enough to clear
  the tallest cluster; let fit-scale only shrink-to-fit afterwards. Don't lower
  the floors to "make it smaller" — raise them and let scale compensate.

- **Measure with `offsetWidth/offsetHeight` + `data-x/data-y`, never
  `getBoundingClientRect`.** offset* and the dataset target coords are immune to
  the stage's CSS transform and transition, so the bounding box is exact on the
  first frame and stays stable mid cluster-transition (no measure-at-scale-1
  flash, no feedback loop). Measure available space from the live graph container
  (`containerRef.clientWidth/Height`), not `window.inner*`.

- **`position: fixed` overlays must render OUTSIDE the scaled stage.** A
  transformed ancestor becomes the containing block for `fixed` children and
  re-scales them. ActionCard + context tray are siblings of the stage, not
  children.

- **Fit effect deps must include any state that adds/removes a cluster** (e.g.
  `issues.length` adds the right-side Issues group; `contextIds.length`), not
  just centre/size/collab — otherwise the box grows after an in-graph action and
  the graph overflows. Task assignee/stage/tier live inside fixed-width cards so
  they don't change the box.

- Breakpoints: `compact = w < 768` (matches Tailwind `md`, drives node sizes +
  radii floors); `narrow = w < 1024` (moves the project-centre Documents stack
  from bottom-left to the free LEFT zone so it can't collide with the
  bottom-centre task column on tablets/phones).
