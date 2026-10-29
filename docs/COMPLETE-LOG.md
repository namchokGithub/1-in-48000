# Completed Work Log

## 1. Scaffold

**Status:** Done

- Vite + React + TypeScript project with pnpm.
- Tailwind CSS, ESLint, Prettier, Vitest.
- Folder structure from `AGENTS.md` "Project Structure (proposed)".
- Separate Player and BO entries; BO excluded from the production build.
- Fill the Commands section in `AGENTS.md` and Getting Started in `README.md`.

**Done when:** `pnpm dev`, `pnpm test`, and `pnpm build` run.

Completed 2026-10-26. Player is the production entry; BO is available at `/bo.html` in the local dev server. Vitest runs with no test files until later logic steps.

## 2. Game rules + schema

**Status:** Done

- Define stats: study, money, health, stress, relationships.
- Define the time model: Year 1–4, terms, semester breaks, summer sessions.
- Define condition, effect, and flag types (including delayed effects).
- Zod schemas for game config, events, characters, assets, endings, and player save (`saveVersion`, `contentVersion`, seed/rolls).
- Sample content JSON.

**Done when:** sample JSON passes schema validation with tests.

Completed 2026-10-26. Rules are in `docs/GAME-RULES.md`; content and save schemas plus sample JSON are in place. Focused schema tests validate the sample and reject invalid values and delayed effects.

## 3. Engine

**Status:** Done

- Condition evaluation (year, stats, flags, past events).
- Effect application (stats, flags, next event, delayed effects).
- Event selection: main, conditional, Thai holiday, random.
- Seeded RNG.
- Ending resolution and life summary.

**Done when:** a full run works headless (no UI) with unit tests.

Completed 2026-10-26. The pure TypeScript engine supports conditions, effects, period progression, event priority, one seeded random event per period, endings, and a life summary. Headless tests cover a full four-year run.

## 4. Save

**Status:** Done

- Zustand game store.
- Storage interface + localStorage adapter.
- Auto-save at checkpoints only (choice resolved, event/term boundary, ending).
- Continue and restart.
- Save export (backup).
- Migration skeleton keyed on `saveVersion`.

**Done when:** save/load tests pass and reloading never changes an outcome.

Completed 2026-10-26. A vanilla Zustand store writes one localStorage slot at checkpoints, resumes and restarts runs, exports JSON, and validates saves through a versioned loader. Focused tests cover storage failures and deterministic RNG after reload.

## 5. Player UI

**Status:** Done

- Start screen: new game, continue, restart.
- Character creation: name, pick or randomize background.
- Scene view: background, character pose, dialogue, choices.
- Stats display.
- Ending screen with life summary.
- Mobile and desktop layouts.

**Done when:** sample content is playable end to end.

Completed 2026-10-26. The Thai Player runs from start and character creation through scene choices to an ending, with responsive stats, save resume/restart, and backup download. Three starting backgrounds were added to config and v1 saves migrate to v2. Scene and portrait slots resolve Asset IDs when assets are added in Step 6.

## 6. Assets + audio

**Status:** Done

- Asset manifest; all images and sounds referenced by Asset ID.
- Howler.js wrapper: looping BGM, ambience, SFX, fade.
- Volume settings (persisted with settings).
- Placeholder pixel art for scenes and characters.

**Done when:** events show images and play sound through Asset IDs.

Completed 2026-10-26. The orientation event resolves a pixel campus scene, Mali portrait, and Turning_Pages BGM through the asset manifest. Howler.js manages looping BGM/ambience, SFX playback by ID, and fades. Separate persisted settings control each channel's volume. Ambience and SFX files can be added later through the same manifest.

## 7. Vertical slice

**Status:** Done

- Write Year 1, first term: about 10–15 events.
- Include at least one conditional event, one delayed effect, and one random event.

**Done when:** the slice is playable to its end with images, sound, and saves (requirement phase 2).

Completed 2026-10-26. Fourteen authored Year 1 first-term events lead to a break reflection event and one of two slice endings. Shared main events include a midterm exam; friend and club conditions add optional follow-ups, one of two random events appears, and choices schedule effects that resolve later. Four pixel scene assets and the credited BGM are referenced through Asset IDs. A true flag condition permits an ending at the current period boundary. Content version 0.3.0 accepts earlier 0.1.0/v1 and 0.2.0/v2 saves through migration.

