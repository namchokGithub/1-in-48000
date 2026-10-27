import { describe, expect, it } from 'vitest'
import names from '../../../public/content/random-names.json'
import sample from './sample-content.json'
import {
  v2ContentSchema,
  v2EventSchema,
  v2NamesSchema,
  v2StatsSchema,
  v2TimeSchema,
} from './schema'

describe('V2 content contract', () => {
  it('accepts the isolated sample with debt, chance, and default names', () => {
    expect(v2ContentSchema.safeParse({ ...sample, names }).success).toBe(true)
    expect(names).toEqual(['ฟ้า', 'มายด์', 'อิม'])
  })

  it('allows negative stats but retains upper bounds for bounded stats', () => {
    const stats = {
      study: -20,
      money: -500,
      health: -5,
      stress: -10,
      relationships: -1,
      debt: -100,
      lucky: -2,
    }
    expect(v2StatsSchema.safeParse(stats).success).toBe(true)
    expect(v2StatsSchema.safeParse({ ...stats, health: 101 }).success).toBe(
      false,
    )
    expect(v2StatsSchema.safeParse({ ...stats, lucky: 101 }).success).toBe(
      false,
    )
  })

  it('accepts years 5 through 8 but rejects year 9', () => {
    expect(v2TimeSchema.safeParse({ year: 8, period: 'summer' }).success).toBe(
      true,
    )
    expect(v2TimeSchema.safeParse({ year: 9, period: 'term1' }).success).toBe(
      false,
    )
  })

  it('requires snake_case event and choice IDs', () => {
    const event = sample.events[0]
    expect(
      v2EventSchema.safeParse({ ...event, id: 'loan-event' }).success,
    ).toBe(false)
    expect(
      v2EventSchema.safeParse({
        ...event,
        choices: [{ ...event.choices[0], id: 'TakeLoan' }],
      }).success,
    ).toBe(false)
    expect(
      v2EventSchema.safeParse({ ...event, id: 'loan_event_2' }).success,
    ).toBe(true)
  })

  it('requires a chance percentage and one of two disclosure modes', () => {
    const event = sample.events[2]
    const choice = event.choices[0]
    const chance = choice.effects[1]
    expect(v2EventSchema.safeParse(event).success).toBe(true)
    expect(
      v2EventSchema.safeParse({
        ...event,
        choices: [
          {
            ...choice,
            effects: [choice.effects[0], { ...chance, successPercent: 101 }],
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      v2EventSchema.safeParse({
        ...event,
        choices: [
          {
            ...choice,
            effects: [choice.effects[0], { ...chance, displayMode: 'hidden' }],
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('rejects removed ambience fields and asset type', () => {
    expect(
      v2EventSchema.safeParse({
        ...sample.events[0],
        ambienceAssetId: 'rain',
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        assets: [{ id: 'rain', kind: 'ambience', path: '/assets/rain.mp3' }],
      }).success,
    ).toBe(false)
  })

  it('rejects duplicate or blank random names', () => {
    expect(v2NamesSchema.safeParse(['ฟ้า', 'ฟ้า']).success).toBe(false)
    expect(v2NamesSchema.safeParse(['ฟ้า', ' ']).success).toBe(false)
  })

  it('rejects duplicate event IDs and broken content references', () => {
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        events: [...sample.events, sample.events[0]],
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        config: { ...sample.config, startingEventId: 'missing_event' },
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        events: [{ ...sample.events[0], sceneAssetId: 'missing_scene' }],
      }).success,
    ).toBe(false)
  })
})
