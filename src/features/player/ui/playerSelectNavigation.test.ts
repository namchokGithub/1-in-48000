import { describe, expect, it } from 'vitest'
import { nextPlayerSelectIndex } from './playerSelectNavigation'

describe('player select navigation', () => {
  it('moves through the visible options and wraps at each end', () => {
    expect(nextPlayerSelectIndex(0, 3, 'ArrowDown')).toBe(1)
    expect(nextPlayerSelectIndex(2, 3, 'ArrowDown')).toBe(0)
    expect(nextPlayerSelectIndex(0, 3, 'ArrowUp')).toBe(2)
  })
})