## 8. BO core

**Status:** Done

- Local-only BO page.
- Load and save content JSON directly to files.
- Forms to add, edit, and delete events, choices, and endings.
- Condition and effect editors.
- Asset ID binding for images, music, and sounds.
- Validator: duplicate IDs, broken event links, missing assets.
- Event preview with playable choices (shared engine).

**Done when:** new story content can be added through BO and plays in the Player page.

Completed 2026-10-26. The local BO edits event details, dialogue, choices, conditions, effects, and endings, with simple up/down ordering. Asset dropdowns use the shared manifest. The shared Zod schemas and cross-file validator report duplicate IDs, broken event links, invalid asset references, and missing asset files before a dev-only Vite endpoint atomically writes `events.json` or `endings.json`. Event preview applies choices through the shared engine. A focused integration test saves a new event and loads it through the Player content loader and engine. Step 9 added timeline dragging.

## 9. BO timeline + MVP content

**Status:** Done

- Drag-and-drop timeline editor.
- Expand content to Year 1–4: 30–40 events, 3–5 endings, 5–8 scenes.
- Shared main line with branches that merge back.

**Done when:** the game is playable to several different endings.

Completed 2026-10-26. The BO has a four-year timeline with native drag and drop within and across periods; the existing form and up/down controls remain available when dragging is inconvenient. Content version 0.4.0 has 35 events, seven pixel scenes, and three reachable Year 4 endings. The main line spans enrollment to graduation, with optional money, club, and mentor events that merge back. New runs continue past the first-term break; the two demo endings remain in content for completed older saves. Compatible v1/0.1.0 and v2/0.2.0–0.3.0 saves migrate without changing their history or RNG state. Focused tests cover timeline moves, branches, delayed effects, endings, and save migration.

## 10. Test + release

**Status:** Done

- Check story paths and effects.
- Check loading older saves after content changes.
- Check mobile layouts and audio.
- Cloudflare Pages deploy from GitHub; confirm BO is not in the build.

**Done when:** the MVP is ready to deploy.

2026-10-27: The author reports MVP checks complete. Cloudflare Pages publication remains a separate action and was not performed in this coding session.

## 11. V2 rules + schema

**Status:** Done

- Allow every stat to go negative.
- Add a single `debt` stat covering student loans (กยศ., กรอ.), money owed to friends, and gambling debt.
- Add a `lucky` stat used by events that roll for success or failure.
- Add a `chance` effect: success percentage, success effects, failure effects, and a display mode that shows the affected stats with or without amounts.
- Extend the time model: 4 years by default, 6 or 8 years when the player fails (trigger based on `study` with a small `stress` weight).
- Require snake_case for Event IDs and Choice IDs (e.g. `lost_student_card`).
- Add a random names content file with defaults ฟ้า, มายด์, อิม.
- Remove the ambience audio channel and its asset type.
- Add minimal sample content: debt events (กยศ./กรอ., borrowing from a friend) and a chance event (e.g. buying a lottery ticket, 3% to win).
- Update `docs/GAME-RULES.md` and record the decisions in `docs/DECISIONS.md`.

**Done when:** updated schemas and sample content pass validation with tests.

Completed 2026-10-27. The isolated `src/content/v2/schema.ts` contract and sample content define seven signed stats, Years 1–8, snake_case Event and Choice IDs, a chance effect with two display modes, and asset types without ambience. A random-name file supplies ฟ้า, มายด์, and อิม. Schema validation checks duplicate IDs and broken references; focused tests cover the sample and rejected values. The current Player, BO, engine, and save still use V1 data until their later V2 steps. The study/stress graduation formula, lucky adjustment, Year 8 result, and Years 5–8 story content remain open.

## 12. V2 engine + save

**Status:** Done

- Apply negative stat values and the new stat bounds.
- Resolve `chance` effects with the saved RNG state, adjusted by `lucky`.
- Extended study years (5–8) and the matching endings.
- Record the data needed for a decision/event timeline in the life summary.
- Save v3 with migration from v2 (new stats, removed ambience setting).

**Done when:** focused tests cover chance rolls, negative stats, debt, extended years, endings, and v2 → v3 migration.

