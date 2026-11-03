import type { V2Stats } from '../../content/v2/schema'

export type StatChange = { stat: keyof V2Stats; amount: number }

// Same order as the stat panel: bars first, then money and debt.
const order: (keyof V2Stats)[] = [
  'study',
  'health',
  'stress',
  'relationships',
  'lucky',
  'money',
  'debt',
]

export function statChanges(before: V2Stats, after: V2Stats): StatChange[] {
  return order.flatMap((stat) => {
    const amount = after[stat] - before[stat]
    return amount ? [{ stat, amount }] : []
  })
}

// A decision's recorded changes (save history `statChanges`) in panel order.
export function recordedStatChanges(
  recorded: Partial<V2Stats> | undefined,
): StatChange[] {
  return order.flatMap((stat) => {
    const amount = recorded?.[stat] ?? 0
    return amount ? [{ stat, amount }] : []
  })
}
