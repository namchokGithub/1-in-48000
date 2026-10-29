# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

| #   | Step                            | Status      | Depends on |
| --- | ------------------------------- | ----------- | ---------- |
| 30  | Converted flow review           | Todo        | —          |
| 32  | BO Flow detail panel + preview  | In progress | 28         |
| 33  | V4 Player check + test          | In progress | 30, 32     |
| 34  | BO Flow board layout            | Todo        | 31         |
| 35  | BO Flow focus + readability     | Todo        | 34         |
| 36  | BO Flow undo/redo + safer edits | Todo        | 34         |

V4 order: rules and engine with the story conversion first (27–28), then the validator (29), then the BO Flow editor (31–32) and the author's review of the converted flow (30), then Player check (33). BO Flow board UX follows `docs/BO-UX-DESIGN.md`: layout first (34), then focus and readability (35) and undo/redo (36), which do not depend on each other. Requirements source: `docs/REQUIREMENT-V4.md`. The production release is still deferred while the author makes further adjustments.

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

## 32. BO Flow detail panel + preview

**Status:** In progress — awaiting the author's visual check

Step 31 added the Condition, Random, Ending, and edge forms, and an event editor modal on the Flow board.

- Engine trace for preview: path taken, state, and why each condition passed or failed (moved from Step 28).
- Preview highlights the real path with current state and condition pass/fail reasons.
- Preview of an event not yet placed on the board ends with a "No path" message today; give it a clear Thai message.

**Done when:** Preview shows the highlighted path with reasons, and an unplaced event's preview explains what to connect.

2026-10-29: Implemented and ready for visual review. The engine's choice actions accept an optional trace that records each edge (with the conditional edges skipped before it), Condition results, Random candidates and the rolled event, period moves with the review score, and the event or ending reached. The preview modal lists that path in Thai with pass/fail reasons and current flags, and stats stay in the scene's stat panel. The Flow board highlights the traced cards and edges while the preview runs and keeps them until "ล้างไฮไลต์เส้นทาง". An unplaced event shows a notice before choosing, and missing-path errors read as Thai guidance. Focused tests cover the engine trace, the Thai descriptions, the highlighted IDs, and the error messages.

## 33. V4 Player check + test

**Status:** In progres

- Confirm the Player runs on the flow engine with no visible regressions.
- Check story paths, random restore after refresh, program review, and endings.
- Check the BO Flow board on desktop.

**Done when:** V4 is accepted by the author. Release remains a separate, explicit request.

## 34. BO Flow board layout

**Status:** Todo

UI only; no automated tests. Source: `docs/BO-UX-DESIGN.md`.

- Make the Flow tab fill the screen height.
- Add a toggle to collapse and expand the event library; keep the state in React state only.
- Show the Inspector as a drawer over the canvas when a card or edge is selected; close it with Esc or a click on empty canvas.
- Group the toolbar: `[+ เพิ่ม ▾]` · `[จัดตำแหน่ง] [Fit ทั้งหมด] [Fit ที่เลือก]` · `[ตรวจความถูกต้อง]`.
- Add a Go to Event search on the canvas toolbar.
- Draw edges as Smooth Step.
- Shortcuts: `/` search, `F` fit, `Esc` clear selection.
- Clicking an item in the issue list jumps to its card, if not already supported.

**Done when:** the canvas uses nearly the full screen at 1280px, and every board action still works with the library collapsed.

## 35. BO Flow focus + readability

**Status:** Todo

Mostly UI. Computing the focused cards and edges is logic and gets tests.

- Focus Mode: selecting a card highlights it and its directly connected cards and edges (incoming and outgoing, 1 hop) and dims the rest without hiding them. The depth can be expanded.
- Show choice names on edges only on hover, selection, or focus.
- Color event cards by `kind` (`main`, `conditional`, `holiday`, `random`), without clashing with the error/warning red and yellow or the gold trace highlight.
- Zoom-level detail: when zoomed out, show only a large title and hide the scene image and ports.
- Optional: year and period swimlane bands behind the cards; drop this if it proves too complex.

**Done when:** any selected card shows its incoming and outgoing paths clearly, and card titles stay readable when zoomed out.

## 36. BO Flow undo/redo + safer edits

**Status:** Todo

Logic with tests.

- Undo/Redo for flow changes only: adding or removing cards and edges, moving cards (recorded on drag end), auto layout, and edge condition or order edits. Event edits in the modal are not included.
- Cmd+Z / Cmd+Shift+Z do not act on the board while focus is in a text field.
- Drag an edge end to another card to change its target (`onReconnect`).
- Auto layout asks for confirmation or can be undone.

**Done when:** every board edit can be undone, and a wrong auto layout can be recovered.
