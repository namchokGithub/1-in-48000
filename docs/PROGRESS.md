# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this table whenever an item's status changes.

| #   | Step                      | Status | Depends on |
| --- | ------------------------- | ------ | ---------- |
| 4   | Save                      | Todo   | 2, 3       |
| 5   | Player UI                 | Todo   | 3, 4       |
| 6   | Assets + audio            | Todo   | 2, 5       |
| 7   | Vertical slice            | Todo   | 5, 6       |
| 8   | BO core                   | Todo   | 2, 3       |
| 9   | BO timeline + MVP content | Todo   | 7, 8       |
| 10  | Test + release            | Todo   | 9          |

## Open decisions

| Topic            | Proposal                                                                                   | Status |
| ---------------- | ------------------------------------------------------------------------------------------ | ------ |
| BO file saving   | Vite dev-server plugin writes directly to `public/content/*.json` (no Import/Export flow). | Open   |
| Pixel art source | Use placeholder images until final art is provided.                                        | Open   |
| Step order       | Vertical slice (7) before BO core (8).                                                     | Open   |

Record each resolved decision in `docs/DECISIONS.md`.

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

**Status:** Todo

- Zustand game store.
- Storage interface + localStorage adapter.
- Auto-save at checkpoints only (choice resolved, event/term boundary, ending).
- Continue and restart.
- Save export (backup).
- Migration skeleton keyed on `saveVersion`.

**Done when:** save/load tests pass and reloading never changes an outcome.

## 5. Player UI

**Status:** Todo

- Start screen: new game, continue, restart.
- Character creation: name, pick or randomize background.
- Scene view: background, character pose, dialogue, choices.
- Stats display.
- Ending screen with life summary.
- Mobile and desktop layouts.

**Done when:** sample content is playable end to end.

## 6. Assets + audio

**Status:** Todo

- Asset manifest; all images and sounds referenced by Asset ID.
- Howler.js wrapper: looping BGM, ambience, SFX, fade.
- Volume settings (persisted with settings).
- Placeholder pixel art for scenes and characters.

**Done when:** events show images and play sound through Asset IDs.

## 7. Vertical slice

**Status:** Todo

- Write Year 1, first term: about 10–15 events.
- Include at least one conditional event, one delayed effect, and one random event.

**Done when:** the slice is playable to its end with images, sound, and saves (requirement phase 2).

## 8. BO core

**Status:** Todo

- Local-only BO page.
- Load and save content JSON directly to files.
- Forms to add, edit, and delete events, choices, and endings.
- Condition and effect editors.
- Asset ID binding for images, music, and sounds.
- Validator: duplicate IDs, broken event links, missing assets.
- Event preview with playable choices (shared engine).

**Done when:** new story content can be added through BO and plays in the Player page.

## 9. BO timeline + MVP content

**Status:** Todo

- Drag-and-drop timeline editor.
- Expand content to Year 1–4: 30–40 events, 3–5 endings, 5–8 scenes.
- Shared main line with branches that merge back.

**Done when:** the game is playable to several different endings.

## 10. Test + release

**Status:** Todo

- Check story paths and effects.
- Check loading older saves after content changes.
- Check mobile layouts and audio.
- Cloudflare Pages deploy from GitHub; confirm BO is not in the build.

**Done when:** the MVP is ready to deploy.
