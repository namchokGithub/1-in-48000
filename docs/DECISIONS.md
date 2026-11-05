# Decisions

## 2026-10-26 — Development-only BO entry

Use `bo.html` as a second Vite development entry and set the production Rollup input to `index.html`. This lets the author open BO locally while keeping its code and HTML out of the public build. The dev server binds to `127.0.0.1`.

## 2026-10-26 — Initial game data scales and time model

Use 0–100 integer scales for study, health, stress, and relationships; store money as a nonnegative integer number of baht. Each of Years 1–4 has `term1`, `break`, `term2`, then `summer`. Flags are boolean. Scheduled effects can change stats or flags at a later period or event, but cannot redirect the story. These choices keep the first content and save formats small while supporting delayed consequences.

## 2026-10-26 — Event selection and ending precedence

After an explicit event link, select eligible unvisited events by `main`, `holiday`, then `conditional`; choose at most one random event per period. Preserve authored array order within each fixed-priority kind. Resolve the first matching ending in file order, allowing a final unconditional fallback. This gives authors a predictable main line while retaining controlled variation.

## 2026-10-26 — Single-slot save checkpoints

Use one versioned localStorage slot behind a `SaveStorage` interface and a vanilla Zustand store. Write after game start/restart or a resolved choice, including any event, term, delayed-effect, or ending transition in that choice. Load and export are read-only. Reject incompatible or invalid saves without deleting the stored data; no earlier save format exists yet, so the migration switch starts at version 1.

## 2026-10-26 — Starting background presets and save v2

Keep three starting presets in versioned game config so family situation, personality, skill, and stat deltas travel with content. Store only the selected preset ID in new saves. Migrate a v1 save from content `0.1.0` to v2/content `0.2.0` with a null background ID and unchanged stats, pending effects, and RNG state; the old run continues without retroactive modifiers. BO authoring for presets follows the BO core step because no BO editor exists yet.

## 2026-10-26 — Asset-backed sample and separate audio settings

Use small original PNG placeholders for the sample campus scene and Mali portrait until final art is available. Keep media paths in `assets.json`; the orientation event and character refer to Asset IDs. Play music only after a player action, fade looping tracks when the event changes or the player leaves, and store per-channel volume settings under a separate localStorage key so changing sound preferences never changes a game save.

## 2026-10-26 — Year 1 slice ending at the break

Author the vertical slice before BO core so the Player has a complete short story to preview. Keep ten main first-term events, optional friend and club follow-ups, and one random event before a break reflection. At a period boundary, allow an ending with a matching explicit true flag condition; unconditional fallbacks still wait until the end of Year 4. This reuses the existing ending schema and prevents the demo from silently jumping through unwritten years. Migrate compatible older saves to content version `0.3.0` without changing their save version or RNG state.

## 2026-10-26 — BO writes validated content in local development

Keep BO at `bo.html` on the loopback Vite dev server, with no BO entry in the Player production build. Its write endpoint accepts same-origin JSON requests only for `events.json` and `endings.json`. Re-read current content, validate it with the shared Zod schemas and cross-file checks, verify referenced asset files, then atomically replace the requested file. Config, characters, and the asset manifest remain read-only in this core editor. Preview starts from a synthetic initial save at the selected event and uses the shared engine to resolve one choice; it does not write a player save.

## 2026-10-26 — Four-year MVP and timeline ordering

Extend the shared main line to graduation with 35 events and seven scene assets. Use conditional money, club, and mentor events as short branches that merge into later main events. Keep three reachable Year 4 endings ordered by academic focus, community focus, then general graduation; preserve the two first-term demo ending IDs only for completed older saves. New runs stop setting `slice_complete` and continue into Year 1 term 2. Migrate compatible saves to content version `0.4.0` without changing save version, history, pending effects, or RNG state. In BO, native drag and drop moves an event within or across time slots; the form time fields and up/down controls remain the keyboard and touch alternatives. No drag dependency is added.

## 2026-10-27 — Isolated V2 content contract