Completed 2026-10-27. The isolated V2 engine applies signed stats and debt, resolves chance effects with saved RNG and a `lucky` adjustment, and checks study at the end of Years 4, 6, and 8. Failed students continue through Years 5–8; failing at Year 8 selects the `dismissal` ending. Save v3 records choice time and chance outcomes for the life-summary timeline. A V2 store checkpoints after start and choice, and migration from v2/content `0.2.0`–`0.4.0` preserves progress and RNG while adding debt and lucky. A separate audio-settings converter drops ambience and SFX from the V2 settings shape. Focused tests use synthetic Years 5–8 events; authored story content and Player/BO integration remain later steps. Existing completed ending IDs need matching V2 content when the Player switches over.

## 13. BO shell

**Status:** Done

- Move BO from `bo.html` to the `/content-manage` route; keep it local only and out of the production build.
- Shared Select component (no native dropdowns).
- Shared confirmation modal.
- Checkboxes for true/false values.
- Sticky toolbar with Save, Undo, Redo, and Preview.

**Done when:** BO opens at `/content-manage` locally, the production build does not include it, and the shared controls are in use.

Completed 2026-10-27. The development-only BO entry is served at `/content-manage`; the old `bo.html` entry was removed. One authored Select replaces the BO's native dropdowns, boolean editors use checkboxes, and event/ending deletion uses a shared confirmation dialog. A sticky toolbar offers Save, Undo, Redo, and Preview; Undo/Redo manages up to 100 draft snapshots, while Preview focuses the existing panel until Step 16. The V1 content model remains active in BO until later V2 editing steps. The author should check the route, dropdown keyboard behavior, modal focus, and toolbar layout locally.

## 14. BO data tabs

**Status:** Done

- Tabs to manage speakers, backgrounds, and sounds (BGM and SFX only).
- Random ID generator.
- snake_case validation for Event IDs and Choice IDs.

**Done when:** speakers, backgrounds, and sounds can be added, edited, and removed through BO and pass validation.

Completed 2026-10-27. BO now edits `characters.json` and scene/BGM/SFX records in `assets.json` from dedicated tabs, with draft undo/redo, deletion confirmation, and the existing validated local writer. Event and Choice IDs use `snake_case` in the active schema with inline feedback and random ID buttons. Asset paths refer to files already in `public/assets`; server validation rejects missing files and broken references. The current BO story editor and Player remain on V1 until later steps.

## 15. BO story editor

**Status:** Done

Redesign the event edit form (reference: `docs/image/REQUIREMENT-V2/1793071073186.png`).

- Dialogue: compact cards showing speaker and text.
- Speaker: selecting a speaker shows avatar and name automatically.
- Portrait: hidden in Advanced settings when unused.
- Choice ID: in Advanced settings or shown as secondary text.
- Conditions: condition builder that reads as a sentence.
- Effects: summary badges with clear meaning.
- Delayed effects: collapsible nested section.
- Chance effect editor (percentage, success/failure effects, display mode).
- Add buttons at the end of each group; `···` menu for delete and duplicate.
- Collapse / expand choices and effects not being edited.
- Drag and drop to reorder dialogue lines and choices.
- Inline validation for Flag IDs, Event IDs, and incomplete data.
- Add disable or Inactive story, If disable or inactive set to the bottom of list and story not show in timeline

**Done when:** an event with dialogue, choices, conditions, delayed effects, and a chance effect can be authored through the new form and plays in the Player page.

Completed 2026-10-27. The BO story form now uses compact dialogue and choice cards, automatic speaker portraits, Advanced ID/portrait controls, sentence-style conditions, effect badges, nested delayed/chance editors, duplicate/delete menus, drag and keyboard order controls, inline field feedback, and an Inactive event toggle. Inactive events appear at the bottom of the BO list and are hidden from its timeline without changing JSON order. BO and Player now load the same `public/content-v2` files; the Player uses the V2 engine and save v3 store. The V2 local writer validates and saves authored chance effects, and focused tests cover a saved chance choice resolving in the Player engine, an end-to-end path through the migrated story, inactive event selection, and loading a V1 save. The Player's remaining V2 presentation and gameplay controls stay in Step 17; the author should check the new BO form and Player manually in dev.

## 16. BO timeline + preview

**Status:** Done

- Search and filter events.
- Timeline filter by event kind.
- Warning when a year/period has more than 10 `main` events; adding is still allowed.
- Timeline columns for Years 5–8.
- Event preview opens in a modal.
- Live preview that shows dialogue as in the Player page.

**Done when:** authors can find events, filter the timeline, see the main-event warning, and preview an event in a modal.

