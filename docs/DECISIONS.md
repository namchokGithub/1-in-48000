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
