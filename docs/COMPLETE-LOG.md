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
