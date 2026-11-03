import { describe, expect, it } from 'vitest'
import { keyboardChoiceSelector, nextEnabledIndex } from './choiceNavigation'

describe('choice navigation', () => {
  const locked = [false, true, false, true]

  it('moves to the next choice that can be picked and wraps around', () => {
    expect(nextEnabledIndex(locked, -1, 1)).toBe(0)
    expect(nextEnabledIndex(locked, 0, 1)).toBe(2)
    expect(nextEnabledIndex(locked, 2, 1)).toBe(0)
    expect(nextEnabledIndex(locked, 0, -1)).toBe(2)
  })

  it('has no choice when every one is locked', () => {
    expect(nextEnabledIndex([true, true], -1, 1)).toBe(-1)
    expect(nextEnabledIndex([], -1, 1)).toBe(-1)
  })

  it('includes dropdown triggers in the keyboard choice order', () => {
    expect(keyboardChoiceSelector).toContain('.player-select-trigger')
  })
})
