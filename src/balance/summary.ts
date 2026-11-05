import type { V2Content, V2Stats } from '../content/v2/schema'
import type { Policy, RunResult } from './simulate'

type Stat = keyof V2Stats
const STATS: Stat[] = [
  'study',
  'money',
  'health',
  'stress',
  'relationships',
  'debt',
  'lucky',
]

export type Spread = {
  min: number
  p10: number
  median: number
  p90: number
  max: number
  mean: number
}

export function spread(values: number[]): Spread {
  if (!values.length)
    return { min: 0, p10: 0, median: 0, p90: 0, max: 0, mean: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const at = (share: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]
  return {
    min: sorted[0],
    p10: at(0.1),
    median: at(0.5),
    p90: at(0.9),
    max: sorted.at(-1)!,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  }
}

export type GroupSummary = {
  policy: Policy
  programYears: number | null
  runs: number
  endings: Record<string, number>
  finalYears: Record<number, number>
  stats: Record<Stat, Spread>
  finalMoney: Spread
  grade: Spread
}

export function summarizeGroups(runs: RunResult[]): GroupSummary[] {
  const groups = new Map<string, RunResult[]>()
  for (const run of runs) {
    const key = `${run.policy}|${run.programYears}`
    groups.set(key, [...(groups.get(key) ?? []), run])
  }
  return [...groups.values()].map((group) => {
    const count = <K extends string | number>(key: (run: RunResult) => K) =>
      group.reduce(
        (totals, run) => {
          totals[key(run)] = (totals[key(run)] ?? 0) + 1
          return totals
        },
        {} as Record<K, number>,
      )
    return {
      policy: group[0].policy,
      programYears: group[0].programYears,
      runs: group.length,
      endings: count((run) => run.endingId ?? `error`),
      finalYears: count((run) => run.finalYear),
      stats: Object.fromEntries(
        STATS.map((stat) => [
          stat,
          spread(group.map((run) => run.stats[stat])),
        ]),
      ) as Record<Stat, Spread>,
      finalMoney: spread(group.map((run) => run.finalMoney)),
      grade: spread(
        group.flatMap((run) => (run.grade === null ? [] : [run.grade])),
      ),
    }
  })
}

export type ChoiceImpact = {
  eventId: string
  choiceId: string
  /** Runs that met the event and picked this choice. */
  picked: number
  /** Runs that met the event and picked something else. */
  others: number
  /** Mean final stat with this choice minus without it, among runs at the event. */
  delta: Record<Stat, number>
}

/**
 * How much each choice moves the final stats: among runs that met the event,
 * the mean final value of runs that picked the choice minus the mean of runs
 * that did not. Best read on `random` runs, where picks are unbiased.
 */
export function choiceImpacts(runs: RunResult[], minimum = 30): ChoiceImpact[] {
  const sums = new Map<string, { picked: number; pickedSum: number[] }>()
  const atEvent = new Map<string, { count: number; sum: number[] }>()
  for (const run of runs) {
    const values = STATS.map((stat) => run.stats[stat])
    const seenEvents = new Set<string>()
    for (const step of run.path) {
      if (!seenEvents.has(step.eventId)) {
        seenEvents.add(step.eventId)
        const total = atEvent.get(step.eventId) ?? {
          count: 0,
          sum: STATS.map(() => 0),
        }
        total.count += 1
        values.forEach((value, index) => (total.sum[index] += value))
        atEvent.set(step.eventId, total)
      }
      for (const choiceId of new Set(step.choiceIds)) {
        const key = `${step.eventId}|${choiceId}`
        const total = sums.get(key) ?? {
          picked: 0,
          pickedSum: STATS.map(() => 0),
        }
        total.picked += 1
        values.forEach((value, index) => (total.pickedSum[index] += value))
        sums.set(key, total)
      }
    }
  }
  const impacts: ChoiceImpact[] = []
  for (const [key, total] of sums) {
    const [eventId, choiceId] = key.split('|')
    const event = atEvent.get(eventId)!
    const others = event.count - total.picked
    if (total.picked < minimum || others < minimum) continue
    impacts.push({
      eventId,
      choiceId,
      picked: total.picked,
      others,
      delta: Object.fromEntries(
        STATS.map((stat, index) => [
          stat,
          total.pickedSum[index] / total.picked -
            (event.sum[index] - total.pickedSum[index]) / others,
        ]),
      ) as Record<Stat, number>,
    })
  }
  return impacts
}

/** Share of runs that met each event. */
export function eventReach(runs: RunResult[]): Map<string, number> {
  const reached = new Map<string, number>()
  for (const run of runs)
    for (const eventId of new Set(run.path.map((step) => step.eventId)))
      reached.set(eventId, (reached.get(eventId) ?? 0) + 1)
  return new Map(
    [...reached].map(([eventId, count]) => [eventId, count / runs.length]),
  )
}

/** The largest immediate stat changes written on any choice. */
export function strongestChoices(content: V2Content, limit = 15) {
  const rows: {
    eventId: string
    choiceId: string
    stat: Stat
    amount: number
  }[] = []
  for (const event of content.events)
    for (const choice of event.choices)
      for (const effect of choice.effects)
        if (effect.type === 'statDelta')
          rows.push({
            eventId: event.id,
            choiceId: choice.id,
            stat: effect.stat,
            amount: effect.amount,
          })
  // Money is counted in baht; compare it at a hundredth to the 0-100 stats.
  const size = (row: (typeof rows)[number]) =>
    Math.abs(
      row.stat === 'money' || row.stat === 'debt'
        ? row.amount / 100
        : row.amount,
    )
  return rows.sort((a, b) => size(b) - size(a)).slice(0, limit)
}

const percent = (part: number, whole: number) =>
  whole ? `${((part / whole) * 100).toFixed(1)}%` : '0%'
const number = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

function table(header: string[], rows: (string | number)[][]) {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

export function renderSummary(
  content: V2Content,
  runs: RunResult[],
  options: { command: string; generatedAt: string },
): string {
  const groups = summarizeGroups(runs)
  const random = runs.filter((run) => run.policy === 'random')
  const reach = eventReach(runs)
  const randomReach = eventReach(random)
  const errors = runs.filter((run) => run.error)
  const lines: string[] = [
    '# Balance report',
    '',
    `Generated ${options.generatedAt} with \`${options.command}\`.`,
    `${runs.length} runs, content \`${content.config.contentVersion}\`.`,
    '',
  ]
  if (errors.length) {
    lines.push(
      `## Runs that stopped early (${errors.length})`,
      '',
      ...[...new Set(errors.map((run) => run.error))]
        .slice(0, 20)
        .map((error) => `- ${error}`),
      '',
    )
  }

  lines.push('## Endings', '')
  const endingIds = [
    ...new Set(groups.flatMap((group) => Object.keys(group.endings))),
  ].sort()
  lines.push(
    table(
      ['Policy', 'Program', 'Runs', ...endingIds, 'Beyond program'],
      groups.map((group) => [
        group.policy,
        group.programYears ? `${group.programYears} yr` : '—',
        group.runs,
        ...endingIds.map((id) => percent(group.endings[id] ?? 0, group.runs)),
        percent(
          Object.entries(group.finalYears)
            .filter(([year]) => Number(year) > (group.programYears ?? 4))
            .reduce((sum, [, count]) => sum + count, 0),
          group.runs,
        ),
      ]),
    ),
    '',
  )

  lines.push(
    '## Final stats',
    '',
    'Median (p10–p90). Money is after the ending settles debt.',
    '',
  )
  const range = (value: Spread) =>
    `${number(value.median)} (${number(value.p10)}–${number(value.p90)})`
  lines.push(
    table(
      [
        'Policy',
        'Program',
        'Grade',
        'Study',
        'Health',
        'Stress',
        'Relations',
        'Lucky',
        'Money',
        'Debt',
      ],
      groups.map((group) => [
        group.policy,
        group.programYears ? `${group.programYears} yr` : '—',
        range(group.grade),
        range(group.stats.study),
        range(group.stats.health),
        range(group.stats.stress),
        range(group.stats.relationships),
        range(group.stats.lucky),
        range(group.finalMoney),
        range(group.stats.debt),
      ]),
    ),
    '',
  )

  const watch = [
    ['Study at 100', (run: RunResult) => run.stats.study >= 100],
    ['Health at or below 0', (run: RunResult) => run.stats.health <= 0],
    ['Stress at 90 or more', (run: RunResult) => run.stats.stress >= 90],
    [
      'Relationships at 100',
      (run: RunResult) => run.stats.relationships >= 100,
    ],
    ['Money negative after debt', (run: RunResult) => run.finalMoney < 0],
    ['Debt left at ending', (run: RunResult) => run.stats.debt > 0],
  ] as const
  lines.push(
    '## Watch list',
    '',
    table(
      [
        'Check',
        ...groups.map((group) =>
          `${group.policy} ${group.programYears ?? ''}`.trim(),
        ),
      ],
      watch.map(([label, test]) => [
        label,
        ...groups.map((group) => {
          const inGroup = runs.filter(
            (run) =>
              run.policy === group.policy &&
              run.programYears === group.programYears,
          )
          return percent(inGroup.filter(test).length, inGroup.length)
        }),
      ]),
    ),
    '',
  )

  if (random.length) {
    const impacts = choiceImpacts(random)
    lines.push(
      '## Choices that move final stats most (random runs)',
      '',
      'Mean final value when the choice is picked minus when another choice is picked at the same event. Money and debt in baht.',
      '',
    )
    for (const stat of [
      'study',
      'health',
      'stress',
      'relationships',
      'money',
    ] as Stat[]) {
      const top = [...impacts]
        .sort((a, b) => Math.abs(b.delta[stat]) - Math.abs(a.delta[stat]))
        .slice(0, 10)
      lines.push(
        `### ${stat}`,
        '',
        table(
          ['Event', 'Choice', 'Δ final', 'Picked', 'Other'],
          top.map((item) => [
            item.eventId,
            item.choiceId,
            (item.delta[stat] > 0 ? '+' : '') + number(item.delta[stat]),
            item.picked,
            item.others,
          ]),
        ),
        '',
      )
    }
  }

  lines.push(
    '## Largest single-choice changes in content',
    '',
    table(
      ['Event', 'Choice', 'Stat', 'Amount'],
      strongestChoices(content).map((row) => [
        row.eventId,
        row.choiceId,
        row.stat,
        row.amount,
      ]),
    ),
    '',
  )

  const active = content.events.filter((event) => event.active !== false)
  const never = active.filter((event) => !reach.has(event.id))
  lines.push(
    `## Events no run reached (${never.length} of ${active.length} active)`,
    '',
    never.length
      ? never.map((event) => `- \`${event.id}\` ${event.title}`).join('\n')
      : 'Every active event was reached.',
    '',
  )
  if (random.length) {
    const rare = [...randomReach]
      .filter(([, share]) => share < 0.05)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 30)
    lines.push(
      '## Rarely reached events (random runs, under 5%)',
      '',
      rare.length
        ? table(
            ['Event', 'Reached'],
            rare.map(([eventId, share]) => [eventId, percent(share, 1)]),
          )
        : 'None.',
      '',
    )
  }
  return lines.join('\n')
}
