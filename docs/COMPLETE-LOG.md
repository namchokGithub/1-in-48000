## 41. Player features for local feedback

**Status:** Done — accepted by the author on 2026-10-30

- 41.1 Home button opens a confirm modal: "กลับหน้าแรก? เกมนี้จะจบลงและเล่นต่อไม่ได้", with "เล่นต่อ" and "กลับหน้าแรก".
- 41.2 The scene image fades in when the scene changes (off with reduced motion), and the speaker and player portraits follow 40.5 (portraits done with 40.5).
- 41.3 Locked choices appear disabled with their reason (40.2; done with 40.2). A negative money balance reads as a loan with its interest, and the Ending shows the debt settlement (40.3; done with 40.3).
- 41.4 The dialogue box shows the previous choice's recap (40.4) in a thin frame, with the first line only (done with 40.4).
- 41.5 A small notification lists the stats that rose or fell after a choice, including delayed effects that came due.
- 41.6 A year summary appears when a new year starts: stat changes for the year, money in and out, events passed, and "ต่อไป" (40.6).
- 41.7 Ending timeline: an ⓘ button explains that each year opens and closes.
- 41.8 The stat change toast sits in the top-right corner of the scene.
- 41.9 The narrator's portrait stands beside the dialogue box instead of in the scene; NPCs stay in the scene.
- 41.10 Year summary redesign (`docs/image/LOCAL/`): the main facts fit without much scrolling (the two largest stat changes, the event count, change bars, money in and out), and the full event list expands on demand. Only real summary data; no score or grade.

**Done when:** the author accepts each screen by eye at mobile and desktop widths.

2026-10-30: 41.1, 41.2 (fade-in), 41.5, 41.6, and 41.7 implemented, waiting for the author's check; 41.2 portraits, 41.3, and 41.4 were done with 40. The Home button asks to confirm in a modal; the scene image fades in only when the scene changes; a toast lists the stats changed by a choice (`statChanges`, including delayed effects that came due); a new year first shows the summary of the year before (`yearSummary`) until "ต่อไป"; and the ending timeline has an ⓘ note. The toast and year summary are in the Player only, not the BO preview. The year summary shows again after a refresh in that year, because which summary was closed is client state. The author checked 41.1–41.7 and asked for 41.8–41.10.

2026-10-30: 41.8–41.10 implemented, waiting for the author's check. The toast renders inside the scene's top-right corner; `scenePortraits` returns the narrator separately so its portrait stands beside the dialogue box; and the year summary follows the mockup, with `yearSummary` now counting every event visit and returning the two largest bar-stat changes as highlights. The summary scrolls inside the fixed-height desktop play screen if it is taller. The author accepted 41.8–41.10.

## 40. BO and content for local feedback

**Status:** Done — accepted by the author on 2026-10-30

Each item adds the Zod schema, engine handling where needed, BO support, and focused tests.

- 40.1 Flag list: a BO tab "ตัวแปร (Flag)" lists every flag with where it is set and where it is checked, and warns about a flag that is checked but never set. Flag ID fields become dropdowns that still accept a new name. Flags only; stats are not listed.
- 40.2 Locked choices: a choice toggle "แสดงแม้ไม่เข้าเงื่อนไข" (default off). The engine returns each choice with whether it can be chosen and the reason, built from its conditions (for example "ต้องมีเงินอย่างน้อย 500 ฿", "ต้องอยู่ปี 2 ขึ้นไป"); flag and past-event conditions read "ยังไม่เข้าเงื่อนไข" so the story is not revealed. Choosing a locked choice is still rejected.
- 40.3 Automatic loans (see `docs/DECISIONS.md`): money can go below 0, interest on the negative balance is taken at each Next Period, and debt is settled from money at the ending.
- 40.4 Recap text: an optional choice field `recap`, written by the author. The next event shows it; without it nothing is shown.
- 40.5 Player in the scene: an event setting to hide the player portrait (shown by default). The line's speaker (NPC or narrator) stands on the left, the player on the right; either one alone keeps its side.
- 40.6 Year summary data: the save keeps the stats at the start of the current year, so the Player can show what changed. No old-save migration (see Architecture Rules).

**Done when:** the author can set each of these in BO, the content validates, and the BO preview plays them through the shared engine.

2026-10-30: 40.1 implemented, waiting for the author's check. `flagUsage` collects where each flag is set (choice effects including scheduled and chance results, elective effects) and checked (event, choice, Condition card, and edge conditions); the read-only tab links each place and marks flags that are checked but never set, or set but never checked. Flag ID fields suggest known flags through one shared `datalist`. The author accepted 40.1.

2026-10-30: 40.2 implemented, waiting for the author's check, with the locked-choice part of 41.3. A choice gets `showWhenLocked`; `getV2ChoiceOptions` returns available choices and shown locked ones with their unmet conditions, and `lockedReason` turns those into Player text. The Player and BO preview show locked choices disabled with the reason. The author accepted 40.2.

2026-10-30: 40.3 implemented, waiting for the author's check, with the loan part of 41.3. `config.loan` holds the yearly rate and days per period, Next Period charges interest on negative money, and the life summary settles debt from money at every ending. BO edits the loan in a new "เกม" group tab "ตั้งค่าเกม" and can now save `config.json`. The Player marks negative money as a loan with its rate, and the Ending shows the settlement. The author accepted 40.3.

2026-10-30: 40.4 implemented, waiting for the author's check, with 41.4. A choice gets an optional `recap`; `getV2LastRecaps` reads the last history entry, and the next event shows the recaps in a thin frame with its first line only. BO edits the recap under the choice text.

2026-10-30: 40.5 implemented, waiting for the author's check, with the portrait part of 41.2. Events get an optional `hidePlayer`; `scenePortraits` places the speaker left and the player right, and drops a speaker picture that is the player's own. BO sets it next to the outfit. The scene fade-in in 41.2 is still open.

2026-10-30: 40.6 implemented, waiting for the author's check. The save keeps `yearProgress` and `finishedYear` (stats at the start and end of the year, money in and out including interest); old checkpoints fail validation and start fresh. The Player screen for it is 41.6. The author accepted 40.4–40.6, and `pnpm build` and `pnpm test` pass.

## 39. Player bug fixes

**Status:** Done — accepted by the author on 2026-10-30

Source: `docs/LOCAL.md`.

- 39.1 The year bar shows "เป้าหมายปี 4" for a six-year major. `YearTimeline` derives the goal from the current year only; use the chosen major's `programYears`, then the extension years as before.
- 39.2 Music switches on and off without a fade. `PlayerApp` sets the volume directly in an effect, which overrides the controller's fade; turning music on fades in and turning it off fades out. Focused test in `src/shared/audio.test.ts`.

**Done when:** a six-year major shows a Year 6 goal, and the music toggle fades both ways.

2026-10-30: Implemented and accepted by the author. `getV2GoalYear` in the engine follows the study review years, and the audio controller fades to a new volume instead of setting it, so the settings effect no longer cuts the fade-in.

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
