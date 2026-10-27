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

- **New game** — name your character, then pick or randomize a starting background (family wealth, personality, skills).
- **Progression** — Year 1–4, split by term and key events, with semester breaks and summer sessions.
- **Stats** — study, money, health, stress, relationships.
- **Events** — main events, conditional events, Thai holiday events, and random events.
- **Choices** — immediate effects, delayed effects (good or bad), or dialogue-only changes.
- **Story memory** — the game remembers decisions such as helping a friend, joining a club, or taking a part-time job. They do not always pay off.
- **Graphics** — seven pixel-art scenes and character portraits referenced by Asset ID.
- **Sound** — looping background music with a simple on/off control.
- **Save** — auto-save, continue, and restart.
- **Ending** — a life summary covering grades, relationships, and your path after graduation.
- **Devices** — mobile and desktop.

### BO (Back Office)

A content authoring and testing tool that runs **only on the author's machine**, separate from the public game.

- Add, edit, and delete events, choices, and endings.
- Search events and filter the eight-year timeline by kind; drag events across periods or use the form and up/down controls on touch or keyboard.
- Conditions (e.g. academic year, money, past events) and effects (change stats, set flags, go to the next event).
- Bind images, music, and sounds by Asset ID.
- Preview Player dialogue and try choices in a modal without writing a player save.
- Validate JSON: duplicate IDs, broken event links, and missing assets.
- Save JSON directly to the content files — no manual import/export.

The current BO edits `events.json`, `endings.json`, `characters.json`, and `assets.json` in `public/content-v2`; config remains read-only. Data tabs manage speakers, scene images, and BGM/SFX by Asset ID. Asset files must be placed in `public/assets` before saving. Event and Choice IDs use `snake_case` and can be generated in the editor. The story form supports ordered dialogue and choices, delayed effects, chance, and inactive events. Search covers event IDs, titles, dialogue, and choice text. The timeline covers Years 1–8, filters by kind, and warns when a period has more than ten active main events without blocking additions. It moves event cards within or across periods, while up/down controls change authored order in the form. Event order affects precedence within each event kind, and ending order sets ending precedence. Preview starts from a sample game state at the selected event and shows dialogue with the Player view in a modal. Review `contentVersion` and save migration before publishing content changes.

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

Saves include `saveVersion` and `contentVersion` so older saves can be handled when content changes. Random results are stored (as a seed or rolled values) so reloading never changes an outcome.

The active V2 stat scales, extended-year progression, conditions, effects, event selection, and JSON shapes are defined in [`docs/GAME-RULES.md`](docs/GAME-RULES.md). The Player and BO share those rules.

The Player and BO now use V2 content version `0.5.0` in `public/content-v2`. It carries the 35 existing events, seven pixel scenes, and previous endings, plus debt/lucky stats and a Year 8 dismissal ending. Shared events carry the run from enrollment through Year 4; authored Years 5–8 story events remain future work. The earlier V1 content stays in `public/content` for migration checks. The Player starts music after a user action and keeps it playing across its pages until switched off.

## Audio Credits

- **Kanto Daydream** — [Turning_Pages](https://pixabay.com/users/turning_pages-50915814/) (Pixabay), used as the sample background music.

## Content Publishing

```
Edit in BO → Save JSON → git push → Cloudflare Pages auto-deploys → Player loads the new JSON
```

## Saves and Backups

All player data lives in the browser (localStorage). Clearing site data deletes the save, and saves do not sync across devices. Export your save to keep a backup.

The Player can download a save backup. Invalid or incompatible stored saves are preserved so the player can recover the raw data instead of losing it silently.

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

| Phase                 | Work                                                     | Outcome                                        |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| 1 — Rules             | Define tone, stats, time, and ending types               | Game rules and initial JSON schema             |
| 2 — One slice of life | Year 1, first term, about 10–15 events                   | Short playable slice with images, sound, saves |
| 3 — BO                | Content editing forms and preview                        | New story content added through BO             |
| 4 — Expand to MVP     | Cover Year 1–4 with shared events and side branches      | Complete: 35 events and 3 reachable endings    |
| 5 — Test and release  | Check story paths, effects, old saves, mobile, and audio | Ready to deploy                                |

**MVP scope:** 1 study path, 30–40 events, 3–5 endings, 5–8 scenes, and one auto-save slot. Faculties, clubs, and relationship routes come later.

**V2 progress:** BO story editing and the Player share V2 content, engine rules, and save v3. The author can write chance and delayed effects, search and filter the eight-year BO timeline, and preview choices in a modal. The Player starts with a random name, shows background and choice stat effects, tracks four to eight study years, and ends with a decision timeline. The light/dark Player themes and music-only control are implemented pending a mobile, desktop, and audio check. Authored Years 5–8 story content remains open. See [`docs/PROGRESS.md`](docs/PROGRESS.md).

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
