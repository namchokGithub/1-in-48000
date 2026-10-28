# Game rules and data contract

This document records historical rules and the active data contract for "1 ใน 48,000". The earlier V1/V2 descriptions remain as history. Player and BO share `src/content/v2/schema.ts`; Step 20 extends that file in place for the next ruleset. The engine and gameplay for those new fields follow in Step 21.

## Stats

| Stat            | Meaning                 | Valid value   |
| --------------- | ----------------------- | ------------- |
| `study`         | Academic progress       | Integer 0–100 |
| `money`         | Money available in baht | Integer ≥ 0   |
| `health`        | Physical well-being     | Integer 0–100 |
| `stress`        | Pressure on the student | Integer 0–100 |
| `relationships` | Strength of social ties | Integer 0–100 |

The engine will clamp bounded stats to 0–100 and money to a minimum of 0 after applying effects. Negative `statDelta` values are allowed so choices can reduce a stat. The schema validates stored values; it does not apply effects.

Starting backgrounds are authored in `config.json`. Each preset names a family situation, personality, and skill, and supplies integer deltas for all five starting stats. The Player may pick one or randomize. The engine applies its deltas to `initialStats`, then clamps the result using the same stat bounds. New saves reference the selected preset by ID.

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

The engine applies immediate effects in choice order and stores scheduled effects in the save until their trigger occurs. A scheduled `atPeriod` trigger must point to a future period when the choice is taken. BO uses the same Zod schemas, then checks duplicate IDs, event links, character and Asset ID references, and asset files before saving content.

## Headless progression

The engine starts at `config.startingEventId`. After a choice, an explicit `goToEvent` link takes precedence. Otherwise it selects eligible, unvisited events in this order: `main`, `holiday`, `conditional`, then one uniformly chosen `random` event per period. Events within the same kind follow their order in `events.json`. A holiday is placed by its authored period; there is no real-calendar lookup. When no event remains, the engine advances to the next period and applies effects due on entry. It skips empty periods and resolves an ending after Year 4 summer.

After all eligible events in a period are resolved, an ending whose conditions include a true `flag` condition may resolve before the next period. New MVP runs no longer set the old `slice_complete` flag, so they continue after the Year 1 break. The two first-term endings remain for saves completed in content version `0.3.0`. Current academic and community endings require the graduation event to have been visited; the general graduation ending is checked at the end of Year 4 summer. Endings are checked in file order; the first whose conditions all hold wins. Authors can place an unconditional fallback last without ending the game early. If no ending matches at the end of Year 4, the engine reports an error. The summary includes the ending text, final stats, and counts of choices and events.

Random selection uses the saved `rngState` and updates it after each roll, so continuing from the same save produces the same result. The engine rejects a save whose `contentVersion` differs from the loaded config.

## Content and saves

Content is versioned JSON in `public/content/`: `config.json`, `events.json`, `characters.json`, `assets.json`, and `endings.json`. Events and characters refer to media by Asset ID; paths appear only in `assets.json`. The four-year MVP has 35 authored events, seven pixel scenes, Mali's portrait, and BGM through the manifest. Audio volume settings live under a separate localStorage key and are not part of the player save.

The player save is separate from content and has `saveVersion: 2`, `contentVersion`, selected `backgroundId`, current time/event, stats, boolean flags, choice history, pending effects, and both `rngSeed` and `rngState`. Storing the current RNG state lets the engine resume without changing future rolls. Content version `0.4.0` adds the full four-year story; loading earlier `0.1.0`/v1 or `0.2.0`–`0.3.0`/v2 saves migrates their content version while preserving progress and RNG state.

The save store writes one localStorage slot when a game starts or restarts and after a choice resolves. Event and term transitions, delayed effects, and endings occur inside that resolved choice before the checkpoint is written. Loading and exporting do not write. Export returns the versioned save as JSON for the Player UI to offer as a backup download; if loading fails, it returns the untouched stored text for recovery. The loader validates the save and content version before continuing; unsupported versions or invalid data leave the stored slot untouched. A v1 save from content version `0.1.0` migrates to v2 with `backgroundId: null`; v2 saves from `0.2.0` or `0.3.0` keep their shape. All migrate to content version `0.4.0` while preserving stats, pending effects, and RNG state. Previously completed first-term saves retain their ending IDs and summaries.

## V2 data contract (Step 11)

`src/content/v2/schema.ts` defines the shared Player and BO contract; `src/content/v2/sample-content.json` remains a small test sample. The earlier `0.5.0` content was authored in `public/content-v2`. The V1 JSON in `public/content` remains only as an archive.

