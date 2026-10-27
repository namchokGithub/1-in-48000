import { describe, expect, it } from 'vitest'
import { randomId } from './randomId'

describe('BO random IDs', () => {
  it('creates a snake_case ID and retries a collision', () => {
    const values = ['aaaaaaaa', 'bbbbbbbb']
    expect(randomId('event', ['event_aaaaaaaa'], () => values.shift()!)).toBe(
      'event_bbbbbbbb',
    )
  })
})
