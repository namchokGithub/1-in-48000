import { describe, expect, it } from 'vitest'
import names from '../../../public/content-v2/names.json'
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
    expect(names.map((entry) => entry.name)).toEqual(['ฟ้า', 'มายด์', 'อิม'])
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

  it('allows inactive stories but rejects links to them', () => {
    const content = v2ContentSchema.parse({ ...sample, names })
    content.events[1].active = false
    expect(v2ContentSchema.safeParse(content).success).toBe(true)
    content.events[0].choices[0].effects.push({
      type: 'goToEvent',
      eventId: content.events[1].id,
    })
    expect(v2ContentSchema.safeParse(content).success).toBe(false)
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
    expect(v2NamesSchema.safeParse([names[0], names[0]]).success).toBe(false)
    expect(v2NamesSchema.safeParse([{ ...names[0], name: ' ' }]).success).toBe(
      false,
    )
    expect(v2NamesSchema.safeParse(['ฟ้า']).success).toBe(false)
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

  it('accepts program, elective, and three-choice multi-select sample events', () => {
    const content = v2ContentSchema.parse({ ...sample, names })
    expect(
      content.events.find((event) => event.id === 'choose_program')?.selection,
    ).toEqual({ type: 'program' })
    expect(content.events[1].choices).toHaveLength(3)
    expect(content.events[1].selection).toMatchObject({
      type: 'multiple',
      min: 1,
      max: 2,
    })
    expect(
      content.events.find((event) => event.id === 'free_elective')?.selection,
    ).toEqual({
      type: 'elective',
    })
  })

  it('rejects invalid multi-select limits and choice-level story links', () => {
    const event = sample.events[1]
    expect(
      v2EventSchema.safeParse({
        ...event,
        selection: {
          type: 'multiple',
          min: 3,
          max: 2,
          goToEventId: 'lottery_ticket',
        },
      }).success,
    ).toBe(false)
    expect(
      v2EventSchema.safeParse({
        ...event,
        selection: {
          type: 'multiple',
          min: 1,
          max: 4,
          goToEventId: 'lottery_ticket',
        },
      }).success,
    ).toBe(false)
    expect(
      v2EventSchema.safeParse({
        ...event,
        choices: [
          {
            ...event.choices[0],
            effects: [{ type: 'goToEvent', eventId: 'lottery_ticket' }],
          },
          ...event.choices.slice(1),
        ],
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        events: sample.events.map((item, index) =>
          index === 1
            ? {
                ...item,
                selection: {
                  type: 'multiple',
                  min: 1,
                  max: 2,
                  goToEventId: 'missing_event',
                },
              }
            : item,
        ),
      }).success,
    ).toBe(false)
  })

  it('requires a program-selection start and a Year 3 elective event', () => {
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        events: sample.events.map((event) =>
          event.id === 'choose_program'
            ? { ...event, selection: undefined }
            : event,
        ),
      }).success,
    ).toBe(false)
    const elective = sample.events.find(
      (event) => event.id === 'free_elective',
    )!
    expect(
      v2EventSchema.safeParse({
        ...elective,
        time: { year: 2, period: 'term1' },
      }).success,
    ).toBe(true)
    expect(
      v2ContentSchema.safeParse({
        ...sample,
        names,
        events: sample.events.map((event) =>
          event.id === 'free_elective'
            ? { ...event, time: { year: 2, period: 'term1' } }
            : event,
        ),
      }).success,
    ).toBe(false)
  })

  it('validates faculty, major, elective, and player portrait references', () => {
    const base = { ...sample, names }
    expect(
      v2ContentSchema.safeParse({
        ...base,
        assets: [
          {
            id: 'fah_portrait',
            kind: 'portrait',
            path: '/assets/portrait/fah.png',
          },
        ],
        names: [{ ...names[0], portraitAssetId: 'fah_portrait' }],
        events: sample.events.map((event, index) =>
          index === 1
            ? {
                ...event,
                conditions: [
                  { type: 'faculty', facultyId: 'humanities' },
                  { type: 'major', majorId: 'thai_language' },
                  { type: 'elective', electiveId: 'creative_writing' },
                ],
              }
            : event,
        ),
      }).success,
    ).toBe(true)
    expect(
      v2ContentSchema.safeParse({
        ...base,
        majors: [{ ...sample.majors[1], facultyId: 'humanities' }],
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...base,
        majors: [{ ...sample.majors[0], facultyId: 'missing' }],
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...base,
        electives: [...sample.electives, sample.electives[0]],
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...base,
        names: [{ ...names[0], portraitAssetId: 'missing' }],
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...base,
        events: sample.events.map((event, index) =>
          index === 1
            ? {
                ...event,
                conditions: [{ type: 'faculty', facultyId: 'missing' }],
              }
            : event,
        ),
      }).success,
    ).toBe(false)
  })
})