Define V2 schemas and sample data beside the current playable V1 content. This keeps the published game, BO, and save compatible while Steps 12–18 adopt the new contract. Permit negative integers for all seven stats (debt was later limited to 0 and above; see "Debt never goes below zero"); retain 100 as the upper bound for study, health, stress, relationships, and lucky, while money and debt remain unbounded above. Use one debt balance for every debt source. Keep the chance effect's branches limited to stat and flag changes so it cannot nest chance, schedule, or story jumps. Store the nominal percentage and a choice display mode in content; calculate the lucky adjustment later in the engine. Admit Years 1–8 with review points at Years 4, 6, and 8, leaving the exact graduation formula and Year 8 outcome open until Step 12. V2 excludes the ambience asset type and event field; runtime audio and setting migration follow in later steps.

## 2026-10-27 — V2 graduation, chance rolls, and save v3

Use `study − max(stress, 0) ÷ 10 ≥ 60` at the end of Years 4, 6, and 8. Failure at Year 4 or 6 continues into the next two study years; failure at Year 8 chooses an authored `dismissal` ending. Adjust a chance effect by `lucky ÷ 10` percentage points, clamp the effective chance to 0–100, and consume one saved RNG roll per effect. Record each decision's time and chance outcome in save v3 for the life-summary timeline. Migrate v2 saves from content versions `0.2.0`–`0.4.0` through the existing loader while preserving event/choice records, flags, pending effects, and RNG; set debt and lucky to zero and use unknown time for earlier decisions. Keep V2 engine/save modules isolated until Player and BO adopt them. Migrate separate audio settings to music enabled/volume only, defaulting to 20% when no valid setting exists; do not change the active V1 audio store yet.

## 2026-10-27 — Local BO route and shared controls

Serve BO HTML through a Vite development middleware at `/content-manage` and remove the public `bo.html` file. Production still builds only the Player entry. Use one dependency-free authored Select across BO forms, with a portal list, keyboard navigation, and typeahead; use checkboxes for boolean fields and a native modal `<dialog>` component for destructive draft deletion. Keep up to 100 Undo/Redo snapshots in memory and persist only when Save succeeds. The sticky Preview action focuses the existing preview panel until the modal preview work in Step 16. These shell changes keep the current V1 BO content editor in place while later steps add V2 data tabs and story editing.

## 2026-10-27 — BO data files and story IDs

Treat the BO background tab as scene assets, alongside speaker records and BGM/SFX assets. Write speakers to `characters.json` and scene/sound entries to `assets.json` through the same local validator and atomic writer used by story files. Require the V2 `snake_case` convention for Event and Choice IDs in the active V1 schema so the current BO cannot author incompatible IDs; keep other existing ID rules until the V2 story editor migrates. Asset paths remain manifest references to files placed manually in `public/assets`, and Save checks their existence.

## 2026-10-27 — Shared V2 authoring and Player content

Keep the published V1 JSON under `public/content` for migration fixtures while authoring V2 in `public/content-v2`. BO and Player both load the V2 directory and use its schema and engine; the local BO writer validates the whole V2 content set before replacing one JSON file. Content version `0.5.0` retains existing event and ending IDs so the v2-to-v3 save migration can preserve progress. The optional `active` event flag defaults to enabled; inactive events are omitted from selection and cannot be direct-link targets. Move the Player's V2 runtime connection into Step 15 so a chance effect authored in BO can play, while later Player steps finish its presentation and audio controls.

## 2026-10-27 — BO timeline search and isolated preview

Count the more-than-ten-main-event warning from all active events in a year/period, independent of search and kind filters. When dragging a filtered card, map its drop position back to the full authored slot so hidden events retain their order. Preview uses the shared V2 engine and Player scene view inside a native modal. It activates the selected event only in an in-memory content copy and creates a sample save; preview choices never touch the Player save store.

## 2026-10-27 — Player gameplay information

Sample a new player's name from the versioned names file and keep the field editable. Sampling a background hides its selection in the creation form while retaining its ID for the new save. Show stat deltas and the engine's effective chance percentage before a choice; `statsOnly` reveals direction without amount. Extend the visible study timeline from four to six or eight years according to the current year, and render the saved choice history in the ending summary. A new game replaces the single save slot immediately after the player submits the creation form; the separate overwrite warning is removed.

## 2026-10-27 — Scoped Player themes and continuous music

