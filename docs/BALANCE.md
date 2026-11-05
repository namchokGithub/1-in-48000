# Balance reports

`pnpm balance` plays the live content in `public/content-v2/` many times with the shared engine and writes a report for rebalancing events. It uses the same engine functions as the Player, so random pools, chance effects, delayed effects, and the Year 4, 6, and 8 reviews behave as in the game. Playing every path is impossible (a run makes about 110 decisions), so the tool samples many runs instead.

```sh
pnpm balance                                # 2,000 runs for each policy
pnpm balance --runs 500 --policy random,study
pnpm balance --major medicine --seed 100
```

| Option     | Default           | Meaning                                                            |
| ---------- | ----------------- | ------------------------------------------------------------------ |
| `--runs`   | `2000`            | Runs per policy.                                                   |
| `--policy` | all               | Comma-separated policies to play.                                  |
| `--major`  | every major       | Play only one major. Otherwise runs rotate through every major.    |
| `--seed`   | `1`               | First run seed. The same options and content give the same report. |
| `--out`    | `reports/balance` | Output folder. Reports are not committed.                          |

## Policies

Each simulated player decides only from what the Player shows before a choice: immediate stat changes and chance odds and outcomes. Delayed effects and flags are hidden, and an event with `hideStatChanges` gets a random pick. Ties break at random with the run seed.

| Policy   | Prefers                                                                       |
| -------- | ----------------------------------------------------------------------------- |
| `random` | Any available choice. Use this for the overall picture and for choice impact. |
| `study`  | Study.                                                                        |
| `money`  | Money (and less debt).                                                        |
| `health` | Health, then lower stress.                                                    |
| `social` | Relationships.                                                                |
| `chill`  | Lower stress, then health.                                                    |

Program, elective, and multi-select events follow the same policy. The background is picked at random for each run.

## Output

Each run writes a folder named after its time:

- `summary.md`: endings and runs that went beyond the program length, by policy and program length; final stats as median with p10–p90; a watch list of saturated or extreme stats; the choices whose pick moves final stats most (random runs only); the largest stat changes written on any choice; and events no run reached or few runs reached.
- `runs.csv`: one row per run with seed, policy, background, major, ending, final year, grade, final stats, and the number of decisions.
- `paths.jsonl`: one line per run with every `eventId:choiceId` in order.

Re-run with the same options after editing content to compare reports.
