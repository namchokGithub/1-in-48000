import type { V2Content, V2Event, V2Stats } from '../../content/v2/schema'
import {
  getV2EffectiveChancePercent,
  getV2ModifiedAmount,
} from '../../engine/v2/game'

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

type Modifiers = V2Content['config']['statModifiers']

function describeOutcome(
  effects: StateEffect[],
  showAmounts: boolean,
  amountOf: (stat: Stat, amount: number) => number,
): string {
  const stats = effects.filter(
    (effect): effect is Extract<StateEffect, { type: 'statDelta' }> =>
      effect.type === 'statDelta',
  )
  if (!stats.length) return 'ไม่มีผลต่อค่าสถานะ'
  return stats
    .map((effect) => {
      const amount = amountOf(effect.stat, effect.amount)
      return showAmounts
        ? formatStatChange(effect.stat, amount)
        : `${statLabels[effect.stat]}${amount > 0 ? 'เพิ่ม' : amount < 0 ? 'ลด' : 'ไม่เปลี่ยน'}`
    })
    .join(' · ')
}

/**
 * Choices show their stat changes only when the player wants to see them and
 * the event does not hide them.
 */
export function showsStatChanges(
  event: Pick<V2Event, 'hideStatChanges'>,
  playerShows: boolean,
): boolean {
  return playerShows && event.hideStatChanges !== true
}

// `stat` is set for a single stat change so the Player can show its icon.
export type ChoiceEffectLine = { stat: Stat | null; text: string }

/**
 * The stat changes a choice will make, as the player sees them before choosing.
 * Amounts include the content's stat modifiers, judged on the current stats.
 */
export function describeChoiceEffects(
  choice: Choice,
  stats: V2Stats,
  modifiers: Modifiers = [],
): ChoiceEffectLine[] {
  const amountOf = (stat: Stat, amount: number) =>
    getV2ModifiedAmount(modifiers, stats, stat, amount)
  let lucky = stats.lucky
  const descriptions: ChoiceEffectLine[] = []
  for (const effect of choice.effects) {
    if (effect.type === 'statDelta') {
      const amount = amountOf(effect.stat, effect.amount)
      descriptions.push({
        stat: effect.stat,
        text: formatStatChange(effect.stat, amount),
      })
      if (effect.stat === 'lucky') lucky = Math.min(100, lucky + amount)
    } else if (effect.type === 'chance') {
      const percent = getV2EffectiveChancePercent(effect.successPercent, lucky)
      descriptions.push({
        stat: null,
        text: `โอกาสสำเร็จ ${number.format(percent)}%`,
      })
      descriptions.push({
        stat: null,
        text: `สำเร็จ: ${describeOutcome(effect.successEffects, effect.displayMode === 'amounts', amountOf)}`,
      })
      descriptions.push({
        stat: null,
        text: `ไม่สำเร็จ: ${describeOutcome(effect.failureEffects, effect.displayMode === 'amounts', amountOf)}`,
      })
    }
  }
  return descriptions
}
