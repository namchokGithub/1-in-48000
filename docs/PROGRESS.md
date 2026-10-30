# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

V4 (Steps 27–36) was accepted by the author on 2026-10-29.

Steps 37–40 were accepted by the author on 2026-10-30.

| #   | Step                               | Status      | Depends on |
| --- | ---------------------------------- | ----------- | ---------- |
| 41  | Player features for local feedback | In progress | —          |

Local feedback order (source: `docs/LOCAL.md`): fix the two Player bugs first (39), then the content schema, engine, and BO work (40), then the Player screens that show it (41).

V4 order: rules and engine with the story conversion first (27–28), then the validator (29), then the BO Flow editor (31–32) and the author's review of the converted flow (30), then Player check (33). BO Flow board UX follows `docs/legacy/BO-UX-DESIGN.md`: layout first (34), then focus and readability (35) and undo/redo (36), which do not depend on each other. Requirements source: `docs/legacy/REQUIREMENT-V4.md`. The production release is still deferred while the author makes further adjustments.

## Open decisions

No open decisions. The loan rules for 40.3 are recorded in `docs/DECISIONS.md` ("Automatic loans as negative money").

V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).
- Privacy policy and terms pages (not scheduled). The game keeps its save, theme, and music settings only in the browser's localStorage, has no accounts, and sends nothing to a server, so the author deferred these pages.

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

## 39. Player bug fixes

**Status:** Done — accepted by the author on 2026-10-30

Source: `docs/LOCAL.md`.

- 39.1 The year bar shows "เป้าหมายปี 4" for a six-year major. `YearTimeline` derives the goal from the current year only; use the chosen major's `programYears`, then the extension years as before.
- 39.2 Music switches on and off without a fade. `PlayerApp` sets the volume directly in an effect, which overrides the controller's fade; turning music on fades in and turning it off fades out. Focused test in `src/shared/audio.test.ts`.

**Done when:** a six-year major shows a Year 6 goal, and the music toggle fades both ways.

2026-10-30: Implemented and accepted by the author. `getV2GoalYear` in the engine follows the study review years, and the audio controller fades to a new volume instead of setting it, so the settings effect no longer cuts the fade-in.

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

## 41. Player features for local feedback

**Status:** In progress

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

2026-10-30: 41.8–41.10 implemented, waiting for the author's check. The toast renders inside the scene's top-right corner; `scenePortraits` returns the narrator separately so its portrait stands beside the dialogue box; and the year summary follows the mockup, with `yearSummary` now counting every event visit and returning the two largest bar-stat changes as highlights. The summary scrolls inside the fixed-height desktop play screen if it is taller.
