import { describe, expect, it } from 'vitest'
import { statChanges } from './statChanges'

const before = {
  study: 50,
  money: 1000,
  health: 80,
  stress: 20,
  relationships: 10,
  debt: 0,
  lucky: 0,
}

describe('stat changes', () => {
  it('lists only the stats that rose or fell, in panel order', () => {
    expect(
      statChanges(before, {
        ...before,
        money: 700,
        study: 55,
        stress: 20,
        debt: 500,
      }),
    ).toEqual([
      { stat: 'study', amount: 5 },
      { stat: 'money', amount: -300 },
      { stat: 'debt', amount: 500 },
    ])
    expect(statChanges(before, before)).toEqual([])
  })
})