Keep the existing shared teal tokens as the BO/base palette and override them only inside the Player shell for the approved cream/gold light and charcoal/gold dark themes. Persist the Player theme separately from the game save. Use the existing audio controller with the V2 music-only setting: migrate prior BGM volume, default new settings to 20%, and show one on/off button. Start music after a user action to respect browser autoplay rules, use an event BGM when present and the manifest's BGM otherwise, and continue music on home, creation, and ending pages until switched off.

## 2026-10-27 — Noto Sans Thai Light across Player and BO

Load the same Google Fonts 300-weight stylesheet in the Player entry and the local BO HTML response. Apply Noto Sans Thai Light 300 from the shared stylesheet to all UI text, overriding older utility and BO-specific weight rules so those classes do not synthesize heavier glyphs from the single loaded weight. The font request has `display=swap`; sans-serif remains the fallback when it is unavailable.

## 2026-10-27 — Retire V1 runtime after V2 adoption

Remove the unused V1 engine, content schema/loader/validator, save store, BO editors, and V1-only tests. BO accepts only the V2 content-write route, and the audio controller uses V2 music assets. The Player no longer loads saved games of any version when a page opens; it keeps a game in memory for the current page session while continuing to write localStorage checkpoints and allowing a current-session JSON download. Remove save migration code, legacy audio-settings conversion, and the old-load recovery UI. Preserve `public/content` JSON as an archive because this cleanup concerns code, not historical content; Player and BO never read it.

## 2026-10-28 — Extend the active content contract in place

Add faculties, majors, electives, and structured player-name records to the existing `public/content-v2` loader and Zod schema. A faculty explicitly enables six-year study; a major records four or six years, with cross-file validation requiring both records to agree. Model the first faculty-then-major choice as one program-selection event and Year 3 electives as another selection event; their catalog options are generated by gameplay later, avoiding duplicate authored faculty/major combinations. Multi-select events own `min`, `max`, and one `goToEventId`; their choices contain effects but no story links. Keep the current engine behavior until Step 21 and reset content/save version numbers to `0.1.0`/`1` because the unreleased older formats need no migration.

## 2026-10-28 — Resolve V3 selections and refresh checkpoints in place

Extend the existing engine/save modules rather than creating V3 copies. Roll the player name once from the names catalog when a run starts and persist its ID and advanced RNG state. Store faculty, major, elective, and every selected Choice ID in save v1; apply multi-select effects in authored order and elective effects before evaluating the next event. A six-year major skips the Year 4 review. Restore a valid unfinished checkpoint only after a reload in the same tab, using localStorage for the checkpoint and sessionStorage for tab activity; a new navigation or tab starts fresh. Endings clear the resume marker. Remove Player name editing and save download, and keep BO preview on the shared engine actions.

## 2026-10-28 — Author V3 catalogs through the existing BO writer

Keep faculty, major, elective, and player-name editors in the current BO draft and file-save flow. Register player portraits in the existing asset manifest via a portrait tab, then reference their Asset IDs from names. Each Save writes one JSON file after validating the complete content set and checking asset files; related new records may need to be saved in dependency order (faculty before major, portrait asset before name).

## 2026-10-28 — Author V3 event selections in the existing BO form

Expose the active selection modes and faculty/major/elective conditions in the shared BO story editor. A multi-select event owns its selection limits and destination, so its choices cannot add individual event links. Keep the Event list without drag and drop and retain its up/down buttons. Timeline event dragging remains available; this distinction reflects the author's Step 23 clarification.

## 2026-10-28 — Make the V3 selection path playable in active content

Place a two-of-three-choice event after the first Year 2 term-one main event and link it to the next authored event. Display the engine's seeded player name and the name record's portrait Asset ID next to stats; use three original pixel-style PNG placeholders until final portraits are available. Keep scheduled effects active but hide their details in Player choice previews. Advance active content to `0.2.0` so a same-tab checkpoint from the earlier story cannot restore against the changed event list.

## 2026-10-28 — Mix reused and new events for Years 5–8

Use a mix of adapted existing story beats and newly authored events for Years 5–8. Each adapted beat gets its own Event ID and later-year time so it can appear on a longer path after the original has been visited. Keep the shared main-line structure and give the longer study paths their own consequences and context. The exact event list and pacing remain content-authoring work; this decision does not mark Years 5–8 content complete.

