# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this table whenever an item's status changes.

| #   | Step                  | Status      | Depends on |
| --- | --------------------- | ----------- | ---------- |
| 10  | Test + release        | In progress | 9          |
| 11  | V2 rules + schema     | Todo        | 9          |
| 12  | V2 engine + save      | Todo        | 11         |
| 13  | BO shell              | Todo        | 11         |
| 14  | BO data tabs          | Todo        | 13         |
| 15  | BO story editor       | Todo        | 12, 14     |
| 16  | BO timeline + preview | Todo        | 12, 15     |
| 17  | Player gameplay       | Todo        | 12         |
| 18  | Player UX/UI          | Todo        | 17         |
| 19  | V2 test + release     | Todo        | 16, 18     |

V2 order: rules and engine first (11–12), then BO (13–16), then Player (17–18). Requirements source: `docs/REQUIREMENT-V2.md`.

## Open decisions

| Topic                  | Proposal / known input                                                                                                              | Status |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Stat upper bound       | All stats may go negative. Keep the 100 upper bound for bounded stats unless changed.                                               | Open   |
| Extended study trigger | Based mainly on `study`, with a small `stress` weight, checked at the end of Year 4 (and Year 6). Exact formula and thresholds TBD. | Open   |
| Year 8 outcome         | Ending when the player still fails after Year 8 (e.g. dismissal).                                                                   | Open   |
| Years 5–8 content      | Reuse existing events, add new events, or a mix.                                                                                    | Open   |
| Lucky in chance rolls  | How `lucky` shifts a chance effect's success percentage (e.g. additive bonus, capped).                                              | Open   |

Resolved choices are recorded in `docs/DECISIONS.md`.

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

**Status:** In progress

- Check story paths and effects.
- Check loading older saves after content changes.
- Check mobile layouts and audio.
- Cloudflare Pages deploy from GitHub; confirm BO is not in the build.

**Done when:** the MVP is ready to deploy.

2026-10-27: MVP checks are complete. The Cloudflare Pages release has not been made yet.

## 11. V2 rules + schema

**Status:** Todo

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

## 12. V2 engine + save

**Status:** Todo

- Apply negative stat values and the new stat bounds.
- Resolve `chance` effects with the saved RNG state, adjusted by `lucky`.
- Extended study years (5–8) and the matching endings.
- Record the data needed for a decision/event timeline in the life summary.
- Save v3 with migration from v2 (new stats, removed ambience setting).

**Done when:** focused tests cover chance rolls, negative stats, debt, extended years, endings, and v2 → v3 migration.

## 13. BO shell

**Status:** Todo

- Move BO from `bo.html` to the `/content-manage` route; keep it local only and out of the production build.
- Shared Select component (no native dropdowns).
- Shared confirmation modal.
- Checkboxes for true/false values.
- Sticky toolbar with Save, Undo, Redo, and Preview.

**Done when:** BO opens at `/content-manage` locally, the production build does not include it, and the shared controls are in use.

## 14. BO data tabs

**Status:** Todo

- Tabs to manage speakers, backgrounds, and sounds (BGM and SFX only).
- Random ID generator.
- snake_case validation for Event IDs and Choice IDs.

**Done when:** speakers, backgrounds, and sounds can be added, edited, and removed through BO and pass validation.

## 15. BO story editor

**Status:** Todo

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

**Done when:** an event with dialogue, choices, conditions, delayed effects, and a chance effect can be authored through the new form and plays in the Player page.

## 16. BO timeline + preview

**Status:** Todo

- Search and filter events.
- Timeline filter by event kind.
- Warning when a year/period has more than 10 `main` events; adding is still allowed.
- Timeline columns for Years 5–8.
- Event preview opens in a modal.
- Live preview that shows dialogue as in the Player page.

**Done when:** authors can find events, filter the timeline, see the main-event warning, and preview an event in a modal.

## 17. Player gameplay

**Status:** Todo

- Random player name from the names file.
- Show stat effects on each starting background.
- Randomizing a background does not reveal which one was chosen.
- Choices show which stats go up or down, success percentages, and stats that may decrease without the amount (per the chance display mode).
- Timeline of 4 years, extending to 6 or 8.
- Life summary shows decisions and events as a timeline.
- Start a new life without the "เซฟเดิมจะถูกแทนที่" warning.

**Done when:** a run plays from a random name to an ending with the new choice information and summary timeline.

## 18. Player UX/UI

**Status:** Todo

Reference: `docs/image/REQUIREMENT-V2/1793068013050.png`.

- Widen content to align with the logo edge.
- Place action buttons on the right.
- Show the scene name only in the title, not inside the image.
- Light theme (white and soft yellow) and dark theme (dark gray with a touch of gold).
- Music plays across all playable pages.
- Music-only sound control: an on/off button, default volume 20%, no settings panel.

**Done when:** the user checks the layout, themes, and music by eye on mobile and desktop.

## 19. V2 test + release

**Status:** Todo

- Check story paths, chance outcomes, debt, and extended years.
- Check loading v2 saves after the V2 content changes.
- Check mobile layouts, both themes, and music.
- Cloudflare Pages deploy; confirm BO is not in the build.

**Done when:** V2 is ready to deploy.
