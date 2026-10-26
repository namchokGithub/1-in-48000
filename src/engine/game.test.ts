import { describe, expect, it } from 'vitest'
import configJson from '../../public/content/config.json'
import {
  eventSchema,
  gameConfigSchema,
  type Effect,
  type Event,
  type GameTime,
} from '../content/schema'
import {
  choose,
  createGame,
  getAvailableChoices,
  getCurrentEvent,
  summarizeLife,
  type GameContent,
} from './game'

const config = gameConfigSchema.parse(configJson)

function event(
  id: string,
  kind: Event['kind'],
  time: GameTime,
  effects: Effect[] = [],
): Event {
  return eventSchema.parse({
    id,
    kind,
    time,
    title: id,
    conditions: [],
    lines: [{ text: id }],
    choices: [{ id: 'continue', text: 'ต่อไป', conditions: [], effects }],
  })
}

function content(events: Event[]): GameContent {
  return {
    config: {
      ...config,
      startingTime: events[0].time,
      startingEventId: events[0].id,
    },
    events,
    endings: [
      {
        id: 'graduation',
        title: 'เรียนจบ',
        summary: 'เรื่องราวของฟ้า',
        conditions: [{ type: 'year', operator: 'eq', value: 4 }],
      },
      {
        id: 'fallback',
        title: 'ทางเลือกอื่น',
        summary: 'เรื่องราวอีกแบบ',
        conditions: [],
      },
    ],
  }
}