## 2026-10-29 — Graph-driven story flow

Replace event selection by kind and period with a story flow graph. The run follows authored edges between Start, Event, Condition, Random, Next Period, and Ending nodes. An event's `kind`, `year`, and `period` remain only as BO library labels for search and filtering; the run's time comes from Next Period nodes.

- **Links:** Remove the `goToEvent` effect and `selection.goToEventId`; edges replace them. A single-select event has one edge per choice. Multi-select, program, and elective events have one outgoing edge.
- **Conditions:** An edge may hold one simple condition. A Condition node holds one group joined by either AND or OR, without nesting, and has pass and fail outputs.
- **Random pools:** Events carry a pool tag. A Random node names a pool, rolls one eligible event with the game seed, plays it, then continues on the node's "after" edge. A fallback edge is used when no pool event qualifies. The roll is recorded so a refresh restores the same path.
- **Program review:** The engine keeps the automatic study review. A Next Period node that leaves a review year's summer has a graduate output and an extend output. Failure at Year 8 still selects `dismissal`.
- **Board:** Each event appears on the board at most once; several paths may merge into it. V4 uses one board for the whole story, with year/term filters in the library. Splitting boards is a later option.
- **Data and library:** Store nodes, edges, and card positions in `public/content-v2/flow.json`. Use `@xyflow/react` (React Flow, MIT) for the BO board instead of a hand-built canvas.
- **BO:** Remove the Timeline tab once the Flow board is in place. Keep the Event list and form for editing event details.

## 2026-10-29 — Flow edge order, pool placement, and Next Period ports

Several edges may leave the same port, each with at most one simple condition; the engine follows the first in file order whose condition holds, so an unconditional edge is the port's fallback. This keeps simple branching on edges without a Condition node. Pool events are never placed on the board, so a Random node owns the path back into the main story through its `after` edge. Each Next Period node has `next`, `graduate`, and `extend` ports. The engine chooses `graduate` or `extend` only when the node leaves a review year's summer for the run's program; otherwise it follows `next`. One node type can then serve both 4-year and 6-year programs at the same point in the story.

## 2026-10-29 — Flow engine, story conversion, and ending choice

Convert the current story to `flow.json` in the same step as the flow engine, so the Player, BO writer, and tests keep working; the author reviews the converted flow on the board later. The conversion keeps the old selection order: each period's main and holiday events in file order, then conditional events as conditional edges, then one Random node per period that had random events, then a Next Period node.

The Ending node now decides the ending. Ending `conditions` were removed; the graduation choice between academic, community, and general endings became two Condition nodes after the review's `graduate` port. This also lets a student graduate after an extended Year 6 or Year 8, which the old `year = 4` ending conditions did not allow. An event's own `conditions` decide Random pool eligibility only; edges carry the conditions for placed events. The converted conditional events moved their single condition to the incoming edges. `config.startingEventId` was removed because the Start node's edge sets the opening event.

## 2026-10-29 — Flow validation errors and warnings

Treat missing required edges as errors and possible dead ends as warnings. The engine throws when a run reaches a port with no edge, so unconnected choices and missing Condition or Random outputs must block saving. Ports whose edges are all conditional, unreachable nodes, and loops may be intentional while authoring, so they warn without blocking. A loop containing a Next Period node is never reported, because time advances on each pass and the Year 8 review ends the run. The static check cannot know a Next Period node's time, so it only warns about a missing `next` or a `graduate`/`extend` pair with one side missing.

## 2026-10-29 — BO Flow board editing rules

The board edits only `flow.json`; event content stays in the Events form. Renaming an Event ID or a Choice ID in the form updates the matching card and edge ports in the draft flow, and deleting an event removes its card and edges, so routine edits do not leave broken references. Pool events cannot be placed on the board; a Random card points to a pool tag set in the event form. Condition, Random, Ending, and edge forms moved into the Step 31 right panel because a branching path cannot be built without them; Step 32 keeps the event form in the panel and the preview trace. The Timeline view was removed with its helpers, as decided for V4. React Flow is pinned to `@xyflow/react` 12.12.0.

## 2026-10-29 — Edit events from the Flow board in a modal