Completed 2026-10-27. BO searches event ID, title, dialogue, and choices; the Timeline filters by event kind and displays Years 1–8. Each year/period warns when active main events exceed ten without blocking additional events. Filtered dragging keeps the authored order of hidden events. The toolbar and Timeline cards open a modal preview using the Player scene and V2 engine, with an isolated sample save that never writes player progress. Focused tests cover search, filters, warnings, timeline moves, and V2 preview choices; visual checks remain for the author.

## 17. Player gameplay

**Status:** Done

The V2 content loader, engine, and save store were connected to the Player during Step 15 so authored chance effects can run. The items below remain for this step.

- Random player name from the names file.
- Show stat effects on each starting background.
- Randomizing a background does not reveal which one was chosen.
- Choices show which stats go up or down, success percentages, and stats that may decrease without the amount (per the chance display mode).
- Timeline of 4 years, extending to 6 or 8.
- Life summary shows decisions and events as a timeline.
- Start a new life without the "เซฟเดิมจะถูกแทนที่" warning.

**Done when:** a run plays from a random name to an ending with the new choice information and summary timeline.

Completed 2026-10-27. New runs receive an editable name selected from `names.json`, and players can reroll it. Background cards show stat changes; random background selection hides the chosen card in the creation form. Choice buttons show immediate and delayed stat changes and the engine's effective chance percentage, with amounts hidden for `statsOnly`. The scene shows a four-year progress timeline that extends to six or eight years when study reviews require it. Endings list visited events, decisions, times, and saved chance results. Starting a new life no longer asks for a second overwrite confirmation. Focused engine and choice-information tests pass; the author should verify the Player flow and responsive layout manually.

## 18. Player UX/UI

**Status:** Done

Reference: `docs/image/REQUIREMENT-V2/1793068013050.png`.

- Widen content to align with the logo edge.
- Place action buttons on the right.
- Show the scene name only in the title, not inside the image.
- Light theme (white and soft yellow) and dark theme (dark gray with a touch of gold).

  - Theme Cozy campus + Soft youthful

    - เน้นครีม / beige มากขึ้น + เหลืองอ่อน + ivory
    - ทองนุ่มๆ
    - ลดความหม่นของ dark
    - เหมาะกับเกม choice-based

  - Light

    - bg: #FFFDF7
    - card: #FFF9EE
    - border: #E7DDBD
    - primary: #D9B85F
    - primary-soft: #F4E6B0
    - text: #4A4436
    - text-secondary: #756C58

  - Dark

    - bg: #1D1C1A
    - card: #2B2925
    - border: #4A4438
    - primary: #D2B15C
    - primary-soft: #4B4128
    - text: #F3EBD7
    - text-secondary: #D1C5A8

  - วิธีใช้สีใน UI

    - แนะนำสัดส่วนประมาณนี้:
      - 70% = neutral base
    - พื้นหลัง / card / border / text
      - 20% = soft brand tone
    - selected, badge, subtle highlight
      - 10% = gold accent
    - ปุ่มหลัก, active tab, important icon
    - อย่าใช้ทองเยอะเกินไป เพราะจะกลายเป็น “งานพิธี” หรือดูหนักไป
    - ให้ใช้ทองเฉพาะจุดสำคัญ เช่น:
      - ปุ่ม primary, active state, icon สำคัญ, badge / progress

- Music plays across all playable pages.
- Music-only sound control: an on/off button, default volume 20%, no settings panel.

**Done when:** the user checks the layout, themes, and music by eye on mobile and desktop.

Completed 2026-10-27; the author confirmed the layout, themes, and music passed review. Player content spans the same width as its header, actions align right, and the scene image has no duplicate title caption. Scoped light/dark tokens follow the Cozy campus palette without changing BO colors, and the selected theme persists. V2 music settings provide a single on/off control, default to 20% for new settings, migrate prior music volume, and keep music across Player pages after a user action. Focused settings tests, touched-file lint, and scoped type checking passed; no build, full test suite, dev server, or browser check was run in that implementation turn.

## 19. V2 test + release

**Status:** Done

- Check story paths, chance outcomes, debt, and extended years.
- Check loading v2 saves after the V2 content changes.
- Check mobile layouts, both themes, and music.
- Confirm the Cloudflare Pages release path and that BO is not in the public build; production deployment is separate.