All seven stats are integers and can be negative. `study`, `health`, `stress`, `relationships`, and `lucky` retain a maximum of 100; `money` and the single `debt` balance have no upper bound. Debt covers student loans (กยศ./กรอ.), borrowing from friends, and gambling debt. Background presets provide deltas for all seven stats.

Time retains `term1 → break → term2 → summer`. A standard run spans four years; the V2 time schema admits Years 5–8 and records review years 4, 6, and 8. At each review, `study − max(stress, 0) ÷ 10 ≥ 60` graduates the student. Otherwise play continues at Year 5 or 7; failing at the end of Year 8 selects the authored `dismissal` ending. Event and Choice IDs must be lowercase snake_case; other content IDs keep the existing ID grammar. An event with `active: false` remains in the authoring data but is skipped by progression and cannot be a direct-link target.

A `chance` effect holds `successPercent` from 0 to 100, `successEffects`, `failureEffects`, and `displayMode`. Its outcome arrays can change stats or flags, but cannot nest another chance or schedule an effect. `amounts` discloses affected stat amounts; `statsOnly` discloses affected stats without amounts. The Player shows the effective success percentage in either mode. The engine computes `effectivePercent = clamp(successPercent + lucky ÷ 10, 0, 100)`, consumes one seeded roll, and saves both RNG state and outcome in the choice history. Random names are versioned content in `public/content-v2/names.json`, initially ฟ้า, มายด์, and อิม.

V2 events have no `ambienceAssetId`, and V2 assets allow scene, portrait, BGM, and SFX only. V2 audio settings contain only `musicEnabled` and `musicVolume`; absent or invalid settings default to enabled at 20%. The Player exposes a single on/off music button and starts playback after a user action. V2 complete-content validation rejects duplicate IDs and broken Event, character, and Asset ID references.

The earlier V2 player checkpoint used `saveVersion: 3`, the seven stats, decision history with `{ eventId, choiceId, time, chanceOutcomes }`, pending effects, and RNG seed/state. Before Step 20, the Player kept progress in memory for the current page session and did not read stored checkpoints on a new visit. The active content has no authored Years 5–8 story yet; the engine tests use synthetic events there. The agreed content approach for those years is a mix of adapted earlier story beats and new events. Adapted beats get distinct Event IDs and later-year times because progression tracks visits by Event ID.

## Current content contract (Step 20)

Step 20 extends the existing schema and `public/content-v2` files in place. Content version resets to `0.1.0` and the checkpoint shape starts at `saveVersion: 1`; no migration or compatibility loader is added. Step 21 implements the selection and progression behavior below in the same engine.

`faculties.json` holds `{ id, name, supportsSixYear }`. `majors.json` holds `{ id, facultyId, name, programYears }`, where `programYears` is 4 or 6. A six-year major is valid only when its faculty has `supportsSixYear: true`. `electives.json` holds `{ id, name, effects }`; elective effects are stat changes or flag changes. `names.json` now contains `{ id, name, portraitAssetId? }` records. When a portrait ID is present, it must point to a portrait asset in `assets.json`. IDs must be unique and references must resolve.

The fixed starting event has `selection: { type: 'program' }`. The Player picks a faculty, then offers only majors belonging to it. A Year 3 elective event uses `selection: { type: 'elective' }`; the catalog supplies the elective options and their stat or flag effects. A multi-select event uses `selection: { type: 'multiple', min, max, goToEventId }`: `1 ≤ min ≤ max ≤ number of authored choices`, the event-level link points to an active event, and its choices cannot contain `goToEvent`. The engine validates distinct, available selected choices, applies their effects in authored order, then follows the event-level link. Event/choice/ending conditions may reference a faculty, major, or elective ID; the shared schema validates those references and the engine evaluates them against the run.

Program reviews use `study − max(stress, 0) ÷ 10 ≥ 60`. A four-year program is reviewed at Year 4, then Year 6 and Year 8 after failed reviews. A six-year program starts reviews at Year 6, then Year 8. Failure at Year 8 selects dismissal. Save v1 records the randomly assigned name ID, faculty, major, elective, all selected Choice IDs, decision history, chance outcomes, and RNG seed/state. The life summary uses those IDs to describe program, elective, and multi-select decisions.

The store writes localStorage checkpoints after starting and resolving a decision. `sessionStorage` marks an unfinished run in the current tab. On a reload of that tab, the Player validates and restores the checkpoint only when content version and referenced IDs still match; a new visit or tab starts fresh, and an ending clears the resume marker. No save file import or download is offered. BO preview uses the same engine without writing a Player checkpoint.
