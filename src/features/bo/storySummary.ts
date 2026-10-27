import type { V2Event } from '../../content/v2/schema'
import { statLabel } from './v2StatOptions'

type Condition = V2Event['conditions'][number]
type Effect = V2Event['choices'][number]['effects'][number]

export function conditionSummary(condition: Condition): string {
  if (condition.type === 'year')
    return `ปี ${condition.operator === 'eq' ? 'เท่ากับ' : condition.operator === 'gte' ? 'อย่างน้อย' : 'ไม่เกิน'} ${condition.value}`
  if (condition.type === 'stat') {
    const operator = {
      eq: 'เท่ากับ',
      gt: 'มากกว่า',
      gte: 'อย่างน้อย',
      lt: 'น้อยกว่า',
      lte: 'ไม่เกิน',
    }[condition.operator]
    return `${statLabel(condition.stat)} ${operator} ${condition.value}`
  }
  if (condition.type === 'flag')
    return `Flag ${condition.flagId} = ${condition.value ? 'จริง' : 'เท็จ'}`
  return `${condition.visited ? 'เคย' : 'ยังไม่เคย'}พบ ${condition.eventId}`
}

export function effectSummary(effect: Effect): string {
  if (effect.type === 'statDelta')
    return `${statLabel(effect.stat)} ${effect.amount >= 0 ? '+' : ''}${effect.amount}`
  if (effect.type === 'setFlag')
    return `${effect.flagId} = ${effect.value ? 'จริง' : 'เท็จ'}`
  if (effect.type === 'goToEvent') return `ไป ${effect.eventId}`
  if (effect.type === 'schedule')
    return `ภายหลัง · ${effectSummary(effect.effect)}`
  return `โอกาส ${effect.successPercent}%`
}
