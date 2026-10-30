# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

V4 (Steps 27–36) was accepted by the author on 2026-10-29.

No open implementation steps. Steps 37–38 were accepted by the author on 2026-10-30.

V4 order: rules and engine with the story conversion first (27–28), then the validator (29), then the BO Flow editor (31–32) and the author's review of the converted flow (30), then Player check (33). BO Flow board UX follows `docs/legacy/BO-UX-DESIGN.md`: layout first (34), then focus and readability (35) and undo/redo (36), which do not depend on each other. Requirements source: `docs/legacy/REQUIREMENT-V4.md`. The production release is still deferred while the author makes further adjustments.

## Open decisions

None. V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).

Resolved choices are recorded in `docs/DECISIONS.md`.

Implementation details for completed steps are recorded in [`COMPLETE-LOG.md`](COMPLETE-LOG.md).

## 37. BO Flow edge styles

**Status:** Done — accepted by the author on 2026-10-30

Group Flow board edges by meaning, derived from the source card type, port, and edge order; no content or schema change.

- Arrowheads on every edge.
- Groups: normal (choices, `next`, `after`), fallback (Random `fallback`, or an unconditional edge after a conditional one on the same port, labeled "สำรอง"), Condition pass and fail, and key (study review `graduate`/`extend` and edges into an Ending). Conditional edges stay dashed.
- Preview trace and focus styles win over group styles.
- Legend for edge groups next to the card colors.
- Loop (back-edge) styling is skipped for now.

**Done when:** the author can tell fallback, pass/fail, and key edges apart on the board.

2026-10-29: Implemented. `edgeStyle` returns the group and is covered by a focused test. Groups differ by width, dash, and a few dark colors, and arrowheads follow the trace and focus colors.

2026-10-30: The author accepted the visual check.

## 38. Player UX/UI pass

**Status:** Done — accepted by the author on 2026-10-30

Source: `docs/legacy/PLAY_UXUI_DESIGN.md`.

- 38.1 Fix `first_class.take_notes`: it scheduled an effect after `orientation`, which always comes first, so the choice always failed.
- 38.2 Player UI kit in `src/features/player/ui/` (custom select, checkbox, stat icon), separate from BO.
- 38.3 Home: remove the save card, add the campus art, fix the footer.
- 38.4 Create: preview the rolled name and portrait, stat icons, no outline on pointer select.
- 38.5 Play: 16:9 scene, full-body portrait, stat icons and order, custom selects, left-aligned choices and checkboxes with effect previews, confirm at the bottom, hidden scrollbar.
- 38.6 Ending: restart in the first card, no home button, a separate collapsible timeline grouped by year.
- 38.7 Responsive check at 360/390/768/1280px (in-app browsers such as LINE at 360px first).

**Done when:** the author accepts every page by eye at mobile and desktop widths.

2026-10-30: 38.1–38.6 implemented. Stat icons and the Home art moved to `src/features/player/assets/` (see `docs/DECISIONS.md`), Player-only CSS moved to `src/features/player/player.css`, and the custom select, checkbox, and effect list live in `src/features/player/ui/`. The author accepted the visual and responsive check in 38.7.
