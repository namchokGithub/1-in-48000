# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

V4 (Steps 27–36) was accepted by the author on 2026-10-29.

Steps 37–41 were accepted by the author on 2026-10-30, and Steps 42–43 on 2026-11-02. No steps are open.

Years 5–8 story content is complete across all four periods of each year, including the Year 6 and Year 8 reviews. Six-year programs have their own Years 5–6 story with faculty scenes for medicine, pharmacy, dentistry, and nautical science; its scenes still use `campus_orientation` until faculty images are ready. The production release is still deferred while the author makes further adjustments (see `README.md`).

| Item                                        | Status      | Notes                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-release stat balance                    | In progress | With stat modifiers, stat endings, and per-period changes set in `config.json`, random play graduates in about 63% of runs (65% four-year, 48% six-year) and 18–41% of runs reach the extended years (`pnpm balance --runs 500 --seed 100`, 2026-11-07, study −10 at each break and summer). The author is still tuning content and rules. |
| Faculty scene images for the six-year story | Todo        | Eight faculty scenes (`six_y5_term1_*`, `six_y6_term2_*` with `_med_`, `_pharm_`, `_dent_`, `_naut_`) need their own images.                                                                                                                                                                                                               |

Added on 2026-11-04 to 2026-11-07, all `Done`: the BO proofread tab, grade point average at the ending, debt floored at 0, hiding stat changes under choices (per event and per player), the six-year Years 5–6 story, the balance simulation tool, stat modifiers and stat endings, and BO Story Flow tools (event filters, Simulation shortcuts, card counts, Sub Flow menu and locking, helper lines, equal spacing guides, faster dragging).

## Open decisions

No open decisions. The loan rules for 40.3 are recorded in `docs/DECISIONS.md` ("Automatic loans as negative money").

V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).
- Privacy policy and terms pages (not scheduled). The game keeps its save, theme, and music settings only in the browser's localStorage, has no accounts, and sends nothing to a server, so the author deferred these pages.

Resolved choices are recorded in `docs/DECISIONS.md`.

Implementation details for completed steps are recorded in [`COMPLETE-LOG.md`](COMPLETE-LOG.md).
