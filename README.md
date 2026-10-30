# 1-in-48000

---

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**"1 ใน 48,000"** — a choice-based university life simulation set in Thailand. Every choice shapes your story. Built with React, TypeScript, and Vite.

## Overview

Live one student's life at **ม.บารพู**, a fictional university inspired by Thai campus life, from enrollment to graduation. Balance study, money, health, stress, and relationships across four years of terms, breaks, and summer sessions.

- One life takes about **10–20 minutes** to play.
- **Multiple endings** and high replay value.
- "48,000" is the game's concept — you are one of many students. The game does not simulate 48,000 characters.
- Story structure: **a shared main line with side branches that merge back**. Everyone faces exams, but who helps you and how it turns out depend on what you did before.

## Features

### Player

- **New game** — receive a random name, pick or randomize a starting background, then choose a faculty and major.
- **Progression** — Year 1–4, split by term and key events, with semester breaks and summer sessions.
- **Stats** — study, money, health, stress, relationships.
- **Events** — main events, conditional events, Thai holiday events, and random events.
- **Choices** — immediate effects, delayed effects (good or bad), or dialogue-only changes.
- **Story memory** — the game remembers decisions such as helping a friend, joining a club, or taking a part-time job. They do not always pay off.
- **Graphics** — seven pixel-art scenes and character portraits referenced by Asset ID.
- **Sound** — looping background music with a simple on/off control.
- **Save** — checkpoint decisions and restore an unfinished run after refreshing the same tab.
- **Ending** — a life summary covering grades, relationships, and your path after graduation.
- **Devices** — mobile and desktop.

### BO (Back Office)

A content authoring and testing tool that runs **only on the author's machine**, separate from the public game.

- Add, edit, and delete events, choices, and endings.
- Build the story on a Flow board: place events, connect each choice to the next card, and add Condition, Random, Next Period, and Ending cards.
- Conditions (e.g. academic year, money, past events) on Flow edges and Condition cards, and effects (change stats, set flags).
- Bind images, music, and sounds by Asset ID.
- Preview Player dialogue and try choices in a modal without writing a player save; the preview lists the path taken with pass/fail reasons and highlights it on the board.
- Validate JSON: duplicate IDs, broken event links, missing assets, and Flow errors (unconnected choices) and warnings (unreachable cards, possible dead ends).
- Save JSON directly to the content files — no manual import/export.

The current BO edits `events.json`, `endings.json`, `characters.json`, `assets.json`, and `flow.json` in `public/content-v2`; config remains read-only. Data tabs manage speakers, scene images, and BGM/SFX by Asset ID. Asset files must be placed in `public/assets` before saving. Event and Choice IDs use `snake_case` and can be generated in the editor. The story form supports ordered dialogue and choices, delayed effects, chance, and inactive events. Search covers event IDs, titles, dialogue, and choice text. The Flow board decides story order: edges from the same choice are checked in file order, Random cards draw from an event pool, and Next Period cards advance time and run the study review. It supports focus on nearby paths, cards colored by kind, go-to search, keyboard shortcuts, Undo/Redo, and drag-to-reconnect edges. Preview starts from a sample game state at the selected event and shows dialogue with the Player view in a modal. Review `contentVersion` before publishing content changes.

## Tech Stack

| Area               | Choice                                         |
| ------------------ | ---------------------------------------------- |
| Frontend           | React + Vite + TypeScript                      |
| Styling            | Tailwind CSS                                   |
| State / Save       | Zustand + localStorage                         |
| Game logic         | Plain TypeScript, separate from UI             |
| Content validation | Zod                                            |
| Graphics           | Pixel art (WebP/PNG) + CSS animation           |
| Audio              | Howler.js                                      |
| BO                 | React, sharing schemas and logic with the game |
| Tests              | Vitest                                         |
| Package manager    | pnpm                                           |
| Hosting            | Cloudflare Pages                               |

## Data Model

Game content and player saves are separate from day one.

| Data        | Contents                                                    |
| ----------- | ----------------------------------------------------------- |
| Game config | Title, starting stats, progression rules                    |
| Events      | Story text, choices, conditions, effects, next events       |
| Characters  | Characters, background info, images                         |
| Assets      | Scenes, images, music, sounds                               |
| Endings     | Ending conditions and summary text                          |
| Player save | Current state, choice history, flags, content version, seed |

