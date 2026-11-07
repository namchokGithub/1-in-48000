/**
 * Plays the live content many times with the shared engine and writes a
 * balance report. Usage:
 *
 *   pnpm balance [--runs 2000] [--policy random,study] [--major medicine]
 *                [--seed 1] [--out reports/balance]
 *                [--compare reports/balance/<earlier report>]
 *
 * `--runs` is per policy. Runs spread evenly over every major unless `--major`
 * picks one. The same options and content always give the same report.
 * Each report also writes `graduation.json`; `--compare` reads it from an
 * earlier report to fill the "Before" column of the Graduation table.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { v2ContentSchema } from '../src/content/v2/schema'
import { POLICIES, simulateRun, type Policy } from '../src/balance/simulate'
import {
  graduationRates,
  ratesFromSummary,
  renderSummary,
  type GraduationRate,
} from '../src/balance/summary'

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '2000' },
    policy: { type: 'string', default: POLICIES.join(',') },
    major: { type: 'string' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'reports/balance' },
    compare: { type: 'string' },
  },
})

// Reads graduation.json, or rebuilds the rates from an older summary.md.
function readBaseline(folder: string): GraduationRate[] {
  const json = join(folder, 'graduation.json')
  if (existsSync(json))
    return JSON.parse(readFileSync(json, 'utf8')) as GraduationRate[]
  const summary = join(folder, 'summary.md')
  if (existsSync(summary)) {
    const rates = ratesFromSummary(content, readFileSync(summary, 'utf8'))
    if (rates.length) return rates
  }
  console.error(
    `--compare: no graduation.json or Endings table in ${folder}. Check the report folder.`,
  )
  process.exit(1)
}

const runsPerPolicy = Number(values.runs)
const firstSeed = Number(values.seed)
const policies = values.policy.split(',').map((item) => item.trim())
for (const policy of policies)
  if (!POLICIES.includes(policy as Policy))
    throw new Error(`Unknown policy "${policy}". Use: ${POLICIES.join(', ')}`)
if (!Number.isInteger(runsPerPolicy) || runsPerPolicy < 1)
  throw new Error('--runs must be a positive whole number')

const files = [
  'config',
  'events',
  'characters',
  'assets',
  'endings',
  'names',
  'faculties',
  'majors',
  'electives',
  'flow',
]
const content = v2ContentSchema.parse(
  Object.fromEntries(
    files.map((file) => [
      file,
      JSON.parse(readFileSync(`public/content-v2/${file}.json`, 'utf8')),
    ]),
  ),
)
const majors = values.major
  ? content.majors.filter((major) => major.id === values.major)
  : content.majors
if (!majors.length) throw new Error(`Unknown major "${values.major}"`)
const baseline = values.compare ? readBaseline(values.compare) : undefined

const started = performance.now()
const runs = policies.flatMap((policy, policyIndex) =>
  Array.from({ length: runsPerPolicy }, (_, index) =>
    simulateRun(content, {
      seed: (firstSeed + policyIndex * runsPerPolicy + index) >>> 0,
      policy: policy as Policy,
      majorId: majors[index % majors.length].id,
    }),
  ),
)

const generatedAt = new Date().toISOString()
const folder = join(values.out, generatedAt.replace(/[:.]/g, '-'))
mkdirSync(folder, { recursive: true })

// const columns = [
//   'seed',
//   'policy',
//   'background',
//   'faculty',
//   'major',
//   'program_years',
//   'ending',
//   'final_year',
//   'grade',
//   'study',
//   'money',
//   'health',
//   'stress',
//   'relationships',
//   'debt',
//   'lucky',
//   'final_money',
//   'loan_left',
//   'decisions',
//   'error',
// ]
// const csv = [
//   columns.join(','),
//   ...runs.map((run) =>
//     [
//       run.seed,
//       run.policy,
//       run.backgroundId,
//       run.facultyId ?? '',
//       run.majorId ?? '',
//       run.programYears ?? '',
//       run.endingId ?? '',
//       run.finalYear,
//       run.grade ?? '',
//       run.stats.study,
//       run.stats.money,
//       run.stats.health,
//       run.stats.stress,
//       run.stats.relationships,
//       run.stats.debt,
//       run.stats.lucky,
//       run.finalMoney,
//       Math.max(0, -run.finalMoney),
//       run.path.length,
//       run.error ? `"${run.error.replaceAll('"', '""')}"` : '',
//     ].join(','),
//   ),
// ].join('\n')
// writeFileSync(join(folder, 'runs.csv'), `${csv}\n`)
// writeFileSync(
//   join(folder, 'paths.jsonl'),
//   runs
//     .map((run) =>
//       JSON.stringify({
//         seed: run.seed,
//         policy: run.policy,
//         major: run.majorId,
//         ending: run.endingId,
//         path: run.path.map(
//           (step) => `${step.eventId}:${step.choiceIds.join('+')}`,
//         ),
//       }),
//     )
//     .join('\n') + '\n',
// )
const command = `pnpm balance ${process.argv.slice(2).join(' ')}`.trim()
writeFileSync(
  join(folder, 'summary.md'),
  renderSummary(content, runs, {
    command,
    generatedAt,
    baseline,
    baselineLabel: values.compare,
  }),
)
writeFileSync(
  join(folder, 'graduation.json'),
  `${JSON.stringify(graduationRates(content, runs), null, 2)}\n`,
)

const seconds = ((performance.now() - started) / 1000).toFixed(1)
console.log(`${runs.length} runs in ${seconds}s → ${folder}`)
console.log('  summary.md  graduation.json')
const failed = runs.filter((run) => run.error).length
if (failed) console.log(`  ${failed} runs stopped early; see summary.md`)
