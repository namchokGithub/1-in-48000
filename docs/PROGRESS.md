# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

| #   | Step                           | Status      | Depends on |
| --- | ------------------------------ | ----------- | ---------- |
| 30  | Converted flow review          | Todo        | 31         |
| 31  | BO Flow board                  | In progress | 28         |
| 32  | BO Flow detail panel + preview | Todo        | 28, 31     |
| 33  | V4 Player check + test         | Todo        | 30, 32     |

V4 order: rules and engine with the story conversion first (27–28), then the validator (29), then the BO Flow editor (31–32) and the author's review of the converted flow (30), then Player check (33). Requirements source: `docs/REQUIREMENT-V4.md`. The production release is still deferred while the author makes further adjustments.

## Open decisions

None. V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).

Resolved choices are recorded in `docs/DECISIONS.md`.

Implementation details for completed steps are recorded in [`COMPLETE-LOG.md`](COMPLETE-LOG.md).

## 30. Converted flow review

**Status:** Todo

The one-time conversion moved into Step 28 so the game and tests keep working. This step is the author's review of the converted story on the BO Flow board.

- Review the converted order, conditional edges, random pools, Next Period nodes, and graduation endings on the board.
- Rearrange cards with auto layout; adjust edges where the mechanical conversion does not match the intended story.

**Done when:** the author accepts the converted flow in BO.

## 31. BO Flow board

**Status:** In progress — awaiting the author's visual check

- Left: event library with search and year/term filters; drag events onto the board.
- Center: board with pan, zoom, cards, and edges dragged from each choice handle.
- Cards show title, thumbnail, short text, and choices.
- Add Start, Condition, Random, Next Period, and Ending cards.
- Top toolbar: Undo/Redo, auto layout, validate, Preview, Save.
- Show validator errors and warnings on cards and edges (`validateV2Flow` returns both; only errors block saving today).

**Done when:** an author can build a branching path with a Condition and a Random node, save it, and play it in the Player page.

2026-10-29: Implemented and ready for visual review. A new "Flow เรื่อง" tab shows the event library (search, year, and period filters; drag or "วาง" to place), the React Flow board (pan, zoom, minimap, one handle per choice or fixed port, conditional edges dashed and labeled, cards colored by error or warning), and a right panel. The board toolbar adds Condition, Random, Next Period, and Ending cards, runs auto layout, and lists errors and warnings that focus their card. The page toolbar's Undo/Redo, Preview (selected event card), and Save (`flow.json`) work for the board. To meet the Done condition, the right panel already edits Condition join and conditions, Random pool, Ending choice, edge condition and edge order, and removes cards or edges; the event form gained a Pool field. Renaming an Event or Choice ID updates the board, and deleting an event removes its card. The Timeline view and its helpers were removed. The local writer now accepts `flow.json`. Focused tests cover the board editing logic and the flow writer. Save the events file before the flow when a new event is placed, because the writer validates the flow against the saved events.

## 32. BO Flow detail panel + preview

**Status:** Todo

Step 31 already added panel forms for Condition, Random, Ending, and edges.

- Right panel: edit the selected event card's details in the panel (reuse the event form) instead of switching to the Events tab.
- Engine trace for preview: path taken, state, and why each condition passed or failed (moved from Step 28).
- Preview highlights the real path with current state and condition pass/fail reasons.
- Preview of an event not yet placed on the board ends with a "No path" message today; give it a clear Thai message.

**Done when:** an event card can be edited from the panel and Preview shows the highlighted path with reasons.

## 33. V4 Player check + test

**Status:** Todo

- Confirm the Player runs on the flow engine with no visible regressions.
- Check story paths, random restore after refresh, program review, and endings.
- Check the BO Flow board on desktop.

**Done when:** V4 is accepted by the author. Release remains a separate, explicit request.
