import { describe, expect, it } from 'vitest'
import type { V2Event, V2Stats } from '../../content/v2/schema'
import {
  describeChoiceEffects,
  formatStatChange,
  showsStatChanges,
} from './choicePreview'

const stats: V2Stats = {
  study: 50,
  money: 1200,
  health: 80,
  stress: 20,
  relationships: 50,
  debt: 0,
  lucky: 10,
}

function choice(effects: V2Event['choices'][number]['effects']) {
  return { id: 'try_it', text: 'ลอง', conditions: [], effects }
}

describe('Player choice information', () => {
  it('describes immediate changes without revealing delayed effects', () => {
    expect(formatStatChange('money', -500)).toBe('เงิน -500 ฿')
    expect(
      describeChoiceEffects(
        choice([
          { type: 'statDelta', stat: 'study', amount: 5 },
          {
            type: 'schedule',
            trigger: { type: 'atPeriod', time: { year: 2, period: 'term1' } },
            effect: { type: 'statDelta', stat: 'stress', amount: -2 },
          },
        ]),
        stats,
      ),
    ).toEqual([{ stat: 'study', text: 'การเรียน +5' }])
  })

  it('shows only stat icons for statsOnly, without chance or names', () => {
    expect(
      describeChoiceEffects(
        choice([
          {
            type: 'chance',
            successPercent: 3,
            displayMode: 'statsOnly',
            successEffects: [
              { type: 'statDelta', stat: 'money', amount: 1000 },
            ],
            failureEffects: [{ type: 'statDelta', stat: 'health', amount: -4 }],
          },
        ]),
        stats,
      ),
    ).toEqual([
      { stat: null, text: 'สำเร็จ', icons: ['money'] },
      { stat: null, text: 'ไม่สำเร็จ', icons: ['health'] },
    ])
  })

  it('shows disclosed amounts and accounts for an earlier lucky change', () => {
    expect(
      describeChoiceEffects(
        choice([
          { type: 'statDelta', stat: 'lucky', amount: 10 },
          {
            type: 'chance',
            successPercent: 3,
            displayMode: 'amounts',
            successEffects: [{ type: 'statDelta', stat: 'money', amount: 100 }],
            failureEffects: [],
          },
        ]),
        stats,
      ),
    ).toEqual([
      { stat: 'lucky', text: 'โชค +10' },
      { stat: null, text: 'โอกาสสำเร็จ 5%' },
      { stat: null, text: 'สำเร็จ: เงิน +100 ฿' },
      { stat: null, text: 'ไม่สำเร็จ: ไม่มีผลต่อค่าสถานะ' },
    ])
  })

  it('shows stat changes only when both the player and the event allow it', () => {
    expect(showsStatChanges({}, true)).toBe(true)
    expect(showsStatChanges({ hideStatChanges: false }, true)).toBe(true)
    expect(showsStatChanges({ hideStatChanges: true }, true)).toBe(false)
    expect(showsStatChanges({}, false)).toBe(false)
    expect(showsStatChanges({ hideStatChanges: true }, false)).toBe(false)
  })

  it('shows amounts after the content stat modifiers', () => {
    const modifiers = [
      {
        when: {
          type: 'stat' as const,
          stat: 'health' as const,
          operator: 'lt' as const,
          value: 90,
        },
        target: 'study' as const,
        percent: -20,
        applies: 'gains' as const,
      },
    ]
    const lines = describeChoiceEffects(
      choice([{ type: 'statDelta', stat: 'study', amount: 10 }]),
      stats,
      modifiers,
    )
    expect(lines).toEqual([{ stat: 'study', text: 'การเรียน +8' }])
  })

  it('lists each statsOnly stat once and notes an outcome with none', () => {
    expect(
      describeChoiceEffects(
        choice([
          {
            type: 'chance',
            successPercent: 50,
            displayMode: 'statsOnly',
            successEffects: [
              { type: 'statDelta', stat: 'money', amount: 100 },
              { type: 'statDelta', stat: 'study', amount: 2 },
              { type: 'statDelta', stat: 'money', amount: 50 },
            ],
            failureEffects: [
              { type: 'setFlag', flagId: 'missed', value: true },
            ],
          },
        ]),
        stats,
      ),
    ).toEqual([
      { stat: null, text: 'สำเร็จ', icons: ['money', 'study'] },
      { stat: null, text: 'ไม่สำเร็จ: ไม่มีผลต่อค่าสถานะ' },
    ])
  })
})
