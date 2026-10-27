import { describe, expect, it } from 'vitest'
import sample from '../../content/v2/sample-content.json'
import {
  v2EventSchema,
  v2GameConfigSchema,
  type V2Event,
} from '../../content/v2/schema'
import {
  chooseV2,
  createV2Game,
  getV2CurrentEvent,
  summarizeV2Life,
  type V2GameContent,
} from './game'

function event(
  id: string,
  year: number,
  effects: V2Event['choices'][number]['effects'] = [],
): V2Event {
  return v2EventSchema.parse({
    id,
    kind: 'main',
    time: { year, period: 'term1' },
    title: id,
    conditions: [],
    lines: [{ text: id }],
    choices: [{ id: 'continue_story', text: 'ต่อไป', conditions: [], effects }],
  })
}

function game(
  events: V2Event[],
  stats: Record<string, number> = {},
): V2GameContent {
  return {
    config: v2GameConfigSchema.parse({
      ...sample.config,
      startingEventId: events[0].id,
      initialStats: { ...sample.config.initialStats, ...stats },
    }),
    events,
    endings: [
      {
        id: 'study_complete',
        title: 'เรียนจบ',
        summary: 'เรียนสำเร็จ',
        conditions: [],
      },
      {
        id: 'dismissal',
        title: 'พ้นสภาพนักศึกษา',
        summary: 'ต้องเริ่มทางใหม่',
        conditions: [],
      },
    ],
  }
}

describe('V2 headless engine', () => {
  it('allows negative stats and debt while keeping bounded upper limits', () => {
    const content = game(
      [
        event('start', 1, [
          { type: 'statDelta', stat: 'money', amount: -2000 },
          { type: 'statDelta', stat: 'debt', amount: 500 },
          { type: 'statDelta', stat: 'health', amount: -1000 },
          { type: 'statDelta', stat: 'lucky', amount: -50 },
          { type: 'statDelta', stat: 'study', amount: 100 },
        ]),
      ],
      { money: 100, lucky: 10 },
    )
    const next = chooseV2(
      content,
      createV2Game(content, 'ฟ้า', 7),
      'continue_story',
    )
    expect(next.stats).toMatchObject({
      money: -1900,
      debt: 500,
      health: -920,
      lucky: -40,
      study: 100,
    })
  })

  it('uses lucky in a saved chance roll and replays the same outcome', () => {
    const chance = {
      type: 'chance' as const,
      successPercent: 3,
      displayMode: 'statsOnly' as const,
      successEffects: [
        { type: 'statDelta' as const, stat: 'money' as const, amount: 1000 },
      ],
      failureEffects: [],
    }
    const luckyGame = game([event('lottery', 1, [chance])], { lucky: 10 })
    const checkpoint = createV2Game(luckyGame, 'ฟ้า', 2049)
    const won = chooseV2(luckyGame, checkpoint, 'continue_story')
    const replay = chooseV2(
      luckyGame,
      structuredClone(checkpoint),
      'continue_story',
    )
    expect(won.stats.money).toBe(2200)
    expect(won.history[0].chanceOutcomes).toEqual([
      { effectIndex: 0, succeeded: true, effectivePercent: 4 },
    ])
    expect(won.rngState).not.toBe(checkpoint.rngState)
    expect(replay).toEqual(won)

    const ordinaryGame = game([event('lottery', 1, [chance])], { lucky: 0 })
    const lost = chooseV2(
      ordinaryGame,
      createV2Game(ordinaryGame, 'ฟ้า', 2049),
      'continue_story',
    )
    expect(lost.stats.money).toBe(1200)
    expect(lost.history[0].chanceOutcomes[0].effectivePercent).toBe(3)
    expect(lost.history[0].chanceOutcomes[0].succeeded).toBe(false)
  })

  it('keeps fractional chance percentages below 0.01% accurate', () => {
    const content = game(
      [
        event('tiny_chance', 1, [
          {
            type: 'chance',
            successPercent: 0.001,
            displayMode: 'amounts',
            successEffects: [{ type: 'statDelta', stat: 'money', amount: 100 }],
            failureEffects: [],
          },
        ]),
      ],
      { lucky: 0 },
    )
    const result = chooseV2(
      content,
      createV2Game(content, 'ฟ้า', 7132),
      'continue_story',
    )
    expect(result.history[0].chanceOutcomes[0].succeeded).toBe(false)
    expect(result.stats.money).toBe(1200)
  })

  it('graduates at year 4 when study minus one tenth of stress is at least 60', () => {
    const content = game([event('start', 1)], { study: 62, stress: 20 })
    const ended = chooseV2(
      content,
      createV2Game(content, 'ฟ้า', 1),
      'continue_story',
    )
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 4, period: 'summer' })
  })

  it('continues to year 5 and graduates at year 6 after raising study', () => {
    const content = game(
      [
        event('start', 1),
        event('second_chance', 5, [
          { type: 'statDelta', stat: 'study', amount: 15 },
        ]),
      ],
      { study: 50, stress: 0 },
    )
    const yearFive = chooseV2(
      content,
      createV2Game(content, 'ฟ้า', 1),
      'continue_story',
    )
    expect(yearFive.currentEventId).toBe('second_chance')
    expect(yearFive.currentTime).toEqual({ year: 5, period: 'term1' })
    const ended = chooseV2(content, yearFive, 'continue_story')
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 6, period: 'summer' })
  })

  it('continues through year 7 and dismisses a failing student after year 8', () => {
    const content = game([event('start', 1), event('last_try', 7)], {
      study: 50,
      stress: 0,
    })
    const yearSeven = chooseV2(
      content,
      createV2Game(content, 'ฟ้า', 1),
      'continue_story',
    )
    expect(yearSeven.currentEventId).toBe('last_try')
    const ended = chooseV2(content, yearSeven, 'continue_story')
    expect(ended.endingId).toBe('dismissal')
    expect(ended.currentTime).toEqual({ year: 8, period: 'summer' })
  })

  it('can pass at year 8 after a delayed study gain', () => {
    const content = game(
      [
        event('start', 1, [
          {
            type: 'schedule',
            trigger: { type: 'atPeriod', time: { year: 8, period: 'term1' } },
            effect: { type: 'statDelta', stat: 'study', amount: 15 },
          },
        ]),
      ],
      { study: 50, stress: 0 },
    )
    const ended = chooseV2(
      content,
      createV2Game(content, 'ฟ้า', 1),
      'continue_story',
    )
    expect(ended.stats.study).toBe(65)
    expect(ended.pendingEffects).toEqual([])
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 8, period: 'summer' })
  })

  it('records event, choice, time, and outcome for the life timeline', () => {
    const content = game([event('start', 1)], { study: 70 })
    const checkpoint = createV2Game(content, 'ฟ้า', 1)
    expect(getV2CurrentEvent(content, checkpoint)?.id).toBe('start')
    const ended = chooseV2(content, checkpoint, 'continue_story')
    const summary = summarizeV2Life(content, ended)
    expect(summary.timeline).toEqual([
      {
        time: { year: 1, period: 'term1' },
        eventId: 'start',
        eventTitle: 'start',
        choiceId: 'continue_story',
        choiceText: 'ต่อไป',
        chanceOutcomes: [],
      },
    ])
    expect(summary.title).toBe('เรียนจบ')
  })
})
