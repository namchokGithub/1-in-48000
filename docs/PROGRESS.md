# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

| #   | Step                           | Status | Depends on |
| --- | ------------------------------ | ------ | ---------- |
| 29  | Flow validator                 | Todo   | 27         |
| 30  | Converted flow review          | Todo   | 31         |
| 31  | BO Flow board                  | Todo   | 29         |
| 32  | BO Flow detail panel + preview | Todo   | 28, 31     |
| 33  | V4 Player check + test         | Todo   | 30, 32     |

V4 order: rules and engine with the story conversion first (27–28), then the validator (29), then the BO Flow editor (31–32) and the author's review of the converted flow (30), then Player check (33). Requirements source: `docs/REQUIREMENT-V4.md`. The production release is still deferred while the author makes further adjustments.

## Open decisions

None. V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).

Resolved choices are recorded in `docs/DECISIONS.md`.

Implementation details for completed steps are recorded in [`COMPLETE-LOG.md`](COMPLETE-LOG.md).

## 29. Flow validator

**Status:** Todo

- Errors: broken edges, missing targets, unconnected choices, Condition nodes without an output, Random nodes without a fallback.
- Warnings: unreachable events and loops that may never exit.
- Shared by BO validation and the local writer before save.

**Done when:** focused tests cover each error and warning.

## 30. Converted flow review

**Status:** Todo

The one-time conversion moved into Step 28 so the game and tests keep working. This step is the author's review of the converted story on the BO Flow board.

- Review the converted order, conditional edges, random pools, Next Period nodes, and graduation endings on the board.
- Rearrange cards with auto layout; adjust edges where the mechanical conversion does not match the intended story.

**Done when:** the author accepts the converted flow in BO.

## 31. BO Flow board

**Status:** Todo

- Left: event library with search and year/term filters; drag events onto the board.
- Center: board with pan, zoom, cards, and edges dragged from each choice handle.
- Cards show title, thumbnail, short text, and choices.
- Add Start, Condition, Random, Next Period, and Ending cards.
- Top toolbar: Undo/Redo, auto layout, validate, Preview, Save.
- Show validator errors and warnings on cards and edges.

**Done when:** an author can build a branching path with a Condition and a Random node, save it, and play it in the Player page.

## 32. BO Flow detail panel + preview

**Status:** Todo

- Right panel: details for the selected card or edge (reuse the event form; forms for Condition, Random, Next Period, Ending, and edge conditions).
- Engine trace for preview: path taken, state, and why each condition passed or failed (moved from Step 28).
- Preview highlights the real path with current state and condition pass/fail reasons.
- Preview of an event not yet placed on the board ends with a "No path" message today; give it a clear Thai message.

**Done when:** the selected card or edge can be edited from the panel and Preview shows the highlighted path with reasons.

## 33. V4 Player check + test

**Status:** Todo

- Confirm the Player runs on the flow engine with no visible regressions.
- Check story paths, random restore after refresh, program review, and endings.
- Check the BO Flow board on desktop.

**Done when:** V4 is accepted by the author. Release remains a separate, explicit request.