**Done when:** V2 is ready to deploy.

Accepted by the author on 2026-10-27. V2 checks passed; production deployment has not happened and is intentionally deferred while further adjustments are made. Do not create a release or push until the author explicitly requests it.

Post-V2 cleanup on 2026-10-27: Removed unused V1 runtime, schema, save store, BO editor and writer route. The Player now starts with a fresh in-memory game on every page visit while continuing to write checkpoints to localStorage during play; stored games of any version are not loaded. Historical V1 JSON remains archived in `public/content`.

## 20. V3 rules + schema

**Status:** Done

- Events may have more than two choices.
- Multi-select events: per-event `min`/`max` selections. Effects of every selected choice are combined. A multi-select event has a single event-level `goToEvent`; its choices do not link to events.
- Fixed starting event: every run begins by choosing a faculty and a major.
- Year 3 free elective choice.
- Content files for faculties, majors, and free electives so new entries can be added.
- Program length per major: 4 or 6 years. A 6-year program is allowed only for a faculty and major marked to support it.
- Failing a review still extends study: 4 → 6 → 8 years for 4-year programs, and 6 → 8 years for 6-year programs.
- Electives can change stats and/or set flags, and the choice is recorded for the life summary.
- Conditions on faculty, major, and elective.
- Player names file entries link to an image Asset ID.
- No V1/V2 compatibility: nothing has been released, so content and save versions reset without migrations.
- Update `docs/GAME-RULES.md` and record the decisions in `docs/DECISIONS.md`.

**Done when:** updated schemas and sample faculties, majors, electives, and multi-select events pass validation with tests.

Completed 2026-10-28. The existing schema and `public/content-v2` loader now read faculty, major, elective, and structured player-name files without a new version tree. The sample exercises a program-selection start, a Year 3 elective event, and a three-choice multi-select event; validation checks selection limits, event links, duplicate IDs, 4/6-year program rules, conditions, and name portrait references. Content/save version numbers reset to `0.1.0`/`1` without migrations. The current engine and Player still use prior selection behavior until Step 21; BO data tabs and editors follow in Steps 22–23.

## 21. V3 engine + save

**Status:** Done

- Start every run at the fixed faculty/major event.
- Resolve multi-select choices within `min`/`max`, combine their effects, then follow the event-level link.
- Year 3 elective selection and its effects.
- Program length from the major, combined with failed-review extensions.
- Assign the player name at random from the names file; the player cannot change it.
- Keep localStorage checkpoints so a refresh restores the current run. Remove save file download and import.
- Remove V1/V2 save migrations.
- Update the save rule in `AGENTS.md` to match.

**Done when:** focused tests cover the starting event, multi-select limits and effects, electives, 4- and 6-year programs with extensions, and refresh restore.

Completed 2026-10-28. The existing engine now assigns a seeded random name, resolves faculty and major selection, validates and combines multiple selected choices in authored order, applies a Year 3 elective, evaluates faculty/major/elective conditions, and reviews study at the selected program's 4- or 6-year point before any extension to Year 8. Save v1 records name/program/elective IDs and all selected Choice IDs. The Player and BO preview use the same engine actions; the Player removes name editing and save download. Checkpoints resume only after a refresh in the same tab while new visits and completed runs start fresh. A Year 3 elective Event was added to the active content. Focused engine, store, content, and BO preview tests passed; Steps 22–25 still cover full BO authoring and Player presentation.

## 22. BO data tabs (V3)

**Status:** Done

- Tabs to manage faculties, majors (including program length), and free electives.
- Tab to manage player names and link each name to an image.

**Done when:** faculties, majors, electives, and player names can be added, edited, and removed through BO and pass validation.

Completed 2026-10-28. BO now edits faculties, majors and their 4/6-year length, elective state effects, and player names with portrait Asset IDs in the active content files. A portrait asset tab lets authors register image paths without editing JSON manually. The existing draft, Undo/Redo, tab URL, confirmation, and per-file Save flow cover all new tabs. The local writer validates the complete content set and actual asset files before atomic replacement; focused writer tests cover valid writes and broken catalog references.

## 23. BO story editor (V3)

**Status:** Done

- Author any number of choices per event.
- Multi-select settings: `min`/`max` and the event-level `goToEvent`.
- Condition builder for faculty, major, and elective.
- Remove drag and drop from the story editor's event list; keep the up/down buttons.

