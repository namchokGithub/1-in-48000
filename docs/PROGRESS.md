# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

| #   | Step                           | Status | Depends on |
| --- | ------------------------------ | ------ | ---------- |
| 27  | V4 flow rules + schema         | Todo   | 26         |
| 28  | V4 flow engine + save          | Todo   | 27         |
| 29  | Flow validator                 | Todo   | 27         |
| 30  | Content conversion to flow     | Todo   | 28, 29     |
| 31  | BO Flow board                  | Todo   | 29         |
| 32  | BO Flow detail panel + preview | Todo   | 28, 31     |
| 33  | V4 Player check + test         | Todo   | 30, 32     |

V4 order: rules, engine, and validator first (27–29), then convert the current story (30), then the BO Flow editor (31–32), then Player check (33). Requirements source: `docs/REQUIREMENT-V4.md`. The production release is still deferred while the author makes further adjustments.

## Open decisions

None. V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).

Resolved choices are recorded in `docs/DECISIONS.md`.

Implementation details for completed steps are recorded in [`COMPLETE-LOG.md`](COMPLETE-LOG.md).

## 27. V4 flow rules + schema

**Status:** Todo

- Node types: Start, Event, Condition, Random, Next Period, Ending.
- Edges from Start, from each choice of an Event, from Condition pass/fail, from Random (after/fallback), and from Next Period.
- Simple conditions on edges; AND/OR groups on Condition nodes.
- Random pools for in-between events.
- Card positions for BO.
- Remove direct-link fields that edges replace.
- Update `docs/GAME-RULES.md` and record the decisions in `docs/DECISIONS.md`.

**Done when:** a sample flow with every node type passes schema validation with tests.

## 28. V4 flow engine + save

**Status:** Todo

- Progress by following edges instead of selecting events by kind and period.
- Choice → apply effects and flags → follow the choice's edge.
- Condition → evaluate current state and pick pass/fail.
- Random → roll from eligible pool events with the game seed; record the result so a refresh restores the same path.
- Next Period → advance time, apply effects due on entry, and run the program review where required.
- Ending → show the ending and life summary.
- Save stores the current node; reset save/content versions without migration.
- Engine trace for preview: path taken, state, and why each condition passed or failed.

**Done when:** focused tests cover each node type, merging paths, seeded random restore after refresh, program review, and a full run to each ending.

## 29. Flow validator

**Status:** Todo

- Errors: broken edges, missing targets, unconnected choices, Condition nodes without an output, Random nodes without a fallback.
- Warnings: unreachable events and loops that may never exit.
- Shared by BO validation and the local writer before save.

**Done when:** focused tests cover each error and warning.

## 30. Content conversion to flow

**Status:** Todo

- Convert the current 38 events into a flow that keeps today's story order, branches, random events, program/elective events, and endings.
- One-time conversion; the author reviews the result in BO.

**Done when:** the converted flow passes validation and a full run reaches each ending.

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
- Preview highlights the real path with current state and condition pass/fail reasons.

**Done when:** the selected card or edge can be edited from the panel and Preview shows the highlighted path with reasons.

## 33. V4 Player check + test

**Status:** Todo

- Confirm the Player runs on the flow engine with no visible regressions.
- Check story paths, random restore after refresh, program review, and endings.
- Check the BO Flow board on desktop.

**Done when:** V4 is accepted by the author. Release remains a separate, explicit request.