Authors edit an event's content from the Flow tab in a modal that reuses the event form, so building a path does not require switching tabs. The Flow tab's Save writes the events file before `flow.json`, because the local writer validates a flow against the events already on disk. A new event created from the board library is placed immediately and opened in the modal. BO dropdown lists render inside the nearest open dialog, since a list portaled to `document.body` sits beneath a modal dialog's top layer and cannot be clicked.

## 2026-10-29 — Preview trace through the engine

Preview reasons come from the engine itself: each choice action accepts an optional trace array, so the BO shows the same edge checks, Condition results, Random candidates, and review scores the Player run would use. The trace is not stored in the player save. The Flow board keeps the last preview path highlighted after the preview closes until the author clears it.

## 2026-10-29 — BO Flow board undo scope and card colors

Undo/Redo on the Flow board uses the existing BO draft history, which covers the whole draft: flow edits and event edits in one order. A separate flow-only history was planned but dropped in Step 36, because two histories over one draft break each other. Renaming an Event ID also renames it on the flow cards, so undoing only the flow would leave cards pointing at an event ID that no longer exists. Keyboard shortcuts act on the same history and leave text fields to their own undo. Auto layout needs no confirmation because it can be undone. Event cards are colored by `kind`; in V4 `kind` is only a label, so using it for color changes no game logic.

## 2026-10-29 — Flow board edge groups

Edges are grouped by meaning on the board only: normal, fallback, Condition pass, Condition fail, and key (study review results and edges into an Ending). The group is derived from the source card type, the port, and edge order, so `flow.json` stays unchanged. Groups differ mainly by width, dash, arrowheads, and a "สำรอง" label rather than new hues, because card kinds, errors and warnings, the preview trace, and focus already use most distinct colors. Trace and focus styles override group styles. Loop styling is deferred because it needs graph analysis.

## 2026-10-30 — Player outfits chosen per event

Each player name pairs one portrait per outfit, `casual` and `student`, in `names.json` (`portraits`). The pair is explicit content rather than matched by the number in a file name, so renaming or renumbering image files cannot silently pair the wrong pictures. An event picks the outfit with an optional `outfit` field, next to its scene and music; an event without one uses `student`. The outfit lives on the event, not on the Flow node, because each event is placed on the board once and the scene view already has the event, so the engine and save stay unchanged. The ending screen uses the default outfit. A name either has no portraits or has both, so no scene falls back to a missing picture. A line's own `portraitAssetId` still overrides the player portrait.

## 2026-10-30 — Narrator as a character

A character can be marked `isNarrator`, and at most one may be. A line without a speaker uses that character's name and portrait, in the Player and in the BO line preview; without a narrator it reads "เรื่องราว" with no portrait as before. The flag lives in `characters.json`, not `config.json`, because the BO saves the NPC tab to `characters.json` and has no editor that writes `config.json`. The narrator uses one portrait for every outfit, and a line's own `portraitAssetId` still overrides it.

## 2026-10-30 — Player UI images live with the Player code

The stat icons and the Home art are part of the Player's interface, not story content: no event or BO tab refers to them, and an author never swaps them per event. They live in `src/features/player/assets/` and are imported by the Player components, so Vite fingerprints them and they ship only with the Player. This is a deliberate exception to "reference images only by Asset ID": that rule covers content that authors pick and the BO validates. An image that content can choose still belongs in `assets.json`.

