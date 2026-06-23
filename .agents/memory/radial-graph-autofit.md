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
  scaling. **Why:** on short viewports radii that shrink with height (while
  cluster pixel-heights are fixed) collapse the top cluster into the centre.
  **How to apply:** separation must come from height-independent radii *floors*
  big enough to clear the tallest cluster; let fit-scale only fit afterwards.
  Don't lower the floors to "make it smaller" — raise them and let scale
  compensate.

- **Fit-scale may scale UP, not only down** (`maxScale = compact?1.12:1.3`,
  capping the `min(maxScale, availHalfW/halfW, availHalfH/halfH)`). **Why:** a
  wide/short viewport whose content is smaller than the box used to sit marooned
  in the centre with huge empty bands; capping at 1 forbade filling. **How to
  apply:** the `min()` still keeps the *measured* box inside the container, but
  hover/drag/ring CSS transforms aren't in `offsetWidth` — leave the static pad
  to absorb them; don't tighten pad to 0.

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

- **Layout is aspect-driven, not width-driven: 3 modes off `aspect = w/h`.**
  `portrait` (aspect<1) = tall diamond + single-column doc/task stacks
  (`DocStack vertical`), big RY → fills height. `wideShort` (aspect>=1.7, phone
  landscape) = FLAT left/right spread, small RY, wide RX → fills a short wide
  strip without the tall task column forcing a tiny scale. `balanced` (the rest,
  tablet/desktop) = wide diamond (docs botLeft / tasks botRight) so it fills
  height too instead of a mid-height band with a bottom void. **Why:** pure
  width breakpoints can't tell desktop (1.6, wants a tall diamond) from phone
  landscape (2.16, wants a flat strip); both are "wide" but need opposite shapes.
  **How to apply:** keep docs left-ish / tasks right-ish / people top; in
  `wideShort` tasks take pure-right ONLY when no Issues cluster (Issues own
  pure-right, else tasks overlap them). `compact = w<768` still drives node
  sizes + radii floors.
