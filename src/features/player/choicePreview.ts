import type { V2Event, V2Stats } from '../../content/v2/schema'
import { getV2EffectiveChancePercent } from '../../engine/v2/game'

type Stat = keyof V2Stats
type Choice = V2Event['choices'][number]
type StateEffect = Extract<
  Choice['effects'][number],
  { type: 'statDelta' | 'setFlag' }
>

export const statLabels: Record<Stat, string> = {
  study: 'การเรียน',
  money: 'เงิน',
  health: 'สุขภาพ',
  stress: 'ความเครียด',
  relationships: 'ความสัมพันธ์',
  debt: 'หนี้',
  lucky: 'โชค',
}

const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 })

export function formatStatChange(stat: Stat, amount: number): string {
  const suffix = stat === 'money' || stat === 'debt' ? ' ฿' : ''
  return `${statLabels[stat]} ${amount > 0 ? '+' : ''}${number.format(amount)}${suffix}`
}

function describeOutcome(effects: StateEffect[], showAmounts: boolean): string {
  const stats = effects.filter(
    (effect): effect is Extract<StateEffect, { type: 'statDelta' }> =>
      effect.type === 'statDelta',
  )
  if (!stats.length) return 'ไม่มีผลต่อค่าสถานะ'
  return stats
    .map((effect) =>
      showAmounts
        ? formatStatChange(effect.stat, effect.amount)
        : `${statLabels[effect.stat]}${effect.amount > 0 ? 'เพิ่ม' : effect.amount < 0 ? 'ลด' : 'ไม่เปลี่ยน'}`,
    )
    .join(' · ')
}

export function describeChoiceEffects(
  choice: Choice,
  stats: V2Stats,
): string[] {
  let lucky = stats.lucky
  const descriptions: string[] = []
  for (const effect of choice.effects) {
    if (effect.type === 'statDelta') {
      descriptions.push(formatStatChange(effect.stat, effect.amount))
      if (effect.stat === 'lucky') lucky = Math.min(100, lucky + effect.amount)
    } else if (effect.type === 'chance') {
      const percent = getV2EffectiveChancePercent(effect.successPercent, lucky)
      descriptions.push(`โอกาสสำเร็จ ${number.format(percent)}%`)
      descriptions.push(
        `สำเร็จ: ${describeOutcome(effect.successEffects, effect.displayMode === 'amounts')}`,
      )
      descriptions.push(
        `ไม่สำเร็จ: ${describeOutcome(effect.failureEffects, effect.displayMode === 'amounts')}`,
      )
    }
  }
  return descriptions
}
