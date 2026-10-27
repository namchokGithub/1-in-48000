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

Define V2 schemas and sample data beside the current playable V1 content. This keeps the published game, BO, and save compatible while Steps 12–18 adopt the new contract. Permit negative integers for all seven stats; retain 100 as the upper bound for study, health, stress, relationships, and lucky, while money and debt remain unbounded above. Use one debt balance for every debt source. Keep the chance effect's branches limited to stat and flag changes so it cannot nest chance, schedule, or story jumps. Store the nominal percentage and a choice display mode in content; calculate the lucky adjustment later in the engine. Admit Years 1–8 with review points at Years 4, 6, and 8, leaving the exact graduation formula and Year 8 outcome open until Step 12. V2 excludes the ambience asset type and event field; runtime audio and setting migration follow in later steps.

## 2026-10-27 — V2 graduation, chance rolls, and save v3

Use `study − max(stress, 0) ÷ 10 ≥ 60` at the end of Years 4, 6, and 8. Failure at Year 4 or 6 continues into the next two study years; failure at Year 8 chooses an authored `dismissal` ending. Adjust a chance effect by `lucky ÷ 10` percentage points, clamp the effective chance to 0–100, and consume one saved RNG roll per effect. Record each decision's time and chance outcome in save v3 for the life-summary timeline. Migrate v2 saves from content versions `0.2.0`–`0.4.0` through the existing loader while preserving event/choice records, flags, pending effects, and RNG; set debt and lucky to zero and use unknown time for earlier decisions. Keep V2 engine/save modules isolated until Player and BO adopt them. Migrate separate audio settings to music enabled/volume only, defaulting to 20% when no valid setting exists; do not change the active V1 audio store yet.

## 2026-10-27 — Local BO route and shared controls

Serve BO HTML through a Vite development middleware at `/content-manage` and remove the public `bo.html` file. Production still builds only the Player entry. Use one dependency-free authored Select across BO forms, with a portal list, keyboard navigation, and typeahead; use checkboxes for boolean fields and a native modal `<dialog>` component for destructive draft deletion. Keep up to 100 Undo/Redo snapshots in memory and persist only when Save succeeds. The sticky Preview action focuses the existing preview panel until the modal preview work in Step 16. These shell changes keep the current V1 BO content editor in place while later steps add V2 data tabs and story editing.
