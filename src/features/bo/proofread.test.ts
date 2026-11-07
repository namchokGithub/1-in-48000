import { describe, expect, it } from 'vitest'
import type { V2Event } from '../../content/v2/schema'
import {
  editableStatDeltas,
  neighborIndex,
  otherEffectCount,
  proofreadEntries,
  updateStatDelta,
  withSelectionMode,
} from './proofread'

type Brief = Pick<V2Event, 'id' | 'time' | 'active'>

const events: Brief[] = [
  { id: 'c_summer', time: { year: 1, period: 'summer' } },
  { id: 'a_term2', time: { year: 1, period: 'term2' } },
  { id: 'b_off', time: { year: 1, period: 'term1' }, active: false },
  { id: 'd_year2', time: { year: 2, period: 'term1' } },
  { id: 'e_term1', time: { year: 1, period: 'term1' } },
]

const ids = (sort: 'time' | 'id' | 'file') =>
  proofreadEntries(events, sort).map(({ event }) => event.id)

const choice: V2Event['choices'][number] = {
  id: 'pick',
  text: 'เลือก',
  conditions: [],
  effects: [
    { type: 'statDelta', stat: 'study', amount: 3 },
    { type: 'setFlag', flagId: 'met', value: true },
    {
      type: 'schedule',
      trigger: { type: 'afterEvent', eventId: 'next' },
      effect: { type: 'statDelta', stat: 'health', amount: -2 },
    },
    {
      type: 'chance',
      successPercent: 50,
      displayMode: 'amounts',
      successEffects: [],
      failureEffects: [],
    },
  ],
}

function event(selection?: V2Event['selection']): V2Event {
  return {
    id: 'evt',
    kind: 'main',
    randomizeChoices: true,
    time: { year: 1, period: 'term1' },
    title: 'ทดสอบ',
    selection,
    conditions: [],
    lines: [{ text: 'สวัสดี' }],
    choices: [choice, { ...choice, id: 'other' }, { ...choice, id: 'third' }],
  }
}

describe('proofread order', () => {
  it('sorts by year and period, keeping inactive events last', () => {
    expect(ids('time')).toEqual([
      'e_term1',
      'a_term2',
      'c_summer',
      'd_year2',
      'b_off',
    ])
  })

  it('sorts by ID or keeps file order', () => {
    expect(ids('id')).toEqual([
      'a_term2',
      'c_summer',
      'd_year2',
      'e_term1',
      'b_off',
    ])
    expect(ids('file')).toEqual([
      'c_summer',
      'a_term2',
      'd_year2',
      'e_term1',
      'b_off',
    ])
  })

  it('finds the previous and next event in the shown order', () => {
    const entries = proofreadEntries(events, 'time')
    expect(neighborIndex(entries, 1, 1)).toBe(0)
    expect(neighborIndex(entries, 1, -1)).toBe(4)
    expect(neighborIndex(entries, 4, -1)).toBe(-1)
    expect(neighborIndex(entries, 2, 1)).toBe(-1)
  })

  it('starts from the first shown event when the selection is hidden', () => {
    const shown = proofreadEntries(events, 'time').slice(1)
    expect(neighborIndex(shown, 4, 1)).toBe(1)
    expect(neighborIndex([], 4, 1)).toBe(-1)
  })
})

describe('proofread stat changes', () => {
  it('lists immediate and scheduled stat changes only', () => {
    expect(editableStatDeltas(choice)).toEqual([
      { effectIndex: 0, delayed: false, stat: 'study', amount: 3 },
      { effectIndex: 2, delayed: true, stat: 'health', amount: -2 },
    ])
    expect(otherEffectCount(choice)).toBe(2)
  })

  it('updates the stat and amount in place', () => {
    const next = updateStatDelta(updateStatDelta(choice, 0, { amount: 5 }), 2, {
      stat: 'stress',
      amount: 4,
    })
    expect(editableStatDeltas(next)).toEqual([
      { effectIndex: 0, delayed: false, stat: 'study', amount: 5 },
      { effectIndex: 2, delayed: true, stat: 'stress', amount: 4 },
    ])
    expect(next.effects[1]).toBe(choice.effects[1])
    expect(updateStatDelta(choice, 1, { amount: 9 }).effects[1]).toEqual(
      choice.effects[1],
    )
  })
})

describe('proofread selection mode', () => {
  it('switches between one choice and several', () => {
    const many = withSelectionMode(event(), 'multiple')
    expect(many.selection).toEqual({ type: 'multiple', min: 1, max: 2 })
    expect(withSelectionMode(many, 'single').selection).toBeUndefined()
    expect(withSelectionMode(many, 'multiple')).toBe(many)
  })

  it('keeps program and elective selections', () => {
    const program = event({ type: 'program' })
    expect(withSelectionMode(program, 'multiple')).toBe(program)
    const elective = event({ type: 'elective' })
    expect(withSelectionMode(elective, 'single')).toBe(elective)
  })
})
