## 33. V4 Player check + test

**Status:** Done

- Confirm the Player runs on the flow engine with no visible regressions.
- Check story paths, random restore after refresh, program review, and endings.
- Check the BO Flow board on desktop.

**Done when:** V4 is accepted by the author. Release remains a separate, explicit request.

Accepted by the author on 2026-10-29. V4 is complete; release remains a separate, explicit request.

## 32. BO Flow detail panel + preview

**Status:** Done

Step 31 added the Condition, Random, Ending, and edge forms, and an event editor modal on the Flow board.

- Engine trace for preview: path taken, state, and why each condition passed or failed (moved from Step 28).
- Preview highlights the real path with current state and condition pass/fail reasons.
- Preview of an event not yet placed on the board ends with a "No path" message today; give it a clear Thai message.

**Done when:** Preview shows the highlighted path with reasons, and an unplaced event's preview explains what to connect.

2026-10-29: Implemented and ready for visual review. The engine's choice actions accept an optional trace that records each edge (with the conditional edges skipped before it), Condition results, Random candidates and the rolled event, period moves with the review score, and the event or ending reached. The preview modal lists that path in Thai with pass/fail reasons and current flags, and stats stay in the scene's stat panel. The Flow board highlights the traced cards and edges while the preview runs and keeps them until "ล้างไฮไลต์เส้นทาง". An unplaced event shows a notice before choosing, and missing-path errors read as Thai guidance. Focused tests cover the engine trace, the Thai descriptions, the highlighted IDs, and the error messages.

Accepted by the author on 2026-10-29.

## 30. Converted flow review

**Status:** Done

The one-time conversion moved into Step 28 so the game and tests keep working. This step is the author's review of the converted story on the BO Flow board.

- Review the converted order, conditional edges, random pools, Next Period nodes, and graduation endings on the board.
- Rearrange cards with auto layout; adjust edges where the mechanical conversion does not match the intended story.

**Done when:** the author accepts the converted flow in BO.

Accepted by the author on 2026-10-29.

## 36. BO Flow undo/redo + safer edits

**Status:** Done

Logic with tests. The existing BO draft history (`draftHistory.ts`) already undoes every board edit through the page toolbar, including drag ends and auto layout. This step keeps that single history instead of adding a flow-only one (see `docs/DECISIONS.md`).

- Keyboard shortcuts on every BO tab: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo; inactive in text fields and while saving.
- Drag either end of an edge to another card or port (`onReconnect`); the edge keeps its ID, condition, and check order.
- Auto layout needs no confirmation; it shows a note that Cmd+Z undoes it.

**Done when:** every board edit can be undone, and a wrong auto layout can be recovered.

2026-10-29: Implemented. `reconnectEdge` moves an edge in place under the same rules as a new connection (no edges out of an Ending or into Start, no duplicate unconditional edge) and is covered by a focused test. A rejected reconnect shows a notice and the edge snaps back.

Accepted by the author on 2026-10-29. Follow-ups on the same day: the edit toolbar moved into a compact sticky header; Flow board edges leave from the right or bottom handle of their choice port, whichever faces the target, and enter the target at the border point facing the source, without changing `flow.json` (`flowEdgeGeometry.ts`, with a focused test); and the Flow tab fits the viewport height and width so the board's controls stay visible.

## 35. BO Flow focus + readability

**Status:** Done

Mostly UI. Computing the focused cards and edges is logic and gets tests.

- Focus Mode: selecting a card highlights it and its directly connected cards and edges (incoming and outgoing, 1 hop) and dims the rest without hiding them. The depth can be expanded.
- Show choice names on edges only on hover, selection, or focus.
- Color event cards by `kind` (`main`, `conditional`, `holiday`, `random`), without clashing with the error/warning red and yellow or the gold trace highlight.
- Zoom-level detail: when zoomed out, show only a large title and hide the scene image and ports.
- Optional: year and period swimlane bands behind the cards; drop this if it proves too complex.

**Done when:** any selected card shows its incoming and outgoing paths clearly, and card titles stay readable when zoomed out.

