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
const entry = (
  eventId: string,
  year: number,
  statChanges?: Record<string, number>,
) => ({
  eventId,
  choiceIds: ['continue'],
  time: { year, period: 'term1' as const },
  chanceOutcomes: [],
  statChanges,
})
const choices = [{ id: 'continue', text: 'ไปต่อ' }]
const content = {
  events: [
    { id: 'orientation', title: 'ปฐมนิเทศ', choices },
    { id: 'exam', title: 'สอบกลางภาค', choices },
    { id: 'year_two', title: 'ปีสองเริ่มแล้ว', choices },
  ],
  faculties: [],
  majors: [],
  electives: [],
} as unknown as Parameters<typeof yearSummary>[0]

describe('year summary', () => {
  it('summarizes the finished year once the next year has started', () => {
    // Events count every visit with the stat changes of that decision alone;
    // highlights are the two largest bar-stat changes of the year.
    const save = {
      currentTime: { year: 2, period: 'term1' },
      history: [
        entry('orientation', 1),
        entry('exam', 1, { money: -600, study: 12 }),
        entry('exam', 1, {}),
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
    expect(yearSummary(content, save)).toEqual({
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
      events: [
        { title: 'ปฐมนิเทศ', choiceText: 'ไปต่อ', changes: [] },
        {
          title: 'สอบกลางภาค',
          choiceText: 'ไปต่อ',
          changes: [
            { stat: 'study', amount: 12 },
            { stat: 'money', amount: -600 },
          ],
        },
        { title: 'สอบกลางภาค', choiceText: 'ไปต่อ', changes: [] },
      ],
    })
  })

  it('has nothing to show before a year ends or after it is old', () => {
    const save = {
      currentTime: { year: 3, period: 'term1' },
      history: [],
      finishedYear: null,
    } as unknown as V2PlayerSave
    expect(yearSummary(content, save)).toBeNull()
    expect(
      yearSummary(content, {
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