describe('headless game', () => {
  it('applies effects in order, clamps stats, and triggers a scheduled period effect', () => {
    const game = content([
      event('start', 'main', { year: 1, period: 'term1' }, [
        { type: 'statDelta', stat: 'health', amount: 50 },
        { type: 'statDelta', stat: 'money', amount: -2000 },
        { type: 'setFlag', flagId: 'met_mali', value: true },
        {
          type: 'schedule',
          trigger: { type: 'atPeriod', time: { year: 1, period: 'term2' } },
          effect: { type: 'statDelta', stat: 'relationships', amount: 5 },
        },
      ]),
      eventSchema.parse({
        ...event('later', 'main', { year: 1, period: 'term2' }),
        conditions: [
          {
            type: 'stat',
            stat: 'relationships',
            operator: 'gte',
            value: 55,
          },
        ],
      }),
    ])
    const start = createGame(game, 'ฟ้า', 7)
    const next = choose(game, start, 'continue')

    expect(start.stats.health).toBe(80)
    expect(next.stats).toMatchObject({
      health: 100,
      money: 0,
      relationships: 55,
    })
    expect(next.flags.met_mali).toBe(true)
    expect(next.currentTime).toEqual({ year: 1, period: 'term2' })
    expect(next.currentEventId).toBe('later')
    expect(next.pendingEffects).toEqual([])
  })

  it('runs an after-event effect and follows an explicit event link', () => {
    const game = content([
      event('start', 'main', { year: 1, period: 'term1' }, [
        {
          type: 'schedule',
          trigger: { type: 'afterEvent', eventId: 'start' },
          effect: { type: 'setFlag', flagId: 'orientation_done', value: true },
        },
        { type: 'goToEvent', eventId: 'linked' },
      ]),
      event('other', 'main', { year: 1, period: 'term1' }),
      event('linked', 'conditional', { year: 1, period: 'term2' }),
    ])
    const next = choose(game, createGame(game, 'ฟ้า', 7), 'continue')

    expect(next.flags.orientation_done).toBe(true)
    expect(next.currentEventId).toBe('linked')
    expect(next.currentTime).toEqual({ year: 1, period: 'term2' })
  })

  it('keeps an after-event effect pending until its later event resolves', () => {
    const time = { year: 1, period: 'term1' } as const
    const game = content([
      event('start', 'main', time, [
        {
          type: 'schedule',
          trigger: { type: 'afterEvent', eventId: 'later' },
          effect: { type: 'setFlag', flagId: 'help_returned', value: true },
        },
      ]),
      event('later', 'main', time),
    ])
    const afterStart = choose(game, createGame(game, 'ฟ้า', 7), 'continue')
    expect(afterStart.pendingEffects).toHaveLength(1)
    expect(afterStart.flags.help_returned).toBeUndefined()

    const afterLater = choose(game, afterStart, 'continue')
    expect(afterLater.flags.help_returned).toBe(true)
    expect(afterLater.pendingEffects).toEqual([])
  })

  it('selects main, holiday, conditional, then one random event per period', () => {
    const time = { year: 1, period: 'term1' } as const
    const game = content([
      event('start', 'main', time),
      event('random_a', 'random', time),
      event('conditional', 'conditional', time),
      event('holiday', 'holiday', time),
      event('main', 'main', time),
      event('random_b', 'random', time),
      event('next_period', 'main', { year: 1, period: 'break' }),
    ])
    let save = createGame(game, 'ฟ้า', 7)
    for (const expected of ['main', 'holiday', 'conditional']) {
      save = choose(game, save, 'continue')
      expect(save.currentEventId).toBe(expected)
    }
    save = choose(game, save, 'continue')
    expect(['random_a', 'random_b']).toContain(save.currentEventId)
    const picked = save.currentEventId
    const repeat = choose(game, createGame(game, 'ฟ้า', 7), 'continue')
    expect(repeat.currentEventId).toBe('main')
    save = choose(game, save, 'continue')
    expect(save.currentEventId).toBe('next_period')
    expect(save.history.at(-1)?.eventId).toBe(picked)
  })

  it('rejects a choice whose conditions do not hold', () => {
    const blocked = eventSchema.parse({
      ...event('start', 'main', { year: 1, period: 'term1' }),
      choices: [
        { id: 'yes', text: 'เข้าไป', conditions: [], effects: [] },
        {
          id: 'no',
          text: 'รอก่อน',
          conditions: [{ type: 'flag', flagId: 'invited', value: true }],
          effects: [],
        },
      ],
    })
    const game = content([blocked])
    const save = createGame(game, 'ฟ้า', 7)

    expect(
      getAvailableChoices(blocked, save).map((choice) => choice.id),
    ).toEqual(['yes'])
    expect(() => choose(game, save, 'no')).toThrow()
  })

  it('replays the same random result from the same save state', () => {
    const time = { year: 1, period: 'term1' } as const
    const game = content([
      event('start', 'main', time),
      event('random_a', 'random', time),
      event('random_b', 'random', time),
    ])
    const checkpoint = createGame(game, 'ฟ้า', 12345)
    const first = choose(game, checkpoint, 'continue')
    const reloaded = choose(game, structuredClone(checkpoint), 'continue')

    expect(first.currentEventId).toBe(reloaded.currentEventId)
    expect(first.rngState).toBe(reloaded.rngState)
    expect(first.rngState).not.toBe(checkpoint.rngState)
  })

  it('rejects a save from another content version', () => {
    const game = content([event('start', 'main', { year: 1, period: 'term1' })])
    const save = createGame(game, 'ฟ้า', 7)

    expect(() =>
      choose(game, { ...save, contentVersion: 'older-content' }, 'continue'),
    ).toThrow('Content version mismatch')
  })

  it('rejects a scheduled period that is not in the future', () => {
    const game = content([
      event('start', 'main', { year: 1, period: 'term1' }, [
        {
          type: 'schedule',
          trigger: { type: 'atPeriod', time: { year: 1, period: 'term1' } },
          effect: { type: 'statDelta', stat: 'study', amount: 5 },
        },
      ]),
    ])

    expect(() => choose(game, createGame(game, 'ฟ้า', 7), 'continue')).toThrow(
      'Scheduled period must be in the future',
    )
  })

  it('can complete all four years and produce a life summary', () => {
    const game = content([
      event('start', 'main', { year: 1, period: 'term1' }),
      event('final', 'main', { year: 4, period: 'summer' }),
    ])
    let save = createGame(game, 'ฟ้า', 7)
    expect(getCurrentEvent(game, save)?.id).toBe('start')
    save = choose(game, save, 'continue')
    expect(save.currentTime).toEqual({ year: 4, period: 'summer' })
    expect(getCurrentEvent(game, save)?.id).toBe('final')
    save = choose(game, save, 'continue')

    expect(save.currentEventId).toBeNull()
    expect(save.endingId).toBe('graduation')
    expect(summarizeLife(game, save)).toMatchObject({
      playerName: 'ฟ้า',
      title: 'เรียนจบ',
      eventsVisited: 2,
      choicesMade: 2,
      stats: config.initialStats,
    })
  })
})
