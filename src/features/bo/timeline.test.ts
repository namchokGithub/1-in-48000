import { describe, expect, it } from 'vitest'
import eventsJson from '../../../public/content-v2/events.json'
import { v2EventSchema } from '../../content/v2/schema'
import { moveEvent } from './timeline'

const events = v2EventSchema.array().parse(eventsJson)

describe('BO timeline moves', () => {
  it('reorders an event inside its period without mutating the original list', () => {
    const reordered = moveEvent(
      events,
      'first_class',
      { year: 1, period: 'term1' },
      0,
    )
    expect(reordered.slice(0, 2).map((event) => event.id)).toEqual([
      'first_class',
      'orientation',
    ])
    expect(events[0].id).toBe('orientation')
    expect(reordered).toHaveLength(events.length)
  })

  it('moves an event into an empty period and updates its time', () => {
    const withYearTwo = [
      ...events,
      v2EventSchema.parse({
        ...events[0],
        id: 'year_two',
        time: { year: 2, period: 'term2' },
      }),
    ]
    const reordered = moveEvent(
      withYearTwo,
      'first_class',
      { year: 2, period: 'term1' },
      0,
    )
    const moved = reordered.find((event) => event.id === 'first_class')
    expect(moved?.time).toEqual({ year: 2, period: 'term1' })
    expect(reordered.indexOf(moved!)).toBeLessThan(
      reordered.findIndex((event) => event.id === 'year_two'),
    )
    expect(
      events.find((event) => event.id === 'first_class')?.time.period,
    ).toBe('term1')
  })

  it('inserts before a target card after accounting for the removed source', () => {
    const reordered = moveEvent(
      events,
      'orientation',
      { year: 1, period: 'term1' },
      2,
    )
    expect(reordered.slice(0, 3).map((event) => event.id)).toEqual([
      'first_class',
      'orientation',
      'dorm_evening',
    ])
  })

  it('moves a card before the first card in another occupied period', () => {
    const reordered = moveEvent(
      events,
      'first_class',
      { year: 1, period: 'break' },
      0,
    )
    const breakEvents = reordered.filter(
      (event) => event.time.year === 1 && event.time.period === 'break',
    )
    expect(breakEvents.slice(0, 2).map((event) => event.id)).toEqual([
      'first_class',
      'term_reflection',
    ])
  })

  it('rejects an unknown event instead of silently changing content', () => {
    expect(() =>
      moveEvent(events, 'missing', { year: 1, period: 'break' }, 0),
    ).toThrow('Unknown event')
  })

  it('never drops other draft cards when duplicate IDs are present', () => {
    const draft = [
      ...events,
      v2EventSchema.parse({ ...events[0], title: 'ร่างซ้ำ' }),
    ]
    expect(
      moveEvent(draft, 'orientation', { year: 1, period: 'break' }, 0),
    ).toHaveLength(draft.length)
  })
})
