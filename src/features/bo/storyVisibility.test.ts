import { describe, expect, it } from 'vitest'
import { neighboringStoryIndex, orderedStoryEntries } from './storyVisibility'

describe('inactive story visibility', () => {
  it('places inactive stories last in the BO list while preserving authored indexes', () => {
    const events = [
      { id: 'first', active: false },
      { id: 'second' },
      { id: 'third', active: false },
      { id: 'fourth' },
    ]
    expect(
      orderedStoryEntries(events).map(({ event, index }) => [event.id, index]),
    ).toEqual([
      ['second', 1],
      ['fourth', 3],
      ['first', 0],
      ['third', 2],
    ])
    expect(events.map((event) => event.id)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
    ])
  })

  it('finds order controls within the visible active or inactive group', () => {
    const events = [
      { id: 'inactive_one', active: false },
      { id: 'active_one' },
      { id: 'inactive_two', active: false },
      { id: 'active_two' },
    ]
    expect(neighboringStoryIndex(events, 1, 1)).toBe(3)
    expect(neighboringStoryIndex(events, 3, 1)).toBe(-1)
    expect(neighboringStoryIndex(events, 2, -1)).toBe(0)
  })
})