Checkpoint JSON includes `saveVersion`, `contentVersion`, and RNG state. The Player restores an unfinished run after refreshing the same tab; a new visit starts fresh.

The active V2 stat scales, extended-year progression, conditions, effects, event selection, and JSON shapes are defined in [`docs/GAME-RULES.md`](docs/GAME-RULES.md). The Player and BO share those rules.

The Player and BO use the shared content in `public/content-v2`. It carries 38 events, including program selection, a Year 2 multi-select event, and a Year 3 elective; seven pixel scenes, player portrait placeholders, previous endings, debt/lucky stats, and a Year 8 dismissal ending are also included. The active engine supports four- and six-year majors, elective effects, and multi-select decisions. Content version is `0.2.0`; Years 5–8 story content will mix adapted earlier story beats with newly authored events and remains future work. The Player starts music after a user action and keeps it playing across its pages until switched off.

## Audio Credits

- **Kanto Daydream** — [Turning_Pages](https://pixabay.com/users/turning_pages-50915814/) (Pixabay), used as the sample background music.

## Content Publishing

```
Edit in BO → Save JSON → git push → Cloudflare Pages auto-deploys → Player loads the new JSON
```

## Saves and Backups

The Player writes checkpoints to localStorage after starting and resolving choices. Refreshing the same tab restores an unfinished run; a new visit or tab starts fresh. Completed runs do not resume. There is no save file import or download.

## Getting Started

Install dependencies and start the local dev server:

```bash
pnpm install
pnpm dev
```

Open the Player at `http://127.0.0.1:5173/` and BO at `http://127.0.0.1:5173/content-manage`. BO is available only in development; the production build includes only the Player. In BO, edit a draft, use the sticky toolbar to undo, redo, preview, or save, and inspect validation messages before writing the matching JSON file.

Check the scaffold with:

```bash
pnpm lint
pnpm test
pnpm build
```

Vitest includes focused tests for content, engine, saves, audio settings, BO validation, and local file saving.

## Roadmap

| Phase                 | Work                                                | Outcome                                        |
| --------------------- | --------------------------------------------------- | ---------------------------------------------- |
| 1 — Rules             | Define tone, stats, time, and ending types          | Game rules and initial JSON schema             |
| 2 — One slice of life | Year 1, first term, about 10–15 events              | Short playable slice with images, sound, saves |
| 3 — BO                | Content editing forms and preview                   | New story content added through BO             |
| 4 — Expand to MVP     | Cover Year 1–4 with shared events and side branches | Complete: 35 events and 3 reachable endings    |
| 5 — Test and release  | Check story paths, effects, mobile, and audio       | Ready to deploy                                |
| V4 — Story flow       | Graph-driven story on a BO Flow board               | Complete: story order lives in `flow.json`     |

**MVP scope:** 1 study path, 30–40 events, 3–5 endings, 5–8 scenes, and one auto-save slot. Faculty and major selection is active; clubs and relationship routes come later.

**Current progress:** BO and Player share the updated content and engine. Steps 21–24 cover program and elective selection, a playable multi-select event, seeded player names and portraits, BO authoring, and same-tab refresh recovery. Player and BO use Noto Sans Thai Light 300. V4 moved story order to a graph in `flow.json` edited on the BO Flow board (Steps 27–36, complete). The author accepted the BO Flow edge styles (Step 37) and Player UX/UI pass, including the responsive check (Step 38), on 2026-10-30. Production release is deferred while further adjustments are made; Years 5–8 story content remains open under the agreed mix of adapted and new events. See [`docs/PROGRESS.md`](docs/PROGRESS.md).

### Future

- After graduating, start university again — events will not repeat the same way.

## Development Principles

- Small, focused, calm implementations. No speculative features or abstractions.
- Game logic stays in plain TypeScript, independent of UI.
- Content stays separate from player saves.
- Player and BO share one schema and one engine.
- No backend, accounts, multiplayer, or leaderboards in the MVP.
- Fictional names only — "ม.บารพู", never a real university.

See [`AGENTS.md`](AGENTS.md) for contributor and AI agent rules, and [`docs/REQUIREMENT.md`](docs/REQUIREMENT.md) for the full requirements.

---

© _2026 Namchok Singhachai_. 1 in 48000 is released under the [MIT License](LICENSE).
