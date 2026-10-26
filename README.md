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
- **Graphics** — pixel-art scenes (campus, classroom, dorm, restaurant) and characters with poses.
- **Sound** — background music, ambience, and click sounds, with volume controls.
- **Save** — auto-save, continue, and restart.
- **Ending** — a life summary covering grades, relationships, and your path after graduation.
- **Devices** — mobile and desktop.

### BO (Back Office)

A content authoring and testing tool that runs **only on the author's machine**, separate from the public game.

- Add, edit, and delete events, choices, and endings.
- Drag-and-drop timeline editor.
- Conditions (e.g. academic year, money, past events) and effects (change stats, set flags, go to the next event).
- Bind images, music, and sounds by Asset ID.
- Preview events and try choices.
- Validate JSON: duplicate IDs, broken event links, and missing assets.
- Save JSON directly to the content files — no manual import/export.

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

The initial stat scales, four-year time sequence, conditions, effects, event selection, and JSON shapes are defined in [`docs/GAME-RULES.md`](docs/GAME-RULES.md). The schemas, sample content, and headless engine are in place; save persistence and BO editing follow in later steps.

## Content Publishing

```
Edit in BO → Save JSON → git push → Cloudflare Pages auto-deploys → Player loads the new JSON
```

## Saves and Backups

All player data lives in the browser (localStorage). Clearing site data deletes the save, and saves do not sync across devices. Export your save to keep a backup.

## Getting Started

Install dependencies and start the local dev server:

```bash
pnpm install
pnpm dev
```

Open the Player at `http://127.0.0.1:5173/` and BO at `http://127.0.0.1:5173/bo.html`. BO is available only in development; the production build includes only the Player.

Check the scaffold with:

```bash
pnpm lint
pnpm test
pnpm build
```

Vitest currently has no test files; logic tests begin with later steps.

## Roadmap

| Phase                 | Work                                                     | Outcome                                        |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| 1 — Rules             | Define tone, stats, time, and ending types               | Game rules and initial JSON schema             |
| 2 — One slice of life | Year 1, first term, about 10–15 events                   | Short playable slice with images, sound, saves |
| 3 — BO                | Content editing forms and preview                        | New story content added through BO             |
| 4 — Expand to MVP     | Cover Year 1–4 with shared events and side branches      | Game playable to several endings               |
| 5 — Test and release  | Check story paths, effects, old saves, mobile, and audio | Ready to deploy                                |

**MVP scope:** 1 study path, 30–40 events, 3–5 endings, 5–8 scenes, and one auto-save slot. Faculties, clubs, and relationship routes come later.

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
