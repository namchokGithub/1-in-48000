# 1-in-48000

---

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**"1 ใน 48,000"** — a choice-based university life simulation set in Thailand. Every choice shapes your story. Built with React, TypeScript, and Vite.

## Overview

Live one student's life at **ม.บารพู**, a fictional university inspired by Thai campus life, from enrollment to graduation. Balance study, money, health, stress, and relationships across terms, breaks, and summer sessions. Four-year majors aim to finish in Year 4 and six-year majors in Year 6; a student who falls behind can stay until Year 8.

- One life takes about **10–20 minutes** to play.
- The game is in **Thai only**.
- **Multiple endings** and high replay value.
- "48,000" is the game's concept — you are one of many students. The game does not simulate 48,000 characters.
- Story structure: **a shared main line with side branches that merge back**. Everyone faces exams, but who helps you and how it turns out depend on what you did before.

## Features

### Player

- **New game** — receive a random name, pick or randomize a starting background, then choose a faculty and major.
- **Progression** — Year 1–8, split by term and key events, with semester breaks and summer sessions. Academic reviews in Years 4, 6, and 8 decide whether you graduate.
- **Stats** — study, money, health, stress, relationships, debt, and luck.
- **Events** — main events, conditional events, Thai holiday events, and random events.
- **Choices** — immediate effects, delayed effects (good or bad), or dialogue-only changes. Some locked choices show why they cannot be picked yet, and a choice can leave a short recap for the next scene.
- **Money and loans** — money can go below 0 as an automatic loan with yearly interest; debt is settled from money at the ending.
- **Life rules** — stats change a little each period, some stats make others grow faster or slower, and a stat pushed too far can end the run early (for example, burnout or dismissal).
- **Feedback** — a toast lists stat changes after each choice, and each new year opens with a summary of the year before.
- **Story memory** — the game remembers decisions such as helping a friend, joining a club, or taking a part-time job. They do not always pay off.
- **Graphics** — 40 pixel-art scenes and 25 character portraits referenced by Asset ID.
- **Sound** — looping background music with a simple on/off control.
- **Save** — checkpoint decisions and restore an unfinished run after refreshing the same tab.
- **Ending** — a life summary covering your grade point average, relationships, and your path after graduation.
- **Devices** — mobile and desktop.

### BO (Back Office)

A content authoring and testing tool that runs **only on the author's machine**, separate from the public game.

- Add, edit, and delete events, choices, and endings. Event and Choice IDs use `snake_case` and can be generated in the editor.
- Build the story on a Flow board: place events, connect each choice to the next card, and add Condition, Random, Next Period, and Ending cards. Group cards into lockable Sub Flows, and line cards up with helper lines and equal-spacing guides.
- Conditions (e.g. academic year, money, past events) on Flow edges and Condition cards, and effects (change stats, set flags).
- Bind images, music, and sounds by Asset ID.
- Preview Player dialogue and try choices in a modal without writing a player save; the preview lists the path taken with pass/fail reasons and highlights it on the board.
- Validate JSON: duplicate IDs, broken event links, missing assets, and Flow errors (unconnected choices) and warnings (unreachable cards, possible dead ends).
- Save JSON directly to the content files in `public/content-v2` — no manual import/export.
- List every flag with where it is set and checked.
- Game settings: loan rate and days per period, stat modifiers, stat endings, and per-period stat changes.

See [`docs/STORY-AUTHORING.md`](docs/STORY-AUTHORING.md) for how to write events and build the flow.

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
| Game config | Title, starting stats, backgrounds, loans, stat rules       |
| Events      | Story text, choices, conditions, effects                    |
| Flow        | Story order: which card follows each choice                 |
| Characters  | Characters, background info, images                         |
| Assets      | Scenes, images, music, sounds                               |
| Endings     | Ending titles and summary text                              |
| Player save | Current state, choice history, flags, content version, seed |

Checkpoint JSON includes `saveVersion`, `contentVersion`, and RNG state. The Player restores an unfinished run after refreshing the same tab; a new visit starts fresh.

The stat scales, progression, conditions, effects, stat rules, event selection, and JSON shapes are defined in [`docs/GAME-RULES.md`](docs/GAME-RULES.md). The Player and BO share those rules.

The content in `public/content-v2` has 319 events, 40 pixel scenes, 25 portraits for players and NPCs, and 6 endings. It supports four- and six-year majors, elective effects, and multi-select decisions.

## Versions

- App version: `0.8.0` (`package.json`).
- Content version: `0.3.0` (`public/content-v2/config.json`). Review it before publishing content changes.

## Privacy

The game has no accounts and no server. The save, theme, and music settings are kept only in your browser's localStorage. The page loads the Noto Sans Thai font from Google Fonts.

## Credits

- **Music:** Kanto Daydream by [Turning_Pages](https://pixabay.com/users/turning_pages-50915814/) (Pixabay), used as the sample background music.
- **Art:** pixel-art scenes and portraits were generated with AI, then edited and animated by the author.
- **Font:** [Noto Sans Thai](https://fonts.google.com/noto/specimen/Noto+Sans+Thai), SIL Open Font License 1.1.

## Content Publishing

```
Edit in BO → Save JSON → git push → Cloudflare Pages auto-deploys → Player loads the new JSON
```

## Saves and Backups

The Player writes checkpoints to localStorage after starting and resolving choices. Refreshing the same tab restores an unfinished run; a new visit or tab starts fresh. Completed runs do not resume. Confirming a return to the home page also ends the run, so refreshing stays on the home page. There is no save file import or download.

## Getting Started

Requirements: Node.js `^20.19.0` or `>=22.12.0`, and pnpm 11 (pinned in `packageManager`).

Install dependencies and start the local dev server:

```bash
pnpm install
pnpm dev
```

Open the Player at `http://127.0.0.1:5173/` and BO at `http://127.0.0.1:5173/content-manage`. BO is available only in development; the production build includes only the Player. In BO, edit a draft, use the sticky toolbar to undo, redo, preview, or save, and inspect validation messages before writing the matching JSON file.

Check the project with:

```bash
pnpm lint
pnpm test
pnpm build
```

Vitest includes focused tests for content, engine, saves, audio settings, BO validation, and local file saving.

To check stat balance, run the simulation and read the report in `reports/balance/`:

```bash
pnpm balance --runs 500 --seed 100
```

See [`docs/BALANCE.md`](docs/BALANCE.md) for policies, options, and how to read the report.

## Roadmap

| Phase                 | Work                                                | Outcome                                        |
| --------------------- | --------------------------------------------------- | ---------------------------------------------- |
| 1 — Rules             | Define tone, stats, time, and ending types          | Game rules and initial JSON schema             |
| 2 — One slice of life | Year 1, first term, about 10–15 events              | Short playable slice with images, sound, saves |
| 3 — BO                | Content editing forms and preview                   | New story content added through BO             |
| 4 — Expand to MVP     | Cover Year 1–4 with shared events and side branches | Complete: 35 events and 3 reachable endings    |
| V4 — Story flow       | Graph-driven story on a BO Flow board               | Complete: story order lives in `flow.json`     |
| 5 — Test and release  | Check story paths, effects, balance, mobile, audio  | In progress: stat balance before release       |

**Current progress:** the story covers Years 1–8, including a separate Years 5–6 story for six-year majors. Stat balance is being tuned with `pnpm balance` and the BO stat rules before the first release. See [`docs/PROGRESS.md`](docs/PROGRESS.md).

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
