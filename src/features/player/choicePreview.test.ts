import { describe, expect, it } from 'vitest'
import type { V2Event, V2Stats } from '../../content/v2/schema'
import { describeChoiceEffects, formatStatChange } from './choicePreview'

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

  it('shows effective chance and masks amounts for statsOnly', () => {
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
      { stat: null, text: 'โอกาสสำเร็จ 4%' },
      { stat: null, text: 'สำเร็จ: เงินเพิ่ม' },
      { stat: null, text: 'ไม่สำเร็จ: สุขภาพลด' },
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
})
