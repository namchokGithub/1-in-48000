# Decisions

## 2026-10-26 — Development-only BO entry

Use `bo.html` as a second Vite development entry and set the production Rollup input to `index.html`. This lets the author open BO locally while keeping its code and HTML out of the public build. The dev server binds to `127.0.0.1`.

## 2026-10-26 — Initial game data scales and time model

Use 0–100 integer scales for study, health, stress, and relationships; store money as a nonnegative integer number of baht. Each of Years 1–4 has `term1`, `break`, `term2`, then `summer`. Flags are boolean. Scheduled effects can change stats or flags at a later period or event, but cannot redirect the story. These choices keep the first content and save formats small while supporting delayed consequences.

## 2026-10-26 — Event selection and ending precedence

After an explicit event link, select eligible unvisited events by `main`, `holiday`, then `conditional`; choose at most one random event per period. Preserve authored array order within each fixed-priority kind. Resolve the first matching ending in file order, allowing a final unconditional fallback. This gives authors a predictable main line while retaining controlled variation.