The create screen rolls the game seed when it opens and starts the game with that seed, so the name and portrait it shows are the ones the game uses (`previewV2Name` shares the engine's name roll).

## 2026-10-30 — Remove the V1 content archive

Delete `public/content/`. Player and BO load and write only `public/content-v2/`, no code or test reads the V1 JSON, and the V1 engine and save migrations that used it were removed earlier. Keeping it shipped stale files with the public build, and edits to it could be mistaken for live content. The files remain in Git history.

## 2026-10-30 — Automatic loans as negative money

Money may go below 0, and the negative balance is the automatic loan, so a choice is never blocked or split into a separate "borrow and choose" action, and every existing money −X effect works the same way without a new `cost` field. Interest uses bank-style simple interest, `principal × rate × days ÷ 36500`, charged from money at each Next Period for the days of the period that just ended, rounded to whole baht. The game counts time in periods, not days, so `config.loan.periodDays` maps each period to days (120/30/120/95, 365 in total) next to the yearly rate (15%), and the BO edits both in a "ตั้งค่าเกม" tab. Only the negative balance earns interest; debt that authors set keeps its value, because it stands for loans the story defines. Debt is repaid once, at the ending: the life summary derives money − debt without changing the save, so no save field or migration is needed and every ending, including dismissal, is covered.

## 2026-11-01 — Animated GIF content images

Content assets may also be `.gif`, so portraits and scenes can move without a CSS animation per picture. The asset path rule in `src/content/v2/schema.ts` is the only gate: the Player and BO show every content image with a plain `<img>`, which plays GIFs as they are. The 25 portraits now point to `/assets/gif/`; their Asset IDs did not change, so characters, names, and events need no edit. A GIF keeps playing under reduced motion, unlike the CSS animations; stopping it would need a still frame per picture and is not done. Animated WebP was already allowed and stays an option.

## 2026-11-02 — Offered character backgrounds

Content may hold any number of character backgrounds, but the start screen offers three so the choice stays quick. The `balanced` background is fixed by ID rather than by a new `pinned` field: it is the neutral default, the schema requires it, and BO locks its ID and blocks its removal. The other two are drawn from the game seed the start screen already rolls for the player name, with the seed mixed first so nearby seeds do not offer the same pair. Randomize picks among the three shown, so the player sees what they may get.

## 2026-11-03 — Flow board auto layout

Auto layout uses elkjs (`layered` algorithm), replacing the hand-written longest-path and barycenter layout. The hand-written layout skipped Sub Flows, so the frames and their cards kept their old positions and other cards were laid on top of them, and its edges still ran behind cards. ELK lays out Sub Flows as compound nodes (`hierarchyHandling: INCLUDE_CHILDREN`): it places the cards inside each frame, sizes the frame around them, and places the frame as one block. An empty Sub Flow keeps its size. Each card gets a fixed port at every React Flow handle, measured on the board with the far-zoom styles briefly removed, so choice ports keep their order and routes start and end exactly at the handles. Horizontal uses the right-side choice handles and the left input; vertical uses the bottom handles and the top input. A card not yet measured counts as 240 × 120.

ELK returns an orthogonal route for every edge. The route is stored as an optional `route` (board points from start to end) on the edge in `flow.json`, so the routed board survives a reload. It is a BO drawing hint like `position`: the engine and the Player ignore it. A route is dropped when either end card moves (including through its Sub Flow) or the edge is reconnected, and that edge falls back to the live smoothstep line until the next auto layout. Changing a card's size or its choices does not drop routes; running auto layout again refreshes them. elkjs is loaded with a dynamic import only when the author runs auto layout, and only the BO uses it, so it is not in the Player build. The layout is async but undoable as one change.

The board uses a 24px grid (`FLOW_GRID`) for the background dots, card drag snapping, and auto layout. 24 fits the 240px card width (10 cells), and ELK spacing uses multiples of it (48 between cards, 96 between layers, 12 between edges). ELK has no grid option for `layered`, so the result is snapped afterwards: card and Sub Flow positions round to the nearest cell, and a Sub Flow that holds cards rounds its size up with half a cell extra so snapped cards stay inside. Each route end moves with its snapped card and drags the next points along the same line, so every segment stays straight; a straight route whose ends snap apart gets a small step in the middle. Snapping moves a card at most half a cell, so edges that ELK placed close together may touch near their ends. Card heights vary, so only card corners sit on the grid, not every handle. Existing positions stay as saved until a card is dragged or the board is laid out again; resizing a Sub Flow by hand does not snap. Dragged cards follow the pointer freely and snap to the nearest cell only when released, because snapping during the drag made movement feel like lag. Arrow-key moves step one cell in their direction, since rounding a small keyboard step would leave the card where it was.

## 2026-11-03 — Stat changes per decision in the year memory

The engine records the stat change of each decision in the save history (`statChanges`) instead of the year memory deriving it from content effects. Deriving it would miss caps and clamping, multi-select totals, and elective effects, and could not tell which chance branch ran without repeating the engine's rules in the UI. The record covers only the decision's own effects: effects that wait for the event and Next Period changes, such as loan interest, belong to other causes. The year memory shows real amounts even for `statsOnly` chance effects, because the outcome is already known when the year is reviewed. The field is optional, so no save migration is needed.

## 2026-11-03 — Randomized Player choice display

Each event has `randomizeChoices`, defaulting to true in the content schema and in new BO event drafts. The Player deterministically shuffles only the displayed eligible choices from the game seed plus Event ID; it never advances the saved RNG state, so refreshes preserve the visible order and cannot alter later chance or Flow Random results. Turning the BO setting off preserves the authored choice order. Program and elective catalogs keep their existing order.

## 2026-11-03 — BO Flow Sub Flows

`group` is a visual-only Flow node for organising the BO board. A regular card may reference one group through `parentId`; its saved position is relative to that group's position, so moving the group moves its cards together. Groups cannot nest, cannot contain Start, and cannot own or receive an edge. The engine consequently never follows a group, and validation ignores groups when checking missing edges and reachability. Deleting a group keeps its cards and converts their positions back to board coordinates. This deliberately matches React Flow's parent-node grouping without changing the authored story graph or player runtime.

Each Sub Flow stores a named palette color, defaulting to green. The board renders that color at low opacity for its background and a muted border so it remains an organisational aid rather than competing with Story Flow cards and paths.

Cards are not constrained to a Sub Flow's visual boundary. Releasing a card outside every group removes its `parentId` and preserves its absolute board position; releasing it over another group moves it to that group. This makes drag-and-drop membership explicit while retaining React Flow's parent positioning model.

## 2026-11-03 — Independent BO themes

BO offers five palettes, with Misty Mint as the default. Its selection persists separately from Player settings and is applied at the document root so portal menus and dialogs inherit it. Flow type and edge status colors remain independent of the theme primary color, with dark-mode variants where needed.

## 2026-11-03 — BO Simulation beside the Story Flow board

Trying an event in the BO opens Simulation, a panel beside the Story Flow board, instead of a modal dialog, so the author sees the path on the board while playing and can try another answer without closing anything. The Events tab and the event editor open the same Simulation in the Story Flow tab; the old preview dialog is removed. Simulation is held in BoApp, so it stays open while the author switches tabs to fix content.

The session logic lives in `src/features/bo/simulation.ts`, separate from the panel. It keeps the save after each decision, so going back to a decision restores the exact save and RNG state from that point and the shared engine resolves the new answer. Choosing the same answer again therefore gives the same random results; "สุ่ม seed ใหม่" restarts with a new seed to see other outcomes. Restart keeps the current seed. The session plays a sandbox copy of the draft and never writes the player save or the draft.

The session keeps the draft it started from. If the draft changes in a way the engine reads, the panel says so and offers a restart with the latest draft, instead of locking editing or restarting by itself. Moving, resizing, or recoloring cards, Sub Flows, and edge routes does not count as a change. The board highlights the path taken, marks the card being played, and pans to it; leaving Simulation clears the highlight.

## 2026-11-03 — BO saves dependent files together and keeps unsaved drafts

The BO server checked each saved file against the other files on disk. Saving the Flow tab sent `events` then `flow` as separate requests, so a new choice and its new edge could never be saved: the new choice had no edge in the old `flow.json`, and the new edge pointed at a choice missing from the old `events.json`. The BO now sends every file of one save in a single `PUT /__bo/v2/content` request (`{ files: { events, flow } }`). The server checks them together with the rest of the content on disk, writes nothing unless the whole set is valid, and writes each file to a temporary name before swapping them in. The single-file endpoint stays for other callers. If a swap fails part-way on a disk error, some files may be written; this is accepted for a local tool, and saving again fixes it.

The BO also keeps the unsaved draft in browser storage through `src/save/boDraft.ts`, written 0.5 seconds after the last edit and when the page is hidden, and removed once nothing is unsaved. When the BO opens and a kept draft differs from the content files, a notice offers to restore or drop it; keeping is paused until the author chooses, so the old draft is not overwritten. The kept draft is not checked against the content schema, because unsaved work may still have errors; it only needs the shape the editor can open. It stores a fingerprint of the files it was edited from, and the notice warns when the files changed since, because restoring and saving would overwrite those changes. Undo history is not kept.


## 2026-11-04 — shadcn/ui in the BO only

The BO uses shadcn/ui components, starting with `Badge` (`src/components/ui/badge.tsx`), for counts and status chips. The setup was written by hand instead of with `shadcn init`, because `init` adds shadcn's own color variables and a base layer to `src/shared/styles.css`, which the Player also loads, and would change Player styles. Components are added with `pnpm dlx shadcn@latest add <name>`; `components.json` points `utils` at `@/lib/utils`, and new files must import `cn` from there (the CLI once installed the unrelated npm package `cn` instead).

Shadcn color names (`--primary`, `--secondary`, `--destructive`, `--border`, …) are defined only in `src/features/bo/colors.css` and point at the BO theme colors, so components follow every BO theme without `dark:` classes. `src/shared/styles.css` maps them to Tailwind color utilities with `@theme inline`, and adds no base layer. Tailwind also writes `--color-primary` and `--color-accent` into its theme layer; the unlayered values in `:root` still win, so existing Player and BO colors stay the same. Components get BO-specific variants, such as `warning`, instead of shadcn's default colors.

## 2026-11-04 — Hiding stat changes under choices

The Player shows each choice's stat changes before the player picks it. Two settings can hide this preview, and it is shown only when both allow it (`showsStatChanges` in `src/features/player/choicePreview.ts`):

- The event's optional `hideStatChanges` field, set in the BO with "แสดงผลต่อสถานะใต้ตัวเลือก". It applies to every choice of the event, and it is written only when true, like `hidePlayer`, so existing content does not change.
- The player's own setting, a header button kept in browser storage through `src/save/v2/statPreviewSettings.ts`. It belongs to the device, not the save, and defaults to showing.

When hidden, nothing replaces the preview, and chance effects hide their success percentage and outcomes too. Only the preview is hidden: the stat panel and the change notice after a choice still show the result, and author-written recaps are unchanged. The BO Simulation follows the event setting and always assumes the player chose to see changes.

## 2026-11-04 — Debt never goes below zero

Debt stops at 0. A negative debt would mean the bank owes the player, which reads as a balance in their favor and belongs in money instead. The engine limits debt to 0 whenever a stat changes, including when a background starts the game, and the stats schema rejects a negative debt in content and saves. Paying 500 against a debt of 300 leaves 0, and the change shown to the player is the 300 actually paid. Every other stat keeps its earlier rule: study, health, stress, relationships, and lucky may go below 0 and stop at 100, and money has no limit.


## 2026-11-04 — Grade point average at the ending

The ending shows a grade point average derived from the final study stat (`getV2Grade` in `src/engine/v2/game.ts`). Study 100 gives 4.00. Each band starts at its lower bound: 80–99 gives 3.xx, 60–79 gives 2.xx, 40–59 gives 1.xx, and 0–39 gives 0.xx. Negative study gives 0.00. Bands start at their lower bound, matching the graduation check (`≥ 60`), so a graduate always has at least 2.00. The top band is exactly 4.00 because study cannot exceed 100.

The hundredths are random but derive from the run seed (`rngSeed`) instead of the live RNG state, like the choice display order. The grade is the same on every refresh and does not change any later roll. It is computed for the life summary only, so the save has no new field. The grade uses the study stat alone; the graduation check still subtracts a tenth of positive stress.

## 2026-11-05 — Locking a Sub Flow frame

A Sub Flow frame can be locked so authors can move the cards inside it without grabbing the frame. The optional `locked` field on a group node is a BO-only board hint, like an edge `route`; the Player ignores it. It lives in `flow.json` rather than browser storage so a lock survives reloads and other machines, and it is written only when true. A locked frame cannot be dragged, resized, selected, or deleted (`removeFlowNodes` skips it, as it skips Start), and clicks and drags on its empty area reach the board behind it, so a selection box can start there. Cards inside behave as before. The lock button on the frame header and the Sub Flow menu stay clickable. Auto layout still moves locked frames, because the lock only guards against mouse slips. The Sub Flow panel offers the same lock switch and a fill opacity slider. `fillOpacity` is another optional BO-only group field, an integer percentage from 0 to 40 that is written only when it differs from the default 8; the frame border keeps its strength so a faint frame is still visible. The panel no longer has width and height fields, because frames are resized by dragging their corners.
