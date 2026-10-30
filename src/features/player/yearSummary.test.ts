import { describe, expect, it } from 'vitest'
import { yearSummary } from './yearSummary'
import type { V2PlayerSave } from '../../save/v2/schema'

const stats = {
  study: 50,
  money: 1000,
  health: 80,
  stress: 20,
  relationships: 10,
  debt: 0,
  lucky: 0,
}
const entry = (eventId: string, year: number) => ({
  eventId,
  choiceIds: ['continue'],
  time: { year, period: 'term1' as const },
  chanceOutcomes: [],
})
const events = [
  { id: 'orientation', title: 'ปฐมนิเทศ' },
  { id: 'exam', title: 'สอบกลางภาค' },
  { id: 'year_two', title: 'ปีสองเริ่มแล้ว' },
]

describe('year summary', () => {
  it('summarizes the finished year once the next year has started', () => {
    // Events count every visit; highlights are the two largest bar-stat changes.
    const save = {
      currentTime: { year: 2, period: 'term1' },
      history: [
        entry('orientation', 1),
        entry('exam', 1),
        entry('exam', 1),
        entry('year_two', 2),
      ],
      finishedYear: {
        year: 1,
        startStats: stats,
        endStats: {
          ...stats,
          study: 62,
          health: 70,
          stress: 15,
          money: 400,
        },
        moneyIn: 300,
        moneyOut: 900,
      },
    } as unknown as V2PlayerSave
    expect(yearSummary(events, save)).toEqual({
      year: 1,
      changes: [
        { stat: 'study', amount: 12 },
        { stat: 'health', amount: -10 },
        { stat: 'stress', amount: -5 },
        { stat: 'money', amount: -600 },
      ],
      highlights: [
        { stat: 'study', amount: 12 },
        { stat: 'health', amount: -10 },
      ],
      moneyIn: 300,
      moneyOut: 900,
      events: ['ปฐมนิเทศ', 'สอบกลางภาค', 'สอบกลางภาค'],
    })
  })

  it('has nothing to show before a year ends or after it is old', () => {
    const save = {
      currentTime: { year: 3, period: 'term1' },
      history: [],
      finishedYear: null,
    } as unknown as V2PlayerSave
    expect(yearSummary(events, save)).toBeNull()
    expect(
      yearSummary(events, {
        ...save,
        finishedYear: {
          year: 1,
          startStats: stats,
          endStats: stats,
          moneyIn: 0,
          moneyOut: 0,
        },
      }),
    ).toBeNull()
  })
})
