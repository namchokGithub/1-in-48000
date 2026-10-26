import { describe, expect, it } from 'vitest'
import config from '../../public/content/config.json'
import events from '../../public/content/events.json'
import characters from '../../public/content/characters.json'
import assets from '../../public/content/assets.json'
import endings from '../../public/content/endings.json'
import {
  assetListSchema,
  characterListSchema,
  endingListSchema,
  eventListSchema,
  gameConfigSchema,
} from './schema'

describe('content schemas', () => {
  it('accepts the sample content files', () => {
    expect(gameConfigSchema.safeParse(config).success).toBe(true)
    expect(eventListSchema.safeParse(events).success).toBe(true)
    expect(characterListSchema.safeParse(characters).success).toBe(true)
    expect(assetListSchema.safeParse(assets).success).toBe(true)
    expect(endingListSchema.safeParse(endings).success).toBe(true)
  })

  it('rejects stats and time outside the four-year model', () => {
    expect(
      gameConfigSchema.safeParse({
        ...config,
        initialStats: { ...config.initialStats, health: 101 },
      }).success,
    ).toBe(false)
    expect(
      eventListSchema.safeParse([
        { ...events[0], time: { year: 5, period: 'term1' } },
      ]).success,
    ).toBe(false)
  })

  it('rejects a delayed effect that schedules another delayed effect', () => {
    expect(
      eventListSchema.safeParse([
        {
          ...events[0],
          choices: [
            {
              ...events[0].choices[0],
              effects: [
                {
                  type: 'schedule',
                  trigger: {
                    type: 'atPeriod',
                    time: { year: 1, period: 'term2' },
                  },
                  effect: {
                    type: 'schedule',
                    trigger: {
                      type: 'atPeriod',
                      time: { year: 2, period: 'term1' },
                    },
                    effect: { type: 'statDelta', stat: 'study', amount: 2 },
                  },
                },
              ],
            },
          ],
        },
      ]).success,
    ).toBe(false)
  })

  it('rejects a delayed event jump', () => {
    expect(
      eventListSchema.safeParse([
        {
          ...events[0],
          choices: [
            {
              ...events[0].choices[0],
              effects: [
                {
                  type: 'schedule',
                  trigger: { type: 'afterEvent', eventId: 'orientation' },
                  effect: { type: 'goToEvent', eventId: 'graduation_event' },
                },
              ],
            },
          ],
        },
      ]).success,
    ).toBe(false)
  })

  it('requires asset paths to live under the asset manifest directory', () => {
    expect(
      assetListSchema.safeParse([
        { id: 'campus', kind: 'scene', path: '/other/campus.webp' },
      ]).success,
    ).toBe(false)
  })

  it('rejects a background with an incomplete stat adjustment', () => {
    expect(
      gameConfigSchema.safeParse({
        ...config,
        backgrounds: [
          {
            ...config.backgrounds[0],
            statDeltas: { study: 5 },
          },
        ],
      }).success,
    ).toBe(false)
  })
})
