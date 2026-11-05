import { describe, expect, it } from 'vitest'
import config from '../../public/content-v2/config.json'
import events from '../../public/content-v2/events.json'
import characters from '../../public/content-v2/characters.json'
import assets from '../../public/content-v2/assets.json'
import endings from '../../public/content-v2/endings.json'
import names from '../../public/content-v2/names.json'
import faculties from '../../public/content-v2/faculties.json'
import majors from '../../public/content-v2/majors.json'
import electives from '../../public/content-v2/electives.json'
import flow from '../../public/content-v2/flow.json'
import { v2ContentSchema } from '../content/v2/schema'
import { POLICIES, scoreEffects, simulateRun } from './simulate'
import { choiceImpacts, renderSummary, spread } from './summary'

const content = v2ContentSchema.parse({
  config,
  events,
  characters,
  assets,
  endings,
  names,
  faculties,
  majors,
  electives,
  flow,
})

describe('balance simulation', () => {
  it('plays every policy on the live content to an ending', () => {
    for (const policy of POLICIES) {
      const run = simulateRun(content, { seed: 7, policy })
      expect(run.error).toBeUndefined()
      expect(run.endingId).not.toBeNull()
      expect(run.path.length).toBeGreaterThan(0)
      expect(run.path[0].eventId).toBeTruthy()
    }
  })

  it('gives the same run for the same seed and options', () => {
    const options = { seed: 42, policy: 'random' as const, majorId: 'medicine' }
    expect(simulateRun(content, options)).toEqual(simulateRun(content, options))
    expect(simulateRun(content, options).majorId).toBe('medicine')
    expect(simulateRun(content, options).programYears).toBe(6)
  })

  it('scores only what a player sees before choosing', () => {
    const effects = [
      { type: 'statDelta' as const, stat: 'study' as const, amount: 4 },
      { type: 'statDelta' as const, stat: 'stress' as const, amount: 2 },
      {
        type: 'schedule' as const,
        trigger: { type: 'afterEvent' as const, eventId: 'later' },
        effect: {
          type: 'statDelta' as const,
          stat: 'study' as const,
          amount: 50,
        },
      },
    ]
    expect(scoreEffects(effects, 'study', 0)).toBe(4)
    expect(scoreEffects(effects, 'chill', 0)).toBe(-2)
    expect(scoreEffects(effects, 'random', 0)).toBe(0)
    const chance = {
      type: 'chance' as const,
      successPercent: 50,
      displayMode: 'amounts' as const,
      successEffects: [
        { type: 'statDelta' as const, stat: 'money' as const, amount: 1000 },
      ],
      failureEffects: [],
    }
    expect(scoreEffects([chance], 'money', 0)).toBe(5)
  })

  it('leans toward the stat a policy favours', () => {
    const mean = (policy: (typeof POLICIES)[number]) => {
      const runs = Array.from({ length: 20 }, (_, index) =>
        simulateRun(content, { seed: index + 1, policy }),
      )
      return runs.reduce((sum, run) => sum + run.finalMoney, 0) / runs.length
    }
    expect(mean('money')).toBeGreaterThan(mean('random'))
  })
})

describe('balance summary', () => {
  it('spreads values into percentiles', () => {
    expect(spread([5, 1, 3, 2, 4])).toEqual({
      min: 1,
      p10: 1,
      median: 3,
      p90: 5,
      max: 5,
      mean: 3,
    })
  })

  it('compares final stats of runs that picked a choice with the rest', () => {
    const run = (choice: string, study: number) => ({
      ...simulateRun(content, { seed: 1, policy: 'random' }),
      path: [{ eventId: 'quiz', choiceIds: [choice] }],
      stats: { ...content.config.initialStats, study },
    })
    const runs = [run('read', 80), run('read', 90), run('skip', 40)]
    const [read] = choiceImpacts(runs, 1).filter(
      (item) => item.choiceId === 'read',
    )
    expect(read).toMatchObject({ eventId: 'quiz', picked: 2, others: 1 })
    expect(read.delta.study).toBe(45)
  })

  it('writes a report with endings, stats, and unreached events', () => {
    const runs = POLICIES.map((policy) =>
      simulateRun(content, { seed: 3, policy }),
    )
    const report = renderSummary(content, runs, {
      command: 'pnpm balance --runs 1',
      generatedAt: '2026-11-05T00:00:00.000Z',
    })
    expect(report).toContain('## Endings')
    expect(report).toContain('## Final stats')
    expect(report).toContain('## Events no run reached')
  })
})