**Done when:** a multi-select event with faculty/major conditions can be authored through BO and plays in the Player page.

Completed 2026-10-28. The existing event editor now authors single, multi-select, program, and elective selection modes, including multi-select minimum/maximum choices and the event-level destination. Event, choice, and ending condition editors offer faculty, major, and elective references from the shared catalogs. Choice-level event links are unavailable in multi-select mode, while validation surfaces any old links that must be removed. The Event list remains button-based with up/down ordering; Timeline event dragging remains available as requested. A focused BO writer/preview test saves an authored multi-select event with faculty/major conditions and resolves it through the shared Player engine.

## 24. Player gameplay (V3)

**Status:** Done

- Faculty and major selection at the start of every run.
- Year 3 elective selection.
- Multi-select choices with `min`/`max` feedback.
- Random player name and image, not editable.
- Remove Continue and save download.
- Do not show delayed effects ("ผลลัพธ์ภายหลัง") on choices.

**Done when:** a run plays from the faculty/major choice through the Year 3 elective to an ending, including a multi-select event.

Completed 2026-10-28. The Player already had the shared program, elective, and multi-select actions with selection-count feedback and no Continue or save-download control. It now shows the seeded player's name and linked portrait beside the stats; three original pixel-style placeholder PNGs are registered by Asset ID for the current names. Choice previews omit delayed effects while the engine still applies them. A Year 2 multi-select event with three options and a two-choice limit is on the active story path. Content version moved to `0.2.0` so older same-tab checkpoints are not restored into changed content. Focused content and gameplay tests reach the event, the Year 3 elective, and an ending.

## 25. Player UX/UI (V3)

**Status:** Done

References: `docs/image/REQUIREMENT-V3/1793110431448.png`, `docs/image/REQUIREMENT-V3/1793111676895.png`, `docs/image/REQUIREMENT-V3/1793112325756.png`.

- Desktop: move choices below the stats panel in the right column. The scene, dialogue, and other areas stay fixed; only the choice area changes, so the player rarely needs to scroll.
- Mobile: choices stay below the dialogue.
- Layout supports more than two choices and multi-select.
- Redesign the year timeline as a stepper with icons (Freshman, Sophomore, Junior, Senior); Years 5–8 show "ปี 5" to "ปี 8" with a generic icon.

**Done when:** the user checks the layout and timeline by eye on mobile and desktop.

Implementation ready for visual review 2026-10-28. Desktop places Choices below the stats in the right column, with an internally scrolling Choice panel when needed; the scene, timeline, and dialogue remain in the left column. Mobile orders scene/dialogue, Choices, then stats. Dialogue keeps a stable height while lines change. The year timeline is now a connected stepper with icons and Freshman–Senior labels for Years 1–4; Years 5–8 use a generic icon and Thai year label. The active year scrolls into view in narrow layouts. Awaiting the author's visual check at mobile and desktop widths in both themes before marking Done.

## 26. V3 test

**Status:** Done

- Check paths for each faculty and major, including 6-year programs and extensions.
- Check multi-select events and elective effects.
- Check refresh restore and that save download is gone.
- Check mobile and desktop layouts in both themes.

**Done when:** V3 is accepted by the author. Release remains a separate, explicit request.

## 27. V4 flow rules + schema

**Status:** Done

- Node types: Start, Event, Condition, Random, Next Period, Ending.
- Edges from Start, from each choice of an Event, from Condition pass/fail, from Random (after/fallback), and from Next Period.
- Simple conditions on edges; AND/OR groups on Condition nodes.
- Random pools for in-between events.
- Card positions for BO.
- Remove direct-link fields that edges replace.
- Update `docs/GAME-RULES.md` and record the decisions in `docs/DECISIONS.md`.

**Done when:** a sample flow with every node type passes schema validation with tests.

Completed 2026-10-29. `src/content/v2/flow.ts` defines the six node types, card positions, edges with one optional simple condition, and the fixed ports for each node type. `checkV2FlowReferences` checks a flow against content: unknown or inactive events, events placed twice, pool events placed on the board, unknown endings and pools, and choice ports. Events have an optional `pool` tag. A test-only `sample-flow.json` uses every node type against the existing sample content. The current engine, BO, and `events.json` still use `goToEvent` and `selection.goToEventId`; Step 28 removes them when the engine follows edges, and Step 30 creates `public/content-v2/flow.json`.
