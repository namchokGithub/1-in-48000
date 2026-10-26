# Game rules and data contract

This document defines the initial data model for "1 ใน 48,000". The content schemas live in `src/content/schema.ts`; the player save schema lives in `src/save/schema.ts`. The Player and BO must use these same schemas.

## Stats

| Stat            | Meaning                 | Valid value   |
| --------------- | ----------------------- | ------------- |
| `study`         | Academic progress       | Integer 0–100 |
| `money`         | Money available in baht | Integer ≥ 0   |
| `health`        | Physical well-being     | Integer 0–100 |
| `stress`        | Pressure on the student | Integer 0–100 |
| `relationships` | Strength of social ties | Integer 0–100 |

The engine will clamp bounded stats to 0–100 and money to a minimum of 0 after applying effects. Negative `statDelta` values are allowed so choices can reduce a stat. The schema validates stored values; it does not apply effects.

## Time

The game spans Years 1–4. Each year follows `term1 → break → term2 → summer`; the last phase leads to graduation. `break` is the semester break, while `summer` represents the summer period and may contain summer-session events. An event has one `{ year, period }` placement. The config declares the same four-year sequence.

## Conditions and choices

An event or choice may have conditions. All conditions in its array must hold; an empty array means unconditional. The first schema supports:

- `year`: compare the current year with `eq`, `gte`, or `lte`.
- `stat`: compare one stat with `eq`, `gt`, `gte`, `lt`, or `lte`.
- `flag`: compare a named boolean flag. An unset flag is treated as `false`.
- `pastEvent`: check whether an event was visited, using the save history.

Every event has at least one line and one choice. A choice may have no effects when it only changes dialogue. The event kinds are `main`, `conditional`, `holiday`, and `random`. Event selection and condition evaluation belong to Step 3.

## Effects

Choices contain an ordered list of effects:

- `statDelta`: add or subtract an integer amount from a stat.
- `setFlag`: set a named flag to `true` or `false`.
- `goToEvent`: direct the next event by ID.
- `schedule`: defer a `statDelta` or `setFlag` effect until entering a specified period (`atPeriod`) or resolving a specified event (`afterEvent`). Scheduled effects cannot contain another schedule or a story jump.

The engine will apply immediate effects in choice order and store scheduled effects in the save until their trigger occurs. A scheduled `atPeriod` trigger must point to a future period when the choice is taken. Runtime application and checking that links point to existing content are later steps.

## Content and saves

Content is versioned JSON in `public/content/`: `config.json`, `events.json`, `characters.json`, `assets.json`, and `endings.json`. Events and characters refer to media by Asset ID; paths appear only in `assets.json`. The Step 2 sample has no media assets yet.

The player save is separate from content and has `saveVersion: 1`, `contentVersion`, current time/event, stats, boolean flags, choice history, pending effects, and both `rngSeed` and `rngState`. Storing the current RNG state lets a later engine resume without changing future rolls. Only checkpoints will be persisted when Step 4 adds storage. Older save versions will be handled by migrations in Step 4.