2026-10-29: Implemented. Selecting a card or edge focuses the board: `focusedFlow` collects the cards and edges within the chosen depth in both directions, and everything else dims. A toolbar dropdown sets the depth (off, 1, 2, or 3 steps; default 1). Edges show the choice name on hover, selection, or focus, and keep showing their condition. Event cards carry a colored top border and a chip for `kind`, with a legend at the bottom of the canvas. Below 45% zoom, cards hide the scene image, text, and port labels and show a large title, and edge labels are hidden. Swimlane bands were dropped: card positions are not tied to year or period lanes, so bands would not line up after manual moves. A focused test covers the focus depth for cards and edges.

Accepted by the author on 2026-10-29.

## 34. BO Flow board layout

**Status:** Done

UI only; no automated tests. Source: `docs/legacy/BO-UX-DESIGN.md`.

- Make the Flow tab fill the screen height.
- Add a toggle to collapse and expand the event library; keep the state in React state only.
- Show the Inspector as a drawer over the canvas when a card or edge is selected; close it with Esc or a click on empty canvas.
- Group the toolbar: `[+ เพิ่ม ▾]` · `[จัดตำแหน่ง] [Fit ทั้งหมด] [Fit ที่เลือก]` · `[ตรวจความถูกต้อง]`.
- Add a Go to Event search on the canvas toolbar.
- Draw edges as Smooth Step.
- Shortcuts: `/` search, `F` fit, `Esc` clear selection.
- Clicking an item in the issue list jumps to its card, if not already supported.

**Done when:** the canvas uses nearly the full screen at 1280px, and every board action still works with the library collapsed.

2026-10-29: Implemented. The Flow tab lifts the page width limit and fills the screen height below the sticky toolbar. The library collapses with a toolbar toggle, and "เหตุการณ์ใหม่" moved into the `+ เพิ่ม` menu so it works while collapsed. The Inspector is a drawer over the canvas with a close button. Edges are Smooth Step. The issue list already jumped to cards before this step.

Accepted by the author on 2026-10-29. Follow-up on the same day: every BO tab now uses the full screen width, not only the Flow tab.

## 31. BO Flow board

**Status:** Done

- Left: event library with search and year/term filters; drag events onto the board.
- Center: board with pan, zoom, cards, and edges dragged from each choice handle.
- Cards show title, thumbnail, short text, and choices.
- Add Start, Condition, Random, Next Period, and Ending cards.
- Top toolbar: Undo/Redo, auto layout, validate, Preview, Save.
- Show validator errors and warnings on cards and edges (`validateV2Flow` returns both; only errors block saving today).

**Done when:** an author can build a branching path with a Condition and a Random node, save it, and play it in the Player page.

2026-10-29: Implemented and ready for visual review. A new "Flow เรื่อง" tab shows the event library (search, year, and period filters; drag or "วาง" to place), the React Flow board (pan, zoom, minimap, one handle per choice or fixed port, conditional edges dashed and labeled, cards colored by error or warning), and a right panel. The board toolbar adds Condition, Random, Next Period, and Ending cards, runs auto layout, and lists errors and warnings that focus their card. The page toolbar's Undo/Redo, Preview (selected event card), and Save (`flow.json`) work for the board. To meet the Done condition, the right panel already edits Condition join and conditions, Random pool, Ending choice, edge condition and edge order, and removes cards or edges; the event form gained a Pool field. Renaming an Event or Choice ID updates the board, and deleting an event removes its card. The Timeline view and its helpers were removed. The local writer now accepts `flow.json`. Focused tests cover the board editing logic and the flow writer. Save the events file before the flow when a new event is placed, because the writer validates the flow against the saved events.

Accepted by the author on 2026-10-29 after adding and dragging cards. Follow-up on the same day: the Flow tab edits events in a modal instead of switching tabs. "แก้ในฟอร์มเหตุการณ์" or a double-click on an event card opens the existing event form in a dialog; deleting from it asks for confirmation and removes the card. "+ เหตุการณ์ใหม่" in the library creates an event, places it at the board center, and opens the modal. Save on the Flow tab writes the events file first and then `flow.json`, only for files with changes. BO dropdowns now open inside an enclosing dialog so they work in modals.
