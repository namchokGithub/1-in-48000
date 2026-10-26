# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this table whenever an item's status changes.

| #   | Step           | Status | Depends on |
| --- | -------------- | ------ | ---------- |
| 10  | Test + release | Todo   | 9          |

## Open decisions

None. Resolved choices are recorded in `docs/DECISIONS.md`.

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

**Status:** Todo

- Check story paths and effects.
- Check loading older saves after content changes.
- Check mobile layouts and audio.
- Cloudflare Pages deploy from GitHub; confirm BO is not in the build.

**Done when:** the MVP is ready to deploy.
